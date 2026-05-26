import { useEffect, useState } from "react";
import { FileJson2, Loader2, Play, Search } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  getAgentWorkflowInstance,
  getAgentWorkflowInstances,
  getAgentWorkflows,
  runAgentWorkflow,
  type AgentWorkflow,
  type AgentWorkflowInstance,
  type PageResult
} from "@/services/workflowService";
import { getErrorMessage } from "@/utils/error";

const DEFAULT_INPUT = JSON.stringify(
  {
    ticketId: "T20260520001",
    accountId: "A10001",
    orderId: "PAY10001",
    content: "我对这个账户有疑问，客户说续费失败，帮我查一下当前状态并给出处理建议。"
  },
  null,
  2
);
const emptyWorkflowPage: PageResult<AgentWorkflow> = { records: [], total: 0, size: 8, current: 1, pages: 0 };
const emptyRunPage: PageResult<AgentWorkflowInstance> = { records: [], total: 0, size: 8, current: 1, pages: 0 };
const j = (value: unknown) => {
  try {
    return value == null ? "-" : JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};
const t = (value?: string | null) => (value ? new Date(value).toLocaleString("zh-CN", { hour12: false }) : "-");
function parseInput(raw: string) {
  const value = JSON.parse(raw);
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("运行 input 必须是 JSON 对象");
  return value as Record<string, unknown>;
}

export function WorkflowRunPage() {
  const [keyword, setKeyword] = useState("");
  const [workflows, setWorkflows] = useState(emptyWorkflowPage);
  const [runs, setRuns] = useState(emptyRunPage);
  const [workflowId, setWorkflowId] = useState("");
  const [runId, setRunId] = useState("");
  const [detail, setDetail] = useState<AgentWorkflowInstance | null>(null);
  const [input, setInput] = useState(DEFAULT_INPUT);
  const [busy, setBusy] = useState(false);

  async function loadWorkflows(pageNo = 1) {
    setBusy(true);
    try {
      const page = await getAgentWorkflows({ pageNo, pageSize: workflows.size, keyword: keyword.trim() || undefined });
      setWorkflows(page);
      if (!workflowId && page.records[0]) setWorkflowId(page.records[0].id);
    } catch (error) {
      toast.error(getErrorMessage(error, "加载 Workflow 失败"));
    } finally {
      setBusy(false);
    }
  }

  async function loadRuns(pageNo = 1, id = workflowId) {
    if (!id) return;
    try {
      const page = await getAgentWorkflowInstances({ pageNo, pageSize: runs.size, workflowId: id });
      setRuns(page);
      setRunId(page.records[0]?.id || "");
      if (!page.records[0]) setDetail(null);
    } catch (error) {
      toast.error(getErrorMessage(error, "加载运行历史失败"));
    }
  }

  useEffect(() => {
    loadWorkflows(1);
  }, []);
  useEffect(() => {
    if (workflowId) loadRuns(1, workflowId);
  }, [workflowId]);
  useEffect(() => {
    if (runId) getAgentWorkflowInstance(runId).then(setDetail).catch((error) => toast.error(getErrorMessage(error, "加载实例详情失败")));
  }, [runId]);

  async function run() {
    if (!workflowId) return toast.error("请先选择 Workflow");
    let payload: Record<string, unknown>;
    try {
      payload = parseInput(input);
    } catch (error) {
      return toast.error((error as Error).message);
    }
    setBusy(true);
    try {
      const instance = await runAgentWorkflow(workflowId, { businessType: "manual_admin", businessId: `admin-${Date.now()}`, input: payload });
      setRunId(instance.id);
      await loadRuns(1, workflowId);
      toast.success("Workflow 执行完成");
    } catch (error) {
      toast.error(getErrorMessage(error, "运行 Workflow 失败"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-page space-y-6">
      <section className="rounded-2xl bg-gradient-to-br from-slate-950 to-indigo-950 p-6 text-white">
        <h1 className="text-3xl font-semibold">Workflow 运行测试</h1>
        <p className="mt-2 text-sm text-slate-300">选择一个 Workflow，输入 JSON 参数，查看运行历史、节点输出和事件时间线。</p>
      </section>
      <section className="grid gap-6 xl:grid-cols-[360px_360px_minmax(0,1fr)]">
        <Card>
          <CardHeader><CardTitle>选择 Workflow</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="按名称搜索" />
              <Button variant="outline" onClick={() => loadWorkflows(1)}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}</Button>
            </div>
            <div className="max-h-[320px] space-y-2 overflow-auto">
              {workflows.records.map((workflow) => (
                <button key={workflow.id} onClick={() => setWorkflowId(workflow.id)} className={`w-full rounded-xl border p-3 text-left ${workflow.id === workflowId ? "border-indigo-200 bg-indigo-50" : "border-slate-200 hover:bg-slate-50"}`}>
                  <div className="flex justify-between gap-2"><b className="text-sm">{workflow.name}</b><Badge variant="outline">{workflow.status}</Badge></div>
                  <p className="mt-1 font-mono text-[11px] text-slate-400">{workflow.id}</p>
                  <p className="mt-1 font-mono text-[11px] text-slate-400">{workflow.workflowType}</p>
                </button>
              ))}
            </div>
            <Textarea className="min-h-[220px] font-mono text-xs" value={input} onChange={(event) => setInput(event.target.value)} />
            <Button className="w-full" onClick={run} disabled={busy}><Play className="mr-2 h-4 w-4" />运行测试</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>运行历史</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {runs.records.map((item) => (
              <button key={item.id} onClick={() => setRunId(item.id)} className={`w-full rounded-xl border p-3 text-left ${item.id === runId ? "border-indigo-200 bg-indigo-50" : "border-slate-200 hover:bg-slate-50"}`}>
                <div className="flex items-center justify-between"><span className="font-mono text-xs">{item.id}</span><Badge variant="outline">{item.status}</Badge></div>
                <p className="mt-2 text-xs text-slate-500">{t(item.createTime)}</p>
                <p className="mt-1 text-xs text-slate-500">当前节点：{item.currentNodeKey || "-"}</p>
              </button>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <JsonCard title="实例输出" value={detail?.output || detail} />
          <JsonCard title="上下文" value={detail?.context} />
          <JsonCard title="节点实例" value={detail?.nodes || []} />
          <JsonCard title="事件时间线" value={detail?.events || []} />
        </div>
      </section>
    </div>
  );
}

function JsonCard({ title, value }: { title: string; value: unknown }) {
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><FileJson2 className="h-4 w-4" />{title}</CardTitle></CardHeader>
      <CardContent className="p-0"><pre className="max-h-72 overflow-auto whitespace-pre-wrap bg-slate-950 p-4 font-mono text-xs leading-5 text-slate-100">{j(value)}</pre></CardContent>
    </Card>
  );
}
