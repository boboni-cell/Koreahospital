import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import db from "@/lib/db";

export const config = { runtime: "nodejs", matcher: ["/api/:path*"] };

/** 工作台分享前启用「查看者只读」：拦截所有非 GET 的写接口与模型调用（/api/access 除外）。 */
export function middleware(req: NextRequest) {
  const method = req.method;
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return NextResponse.next();

  let mode = "owner";
  try {
    const row = db.prepare("SELECT value FROM app_state WHERE key='access_mode'").get() as { value: string } | undefined;
    mode = row?.value ?? "owner";
  } catch {
    mode = "owner";
  }

  if (mode === "readonly") {
    if (req.nextUrl.pathname === "/api/access") return NextResponse.next();
    return NextResponse.json({ error: "只读模式：查看者不能修改数据、删除或触发模型调用" }, { status: 403 });
  }
  return NextResponse.next();
}
