import db from "@/lib/db";
import { getCurrentProject } from "@/lib/projects";
import { PLATFORM_NAME } from "@/lib/constants";

/** 生成面向 Agent 的「统一项目上下文」，供内容生产时自动注入、无需每次重填。 */
export function getProjectContext(): string {
  const project = getCurrentProject();
  const pid = project?.id ?? 1;

  const accounts = db
    .prepare(
      "SELECT a.platform, a.handle, a.role, a.positioning, a.environment_status, o.name AS operator_name FROM accounts a LEFT JOIN operators o ON o.id=a.operator_id WHERE a.project_id=? ORDER BY a.platform, a.id"
    )
    .all(pid) as {
    platform: string;
    handle: string;
    role: string | null;
    positioning: string | null;
    environment_status: string | null;
    operator_name: string | null;
  }[];

  const pillars = db
    .prepare("SELECT cp.name, cp.description, COUNT(ap.account_id) AS account_count FROM content_pillars cp LEFT JOIN account_pillars ap ON ap.pillar_id=cp.id WHERE cp.project_id=? GROUP BY cp.id ORDER BY cp.id")
    .all(pid) as { name: string; description: string | null; account_count: number }[];

  const lines: string[] = [];
  lines.push("===== 统一项目上下文（自动注入，勿重复询问）=====");
  if (project) {
    lines.push(`项目：${project.name}`);
    if (project.marketing_brief) lines.push(`营销对象：${project.marketing_brief}`);
    if (project.audience) lines.push(`目标人群：${project.audience}`);
    if (project.voice) lines.push(`品牌语气：${project.voice}`);
    if (project.conversion_goal) lines.push(`转化目标：${project.conversion_goal}`);
    if (project.banned_terms) lines.push(`禁区词：${project.banned_terms}`);
  }
  lines.push("账号矩阵：");
  for (const a of accounts) {
    lines.push(
      `- [${PLATFORM_NAME[a.platform] ?? a.platform}] ${a.handle}（角色 ${a.role ?? "-"}，定位 ${a.positioning ?? "未定"}，环境 ${a.environment_status ?? "配置中"}，运营 ${a.operator_name ?? "-"}）`
    );
  }
  lines.push("内容支柱：");
  for (const p of pillars) {
    lines.push(`- ${p.name}：${p.description ?? ""}（绑定账号 ${p.account_count} 个）`);
  }
  lines.push("===== 项目上下文结束 =====");
  return lines.join("\n");
}
