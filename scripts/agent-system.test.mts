import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_SYSTEM_PROMPT } from "../src/lib/agent.ts";

test("总控 system prompt 使用新名称并包含严谨智能规则", () => {
  assert.match(DEFAULT_SYSTEM_PROMPT, /Koreahospital 工作台/);
  assert.doesNotMatch(DEFAULT_SYSTEM_PROMPT, /毛发移植矩阵运营工作台/);
  assert.match(DEFAULT_SYSTEM_PROMPT, /区分已知事实、合理推断和未知信息/);
  assert.match(DEFAULT_SYSTEM_PROMPT, /选择最少但足够的模型与 skill/);
  assert.match(DEFAULT_SYSTEM_PROMPT, /不得编造/);
});
