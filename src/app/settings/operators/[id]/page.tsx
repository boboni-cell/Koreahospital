import { notFound } from "next/navigation";
import { Link2, UserRound } from "lucide-react";
import { PageFrame } from "@/components/layout/page-frame";
import { Badge } from "@/components/ui/badge";
import { OperatorActivity, type WorkflowAction } from "@/components/settings/operator-activity";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

interface Operator {
  id: number;
  name: string;
  responsibility: string | null;
  status: string;
}

export default async function OperatorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const operator = db.prepare("SELECT * FROM operators WHERE id=?").get(id) as Operator | undefined;
  if (!operator) notFound();

  const actions = db.prepare(`
    SELECT * FROM workflow_actions
    WHERE actor_id=? OR (actor_id IS NULL AND actor_name=?)
    ORDER BY id DESC
    LIMIT 100
  `).all(operator.id, operator.name) as WorkflowAction[];

  return (
    <PageFrame>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.035em] text-[#171619]">运营人员详情</h1>
          <p className="mt-1 text-sm text-[#77716b]">查看这位运营人员负责的发布、审核、内容生产与复盘记录。</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section className="rounded-[18px] border border-[#e2dcd5] bg-[#fffefa] p-5">
            <div className="flex flex-wrap items-center gap-4">
              <span className="grid h-14 w-14 place-items-center rounded-[16px] bg-[#d9d2f5] text-[#584d8e]">
                <UserRound className="h-6 w-6" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold text-[#201e1b]">{operator.name}</h2>
                  <Badge className={operator.status === "active" ? "border border-[#b9decf] bg-[#e3f3ec] text-[#34765d]" : "border border-[#ded8d1] bg-[#f2efeb] text-[#746d67]"}>
                    {operator.status === "active" ? "在岗" : "已停用"}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-[#746d67]">{operator.responsibility || "负责当前项目运营"}</p>
                <p className="mt-2 text-[11px] text-[#9a928b]">人员编号 #{operator.id} · 已建立独立记录页</p>
              </div>
            </div>
          </section>

          <section className="rounded-[18px] border border-[#e2dcd5] bg-[#f8f6f2] p-5">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-white text-[#6d625a]">
                <Link2 className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-[#282420]">独立账号关联</h2>
                <p className="mt-1 text-xs leading-5 text-[#7b746d]">暂未启用人员登录账号。人员 ID 与独立记录页已保留，后续接入账号后可直接同步权限和操作归属。</p>
              </div>
            </div>
          </section>
        </div>

        <OperatorActivity actions={actions} />
      </div>
    </PageFrame>
  );
}
