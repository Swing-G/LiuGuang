import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Save, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  createAgentWorkflowChatOption,
  deleteAgentWorkflowChatOption,
  getAgentWorkflowChatOptions,
  getAgentWorkflows,
  updateAgentWorkflowChatOption,
  type AgentWorkflow,
  type AgentWorkflowChatOption,
  type AgentWorkflowChatOptionPayload,
  type AgentWorkflowChatPromptPreset,
  type PageResult
} from "@/services/workflowService";
import { getErrorMessage } from "@/utils/error";

const emptyWorkflowPage: PageResult<AgentWorkflow> = { records: [], total: 0, size: 20, current: 1, pages: 0 };
const defaultPromptPresets: AgentWorkflowChatPromptPreset[] = [
  {
    title: "查询账号续费状态",
    description: "查询账号、订单和工单事实并给出处理建议",
    prompt: "A10001 我对这个账户有疑问，客户说续费失败，帮我查一下当前状态并给出处理建议。"
  }
];
const blank: AgentWorkflowChatOptionPayload = {
  optionKey: "",
  label: "",
  description: "",
  workflowId: "",
  enabled: true,
  sortOrder: 0,
  promptPresets: defaultPromptPresets
};
const formatPromptPresets = (value?: AgentWorkflowChatPromptPreset[] | string | null) => {
  if (!value) return JSON.stringify(defaultPromptPresets, null, 2);
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
};

export function WorkflowChatBindingPage() {
  const [options, setOptions] = useState<AgentWorkflowChatOption[]>([]);
  const [workflows, setWorkflows] = useState(emptyWorkflowPage);
  const [keyword, setKeyword] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AgentWorkflowChatOptionPayload>(blank);
  const [busy, setBusy] = useState(false);
  const selectedWorkflow = useMemo(
    () => workflows.records.find((item) => item.id === form.workflowId),
    [form.workflowId, workflows.records]
  );

  async function loadOptions() {
    setOptions(await getAgentWorkflowChatOptions(false));
  }

  async function loadWorkflows(pageNo = 1) {
    const page = await getAgentWorkflows({ pageNo, pageSize: workflows.size, keyword: keyword.trim() || undefined });
    setWorkflows(page);
  }

  async function loadAll() {
    setBusy(true);
    try {
      await Promise.all([loadOptions(), loadWorkflows(1)]);
    } catch (error) {
      toast.error(getErrorMessage(error, "加载绑定配置失败"));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  function edit(option: AgentWorkflowChatOption) {
    setEditingId(option.id);
    setForm({
      optionKey: option.optionKey,
      label: option.label,
      description: option.description || "",
      workflowId: option.workflowId,
      enabled: option.enabled !== false,
      sortOrder: option.sortOrder || 0,
      promptPresets: formatPromptPresets(option.promptPresets)
    });
  }

  function reset() {
    setEditingId(null);
    setForm(blank);
  }

  async function save() {
    if (!form.optionKey.trim() || !form.label.trim() || !form.workflowId.trim()) {
      toast.error("选项Key、展示名称和绑定Workflow编号不能为空");
      return;
    }
    let payload = form;
    try {
      payload = {
        ...form,
        promptPresets: typeof form.promptPresets === "string" ? JSON.parse(form.promptPresets) : form.promptPresets
      };
    } catch {
      toast.error("提示词模板必须是 JSON 数组");
      return;
    }
    setBusy(true);
    try {
      if (editingId) await updateAgentWorkflowChatOption(editingId, payload);
      else await createAgentWorkflowChatOption(payload);
      toast.success(editingId ? "绑定已更新" : "绑定已创建");
      reset();
      await loadOptions();
    } catch (error) {
      toast.error(getErrorMessage(error, "保存绑定失败"));
    } finally {
      setBusy(false);
    }
  }

  async function remove(option: AgentWorkflowChatOption) {
    if (!window.confirm(`确认删除「${option.label}」吗？`)) return;
    setBusy(true);
    try {
      await deleteAgentWorkflowChatOption(option.id);
      toast.success("绑定已删除");
      await loadOptions();
    } catch (error) {
      toast.error(getErrorMessage(error, "删除绑定失败"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-page space-y-6">
      <section className="rounded-2xl bg-gradient-to-br from-slate-950 to-indigo-950 p-6 text-white">
        <h1 className="text-3xl font-semibold">对话 Workflow 选项绑定</h1>
        <p className="mt-2 text-sm text-slate-300">RAG 在用户端固定展示；这里维护其它对话选项，每个选项只映射到一个已配置的 Workflow。</p>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card>
          <CardHeader><CardTitle>已配置选项</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {options.map((option) => (
              <div key={option.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2"><b>{option.label}</b><Badge variant="outline">{option.enabled ? "启用" : "禁用"}</Badge></div>
                    <p className="mt-1 text-xs text-slate-500">{option.description || "暂无描述"}</p>
                    <p className="mt-2 font-mono text-xs text-slate-500">optionKey: {option.optionKey}</p>
                    <p className="font-mono text-xs text-slate-500">workflowId: {option.workflowId}</p>
                    <p className="font-mono text-xs text-slate-500">workflowType: {option.workflowType || "-"}</p>
                    <p className="text-xs text-slate-500">Workflow: {option.workflowName || "-"}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => edit(option)}>编辑</Button>
                    <Button variant="outline" size="sm" className="border-red-200 text-red-700 hover:bg-red-50" onClick={() => remove(option)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              </div>
            ))}
            {options.length === 0 ? <div className="rounded-xl border border-dashed p-8 text-center text-sm text-slate-500">暂无绑定配置</div> : null}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>{editingId ? "修改绑定" : "新增绑定"}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Field label="选项Key"><Input value={form.optionKey} onChange={(event) => setForm({ ...form, optionKey: event.target.value })} placeholder="例如 ticket_triage_chat" /></Field>
              <Field label="展示名称"><Input value={form.label} onChange={(event) => setForm({ ...form, label: event.target.value })} placeholder="例如 工单账号深度分析" /></Field>
              <Field label="描述"><Textarea value={form.description || ""} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field>
              <Field label="/ 提示词模板 JSON"><Textarea className="min-h-[180px] font-mono text-xs" value={formatPromptPresets(form.promptPresets)} onChange={(event) => setForm({ ...form, promptPresets: event.target.value })} /></Field>
              <Field label="绑定 Workflow 编号"><Input value={form.workflowId} onChange={(event) => setForm({ ...form, workflowId: event.target.value })} /></Field>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="排序"><Input type="number" value={form.sortOrder || 0} onChange={(event) => setForm({ ...form, sortOrder: Number(event.target.value) })} /></Field>
                <label className="flex items-end gap-2 pb-2 text-sm text-slate-700"><input type="checkbox" checked={form.enabled} onChange={(event) => setForm({ ...form, enabled: event.target.checked })} />启用</label>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1" onClick={save} disabled={busy}><Save className="mr-2 h-4 w-4" />保存</Button>
                <Button variant="outline" onClick={reset}><Plus className="mr-2 h-4 w-4" />新建</Button>
              </div>
              {selectedWorkflow ? <p className="text-xs text-slate-500">当前绑定：{selectedWorkflow.name} / {selectedWorkflow.workflowType}</p> : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>选择 Workflow 编号</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索 Workflow" />
                <Button variant="outline" onClick={() => loadWorkflows(1)}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}</Button>
              </div>
              <div className="max-h-[360px] space-y-2 overflow-auto">
                {workflows.records.map((workflow) => (
                  <button key={workflow.id} className={`w-full rounded-xl border p-3 text-left ${workflow.id === form.workflowId ? "border-indigo-200 bg-indigo-50" : "border-slate-200 hover:bg-slate-50"}`} onClick={() => setForm({ ...form, workflowId: workflow.id })}>
                    <b className="text-sm">{workflow.name}</b>
                    <p className="mt-1 font-mono text-[11px] text-slate-500">{workflow.id}</p>
                    <p className="font-mono text-[11px] text-slate-400">{workflow.workflowType}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="space-y-2 text-sm font-medium text-slate-700"><span>{label}</span>{children}</label>;
}
