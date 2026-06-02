import { api } from "@/services/api";
import type { PageResult } from "@/services/workflowService";
export type { PageResult };

export interface AgentDefinition {
  id?: string;
  agentKey: string;
  agentName: string;
  role: string;
  goal?: string;
  modelId?: string;
  toolNames?: string[];
  llmConfig?: Record<string, unknown>;
  agentOrder?: number;
  isLeader?: boolean;
  memoryStrategy?: string;
  config?: Record<string, unknown>;
  createTime?: string;
}

export interface AgentTeam {
  id: string;
  name: string;
  description?: string | null;
  topology: string;
  maxRounds: number;
  mergeStrategy: string;
  config?: Record<string, unknown> | null;
  agents?: AgentDefinition[];
  createTime?: string | null;
  updateTime?: string | null;
}

export interface AgentTeamCreatePayload {
  name: string;
  description?: string;
  topology: string;
  maxRounds: number;
  mergeStrategy: string;
  config?: Record<string, unknown>;
  agents?: AgentDefinition[];
}

export async function getAgentTeams(
  params: { pageNo?: number; pageSize?: number; keyword?: string } = {}
): Promise<PageResult<AgentTeam>> {
  return api.get<PageResult<AgentTeam>, PageResult<AgentTeam>>("/agent/teams", {
    params: { pageNo: params.pageNo ?? 1, pageSize: params.pageSize ?? 10, keyword: params.keyword || undefined }
  });
}

export async function getAgentTeam(id: string): Promise<AgentTeam> {
  return api.get<AgentTeam, AgentTeam>(`/agent/teams/${id}`);
}

export async function createAgentTeam(payload: AgentTeamCreatePayload): Promise<AgentTeam> {
  return api.post<AgentTeam, AgentTeam>("/agent/teams", payload);
}

export async function updateAgentTeam(id: string, payload: AgentTeamCreatePayload): Promise<AgentTeam> {
  return api.put<AgentTeam, AgentTeam>(`/agent/teams/${id}`, payload);
}

export async function deleteAgentTeam(id: string): Promise<void> {
  return api.delete<void, void>(`/agent/teams/${id}`);
}

export async function getAgentTeamAgents(teamId: string): Promise<AgentDefinition[]> {
  return api.get<AgentDefinition[], AgentDefinition[]>(`/agent/teams/${teamId}/agents`);
}

export async function addAgentToTeam(teamId: string, payload: AgentDefinition): Promise<AgentDefinition> {
  return api.post<AgentDefinition, AgentDefinition>(`/agent/teams/${teamId}/agents`, payload);
}

export async function updateAgent(teamId: string, agentId: string, payload: AgentDefinition): Promise<AgentDefinition> {
  return api.put<AgentDefinition, AgentDefinition>(`/agent/teams/${teamId}/agents/${agentId}`, payload);
}

export async function removeAgentFromTeam(teamId: string, agentId: string): Promise<void> {
  return api.delete<void, void>(`/agent/teams/${teamId}/agents/${agentId}`);
}

export async function getAvailableTools(): Promise<string[]> {
  return api.get<string[], string[]>("/agent/teams/available-tools");
}

export const TOPOLOGY_OPTIONS = [
  { value: "PARALLEL", label: "并行 - 所有Agent同时执行" },
  { value: "SEQUENTIAL", label: "顺序 - Agent依次执行" },
  { value: "DEBATE", label: "辩论 - 多轮辩论收敛" },
  { value: "HIERARCHICAL", label: "层级 - Leader委派执行" }
] as const;

export const MERGE_STRATEGY_OPTIONS = [
  { value: "CONSENSUS", label: "共识 - 所有Agent一致" },
  { value: "MAJORITY", label: "多数 - 少数服从多数" },
  { value: "LEADER", label: "Leader决策" },
  { value: "FIRST", label: "优先 - 第一个结果" }
] as const;

export function buildMultiAgentParallelWorkflow(teamId: string): import("@/services/workflowService").AgentWorkflowCreatePayload {
  return {
    name: `多Agent并行分析 - ${new Date().toLocaleTimeString("zh-CN", { hour12: false })}`,
    description: "在一个Workflow节点内启动多个专家Agent并行分析，结果合并输出。每个Agent有独立角色、目标和工具。",
    workflowType: "multi_agent_chat",
    harnessType: "FLOW",
    status: "ENABLED",
    config: { memoryEnabled: true, memoryStrategyType: "LAYERED", memorySummaryInterval: 1 },
    inputSchema: { type: "object", properties: { ticketId: { type: "string" }, question: { type: "string" }, content: { type: "string" } } },
    outputSchema: { type: "object" },
    nodes: [
      {
        nodeKey: "multiAgentAnalysis",
        nodeName: "多Agent并行分析",
        nodeType: "ACTION",
        actionType: "NOOP",
        nodeOrder: 1,
        config: { strategyType: "AGENT_TEAM", teamId }
      },
      {
        nodeKey: "evaluateResult",
        nodeName: "验收分析结果",
        nodeType: "EVALUATOR",
        nodeOrder: 2,
        config: { evaluatorType: "RULE", targetNodeKey: "multiAgentAnalysis", requiredFields: ["totalAgents", "successCount", "agentResults"], minLength: 20, maxReflectionRounds: 0, retryNodeKey: "multiAgentAnalysis" }
      },
      { nodeKey: "end", nodeName: "结束", nodeType: "END", nodeOrder: 3, config: {} }
    ],
    edges: [
      { sourceNodeKey: "multiAgentAnalysis", targetNodeKey: "evaluateResult", edgeType: "DEFAULT", priority: 1 },
      { sourceNodeKey: "evaluateResult", targetNodeKey: "end", edgeType: "DEFAULT", priority: 1 }
    ]
  };
}
