export interface AdoptedTopic {
  title: string;
  description: string;
  heat: number;
}

export function parseAdoptedTopics(text: string): AdoptedTopic[] {
  const normalized = text.replace(/\*\*/g, "").replace(/`/g, "").replace(/｜/g, "|");

  // 总编报告的最后一节是交接表。优先读取这张表，避免把前面的热点榜单误当成选题。
  const lines = normalized.split(/\r?\n/);
  const headerIndex = lines.findIndex((line) => /选题\s*ID\s*\|\s*选题方向/.test(line));
  if (headerIndex >= 0) {
    const tableTopics = lines.slice(headerIndex + 1).map((line) => {
      const cells = line.split("|").map((cell) => cell.trim()).filter(Boolean);
      if (!cells.length || !/^\d+$/.test(cells[0])) return null;
      const title = (cells[1] || cells[0]).replace(/^[-*。]\s*/, "").trim();
      if (!title) return null;
      return { title: title.slice(0, 120), description: cells.slice(2).join("｜").slice(0, 1000), heat: 5 };
    }).filter((topic): topic is AdoptedTopic => Boolean(topic));
    if (tableTopics.length) return tableTopics;
  }

  const blocks = normalized.split(/(?=选题\s*\d+)/).filter((block) => /选题\s*\d+/.test(block));
  const parsed = blocks.map((block) => {
    const field = (name: string) => block.match(new RegExp(`${name}[：:]\\s*(.+)`))?.[1]?.replace(/^[-*。]\s*/, "").trim() || "";
    const angle = field("主线角度");
    const title = field("潜在标题方向") || angle;
    if (!title) return null;
    const description = [angle && `主线角度：${angle}`, field("目标人群") && `目标人群：${field("目标人群")}`, field("笔记类型") && `笔记类型：${field("笔记类型")}`, field("医疗合规自查") && `合规提示：${field("医疗合规自查")}`].filter(Boolean).join("｜");
    return { title: title.slice(0, 120), description: description.slice(0, 1000), heat: 5 };
  }).filter((topic): topic is AdoptedTopic => Boolean(topic));
  if (parsed.length) return parsed;
  return [];
}
