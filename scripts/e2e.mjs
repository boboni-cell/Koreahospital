const BASE = "http://localhost:3000";
async function j(method, path, body) {
  const r = await fetch(BASE + path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  return r.json();
}
async function main() {
  const brief = await j("POST", "/api/briefs", { title: "E2E验收-发际线科普", facts: "FUE按单位计费，术后2-4周正常脱落", compliance_notes: "不承诺效果" });
  const xhs = await j("POST", "/api/variants", { brief_id: brief.id, platform: "xiaohongshu", format: "text", content: "" });
  const dy = await j("POST", "/api/variants", { brief_id: brief.id, platform: "douyin", format: "video", content: "" });
  await j("POST", "/api/produce", { variant_id: xhs.id });
  await j("POST", "/api/produce", { variant_id: dy.id });
  await j("POST", "/api/reviews", { variant_id: xhs.id, reviewer_type: "ai" });
  await j("POST", "/api/reviews", { variant_id: dy.id, reviewer_type: "ai" });
  await j("POST", "/api/reviews", { variant_id: xhs.id, reviewer_type: "human", result: "approve" });
  await j("POST", "/api/reviews", { variant_id: dy.id, reviewer_type: "human", result: "approve" });
  const px = await j("POST", "/api/publish-snapshots", { variant_id: xhs.id });
  const pd = await j("POST", "/api/publish-snapshots", { variant_id: dy.id });
  for (const w of ["24h", "7d", "30d"]) await j("POST", "/api/metric-snapshots", { publish_id: px.id, window: w, platform_metrics: { views: 800, likes: 50, inquiries: 6 }, business_metrics: { leads: 2 } });
  await j("POST", "/api/metric-snapshots", { publish_id: pd.id, window: "24h", platform_metrics: { views: 600, likes: 40, inquiries: 5 }, business_metrics: { leads: 1 } });
  await j("POST", "/api/analyses", { publish_id: px.id });
  const pending = await j("GET", "/api/writeback?status=pending");
  if (pending[0]) await j("POST", "/api/writeback", { proposal_id: pending[0].id, action: "confirm" });
  console.log(JSON.stringify({ brief: brief.id, xhs: xhs.id, douyin: dy.id, publishXhs: px.id, publishDouyin: pd.id, pendingWritebackBefore: pending.length, snapshotSkills: px.package ? "ok" : "no" }));
}
main().catch((e) => { console.error(e); process.exit(1); });
