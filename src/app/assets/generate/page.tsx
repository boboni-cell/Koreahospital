import { Suspense } from "react";
import { PageFrame } from "@/components/layout/page-frame";
import { GenerateClient } from "@/components/assets/generate-client";

export default function GeneratePage() {
  return (
    <PageFrame>
      <Suspense>
        <GenerateClient />
      </Suspense>
    </PageFrame>
  );
}
