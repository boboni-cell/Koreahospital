export interface MediaItem {
  type: "image" | "video";
  url: string;
}

/** ponytail: 受控 JSON 字符串数组,加载时 JSON.parse,保存时 JSON.stringify。
 * 失败的 fallback 是空数组。最大 8 个,超出提示用户先删除。 */
export function parseMediaUrls(raw: string | null | undefined): MediaItem[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter(
      (m): m is MediaItem =>
        m && typeof m.url === "string" && (m.type === "image" || m.type === "video")
    );
  } catch {
    return [];
  }
}