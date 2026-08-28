import { PageFrame } from "@/components/layout/page-frame";
import { AssetUploader } from "@/components/assets/asset-uploader";

export default function UploadPage() {
  return (
    <PageFrame>
      <h2 className="mb-4 text-xl font-semibold tracking-tight text-zinc-900">批量上传素材</h2>
      <AssetUploader />
    </PageFrame>
  );
}
