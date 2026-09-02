import db from "@/lib/db";
import { chatCompleteForAgent } from "@/lib/agent-llm";
import { getAgentModel } from "@/lib/agent-models";
import { requireAgentPreconditions } from "@/lib/agent-contracts";
import { resolveContents } from "@/lib/skills";
import { AGENT_LABELS } from "@/lib/agent-labels";
import { getCurrentProjectId } from "@/lib/projects";
import { startXhsCollection, waitForCollection } from "@/lib/xhs-collector";

const URL_RE = /https?:\/\/[^\s)\]}>,]+/g;

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
      const taskInfo = db.prepare("INSERT INTO research_tasks (project_id, platform, keywords) VALUES (?, 'xiaohongshu', ?)").run(getCurrentProjectId(), String(row.task).slice(0, 200));
      const collectionId = Number(taskInfo.lastInsertRowid);
      startXhsCollection(collectionId, String(row.task).slice(0, 200));
      const collection = await waitForCollection(collectionId);
      if (!collection || collection.status !== "completed") throw new Error(collection?.error || "小红书只读采集未完成");
      step.status = "done";
      step.result = `数据分析师已调用小红书只读采集 CLI，采集 ${collection.progress} 条内容。采集任务 #${collectionId} 已保存。`;
      step.collection_task_id = collectionId;
      step.completed_at = new Date().toISOString();
      const planStatus = steps.every((s) => s.status === "done") ? "completed" : "running";
      db.prepare("UPDATE agent_plans SET steps_json=?, status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?").run(JSON.stringify(steps), planStatus, planId);
      return { step, planStatus };
    }
    const analystSkills = step.role === "analyst" ? ["space-xhs-note-analytics", "cheat-on-content"] : [];
    const skillContent = await resolveContents(Array.from(new Set([...(step.skillIds || []), ...analystSkills])), 7000);
    const prior = steps.filter((s) => s.status === "done" && s.result).slice(-3)
      .map((s) => `${AGENT_LABELS[s.role] || s.role}的产出：${String(s.result).slice(0, 1800)}`).join("\n\n");
    const liveSources = step.role === "researcher" ? await liveSearch(`${row.task} 近期热点 来源`) : [];
    const researchRule = step.role === "researcher"
      ? `\n你是研究员，必须基于下面的实时公开搜索结果执行热点研究。每条热点都返回来源名称、来源链接(URL)和发布时间或搜索时间；无法访问或验证时明确写待验证，绝不编造来源。\n实时搜索结果：${liveSources.join("\n") || "暂未取得搜索结果，请明确说明待验证"}`
      : "";
    const system = `你是${AGENT_LABELS[step.role] || step.role}，是协作任务中的第 ${idx + 1} 步执行者。\n任务：${String(row.task).slice(0, 500)}\n当前动作：${String(step.text)}${researchRule}\n请直接返回本步产出，并说明可交接给下一位成员的关键信息。不要声称尚未完成的动作已经完成。${skillContent ? `\n\n相关工作规范：\n${skillContent}` : ""}${prior ? `\n\n前序产出：\n${prior}` : ""}`;
    const started = Date.now();
    const out = await chatCompleteForAgent(step.role, [{ role: "system", content: system }, { role: "user", content: String(step.text) }], { maxTokens: 900, timeoutMs: 90000 });
    const urls = Array.from(new Set(out.match(URL_RE) || []));
    const allSources = Array.from(new Set([...urls, ...liveSources]));
    if (step.role === "researcher" && allSources.length === 0) throw new Error("研究员没有返回可验证的来源链接，已停止该步骤");
    const model = getAgentModel(step.role as any);
    step.status = "done";
    step.result = out.slice(0, 6000);
    step.sources = allSources;
    step.completed_at = new Date().toISOString();
    step.meta = { provider: model.provider, model: model.model, latency_ms: Date.now() - started, is_mock: !!model.is_mock };
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
