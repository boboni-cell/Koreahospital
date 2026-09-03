export interface AdoptedTopic {
  title: string;
  description: string;
  heat: number;
}

export function parseAdoptedTopics(text: string): AdoptedTopic[] {
  const normalized = text.replace(/\*\*/g, "").replace(/`/g, "");
  return normalized.split(/(?=选题\s*\d+)/).filter((block) => /选题\s*\d+/.test(block)).map((block) => {
    const field = (name: string) => block.match(new RegExp(`${name}[：:]\\s*(.+)`))?.[1]?.replace(/^[-*。]\s*/, "").trim() || "";
    const angle = field("主线角度");
    const title = field("潜在标题方向") || angle;
    if (!title) return null;
    const description = [angle && `主线角度：${angle}`, field("目标人群") && `目标人群：${field("目标人群")}`, field("笔记类型") && `笔记类型：${field("笔记类型")}`, field("医疗合规自查") && `合规提示：${field("医疗合规自查")}`].filter(Boolean).join("｜");
    return { title: title.slice(0, 120), description: description.slice(0, 1000), heat: 5 };
  }).filter((topic): topic is AdoptedTopic => Boolean(topic));
}
