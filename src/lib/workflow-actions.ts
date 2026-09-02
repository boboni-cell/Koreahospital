import db from "./db.ts";

export interface WorkflowAction {
  id: number;
  object_type: string | null;
  object_id: number | null;
  actor_type: string;
  actor_id: number | null;
  actor_name: string | null;
  action: string | null;
  from_status: string | null;
  to_status: string | null;
  detail: string | null;
  created_at: string;
}

export interface OperatorRow {
  id: number;
  name: string;
  responsibility: string | null;
  status: string;
}

/** 当前默认运营者（首版单人：operators 表第一行）。 */
export function currentOperator(): OperatorRow | undefined {
  return db.prepare("SELECT * FROM operators ORDER BY id ASC LIMIT 1").get() as OperatorRow | undefined;
}

/** 记录一次操作/状态变更。 */
export function recordAction(opts: {
  objectType: string;
  objectId?: number | null;
  actorType?: string;
  actorId?: number | null;
  actorName?: string | null;
  action: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  detail?: string | null;
}) {
  const op = currentOperator();
  db.prepare(
    "INSERT INTO workflow_actions (object_type, object_id, actor_type, actor_id, actor_name, action, from_status, to_status, detail) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(
    opts.objectType,
    opts.objectId ?? null,
    opts.actorType ?? "operator",
    opts.actorId ?? op?.id ?? null,
    opts.actorName ?? op?.name ?? null,
    opts.action,
    opts.fromStatus ?? null,
    opts.toStatus ?? null,
    opts.detail ?? null
  );
}

export function listActions(filters?: { objectType?: string; objectId?: number; limit?: number }): WorkflowAction[] {
  const limit = filters?.limit ?? 100;
  const params: unknown[] = [];
  let where = "";
  if (filters?.objectType) {
    where += " WHERE object_type=?";
    params.push(filters.objectType);
  }
  if (filters?.objectId != null && filters.objectId > 0) {
    where += (where ? " AND" : " WHERE") + " object_id=?";
    params.push(filters.objectId);
  }
  params.push(limit);
  return db
    .prepare(`SELECT * FROM workflow_actions${where} ORDER BY id DESC LIMIT ?`)
    .all(...params) as WorkflowAction[];
}
