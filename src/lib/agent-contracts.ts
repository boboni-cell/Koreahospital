import db from "@/lib/db";
import { getCurrentProject } from "@/lib/projects";

export interface AgentContract {
  id: number; role: string; name: string | null;
  inputs: string | null; outputs: string | null;
  allowed_actions: string | null; forbidden_actions: string | null;
  handoff_fields: string | null; fail_condition: string | null;
  status: string; created_at: string;
}

export function listAgentContracts(): AgentContract[] {
  return db.prepare("SELECT * FROM agent_contracts ORDER BY id ASC").all() as AgentContract[];
}

export function getAgentContract(role: string): AgentContract | undefined {
  return db.prepare("SELECT * FROM agent_contracts WHERE role=?").get(role) as AgentContract | undefined;
}

/** 检查角色前置数据是否齐备；缺项时停止并给出明确原因。 */
export function requireAgentPreconditions(role: string): { ok: boolean; reason?: string } {
  const contract = getAgentContract(role);
  if (!contract) return { ok: false, reason: "未知角色：" + role };

  const project = getCurrentProject();
  if (!project) return { ok: false, reason: "缺少项目上下文：请先在项目简报中设置当前项目。" };

  if (role === "strategist" || role === "writer" || role === "researcher") {
    if (!project.audience || !project.voice) {
      return { ok: false, reason: `[${role}] 缺少前置数据：项目简报未填写「目标人群」或「品牌语气」，请先到 /project 补齐。` };
    }
  }

  if (role === "designer") {
    const authorized = db.prepare("SELECT COUNT(*) AS n FROM assets WHERE license='authorized'").get() as { n: number };
    if (authorized.n === 0) return { ok: false, reason: "[designer] 缺少前置数据：尚无已授权素材可供使用。" };
  }

  if (role === "publisher") {
    const approved = db.prepare("SELECT COUNT(*) AS n FROM contents WHERE status='published'").get() as { n: number };
    if (approved.n === 0) return { ok: false, reason: "[publisher] 缺少前置数据：还没有已批准/已发布版本可作为发布包。" };
  }

  return { ok: true };
}
