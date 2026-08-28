"use client";

import { useEffect, useState } from "react";
import { PageFrame } from "@/components/layout/page-frame";
import { AssetGrid, type Asset } from "@/components/assets/asset-grid";

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch("/api/assets")
      .then((r) => r.json())
      .then((d) => setAssets(d))
      .finally(() => setLoading(false));
  }, []);
  return (
    <PageFrame>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight text-zinc-900">素材库</h2>
        <a href="/assets/upload" className="text-sm text-zinc-500 hover:text-zinc-800">
          批量上传 →
        </a>
      </div>
      {loading ? (
        <p className="text-sm text-zinc-400">加载中…</p>
      ) : (
        <AssetGrid assets={assets} />
      )}
      {!loading && assets.length === 0 && (
        <p className="mt-6 text-sm text-zinc-400">暂无素材，去批量上传登记吧。</p>
      )}
    </PageFrame>
  );
}
