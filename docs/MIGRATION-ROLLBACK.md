# 迁移回滚约定（Task 00 建立）

> 适用范围：Koreahospital 社媒营销工作台从当前基线（HEAD ea89ff5，2026-09-01）起的所有数据库迁移（PRD Task 01 及以后）。
> 硬性约束：**禁止重建数据库 / 禁止 DROP 重来**。只能做增量迁移（新增表、新增列、补索引），并保证不丢失既有数据。

## 1. 禁止事项
- 禁止对 data/clinic.db 执行 DROP TABLE / DROP DATABASE / 重建后再导入。
- 禁止用 git checkout -- data、git clean -fd、reset --hard 清除动过的数据或未提交改动。
- 禁止把迁移写死进 db.ts 的 CREATE TABLE 里破坏既有行；新列一律用“检测列存在再 ALTER”的幂等补法。

## 2. 每次迁移前的标准动作
1. 关闭正在运行的应用/服务（避免占用 -wal/-shm）。
2. 生成一致性快照：
   ```bash
   cd /Users/zhanghanyue/Movies/Koreahospital
   TS=$(date '+%Y%m%dT%H%M%S')
   node data/backups/_backup.cjs "data/backups/clinic.pre-<迁移名>-${TS}.db"
   ```
   _backup.cjs 内部用 better-sqlite3 db.backup()，会把 -wal/-shm 一并合并且做完整性检查；不要直接 cp clinic.db。
3. 记录到基线/迁移日志：迁移名、时间、目的、影响表、是否有不可逆操作。
4. 若工作区有未提交代码改动，先 git diff > 归档文件，避免被覆盖；迁移期间不提交它们。

## 3. 迁移写法约定
- 新表：CREATE TABLE IF NOT EXISTS ...，默认值显式给出。
- 新列：先 SELECT 该列 FROM 表 LIMIT 1 探测，catch 后 ALTER TABLE 表 ADD COLUMN 列 类型 DEFAULT 值（参考 src/lib/db.ts 已有做法）。
- 唯一约束/索引：CREATE UNIQUE INDEX IF NOT EXISTS ...。
- 迁移脚本需幂等（可重复执行不报错、不重复加列）。
- 用 PRAGMA user_version 或一张 schema_meta(key,value) 表记录当前迁移版本；每次迁移后递增。

## 4. 回滚步骤
1. 停止服务。
2. 用快照覆盖主库并清理 WAL/SHM：
   ```bash
   cd /Users/zhanghanyue/Movies/Koreahospital
   cp data/backups/clinic.pre-<迁移名>-<ts>.db data/clinic.db
   rm -f data/clinic.db-wal data/clinic.db-shm data/.seed.lock
   ```
   （恢复后重新启动应用，db.ts 会重建 -wal）。
3. 校验：node data/backups/_backup.cjs <临时输出> 会做 integrity_check；或直接启动应用确认页面加载。
4. 若同时回退代码：只回退你本次迁移相关的提交；不要用 reset --hard origin/main，因为会丢掉未提交改动；用 git revert <commit> 或定向 checkout 处理。

## 5. 迁移后验收（每步必做）
- npx tsc --noEmit 通过。
- node data/backups/_schema-dump.cjs 确认新列/新表存在。
- 既有表行数与迁移前一致（对照 data/backups/BASELINE-*.md）。
- 相关页面在 dev 环境可打开并读到当前项目上下文。

## 6. 快照保留策略
- 每次迁移前生成 clinic.pre-<迁移名>-<ts>.db；保留最近若干份用于回滚。
- 部署/推送前可在 docs/ 归档一份迁移说明，但不要把 .db 快照提交进仓库（data/* 已 gitignore）。
