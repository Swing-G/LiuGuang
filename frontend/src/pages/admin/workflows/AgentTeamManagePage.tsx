import { useEffect, useState, useCallback } from "react";
import { Loader2, Plus, Save, Search, Trash2, Users, UserPlus, X, FileJson2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  getAgentTeams,
  getAgentTeam,
  createAgentTeam,
  updateAgentTeam,
  deleteAgentTeam,
  getAgentTeamAgents,
  addAgentToTeam,
  updateAgent,
  removeAgentFromTeam,
  getAvailableTools,
  TOPOLOGY_OPTIONS,
  MERGE_STRATEGY_OPTIONS,
  TOPOLOGY_MERGE_MAP,
  TOPOLOGY_DEFAULT_MERGE,
  type AgentTeam,
  type AgentTeamCreatePayload,
  type AgentDefinition,
  type PageResult
} from "@/services/multiAgentService";
import { getErrorMessage } from "@/utils/error";

const emptyPage: PageResult<AgentTeam> = { records: [], total: 0, size: 10, current: 1, pages: 0 };
const emptyAgent: AgentDefinition = { agentKey: "", agentName: "", role: "", toolNames: [], agentOrder: 0, isLeader: false, memoryStrategy: "CONVERSATION" };

export function AgentTeamManagePage() {
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(emptyPage);
  const [teamId, setTeamId] = useState("");
  const [team, setTeam] = useState<AgentTeam | null>(null);
  const [agents, setAgents] = useState<AgentDefinition[]>([]);
  const [availableTools, setAvailableTools] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  // Editor state
  const [editingAgent, setEditingAgent] = useState<AgentDefinition | null>(null);
  const [showAgentForm, setShowAgentForm] = useState(false);

  // Team form
  const [teamName, setTeamName] = useState("");
  const [teamDesc, setTeamDesc] = useState("");
  const [topology, setTopology] = useState("PARALLEL");
  const [maxRounds, setMaxRounds] = useState(3);
  const [mergeStrategy, setMergeStrategy] = useState("SYNTHESIS");

  const loadTeams = useCallback(async (pageNo = 1) => {
    setBusy(true);
    try {
      setPage(await getAgentTeams({ pageNo, pageSize: page.size, keyword: keyword.trim() || undefined }));
    } catch (e) {
      toast.error(getErrorMessage(e, "加载Agent Team失败"));
    } finally { setBusy(false); }
  }, [keyword, page.size]);

  const loadTeam = useCallback(async (id: string) => {
    setTeamId(id);
    try {
      const t = await getAgentTeam(id);
      setTeam(t);
      setTeamName(t.name);
      setTeamDesc(t.description || "");
      setTopology(t.topology);
      setMaxRounds(t.maxRounds);
      setMergeStrategy(t.mergeStrategy);
      const list = await getAgentTeamAgents(id);
      setAgents(list);
    } catch (e) {
      toast.error(getErrorMessage(e, "加载Team详情失败"));
    }
  }, []);

  useEffect(() => { loadTeams(1); }, []);
  useEffect(() => {
    getAvailableTools().then(setAvailableTools).catch(() => { });
  }, []);

  const resetForm = () => {
    setTeamName(""); setTeamDesc(""); setTopology("PARALLEL"); setMaxRounds(3);
    setMergeStrategy("CONSENSUS"); setTeam(null); setTeamId(""); setAgents([]);
  };

  const saveTeam = async () => {
    if (!teamName.trim()) return toast.error("请填写Team名称");
    setBusy(true);
    const payload: AgentTeamCreatePayload = { name: teamName, description: teamDesc, topology, maxRounds, mergeStrategy, agents };
    try {
      const result = teamId
        ? await updateAgentTeam(teamId, payload)
        : await createAgentTeam(payload);
      toast.success(teamId ? "Team已更新" : "Team已创建");
      setTeam(result);
      setTeamId(result.id);
      await loadTeams(1);
    } catch (e) {
      toast.error(getErrorMessage(e, "保存Team失败"));
    } finally { setBusy(false); }
  };

  const handleDeleteTeam = async () => {
    if (!teamId || !team) return;
    if (!window.confirm(`确认删除「${team.name}」吗？所属Agent也会被删除。`)) return;
    setBusy(true);
    try {
      await deleteAgentTeam(teamId);
      toast.success("已删除");
      resetForm();
      await loadTeams(1);
    } catch (e) {
      toast.error(getErrorMessage(e, "删除失败"));
    } finally { setBusy(false); }
  };

  const saveAgent = async () => {
    if (!editingAgent?.agentKey.trim() || !editingAgent?.agentName.trim() || !editingAgent?.role.trim()) {
      return toast.error("Agent Key/名称/角色描述不能为空");
    }
    if (!teamId) {
      const t = await createAgentTeam({ name: teamName || "新Team", description: teamDesc, topology, maxRounds, mergeStrategy, agents: [] });
      setTeamId(t.id); setTeam(t);
      toast.success("已自动创建Team");
    }
    setBusy(true);
    try {
      if (editingAgent.id) {
        await updateAgent(teamId, editingAgent.id, editingAgent);
        toast.success("Agent已更新");
      } else {
        await addAgentToTeam(teamId, editingAgent);
        toast.success("Agent已添加");
      }
      const list = await getAgentTeamAgents(teamId);
      setAgents(list);
      setEditingAgent(null);
      setShowAgentForm(false);
    } catch (e) {
      toast.error(getErrorMessage(e, "保存Agent失败"));
    } finally { setBusy(false); }
  };

  const handleRemoveAgent = async (agentId: string) => {
    if (!window.confirm("确认删除此Agent？")) return;
    setBusy(true);
    try {
      await removeAgentFromTeam(teamId, agentId);
      const list = await getAgentTeamAgents(teamId);
      setAgents(list);
    } catch (e) {
      toast.error(getErrorMessage(e, "删除Agent失败"));
    } finally { setBusy(false); }
  };

  const toggleTool = (tool: string) => {
    if (!editingAgent) return;
    const tools = editingAgent.toolNames || [];
    const next = tools.includes(tool) ? tools.filter(t => t !== tool) : [...tools, tool];
    setEditingAgent({ ...editingAgent, toolNames: next });
  };

  return (
    <div className="admin-page space-y-6">
      <section className="rounded-2xl bg-gradient-to-br from-slate-950 to-indigo-950 p-6 text-white">
        <div className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3 py-1 text-xs">
          <Users className="h-3.5 w-3.5" /> Agent Team Management
        </div>
        <h1 className="mt-4 text-3xl font-semibold">Agent Team 管理</h1>
        <p className="mt-2 text-sm text-slate-300">创建Agent Team，配置多专家角色、工具和协作拓扑。</p>
      </section>

      <section className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        {/* Left: Team List */}
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Team 列表</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="搜索Team" />
                <Button variant="outline" onClick={() => loadTeams(1)} disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>
              <div className="max-h-[420px] space-y-2 overflow-auto">
                {page.records.map((t) => (
                  <button key={t.id} onClick={() => loadTeam(t.id)}
                    className={cn("w-full rounded-xl border p-4 text-left", t.id === teamId ? "border-indigo-200 bg-indigo-50" : "border-slate-200 hover:bg-slate-50")}>
                    <div className="flex justify-between gap-2">
                      <b className="line-clamp-1 text-sm">{t.name}</b>
                      <Badge variant="outline">{t.topology}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{t.description || t.id}</p>
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Button className="w-full" onClick={resetForm}>
                  <Plus className="mr-2 h-4 w-4" />新建 Team
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Team Editor */}
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>{teamId ? "编辑 Team" : "新建 Team"}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div><Label>Team名称</Label><Input value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="例如：工单分析专家组" /></div>
                <div><Label>描述</Label><Input value={teamDesc} onChange={e => setTeamDesc(e.target.value)} placeholder="Team用途描述" /></div>
                <div>
                  <Label>协作拓扑</Label>
                  <select className="w-full mt-1.5 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm" value={topology} onChange={e => { setTopology(e.target.value); setMergeStrategy(TOPOLOGY_DEFAULT_MERGE[e.target.value] || ""); }}>
                    {TOPOLOGY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <Label>合并策略</Label>
                  <select className="w-full mt-1.5 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm" value={mergeStrategy} onChange={e => setMergeStrategy(e.target.value)}>
                    {(TOPOLOGY_MERGE_MAP[topology] || []).map(v => {
                      const opt = MERGE_STRATEGY_OPTIONS.find(o => o.value === v);
                      return <option key={v} value={v}>{opt?.label || v}</option>;
                    })}
                  </select>
                </div>
                <div><Label>最大轮数</Label><Input type="number" min={1} max={10} value={maxRounds} onChange={e => setMaxRounds(Number(e.target.value))} /></div>
              </div>
              <div className="flex gap-2">
                <Button onClick={saveTeam} disabled={busy}><Save className="mr-2 h-4 w-4" />保存 Team</Button>
                {teamId && (
                  <Button variant="outline" className="border-red-200 text-red-700 hover:bg-red-50" onClick={handleDeleteTeam} disabled={busy}>
                    <Trash2 className="mr-2 h-4 w-4" />删除
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Agent List */}
          {teamId && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Agent 成员 ({agents.length})</CardTitle>
                <Button size="sm" onClick={() => { setEditingAgent({ ...emptyAgent, agentOrder: agents.length + 1 }); setShowAgentForm(true); }}>
                  <UserPlus className="mr-2 h-4 w-4" />添加 Agent
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {agents.map(agent => (
                  <div key={agent.agentKey} className="rounded-xl border p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{agent.agentName}</span>
                          <Badge variant="outline" className="font-mono text-xs">{agent.agentKey}</Badge>
                          {agent.isLeader && <Badge className="bg-amber-100 text-amber-700 border-amber-200">Leader</Badge>}
                        </div>
                        <p className="mt-2 text-sm text-slate-600 line-clamp-2">{agent.role}</p>
                        {agent.goal && <p className="mt-1 text-xs text-slate-400">目标: {agent.goal}</p>}
                      </div>
                      <div className="flex gap-1 ml-4">
                        <Button size="sm" variant="ghost" onClick={() => { setEditingAgent({ ...agent }); setShowAgentForm(true); }}>编辑</Button>
                        <Button size="sm" variant="ghost" className="text-red-600" onClick={() => handleRemoveAgent(agent.id!)}><X className="h-4 w-4" /></Button>
                      </div>
                    </div>
                    {agent.toolNames && agent.toolNames.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {agent.toolNames.map(t => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}
                      </div>
                    )}
                  </div>
                ))}
                {agents.length === 0 && <p className="text-sm text-slate-500">暂无Agent成员，点击"添加Agent"开始</p>}
              </CardContent>
            </Card>
          )}

          {/* Agent Form Dialog */}
          {showAgentForm && editingAgent && (
            <Card className="border-indigo-200 bg-indigo-50/50">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{editingAgent.id ? "编辑 Agent" : "新建 Agent"}</CardTitle>
                <Button size="sm" variant="ghost" onClick={() => { setShowAgentForm(false); setEditingAgent(null); }}><X className="h-4 w-4" /></Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <div><Label>Agent Key</Label><Input value={editingAgent.agentKey} onChange={e => setEditingAgent({ ...editingAgent, agentKey: e.target.value })} placeholder="如: account_analyst" disabled={!!editingAgent.id} /></div>
                  <div><Label>Agent名称</Label><Input value={editingAgent.agentName} onChange={e => setEditingAgent({ ...editingAgent, agentName: e.target.value })} placeholder="如: 账号分析专家" /></div>
                </div>
                <div>
                  <Label>角色描述 (System Prompt)</Label>
                  <Textarea className="min-h-[120px] font-mono text-xs" value={editingAgent.role} onChange={e => setEditingAgent({ ...editingAgent, role: e.target.value })} placeholder="详细描述Agent的角色、职责和能力..." />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div><Label>目标</Label><Input value={editingAgent.goal || ""} onChange={e => setEditingAgent({ ...editingAgent, goal: e.target.value })} placeholder="Agent的高层次目标" /></div>
                  <div><Label>模型ID (可选)</Label><Input value={editingAgent.modelId || ""} onChange={e => setEditingAgent({ ...editingAgent, modelId: e.target.value })} placeholder="留空则使用默认模型" /></div>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <div><Label>排序</Label><Input type="number" value={editingAgent.agentOrder ?? 0} onChange={e => setEditingAgent({ ...editingAgent, agentOrder: Number(e.target.value) })} /></div>
                  <div className="flex items-end gap-2">
                    <label className="flex items-center gap-2 h-10"><input type="checkbox" checked={!!editingAgent.isLeader} onChange={e => setEditingAgent({ ...editingAgent, isLeader: e.target.checked })} /> Leader</label>
                  </div>
                  <div>
                    <Label>记忆策略</Label>
                    <select className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm" value={editingAgent.memoryStrategy || "CONVERSATION"} onChange={e => setEditingAgent({ ...editingAgent, memoryStrategy: e.target.value })}>
                      <option value="CONVERSATION">对话记忆</option>
                      <option value="SUMMARIZE">摘要记忆</option>
                      <option value="NONE">无记忆</option>
                    </select>
                  </div>
                </div>
                <div>
                  <Label>可用工具 <span className="text-xs text-slate-400">({availableTools.length}个可用)</span></Label>
                  <div className="mt-2 flex flex-wrap gap-2 max-h-32 overflow-auto p-2 rounded-lg border">
                    {availableTools.map(tool => (
                      <Badge key={tool} variant={(editingAgent.toolNames || []).includes(tool) ? "default" : "outline"}
                        className="cursor-pointer" onClick={() => toggleTool(tool)}>
                        {tool} {(editingAgent.toolNames || []).includes(tool) ? "✓" : "+"}
                      </Badge>
                    ))}
                    {availableTools.length === 0 && <span className="text-xs text-slate-400">无可用MCP工具</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={saveAgent} disabled={busy}><Save className="mr-2 h-4 w-4" />保存 Agent</Button>
                  <Button variant="outline" onClick={() => { setShowAgentForm(false); setEditingAgent(null); }}>取消</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </section>
    </div>
  );
}
