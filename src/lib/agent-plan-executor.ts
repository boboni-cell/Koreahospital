import db from "@/lib/db";
import { chatCompleteForAgent } from "@/lib/agent-llm";
import { getAgentModel } from "@/lib/agent-models";
import { requireAgentPreconditions } from "@/lib/agent-contracts";
import { resolveContents } from "@/lib/skills";
import { AGENT_LABELS } from "@/lib/agent-labels";
import { getCurrentProjectId } from "@/lib/projects";
import { collectXhsNow, refineXhsQuery } from "@/lib/xhs-collector";
import { separateResearchOutput } from "@/lib/research-output";

async function liveSearch(query: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const url = `https://html.duckduckgo.com/html/?${new URLSearchParams({ q: query })}`;
    const html = await fetch(url, { signal: controller.signal, headers: { "user-agent": "Mozilla/5.0" } }).then((r) => r.text());
    return Array.from(html.matchAll(/result__a" href="\/\/duckduckgo\.com\/l\/\?uddg=([^&"]+)/g))
      .map((m) => decodeURIComponent(m[1])).filter((href) => /^https?:\/\//.test(href)).slice(0, 5);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

async function liveWebSources(query: string) {
  const queries = [
    `${query} 小红书 热点`,
    `${query} 抖音 热点`,
    `${query} 微博 新闻`,
    `${query} 全网 趋势`,
  ];
  const results = await Promise.all(queries.map((item) => liveSearch(item)));
  return Array.from(new Set(results.flat())).slice(0, 20);
}

export async function runPlanStep(planId: number, idx: number) {
  const row = db.prepare("SELECT * FROM agent_plans WHERE id=?").get(planId) as any;
  if (!row) throw new Error("计划不存在");
  let steps: any[];
  try { steps = JSON.parse(row.steps_json || "[]"); } catch { steps = []; }
  const step = steps[idx];
  if (!step) throw new Error("步骤不存在");
  if (step.status === "running") throw new Error("该步骤正在执行");
  if (step.status === "done") return { step, planStatus: row.status };
  const pre = requireAgentPreconditions(step.role);
  if (!pre.ok) throw new Error(pre.reason);

  step.status = "running";
  step.started_at = new Date().toISOString();
    db.prepare("UPDATE agent_plans SET steps_json=?, status='running', updated_at=CURRENT_TIMESTAMP WHERE id=?").run(JSON.stringify(steps), planId);
  try {
    if (step.role === "analyst" && /采集|收集|抓取|后台数据/.test(String(step.text))) {
      const refined = await refineXhsQuery(String(row.task));
      const taskInfo = db.prepare("INSERT INTO research_tasks (project_id, platform, keywords) VALUES (?, 'xiaohongshu', ?)").run(getCurrentProjectId(), refined);
      const collectionId = Number(taskInfo.lastInsertRowid);
      const collection = await collectXhsNow(collectionId, refined);
      if (!collection || collection.status !== "completed") throw new Error(collection?.error || "小红书只读采集未完成");
      step.status = "done";
      step.result = `数据分析师已调用小红书只读采集 CLI，采集 ${collection.progress} 条内容。采集任务 #${collectionId} 已保存。`;
      step.collection_task_id = collectionId;
      step.completed_at = new Date().toISOString();
      const planStatus = steps.every((s) => s.status === "done") ? "completed" : "running";
      db.prepare("UPDATE agent_plans SET steps_json=?, status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?").run(JSON.stringify(steps), planStatus, planId);
      return { step, planStatus };
    }
    let collectionContext = "";
    let refinedQuery = String(row.task).slice(0, 200);
    if (step.role === "researcher" && /热点|搜索|竞品|舆情|趋势|小红书/.test(String(step.text))) {
      refinedQuery = await refineXhsQuery(String(row.task));
      const taskInfo = db.prepare("INSERT INTO research_tasks (project_id, platform, keywords) VALUES (?, 'xiaohongshu', ?)").run(getCurrentProjectId(), refinedQuery);
      const collectionId = Number(taskInfo.lastInsertRowid);
      const collection = await collectXhsNow(collectionId, refinedQuery);
      if (collection?.status === "completed") {
        const items = db.prepare("SELECT title, author, source_url, likes, saves, comments, raw_json FROM research_items WHERE task_id=? ORDER BY id").all(collectionId) as any[];
        collectionContext = `\n\nsocai 小红书实时采集结果（任务 #${collectionId}）：\n${items.map((item) => JSON.stringify(item)).join("\n").slice(0, 12000)}`;
      } else {
        collectionContext = `\n\nsocai 小红书采集未完成：${collection?.error || "请人工验证"}`;
      }
      step.collection_task_id = collectionId;
    }
    const analystSkills = step.role === "analyst" ? ["space-xhs-note-analytics", "cheat-on-content"] : [];
    const skillContent = await resolveContents(Array.from(new Set([...(step.skillIds || []), ...analystSkills])), 7000);
    const prior = steps.filter((s) => s.status === "done" && s.result).slice(-3)
      .map((s) => `${AGENT_LABELS[s.role] || s.role}的产出：${String(s.result).slice(0, 1800)}`).join("\n\n");
    const liveSources = step.role === "researcher" ? await liveWebSources(refinedQuery) : [];
    const researchRule = step.role === "researcher"
      ? `\n你是研究员，必须基于下面经过细化的搜索词和全网实时公开搜索结果执行热点研究。小红书仅是一个来源，必须同时比较抖音、微博、新闻/网页等公开信号。正文按“研究结论、候选选题、证据与风险、交接建议”组织，不能只罗列链接；来源链接集中放在最后的“来源”部分。无法访问或验证时明确写待验证，绝不编造来源。\n细化后的搜索词：${refinedQuery}\n全网搜索结果：${liveSources.join("\n") || "暂未取得搜索结果，请明确说明待验证"}`
      : "";
    const system = `你是${AGENT_LABELS[step.role] || step.role}，是协作任务中的第 ${idx + 1} 步执行者。\n任务：${String(row.task).slice(0, 500)}\n当前动作：${String(step.text)}${researchRule}${collectionContext}\n请直接返回本步产出，并说明可交接给下一位成员的关键信息。不要声称尚未完成的动作已经完成。${skillContent ? `\n\n相关工作规范：\n${skillContent}` : ""}${prior ? `\n\n前序产出：\n${prior}` : ""}`;
    const started = Date.now();
    const out = await chatCompleteForAgent(step.role, [{ role: "system", content: system }, { role: "user", content: String(step.text) }], { maxTokens: 900, timeoutMs: 90000 });
    const separated = step.role === "researcher" ? separateResearchOutput(out) : { result: out, sources: [] };
    const allSources = Array.from(new Set([...separated.sources, ...liveSources]));
    if (step.role === "researcher" && allSources.length === 0) throw new Error("研究员没有返回可验证的来源链接，已停止该步骤");
    const model = getAgentModel(step.role as any);
    step.status = "done";
    step.result = separated.result.slice(0, 6000);
    step.sources = allSources;
    step.completed_at = new Date().toISOString();
    step.meta = { provider: model.provider, model: model.model, latency_ms: Date.now() - started, is_mock: !!model.is_mock };
    if (step.role === "writer" && /文案|内容|笔记|脚本/.test(`${row.task} ${step.text}`) && !/(生成|整理|创建).{0,8}选题/.test(String(step.text))) {
      const title = String(row.task).replace(/^(请|帮我|根据)/, "").slice(0, 80) || "Agent 生成内容";
      const platform = /抖音/.test(`${row.task} ${step.text}`) ? "douyin" : "xiaohongshu";
      const info = db.prepare("INSERT INTO contents (title, body, platform, role, status, project_id) VALUES (?, ?, ?, ?, 'draft', ?)")
        .run(title, step.result, platform, "knowledge", getCurrentProjectId());
      step.content_id = Number(info.lastInsertRowid);
      step.result += `\n\n已自动进入内容管理：内容 #${step.content_id}`;
    }
    const planStatus = steps.every((s) => s.status === "done") ? "completed" : steps.some((s) => s.status === "failed") ? "partial" : "running";
    db.prepare("UPDATE agent_plans SET steps_json=?, status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?").run(JSON.stringify(steps), planStatus, planId);
    return { step, planStatus };
  } catch (error: any) {
    step.status = "failed";
    step.error = String(error?.message || error).slice(0, 400);
    step.completed_at = new Date().toISOString();
    db.prepare("UPDATE agent_plans SET steps_json=?, status='partial', updated_at=CURRENT_TIMESTAMP WHERE id=?").run(JSON.stringify(steps), planId);
    throw error;
  }
}
