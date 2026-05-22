import { useEffect, useMemo, useState } from "react";
import {
  Copy,
  FileJson2,
  GitBranch,
  Loader2,
  Play,
  Plus,
  Save,
  Search,
  Trash2,
  Workflow
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  buildCustomerSuccessFollowupWorkflow,
  buildLayeredMemoryDemoWorkflow,
  buildTicketQuickTriageWorkflow,
  buildTicketTriageWorkflow,
  createAgentWorkflow,
  deleteAgentWorkflow,
  getAgentWorkflow,
  getAgentWorkflowInstance,
  getAgentWorkflowInstances,
  getAgentWorkflows,
  runAgentWorkflow,
  updateAgentWorkflow,
  type AgentWorkflow,
  type AgentWorkflowCreatePayload,
  type AgentWorkflowEdge,
  type AgentWorkflowInstance,
  type AgentWorkflowNode,
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
const BLANK_WORKFLOW: AgentWorkflowCreatePayload = {
  name: "",
  description: "",
  workflowType: "custom_workflow",
  harnessType: "FLOW",
  status: "DRAFT",
  config: {},
  inputSchema: { type: "object", properties: {} },
  outputSchema: { type: "object" },
  nodes: [],
  edges: []
};
const emptyWf: PageResult<AgentWorkflow> = { records: [], total: 0, size: 8, current: 1, pages: 0 };
const emptyRun: PageResult<AgentWorkflowInstance> = {
  records: [],
  total: 0,
  size: 6,
  current: 1,
  pages: 0
};
const j = (v: unknown) => {
  try {
    return v == null ? "-" : JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
};
const parseJsonObject = (raw: string, label: string) => {
  const value = JSON.parse(raw);
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error(`${label} 必须是 JSON 对象`);
  return value as Record<string, unknown>;
};
const parseJsonArray = <T,>(raw: string, label: string) => {
  const value = JSON.parse(raw);
  if (!Array.isArray(value)) throw new Error(`${label} 必须是 JSON 数组`);
  return value as T[];
};
const workflowToPayload = (workflow: AgentWorkflow): AgentWorkflowCreatePayload => ({
  name: workflow.name,
  description: workflow.description || "",
  workflowType: workflow.workflowType || "custom_workflow",
  harnessType: workflow.harnessType || "FLOW",
  status: workflow.status || "DRAFT",
  config: workflow.config || {},
  inputSchema: workflow.inputSchema || { type: "object" },
  outputSchema: workflow.outputSchema || { type: "object" },
  nodes: workflow.nodes || [],
  edges: workflow.edges || []
});
const payloadToEditor = (payload: AgentWorkflowCreatePayload) => ({
  ...payload,
  configText: j(payload.config),
  inputSchemaText: j(payload.inputSchema),
  outputSchemaText: j(payload.outputSchema),
  nodesText: j(payload.nodes),
  edgesText: j(payload.edges)
});
const editorToPayload = (
  editor: ReturnType<typeof payloadToEditor>
): AgentWorkflowCreatePayload => ({
  name: editor.name,
  description: editor.description,
  workflowType: editor.workflowType,
  harnessType: editor.harnessType,
  status: editor.status,
  config: parseJsonObject(editor.configText, "运行配置"),
  inputSchema: parseJsonObject(editor.inputSchemaText, "输入 Schema"),
  outputSchema: parseJsonObject(editor.outputSchemaText, "输出 Schema"),
  nodes: parseJsonArray<AgentWorkflowNode>(editor.nodesText, "节点配置"),
  edges: parseJsonArray<AgentWorkflowEdge>(editor.edgesText, "连线配置")
});
const t = (v?: string | null) => (v ? new Date(v).toLocaleString("zh-CN", { hour12: false }) : "-");
function statusClass(s?: string | null) {
  const v = (s || "").toUpperCase();
  return v === "COMPLETED" || v === "SUCCESS"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : v === "FAILED"
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-slate-200 bg-slate-50 text-slate-600";
}
function parseInput(raw: string) {
  const value = JSON.parse(raw);
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("运行 input 必须是 JSON 对象");
  return value as Record<string, unknown>;
}
function JsonCard({ title, value }: { title: string; value: unknown }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileJson2 className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <pre className="max-h-72 overflow-auto whitespace-pre-wrap bg-slate-950 p-4 font-mono text-xs leading-5 text-slate-100">
          {j(value)}
        </pre>
      </CardContent>
    </Card>
  );
}

export function WorkflowPlaygroundPage() {
  const [keyword, setKeyword] = useState("");
  const [wfPage, setWfPage] = useState(emptyWf);
  const [runPage, setRunPage] = useState(emptyRun);
  const [wfId, setWfId] = useState("");
  const [runId, setRunId] = useState("");
  const [detail, setDetail] = useState<AgentWorkflowInstance | null>(null);
  const [workflowDetail, setWorkflowDetail] = useState<AgentWorkflow | null>(null);
  const [editor, setEditor] = useState(payloadToEditor(BLANK_WORKFLOW));
  const [editorMode, setEditorMode] = useState<"create" | "edit">("create");
  const [input, setInput] = useState(DEFAULT_INPUT);
  const [busy, setBusy] = useState(false);
  const selected = useMemo(
    () => workflowDetail || wfPage.records.find((x) => x.id === wfId) || null,
    [workflowDetail, wfPage.records, wfId]
  );

  async function loadWorkflows(pageNo = 1) {
    setBusy(true);
    try {
      const page = await getAgentWorkflows({
        pageNo,
        pageSize: wfPage.size,
        keyword: keyword.trim() || undefined
      });
      setWfPage(page);
      const next = page.records.find((x) => x.id === wfId) || page.records[0];
      if (next) setWfId(next.id);
    } catch (e) {
      toast.error(getErrorMessage(e, "加载 Workflow 失败"));
    } finally {
      setBusy(false);
    }
  }
  async function loadRuns(pageNo = 1, id = wfId) {
    if (!id) return;
    try {
      const page = await getAgentWorkflowInstances({
        pageNo,
        pageSize: runPage.size,
        workflowId: id
      });
      setRunPage(page);
      if (page.records[0]) setRunId(page.records[0].id);
      else {
        setRunId("");
        setDetail(null);
      }
    } catch (e) {
      toast.error(getErrorMessage(e, "加载运行历史失败"));
    }
  }
  useEffect(() => {
    loadWorkflows(1);
  }, []);
  useEffect(() => {
    if (wfId) {
      loadWorkflowDetail(wfId);
      loadRuns(1, wfId);
    }
  }, [wfId]);
  useEffect(() => {
    if (runId)
      getAgentWorkflowInstance(runId)
        .then(setDetail)
        .catch((e) => toast.error(getErrorMessage(e, "加载实例详情失败")));
  }, [runId]);

  async function loadWorkflowDetail(id: string) {
    try {
      const workflow = await getAgentWorkflow(id);
      setWorkflowDetail(workflow);
      setEditor(payloadToEditor(workflowToPayload(workflow)));
      setEditorMode("edit");
    } catch (e) {
      toast.error(getErrorMessage(e, "加载 Workflow 详情失败"));
    }
  }

  async function createWf(type: "ticket" | "quick" | "followup" | "demo") {
    const template =
      type === "ticket"
        ? buildTicketTriageWorkflow()
        : type === "quick"
          ? buildTicketQuickTriageWorkflow()
          : type === "followup"
            ? buildCustomerSuccessFollowupWorkflow()
            : buildLayeredMemoryDemoWorkflow();
    setEditor(payloadToEditor(template));
    setEditorMode("create");
    setWorkflowDetail(null);
    setWfId("");
    toast.success("已载入 Flow 模板，请确认后保存");
  }
  function createBlankWf() {
    setEditor(payloadToEditor(BLANK_WORKFLOW));
    setEditorMode("create");
    setWorkflowDetail(null);
    setWfId("");
    setRunId("");
    setDetail(null);
  }
  function duplicateWf() {
    if (!selected) return toast.error("请先选择 Workflow");
    setEditor({
      ...payloadToEditor(workflowToPayload(selected)),
      name: `${selected.name} 副本`,
      status: "DRAFT"
    });
    setEditorMode("create");
    setWorkflowDetail(null);
    setWfId("");
    toast.success("已复制为草稿，保存后会创建新 Workflow");
  }
  async function saveWf() {
    let payload: AgentWorkflowCreatePayload;
    try {
      payload = editorToPayload(editor);
    } catch (e) {
      return toast.error((e as Error).message);
    }
    if (!payload.name.trim()) return toast.error("请填写 Workflow 名称");
    setBusy(true);
    try {
      const workflow =
        editorMode === "edit" && wfId
          ? await updateAgentWorkflow(wfId, payload)
          : await createAgentWorkflow(payload);
      setWfId(workflow.id);
      setWorkflowDetail(workflow);
      setEditor(payloadToEditor(workflowToPayload(workflow)));
      setEditorMode("edit");
      await loadWorkflows(1);
      toast.success(editorMode === "edit" ? "Workflow 已更新" : "Workflow 已创建");
    } catch (e) {
      toast.error(getErrorMessage(e, "保存 Workflow 失败"));
    } finally {
      setBusy(false);
    }
  }
  async function deleteWf() {
    if (!wfId || !selected) return toast.error("请先选择要删除的 Workflow");
    if (!window.confirm(`确认删除「${selected.name}」吗？该操作不可恢复。`)) return;
    setBusy(true);
    try {
      await deleteAgentWorkflow(wfId);
      createBlankWf();
      await loadWorkflows(1);
      toast.success("Workflow 已删除");
    } catch (e) {
      toast.error(getErrorMessage(e, "删除 Workflow 失败"));
    } finally {
      setBusy(false);
    }
  }
  async function runWf() {
    if (!wfId) return toast.error("请先选择 Workflow");
    let payload: Record<string, unknown>;
    try {
      payload = parseInput(input);
    } catch (e) {
      return toast.error((e as Error).message);
    }
    setBusy(true);
    try {
      const instance = await runAgentWorkflow(wfId, {
        businessType: "manual_admin",
        businessId: `admin-${Date.now()}`,
        input: payload
      });
      setRunId(instance.id);
      await loadRuns(1, wfId);
      toast.success("Workflow 执行完成");
    } catch (e) {
      toast.error(getErrorMessage(e, "运行 Workflow 失败"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-page min-h-full space-y-6">
      <section className="rounded-2xl bg-gradient-to-br from-slate-950 to-indigo-950 p-6 text-white">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3 py-1 text-xs">
              <Workflow className="h-3.5 w-3.5" />
              Internal Workflow Admin
            </div>
            <h1 className="mt-4 text-3xl font-semibold">Workflow 管理与流转调试台</h1>
            <p className="mt-2 text-sm text-slate-300">
              支持增删改查、JSON 编排、可视化流转、运行历史、事件时间线和节点输出查看。
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              className="bg-white text-slate-950 hover:bg-slate-100"
              disabled={busy}
              onClick={createBlankWf}
            >
              <Plus className="mr-2 h-4 w-4" />
              新建空白 Workflow
            </Button>
            <Button
              variant="outline"
              className="border-white/20 bg-white/10 text-white hover:bg-white/15"
              disabled={busy}
              onClick={() => createWf("ticket")}
            >
              账号深度分析
            </Button>
            <Button
              variant="outline"
              className="border-white/20 bg-white/10 text-white hover:bg-white/15"
              disabled={busy}
              onClick={() => createWf("quick")}
            >
              工单初筛分派
            </Button>
            <Button
              variant="outline"
              className="border-white/20 bg-white/10 text-white hover:bg-white/15"
              disabled={busy}
              onClick={() => createWf("followup")}
            >
              客户回访建议
            </Button>
            <Button
              variant="outline"
              className="border-white/20 bg-white/10 text-white hover:bg-white/15"
              disabled={busy}
              onClick={() => createWf("demo")}
            >
              载入演示模板
            </Button>
          </div>
        </div>
      </section>
      <section className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Workflow 列表</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="按名称搜索"
                />
                <Button variant="outline" onClick={() => loadWorkflows(1)}>
                  {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <div className="max-h-[420px] space-y-2 overflow-auto">
                {wfPage.records.map((wf) => (
                  <button
                    key={wf.id}
                    onClick={() => setWfId(wf.id)}
                    className={cn(
                      "w-full rounded-xl border p-4 text-left",
                      wf.id === wfId
                        ? "border-indigo-200 bg-indigo-50"
                        : "border-slate-200 hover:bg-slate-50"
                    )}
                  >
                    <div className="flex justify-between gap-2">
                      <b className="line-clamp-1 text-sm">{wf.name}</b>
                      <Badge variant="outline">{wf.status}</Badge>
                    </div>
                    <p className="mt-2 line-clamp-2 text-xs text-slate-500">
                      {wf.description || wf.id}
                    </p>
                    <p className="mt-2 font-mono text-[11px] text-slate-400">
                      {wf.workflowType} / v{wf.version || 1}
                    </p>
                  </button>
                ))}
              </div>
              <Pager page={wfPage} onPage={loadWorkflows} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Workflow 操作</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Button
                className="justify-start"
                variant="outline"
                disabled={!selected}
                onClick={duplicateWf}
              >
                <Copy className="mr-2 h-4 w-4" />
                复制当前为草稿
              </Button>
              <Button
                className="justify-start border-red-200 text-red-700 hover:bg-red-50"
                variant="outline"
                disabled={!wfId || busy}
                onClick={deleteWf}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                删除当前 Workflow
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>运行输入</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                className="min-h-[200px] font-mono text-xs"
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
              <Button
                className="w-full admin-primary-gradient"
                disabled={busy || !wfId}
                onClick={runWf}
              >
                <Play className="mr-2 h-4 w-4" />
                运行 Workflow
              </Button>
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <Info label="当前 Workflow" value={selected?.name || "未选择"} />
            <Info label="Flow 类型" value={selected?.workflowType || "-"} />
            <Info label="节点数量" value={selected?.nodes?.length || 0} />
            <Info label="运行次数" value={runPage.total || 0} />
          </div>
          <WorkflowEditor
            editor={editor}
            mode={editorMode}
            busy={busy}
            onChange={setEditor}
            onSave={saveWf}
          />
          <WorkflowDetail workflow={selected} detail={detail} />
          <RunHistory
            page={runPage}
            runId={runId}
            onSelect={setRunId}
            onPage={(p) => loadRuns(p)}
          />
          <div className="grid gap-6 xl:grid-cols-2">
            <Timeline detail={detail} />
            <NodeOutputs detail={detail} />
            <JsonCard title="Workflow Memory" value={detail?.context?.workflowMemory} />
            <JsonCard title="完整实例详情" value={detail} />
          </div>
        </div>
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-2 line-clamp-1 text-lg font-semibold">{value}</p>
    </div>
  );
}
function WorkflowEditor({
  editor,
  mode,
  busy,
  onChange,
  onSave
}: {
  editor: ReturnType<typeof payloadToEditor>;
  mode: "create" | "edit";
  busy: boolean;
  onChange: (v: ReturnType<typeof payloadToEditor>) => void;
  onSave: () => void;
}) {
  const set = <K extends keyof typeof editor>(key: K, value: (typeof editor)[K]) =>
    onChange({ ...editor, [key]: value });
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-3">
          <span>Workflow {mode === "edit" ? "编辑" : "创建"}</span>
          <Button disabled={busy} onClick={onSave}>
            {busy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {mode === "edit" ? "保存修改" : "创建 Workflow"}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <Input
            value={editor.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Workflow 名称"
          />
          <Input
            value={editor.workflowType}
            onChange={(e) => set("workflowType", e.target.value)}
            placeholder="workflowType"
          />
          <Input
            value={editor.harnessType}
            onChange={(e) => set("harnessType", e.target.value)}
            placeholder="harnessType"
          />
          <Input
            value={editor.status}
            onChange={(e) => set("status", e.target.value)}
            placeholder="status"
          />
        </div>
        <Textarea
          value={editor.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="描述"
        />
        <div className="grid gap-4 xl:grid-cols-2">
          <JsonEdit
            title="nodes 节点配置"
            value={editor.nodesText}
            onChange={(v) => set("nodesText", v)}
          />
          <JsonEdit
            title="edges 连线配置"
            value={editor.edgesText}
            onChange={(v) => set("edgesText", v)}
          />
          <JsonEdit
            title="config 运行配置"
            value={editor.configText}
            onChange={(v) => set("configText", v)}
          />
          <JsonEdit
            title="inputSchema 输入 Schema"
            value={editor.inputSchemaText}
            onChange={(v) => set("inputSchemaText", v)}
          />
          <JsonEdit
            title="outputSchema 输出 Schema"
            value={editor.outputSchemaText}
            onChange={(v) => set("outputSchemaText", v)}
          />
        </div>
      </CardContent>
    </Card>
  );
}
function JsonEdit({
  title,
  value,
  onChange
}: {
  title: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium text-slate-700">{title}</span>
      <Textarea
        className="min-h-[220px] font-mono text-xs"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
function Pager<T>({ page, onPage }: { page: PageResult<T>; onPage: (n: number) => void }) {
  const pages = Math.max(page.pages || 1, 1);
  return (
    <div className="flex items-center justify-between text-xs text-slate-500">
      <span>
        共 {page.total} 条，第 {page.current}/{pages} 页
      </span>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={page.current <= 1}
          onClick={() => onPage(page.current - 1)}
        >
          上一页
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={page.current >= pages}
          onClick={() => onPage(page.current + 1)}
        >
          下一页
        </Button>
      </div>
    </div>
  );
}
function WorkflowDetail({
  workflow,
  detail
}: {
  workflow: AgentWorkflow | null;
  detail: AgentWorkflowInstance | null;
}) {
  const nodes = [...(workflow?.nodes || [])].sort(
    (a, b) => (a.nodeOrder || 0) - (b.nodeOrder || 0)
  );
  const edges = workflow?.edges || [];
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitBranch className="h-4 w-4" />
          Workflow 可视化流转
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {workflow ? (
          <>
            <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
              {workflow.description || "暂无描述"}
            </p>
            <div className="overflow-x-auto pb-3">
              <div className="flex min-w-max items-center gap-4">
                {nodes.map((n, i) => (
                  <div key={n.nodeKey} className="flex items-center gap-4">
                    <FlowNode
                      node={n}
                      status={detail?.nodes?.find((x) => x.nodeKey === n.nodeKey)?.status}
                    />
                    {i < nodes.length - 1 && (
                      <div className="w-24 text-center text-[10px] text-slate-500">
                        <div className="h-px bg-slate-300" />
                        {edges.filter((e) => e.sourceNodeKey === n.nodeKey).length > 1
                          ? "BRANCH"
                          : "DEFAULT"}
                        <div className="h-px bg-slate-300" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {edges.map((e, i) => (
                <div
                  key={`${e.sourceNodeKey}-${e.targetNodeKey}-${i}`}
                  className="rounded-xl border bg-slate-50 p-3 text-xs"
                >
                  <span className="font-mono">{e.sourceNodeKey}</span>
                  <span className="px-2 text-slate-400">→</span>
                  <span className="font-mono">{e.targetNodeKey}</span>
                  <Badge variant="outline" className="ml-2">
                    {e.edgeType}
                  </Badge>
                </div>
              ))}
            </div>
            <JsonCard title="Workflow 配置" value={workflow} />
          </>
        ) : (
          <p className="text-sm text-slate-500">请选择 Workflow</p>
        )}
      </CardContent>
    </Card>
  );
}
function FlowNode({ node, status }: { node: AgentWorkflowNode; status?: string | null }) {
  const nodeTypeClass =
    node.nodeType === "ACTION"
      ? "border-blue-200 bg-blue-50 text-blue-700"
      : node.nodeType === "EVALUATOR"
        ? "border-violet-200 bg-violet-50 text-violet-700"
        : "border-slate-200 bg-slate-50 text-slate-700";
  return (
    <div className="w-[240px] rounded-xl border bg-white p-4">
      <div className="flex justify-between gap-2">
        <div>
          <p className="line-clamp-1 text-sm font-semibold">{node.nodeName || node.nodeKey}</p>
          <p className="mt-1 font-mono text-[11px] text-slate-500">{node.nodeKey}</p>
        </div>
        <Badge variant="outline" className={nodeTypeClass}>
          {node.nodeType}
        </Badge>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        order {node.nodeOrder ?? "-"} / {node.actionType || "-"}
      </p>
      <div className="mt-3 flex justify-between border-t pt-3">
        <span className="text-xs text-slate-400">latest</span>
        <Badge variant="outline" className={statusClass(status)}>
          {status || "NOT_RUN"}
        </Badge>
      </div>
    </div>
  );
}
function RunHistory({
  page,
  runId,
  onSelect,
  onPage
}: {
  page: PageResult<AgentWorkflowInstance>;
  runId: string;
  onSelect: (id: string) => void;
  onPage: (n: number) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>运行历史</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {page.records.map((r) => (
          <button
            key={r.id}
            onClick={() => onSelect(r.id)}
            className={cn(
              "w-full rounded-xl border p-4 text-left",
              r.id === runId
                ? "border-emerald-200 bg-emerald-50"
                : "border-slate-200 hover:bg-slate-50"
            )}
          >
            <div className="flex justify-between">
              <span className="font-mono text-xs">{r.id}</span>
              <Badge variant="outline" className={statusClass(r.status)}>
                {r.status}
              </Badge>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {t(r.createTime)} / {r.businessType || "-"}
            </p>
          </button>
        ))}
        <Pager page={page} onPage={onPage} />
      </CardContent>
    </Card>
  );
}
function Timeline({ detail }: { detail: AgentWorkflowInstance | null }) {
  const list = detail?.events || [];
  return (
    <Card>
      <CardHeader>
        <CardTitle>事件时间线</CardTitle>
      </CardHeader>
      <CardContent className="max-h-96 space-y-3 overflow-auto">
        {list.map((e) => (
          <div key={e.id} className="border-l-2 border-indigo-200 pl-4">
            <Badge variant="outline">{e.eventType}</Badge>
            <p className="mt-2 text-sm">{e.content}</p>
            <p className="text-xs text-slate-400">
              {t(e.createTime)} / importance {e.importanceScore ?? "-"}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
function NodeOutputs({ detail }: { detail: AgentWorkflowInstance | null }) {
  const list = detail?.nodes || [];
  return (
    <Card>
      <CardHeader>
        <CardTitle>节点输出折叠面板</CardTitle>
      </CardHeader>
      <CardContent className="max-h-96 space-y-3 overflow-auto">
        {list.map((n) => (
          <details key={n.id} className="rounded-xl border p-4">
            <summary className="cursor-pointer text-sm font-semibold">
              {n.nodeName || n.nodeKey}{" "}
              <Badge variant="outline" className={statusClass(n.status)}>
                {n.status}
              </Badge>
            </summary>
            <pre className="mt-3 max-h-56 overflow-auto rounded-lg bg-slate-950 p-3 font-mono text-xs text-slate-100">
              {j(n.output)}
            </pre>
          </details>
        ))}
      </CardContent>
    </Card>
  );
}
