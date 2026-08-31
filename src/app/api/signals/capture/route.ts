import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentProjectId } from "@/lib/projects";
import { recordAction } from "@/lib/workflow-actions";

export const dynamic = "force-dynamic";

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/s+/g, " ")
    .trim();
}

/**
 * 人工触发的“只读采集当前公开页面”。
 * 一次只采一个 URL；不自动登录、不处理验证码、不支持批量爬取。
 */
export async function POST(req: NextRequest) {
  const b = await req.json();
  const url = String(b.url || "").trim();
  if (!/^https?:\/\//i.test(url)) {
    return NextResponse.json({ error: "需提供 http/https URL" }, { status: 400 });
  }
  const pid = getCurrentProjectId();
  const platform = b.platform ?? null;
  const now = new Date().toISOString();
  let evidence = "";

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(12000), redirect: "follow" });
    const html = await res.text();
    evidence = stripHtml(html).slice(0, 600);
    if (!evidence) evidence = "（页面无可见文本）";
  } catch (e) {
    evidence = "（无法读取公开页面，可能网络受限；已保存来源 URL 供人工核对）";
  }

  const info = db
    .prepare("INSERT INTO signals (project_id, platform, source_url, title, evidence, status, captured_at) VALUES (?, ?, ?, ?, ?, 'pending', ?)")
    .run(pid, platform, url, url, evidence, now);
  recordAction({ objectType: "signal", objectId: Number(info.lastInsertRowid), action: "signal.capture", detail: `只读采集 ${url}` });

  return NextResponse.json({ id: info.lastInsertRowid, status: "pending", captured_at: now, evidence: evidence.slice(0, 120) });
}
