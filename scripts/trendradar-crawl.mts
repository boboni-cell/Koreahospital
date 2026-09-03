import { triggerTrendRadarCrawl } from "../src/lib/trendradar.ts";

try {
  const result = await triggerTrendRadarCrawl();
  console.log(JSON.stringify({ ok: true, result }));
} catch (error: any) {
  console.error(JSON.stringify({ ok: false, error: String(error?.message || error) }));
  process.exitCode = 1;
}
