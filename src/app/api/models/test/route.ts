import { NextRequest, NextResponse } from "next/server";
import { ModelEntry, chatEndpoint, imageEndpoint } from "@/lib/models";

export async function POST(req: NextRequest) {
  const m: ModelEntry = await req.json();
  try {
    if (m.kind === "image") {
      // 图像模型：测试用极小请求（受模型支持影响，失败也算失败）
      const res = await fetch(imageEndpoint(m), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${m.apiKey}` },
        body: JSON.stringify({ model: m.model, prompt: "测试", n: 1 }),
      });
      return NextResponse.json({ ok: res.ok, status: res.status });
    }
    // 文本模型：发一条最小对话
    const res = await fetch(chatEndpoint(m), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${m.apiKey}` },
      body: JSON.stringify({
        model: m.model,
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 8,
      }),
    });
    const txt = await res.text().catch(() => "");
    let echo = "";
    try {
      const j = JSON.parse(txt);
      echo = j?.choices?.[0]?.message?.content || j?.choices?.[0]?.message?.reasoning_content || "";
    } catch {
      echo = txt.slice(0, 80);
    }
    return NextResponse.json({ ok: res.ok, status: res.status, echo });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e).slice(0, 200) });
  }
}
