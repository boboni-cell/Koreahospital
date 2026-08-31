"use client";

import { useEffect, useState } from "react";
import { PageFrame } from "@/components/layout/page-frame";
import { AssetGrid, type Asset } from "@/components/assets/asset-grid";

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () =>
    fetch("/api/assets")
      .then((r) => r.json())
      .then((d) => setAssets(d))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);
  return (
    <PageFrame>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight text-[#01011b]">素材库</h2>
        <a href="/assets/upload" className="text-sm text-[#717a94] hover:text-[#01011b]">
          批量上传 →
        </a>
      </div>
      {loading ? (
        <p className="text-sm text-[#89828d]">加载中…</p>
      ) : (
        <AssetGrid assets={assets} onDeleted={load} />
      )}
      {!loading && assets.length === 0 && (
        <p className="mt-6 text-sm text-[#89828d]">暂无素材，去批量上传登记吧。</p>
      )}
    </PageFrame>
  );
}
