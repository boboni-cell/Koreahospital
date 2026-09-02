import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { hasFFmpeg, stitchVideos, ffmpegPath } from "../src/lib/ffmpeg.ts";

const execFileP = promisify(execFile);

test("ffmpeg 存在且可拼接两段视频", async (t) => {
  if (!(await hasFFmpeg())) {
    t.skip("ffmpeg 未安装");
    return;
  }
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "korea-ffmpeg-test-"));
  try {
    const a = path.join(dir, "a.mp4");
    const b = path.join(dir, "b.mp4");
    await execFileP(ffmpegPath(), [
      "-y", "-f", "lavfi", "-i", "testsrc=duration=1:size=320x240:rate=25",
      "-pix_fmt", "yuv420p", "-c:v", "libx264", "-an", a,
    ], { timeout: 30000 });
    await execFileP(ffmpegPath(), [
      "-y", "-f", "lavfi", "-i", "color=c=blue:duration=1:size=320x240:rate=25",
      "-pix_fmt", "yuv420p", "-c:v", "libx264", "-an", b,
    ], { timeout: 30000 });

    const buf = await stitchVideos([a, b]);
    assert.ok(buf.length > 1000, "拼接产物应有一定体积");
    assert.equal(buf.subarray(4, 8).toString("utf8"), "ftyp", "应为 mp4");
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
