export const HOTSPOT_SOURCES = [
  { id: "rednote", name: "小红书" },
  { id: "weibo", name: "微博" },
  { id: "douyin", name: "抖音" },
  { id: "toutiao", name: "头条" },
  { id: "zhihu", name: "知乎" },
] as const;

export interface HotspotItem {
  rank: number;
  title: string;
  hotValue: string;
  link: string;
  detail: string;
  cover: string;
}

export function normalizeHotspots(payload: unknown): HotspotItem[] {
  const root = payload as any;
  const rows = Array.isArray(root) ? root : Array.isArray(root?.data) ? root.data : [];
  return rows.map((item: any, index: number) => ({
    rank: Number(item.rank ?? item.position) || index + 1,
    title: String(item.title ?? item.word ?? "").trim(),
    hotValue: String(item.hot_value_desc ?? item.hot_value ?? item.score ?? ""),
    link: String(item.link ?? ""),
    detail: String(item.detail ?? ""),
    cover: String(item.cover ?? ""),
  })).filter((item: HotspotItem) => item.title).slice(0, 30);
}
