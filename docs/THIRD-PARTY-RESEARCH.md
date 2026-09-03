# 第三方研究资料与热点 provider

Koreahospital 保持 `vikiboss/60s` 为默认热点源。第三方能力只通过 CLI、HTTP 或 MCP 边界接入；不会把 TrendRadar GPL-3.0 源码复制进本项目。

## ChubbySkills（显式只读采集）

从 [chubbyguan/chubbyskills](https://github.com/chubbyguan/chubbyskills) 独立部署后配置：

```bash
CHUBBYSKILLS_DIR=/path/to/chubbyskills
# 可选：默认使用 python3
CHUBBYSKILLS_PYTHON=python3
# 可选：小红书/抖音 60s 失败时，用本机已登录 socai 做实时搜索兜底
SOCAI_BIN=/Users/zhanghanyue/.socai/bin/socai
# 可选：没有用户搜索词时的兜底搜索词，默认“医美”
SOCIAL_HOTSPOT_QUERY=医美
```

每日热点卡片上的“采集研究资料”是唯一触发入口。服务调用 `tools/chubby_ingest.py`，把正文/视频文字稿和来源元数据写入现有 `research_tasks`、`research_items.raw_json`；失败只标记任务失败，不影响 60s 和既有研究流程。小红书可配置 `XHS_COOKIE` 提高成功率；视频转录还需要 ChubbySkills 自己的 `yt-dlp`、`ffmpeg`、`funasr` 等依赖。没有 Cookie、依赖或平台可访问权限时必须人工补正文或按提示重试。

## TrendRadar（可选关键词 provider）

从 [sansan0/TrendRadar](https://github.com/sansan0/TrendRadar) 独立部署并启动其官方 MCP HTTP 服务，然后配置：

```bash
TRENDRADAR_MCP_URL=http://127.0.0.1:3333/mcp
# 可选：项目调用 TrendRadar 时服务未启动，自动从此目录拉起 MCP
TRENDRADAR_DIR=/path/to/TrendRadar
# 可选：uv 不在 PATH 时填写绝对路径
TRENDRADAR_UV=/path/to/uv
```

例如官方本地方式：

```bash
cd /path/to/TrendRadar
uv sync
uv run python -m mcp_server.server --transport http --host 127.0.0.1 --port 3333
```

研究热点页点击“刷新”或输入关键词点击“筛选趋势”时，Koreahospital 会先通过 MCP `trigger_crawl(save_to_local=true)` 拉取最新平台数据，再调用 `search_news` 返回结果；项目会在配置 `TRENDRADAR_DIR` 时自动拉起本机 MCP。小红书和抖音的 60s 接口失败或返回空数据时，会用本机已登录的 `socai` 做只读实时搜索兜底（没有查询词时使用 `SOCIAL_HOTSPOT_QUERY`，默认“医美”）。未配置、服务离线或没有匹配时显示清晰错误/空结果。TrendRadar 的配置、新闻库、通知和 AI Key 都留在其独立服务内。

后台定时抓取可执行：

```bash
cd /path/to/Koreahospital
set -a; source .env.local; set +a
npm run trendradar:crawl
```

## 数据与合规边界

这里只传用户明确点击的公开来源 URL；不把患者信息、咨询记录或病例数据发送给第三方。小红书只允许用户明确触发的只读研究，不自动点赞、评论、发布或批量抓取。ChubbySkills 为 MIT；TrendRadar 为 GPL-3.0，因此 TrendRadar 保持独立服务边界。
