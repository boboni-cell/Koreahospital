# 第三方研究资料与热点 provider

Koreahospital 保持 `vikiboss/60s` 为默认热点源。第三方能力只通过 CLI、HTTP 或 MCP 边界接入；不会把 TrendRadar GPL-3.0 源码复制进本项目。

## ChubbySkills（显式只读采集）

从 [chubbyguan/chubbyskills](https://github.com/chubbyguan/chubbyskills) 独立部署后配置：

```bash
CHUBBYSKILLS_DIR=/path/to/chubbyskills
# 可选：默认使用 python3
CHUBBYSKILLS_PYTHON=python3
```

每日热点卡片上的“采集研究资料”是唯一触发入口。服务调用 `tools/chubby_ingest.py`，把正文/视频文字稿和来源元数据写入现有 `research_tasks`、`research_items.raw_json`；失败只标记任务失败，不影响 60s 和既有研究流程。小红书可配置 `XHS_COOKIE` 提高成功率；视频转录还需要 ChubbySkills 自己的 `yt-dlp`、`ffmpeg`、`funasr` 等依赖。没有 Cookie、依赖或平台可访问权限时必须人工补正文或按提示重试。

## TrendRadar（可选关键词 provider）

从 [sansan0/TrendRadar](https://github.com/sansan0/TrendRadar) 独立部署并启动其官方 MCP HTTP 服务，然后配置：

```bash
TRENDRADAR_MCP_URL=http://127.0.0.1:3333/mcp
```

例如官方本地方式：

```bash
cd /path/to/TrendRadar
uv sync
uv run python -m mcp_server.server --transport http --host 127.0.0.1 --port 3333
```

研究热点页输入关键词并点击“筛选趋势”后，Koreahospital 通过 MCP `search_news` 读取结果；未配置、服务离线或没有匹配时显示清晰错误/空结果，60s 仍照常返回。TrendRadar 的配置、新闻库、通知和 AI Key 都留在其独立服务内。

## 数据与合规边界

这里只传用户明确点击的公开来源 URL；不把患者信息、咨询记录或病例数据发送给第三方。小红书只允许用户明确触发的只读研究，不自动点赞、评论、发布或批量抓取。ChubbySkills 为 MIT；TrendRadar 为 GPL-3.0，因此 TrendRadar 保持独立服务边界。
