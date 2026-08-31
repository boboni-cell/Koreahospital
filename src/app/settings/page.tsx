import { PageFrame } from "@/components/layout/page-frame";
import { ModelConfigForm } from "@/components/settings/model-config-form";
import { R2ConfigForm } from "@/components/settings/r2-config-form";
import { AgentConfigForm } from "@/components/settings/agent-config-form";
import { OperatorsPanel } from "@/components/settings/operators-panel";

export default function SettingsPage() {
  return (
    <PageFrame>
      <div className="mb-5">
        <h2 className="text-xl font-semibold tracking-tight text-zinc-900">系统设置</h2>
        <p className="mt-1 text-sm text-zinc-500">
          自带模型 API 接入（Bring Your Own Key），支持任何 OpenAI 兼容端点。
        </p>
      </div>
      <div className="space-y-6">
        <OperatorsPanel />
        <ModelConfigForm />
        <R2ConfigForm />
        <AgentConfigForm />
      </div>
    </PageFrame>
  );
}
