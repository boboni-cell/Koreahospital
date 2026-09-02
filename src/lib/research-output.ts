const URL_RE = /https?:\/\/[^\s)\]}>,，。；]+/g;

export function separateResearchOutput(text: string) {
  const sources = Array.from(new Set(text.match(URL_RE) || []));
  const result = text.split("\n")
    .filter((line) => !(httpsLine(line) && /^\s*(?:[-*]\s*)?(?:来源|参考链接)[：:]/i.test(line)))
    .map((line) => line.replace(URL_RE, "").replace(/(?:URL|链接)[：:]\s*/gi, "").trimEnd())
    .join("\n").replace(/\n{3,}/g, "\n\n").trim();
  return { result, sources };
}

function httpsLine(line: string) {
  return line.includes("http://") || line.includes("https://");
}
