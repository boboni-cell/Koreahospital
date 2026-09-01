#!/usr/bin/env bash
# 回归守卫：旧模型页面/API/存储层已删除，文本走 Agent，媒体走 media_models。
set -euo pipefail
cd "$(dirname "$0")/.."

echo "== 回归检查 =="
fail=0

echo "[1/3] 旧模型页面、API 和存储层必须消失"
hits=$(grep -RIn --exclude-dir=node_modules --exclude-dir=.next \
  -E "settings/models|/api/models|ai-config|getActiveTextConfig|readAiConfig" \
  src 2>/dev/null || true)
if [ -n "$hits" ]; then
  echo "❌ 命中（应已全部迁到 chatCompleteForAgent）："
  echo "$hits"
  fail=1
else
  echo "✅ 旧模型链路 0 命中"
fi

echo "[2/3] AI 文案工坊不允许再出现旧 ModelSwitcher kind=\"text\""
hits=$(grep -RIn --exclude-dir=node_modules --exclude-dir=.next \
  'ModelSwitcher kind="text"' src 2>/dev/null || true)
if [ -n "$hits" ]; then
  echo "❌ 命中（应已删除）："
  echo "$hits"
  fail=1
else
  echo "✅ 0 命中"
fi

echo "[3/3] agent_models 表的 6 个角色必须都有 mock 占位"
node --no-warnings --experimental-strip-types -e "
import('./src/lib/db.ts').then(({ default: db }) => {
  const rows = db.prepare('SELECT role, is_mock FROM agent_models ORDER BY id').all();
  const expected = ['researcher','strategist','writer','designer','publisher','analyst'];
  const missing = expected.filter((r) => !rows.find((x) => x.role === r));
  if (missing.length) { console.error('❌ 缺失 mock 占位:', missing); process.exit(1); }
  console.log('✅ 6 个角色齐全，mock 占位 OK');
}).catch((e) => { console.error('❌ 加载 db 失败:', e.message); process.exit(2); });
"

if [ "$fail" -ne 0 ]; then exit 1; fi
echo "== 全部通过 =="
