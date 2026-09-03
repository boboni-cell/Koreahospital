import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_SYSTEM_PROMPT } from "../src/lib/agent.ts";
import { parseJsonBlock } from "../src/lib/ai-client.ts";
import { separateResearchOutput } from "../src/lib/research-output.ts";
import { parseAdoptedTopics } from "../src/lib/topic-adoption.ts";

test("总控 system prompt 使用新名称并包含严谨智能规则", () => {
  assert.match(DEFAULT_SYSTEM_PROMPT, /Koreahospital 工作台/);
  assert.doesNotMatch(DEFAULT_SYSTEM_PROMPT, /毛发移植矩阵运营工作台/);
  assert.match(DEFAULT_SYSTEM_PROMPT, /区分已知事实、合理推断和未知信息/);
  assert.match(DEFAULT_SYSTEM_PROMPT, /选择最少但足够的模型与 skill/);
  assert.match(DEFAULT_SYSTEM_PROMPT, /不得编造/);
});

test("JSON 解析器可从解释文字和多个花括号中提取第一个完整对象", () => {
  const parsed = parseJsonBlock<{ steps: unknown[] }>('说明 {不是 JSON} 后续 ```json\n{"steps":[{"text":"配图 {9:16}"}]}\n```');
  assert.equal(parsed.steps.length, 1);
});

test("研究产出与来源链接分离", () => {
  const separated = separateResearchOutput("研究结论\n用户重视恢复期。\n来源：百度健康，URL：https://example.com/a，发布时间：待验证\n交接建议\n形成三个候选选题。");
  assert.deepEqual(separated.sources, ["https://example.com/a"]);
  assert.match(separated.result, /用户重视恢复期/);
  assert.doesNotMatch(separated.result, /example\.com|来源：百度健康/);
});

test("可解析 Markdown 加粗的总编选题清单", () => {
  const topics = parseAdoptedTopics("选题1\n**主线角度：** 韩国护肤品换季适配性测评\n**潜在标题方向：** 预算500元内实测\n**目标人群：** 敏感肌");
  assert.equal(topics.length, 1);
  assert.equal(topics[0].title, "预算500元内实测");
});
