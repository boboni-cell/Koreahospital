import { NextRequest, NextResponse } from "next/server";
import { listAgentContracts } from "@/lib/agent-contracts";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(listAgentContracts());
}

export async function PUT(req: NextRequest) {
  const b = await req.json();
  const id = Number(b.id);
  if (!id) return NextResponse.json({ error: "缺 id" }, { status: 400 });
  db.prepare(
    "UPDATE agent_contracts SET name=?, inputs=?, outputs=?, allowed_actions=?, forbidden_actions=?, handoff_fields=?, fail_condition=?, status=? WHERE id=?"
  ).run(
    b.name ?? null, b.inputs ?? null, b.outputs ?? null,
    b.allowed_actions ?? null, b.forbidden_actions ?? null,
    b.handoff_fields ?? null, b.fail_condition ?? null,
    b.status ?? "active", id
  );
  return NextResponse.json({ ok: true, id });
}
