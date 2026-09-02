import assert from "node:assert/strict";
import test from "node:test";
import { parseCsv, toCsv } from "../src/lib/csv.ts";

test("可解析从 Excel 或 Sheets 粘贴的 Tab 分隔数据", () => {
  const parsed = parseCsv("日期\t平台\t账号\t粉丝数\n2026-09-01\txiaohongshu\t院长号\t12000");
  assert.deepEqual(parsed.headers, ["日期", "平台", "账号", "粉丝数"]);
  assert.deepEqual(parsed.rows, [["2026-09-01", "xiaohongshu", "院长号", "12000"]]);
});

test("上传记录导出时正确转义逗号和引号", () => {
  assert.equal(
    toCsv(["时间", "备注"], [["2026-09-01", '成功, "已录入"']]),
    '时间,备注\n2026-09-01,"成功, ""已录入"""'
  );
});
