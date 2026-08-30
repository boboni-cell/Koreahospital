import { NextRequest, NextResponse } from "next/server";
import { setActive } from "@/lib/models";

export async function POST(req: NextRequest) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "缺 id" }, { status: 400 });
  await setActive(id);
  return NextResponse.json({ ok: true });
}
