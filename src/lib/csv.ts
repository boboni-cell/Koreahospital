// 轻量 CSV 解析（无第三方依赖）。支持逗号/分号/Tab 分隔、带引号字段、首行表头。

export function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  // 自动识别分隔符
  const firstLine = text.split(/\r?\n/).find((l) => l.trim().length > 0) ?? "";
  const delim = ["\t", ",", ";"].sort(
    (a, b) => (firstLine.split(b).length) - (firstLine.split(a).length)
  )[0];

  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const data: string[][] = [];
  for (const line of lines) {
    data.push(splitLine(line, delim));
  }
  const headers = data.length ? data[0].map((h) => h.trim()) : [];
  const rows = data.slice(1);
  return { headers, rows };
}

function splitLine(line: string, delim: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = false;
      } else cur += ch;
    } else {
      if (ch === '"') inQ = true;
      else if (ch === delim) { out.push(cur); cur = ""; }
      else cur += ch;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

/** 把已解析的 CSV 转成对象数组（按表头） */
export function csvToObjects(text: string): Record<string, string>[] {
  const { headers, rows } = parseCsv(text);
  return rows.map((r) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => (obj[h] = r[i] ?? ""));
    return obj;
  });
}

export function toCsv(headers: string[], rows: (string | number)[][]): string {
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n;\t]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");
}
