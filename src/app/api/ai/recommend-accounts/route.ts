import { NextRequest, NextResponse } from "next/server";
import { parseJsonBlock } from "@/lib/ai-client";
import { chatCompleteForAgent } from "@/lib/agent-llm";
import { requireAgentPreconditions } from "@/lib/agent-contracts";
import { selectSkillIds, resolveContents } from "@/lib/skills";

const ACCOUNTS = [
  "小红书·院长号", "小红书·顾问号", "小红书·官方号", "小红书·案例号", "小红书·科普号",
  "抖音·院长号", "抖音·负责人号", "抖音·官方号", "抖音·案例号", "抖音·引流号",
];
const ROLE_ACCOUNTS: Record<string, string> = {
  director: "小红书·院长号",
  consultant: "小红书·顾问号",
  official: "小红书·官方号",
  case_study: "小红书·案例号",
  knowledge: "小红书·科普号",
  viral: "抖音·引流号",
};

/**
 * 智能账号推荐（enhancement ②）：根据内容/选题类型，agent 判断该发到哪几个账号人设。
 * 未接模型时退化为按角色静态映射。
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const content = body.content || {};
  const title = content.title || "";
  const cbody = content.body || "";
  const role = content.role || "";
  const platform = content.platform || "xiaohongshu";

  const pre = requireAgentPreconditions("strategist");
  if (!pre.ok) return NextResponse.json({ error: pre.reason }, { status: 412 });

  let skillContent = "";
  try {
    const { ids } = await selectSkillIds("账号推荐", content);
    skillContent = await resolveContents(ids);
  } catch (e) {
    console.warn("[agent] skill 注入跳过", e);
  }

  try {
    const sys = [
      "你是账号矩阵运营。根据一篇内容，从给出的 10 个账号里选出最适合发布的 1-3 个（主发1个，可加1-2个助发）。",
      "依据：内容类型（科普/案例/答疑/品牌/热点）、人设匹配、平台调性。",
      "只输出一个 JSON 对象，不要解释、不要 markdown 围栏。",
    ];
    const user = [
      `标题：${title}`,
      `正文：${cbody.slice(0, 500)}`,
      `内容角色：${role}`,
      `平台：${platform}`,
      "",
      `可选账号：${ACCOUNTS.join("、")}`,
      "",
      '输出 JSON：{"accounts":["小红书·科普号"],"reason":"一句话理由"}',
    ].join("\n");
    const text = await chatCompleteForAgent(
      "strategist",
      [
        { role: "system", content: sys + (skillContent ? `\n\n参考 skill：\n${skillContent.slice(0, 2000)}` : "") },
        { role: "user", content: user },
      ],
      { maxTokens: 300, timeoutMs: 45000 }
    );
    const d = parseJsonBlock<{ accounts: string[]; reason: string }>(text);
    return NextResponse.json({ accounts: d.accounts || [], reason: d.reason || "", modelPowered: true });
  } catch (e) {
    console.error("recommend-accounts failed:", e);
    return NextResponse.json({ accounts: role ? [ROLE_ACCOUNTS[role]].filter(Boolean) : [], modelPowered: false });
  }
}
