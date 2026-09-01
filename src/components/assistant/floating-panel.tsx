"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bot, Send, ImagePlus, X, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const MAX_IMG_BYTES = 5 * 1024 * 1024;

/** 从任意 DataTransfer 里挑第一张图（剪贴板/拖拽通用）。 */
function firstImage(dt: DataTransfer | null | undefined): File | null {
  if (!dt) return null;
  for (const it of Array.from(dt.items || [])) {
    if (it.kind === "file" && it.type.startsWith("image/")) {
      const f = it.getAsFile();
      if (f) return f;
    }
  }
  if (dt.files && dt.files[0] && dt.files[0].type.startsWith("image/")) return dt.files[0];
  return null;
}

type Draft = { table: string; id?: number | null; fields: Record<string, unknown> };
type Msg = {
  id: number;
  role: "user" | "assistant";
  text: string;
  draft?: Draft[];
  suggestions?: string[];
  next?: string | null;
  pendingImage?: string; // dataURL
};

const PAGE_HINT: Record<string, string> = {
  "/accounts": "录入账号 / 改定位 / 改环境状态 / 改粉丝数",
  "/topics": "录入选题 / 改热度 / 改目标账号",
  "/data": "导入官方导出 / 看数据 / 写复盘",
  "/contents": "新建内容 / 复制变体 / 改简报",
  "/assets": "上传 / AI 生图 / AI 生视频",
  "/signals": "录入信号 / 关联账号 / 触发复盘",
  "/workbench": "看管线 / 标发布 / 刷新",
  "/settings/agent-models": "配置 / 测试 Agent 模型",
  "/settings/media-models": "配置 / 测试 图像 / 视频 模型",
  "/ops": "看今日 / 跳工作台 / 跳数据",
};

const ASSISTANT_NAME = "Toni";

/** 把 file 转 dataURL（前端 OCR 直接喂给多模态模型）。 */
function fileToDataURL(f: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = rej;
    r.readAsDataURL(f);
  });
}

export default function FloatingAssistant() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [img, setImg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname() || "/";
  const router = useRouter();

  // 自动滚动到底
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, open]);

  // 切页时给一条上下文提示（不发请求，仅 UI）
  useEffect(() => {
    if (!open) return;
    const hint = PAGE_HINT[pathname];
    if (hint) setMsgs((m) => m.some((x) => x.text.startsWith("💡")) ? m : [...m, { id: -Date.now(), role: "assistant", text: `💡 当前页 ${pathname}：${hint}` }]);
  }, [pathname, open]);

  // 全局快捷键：Ctrl/Cmd + ` = 切显隐；Esc = 关闭；Ctrl/Cmd+K = 聚焦输入框
  // 输入框已聚焦时不抢浏览器原生（粘贴/撤销/复制/Cmd+Z 全部走原生）
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const ae = document.activeElement as HTMLElement | null;
      const inEditable = !!ae && (ae.tagName === "TEXTAREA" || ae.tagName === "INPUT" || ae.isContentEditable);
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "`") { e.preventDefault(); setOpen((v) => !v); return; }
      if (mod && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen(true); taRef.current?.focus(); return; }
      if (e.key === "Escape" && open) { e.preventDefault(); setOpen(false); return; }
      // 防止在输入框里时 Ctrl+` 误触（macOS Ctrl+` 是切换输入法）
      if (inEditable) return;
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function send() {
    const text = input.trim();
    if (!text && !img) return;
    const userMsg: Msg = { id: Date.now(), role: "user", text: text || "(图片)", pendingImage: img ?? undefined };
    setMsgs((m) => [...m, userMsg]);
    setInput(""); setImg(null); setBusy(true);
    try {
      const r = await fetch("/api/agent/orchestrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "assistant",
          task: text,
          input: { pathname, image: img },
        }),
      });
      const d = await r.json();
      const reply: Msg = {
        id: Date.now() + 1,
        role: "assistant",
        text: d.reply || "(无回复)",
        draft: d.draft,
        suggestions: d.suggestions,
        next: d.next,
      };
      setMsgs((m) => [...m, reply]);
    } catch (e: any) {
      toast.error(e?.message || "调用失败");
      setMsgs((m) => [...m, { id: Date.now() + 1, role: "assistant", text: "❌ 请求失败,请检查 Agent 模型配置。" }]);
    } finally {
      setBusy(false);
    }
  }

  async function applyDraft(draft: Draft) {
    const url = `/api/${draft.table}${draft.id ? `/${draft.id}` : ""}`;
    const method = draft.id ? "PATCH" : "POST";
    try {
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft.fields) });
      if (!r.ok) {
        const t = await r.text().catch(() => "");
        toast.error(`写入失败 ${r.status}: ${t.slice(0, 80)}`);
        return;
      }
      toast.success(`已写入 ${draft.table}${draft.id ? `#${draft.id}` : ""}`);
      setMsgs((m) => [...m, { id: Date.now() + 2, role: "assistant", text: `✅ 已写入 ${draft.table}${draft.id ? ` id=${draft.id}` : ""}：${Object.keys(draft.fields).join(", ")}。刷新本页可见。` }]);
    } catch (e: any) {
      toast.error(e?.message || "写入异常");
    }
  }

  return (
    <>
      {/* 触发按钮：右下角圆形 */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "关闭助手" : "打开助手"}
        className={cn(
          "fixed bottom-5 right-5 z-50 flex h-12 w-12 items-center justify-center rounded-full border border-[#dfdad4] bg-white shadow-[0_10px_28px_rgba(38,33,29,.18)] transition hover:bg-[#fff8ef]",
          open && "hidden"
        )}
      >
        <Bot className="h-5 w-5 text-[#3a342e]" />
      </button>

      {open && (
        <div className="fixed bottom-5 right-5 z-50 flex h-[560px] w-[380px] flex-col overflow-hidden rounded-2xl border border-[#dfdad4] bg-[#fffefa] shadow-[0_24px_60px_rgba(38,33,29,.22)]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#dfdad4] bg-white px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#171619] text-white">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
              <div className="leading-tight">
                <div className="text-sm font-semibold text-[#171619]">{ASSISTANT_NAME}</div>
                <div className="text-[11px] text-[#8c857d]">{pathname}</div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} aria-label="关闭" className="rounded p-1 text-[#8c857d] hover:bg-[#f6f2ec]">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-3 text-sm">
            {msgs.length === 0 && (
              <div className="rounded-lg bg-[#f8f4ec] px-3 py-2 text-[12px] text-[#6d6761]">
                {ASSISTANT_NAME} 在这。粘贴截图我能识别字段，问"录入 X"我给草稿，点确认才入库。
              </div>
            )}
            {msgs.map((m) => (
              <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div className={cn("max-w-[85%] rounded-xl px-3 py-2", m.role === "user" ? "bg-[#171619] text-white" : "bg-[#f4efe8] text-[#171619]")}>
                  {m.pendingImage && (
                    <img src={m.pendingImage} alt="截图" className="mb-2 max-h-32 rounded border border-[#dfdad4]" />
                  )}
                  <div className="whitespace-pre-wrap break-words">{m.text}</div>
                  {m.draft && m.draft.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <div className="text-[11px] uppercase tracking-wide text-[#8c857d]">建议写入（需点确认）</div>
                      {m.draft.map((d, i) => (
                        <div key={i} className="rounded border border-[#dfdad4] bg-white px-2 py-1.5 text-[12px]">
                          <div className="mb-1 font-mono text-[#6d6761]">{d.table}{d.id ? ` #${d.id}` : ""} → {Object.keys(d.fields).join(", ")}</div>
                          <Button size="sm" variant="outline" onClick={() => applyDraft(d)} className="h-7 px-2 text-[11px]">
                            确认写入
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  {m.next && (
                    <Button size="sm" variant="outline" onClick={() => router.push(m.next!)} className="mt-2 h-7 px-2 text-[11px]">
                      跳转 {m.next}
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-xl bg-[#f4efe8] px-3 py-2 text-[#6d6761]">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>思考中…</span>
                </div>
              </div>
            )}
          </div>

          {/* Image preview */}
          {img && (
            <div className="border-t border-[#dfdad4] bg-white px-3 py-2">
              <div className="relative inline-block">
                <img src={img} alt="待发送" className="h-16 rounded border border-[#dfdad4]" />
                <button onClick={() => setImg(null)} className="absolute -right-2 -top-2 rounded-full bg-[#171619] p-0.5 text-white" aria-label="移除图片">
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}

          {/* Input */}
          <div className="border-t border-[#dfdad4] bg-white p-3">
            <div className="flex items-end gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  if (f.size > MAX_IMG_BYTES) { toast.error("图片过大（≤5MB）"); return; }
                  setImg(await fileToDataURL(f));
                  e.target.value = "";
                }}
              />
              <Button type="button" size="icon" variant="ghost" onClick={() => fileRef.current?.click()} aria-label="上传截图" className="h-9 w-9">
                <ImagePlus className="h-4 w-4" />
              </Button>
              <Textarea
                ref={taRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onPaste={async (e) => {
                  const f = firstImage(e.clipboardData);
                  if (!f) return; // 纯文本粘贴走浏览器原生
                  e.preventDefault();
                  if (f.size > MAX_IMG_BYTES) { toast.error("图片过大（≤5MB）"); return; }
                  setImg(await fileToDataURL(f));
                  toast.success("已从剪贴板粘贴图片");
                }}
                onKeyDown={(e) => {
                  // Enter 发；Shift+Enter 换行；Ctrl/Cmd+Enter 也发（习惯差异）
                  if (e.key === "Enter" && !e.shiftKey && !(e.metaKey || e.ctrlKey)) { e.preventDefault(); send(); }
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(); }
                }}
                placeholder="粘贴截图或输入消息…（Ctrl+` 开关，Esc 关闭）"
                rows={1}
                className="min-h-[36px] flex-1 resize-none text-sm"
              />
              <Button type="button" size="icon" onClick={send} disabled={busy || (!input.trim() && !img)} className="h-9 w-9">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}