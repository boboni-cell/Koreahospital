export const SURGERY_TYPE_OPTIONS = [
  "FUE",
  "FUT",
  "微针",
  "不剃发",
  "发际线调整",
  "眉毛/睫毛",
];

// 脱发等级（Norwood）下拉选项 + 自定义填
export const NORWOOD_OPTIONS = ["I", "II", "III", "IV", "V", "VI", "VII"];

export const ASSET_CATEGORY_OPTIONS = [
  "术前案例",
  "术后案例",
  "科普图示",
  "手术环境",
  "授权文件",
  "宣传物料",
];

export const PLATFORMS = [
  { id: "xiaohongshu", name: "小红书" },
  { id: "douyin", name: "抖音" },
  { id: "tiktok", name: "TikTok" },
  { id: "instagram", name: "Instagram" },
  { id: "youtube", name: "YouTube" },
  { id: "weibo", name: "微博" },
  { id: "wechat", name: "公众号" },
  { id: "shipinhao", name: "微信视频号" },
  { id: "naver", name: "Naver" },
];

export const PLATFORM_NAME: Record<string, string> = Object.fromEntries(
  PLATFORMS.map((p) => [p.id, p.name])
);

/**
 * 平台 → 建议调用的 skill id。
 * 你之前添加的 skill（creator-buddy / mengke-wang 等）按平台路由。
 * 未命中时回退到基础创作，未来你找到对应平台的 skill 后在此追加。
 */
export const PLATFORM_SKILL: Record<string, string | string[]> = {
  xiaohongshu: ["space-xhs-positioning", "space-xhs-title", "space-xhs-writer"],
  douyin: ["space-xhs-writer", "video-storyboard"],
  tiktok: ["video-storyboard"],
  instagram: ["gbro-cover-design", "space-xhs-title"],
  youtube: ["video-storyboard"],
  weibo: ["gbro-cover-design", "space-xhs-title"],
  wechat: ["space-xhs-title", "space-wechat-layout"],
  shipinhao: ["video-storyboard"],
  naver: ["space-xhs-title"],
};

// 视频脚本类型（feature：广告 / 院长实拍 / 医院日常 / vlog…）
export const VIDEO_SCRIPT_TYPES = [
  { id: "ad", name: "品牌广告片" },
  { id: "doctor", name: "院长出镜实拍" },
  { id: "daily", name: "医院日常" },
  { id: "vlog", name: "患者康复 vlog" },
  { id: "tvc", name: "TVC 宣传片" },
  { id: "education", name: "知识科普口播" },
];

export const ROLES = [
  "director",
  "consultant",
  "official",
  "case_study",
  "knowledge",
  "viral",
];

// 账号环境状态（PRD 8.1）
export const ACCOUNT_ENVIRONMENT_STATUS = [
  { id: "configuring", name: "配置中" },
  { id: "active", name: "可用" },
  { id: "paused", name: "暂停" },
  { id: "login_expired", name: "登录失效" },
  { id: "risk_limited", name: "风险限制" },
  { id: "archived", name: "已归档" },
];

export const ACCOUNT_ENVIRONMENT_NAME: Record<string, string> = Object.fromEntries(
  ACCOUNT_ENVIRONMENT_STATUS.map((s) => [s.id, s.name])
);

// 账号定位建议（一个账号只有一个主要定位）
export const ACCOUNT_POSITIONING_OPTIONS = [
  "医院官方号",
  "院长IP号",
  "案例见证号",
  "海外获客号",
  "科普号",
  "咨询顾问号",
];
