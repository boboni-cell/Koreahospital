import db from "./db.ts";

export type MediaRequestStatus = "draft" | "confirmed" | "generating" | "done" | "failed";

export interface MediaRequestParams {
  ratio?: string;
  style?: string;
  scene?: string;
  usage?: string;
  duration?: string;
  resolution?: string;
  storyboard?: string;
  bgm?: string;
  model?: string;
  [key: string]: unknown;
}

export interface MediaRequestRound {
  round: number;
  phase: string;
  note?: string;
  params?: MediaRequestParams;
  prompt?: string;
  at: string;
}

export interface MediaRequest {
  id: number;
  project_id: number | null;
  kind: "image" | "video";
  source_label: string | null;
  prompt: string;
  params: MediaRequestParams;
  rounds: MediaRequestRound[];
  status: MediaRequestStatus;
  asset_ids: number[];
  content_id: number | null;
  created_at: string;
  updated_at: string;
}

function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function toMediaRequest(row: any): MediaRequest {
  return {
    id: row.id,
    project_id: row.project_id ?? null,
    kind: row.kind === "video" ? "video" : "image",
    source_label: row.source_label ?? null,
    prompt: row.prompt ?? "",
    params: parseJson<MediaRequestParams>(row.params_json, {}),
    rounds: parseJson<MediaRequestRound[]>(row.rounds_json, []),
    status: (row.status || "draft") as MediaRequestStatus,
    asset_ids: parseJson<number[]>(row.asset_ids_json, []),
    content_id: row.content_id ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function getMediaRequest(id: number): MediaRequest | null {
  const row = db.prepare("SELECT * FROM media_requests WHERE id=?").get(id) as any;
  return row ? toMediaRequest(row) : null;
}

export function listMediaRequests(projectId: number, limit = 20): MediaRequest[] {
  const rows = db
    .prepare("SELECT * FROM media_requests WHERE project_id=? ORDER BY id DESC LIMIT ?")
    .all(projectId, limit) as any[];
  return rows.map(toMediaRequest);
}

export function createMediaRequest(opts: {
  projectId: number;
  kind: "image" | "video";
  sourceLabel?: string | null;
  prompt?: string;
  params?: MediaRequestParams;
  contentId?: number | null;
  round?: Omit<MediaRequestRound, "round" | "at">;
}): MediaRequest {
  const params = opts.params ?? {};
  const rounds = opts.round ? [{ ...opts.round, round: 1, at: new Date().toISOString() }] : [];
  const info = db
    .prepare(
      "INSERT INTO media_requests (project_id, kind, source_label, prompt, params_json, rounds_json, status, content_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .run(
      opts.projectId,
      opts.kind,
      opts.sourceLabel ?? null,
      opts.prompt ?? "",
      JSON.stringify(params),
      JSON.stringify(rounds),
      "draft",
      opts.contentId ?? null
    );
  const created = getMediaRequest(Number(info.lastInsertRowid));
  if (!created) throw new Error("媒体请求创建失败");
  return created;
}

export function appendMediaRequestRound(id: number, round: Omit<MediaRequestRound, "round" | "at">): MediaRequest {
  const cur = getMediaRequest(id);
  if (!cur) throw new Error("媒体请求不存在");
  const rounds = [...cur.rounds, { ...round, round: cur.rounds.length + 1, at: new Date().toISOString() }];
  db.prepare("UPDATE media_requests SET rounds_json=?, updated_at=CURRENT_TIMESTAMP WHERE id=?").run(
    JSON.stringify(rounds),
    id
  );
  return getMediaRequest(id)!;
}

export function updateMediaRequest(
  id: number,
  patch: Partial<{
    status: MediaRequestStatus;
    prompt: string;
    params: MediaRequestParams;
    sourceLabel: string | null;
    assetIds: number[];
    contentId: number | null;
  }>
): MediaRequest {
  const cur = getMediaRequest(id);
  if (!cur) throw new Error("媒体请求不存在");
  db.prepare(
    "UPDATE media_requests SET status=?, prompt=?, params_json=?, source_label=?, asset_ids_json=?, content_id=?, updated_at=CURRENT_TIMESTAMP WHERE id=?"
  ).run(
    patch.status ?? cur.status,
    patch.prompt ?? cur.prompt,
    JSON.stringify(patch.params ?? cur.params),
    patch.sourceLabel !== undefined ? patch.sourceLabel : cur.source_label,
    JSON.stringify(patch.assetIds ?? cur.asset_ids),
    patch.contentId !== undefined ? patch.contentId : cur.content_id,
    id
  );
  return getMediaRequest(id)!;
}

export interface VideoSegmentPrompt {
  index: number;
  label: string;
  prompt: string;
}

function parseLineSeconds(line: string): number {
  const m = line.match(/(\d+(?:\.\d+)?)\s*(?:秒|s)/i);
  return m ? Number(m[1]) : 0;
}

function splitTextHalf(text: string): [string, string] {
  const t = text.trim();
  if (!t) return ["", ""];
  const mid = Math.floor(t.length / 2);
  const marks = [".", "。", "!", "！", ";", "；", "\n", "，", ","];
  let idx = mid;
  for (const mark of marks) {
    const near = t.lastIndexOf(mark, mid);
    if (near > Math.floor(t.length * 0.3)) {
      idx = near + 1;
      break;
    }
  }
  return [t.slice(0, idx).trim(), t.slice(idx).trim()];
}

/**
 * 15 秒以上视频：按分镜行内标注的时长尽量切分为 ≤15s 的一段段提示词。
 * 没有分镜或无法解析时长时，把整段提示词对半拆成两段，保证每段能独立生成。
 * 返回 segments.length >= 2 表示需要分段生成（生成后按顺序拼接）。
 */
export function buildVideoSegmentPrompts(opts: {
  prompt: string;
  storyboard?: string;
  duration?: number;
  ratio?: string;
  style?: string;
  scene?: string;
  bgm?: string;
  resolution?: string;
  maxSeconds?: number;
}): { segments: VideoSegmentPrompt[]; split: boolean } {
  const max = opts.maxSeconds ?? 15;
  const duration = Math.max(0, Number(opts.duration) || 0);
  const storyLines = (opts.storyboard || "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const extras = [
    opts.ratio && `画面比例：${opts.ratio}`,
    opts.style && `风格：${opts.style}`,
    opts.scene && `模特与场景：${opts.scene}`,
    opts.resolution && `分辨率：${opts.resolution}`,
    opts.bgm && `BGM：${opts.bgm}`,
  ].filter(Boolean) as string[];

  const makePrompt = (index: number, total: number, lines: string[], note: string) =>
    [
      opts.prompt.trim(),
      note,
      extras.join("；"),
      lines.length ? `本段分镜：\n${lines.join("\n")}` : "",
    ]
      .filter(Boolean)
      .join("\n");

  // 不需要分段：时长未知或 ≤15s
  if (duration <= max) {
    return {
      split: false,
      segments: [{ index: 1, label: "整段", prompt: makePrompt(1, 1, storyLines, "") }],
    };
  }

  let groups: string[][] = [];
  let current: string[] = [];
  let seconds = 0;
  for (const line of storyLines) {
    const lineSec = parseLineSeconds(line) || 5;
    if (current.length > 0 && seconds + lineSec > max) {
      groups.push(current);
      current = [];
      seconds = 0;
    }
    current.push(line);
    seconds += lineSec;
    if (seconds >= max) {
      groups.push(current);
      current = [];
      seconds = 0;
    }
  }
  if (current.length > 0) groups.push(current);

  if (groups.length < 2) {
    // 没有可解析分镜或时长切分不足两段：按文本对半拆，保证两段都可独立生成
    const [a, b] = storyLines.length >= 2 ? [storyLines.slice(0, Math.ceil(storyLines.length / 2)), storyLines.slice(Math.ceil(storyLines.length / 2))] : splitTextHalf(opts.prompt || "");
    groups = [
      Array.isArray(a) ? a : [a],
      Array.isArray(b) ? b : [b],
    ].map((g) => g.filter(Boolean));
  }

  const total = groups.length;
  const segments = groups
    .filter((g) => g.length > 0)
    .map((lines, i) => ({
      index: i + 1,
      label: `第 ${i + 1} 段 / 共 ${total} 段`,
      prompt: makePrompt(
        i + 1,
        total,
        lines,
        `（第 ${i + 1} 段，共 ${total} 段，总时长约 ${duration} 秒；请让本段首尾与相邻段落动作连续，便于之后顺序剪辑）`
      ),
    }));

  return { split: segments.length >= 2, segments };
}
