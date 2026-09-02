import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { parseJsonBlock } from "@/lib/ai-client";
import { chatCompleteForAgent } from "@/lib/agent-llm";
import { requireAgentPreconditions } from "@/lib/agent-contracts";
import { getCurrentProjectId } from "@/lib/projects";
import { median, metricRate } from "@/lib/post-analytics";
import { recordAction } from "@/lib/workflow-actions";
import { resolveContents } from "@/lib/skills";

export const dynamic = "force-dynamic";

type Row = { id: number; title: string | null; platform: string; handle: string | null; published_at: string | null; views: number; likes: number; saves: number; comments: number; shares: number; follower_gain: number | null };

function collect(projectId: number, scope: string, accountId: number | null, postId: number | null) {
  const days = scope === "account_week" ? 7 : 30;
  const where = ["p.project_id=?", "m.window='7d'", "date(p.published_at)>=date('now', ?)"];
  const params: unknown[] = [projectId, `-${days} days`];
  if (accountId) { where.push("p.account_id=?"); params.push(accountId); }
  if (postId) { where.push("p.id=?"); params.push(postId); }
  const rows = db.prepare(`SELECT p.id, p.title, p.platform, a.handle, p.published_at, m.views, m.likes, m.saves, m.comments, m.shares, m.follower_gain FROM post_analytics p JOIN post_metric_windows m ON m.post_id=p.id LEFT JOIN accounts a ON a.id=p.account_id WHERE ${where.join(" AND ")} ORDER BY datetime(p.published_at) DESC`).all(...params) as Row[];
  const metrics = rows.map((row) => ({ ...row, engagement_rate: metricRate(row.likes + row.saves + row.comments + row.shares, row.views), share_rate: metricRate(row.shares, row.views), follower_conversion_rate: metricRate(row.follower_gain, row.views), low_sample: row.views < 1000 })).slice(0, scope === "single" ? 1 : undefined);
  const reliable = metrics.filter((row) => !row.low_sample);
  const summary = { posts: metrics.length, reliable_posts: reliable.length, total_views: metrics.reduce((sum, row) => sum + row.views, 0), engagement_rate: median(reliable.map((row) => row.engagement_rate)), share_rate: median(reliable.map((row) => row.share_rate)), follower_conversion_rate: median(reliable.map((row) => row.follower_conversion_rate)) };
  return { days, rows: metrics, summary };
}

export async function GET(req: NextRequest) {
  const projectId = getCurrentProjectId();
  const scope = req.nextUrl.searchParams.get("scope") ?? "project_month";
  const accountId = Number(req.nextUrl.searchParams.get("account_id")) || null;
  const postId = Number(req.nextUrl.searchParams.get("post_id")) || null;
  const data = collect(projectId, scope, accountId, postId);
  const drafts = db.prepare("SELECT * FROM report_drafts WHERE project_id=? AND scope=? AND (? IS NULL OR account_id=?) ORDER BY id DESC LIMIT 12").all(projectId, scope, accountId, accountId);
  const accounts = db.prepare("SELECT id, platform, handle FROM accounts WHERE project_id=? ORDER BY platform, id").all(projectId);
  return NextResponse.json({ ...data, drafts, accounts, scope, account_id: accountId, timezone: "Asia/Shanghai" });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const projectId = getCurrentProjectId();
  if (body.action === "confirm") {
    const id = Number(body.id);
    const draft = db.prepare("SELECT * FROM report_drafts WHERE id=? AND project_id=?").get(id, projectId) as any;
    if (!draft) return NextResponse.json({ error: "报告不存在" }, { status: 404 });
    let actions: string[] = []; try { actions = JSON.parse(draft.actions_json || "[]"); } catch {}
    const due = new Date(); due.setDate(due.getDate() + 7);
    const run = db.transaction(() => {
      db.prepare("UPDATE report_drafts SET status='confirmed', confirmed_at=CURRENT_TIMESTAMP WHERE id=?").run(id);
      const insertTask = db.prepare("INSERT INTO tasks (title, status, due, assignee, project_id, source_type, source_id) VALUES (?, 'todo', ?, '运营者', ?, 'report', ?)");
      for (const action of actions) insertTask.run(action, due.toISOString().slice(0, 10), projectId, id);
    }); run();
    recordAction({ objectType: "report", objectId: id, action: "report.confirm", detail: `确认报告并生成 ${actions.length} 个行动任务` });
    return NextResponse.json({ ok: true, tasks: actions.length });
  }

  const scope = body.scope ?? "project_month";
  const accountId = Number(body.account_id) || null;
  const postId = Number(body.post_id) || null;
  const data = collect(projectId, scope, accountId, postId);
  const fallback = {
    diagnosis: data.summary.reliable_posts ? `本期共 ${data.summary.posts} 篇帖子，${data.summary.reliable_posts} 篇进入可靠样本。互动率中位数 ${data.summary.engagement_rate ?? 0}%，分享率中位数 ${data.summary.share_rate ?? 0}%。` : "当前可靠样本不足，不下明确归因结论。",
    evidence: `7天统一窗口；有效浏览不足1000的帖子不进入中位数。总有效浏览 ${data.summary.total_views}。`,
    actions: data.summary.reliable_posts ? ["复用本期分享率高于中位数的标题与内容结构", "为未分类帖子补充内容支柱，下一周期按支柱复盘", "继续补录单帖新增粉丝，完善涨粉转化率"] : ["补充至少3篇有效浏览达到1000的帖子数据", "核对官方导出列映射和7天观察窗口"],
  };
  let output = fallback; let modelPowered = false;
  const pre = requireAgentPreconditions("analyst");
  if (pre.ok && data.rows.length) {
    try {
      const analystSkills = await resolveContents(["space-xhs-note-analytics", "cheat-on-content"], 5000);
      const text = await chatCompleteForAgent(
        "analyst",
        [
          { role: "system", content: `你是医疗社媒运营分析师。只依据提供的数据输出JSON，不编造因果，不直接修改账号定位。输出格式：{\"diagnosis\":\"\",\"evidence\":\"\",\"actions\":[\"\"]}\n\n分析规范：\n${analystSkills}` },
          { role: "user", content: JSON.stringify({ scope, summary: data.summary, posts: data.rows.slice(0, 20) }) },
        ],
        { maxTokens: 1600, timeoutMs: 70000 }
      );
      output = parseJsonBlock<typeof fallback>(text); modelPowered = true;
    } catch {}
  }
  const start = new Date(); start.setDate(start.getDate() - data.days);
  const info = db.prepare(`INSERT INTO report_drafts (project_id, scope, account_id, period_start, period_end, summary_json, diagnosis, evidence, actions_json, model_powered) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(projectId, scope, accountId, start.toISOString().slice(0, 10), new Date().toISOString().slice(0, 10), JSON.stringify(data.summary), output.diagnosis, output.evidence, JSON.stringify(output.actions), modelPowered ? 1 : 0);
  return NextResponse.json({ ok: true, id: info.lastInsertRowid, modelPowered, ...output });
}
