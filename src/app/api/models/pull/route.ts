import { NextRequest, NextResponse } from "next/server";
import { ModelEntry, modelsEndpoint } from "@/lib/models";

export async function POST(req: NextRequest) {
  const m: ModelEntry = await req.json();
  try {
    const res = await fetch(modelsEndpoint(m), {
      headers: { Authorization: `Bearer ${m.apiKey}` },
    });
    if (!res.ok) {
      return NextResponse.json({ ok: false, status: res.status });
    }
    const data = (await res.json()) as { data?: { id: string }[] };
    const ids = (data.data || []).map((x) => x.id).filter(Boolean);
    return NextResponse.json({ ok: true, models: ids });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e).slice(0, 200) });
  }
}
