import { NextRequest, NextResponse } from "next/server";
import {
  listModels,
  addModel,
  updateModel,
  deleteModel,
  setActive,
  publicMasked,
} from "@/lib/models";

export const dynamic = "force-dynamic";

export async function GET() {
  const list = (await listModels()).map(publicMasked);
  return NextResponse.json(list);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const entry = await addModel({
    name: body.name || "未命名模型",
    kind: body.kind || "text",
    baseUrl: body.baseUrl || "",
    apiKey: body.apiKey || "",
    model: body.model || "",
    isActive: body.isActive,
  });
  return NextResponse.json(publicMasked(entry));
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, ...patch } = body;
  if (!id) return NextResponse.json({ error: "缺 id" }, { status: 400 });
  await updateModel(id, patch);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "缺 id" }, { status: 400 });
  await deleteModel(id);
  return NextResponse.json({ ok: true });
}
