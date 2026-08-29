"use client";

interface SeriesPoint {
  date: string;
  followers: number;
  likes: number;
  views: number;
  saves: number;
}

function fmtDate(d: string) {
  return d.slice(5); // MM-DD
}

export function LineChart({
  data,
  field,
  color,
  unit = "",
}: {
  data: SeriesPoint[];
  field: keyof SeriesPoint;
  color: string;
  unit?: string;
}) {
  if (data.length === 0) return null;
  const w = 640;
  const h = 200;
  const pad = 28;
  const vals = data.map((d) => Number(d[field]) || 0);
  const max = Math.max(...vals, 1);
  const min = Math.min(...vals, 0);
  const n = data.length;
  const x = (i: number) => pad + (i * (w - pad * 2)) / Math.max(n - 1, 1);
  const y = (v: number) => h - pad - ((v - min) / (max - min || 1)) * (h - pad * 2);
  const line = vals.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(v)}`).join(" ");
  const area = `${line} L ${x(n - 1)} ${h - pad} L ${x(0)} ${h - pad} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img">
      <defs>
        <linearGradient id={`g-${field}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#g-${field})`} />
      <path d={line} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" />
      {vals.map((v, i) =>
        i % Math.ceil(n / 7) === 0 || i === n - 1 ? (
          <g key={i}>
            <circle cx={x(i)} cy={y(v)} r={3} fill={color} />
            <text x={x(i)} y={h - 8} fontSize={10} textAnchor="middle" fill="#a8a29e">
              {fmtDate(data[i].date)}
            </text>
          </g>
        ) : null
      )}
      <text x={pad} y={16} fontSize={11} fill="#a8a29e">
        {unit}
        {max.toLocaleString()}
      </text>
    </svg>
  );
}

export function BarChart({
  data,
  field,
  color,
}: {
  data: SeriesPoint[];
  field: keyof SeriesPoint;
  color: string;
}) {
  if (data.length === 0) return null;
  const w = 640;
  const h = 200;
  const pad = 28;
  const vals = data.map((d) => Number(d[field]) || 0);
  const max = Math.max(...vals, 1);
  const n = data.length;
  const bw = ((w - pad * 2) / n) * 0.6;
  const gap = (w - pad * 2) / n;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img">
      {vals.map((v, i) => {
        const bh = (v / max) * (h - pad * 2);
        return (
          <g key={i}>
            <rect
              x={pad + i * gap + (gap - bw) / 2}
              y={h - pad - bh}
              width={bw}
              height={bh}
              rx={3}
              fill={color}
              opacity={0.85}
            />
            {i % Math.ceil(n / 7) === 0 || i === n - 1 ? (
              <text
                x={pad + i * gap + gap / 2}
                y={h - 8}
                fontSize={10}
                textAnchor="middle"
                fill="#a8a29e"
              >
                {fmtDate(data[i].date)}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}
