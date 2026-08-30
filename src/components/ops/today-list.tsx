"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, Check, Pencil, ShieldAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Content {
  id: number;
  title: string;
  body: string;
  platform: string;
  role: string;
  status: string;
  data_filled?: number;
  cover_url?: string | null;
}

const PLATFORM: Record<string, string> = { xiaohongshu: "小红书", douyin: "抖音" };
const ROLE: Record<string, string> = {
  director: "院长号",
  consultant: "顾问号",
  case_study: "案例号",
  knowledge: "科普号",
  official: "官方号",
};

/** 合规软提醒清单（可跳过） */
const COMPLIANCE = [
  "无「最佳/首选/保证效果/100%」等绝对化用语",
  "无夸大疗效、无暗示比其他机构更好",
  "无未授权患者面部/可识别信息",
  "无引导站外私下交易",
];

/** 按内容类型推荐发布账号（deterministic，按选题类型/关键词）；平台侧同步 */
type AccountRec = { account: string; reason: string };
function recommendAccounts(c: { title: string; body?: string; role: string; platform: string }): AccountRec[] {
  const p = c.platform === "douyin" ? "抖音" : c.platform === "tiktok" ? "TikTok" : c.platform === "instagram" ? "Instagram" : c.platform === "youtube" ? "YouTube" : "小红书";
  const text = `${c.title} ${c.body ?? ""}`.toLowerCase();
  const roleMap: Record<string, string> = {
    director: `${p}·院长号`,
    consultant: `${p}·顾问号`,
    official: `${p}·官方号`,
    case_study: `${p}·案例号`,
    knowledge: `${p}·科普号`,
    viral: `${p}·引流号`,
  };
  // 类型判断：案例/对比 → 案例号；科普/干货/答疑 → 科普号；费用/流程/价格 → 顾问号；品牌/环境 → 官方号；热点/盘点 → 引流
  if (/案例|对比|前后|180天|恢复|日记|记录/.test(text)) return [{ account: roleMap["case_study"] ?? `${p}·案例号`, reason: "案例/恢复记录，案例号最合适" }];
  if (/费用|价格|多少钱|答疑|流程|怎么选|区别/.test(text)) return [{ account: roleMap["consultant"] ?? `${p}·顾问号`, reason: "费用/答疑类，顾问号承接咨询" }];
  if (/科普|干货|是不是|误区|自测|常识/.test(text)) return [{ account: roleMap["knowledge"] ?? `${p}·科普号`, reason: "科普/干货，科普号涨粉" }];
  if (/品牌|环境|体验|服务|探店/.test(text)) return [{ account: roleMap["official"] ?? `${p}·官方号`, reason: "品牌/环境，官方号立信任" }];
  if (/热点|盘点|避坑|趋势|排行/.test(text)) return [{ account: `${p}·引流号`, reason: "热点/盘点，引流号抓流量" }];
  // 兜底：按 role 角色映射
  return [{ account: roleMap[c.role] ?? `${p}·院长号`, reason: `按角色 ${c.role} 推荐` }];
}

export default function TodayList() {
  const [items, setItems] = useState<Content[]>([]);
  const [copied, setCopied] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [complianceChecked, setComplianceChecked] = useState<Set<number>>(new Set());
  const [confirmPublish, setConfirmPublish] = useState<number | null>(null);
  const [metrics, setMetrics] = useState<{ [id: number]: { likes: string; saves: string; comments: string; shares: string; views: string } }>({});

  const load = useCallback(() => {
    fetch("/api/contents")
      .then((r) => r.json())
      .then((d: Content[]) => setItems(d));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const pending = items.filter((c) => c.status !== "published");
  const done = items.filter((c) => c.status === "published");

  function toggleExpand(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function copyText(c: Content) {
    navigator.clipboard.writeText(`${c.title}\n\n${c.body}`).then(() => {
      setCopied(c.id);
      toast.success("文案已复制，去小红书/抖音粘贴发布吧");
      setTimeout(() => setCopied(null), 2000);
    });
  }

  function markPublished(id: number) {
    fetch(`/api/contents/${id}/publish`, { method: "POST" })
      .then(() => {
        toast.success("已标记为已发布，记得回来回填数据");
        load();
      })
      .catch(() => toast.error("标记失败"));
  }

  async function backfill(id: number) {
    const m = metrics[id] || {};
    const body = {
      content_id: id,
      likes: Number(m.likes || 0),
      saves: Number(m.saves || 0),
      comments: Number(m.comments || 0),
      shares: Number(m.shares || 0),
      views: Number(m.views || 0),
    };
    const r = await fetch("/api/post-metrics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (r.ok) {
      toast.success("数据已回填，进「报表中心」可看日报/周报");
      load();
    } else toast.error("回填失败");
  }

  function setM(id: number, k: string, v: string) {
    setMetrics((p) => ({ ...p, [id]: { ...(p[id] || { likes: "", saves: "", comments: "", shares: "", views: "" }), [k]: v } }));
  }

  const mOf = (id: number) => metrics[id] || { likes: "", saves: "", comments: "", shares: "", views: "" };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge className="bg-rose-100 text-rose-600">待发 {pending.length}</Badge>
        <Badge className="bg-emerald-100 text-emerald-600">已发布 {done.length}</Badge>
        <Badge className={done.some((c) => !c.data_filled) ? "bg-amber-100 text-amber-600" : "bg-stone-100 text-stone-400"}>
          待回填 {done.filter((c) => !c.data_filled).length}
        </Badge>
        {done.length + pending.length > 0 && (
          <div className="h-2 w-40 overflow-hidden rounded-full bg-stone-100">
            <div
              className="h-full rounded-full bg-emerald-400 transition-all"
              style={{ width: `${Math.round((done.length / (done.length + pending.length)) * 100)}%` }}
            />
          </div>
        )}
        <p className="text-xs text-stone-400">
          发布进度 {Math.round((done.length / (done.length + pending.length || 1)) * 100)}% ·
          复制文案→平台发布→标记已发布→回填数据
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {pending.map((c) => (
          <Card key={c.id} className="flex flex-col">
            <CardContent className="flex flex-1 flex-col gap-3 pt-4">
              <div className="flex items-center justify-between">
                <Badge>{PLATFORM[c.platform] ?? c.platform}</Badge>
                <span className="text-xs text-stone-400">{ROLE[c.role] ?? c.role}</span>
              </div>
              <div className="text-sm font-semibold text-stone-800">{c.title}</div>
              <p className={`flex-1 text-xs leading-relaxed text-stone-500 ${expanded.has(c.id) ? "" : "line-clamp-4"}`}>
                {c.body}
              </p>
              {(c.body?.length ?? 0) > 120 && (
                <button onClick={() => toggleExpand(c.id)} className="self-start text-xs text-rose-500 hover:text-rose-600">
                  {expanded.has(c.id) ? "收起 ▲" : "显示全部 ▼"}
                </button>
              )}

              {/* 账号类型推荐 */}
              <div className="flex flex-wrap gap-1">
                {recommendAccounts(c).map((r) => (
                  <span key={r.account} title={r.reason} className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] text-indigo-500">📌 {r.account}</span>
                ))}
              </div>

              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => copyText(c)}>
                  {copied === c.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied === c.id ? "已复制" : "复制文案"}
                </Button>
                <Button size="sm" className="flex-1" onClick={() => setConfirmPublish(c.id)}>
                  标记已发布
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 合规软提醒弹窗 */}
      {confirmPublish != null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-3 flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-500" />
              <h3 className="text-sm font-semibold text-stone-800">发布前合规自查（可跳过）</h3>
            </div>
            <ul className="mb-4 space-y-2 text-xs text-stone-600">
              {COMPLIANCE.map((item) => {
                const on = complianceChecked.has(confirmPublish);
                return (
                  <li key={item} className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        setComplianceChecked((prev) => {
                          const next = new Set(prev);
                          if (next.has(confirmPublish)) next.delete(confirmPublish);
                          else next.add(confirmPublish);
                          return next;
                        })
                      }
                      className={`flex h-4 w-4 items-center justify-center rounded border ${on ? "border-emerald-500 bg-emerald-500 text-white" : "border-stone-300"}`}
                    >
                      {on && <Check className="h-3 w-3" />}
                    </button>
                    {item}
                  </li>
                );
              })}
            </ul>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setConfirmPublish(null)}>
                跳过
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  markPublished(confirmPublish);
                  setConfirmPublish(null);
                }}
              >
                确认发布
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 已发布 + 数据回填 */}
      {done.length > 0 && (
        <div className="mt-8">
          <h3 className="mb-3 text-sm font-medium text-stone-400">已发布（{done.length}）</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {done.map((c) => {
              const m = mOf(c.id);
              return (
                <Card key={c.id} className="flex flex-col">
                  <CardContent className="flex flex-1 flex-col gap-2 pt-4">
                    <div className="flex items-center justify-between">
                      <Badge>{PLATFORM[c.platform] ?? c.platform}</Badge>
                      <Badge className={c.data_filled ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"}>
                        {c.data_filled ? "已回填" : "待回填"}
                      </Badge>
                    </div>
                    <div className="truncate text-sm font-medium text-stone-800">{c.title}</div>
                    {!c.data_filled ? (
                      <div className="grid grid-cols-5 gap-1.5 text-xs">
                        <Field label="赞" value={m.likes} onChange={(v) => setM(c.id, "likes", v)} />
                        <Field label="藏" value={m.saves} onChange={(v) => setM(c.id, "saves", v)} />
                        <Field label="评" value={m.comments} onChange={(v) => setM(c.id, "comments", v)} />
                        <Field label="享" value={m.shares} onChange={(v) => setM(c.id, "shares", v)} />
                        <Field label="播" value={m.views} onChange={(v) => setM(c.id, "views", v)} />
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-xs text-emerald-600">
                        <Check className="h-3.5 w-3.5" /> 数据已回填，见报表中心
                      </div>
                    )}
                    <div className="mt-auto flex gap-2 pt-1">
                      {!c.data_filled && (
                        <Button size="sm" className="flex-1" onClick={() => backfill(c.id)}>
                          <Pencil className="h-3.5 w-3.5" /> 回填数据
                        </Button>
                      )}
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => copyText(c)}>
                        <Copy className="h-3.5 w-3.5" /> 复制
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col items-center gap-0.5">
      <span className="text-[10px] text-stone-400">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 w-full rounded border border-stone-200 px-1 text-center text-xs focus:outline-none"
      />
    </label>
  );
}
