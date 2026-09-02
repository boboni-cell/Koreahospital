import { NextRequest, NextResponse } from "next/server";
import { getCurrentProjectId } from "@/lib/projects";
import {
  listMediaRequests,
  createMediaRequest,
  appendMediaRequestRound,
  updateMediaRequest,
  getMediaRequest,
  type MediaRequestParams,
  type MediaRequestStatus,
} from "@/lib/media-requests";

export const dynamic = "force-dynamic";

function asString(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

export async function GET() {
  const pid = getCurrentProjectId();
  return NextResponse.json({ requests: listMediaRequests(pid) });
}

/** 创建媒体请求（无 id）或追加一轮确认（有 id）。 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const pid = getCurrentProjectId();
  const id = Number(body.id) || 0;
  const kind: "image" | "video" = body.kind === "video" ? "video" : "image";
  const params: MediaRequestParams | undefined =
    body.params && typeof body.params === "object" && Object.keys(body.params).length > 0
      ? (body.params as MediaRequestParams)
      : undefined;

  try {
    let request;
    if (id > 0) {
      const current = getMediaRequest(id);
      if (!current) throw new Error("媒体请求不存在");
      request = updateMediaRequest(id, {
        prompt: body.prompt !== undefined ? String(body.prompt) : undefined,
        params,
        sourceLabel: body.sourceLabel !== undefined ? String(body.sourceLabel ?? "") : undefined,
        contentId: body.contentId !== undefined ? (Number(body.contentId) || null) : undefined,
      });
      if (body.status) {
        request = updateMediaRequest(id, { status: String(body.status) as MediaRequestStatus });
      }
      if (body.round && typeof body.round === "object") {
        request = appendMediaRequestRound(id, {
          phase: asString(body.round.phase) || "params_updated",
          note: asString(body.round.note),
          params,
          prompt: body.prompt !== undefined ? String(body.prompt) : undefined,
        });
      }
    } else {
      const round = body.round && typeof body.round === "object"
        ? {
            phase: asString(body.round.phase) || "params_proposed",
            note: asString(body.round.note),
            params: params ?? {},
            prompt: body.prompt !== undefined ? String(body.prompt) : "",
            at: new Date().toISOString(),
          }
        : undefined;
      request = createMediaRequest({
        projectId: pid,
        kind,
        sourceLabel: body.sourceLabel != null ? String(body.sourceLabel) : null,
        prompt: body.prompt != null ? String(body.prompt) : "",
        params: params ?? {},
        contentId: body.contentId != null ? Number(body.contentId) : null,
        round,
      });
      if (body.status) {
        request = updateMediaRequest(request.id, { status: String(body.status) as MediaRequestStatus });
      }
    }
    return NextResponse.json({ ok: true, request });
  } catch (e) {
    return NextResponse.json({ error: String((e as Error)?.message || e).slice(0, 300) }, { status: 400 });
  }
}
