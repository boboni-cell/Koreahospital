export interface CopyInput {
  patientId?: string;
  surgery?: string;
  norwood?: string;
  days?: string;
  highlight?: string;
  platform?: "xiaohongshu" | "douyin";
}

export const ROLE_BRIEF: Record<string, string> = {
  director: "院长版：专业、权威，从医学角度讲解",
  consultant: "顾问版：亲切、答疑，聚焦费用与流程",
  official: "官方版：品牌调性，环境与服务",
  case_study: "案例版：第一人称恢复日记",
  knowledge: "科普版：干货科普，破除误区",
  viral: "引流版：热点切入，强钩子",
};

export const ROLE_ORDER: string[] = [
  "director",
  "consultant",
  "official",
  "case_study",
  "knowledge",
  "viral",
];

export function buildCopySystem(skills?: string): string {
  const parts = [
    "你是韩国毛发移植医院的矩阵内容文案专家。",
    "严格遵守中国医疗广告法与平台规则：禁用「最佳/首选/保证效果/100%」等绝对化用语，不夸大疗效，不承诺结果。",
    "所有内容必须合规、真实、可落地，语气符合各账号人设。",
    "只输出一个 JSON 对象，不要任何解释文字、不要 markdown 围栏。",
  ];
  const extra = skills ? skills
    .split(/^#\s*/m)
    .map((s) => s.trim())
    .filter((s) => s.length > 40)
    .slice(0, 4) : [];
  if (extra.length) {
    parts.push(
      "",
      "以下是须遵守的补充规范（来自内部 skill，务必合并到上面规则中执行）：",
      ...extra
    );
  }
  return parts.join("\n");
}

export function buildCopyUser(p: CopyInput): string {
  const roles = ROLE_ORDER.map((r) => `- ${r}：${ROLE_BRIEF[r]}`).join("\n");
  return [
    `患者编号：${p.patientId || "（未填）"}`,
    `手术方式：${p.surgery || "植发"}`,
    `脱发等级：Norwood ${p.norwood || "III"}`,
    `恢复天数：${p.days || "180"}`,
    `关键亮点：${p.highlight || "发际线自然、密度均匀"}`,
    `目标平台：${p.platform === "douyin" ? "抖音（短视频口播文案）" : "小红书（图文笔记文案）"}`,
    "",
    "请生成全部角色共 6 篇文案。输出 JSON 数组：",
    roles,
    "",
    '格式：[{"role":"director","title":"标题","body":"正文","tags":["标签1","标签2"]}, ...]',
  ].join("\n");
}

export function buildSingleRoleUser(p: CopyInput, role: string): string {
  return [
    buildCopyUser(p),
    "",
    `本次只生成角色：${role}（${ROLE_BRIEF[role] ?? ""}）`,
    '只输出一个 JSON 对象：{"role":"' + role + '","title":"标题","body":"正文","tags":["标签1"]}',
  ].join("\n");
}

export function buildScoreSystem(): string {
  return [
    "你是内容质量评审。按 5 个维度给单篇文案打分（1-10）并给改进建议。",
    "维度：钩子吸引力、信息密度、合规安全性、平台适配度、转化引导力。",
    "只输出一个 JSON 对象，不要任何解释文字、不要 markdown 围栏。",
  ].join("\n");
}

export function buildScoreUser(role: string, title: string, body: string): string {
  return [
    `账号角色：${role}`,
    `标题：${title}`,
    `正文：${body}`,
    "",
    '输出 JSON：{"role":"角色","scores":{"钩子":8,"信息密度":7,"合规":9,"平台适配":8,"转化":6},"strengths":["优点1"],"weaknesses":["不足1"],"tips":["改进建议1"]}',
  ].join("\n");
}
