# Koreahospital — 架构与工作流程

> 仓库: github.com/boboni-cell/Koreahospital
> 技术栈: Next.js 16 (App Router, Turbopack) + React 19 + TypeScript 5.7 + Tailwind v4 + SQLite (better-sqlite3) + Base UI rc.0 + lucide-react + sonner + shadcn cva
> 形态: 单机/单仓 单进程, Next 路由即 API, 不分离前后端
> 数据: `data/clinic.db` (SQLite，含 Agent/媒体模型配置) + `data/agent-config.json` + `data/r2-config.json` (均 gitignore)
> 资源: `public/uploads/` (gitignore)
> Skills: `skills/<slug>/SKILL.md` (YAML frontmatter + 正文), 共 15 个 curated
> 部署: `npm run dev` 启动 :3000; `next build` 出 prod
> 角色红线: 不接小红书/抖音自动发布 RPA, 只做"标记已发布→回填"

---

## 1. 总览

```
┌──────────────────────────────────────────────────────────────────────┐
│                         Hermes 浏览器 (用户)                          │
└──────────────────────┬───────────────────────────────────────────────┘
                       │ ① 导航 (sidebar)
                       ▼
┌──────────────────────────────────────────────────────────────────────┐
│  Next.js App Router — src/app                                        │
│  ┌─ (page)        普通业务页 (server/client component)                │
│  ├─ (page)/...    子页面 (内容管理/选题/生成配图/排期/数据…)          │
│  └─ api/...       RESTful 路由 (GET/POST/PATCH/DELETE)                │
└──────────────────────┬───────────────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┬──────────────┬──────────────┐
        ▼              ▼              ▼              ▼              ▼
    lib/db.ts   agent/media-models  lib/skills.ts  lib/agent.ts   lib/storage.ts
    SQLite 单例   按角色/类型配置   skills/ 目录  agent-config    R2+本地盘
                       │              │              │
                       ▼              ▼              ▼
                  Agent/媒体模型    Skill 选择器   Agent 总控
                  (text/img/vid) (always+动态)  (LLM 调度)
                       │              │              │
                       └────── lib/ai-client.ts ────┘
                              (统一 chatComplete / parseJsonBlock)
```

---

## 2. 目录结构（按职责分层）

```
src/
├── app/                          # Next 路由 + 业务页面
│   ├── page.tsx                  # 首页仪表盘
│   ├── ops/page.tsx              # 运营中心 hub
│   ├── today/page.tsx            # 今日待发 (基于 schedules)
│   ├── calendar/page.tsx         # 排期 (周/月视图+CSV导出)
│   ├── contents/                 # 内容管理 + AI工坊 + 选题研究
│   ├── topics/page.tsx           # 选题池 + 视频脚本生成
│   ├── assets/                   # 素材库 + 上传 + AI生成配图
│   ├── data/                     # 数据看板 + 录入 + 报表
│   ├── hospital/                 # 院内日程/任务/沟通记录
│   ├── accounts/                 # 账号矩阵
│   ├── sop/                      # SOP 中心
│   ├── settings/                 # 设置 (模型/Agent/R2)
│   └── api/                      # REST 端点
├── components/                   # 可复用 React 组件
│   ├── ui/                       # 设计系统 (button/card/select/dialog/...)
│   ├── layout/                   # app-shell / sidebar / header / page-frame
│   ├── contents/                 # 业务组件 (ai-workshop, topic-research)
│   ├── assets/                   # (asset-grid, asset-uploader, generate-client)
│   ├── ops/                      # (today-list)
│   ├── settings/                 # (agent-config-form, r2-config-form)
│   ├── charts/charts.tsx         # Recharts 包装
│   └── data-upload-records.tsx   # 上传记录表
├── lib/                          # 业务核心 (无 React 依赖)
│   ├── db.ts                     # SQLite 单例 + schema + 种子
│   ├── agent-models.ts           # 按 Agent 角色配置文本模型
│   ├── media-models.ts           # 按 image/video 配置媒体模型
│   ├── ai-client.ts              # OpenAI 兼容 chatComplete + JSON 解析
│   ├── agent-llm.ts              # 按角色调用文本模型，失败回退 Mock
│   ├── ai-prompts.ts             # 各类任务 prompt 模板
│   ├── skills.ts                 # Skill 加载/选择/注入
│   ├── agent.ts                  # Agent 总控配置 (system prompt 持久化)
│   ├── constants.ts              # PLATFORMS / PLATFORM_NAME / SURGERY/NORWOOD
│   ├── csv.ts                    # 无依赖 CSV 解析/生成
│   ├── storage.ts                # 本地盘 + R2 (wrangler)
│   ├── image-gen.ts              # 图像生成封装
│   ├── nav.ts                    # 侧栏导航配置
│   ├── secret-input.ts           # key 解掩
│   └── utils.ts                  # cn() 等
├── skills/                       # 15 个 SKILL.md (always + dynamic)
├── data/                         # 运行时数据 (gitignore)
└── public/uploads/               # 用户上传 (gitignore)
```

---

## 3. 核心数据模型 (SQLite)

> 见 `src/lib/db.ts` 的 `db.exec()` 块；唯一索引 `idx_metrics_acc_date` 让 CSV 重复上传幂等。

| 表 | 关键字段 | 用途 |
|---|---|---|
| `users` | id, name, email, role | 单管理员 (admin@clinic.com) |
| `accounts` | id, platform, handle, role, followers, status | 10 个矩阵账号, 平台/角色枚举 |
| `contents` | id, title, body, **platform**, role, status, scheduled_for, cover_url, **published_at**, **data_filled** | 内容主体 |
| `assets` | id, filename, file_url, **r2_key**, file_type, category, file_size, surgery_type, patient_code, license, usage_count | 素材库 |
| `metrics` | id, account_id, **date**, followers, likes, saves, comments, shares, views | 账号级日数据 (看板) |
| `post_metrics` | id, content_id, date, likes, saves, comments, shares, views | 内容级回填 (周/日报) |
| `metrics_uploads` | id, rows_count, inserted, skipped, created_at | 上传事件流水 |
| `schedules` | id, account_id, slot_time, **content_id** | 排期 (今日待发来源) |
| `topics` | id, title, description, source, heat_score, target_accounts | 选题池 |
| `tasks` | id, title, status, due, assignee | 院内任务 |
| `sop_docs` | id, title, category, content_md, is_required, version | 5 篇 SOP 种子 |
| `notes` | id, patient_name, channel, content, summary | 沟通记录 |

---

## 4. 工作流程（按用户场景）

### 流程 A — 选题 → 内容 → 发布（主链路）

```
[选题研究 /contents/research]
   │ user picks platform + niche
   │ POST /api/ai/research
   │   ├─ chatCompleteForAgent("researcher") (读 SQLite agent_models)
   │   ├─ selectSkillIds("选题", {platform})
   │   │     ├─ always skill 必注入
   │   │     ├─ PLATFORM_SKILL[platform] 优先注入
   │   │     └─ LLM 选 dynamic skill  (lib/skills.ts)
   │   ├─ resolveContents(ids)         (拼接正文, ≤6000 chars)
   │   └─ chatComplete(prompt + skills) → JSON {topics[contentType]}
   ▼
用户选题 (image/video) → 写入 topics 表
   │
   ├──→ [AI 文案工坊 /contents/ai]
   │       │ user 选 platform/role/surgery/norwood (含"自定义"选项)
   │       │ POST /api/ai/copy
   │       │   ├─ skills 选择 (同上)
   │       │   ├─ media-plan 同步触发: POST /api/ai/media-plan
   │       │   │    判 image/video + 实拍/AI + 分镜表
   │       │   └─ chatComplete → {variants[5 角色]}
   │       │
   │       ├──→ [AI 生成配图 /assets/generate]
   │       │       │ POST /api/assets/generate
   │       │       │   ├─ 读取 SQLite media_models 中的 image/video 配置
   │       │       │   ├─ chatComplete (出 prompt) + image gen API
   │       │       │   └─ 写 assets 表 (file_url, r2_key)
   │       │
   │       └──→ 用户复制粘贴 → 手动发布 (red line, 不接 RPA)
   │
   ▼
[内容管理 /contents]  按平台分组 + 内联编辑
   │ user 点"标记已发布"
   │ POST /api/contents/[id]/publish
   │   └─ UPDATE contents SET status='published', published_at=now
   ▼
[今日待发 /today]  出现「待回填」卡片
   │ user 填 likes/saves/...
   │ POST /api/post-metrics
   │   └─ 写 post_metrics + UPDATE data_filled=1
   ▼
[报表 /data/report]  日/周报按 post_metrics 聚合
```

### 流程 B — 数据录入 (真实数据, 无假数)

```
[数据录入 /data/input]
   │
   ├── 手动单条 ─→ POST /api/metrics {account_id, date, ...}
   │
   ├── Excel 粘贴 / 文件上传
   │    │ 客户端 parseCsv (lib/csv.ts, 自动识别 \t/,/;)
   │    │ 自动识别列名 (date/平台/账号/粉丝…)
   │    │ 识别不到 → 弹出列映射下拉
   │    │ 客户端按 mapping 改名 → POST /api/metrics/bulk
   │    │   ├─ 按 (platform, handle) 查 accounts.id
   │    │   ├─ UPSERT metrics (account_id, date) ← 幂等
   │    │   └─ 写 metrics_uploads (rows_count, inserted, skipped)
   │    ▼
   │ [已上传记录卡片]  DataUploadRecords 组件 GET /api/metrics/uploads
   │
   ▼
[数据看板 /data]  GET /api/metrics + /api/metrics/series  (从 metrics 聚合)
[首页 /]         GET /api/home/stats
```

### 流程 C — Agent 总控 (可选高级路径)

```
user 触发某个任务 (e.g. 脚本生成)
   │ POST /api/agent/orchestrate {task, input}
   │   ├─ 读 data/agent-config.json (用户可改 system prompt)
   │   ├─ chatComplete 决策:
   │   │     {modelKind, skills, steps}
   │   ├─ skills:  always + prefer(platform) + LLM-picked dynamic
   │   ├─ skills 拼接 (≤6000 chars)
   │   └─ 执行:
   │       ├─ text  → /api/ai/copy 或 /api/ai/script
   │       ├─ image → /api/assets/generate
   │       └─ video → image-gen (视频模型)
   │ 返回 {plan, ids, modelPowered}
```

### 流程 D — 素材管理 + R2 同步

```
[素材库 /assets]
   │ 拖拽 / 选择文件 → POST /api/assets/upload
   │   ├─ 落盘 public/uploads/<hash>.<ext>
   │   ├─ isR2Enabled() ? wrangler r2 object put  (lib/storage.ts)
   │   └─ 写 assets 表
   ▼
[AI 生成配图 /assets/generate]
   │ POST /api/assets/generate → 写 assets (file_url, r2_key)
   │
删除:
   │ DELETE /api/assets/[id]
   │   ├─ 本地 fs.unlink
   │   └─ R2 失败仅 toast 警告, 不阻断
```

### 流程 E — 排期 ↔ 今日待发

```
[内容管理]  编辑 scheduled_for → 写 contents.scheduled_for
   │
   ├─ [calendar/page.tsx]  读 contents + schedules, 周/月视图, 导出 CSV
   └─ [today/page.tsx]     读 schedules WHERE slot_time=today
                            + 关联 content, 显示已发布/待发布徽章
                            + 顶部进度条 (待发 N / 已发 M)
                            + deterministic 账号推荐
```

---

## 5. 关键子系统

### 5.1 Skills 子系统 (`lib/skills.ts`)

```
skills/<slug>/SKILL.md  ──walkSkills──>  SkillEntry[]
  YAML frontmatter:                          │
  - slug, name, description,                  ├─ tier=always  永远注入
    trigger[], tier=always|dynamic            └─ tier=dynamic LLM 挑选
  正文 markdown

selectSkillIds(task, input, preferIds) → {ids, modelPowered}
  - preferIds 来自 PLATFORM_SKILL[platform]  (用户填入的 skill)
  - 防 token 撑爆:  LLM 只看 catalog (无正文), 选完 id 再 resolveContents (≤6000)
  - 模型选择失败 → 降级全量 dynamic, 永不抛 500
```

### 5.2 模型管理 (`lib/agent-models.ts` + `lib/media-models.ts`)

```
agent_models: researcher / strategist / writer / designer / publisher / analyst 各自独立配置
media_models: image / video 各一条配置
  - 文本业务统一通过 chatCompleteForAgent(role) 调用
  - 图像/视频生成统一读取 media_models
  - 管理页面为 /settings/agent-models 和 /settings/media-models
```

### 5.3 Agent 总控 (`lib/agent.ts` + `app/api/agent/orchestrate`)

```
data/agent-config.json:  { systemPrompt: "..." }   (用户可改)
  - 530 字默认 system prompt
  - 决策输出: {modelKind, skills, steps}
  - 不直接调 LLM 生成内容, 只**调度** (委派给 /api/ai/*)
```

### 5.4 R2 同步 (`lib/storage.ts`)

```
config: env vars + data/r2-config.json (gitignore)
  - 上传: 先落本地 public/uploads/, 再 wrangler r2 object put (异步, 不阻塞)
  - 删除: 删本地, R2 失败仅 warn
  - publicBase 拼接成 CDN URL 写回 assets.r2_key
```

---

## 6. UI / 导航 (`lib/nav.ts` + `components/layout/`)

侧栏 6 个分组, 共 22 个入口:

| 分组 | 入口 |
|---|---|
| 总览 | 首页仪表盘 |
| 运营 | 运营中心 / 今日待发 / 内容排期 / 内容管理 / 新建内容 / AI 文案工坊 / 选题研究 |
| 素材 | 素材库 / AI 生成配图 / 批量上传 / 选题池 |
| 数据 | 数据看板 / 数据录入 / 报表中心 |
| 医院 | 日程管理 / 任务看板 / 沟通记录 |
| 系统 | 账号矩阵 / 模型管理 / SOP 中心 / 系统设置 |

设计: 韩系浅色 + 极简悬停侧栏 + 大卡片配图 + 黑白磨砂 (NO red, 仅 destructive badge)

---

## 7. 已知设计决策

1. **不接自动发布 RPA** — 医疗/医美内容账号封号风险, 工作台只做"生成→人工复制→标记已发布"
2. **数据 100% 真实** — 删除假数据种子, 看板只显示手动/CSV 录入
3. **Skill 选错不 500** — `selectSkillIds` 失败时降级全量 dynamic
4. **CSV 幂等** — 唯一索引 `(account_id, date)`, 重复上传不重复累计
5. **平台 skill 留口** — `PLATFORM_SKILL[platform]` 用户填一行即生效, tiktok/insta/youtube 留空
6. **Agent 总控可改** — system prompt 存 `data/agent-config.json`, 设置页 UI 编辑

---

## 8. 优化建议 (按优先级)

### P0 — 立即可做, 收益高

1. **CSV 解析扩展为 Excel 二进制 (.xlsx)**
   现: 只能 csv/txt
   改: 加 `xlsx` 依赖 (SheetJS / read-excel-file), 拖 .xlsx 即可, 减少你"另存为 CSV"步骤
   文件: `lib/csv.ts` 加 `parseXlsx(file)` + 路由接受 multipart

2. **API 错误统一中间件**
   现: 多个路由手写 try/catch, 有的 catch 了有的没
   改: `lib/api-helper.ts` 提供 `withError(fn)`, 统一 500 + 日志 + 上报钩子
   收益: 减少重复 try, 出错可观测

3. **DB 查询分层 (DAO)**
   现: 路由里直接 `db.prepare("...").run()`, SQL 散落
   改: `lib/repos/{contents,accounts,metrics}.ts`, 一个实体一个文件
   收益: 改 schema 只动一处; 易写单测

### P1 — 中期, 涉及体验

4. **Agent 总控 result 落库 (可观测)**
   现: orchestrate 返回, 不留痕
   改: 写 `agent_runs` 表 (id, ts, task, plan_json, ms, modelPowered)
   收益: 可在「系统设置」看 agent 调度历史, 出问题能回放

5. **素材库加 R2 真同步 UI 状态**
   现: 上传/删除的 R2 部分只 toast 提示
   改: assets 表加 `r2_status: pending|synced|failed`, 素材列表显示徽章, 失败可手动重试
   收益: 你一眼看出哪些还没上 CDN

6. **已上传记录加"回滚 metrics"按钮**
   现: DELETE 只删 metrics_uploads 记录, 不回滚 metrics
   改: 上传时给每行打 `upload_id`, DELETE 时按 upload_id 反向 DELETE metrics
   收益: 误传可以一键撤回, 不必手动 diff

7. **Postgres / MySQL 适配层**
   现: 硬编 SQLite (`ON CONFLICT`, `INTEGER PRIMARY KEY AUTOINCREMENT`)
   改: schema 抽到 `db/schema.sql`, 平台切换只需换 driver
   收益: 你以后想上云数据库零改动

### P2 — 长期, 锦上添花

8. **内容分页 + 全文检索 (FTS5)**
   现: contents 按 id 查
   改: `CREATE VIRTUAL TABLE contents_fts USING fts5(title, body)`, 内容管理加搜索
   收益: 库大了秒级搜, 5 角色文案的旧内容能复用

9. **多租户 (team) 隔离**
   现: 单用户, 单 org
   改: 关键表加 `org_id`, UI 加切换器
   收益: 未来给其他医院复用同一套, 不混数据

10. **离线工作流 (PWA / IndexedDB 缓存)**
    现: 100% 在线
    改: 用 Serwist (PWA) 缓存关键页
    收益: 电梯/通勤没网也能看排期

11. **Wecom (企业微信) 消息推送**
    现: 沟通记录只在站内
    改: 接企业微信 webhook, 标记已发布/数据回填发通知
    收益: 不用开后台也能知道

12. **TypeScript strict 模式 + 单元测试骨架**
    现: tsconfig 没看到 strict
    改: 打开 `strict: true`, 加 vitest 跑 lib 纯函数
    收益: 重构时编译器帮你找断点

---

## 9. 一图概览（最终）

```
┌────────────── Koreahospital 单仓单进程 ──────────────┐
│                                                       │
│  user ─→ 22 个 UI 入口 ─→ 业务组件 ─→ REST API         │
│                            │                          │
│                            ├─→ SQLite (clinic.db)     │
│                            │     12 表                │
│                            │                          │
│                            ├─→ SQLite 模型配置     │
│                            │     agent_models        │
│                            │     media_models        │
│                            ├─→ data/*.json 配置        │
│                            │     agent-config / r2    │
│                            │                          │
│                            ├─→ lib/ai-client.ts        │
│                            │     text via Agent 配置   │
│                            │     via OpenAI 兼容 API  │
│                            │                          │
│                            ├─→ lib/skills.ts           │
│                            │     15 个 SKILL.md       │
│                            │     always + dynamic 选  │
│                            │                          │
│                            └─→ lib/agent.ts            │
│                                  Agent 总控           │
│                                  (system prompt       │
│                                   用户可改)            │
│                                                       │
│  物理存储:                                             │
│    data/clinic.db      ← 状态                          │
│    public/uploads/     ← 文件                          │
│    R2 (cloudflare)     ← 远程副本                      │
│    skills/*.md         ← 知识                          │
└───────────────────────────────────────────────────────┘
```

---

**仓库**: `github.com/boboni-cell/Koreahospital`  
**最后 commit**: `e049496 feat: 数据录入新增「已上传记录」列表`  
**README 同款文档**: `/Users/zhanghanyue/Movies/Koreahospital/ARCHITECTURE.md`
