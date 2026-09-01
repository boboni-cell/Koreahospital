import { PageFrame } from "@/components/layout/page-frame";
import { R2ConfigForm } from "@/components/settings/r2-config-form";
import { AgentConfigForm } from "@/components/settings/agent-config-form";
import { OperatorsPanel } from "@/components/settings/operators-panel";
import { SkillsPanel } from "@/components/settings/skills-panel";
import { SkillAuditPanel } from "@/components/settings/skill-audit-panel";
import { AccessPanel } from "@/components/settings/access-panel";
import { PlatformPanel } from "@/components/settings/platform-panel";

export default function SettingsPage() {
  return (
    <PageFrame>
      <div className="mb-5">
        <h2 className="text-xl font-semibold tracking-tight text-zinc-900">系统设置</h2>
        <p className="mt-1 text-sm text-zinc-500">
          管理运营人员、Agent 模型、素材存储与平台规则。
        </p>
      </div>
      <div className="space-y-6">
        <OperatorsPanel />
        <SkillsPanel />
        <SkillAuditPanel />
        <AccessPanel />
        <PlatformPanel />
        <R2ConfigForm />
        <AgentConfigForm />
      </div>
    </PageFrame>
  );
}
