import { useEffect, useState, useCallback } from "react";
import { Loader2, Plus, Save, Play, Trash2, ChevronRight, GitBranch, Users, ArrowRight, Check, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  createAgentWorkflow, getAgentWorkflows, getAgentWorkflow, updateAgentWorkflow, deleteAgentWorkflow,
  runAgentWorkflow, getAgentWorkflowInstance, getAgentWorkflowInstances, buildTicketTriageWorkflow,
  buildPureReActReasoningWorkflow, buildPlanExecuteReasoningWorkflow, buildLayeredMemoryDemoWorkflow,
  type AgentWorkflow, type AgentWorkflowInstance, type AgentWorkflowNode, type AgentWorkflowEdge,
  type AgentWorkflowCreatePayload, type PageResult
} from "@/services/workflowService";
import { buildMultiAgentParallelWorkflow, getAgentTeams, type AgentTeam } from "@/services/multiAgentService";
import { getErrorMessage } from "@/utils/error";

// ─── Constants ───────────────────
const NODE_TYPES = [
  { value: "ACTION", label: "动作节点 (ACTION)", desc: "执行具体任务" },
  { value: "EVALUATOR", label: "评估节点 (EVALUATOR)", desc: "验收上游输出质量" },
  { value: "CONDITION", label: "条件分支 (CONDITION)", desc: "按条件分流" },
  { value: "HUMAN_REVIEW", label: "人工审核 (HUMAN_REVIEW)", desc: "暂停等待人工" },
  { value: "END", label: "结束节点 (END)", desc: "流程终点" }
] as const;

const ACTION_TYPES = [
  { value: "NOOP", label: "无操作 (NOOP)", desc: "占位/纯策略执行" },
  { value: "MCP_TOOL", label: "MCP工具 (MCP_TOOL)", desc: "调用MCP工具" },
  { value: "TICKET_ACCOUNT_ANALYSIS", label: "账号分析", desc: "分析工单账号状态" },
  { value: "TICKET_TRIAGE", label: "工单分派", desc: "初筛分派工单" },
  { value: "REACT_ANSWER_SUMMARY", label: "ReAct结果整理", desc: "ReAct后处理" },
  { value: "PLAN_EXECUTE_SUMMARY", label: "PAE结果整理", desc: "PAE后处理" },
  { value: "CONDITION", label: "条件判断", desc: "条件分支" }
] as const;

const STRATEGY_TYPES = [
  { value: "PIPELINE", label: "Pipeline", desc: "直接调用Action执行器" },
  { value: "REACT", label: "ReAct", desc: "LLM思考-行动-观察循环" },
  { value: "PLAN_EXECUTE", label: "Plan-Execute", desc: "LLM先规划再执行" },
  { value: "AGENT_TEAM", label: "Agent Team", desc: "多Agent并行协作" }
] as const;

const EDGE_TYPES = [
  { value: "DEFAULT", label: "默认" },
  { value: "SUCCESS", label: "成功" },
  { value: "FAILED", label: "失败" },
  { value: "CONDITION", label: "条件" }
] as const;

const EVALUATOR_TYPES = [
  { value: "RULE", label: "规则验收 (RULE)" },
  { value: "LLM", label: "LLM验收 (LLM)" }
] as const;

const emptyPage: PageResult<AgentWorkflow> = { records: [], total: 0, size: 10, current: 1, pages: 0 };
const emptyPageInst: PageResult<AgentWorkflowInstance> = { records: [], total: 0, size: 10, current: 1, pages: 0 };

// ─── Helper ───────────────────
const freshNode = (order: number): AgentWorkflowNode => ({
  nodeKey: "node_" + Date.now(), nodeName: "", nodeType: "ACTION", actionType: "NOOP",
  nodeOrder: order, config: {}, retryLimit: 0
});

const freshEdge = (): AgentWorkflowEdge => ({
  sourceNodeKey: "", targetNodeKey: "", edgeType: "DEFAULT", priority: 1
});

// ─── Page ───────────────────
export function WorkflowBuilderPage() {
  // Step tracker
  const [step, setStep] = useState(0);
  // Workflow list
  const [wfPage, setWfPage] = useState(emptyPage);
  const [editId, setEditId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Basic info
  const [wfName, setWfName] = useState("");
  const [wfDesc, setWfDesc] = useState("");
  const [wfType, setWfType] = useState("custom");
  const [wfStatus, setWfStatus] = useState("DRAFT");
  // Nodes
  const [nodes, setNodes] = useState<AgentWorkflowNode[]>([freshNode(1)]);
  // Edges
  const [edges, setEdges] = useState<AgentWorkflowEdge[]>([freshEdge()]);
  // Run
  const [runInput, setRunInput] = useState('{\n  "question": ""\n}');
  const [lastInstance, setLastInstance] = useState<AgentWorkflowInstance | null>(null);
  const [instancePage, setInstancePage] = useState(emptyPageInst);
  // Teams for AGENT_TEAM
  const [teams, setTeams] = useState<AgentTeam[]>([]);

  const loadTeams = useCallback(async () => {
    try { const r = await getAgentTeams({ pageSize: 100 }); setTeams(r.records); } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadTeams(); }, [loadTeams]);

  // ─── Load workflows ────────
  const loadWfs = useCallback(async () => {
    setBusy(true);
    try { setWfPage(await getAgentWorkflows({ pageSize: 20 })); } catch (e) { toast.error(getErrorMessage(e)); }
    finally { setBusy(false); }
  }, []);

  useEffect(() => { loadWfs(); }, [loadWfs]);

  // ─── Load workflow for editing ─────
  const loadForEdit = async (id: string) => {
    setBusy(true); setEditId(id);
    try {
      const wf = await getAgentWorkflow(id);
      setWfName(wf.name);
      setWfDesc(wf.description || "");
      setWfType(wf.workflowType || "custom");
      setWfStatus(wf.status || "DRAFT");
      setNodes(wf.nodes?.length ? wf.nodes : [freshNode(1)]);
      setEdges(wf.edges?.length ? wf.edges : [freshEdge()]);
      setStep(1);
      toast.success("已加载 Workflow");
    } catch (e) { toast.error(getErrorMessage(e)); setEditId(null); }
    finally { setBusy(false); }
  };

  // ─── Template ──────────────
  const loadTemplate = (tpl: string) => {
    let payload: AgentWorkflowCreatePayload;
    switch (tpl) {
      case "ticket": payload = buildTicketTriageWorkflow(); break;
      case "react": payload = buildPureReActReasoningWorkflow(); break;
      case "pae": payload = buildPlanExecuteReasoningWorkflow(); break;
      case "memory": payload = buildLayeredMemoryDemoWorkflow(); break;
      case "multiAgent": payload = buildMultiAgentParallelWorkflow("PLEASE_SELECT_TEAM"); break;
      default: return;
    }
    setWfName(payload.name);
    setWfDesc(payload.description || "");
    setWfType(payload.workflowType);
    setWfStatus(payload.status);
    setNodes(payload.nodes.map((n, i) => ({ ...n, nodeOrder: i + 1 })));
    setEdges(payload.edges);
    setEditId(null);
    setStep(1);
    toast.success("模板已载入");
  };

  const clearForm = () => {
    setEditId(null); setStep(0);
    setWfName(""); setWfDesc(""); setWfType("custom"); setWfStatus("DRAFT");
    setNodes([freshNode(1)]); setEdges([freshEdge()]);
    setLastInstance(null);
  };

  // ─── Save ──────────────────
  const save = async () => {
    if (!wfName.trim()) return toast.error("请输入 Workflow 名称");
    const payload: AgentWorkflowCreatePayload = {
      name: wfName, description: wfDesc, workflowType: wfType, harnessType: "FLOW",
      status: wfStatus, nodes, edges, config: {}, inputSchema: { type: "object" }, outputSchema: { type: "object" }
    };
    setBusy(true);
    try {
      const result = editId ? await updateAgentWorkflow(editId, payload) : await createAgentWorkflow(payload);
      setEditId(result.id);
      toast.success("已保存");
      await loadWfs();
    } catch (e) { toast.error(getErrorMessage(e)); }
    finally { setBusy(false); }
  };

  const deleteWf = async () => {
    if (!editId) return;
    if (!window.confirm("确认删除？")) return;
    setBusy(true);
    try { await deleteAgentWorkflow(editId); clearForm(); await loadWfs(); toast.success("已删除"); }
    catch (e) { toast.error(getErrorMessage(e)); }
    finally { setBusy(false); }
  };

  // ─── Run ───────────────────
  const run = async () => {
    if (!editId) return toast.error("请先保存 Workflow");
    let input: Record<string, unknown>;
    try { input = JSON.parse(runInput); } catch { return toast.error("输入必须是合法JSON"); }
    setBusy(true);
    try {
      const inst = await runAgentWorkflow(editId, { businessType: "manual", businessId: String(Date.now()), input });
      setLastInstance(inst);
      const p = await getAgentWorkflowInstances({ workflowId: editId, pageSize: 10 });
      setInstancePage(p);
      toast.success(inst.status === "COMPLETED" ? "执行完成" : `状态: ${inst.status}`);
    } catch (e) { toast.error(getErrorMessage(e)); }
    finally { setBusy(false); }
  };

  // ─── Node mutations ────────
  const updateNode = (idx: number, patch: Partial<AgentWorkflowNode>) => {
    setNodes(prev => prev.map((n, i) => i === idx ? { ...n, ...patch } : n));
  };
  const addNode = () => setNodes(prev => [...prev, freshNode(prev.length + 1)]);
  const removeNode = (idx: number) => {
    if (nodes.length <= 1) return;
    setNodes(prev => prev.filter((_, i) => i !== idx).map((n, i) => ({ ...n, nodeOrder: i + 1 })));
  };

  // ─── Edge mutations ────────
  const updateEdge = (idx: number, patch: Partial<AgentWorkflowEdge>) => {
    setEdges(prev => prev.map((e, i) => i === idx ? { ...e, ...patch } : e));
  };
  const addEdge = () => setEdges(prev => [...prev, freshEdge()]);
  const removeEdge = (idx: number) => {
    if (edges.length <= 1) return;
    setEdges(prev => prev.filter((_, i) => i !== idx));
  };

  const nodeOrdered = [...nodes].sort((a, b) => (a.nodeOrder || 0) - (b.nodeOrder || 0));

  // ─── Render Steps ──────────
  const steps = ["模板/新建", "节点编排", "连线定义", "保存与运行"];
  const StepIndicator = () => (
    <div className="flex items-center gap-2 mb-6">
      {steps.map((s, i) => (
        <div key={i} className="flex items-center gap-2">
          <button onClick={() => setStep(i)} className={cn(
            "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition",
            step === i ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          )}>
            <span className={cn("flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
              step === i ? "bg-white text-indigo-600" : "bg-slate-300 text-white")}>{i + 1}</span>
            {s}
          </button>
          {i < steps.length - 1 && <ChevronRight className="h-4 w-4 text-slate-300" />}
        </div>
      ))}
    </div>
  );

  return (
    <div className="admin-page space-y-6">
      {/* Hero */}
      <section className="rounded-2xl bg-gradient-to-br from-slate-950 to-indigo-950 p-6 text-white">
        <div className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3 py-1 text-xs">
          <GitBranch className="h-3.5 w-3.5" /> Visual Builder
        </div>
        <h1 className="mt-4 text-3xl font-semibold">Workflow 可视化构建器</h1>
        <p className="mt-2 text-sm text-slate-300">分步骤创建 Workflow，无需手写 JSON。</p>
      </section>

      <StepIndicator />

      {/* ── Step 0: Choose template or existing ── */}
      {step === 0 && (
        <div className="grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>从模板开始</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {[
                { key: "ticket", label: "工单分析", desc: "MCP查询 → 账号分析 → 验收" },
                { key: "react", label: "ReAct推理", desc: "ReAct节点 → 验收 → 总结" },
                { key: "pae", label: "Plan-Execute", desc: "PAE节点 → 验收 → 总结" },
                { key: "multiAgent", label: "多Agent并行", desc: "多Agent节点 → 验收" },
                { key: "memory", label: "分层记忆演示", desc: "验证记忆压缩" }
              ].map(t => (
                <button key={t.key} onClick={() => loadTemplate(t.key)}
                  className="w-full rounded-xl border p-4 text-left hover:border-indigo-300 hover:bg-indigo-50 transition">
                  <div className="font-semibold">{t.label}</div>
                  <div className="text-xs text-slate-500 mt-1">{t.desc}</div>
                </button>
              ))}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle>或从已有 Workflow 编辑</CardTitle></CardHeader>
              <CardContent className="space-y-3 max-h-[400px] overflow-auto">
                {wfPage.records.map(wf => (
                  <button key={wf.id} onClick={() => loadForEdit(wf.id)}
                    className={cn("w-full rounded-xl border p-3 text-left hover:bg-slate-50 transition",
                      editId === wf.id && "border-indigo-300 bg-indigo-50")}>
                    <div className="flex justify-between">
                      <b className="text-sm">{wf.name}</b>
                      <Badge variant="outline">{wf.status}</Badge>
                    </div>
                    <div className="text-xs text-slate-400 mt-1">{wf.id}</div>
                  </button>
                ))}
              </CardContent>
            </Card>
            <Button className="w-full" variant="outline" onClick={() => setStep(1)}>
              <Plus className="mr-2 h-4 w-4" />从空白创建
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 1: Node orchestration ── */}
      {step === 1 && (
        <div className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader><CardTitle>基本信息</CardTitle></CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              <div><Label>名称 *</Label><Input value={wfName} onChange={e => setWfName(e.target.value)} placeholder="例如：工单处理Flow" /></div>
              <div><Label>类型</Label><Input value={wfType} onChange={e => setWfType(e.target.value)} placeholder="如 ticket_process" /></div>
              <div>
                <Label>状态</Label>
                <select className="w-full h-10 rounded-md border px-3 text-sm" value={wfStatus} onChange={e => setWfStatus(e.target.value)}>
                  <option value="DRAFT">DRAFT - 草稿</option>
                  <option value="ENABLED">ENABLED - 启用</option>
                </select>
              </div>
              <div className="md:col-span-3"><Label>描述</Label><Input value={wfDesc} onChange={e => setWfDesc(e.target.value)} placeholder="描述这个Workflow做什么" /></div>
            </CardContent>
          </Card>

          {/* Nodes */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">节点编排 ({nodes.length} 个)</h2>
            <Button onClick={addNode} size="sm"><Plus className="mr-2 h-4 w-4" />添加节点</Button>
          </div>

          {/* Visual flow */}
          <div className="overflow-x-auto pb-3">
            <div className="flex min-w-max items-center gap-3">
              {nodeOrdered.map((node, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-[200px] rounded-xl border bg-white p-4">
                    <div className="text-xs text-slate-400">#{node.nodeOrder}</div>
                    <div className="font-semibold text-sm mt-1">{node.nodeName || "未命名"}</div>
                    <div className="flex gap-1 mt-2">
                      <Badge className="text-xs">{node.nodeType}</Badge>
                      {node.nodeType === "ACTION" && <Badge variant="outline" className="text-xs">{node.actionType || "?"}</Badge>}
                    </div>
                    {node.config && (node.config as Record<string, unknown>).strategyType && (
                      <Badge variant="secondary" className="text-xs mt-1">{(node.config as Record<string, unknown>).strategyType as string}</Badge>
                    )}
                    {node.config && (node.config as Record<string, unknown>).teamId && (
                      <Badge variant="secondary" className="text-xs mt-1">
                        <Users className="h-3 w-3 mr-0.5" />Team
                      </Badge>
                    )}
                  </div>
                  {i < nodeOrdered.length - 1 && <ArrowRight className="h-5 w-5 text-slate-300" />}
                </div>
              ))}
            </div>
          </div>

          {/* Node editor list */}
          <div className="space-y-4">
            {nodes.map((node, idx) => (
              <Card key={idx} className={node.nodeType === "END" ? "border-green-200 bg-green-50/30" : ""}>
                <CardHeader className="flex flex-row items-center justify-between py-3">
                  <CardTitle className="text-base">节点 #{node.nodeOrder} {node.nodeName && `- ${node.nodeName}`}</CardTitle>
                  <Button size="sm" variant="ghost" className="text-red-600" onClick={() => removeNode(idx)} disabled={nodes.length <= 1}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-3">
                  <div><Label>节点Key</Label><Input value={node.nodeKey} onChange={e => updateNode(idx, { nodeKey: e.target.value })} placeholder="唯一标识" /></div>
                  <div><Label>显示名</Label><Input value={node.nodeName || ""} onChange={e => updateNode(idx, { nodeName: e.target.value })} placeholder="中文名称" /></div>
                  <div>
                    <Label>节点类型</Label>
                    <select className="w-full h-10 rounded-md border px-3 text-sm" value={node.nodeType}
                      onChange={e => {
                        const newType = e.target.value;
                        const patch: Partial<AgentWorkflowNode> = { nodeType: newType };
                        if (newType === "END") patch.actionType = undefined;
                        else if (!patch.actionType) patch.actionType = "NOOP";
                        updateNode(idx, patch);
                      }}>
                      {NODE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>

                  {/* Action Type (for ACTION nodes) */}
                  {node.nodeType === "ACTION" && (
                    <div>
                      <Label>动作类型</Label>
                      <select className="w-full h-10 rounded-md border px-3 text-sm" value={node.actionType || "NOOP"}
                        onChange={e => updateNode(idx, { actionType: e.target.value })}>
                        {ACTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                  )}

                  {/* Strategy Type (for NOOP action or when explicitly set) */}
                  {node.nodeType === "ACTION" && (
                    <div>
                      <Label>执行策略</Label>
                      <select className="w-full h-10 rounded-md border px-3 text-sm"
                        value={(node.config && (node.config as Record<string, unknown>).strategyType as string) || "PIPELINE"}
                        onChange={e => {
                          const config = { ...(node.config as Record<string, unknown> || {}), strategyType: e.target.value };
                          if (e.target.value !== "AGENT_TEAM") delete (config as Record<string, unknown>).teamId;
                          updateNode(idx, { config: config as unknown as Record<string, unknown> });
                        }}>
                        {STRATEGY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                  )}

                  {/* Team selector (for AGENT_TEAM) */}
                  {node.nodeType === "ACTION" && node.config && (node.config as Record<string, unknown>).strategyType === "AGENT_TEAM" && (
                    <div>
                      <Label>选择 Agent Team</Label>
                      <select className="w-full h-10 rounded-md border px-3 text-sm"
                        value={(node.config as Record<string, unknown>).teamId as string || ""}
                        onChange={e => {
                          const config = { ...(node.config as Record<string, unknown> || {}), teamId: e.target.value };
                          updateNode(idx, { config: config as unknown as Record<string, unknown> });
                        }}>
                        <option value="">-- 请选择 --</option>
                        {teams.map(t => <option key={t.id} value={t.id}>{t.name} ({t.topology})</option>)}
                      </select>
                    </div>
                  )}

                  {/* Evaluator config */}
                  {node.nodeType === "EVALUATOR" && (
                    <>
                      <div>
                        <Label>评估方式</Label>
                        <select className="w-full h-10 rounded-md border px-3 text-sm"
                          value={(node.config && (node.config as Record<string, unknown>).evaluatorType as string) || "RULE"}
                          onChange={e => {
                            const config = { ...(node.config as Record<string, unknown> || {}), evaluatorType: e.target.value };
                            updateNode(idx, { config: config as unknown as Record<string, unknown> });
                          }}>
                          {EVALUATOR_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                      </div>
                      <div><Label>评估目标节点Key</Label>
                        <select className="w-full h-10 rounded-md border px-3 text-sm"
                          value={(node.config && (node.config as Record<string, unknown>).targetNodeKey as string) || ""}
                          onChange={e => {
                            const config = { ...(node.config as Record<string, unknown> || {}), targetNodeKey: e.target.value };
                            updateNode(idx, { config: config as unknown as Record<string, unknown> });
                          }}>
                          <option value="">-- 选择上游节点 --</option>
                          {nodes.filter(n => n.nodeKey !== node.nodeKey && n.nodeType !== "EVALUATOR").map(n =>
                            <option key={n.nodeKey} value={n.nodeKey}>{n.nodeName || n.nodeKey} ({n.nodeType})</option>
                          )}
                        </select>
                      </div>
                    </>
                  )}

                  {/* Timeout / Retry */}
                  <div><Label>超时(ms)</Label><Input type="number" value={node.timeoutMs || ""} onChange={e => updateNode(idx, { timeoutMs: e.target.value ? Number(e.target.value) : undefined })} placeholder="默认" /></div>
                  <div><Label>重试上限</Label><Input type="number" value={node.retryLimit || 0} onChange={e => updateNode(idx, { retryLimit: Number(e.target.value) })} /></div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(0)}><ArrowLeft className="mr-2 h-4 w-4" />上一步</Button>
            <Button onClick={() => setStep(2)}>下一步：连线定义<ArrowRight className="ml-2 h-4 w-4" /></Button>
          </div>
        </div>
      )}

      {/* ── Step 2: Edges ── */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">连线定义 ({edges.length} 条)</h2>
            <Button onClick={addEdge} size="sm"><Plus className="mr-2 h-4 w-4" />添加连线</Button>
          </div>

          <div className="space-y-3">
            {edges.map((edge, idx) => (
              <Card key={idx}>
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="flex-1"><Label>源节点</Label>
                    <select className="w-full h-10 rounded-md border px-3 text-sm" value={edge.sourceNodeKey}
                      onChange={e => updateEdge(idx, { sourceNodeKey: e.target.value })}>
                      <option value="">-- 选择 --</option>
                      {nodes.map(n => <option key={n.nodeKey} value={n.nodeKey}>{n.nodeName || n.nodeKey}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-2 pt-5"><ArrowRight className="h-5 w-5 text-slate-400" /></div>
                  <div className="flex-1"><Label>目标节点</Label>
                    <select className="w-full h-10 rounded-md border px-3 text-sm" value={edge.targetNodeKey}
                      onChange={e => updateEdge(idx, { targetNodeKey: e.target.value })}>
                      <option value="">-- 选择 --</option>
                      {nodes.filter(n => n.nodeKey !== edge.sourceNodeKey).map(n => <option key={n.nodeKey} value={n.nodeKey}>{n.nodeName || n.nodeKey}</option>)}
                    </select>
                  </div>
                  <div className="w-[160px]"><Label>边类型</Label>
                    <select className="w-full h-10 rounded-md border px-3 text-sm" value={edge.edgeType}
                      onChange={e => updateEdge(idx, { edgeType: e.target.value })}>
                      {EDGE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div className="pt-5">
                    <Button size="sm" variant="ghost" className="text-red-600" onClick={() => removeEdge(idx)} disabled={edges.length <= 1}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Edge Preview */}
          <Card>
            <CardHeader><CardTitle>流转预览</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {edges.filter(e => e.sourceNodeKey && e.targetNodeKey).map((e, i) => {
                  const src = nodes.find(n => n.nodeKey === e.sourceNodeKey);
                  const tgt = nodes.find(n => n.nodeKey === e.targetNodeKey);
                  return (
                    <div key={i} className="flex items-center gap-3 rounded-lg bg-slate-50 p-3 text-sm">
                      <Badge>{src?.nodeName || e.sourceNodeKey}</Badge>
                      <span className="text-slate-400">—{e.edgeType}→</span>
                      <Badge variant="outline">{tgt?.nodeName || e.targetNodeKey}</Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(1)}><ArrowLeft className="mr-2 h-4 w-4" />上一步</Button>
            <Button onClick={() => setStep(3)}>下一步：保存与运行<ArrowRight className="ml-2 h-4 w-4" /></Button>
          </div>
        </div>
      )}

      {/* ── Step 3: Save & Run ── */}
      {step === 3 && (
        <div className="grid gap-6 xl:grid-cols-2">
          {/* Left: Save & Run */}
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle>保存 Workflow</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <div><Label>名称 *</Label><Input value={wfName} onChange={e => setWfName(e.target.value)} /></div>
                  <div><Label>类型</Label><Input value={wfType} onChange={e => setWfType(e.target.value)} /></div>
                  <div className="md:col-span-2"><Label>描述</Label><Input value={wfDesc} onChange={e => setWfDesc(e.target.value)} /></div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={save} disabled={busy}>
                    {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    {editId ? "更新" : "创建"}
                  </Button>
                  {editId && <Button variant="outline" className="border-red-200 text-red-700 hover:bg-red-50" onClick={deleteWf}><Trash2 className="mr-2 h-4 w-4" />删除</Button>}
                </div>
                {editId && <div className="text-xs text-slate-500 font-mono">ID: {editId}</div>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>运行测试</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div><Label>输入 (JSON)</Label>
                  <Textarea className="min-h-[150px] font-mono text-xs" value={runInput} onChange={e => setRunInput(e.target.value)} />
                </div>
                <Button className="w-full admin-primary-gradient" onClick={run} disabled={busy || !editId}>
                  <Play className="mr-2 h-4 w-4" />运行 Workflow
                </Button>
              </CardContent>
            </Card>

            <Button variant="outline" onClick={() => setStep(2)}><ArrowLeft className="mr-2 h-4 w-4" />返回上一步</Button>
          </div>

          {/* Right: Results */}
          <div className="space-y-6">
            {/* Instance result */}
            {lastInstance && (
              <Card>
                <CardHeader><CardTitle>最近运行: {lastInstance.status}</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-sm text-slate-500 mb-3">ID: {lastInstance.id}</div>
                  {lastInstance.nodes && (
                    <div className="space-y-2">
                      {lastInstance.nodes.map(n => (
                        <div key={n.id || n.nodeKey} className="rounded-lg border p-3">
                          <div className="flex justify-between">
                            <span className="font-semibold text-sm">{n.nodeName || n.nodeKey}</span>
                            <Badge className={n.status === "SUCCESS" || n.status === "COMPLETED" ? "bg-green-100 text-green-700" : n.status === "FAILED" ? "bg-red-100 text-red-700" : ""}>{n.status}</Badge>
                          </div>
                          {n.durationMs && <div className="text-xs text-slate-400 mt-1">耗时: {n.durationMs}ms</div>}
                          {n.output && (
                            <pre className="mt-2 max-h-40 overflow-auto rounded bg-slate-950 p-2 font-mono text-xs text-slate-100">
                              {JSON.stringify(n.output, null, 2)}
                            </pre>
                          )}
                          {n.errorMessage && <p className="text-xs text-red-600 mt-1">{n.errorMessage}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* History */}
            {instancePage.records.length > 0 && (
              <Card>
                <CardHeader><CardTitle>运行历史</CardTitle></CardHeader>
                <CardContent className="space-y-2 max-h-[400px] overflow-auto">
                  {instancePage.records.map(ri => (
                    <div key={ri.id} className="rounded-lg border p-3 cursor-pointer hover:bg-slate-50"
                      onClick={async () => {
                        try { setLastInstance(await getAgentWorkflowInstance(ri.id)); } catch { /* ignore */ }
                      }}>
                      <div className="flex justify-between text-xs">
                        <span className="font-mono">{ri.id}</span>
                        <Badge>{ri.status}</Badge>
                      </div>
                      <div className="text-xs text-slate-400 mt-1">{ri.createTime}</div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
