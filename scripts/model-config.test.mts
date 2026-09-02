import assert from "node:assert/strict";
import test from "node:test";
import { MASKED_SECRET, resolveSecretInput } from "../src/lib/secret-input.ts";

test("模型密钥只在明确输入新值时更新", () => {
  assert.equal(resolveSecretInput("", "stored-secret"), "stored-secret");
  assert.equal(resolveSecretInput(MASKED_SECRET, "stored-secret"), "stored-secret");
  assert.equal(resolveSecretInput(" new-secret ", "stored-secret"), "new-secret");
});
