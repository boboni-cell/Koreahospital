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

-- 上传记录：每次批量导入的元数据
CREATE TABLE IF NOT EXISTS metrics_uploads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rows_count INTEGER DEFAULT 0,
  inserted INTEGER DEFAULT 0,
  skipped INTEGER DEFAULT 0,
  remark TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 幂等约束：同一账号同一天一条
CREATE UNIQUE INDEX IF NOT EXISTS idx_metrics_acc_date ON metrics(account_id, date);
`);

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


// ---- Task 01：项目上下文（增量、幂等，禁止重建库） ----
// 多项目底座，首版默认 Koreahospital。
db.exec(`
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT,
  status TEXT DEFAULT 'active',
  is_default INTEGER DEFAULT 0,
  marketing_brief TEXT,
  audience TEXT,
  voice TEXT,
  conversion_goal TEXT,
  banned_terms TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS app_state (
  key TEXT PRIMARY KEY,
  value TEXT
);
`);

const projCount = (db.prepare("SELECT COUNT(*) AS n FROM projects").get() as { n: number }).n;
let defaultProjectId = 1;
if (projCount === 0) {
  const info = db
    .prepare(
      "INSERT INTO projects (name, slug, status, is_default, created_at, updated_at) VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
    )
    .run("Koreahospital", "koreahospital", "active");
  defaultProjectId = Number(info.lastInsertRowid);
  db.prepare("INSERT OR REPLACE INTO app_state (key, value) VALUES ('current_project_id', ?)").run(String(defaultProjectId));
} else {
  const def = db.prepare("SELECT id FROM projects WHERE is_default=1 ORDER BY id LIMIT 1").get() as { id: number } | undefined;
  defaultProjectId = def ? def.id : (db.prepare("SELECT id FROM projects ORDER BY id LIMIT 1").get() as { id: number }).id;
  const cur = db.prepare("SELECT value FROM app_state WHERE key='current_project_id'").get() as { value: string } | undefined;
  if (!cur) db.prepare("INSERT OR REPLACE INTO app_state (key, value) VALUES ('current_project_id', ?)").run(String(defaultProjectId));
}

// 给业务实体补充 project_id（幂等），并把既有数据归入默认项目
const projectScopedTables = [
  "accounts",
  "contents",
  "assets",
  "topics",
  "metrics",
  "post_metrics",
  "schedules",
  "sop_docs",
  "notes",
  "tasks",
  "metrics_uploads",
];
function ensureProjectColumn(table: string) {
  try {
    db.prepare(`SELECT project_id FROM ${table} LIMIT 1`).get();
  } catch {
    db.exec(`ALTER TABLE ${table} ADD COLUMN project_id INTEGER`);
  }
}
for (const t of projectScopedTables) ensureProjectColumn(t);
for (const t of projectScopedTables) {
  db.prepare(`UPDATE ${t} SET project_id=? WHERE project_id IS NULL`).run(defaultProjectId);
}


// ---- Task 02：账号环境与内容支柱（增量、幂等） ----
db.exec(`
CREATE TABLE IF NOT EXISTS operators (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  responsibility TEXT,
  status TEXT DEFAULT 'active',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS content_pillars (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER,
  name TEXT NOT NULL,
  description TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS account_pillars (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL,
  pillar_id INTEGER NOT NULL,
  target_ratio REAL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(account_id, pillar_id)
);
`);

// accounts 补充账号环境字段
function ensureAccountColumn(name: string, ddl: string) {
  try {
    db.prepare(`SELECT ${name} FROM accounts LIMIT 1`).get();
  } catch {
    db.exec(`ALTER TABLE accounts ADD COLUMN ${ddl}`);
  }
}
ensureAccountColumn("positioning", "positioning TEXT");
ensureAccountColumn("operator_id", "operator_id INTEGER");
ensureAccountColumn("environment_status", "environment_status TEXT DEFAULT 'configuring'");

// 默认运营者（首版单人）
const opCount = (db.prepare("SELECT COUNT(*) AS n FROM operators").get() as { n: number }).n;
let defaultOperatorId = 1;
if (opCount === 0) {
  const info = db.prepare("INSERT INTO operators (name, responsibility, status) VALUES (?, ?, ?)").run("运营者", "负责 Koreahospital 社媒运营", "active");
  defaultOperatorId = Number(info.lastInsertRowid);
} else {
  defaultOperatorId = (db.prepare("SELECT id FROM operators ORDER BY id LIMIT 1").get() as { id: number }).id;
}
db.prepare("UPDATE accounts SET operator_id=? WHERE operator_id IS NULL").run(defaultOperatorId);

// 默认内容支柱
const projId = (db.prepare("SELECT id FROM projects ORDER BY is_default DESC, id ASC LIMIT 1").get() as { id: number }).id;
const pillarNames = ["院长日常", "科普", "案例", "医院环境", "术后护理", "热点回应"];
const pillarDescriptions: Record<string, string> = {
  "院长日常": "院长个人 IP 日常、看诊片段、观点输出",
  "科普": "脱发/植发等知识科普、答疑",
  "案例": "患者案例、恢复日记（需授权留档）",
  "医院环境": "院区环境、设备、无菌层流等",
  "术后护理": "术后护理指导",
  "热点回应": "对热门话题/争议的合规回应",
};
const pillarCount = (db.prepare("SELECT COUNT(*) AS n FROM content_pillars WHERE project_id=?").get(projId) as { n: number }).n;
if (pillarCount === 0) {
  const insPillar = db.prepare("INSERT INTO content_pillars (project_id, name, description) VALUES (?, ?, ?)");
  for (const n of pillarNames) insPillar.run(projId, n, pillarDescriptions[n] ?? null);
}

// 为既有账号绑定默认内容支柱
const pillarIdOf = (name: string) =>
  (db.prepare("SELECT id FROM content_pillars WHERE project_id=? AND name=?").get(projId, name) as { id: number } | undefined)?.id;
const accPillarCount = (db.prepare("SELECT COUNT(*) AS n FROM account_pillars").get() as { n: number }).n;
if (accPillarCount === 0) {
  const accs = db.prepare("SELECT id, role FROM accounts WHERE project_id=?").all(projId) as { id: number; role: string | null }[];
  const insAp = db.prepare("INSERT OR IGNORE INTO account_pillars (account_id, pillar_id, target_ratio) VALUES (?, ?, ?)");
  for (const a of accs) {
    const role = a.role ?? "official";
    if (role === "director") {
      const pa = pillarIdOf("院长日常"); const pb = pillarIdOf("科普"); const pc = pillarIdOf("案例");
      if (pa) insAp.run(a.id, pa, 40);
      if (pb) insAp.run(a.id, pb, 35);
      if (pc) insAp.run(a.id, pc, 25);
    } else if (role === "knowledge") {
      const pa = pillarIdOf("科普"); if (pa) insAp.run(a.id, pa, 100);
    } else if (role === "case_study") {
      const pa = pillarIdOf("案例"); if (pa) insAp.run(a.id, pa, 100);
    } else if (role === "official") {
      const pa = pillarIdOf("医院环境"); const pb = pillarIdOf("院长日常");
      if (pa) insAp.run(a.id, pa, 60);
      if (pb) insAp.run(a.id, pb, 40);
    } else if (role === "consultant") {
      const pa = pillarIdOf("科普"); if (pa) insAp.run(a.id, pa, 100);
    } else if (role === "viral") {
      const pa = pillarIdOf("热点回应"); if (pa) insAp.run(a.id, pa, 100);
    }
  }
}


// ---- Task 03：操作记录（增量、幂等） ----
db.exec(`
CREATE TABLE IF NOT EXISTS workflow_actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  object_type TEXT,
  object_id INTEGER,
  actor_type TEXT DEFAULT 'operator',
  actor_id INTEGER,
  actor_name TEXT,
  action TEXT,
  from_status TEXT,
  to_status TEXT,
  detail TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_workflow_actions_obj ON workflow_actions(object_type, object_id);
`);


// ---- Task 05：平台信号池 A（增量、幂等） ----
db.exec(`
CREATE TABLE IF NOT EXISTS signals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER,
  platform TEXT,
  source_url TEXT,
  title TEXT,
  evidence TEXT,
  status TEXT DEFAULT 'pending',
  confirmed_by INTEGER,
  captured_at TEXT DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_signals_project ON signals(project_id, status);
`);


// ---- Task 07：竞品与内容知识库（增量、幂等） ----
db.exec(`
CREATE TABLE IF NOT EXISTS knowledge_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER,
  kind TEXT NOT NULL,
  platform TEXT,
  title TEXT,
  content TEXT,
  evidence TEXT,
  source_signal_id INTEGER,
  status TEXT DEFAULT 'active',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_knowledge_project_kind ON knowledge_items(project_id, kind);
`);


// ---- Task 08：六角色 Agent 合同（增量、幂等） ----
db.exec(`
CREATE TABLE IF NOT EXISTS agent_contracts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role TEXT UNIQUE NOT NULL,
  name TEXT,
  inputs TEXT,
  outputs TEXT,
  allowed_actions TEXT,
  forbidden_actions TEXT,
  handoff_fields TEXT,
  fail_condition TEXT,
  status TEXT DEFAULT 'active',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`);

const contractCount = (db.prepare("SELECT COUNT(*) AS n FROM agent_contracts").get() as { n: number }).n;
if (contractCount === 0) {
  const contracts = [
    { role: "researcher", name: "研究员", inputs: "项目简报、平台、公开信号、竞品资料", outputs: "带来源的研究包、待确认信号", allowed: "提取/汇总公开信号、标注不确定性", forbidden: "把推测标记成平台事实", handoff: "研究包、信号ID、证据、时间", fail: "无项目简报或信号来源时停止，说明缺哪一项" },
    { role: "strategist", name: "策略师", inputs: "项目简报、研究包、历史复盘", outputs: "账号定位、内容支柱、选题优先级、母版简报", allowed: "基于证据排优先级、配置内容支柱", forbidden: "绕过证据或合规约束", handoff: "母版简报、支柱ID、优先级、证据", fail: "项目简报或研究包缺失时停止" },
    { role: "writer", name: "文案", inputs: "母版简报、平台规则、账号语气", outputs: "小红书文案或抖音脚本、标题、CTA", allowed: "在合规内生成文案/标题/CTA", forbidden: "自行发布、虚构医疗事实", handoff: "文案版本、标题、CTA、语气", fail: "母版简报或账号语气未定则停止" },
    { role: "designer", name: "设计", inputs: "内容版本、素材授权、平台规格", outputs: "封面方案、配图计划、分镜、素材清单", allowed: "设计封面/分镜、引用已授权素材", forbidden: "使用未授权患者素材", handoff: "设计稿、素材清单、授权标记", fail: "素材授权不足时停止并列出缺失" },
    { role: "publisher", name: "发布", inputs: "已批准版本、账号环境、排期", outputs: "可复制发布包、发布前检查", allowed: "生成发布包、前置检查", forbidden: "登录、自动发布、自动互动", handoff: "发布包、账号环境、排期、检查项", fail: "版本未批准或账号环境不可用时停止" },
    { role: "analyst", name: "分析师", inputs: "发布快照、24h/7d/30d 数据", outputs: "归因报告、待确认回写建议", allowed: "分析数据、生成待确认建议", forbidden: "直接修改正式知识库", handoff: "归因报告、回写建议、数据不足标记", fail: "数据不足时不下结论并说明" },
  ];
  const ins = db.prepare("INSERT INTO agent_contracts (role, name, inputs, outputs, allowed_actions, forbidden_actions, handoff_fields, fail_condition) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
  for (const c of contracts) ins.run(c.role, c.name, c.inputs, c.outputs, c.allowed, c.forbidden, c.handoff, c.fail);
}


// ---- 每个 Agent 独立模型配置（PRD §10 + 用户：每 Agent 接口+key+自动拉取） ----
db.exec(`
CREATE TABLE IF NOT EXISTS agent_models (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role TEXT UNIQUE NOT NULL,
  provider TEXT DEFAULT 'mock',
  base_url TEXT NOT NULL,
  api_key TEXT,
  model TEXT NOT NULL,
  kind TEXT DEFAULT 'text',
  is_mock INTEGER DEFAULT 0,
  last_tested_at TEXT,
  last_test_status INTEGER,
  last_test_error TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`);
// 缺位即建 mock 占位（用户后续在 /settings/agent-models 配置真实 key）
const ROLES = ["researcher", "strategist", "writer", "designer", "publisher", "analyst"];
const insModel = db.prepare("INSERT OR IGNORE INTO agent_models (role, provider, base_url, api_key, model, kind, is_mock) VALUES (?, ?, ?, ?, ?, ?, ?)");
for (const r of ROLES) insModel.run(r, "mock", "mock://local", "", "mock-1", "text", 1);
// 兼容旧库：补 provider 列
try {
  db.prepare("SELECT provider FROM agent_models LIMIT 1").get();
} catch {
  db.exec("ALTER TABLE agent_models ADD COLUMN provider TEXT DEFAULT 'mock'");
  db.exec("UPDATE agent_models SET provider='mock' WHERE is_mock=1");
  db.exec("UPDATE agent_models SET provider='custom' WHERE is_mock=0 AND (provider IS NULL OR provider='')");
}


// ---- 图像/视频模型配置（独立表，因为一个项目可有 1 图像 + 1 视频，按 kind 唯一） ----
db.exec(`
CREATE TABLE IF NOT EXISTS media_models (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT UNIQUE NOT NULL,
  provider TEXT DEFAULT 'mock',
  base_url TEXT NOT NULL,
  api_key TEXT,
  model TEXT NOT NULL,
  is_mock INTEGER DEFAULT 0,
  last_tested_at TEXT,
  last_test_status INTEGER,
  last_test_error TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`);
db.prepare("INSERT OR IGNORE INTO media_models (kind, provider, base_url, api_key, model, is_mock) VALUES (?, ?, ?, ?, ?, ?)").run("image", "mock", "mock://local", "", "mock-1", 1);
db.prepare("INSERT OR IGNORE INTO media_models (kind, provider, base_url, api_key, model, is_mock) VALUES (?, ?, ?, ?, ?, ?)").run("video", "mock", "mock://local", "", "mock-1", 1);


// ---- Task 07：内容知识库（PRD §11） ----
db.exec(`
CREATE TABLE IF NOT EXISTS competitors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER,
  platform TEXT NOT NULL,
  account TEXT NOT NULL,
  positioning TEXT,
  evidence TEXT,
  observed_at TEXT,
  status TEXT DEFAULT 'active',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS structures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER,
  platform TEXT NOT NULL,
  hook_type TEXT,
  structure TEXT NOT NULL,
  source_signal_id INTEGER,
  status TEXT DEFAULT 'active',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS cta_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER,
  platform TEXT NOT NULL,
  funnel_stage TEXT,
  text TEXT NOT NULL,
  restricted_scenarios TEXT,
  status TEXT DEFAULT 'active',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_competitors_project ON competitors(project_id);
CREATE INDEX IF NOT EXISTS idx_structures_project ON structures(project_id);
CREATE INDEX IF NOT EXISTS idx_cta_items_project ON cta_items(project_id);
`);


// ---- Task 09：母版简报与平台版本（增量、幂等） ----
db.exec(`
CREATE TABLE IF NOT EXISTS content_briefs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  topic_id INTEGER,
  project_id INTEGER,
  title TEXT,
  audience TEXT,
  objective TEXT,
  facts TEXT,
  evidence TEXT,
  compliance_notes TEXT,
  status TEXT DEFAULT 'active',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS content_variants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  brief_id INTEGER NOT NULL,
  platform TEXT,
  account_id INTEGER,
  format TEXT,
  content TEXT,
  workflow_status TEXT DEFAULT 'draft',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS variant_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  variant_id INTEGER NOT NULL,
  version INTEGER DEFAULT 1,
  content TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_content_briefs_project ON content_briefs(project_id);
CREATE INDEX IF NOT EXISTS idx_content_variants_brief ON content_variants(brief_id);
`);


// ---- Task 12：素材分级与授权门禁（增量、幂等） ----
function ensureAssetColumn(name: string, ddl: string) {
  try {
    db.prepare(`SELECT ${name} FROM assets LIMIT 1`).get();
  } catch {
    db.exec(`ALTER TABLE assets ADD COLUMN ${ddl}`);
  }
}
ensureAssetColumn("sensitivity", "sensitivity TEXT DEFAULT 'normal'");
ensureAssetColumn("ai_suggested", "ai_suggested TEXT");
ensureAssetColumn("authorization_scope", "authorization_scope TEXT");
ensureAssetColumn("expires_at", "expires_at TEXT");
ensureAssetColumn("allowed_platforms", "allowed_platforms TEXT");
ensureAssetColumn("ai_editable", "ai_editable INTEGER DEFAULT 1");
// contents 同名幂等 helper（用于 PRD §13.2 审计标记）
function ensureContentsColumn(name: string, ddl: string) {
  try {
    db.prepare(`SELECT ${name} FROM contents LIMIT 1`).get();
  } catch {
    db.exec(`ALTER TABLE contents ADD COLUMN ${ddl}`);
  }
}
ensureContentsColumn("needs_human_review", "needs_human_review INTEGER DEFAULT 0");
ensureContentsColumn("last_agent_role", "last_agent_role TEXT");
ensureContentsColumn("media_urls", "media_urls TEXT DEFAULT '[]'");

// 通用幂等列 helper：表名动态，比 ensureContentsColumn 复用更广
function ensureColumn(table: string, name: string, ddl: string) {
  try {
    db.prepare(`SELECT ${name} FROM ${table} LIMIT 1`).get();
  } catch {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  }
}
ensureColumn("knowledge_items", "media_urls", "media_urls TEXT DEFAULT '[]'");
db.exec(`UPDATE assets SET sensitivity='sensitive' WHERE sensitivity IS NULL AND patient_code IS NOT NULL AND patient_code != ''`);
db.exec(`UPDATE assets SET sensitivity='normal' WHERE sensitivity IS NULL`);

db.exec(`
CREATE TABLE IF NOT EXISTS asset_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_id INTEGER NOT NULL,
  content_id INTEGER,
  used_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_asset_usage_asset ON asset_usage(asset_id);
`);


// ---- Task 13：AI 审核与人工终审（增量、幂等） ----
db.exec(`
CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  variant_id INTEGER NOT NULL,
  reviewer_type TEXT NOT NULL,
  result TEXT,
  reasons TEXT,
  evidence TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_reviews_variant ON reviews(variant_id);
`);


// ---- Task 14：发布包与版本快照（增量、幂等） ----
db.exec(`
CREATE TABLE IF NOT EXISTS publish_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  variant_id INTEGER NOT NULL,
  content_version INTEGER DEFAULT 1,
  content TEXT,
  assets TEXT,
  model TEXT,
  skills TEXT,
  review_result TEXT,
  platform TEXT,
  account_name TEXT,
  published_at TEXT DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_publish_snapshots_variant ON publish_snapshots(variant_id);
`);


// ---- Task 15：三窗口指标与回填（增量、幂等） ----
db.exec(`
CREATE TABLE IF NOT EXISTS publish_metric_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  publish_id INTEGER NOT NULL,
  window TEXT NOT NULL,
  platform_metrics TEXT,
  business_metrics TEXT,
  insufficient_data INTEGER DEFAULT 0,
  observed_at TEXT DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(publish_id, window)
);
CREATE INDEX IF NOT EXISTS idx_publish_metric_pub ON publish_metric_snapshots(publish_id);
`);


// ---- Task 16：归因与人工确认回写（增量、幂等） ----
db.exec(`
CREATE TABLE IF NOT EXISTS analyses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  publish_id INTEGER NOT NULL,
  diagnosis TEXT,
  confidence TEXT,
  evidence TEXT,
  insufficient_data INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS writeback_proposals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  analysis_id INTEGER NOT NULL,
  target_library TEXT,
  change TEXT,
  reason TEXT,
  status TEXT DEFAULT 'pending',
  confirmed_by INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_analyses_publish ON analyses(publish_id);
CREATE INDEX IF NOT EXISTS idx_writeback_status ON writeback_proposals(status);
`);


// ---- Task 19：外部方法论 Skill 审计（增量、幂等） ----
db.exec(`
CREATE TABLE IF NOT EXISTS skill_audits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repo TEXT,
  url TEXT,
  commit_ref TEXT,
  license TEXT,
  skill_id TEXT,
  status TEXT DEFAULT 'suggested',
  notes TEXT,
  audited_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`);

const auditCount = (db.prepare("SELECT COUNT(*) AS n FROM skill_audits").get() as { n: number }).n;
if (auditCount === 0) {
  const subs = ["product-marketing", "customer-research", "competitor-profiling", "content-strategy", "social", "analytics", "marketing-loops"];
  const insA = db.prepare("INSERT INTO skill_audits (repo, url, commit_ref, license, skill_id, status, notes) VALUES (?, ?, ?, ?, ?, 'suggested', ?)");
  for (const s of subs) {
    insA.run("coreyhaines31/marketingskills", "https://github.com/coreyhaines31/marketingskills", "待核对", "MIT", s, "候选子 Skill；引入前须逐份审核、去重，确认无自动脚本/未经验证医疗结论；medical-compliance 优先级不变");
  }
}

// ---- 数据中心 V2：官方导入、帖子分析、定位版本与信息源 ----
db.exec(`
CREATE TABLE IF NOT EXISTS data_import_batches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  kind TEXT DEFAULT 'post',
  platform TEXT,
  account_id INTEGER,
  filename TEXT NOT NULL,
  stored_path TEXT,
  file_hash TEXT,
  rows_count INTEGER DEFAULT 0,
  inserted INTEGER DEFAULT 0,
  updated INTEGER DEFAULT 0,
  skipped INTEGER DEFAULT 0,
  mapping_json TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_data_import_project ON data_import_batches(project_id, created_at);

CREATE TABLE IF NOT EXISTS post_analytics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  platform TEXT NOT NULL,
  account_id INTEGER,
  external_post_id TEXT NOT NULL,
  post_url TEXT,
  title TEXT,
  content TEXT,
  tags TEXT,
  pillar_id INTEGER,
  published_at TEXT,
  source_batch_id INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, platform, external_post_id)
);
CREATE INDEX IF NOT EXISTS idx_post_analytics_filter ON post_analytics(project_id, platform, account_id, published_at);

CREATE TABLE IF NOT EXISTS post_metric_windows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  window TEXT NOT NULL,
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  follower_gain INTEGER,
  insufficient_data INTEGER DEFAULT 0,
  observed_at TEXT DEFAULT CURRENT_TIMESTAMP,
  source_batch_id INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(post_id, window)
);
CREATE INDEX IF NOT EXISTS idx_post_metric_window ON post_metric_windows(post_id, window);

CREATE TABLE IF NOT EXISTS account_positioning_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL,
  version INTEGER NOT NULL,
  positioning TEXT,
  audience TEXT,
  voice TEXT,
  cta TEXT,
  banned_terms TEXT,
  frequency TEXT,
  notes TEXT,
  status TEXT DEFAULT 'draft',
  evidence TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  activated_at TEXT,
  UNIQUE(account_id, version)
);
CREATE INDEX IF NOT EXISTS idx_positioning_account ON account_positioning_versions(account_id, version DESC);

CREATE TABLE IF NOT EXISTS signal_sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,
  platform TEXT,
  url TEXT,
  keywords TEXT,
  category TEXT,
  credibility TEXT DEFAULT 'medium',
  last_checked_at TEXT,
  status TEXT DEFAULT 'active',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_signal_sources_project ON signal_sources(project_id, status);

CREATE TABLE IF NOT EXISTS report_drafts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  scope TEXT NOT NULL,
  account_id INTEGER,
  period_start TEXT,
  period_end TEXT,
  summary_json TEXT,
  diagnosis TEXT,
  evidence TEXT,
  actions_json TEXT,
  model_powered INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  confirmed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_report_drafts_project ON report_drafts(project_id, created_at DESC);
`);

function ensureDataCenterColumn(table: string, name: string, ddl: string) {
  try {
    db.prepare(`SELECT ${name} FROM ${table} LIMIT 1`).get();
  } catch {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  }
}
ensureDataCenterColumn("signals", "source_id", "source_id INTEGER");
ensureDataCenterColumn("tasks", "source_type", "source_type TEXT");
ensureDataCenterColumn("tasks", "source_id", "source_id INTEGER");

// 把既有发布快照纳入统一帖子视图；旧记录只补数据，不覆盖官方导入。
const legacyPublishes = db.prepare(`
  SELECT ps.id, ps.platform, ps.published_at, ps.content, cv.account_id, cb.title
  FROM publish_snapshots ps
  LEFT JOIN content_variants cv ON cv.id=ps.variant_id
  LEFT JOIN content_briefs cb ON cb.id=cv.brief_id
`).all() as { id: number; platform: string | null; published_at: string | null; content: string | null; account_id: number | null; title: string | null }[];
const insLegacyPost = db.prepare(`
  INSERT OR IGNORE INTO post_analytics
  (project_id, platform, account_id, external_post_id, title, content, tags, published_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);
const insLegacyWindow = db.prepare(`
  INSERT OR IGNORE INTO post_metric_windows
  (post_id, window, views, likes, saves, comments, shares, follower_gain, insufficient_data, observed_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
for (const post of legacyPublishes) {
  insLegacyPost.run(
    defaultProjectId,
    post.platform ?? "xiaohongshu",
    post.account_id,
    `snapshot-${post.id}`,
    post.title,
    post.content,
    JSON.stringify(Array.from(new Set((post.content?.match(/#[^\s#]+/g) ?? []).map((tag) => tag.slice(1))))),
    post.published_at
  );
  const postRow = db.prepare("SELECT id FROM post_analytics WHERE project_id=? AND platform=? AND external_post_id=?")
    .get(defaultProjectId, post.platform ?? "xiaohongshu", `snapshot-${post.id}`) as { id: number } | undefined;
  if (!postRow) continue;
  const windows = db.prepare("SELECT * FROM publish_metric_snapshots WHERE publish_id=?").all(post.id) as any[];
  for (const win of windows) {
    let platformMetrics: Record<string, number> = {};
    try { platformMetrics = JSON.parse(win.platform_metrics || "{}"); } catch {}
    insLegacyWindow.run(
      postRow.id,
      win.window,
      Number(platformMetrics.views) || 0,
      Number(platformMetrics.likes) || 0,
      Number(platformMetrics.saves) || 0,
      Number(platformMetrics.comments) || 0,
      Number(platformMetrics.shares) || 0,
      platformMetrics.follower_gain == null ? null : Number(platformMetrics.follower_gain) || 0,
      win.insufficient_data ? 1 : 0,
      win.observed_at
    );
  }
}

// ---- Task G2：编排执行计划（Agent 协作 G2 模式） ----
// ponytail: 一次决策对应一个 plan；steps 存 JSON 数组，每步带 status（pending/running/done/failed）。
// 不加 step 表是因为 steps 不需要单独查询；它们是 plan 的子文档。
db.exec(`
CREATE TABLE IF NOT EXISTS agent_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER,
  task TEXT NOT NULL,
  steps_json TEXT NOT NULL DEFAULT '[]',
  note TEXT,
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_agent_plans_project ON agent_plans(project_id, created_at DESC);
`);

export default db;
