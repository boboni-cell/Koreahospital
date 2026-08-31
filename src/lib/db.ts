import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

const dataDir = path.join(process.cwd(), "data");
fs.mkdirSync(dataDir, { recursive: true });
const dbPath = path.join(dataDir, "clinic.db");

// 单例：避免构建期多模块并发打开各自连接导致 SQLITE_BUSY
const g = globalThis as unknown as { __clinicDb?: Database.Database };
const db = g.__clinicDb ?? new Database(dbPath);
if (!g.__clinicDb) {
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 8000");
  g.__clinicDb = db;
}

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  role TEXT DEFAULT 'staff'
);

CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  platform TEXT NOT NULL,
  handle TEXT NOT NULL,
  role TEXT,
  followers INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  body TEXT,
  platform TEXT,
  role TEXT,
  status TEXT DEFAULT 'draft',
  scheduled_for TEXT,
  cover_url TEXT,
  published_at TEXT,
  data_filled INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS assets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT NOT NULL,
  file_url TEXT,
  r2_key TEXT,
  file_type TEXT DEFAULT 'image',
  category TEXT DEFAULT '未分类',
  file_size INTEGER,
  surgery_type TEXT,
  patient_code TEXT,
  license TEXT DEFAULT 'pending',
  usage_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER,
  date TEXT NOT NULL,
  followers INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS post_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content_id INTEGER,
  date TEXT DEFAULT CURRENT_DATE,
  likes INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  status TEXT DEFAULT 'todo',
  due TEXT,
  assignee TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS schedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER,
  slot_time TEXT NOT NULL,
  content_id INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS topics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  source TEXT DEFAULT 'manual',
  heat_score INTEGER DEFAULT 5,
  target_accounts TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sop_docs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  content_md TEXT,
  is_required INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 99,
  version INTEGER DEFAULT 1,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_name TEXT,
  channel TEXT DEFAULT '微信',
  content TEXT NOT NULL,
  summary TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`);

// 幂等约束：同一账号同一天一条（支持 CSV 重复上传不重复累计）
db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_metrics_acc_date ON metrics(account_id, date)");

// 首次启动种子（用文件锁避免构建期多 worker 并发重复播种）
const SEED_LOCK = path.join(dataDir, ".seed.lock");
if (!fs.existsSync(SEED_LOCK)) {
  const count = db.prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number };
  if (count.n === 0) {
  db.prepare("INSERT OR IGNORE INTO users (name, email, role) VALUES (?, ?, ?)").run(
    "管理员",
    "admin@clinic.com",
    "admin"
  );

  const accounts = [
    ["xiaohongshu", "院长号", "director"],
    ["xiaohongshu", "顾问号", "consultant"],
    ["xiaohongshu", "官方号", "official"],
    ["xiaohongshu", "案例号", "case_study"],
    ["xiaohongshu", "科普号", "knowledge"],
    ["douyin", "院长号", "director"],
    ["douyin", "负责人号", "consultant"],
    ["douyin", "官方号", "official"],
    ["douyin", "案例号", "case_study"],
    ["douyin", "引流号", "viral"],
  ] as const;
  const insAcc = db.prepare("INSERT OR IGNORE INTO accounts (platform, handle, role) VALUES (?, ?, ?)"
  );
  for (const a of accounts) insAcc.run(...a);

  const topics = [
    { title: "明星发际线翻车，普通人怎么避坑", description: "蹭热点做科普向", source: "manual", heat_score: 8, target_accounts: "[10,5]" },
    { title: "术后脱落期别慌，一图看懂", description: "恢复日记配套科普", source: "manual", heat_score: 7, target_accounts: "[4,9]" },
    { title: "韩国 vs 国内植发怎么选", description: "中韩对比，合规表述", source: "manual", heat_score: 6, target_accounts: "[3,8]" },
    { title: "FUE 取发到底疼不疼", description: "院长出镜解答高频疑问", source: "manual", heat_score: 9, target_accounts: "[1,6]" },
  ] as const;
  const insTopic = db.prepare("INSERT OR IGNORE INTO topics (title, description, source, heat_score, target_accounts) VALUES (@title, @description, @source, @heat_score, @target_accounts)"
  );
  for (const t of topics) insTopic.run(t);

  const insertSop = db.prepare(`
    INSERT INTO sop_docs (title, category, content_md, is_required, sort_order, version, updated_at)
    VALUES (@title, @category, @content_md, @is_required, @sort_order, 1, CURRENT_TIMESTAMP)
  `);
  const sops: Record<string, unknown>[] = [
    {
      title: "医疗内容合规红线（新人必读）",
      category: "crisis",
      is_required: 1,
      sort_order: 1,
      content_md: `# 医疗内容合规红线

> ⚠️ 全部账号发布前必须自查，违反任一条禁止发布。

## 一、中国医疗广告法
- ❌ 禁止使用"最佳""首选""保证效果""100%成功"等绝对化用语
- ❌ 禁止承诺疗效、对比暗示其他机构更差
- ✅ 使用"有助于""多数患者反馈"等客观表述

## 二、韩国医疗跨境合规
- 海外医疗机构在中国社媒宣传需注意跨境医疗广告备案
- 韩国院区资质需脱敏处理，避免直接导流到境外问诊

## 三、平台规则（小红书 / 抖音）
- 医美内容有专项审核，避免夸大疗效、术前术后强烈对比诱导
- 不引导站外私下交易

## 四、患者隐私
- 所有案例须获书面授权，素材库跟踪授权状态
- 面部需打码或获特写授权

## 五、发布纪律
- 手动复制粘贴发布，不使用 RPA / 自动化工具
- 10 个账号错开时间发布，避免同质化被限流
`,
    },
    {
      title: "账号矩阵运营规范",
      category: "account_ops",
      is_required: 1,
      sort_order: 2,
      content_md: `# 账号矩阵运营规范

10 个账号按角色分工：

| 账号 | 平台 | 角色 | 内容方向 |
| --- | --- | --- | --- |
| 院长号 | 小红书 | director | 术前诊断、科普 |
| 顾问号 | 小红书 | consultant | 费用、流程、答疑 |
| 官方号 | 小红书 | official | 品牌、环境、活动 |
| 案例号 | 小红书 | case_study | before/after |
| 科普号 | 小红书 | knowledge | 干货合集 |
| 院长号 | 抖音 | director | 出镜讲解 |
| 负责人号 | 抖音 | consultant | 医院日常 vlog |
| 官方号 | 抖音 | official | 品牌宣传 |
| 案例号 | 抖音 | case_study | 恢复跟拍 |
| 引流号 | 抖音 | viral | 热点引流 |

**更新频率要求**：每日检查今日待发，按时发布并回填数据。`,
    },
    {
      title: "数据录入 SOP",
      category: "data",
      is_required: 0,
      sort_order: 3,
      content_md: `# 数据录入 SOP

每天 10:00 前录入昨日各账号数据：

1. 进入「数据录入」页
2. 按账号填写：粉丝数、点赞、收藏、评论、分享、播放/浏览
3. 系统自动计算增量
4. 周末补齐周报所需数据

> 数据口径统一：粉丝数以平台后台为准，截图留档。`,
    },
    {
      title: "起号方法论（借鉴 xiaobei 开源思路）",
      category: "account_ops",
      is_required: 1,
      sort_order: 4,
      content_md: `# 起号方法论

> 方法论参考开源项目 [xiaobei](https://github.com/TeamWiseFlow/xiaobei)（Wiseflow Team，MIT），结合本院矩阵落地。

## 一、账号定位三步
1. **选角色**：本院 10 号已分 director / consultant / official / case_study / knowledge / viral 六类，先定人设再定内容。
2. **定内容支柱**：每个号 1-2 个固定栏目（如院长的「术前诊断」、案例号的「恢复日记」），让用户形成预期。
3. **稳更新**：新号前 14 天日更养权重，之后按 PRD 频率（3-5 条/周）维持。

## 二、冷启动获量
- 前 5 条用高搜索低竞争词（如「发际线种植疼不疼」），不做大词。
- 评论区主动答疑，沉淀私信咨询。
- 跨号互推：案例号引流 → 顾问号承接咨询。

## 三、内容节奏
- 70% 干货/科普（涨粉）+ 20% 案例（种草）+ 10% 品牌（信任）。
- 错峰发布，避免 10 号同质化被限流。

## 四、红线
- 不承诺疗效、不对比贬低同行、不自动发布（见合规红线 SOP）。`,
    },
    {
      title: "选题研究方法（借鉴 xiaobei Smart Search 思路）",
      category: "content",
      is_required: 0,
      sort_order: 5,
      content_md: `# 选题研究方法

> 参考开源项目 [xiaobei](https://github.com/TeamWiseFlow/xiaobei) 的 Smart Search 多信源选题思路，仅用于选题分析，不抓取、不发布。

## 一、信源矩阵
小红书 / 抖音 / 微博 / 知乎 / B站 / 公众号 六类信源交叉看，避免只看单一平台导致同质化。

## 二、选题四问
1. **搜索量**：用户是否在搜？（高搜索词优先）
2. **竞争度**：大号是否 already 覆盖？（找缝隙）
3. **人设匹配**：是否契合本院某账号角色？
4. **合规安全**：是否触及医疗广告红线？

## 三、热度评估（1-10）
- 钩子强度（痛点/反常识）+ 信息密度 + 可收藏性。
- 工作台「选题研究」页按此维度给 heat 分与切入点建议。

## 四、落地
- 选中选题 → 进「AI 文案工坊」生成 5 角色文案 → 打分卡筛优 → 存入排期。`,
    },
  ];
  const insertSops = db.transaction((rows: Record<string, unknown>[]) => {
    for (const r of rows) insertSop.run(r);
  });
  insertSops(sops);
  }

  // 演示日程与沟通记录
  db.prepare("INSERT OR IGNORE INTO schedules (account_id, slot_time, content_id) VALUES (1, ?, NULL)"
  ).run(new Date(Date.now() + 86400000).toISOString().slice(0, 16).replace("T", " ") + ":00");
  db.prepare("INSERT OR IGNORE INTO notes (patient_name, channel, content, summary) VALUES (?, ?, ?, ?)"
  ).run("李女士", "微信", "咨询发际线种植费用，预算 2 万内，想了解 FUE 和微针区别。", "已发送报价单与对比资料");

  // 演示素材
  const insAsset = db.prepare("INSERT OR IGNORE INTO assets (filename, file_type, category, surgery_type, patient_code, license, usage_count) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );
  const demoAssets: [string, string, string, string | null, string | null, string, number][] = [
    ["案例-术前对比-001.jpg", "image", "术前案例", "FUE", "P-2026-001", "authorized", 12],
    ["案例-术后180天-001.jpg", "image", "术后案例", "FUE", "P-2026-001", "authorized", 9],
    ["发际线设计示意图.png", "image", "科普图示", "微针", "P-2026-002", "authorized", 21],
    ["手术环境-无菌层流.jpg", "image", "手术环境", "FUT", null, "authorized", 5],
    ["患者授权书模板.pdf", "doc", "授权文件", null, null, "pending", 3],
    ["术后护理清单.pdf", "doc", "授权文件", null, null, "authorized", 15],
  ];
  for (const a of demoAssets) insAsset.run(...a);
  // 演示内容（待发布）
  const insContent = db.prepare("INSERT OR IGNORE INTO contents (title, body, platform, role, status) VALUES (?, ?, ?, ?, ?)"
  );
  const demoContents = [
    ["院长亲述｜Norwood 3级真实记录", "今天分享一例典型病例，Norwood III级正是植发黄金干预期…", "xiaohongshu", "director", "draft"],
    ["发际线种植费用答疑", "最近很多姐妹私信问费用，今天统一回复：FUE按单位计费…", "xiaohongshu", "consultant", "draft"],
    ["术后180天恢复日记", "从下定决心到现在整整180天，完整恢复过程记录…", "xiaohongshu", "case_study", "draft"],
    ["抖音｜院长出镜讲脱发等级", "镜头前讲解Norwood分级，重点说III级干预时机…", "douyin", "director", "draft"],
    ["科普｜发际线后移就是脱发吗", "先别慌，额角轻微后移未必是脱发，教你自测…", "xiaohongshu", "knowledge", "draft"],
  ];
  for (const c of demoContents) insContent.run(...c);

  fs.writeFileSync(SEED_LOCK, "");
}

// 兼容已存在的旧库：补列（幂等）
try {
  db.prepare("SELECT r2_key FROM assets LIMIT 1").get();
} catch {
  db.exec("ALTER TABLE assets ADD COLUMN r2_key TEXT");
  db.exec("ALTER TABLE assets ADD COLUMN file_size INTEGER");
}
try {
  db.prepare("SELECT category FROM assets LIMIT 1").get();
} catch {
  db.exec("ALTER TABLE assets ADD COLUMN category TEXT DEFAULT '未分类'");
}
try {
  db.prepare("SELECT cover_url FROM contents LIMIT 1").get();
} catch {
  db.exec("ALTER TABLE contents ADD COLUMN cover_url TEXT");
}
try {
  db.prepare("SELECT published_at FROM contents LIMIT 1").get();
} catch {
  db.exec("ALTER TABLE contents ADD COLUMN published_at TEXT");
  db.exec("ALTER TABLE contents ADD COLUMN data_filled INTEGER DEFAULT 0");
}

export default db;
