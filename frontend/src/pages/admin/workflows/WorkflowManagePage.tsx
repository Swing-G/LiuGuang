import { useEffect, useState } from "react";
import { Loader2, Plus, Save, Search, Workflow } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  buildCustomerSuccessFollowupWorkflow,
  buildReActTicketWorkflow,
  buildTicketQuickTriageWorkflow,
  buildTicketTriageWorkflow,
  createAgentWorkflow,
  getAgentWorkflows,
  type AgentWorkflow,
  type AgentWorkflowCreatePayload,
  type PageResult
} from "@/services/workflowService";
import { getErrorMessage } from "@/utils/error";

const emptyPage: PageResult<AgentWorkflow> = { records: [], total: 0, size: 10, current: 1, pages: 0 };
const json = (value: unknown) => JSON.stringify(value, null, 2);
const templates = {
  ticket: buildTicketTriageWorkflow,
  quick: buildTicketQuickTriageWorkflow,
  followup: buildCustomerSuccessFollowupWorkflow,
  react: buildReActTicketWorkflow
};

export function WorkflowManagePage() {
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(emptyPage);
  const [templateKey, setTemplateKey] = useState<keyof typeof templates>("react");
  const [payloadText, setPayloadText] = useState(json(buildReActTicketWorkflow()));
  const [busy, setBusy] = useState(false);

  async function load(pageNo = 1) {
    setBusy(true);
    try {
      setPage(await getAgentWorkflows({ pageNo, pageSize: page.size, keyword: keyword.trim() || undefined }));
    } catch (error) {
      toast.error(getErrorMessage(error, "加载 Workflow 失败"));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load(1);
  }, []);

  function applyTemplate(key: keyof typeof templates) {
    setTemplateKey(key);
    setPayloadText(json(templates[key]()));
  }

  async function save() {
    let payload: AgentWorkflowCreatePayload;
    try {
      payload = JSON.parse(payloadText) as AgentWorkflowCreatePayload;
    } catch {
      toast.error("Workflow JSON 格式不正确");
      return;
    }
    if (!payload.name || !payload.workflowType) {
      toast.error("Workflow 名称和 workflowType 不能为空");
      return;
    }
    setBusy(true);
    try {
      await createAgentWorkflow(payload);
      toast.success("Workflow 已创建");
      await load(1);
    } catch (error) {
      toast.error(getErrorMessage(error, "创建 Workflow 失败"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-page space-y-6">
      <section className="rounded-2xl bg-gradient-to-br from-slate-950 to-indigo-950 p-6 text-white">
        <div className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3 py-1 text-xs">
          <Workflow className="h-3.5 w-3.5" /> Workflow Definition
        </div>
        <h1 className="mt-4 text-3xl font-semibold">Workflow 添加与展示</h1>
        <p className="mt-2 text-sm text-slate-300">创建 Workflow 模板，查看当前系统中的 Workflow 定义列表。</p>
      </section>

      <section className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <Card>
          <CardHeader><CardTitle>Workflow 列表</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="按名称搜索" />
              <Button variant="outline" onClick={() => load(1)} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
            <div className="max-h-[640px] space-y-2 overflow-auto">
              {page.records.map((workflow) => (
                <div key={workflow.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-medium text-slate-900">{workflow.name}</div>
                      <div className="mt-1 font-mono text-xs text-slate-500">{workflow.id}</div>
                    </div>
                    <Badge variant="outline">{workflow.status}</Badge>
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs text-slate-500">{workflow.description || "暂无描述"}</p>
                  <p className="mt-2 font-mono text-[11px] text-slate-400">{workflow.workflowType} / {workflow.harnessType} / v{workflow.version || 1}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>共 {page.total} 条，第 {page.current}/{page.pages || 1} 页</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page.current <= 1} onClick={() => load(page.current - 1)}>上一页</Button>
                <Button size="sm" variant="outline" disabled={page.current >= (page.pages || 1)} onClick={() => load(page.current + 1)}>下一页</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>创建 Workflow</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button variant={templateKey === "ticket" ? "default" : "outline"} onClick={() => applyTemplate("ticket")}>账号深度分析</Button>
              <Button variant={templateKey === "quick" ? "default" : "outline"} onClick={() => applyTemplate("quick")}>工单初筛</Button>
              <Button variant={templateKey === "followup" ? "default" : "outline"} onClick={() => applyTemplate("followup")}>客户回访</Button>
              <Button variant={templateKey === "react" ? "default" : "outline"} onClick={() => applyTemplate("react")}>ReAct 工具推理</Button>
              <Button variant="outline" onClick={() => setPayloadText(json({ name: "", workflowType: "custom_workflow", harnessType: "FLOW", status: "DRAFT", config: {}, nodes: [], edges: [] }))}>
                <Plus className="mr-2 h-4 w-4" />空白
              </Button>
            </div>
            <Textarea className="min-h-[620px] font-mono text-xs" value={payloadText} onChange={(event) => setPayloadText(event.target.value)} />
            <Button className="w-full" onClick={save} disabled={busy}><Save className="mr-2 h-4 w-4" />保存为新 Workflow</Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
