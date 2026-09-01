import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentProjectId } from "@/lib/projects";
import { chatCompleteForAgent } from "@/lib/agent-llm";
import { requireAgentPreconditions } from "@/lib/agent-contracts";
import { recordAction } from "@/lib/workflow-actions";

export const dynamic = "force-dynamic";

const SYSTEM = `你是 Koreahospital 工作台的「选题生成」专家。
根据用户给的主题和数量，一次性输出 N 条高潜力选题，规则：
1. 严禁编造数据/案例/平台规则；不确定的标注 [待确认]。
2. 每条选题 title ≤ 22 字，description ≤ 60 字。
3. heat_score 1-10 整数，源 source="trending"。
4. 严格只输出 JSON 数组：[{"title":"...","description":"...","heat_score":N}]，不要 markdown，不要解释。`;

/**
 * 从热点批量生成选题：调一次 writer agent，拿到 JSON 数组，批量插入 topics。
 * ponytail: 单条 SQL 批量插入用一条 INSERT 跑 N 行，省 N 次 prepare。
 */
export async function POST(req: NextRequest) {
  const pre = requireAgentPreconditions("writer");
  if (!pre.ok) return NextResponse.json({ error: pre.reason }, { status: 412 });

  const body = await req.json().catch(() => ({}));
  const theme = String(body.theme ?? "").trim();
  const count = Math.min(20, Math.max(1, Number(body.count ?? 5)));
  if (!theme) return NextResponse.json({ error: "请填写热点主题" }, { status: 400 });

  const pid = getCurrentProjectId();
  let items: { title: string; description?: string; heat_score?: number }[] = [];
  try {
    const text = await chatCompleteForAgent(
      "writer",
      [
        { role: "system", content: SYSTEM },
        { role: "user", content: `主题：${theme}\n数量：${count}` },
      ],
      { maxTokens: 800, timeoutMs: 60000 }
    );
    const m = text.match(/\[[\s\S]*\]/);
    items = m ? JSON.parse(m[0]) : [];
    if (!Array.isArray(items) || items.length === 0) throw new Error("LLM 未返回有效数组");
  } catch (e: any) {
    return NextResponse.json({ error: "生成失败：" + (e.message || String(e)).slice(0, 200) }, { status: 502 });
  }

  const ins = db.prepare(
    "INSERT INTO topics (title, description, source, heat_score, target_accounts, project_id) VALUES (?, ?, ?, ?, ?, ?)"
  );
  const ids: number[] = [];
  const tx = db.transaction((arr: typeof items) => {
    for (const it of arr) {
      const title = String(it.title ?? "").trim().slice(0, 80);
      if (!title) continue;
      const info = ins.run(
        title,
        it.description ? String(it.description).slice(0, 200) : null,
        "trending",
        Math.min(10, Math.max(1, Number(it.heat_score ?? 5))),
        null,
        pid
      );
      ids.push(Number(info.lastInsertRowid));
    }
  });
  tx(items);

  recordAction({
    objectType: "topic",
    objectId: 0,
    action: "topic.bulk_create",
    detail: `从热点「${theme.slice(0, 30)}」批量生成 ${ids.length} 条选题`,
  });
  return NextResponse.json({ ok: true, ids, count: ids.length });
}