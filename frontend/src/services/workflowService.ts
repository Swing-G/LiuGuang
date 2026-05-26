import { api } from "@/services/api";

export interface AgentWorkflowNode {
  nodeKey: string;
  nodeName?: string | null;
  nodeType: string;
  actionType?: string | null;
  skillId?: string | null;
  config?: Record<string, unknown> | null;
  inputMapping?: Record<string, unknown> | null;
  outputMapping?: Record<string, unknown> | null;
  retryLimit?: number | null;
  timeoutMs?: number | null;
  nodeOrder?: number | null;
}

export interface AgentWorkflowEdge {
  sourceNodeKey: string;
  targetNodeKey: string;
  edgeType: string;
  conditionExpr?: string | null;
  priority?: number | null;
}

export interface AgentWorkflow {
  id: string;
  name: string;
  description?: string | null;
  workflowType?: string | null;
  harnessType?: string | null;
  version?: number | null;
  status?: string | null;
  inputSchema?: Record<string, unknown> | null;
  outputSchema?: Record<string, unknown> | null;
  config?: Record<string, unknown> | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  createTime?: string | null;
  updateTime?: string | null;
  nodes?: AgentWorkflowNode[] | null;
  edges?: AgentWorkflowEdge[] | null;
}

export interface WorkflowMemoryEvent {
  eventType?: string;
  eventLevel?: string;
  importance?: number;
  content?: string;
  payload?: Record<string, unknown>;
}

export interface WorkflowMemory {
  strategyType?: string;
  summary?: string;
  highImportanceEvents?: WorkflowMemoryEvent[];
  compressedContext?: {
    shortTermContext?: Record<string, unknown>;
    highImportanceEvents?: WorkflowMemoryEvent[];
    recentNodeOutputs?: Record<string, unknown>;
  };
}

export interface AgentWorkflowNodeInstance {
  id: string;
  instanceId: string;
  workflowId: string;
  nodeKey: string;
  nodeName?: string | null;
  nodeType?: string | null;
  actionType?: string | null;
  status?: string | null;
  input?: Record<string, unknown> | null;
  output?: Record<string, unknown> | null;
  errorMessage?: string | null;
  retryCount?: number | null;
  startedAt?: string | null;
  completedAt?: string | null;
  durationMs?: number | null;
}

export interface AgentWorkflowEvent {
  id: string;
  instanceId: string;
  nodeInstanceId?: string | null;
  eventType?: string | null;
  eventLevel?: string | null;
  content?: string | null;
  payload?: Record<string, unknown> | null;
  importanceScore?: number | null;
  createTime?: string | null;
}
export interface AgentWorkflowInstance {
  id: string;
  workflowId: string;
  workflowVersion?: number | null;
  harnessType?: string | null;
  businessType?: string | null;
  businessId?: string | null;
  userId?: string | null;
  status?: string | null;
  input?: Record<string, unknown> | null;
  context?: Record<string, unknown> & {
    workflowMemory?: WorkflowMemory;
  };
  output?: Record<string, unknown> | null;
  errorMessage?: string | null;
  currentNodeKey?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createTime?: string | null;
  updateTime?: string | null;
  nodes?: AgentWorkflowNodeInstance[] | null;
  events?: AgentWorkflowEvent[] | null;
}

export interface PageResult<T> {
  records: T[];
  total: number;
  size: number;
  current: number;
  pages: number;
}

export interface AgentWorkflowCreatePayload {
  name: string;
  description?: string;
  workflowType: string;
  harnessType: string;
  status: string;
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  config?: Record<string, unknown>;
  nodes: AgentWorkflowNode[];
  edges: AgentWorkflowEdge[];
}

export type AgentWorkflowUpdatePayload = AgentWorkflowCreatePayload;

export interface AgentWorkflowChatPromptPreset {
  title: string;
  description?: string;
  prompt: string;
}

export interface AgentWorkflowChatOption {
  id: string;
  optionKey: string;
  label: string;
  description?: string | null;
  workflowId: string;
  workflowName?: string | null;
  workflowType?: string | null;
  enabled?: boolean | null;
  sortOrder?: number | null;
  promptPresets?: AgentWorkflowChatPromptPreset[] | string | null;
  createTime?: string | null;
  updateTime?: string | null;
}

export interface AgentWorkflowChatOptionPayload {
  optionKey: string;
  label: string;
  description?: string;
  workflowId: string;
  enabled: boolean;
  sortOrder?: number;
  promptPresets?: AgentWorkflowChatPromptPreset[] | string;
}

export interface AgentWorkflowRunPayload {
  businessType: string;
  businessId: string;
  input: Record<string, unknown>;
}

export async function getAgentWorkflows(
  params: {
    pageNo?: number;
    pageSize?: number;
    keyword?: string;
    status?: string;
  } = {}
): Promise<PageResult<AgentWorkflow>> {
  return api.get<PageResult<AgentWorkflow>, PageResult<AgentWorkflow>>("/agent/workflows", {
    params: {
      pageNo: params.pageNo ?? 1,
      pageSize: params.pageSize ?? 10,
      keyword: params.keyword || undefined,
      status: params.status || undefined
    }
  });
}

export async function createAgentWorkflow(
  payload: AgentWorkflowCreatePayload
): Promise<AgentWorkflow> {
  return api.post<AgentWorkflow, AgentWorkflow>("/agent/workflows", payload);
}

export async function getAgentWorkflow(id: string): Promise<AgentWorkflow> {
  return api.get<AgentWorkflow, AgentWorkflow>(`/agent/workflows/${id}`);
}

export async function updateAgentWorkflow(
  id: string,
  payload: AgentWorkflowUpdatePayload
): Promise<AgentWorkflow> {
  return api.put<AgentWorkflow, AgentWorkflow>(`/agent/workflows/${id}`, payload);
}

export async function deleteAgentWorkflow(id: string): Promise<void> {
  return api.delete<void, void>(`/agent/workflows/${id}`);
}

export async function runAgentWorkflow(
  id: string,
  payload: AgentWorkflowRunPayload
): Promise<AgentWorkflowInstance> {
  return api.post<AgentWorkflowInstance, AgentWorkflowInstance>(
    `/agent/workflows/${id}/run`,
    payload
  );
}

export async function getAgentWorkflowInstance(id: string): Promise<AgentWorkflowInstance> {
  return api.get<AgentWorkflowInstance, AgentWorkflowInstance>(`/agent/workflow-instances/${id}`);
}

export async function getAgentWorkflowInstances(
  params: {
    pageNo?: number;
    pageSize?: number;
    workflowId?: string;
  } = {}
): Promise<PageResult<AgentWorkflowInstance>> {
  return api.get<PageResult<AgentWorkflowInstance>, PageResult<AgentWorkflowInstance>>(
    "/agent/workflow-instances",
    {
      params: {
        pageNo: params.pageNo ?? 1,
        pageSize: params.pageSize ?? 10,
        workflowId: params.workflowId || undefined
      }
    }
  );
}

export async function getAgentWorkflowChatOptions(
  enabledOnly?: boolean
): Promise<AgentWorkflowChatOption[]> {
  return api.get<AgentWorkflowChatOption[], AgentWorkflowChatOption[]>(
    "/agent/workflow-chat-options",
    { params: { enabledOnly: enabledOnly || undefined } }
  );
}

export async function createAgentWorkflowChatOption(
  payload: AgentWorkflowChatOptionPayload
): Promise<AgentWorkflowChatOption> {
  return api.post<AgentWorkflowChatOption, AgentWorkflowChatOption>(
    "/agent/workflow-chat-options",
    payload
  );
}

export async function updateAgentWorkflowChatOption(
  id: string,
  payload: AgentWorkflowChatOptionPayload
): Promise<AgentWorkflowChatOption> {
  return api.put<AgentWorkflowChatOption, AgentWorkflowChatOption>(
    `/agent/workflow-chat-options/${id}`,
    payload
  );
}

export async function deleteAgentWorkflowChatOption(id: string): Promise<void> {
  return api.delete<void, void>(`/agent/workflow-chat-options/${id}`);
}

export function buildTicketTriageWorkflow(): AgentWorkflowCreatePayload {
  return {
    name: "工单账号分析 Workflow",
    description:
      "演示用户提出账号或工单疑问后，Workflow 调用 MCP 查询账号、订阅、支付和工单数据，再输出处理建议的固定流程",
    workflowType: "ticket_triage_chat",
    harnessType: "FLOW",
    status: "ENABLED",
    config: {
      memoryEnabled: true,
      memoryStrategyType: "LAYERED",
      memorySummaryInterval: 1
    },
    inputSchema: {
      type: "object",
      properties: {
        ticketId: { type: "string" },
        accountId: { type: "string" },
        orderId: { type: "string" },
        content: { type: "string" },
        question: { type: "string" }
      }
    },
    outputSchema: { type: "object" },
    nodes: [
      {
        nodeKey: "queryAccountTicket",
        nodeName: "查询账号工单数据",
        nodeType: "ACTION",
        actionType: "MCP_TOOL",
        nodeOrder: 1,
        config: {
          toolName: "ticket.account.query",
          inputParameters: ["ticketId", "accountId", "orderId"]
        }
      },
      {
        nodeKey: "analyzeAccountTicket",
        nodeName: "分析账号当前状态",
        nodeType: "ACTION",
        actionType: "TICKET_ACCOUNT_ANALYSIS",
        nodeOrder: 2,
        config: { sourceNodeKey: "queryAccountTicket" }
      },
      {
        nodeKey: "evaluateAnalysis",
        nodeName: "验收分析结果",
        nodeType: "EVALUATOR",
        nodeOrder: 3,
        config: {
          evaluatorType: "RULE",
          targetNodeKey: "analyzeAccountTicket",
          requiredFields: [
            "ticketId",
            "accountId",
            "riskLevel",
            "rootCause",
            "currentState",
            "suggestion",
            "customerReply"
          ],
          minLength: 20,
          maxReflectionRounds: 0,
          retryNodeKey: "analyzeAccountTicket"
        }
      },
      { nodeKey: "end", nodeName: "结束", nodeType: "END", nodeOrder: 4, config: {} }
    ],
    edges: [
      {
        sourceNodeKey: "queryAccountTicket",
        targetNodeKey: "analyzeAccountTicket",
        edgeType: "DEFAULT",
        priority: 1
      },
      {
        sourceNodeKey: "analyzeAccountTicket",
        targetNodeKey: "evaluateAnalysis",
        edgeType: "DEFAULT",
        priority: 1
      },
      { sourceNodeKey: "evaluateAnalysis", targetNodeKey: "end", edgeType: "DEFAULT", priority: 1 }
    ]
  };
}
export function buildTicketQuickTriageWorkflow(): AgentWorkflowCreatePayload {
  return {
    name: "工单初筛与分派 Flow",
    description:
      "面向售后入口的轻量流程：提取用户诉求，按账号访问、支付续费、票据财务、客户投诉等方向完成初筛、风险分级和责任团队建议。适合用户只给出问题描述但暂未进入深度账号核验的场景。",
    workflowType: "ticket_quick_triage_chat",
    harnessType: "FLOW",
    status: "ENABLED",
    config: {
      flowScenario: "工单入口初筛",
      flowGoal: "把非结构化客诉转成可分派的工单摘要、风险等级和处理建议",
      memoryEnabled: true,
      memoryStrategyType: "LAYERED",
      memorySummaryInterval: 1
    },
    inputSchema: {
      type: "object",
      properties: {
        ticketId: { type: "string" },
        content: { type: "string" },
        question: { type: "string" },
        source: { type: "string" }
      }
    },
    outputSchema: { type: "object" },
    nodes: [
      {
        nodeKey: "triageTicket",
        nodeName: "识别诉求与风险",
        nodeType: "ACTION",
        actionType: "TICKET_TRIAGE",
        nodeOrder: 1,
        config: {}
      },
      {
        nodeKey: "evaluateTriage",
        nodeName: "验收分派结果",
        nodeType: "EVALUATOR",
        nodeOrder: 2,
        config: {
          evaluatorType: "RULE",
          targetNodeKey: "triageTicket",
          requiredFields: [
            "ticketId",
            "category",
            "riskLevel",
            "ownerTeam",
            "summary",
            "suggestion",
            "customerReply"
          ],
          minLength: 20,
          maxReflectionRounds: 0,
          retryNodeKey: "triageTicket"
        }
      },
      { nodeKey: "end", nodeName: "结束", nodeType: "END", nodeOrder: 3, config: {} }
    ],
    edges: [
      {
        sourceNodeKey: "triageTicket",
        targetNodeKey: "evaluateTriage",
        edgeType: "DEFAULT",
        priority: 1
      },
      { sourceNodeKey: "evaluateTriage", targetNodeKey: "end", edgeType: "DEFAULT", priority: 1 }
    ]
  };
}

export function buildCustomerSuccessFollowupWorkflow(): AgentWorkflowCreatePayload {
  return {
    name: "客户成功回访建议 Flow",
    description:
      "面向客户成功团队的固定流程：查询账号、订阅、支付和工单数据，形成续费风险判断、回访话术和下一步动作。适合 VIP 续费失败、订阅临期、客诉回访等场景。",
    workflowType: "customer_success_followup_chat",
    harnessType: "FLOW",
    status: "ENABLED",
    config: {
      flowScenario: "客户成功回访",
      flowGoal: "把账号与工单事实转成客户成功团队可执行的回访建议",
      memoryEnabled: true,
      memoryStrategyType: "LAYERED",
      memorySummaryInterval: 1
    },
    inputSchema: {
      type: "object",
      properties: {
        ticketId: { type: "string" },
        accountId: { type: "string" },
        orderId: { type: "string" },
        content: { type: "string" },
        question: { type: "string" }
      }
    },
    outputSchema: { type: "object" },
    nodes: [
      {
        nodeKey: "queryAccountTicket",
        nodeName: "查询客户上下文",
        nodeType: "ACTION",
        actionType: "MCP_TOOL",
        nodeOrder: 1,
        config: {
          toolName: "ticket.account.query",
          inputParameters: ["ticketId", "accountId", "orderId"]
        }
      },
      {
        nodeKey: "buildFollowupPlan",
        nodeName: "生成回访建议",
        nodeType: "ACTION",
        actionType: "TICKET_ACCOUNT_ANALYSIS",
        nodeOrder: 2,
        config: { sourceNodeKey: "queryAccountTicket" }
      },
      {
        nodeKey: "evaluateFollowup",
        nodeName: "验收回访建议",
        nodeType: "EVALUATOR",
        nodeOrder: 3,
        config: {
          evaluatorType: "RULE",
          targetNodeKey: "buildFollowupPlan",
          requiredFields: [
            "ticketId",
            "accountId",
            "customerName",
            "riskLevel",
            "rootCause",
            "suggestion",
            "customerReply"
          ],
          minLength: 20,
          maxReflectionRounds: 0,
          retryNodeKey: "buildFollowupPlan"
        }
      },
      { nodeKey: "end", nodeName: "结束", nodeType: "END", nodeOrder: 4, config: {} }
    ],
    edges: [
      {
        sourceNodeKey: "queryAccountTicket",
        targetNodeKey: "buildFollowupPlan",
        edgeType: "DEFAULT",
        priority: 1
      },
      {
        sourceNodeKey: "buildFollowupPlan",
        targetNodeKey: "evaluateFollowup",
        edgeType: "DEFAULT",
        priority: 1
      },
      { sourceNodeKey: "evaluateFollowup", targetNodeKey: "end", edgeType: "DEFAULT", priority: 1 }
    ]
  };
}
export function buildReActTicketWorkflow(): AgentWorkflowCreatePayload {
  return {
    name: "ReAct 工单工具推理 Workflow",
    description:
      "演示 Workflow 内部节点使用 ReAct 策略：模型先判断是否需要调用工具，再基于工具观察结果输出最终处理建议，外层仍由 FlowHarness 负责节点流转、Evaluator 验收与状态观测。",
    workflowType: "react_ticket_tool_reasoning_chat",
    harnessType: "FLOW",
    status: "ENABLED",
    config: {
      flowScenario: "ReAct 工具推理",
      flowGoal: "在单个 Workflow 节点内部完成工具选择、观察反馈和最终答案生成",
      memoryEnabled: true,
      memoryStrategyType: "LAYERED",
      memorySummaryInterval: 1
    },
    inputSchema: {
      type: "object",
      properties: {
        ticketId: { type: "string" },
        accountId: { type: "string" },
        orderId: { type: "string" },
        content: { type: "string" },
        question: { type: "string" }
      }
    },
    outputSchema: { type: "object" },
    nodes: [
      {
        nodeKey: "queryAccountTicket",
        nodeName: "查询账号工单上下文",
        nodeType: "ACTION",
        actionType: "MCP_TOOL",
        nodeOrder: 1,
        config: {
          toolName: "ticket.account.query",
          inputParameters: ["ticketId", "accountId", "orderId"]
        }
      },
      {
        nodeKey: "reactDiagnoseTicket",
        nodeName: "ReAct 诊断工单",
        nodeType: "ACTION",
        actionType: "TICKET_ACCOUNT_ANALYSIS",
        nodeOrder: 2,
        config: {
          sourceNodeKey: "queryAccountTicket"
        }
      },
      {
        nodeKey: "evaluateReActResult",
        nodeName: "验收 ReAct 输出",
        nodeType: "EVALUATOR",
        nodeOrder: 3,
        config: {
          evaluatorType: "RULE",
          targetNodeKey: "reactDiagnoseTicket",
          requiredFields: ["ticketId", "accountId", "riskLevel", "rootCause", "suggestion", "customerReply"],
          minLength: 20,
          maxReflectionRounds: 0,
          retryNodeKey: "reactDiagnoseTicket"
        }
      },
      { nodeKey: "end", nodeName: "结束", nodeType: "END", nodeOrder: 4, config: {} }
    ],
    edges: [
      {
        sourceNodeKey: "queryAccountTicket",
        targetNodeKey: "reactDiagnoseTicket",
        edgeType: "DEFAULT",
        priority: 1
      },
      {
        sourceNodeKey: "reactDiagnoseTicket",
        targetNodeKey: "evaluateReActResult",
        edgeType: "DEFAULT",
        priority: 1
      },
      { sourceNodeKey: "evaluateReActResult", targetNodeKey: "end", edgeType: "DEFAULT", priority: 1 }
    ]
  };
}

export function buildPureReActReasoningWorkflow(): AgentWorkflowCreatePayload {
  return {
    name: "纯 ReAct 节点推理 Workflow",
    description:
      "演示 ReAct 在单个 Workflow 节点内部循环思考并产出 final：第一个节点负责 ReAct 多轮推理，第二个节点验收 ReAct 输出，第三个节点整理成对话可返回的总结结果。当前版本不接 MCP 工具。",
    workflowType: "pure_react_reasoning_chat",
    harnessType: "FLOW",
    status: "ENABLED",
    config: {
      flowScenario: "纯 ReAct 节点推理",
      flowGoal: "验证 ReAct 在单个节点内循环思考、收敛 final、再由 Workflow 后续节点评估与总结",
      memoryEnabled: true,
      memoryStrategyType: "LAYERED",
      memorySummaryInterval: 1
    },
    inputSchema: {
      type: "object",
      properties: {
        question: { type: "string" },
        content: { type: "string" },
        ticketId: { type: "string" },
        accountId: { type: "string" },
        orderId: { type: "string" }
      }
    },
    outputSchema: { type: "object" },
    nodes: [
      {
        nodeKey: "reactReasoning",
        nodeName: "ReAct 循环推理",
        nodeType: "ACTION",
        actionType: "NOOP",
        nodeOrder: 1,
        config: {
          strategyType: "REACT",
          maxIterations: 4,
          temperature: 0.2,
          maxTokens: 900,
          taskPrompt:
            "你需要在不调用外部工具的前提下，针对用户问题进行 ReAct 循环推理。至少先输出一次 action 类型作为内部思考步骤，tool 使用 internalThinking，parameters 包含 observation；随后基于观察输出 final。final 的 answer 必须是 JSON 对象，并包含 rootCause、currentState、suggestion、customerReply、riskLevel 字段。",
          allowedTools: [
            {
              name: "internalThinking",
              description: "不访问外部系统，只把 parameters 原样记录为一次内部观察，用于演示 ReAct action/observation 循环。",
              actionType: "NOOP",
              config: {},
              parameters: {
                observation: "本轮内部观察或阶段性结论"
              }
            }
          ]
        }
      },
      {
        nodeKey: "evaluateReActAnswer",
        nodeName: "评估 ReAct 结果",
        nodeType: "EVALUATOR",
        nodeOrder: 2,
        config: {
          evaluatorType: "RULE",
          targetNodeKey: "reactReasoning",
          requiredFields: ["strategyType", "answer", "steps"],
          minLength: 20,
          maxReflectionRounds: 0,
          retryNodeKey: "reactReasoning"
        }
      },
      {
        nodeKey: "reactSummary",
        nodeName: "总结 ReAct 返回",
        nodeType: "ACTION",
        actionType: "REACT_ANSWER_SUMMARY",
        nodeOrder: 3,
        config: {
          sourceNodeKey: "reactReasoning"
        }
      },
      { nodeKey: "end", nodeName: "结束", nodeType: "END", nodeOrder: 4, config: {} }
    ],
    edges: [
      {
        sourceNodeKey: "reactReasoning",
        targetNodeKey: "evaluateReActAnswer",
        edgeType: "DEFAULT",
        priority: 1
      },
      {
        sourceNodeKey: "evaluateReActAnswer",
        targetNodeKey: "reactSummary",
        edgeType: "DEFAULT",
        priority: 1
      },
      {
        sourceNodeKey: "reactSummary",
        targetNodeKey: "end",
        edgeType: "DEFAULT",
        priority: 1
      }
    ]
  };
}

export function buildPlanExecuteReasoningWorkflow(): AgentWorkflowCreatePayload {
  return {
    name: "Plan-and-Execute 推理 Workflow",
    description:
      "演示 Plan-and-Execute 在单个 Workflow 节点内先规划再逐步执行：第一个节点把任务拆成多个执行步骤，每个步骤可自主决定是否调用 MCP 工具，第二个节点验收结果，第三个节点整理成对话可返回的总结结果。",
    workflowType: "plan_execute_reasoning_chat",
    harnessType: "FLOW",
    status: "ENABLED",
    config: {
      flowScenario: "Plan-and-Execute 推理",
      flowGoal: "验证单个节点内先制定计划，再基于计划执行并输出最终答案",
      memoryEnabled: true,
      memoryStrategyType: "LAYERED",
      memorySummaryInterval: 1
    },
    inputSchema: {
      type: "object",
      properties: {
        question: { type: "string" },
        content: { type: "string" },
        ticketId: { type: "string" },
        accountId: { type: "string" },
        orderId: { type: "string" }
      }
    },
    outputSchema: { type: "object" },
    nodes: [
      {
        nodeKey: "planExecute",
        nodeName: "Plan-and-Execute 计划执行",
        nodeType: "ACTION",
        actionType: "NOOP",
        nodeOrder: 1,
        config: {
          strategyType: "PLAN_EXECUTE",
          temperature: 0.2,
          maxTokens: 1200,
          maxSteps: 5,
          taskPrompt:
            "你需要针对用户问题先拆解多个执行步骤，再逐步执行每个步骤。步骤可以自主决定是否调用可用 MCP 工具；当输入里有账号、工单或订单编号时，计划中必须包含一个 toolHint=queryAccountStatus 的查询步骤。最终 answer 必须是 JSON 对象，并包含 rootCause、currentState、suggestion、customerReply、riskLevel 字段。",
          allowedTools: [
            {
              name: "queryAccountStatus",
              description: "通过 MCP 查询账号状态、封禁原因、续费或订单相关线索。仅在用户提供账号、工单或订单编号时调用。",
              actionType: "MCP_TOOL",
              config: {
                serverName: "ragent-demo",
                toolName: "ticket.account.query"
              },
              parameters: {
                accountId: "账号编号，例如 A10001",
                ticketId: "工单编号，可选",
                orderId: "订单编号，可选"
              }
            }
          ]
        }
      },
      {
        nodeKey: "evaluatePlanExecuteAnswer",
        nodeName: "评估计划执行结果",
        nodeType: "EVALUATOR",
        nodeOrder: 2,
        config: {
          evaluatorType: "RULE",
          targetNodeKey: "planExecute",
          requiredFields: ["strategyType", "plan", "execution", "answer"],
          minLength: 20,
          maxReflectionRounds: 0,
          retryNodeKey: "planExecute"
        }
      },
      {
        nodeKey: "planExecuteSummary",
        nodeName: "总结计划执行返回",
        nodeType: "ACTION",
        actionType: "PLAN_EXECUTE_SUMMARY",
        nodeOrder: 3,
        config: {
          sourceNodeKey: "planExecute"
        }
      },
      { nodeKey: "end", nodeName: "结束", nodeType: "END", nodeOrder: 4, config: {} }
    ],
    edges: [
      {
        sourceNodeKey: "planExecute",
        targetNodeKey: "evaluatePlanExecuteAnswer",
        edgeType: "DEFAULT",
        priority: 1
      },
      {
        sourceNodeKey: "evaluatePlanExecuteAnswer",
        targetNodeKey: "planExecuteSummary",
        edgeType: "DEFAULT",
        priority: 1
      },
      {
        sourceNodeKey: "planExecuteSummary",
        targetNodeKey: "end",
        edgeType: "DEFAULT",
        priority: 1
      }
    ]
  };
}

export function buildLayeredMemoryDemoWorkflow(): AgentWorkflowCreatePayload {
  return {
    name: `Workflow 任务级记忆演示 ${new Date().toLocaleTimeString("zh-CN", { hour12: false })}`,
    description: "用于前端验证 FlowHarness、Evaluator 和 LAYERED 任务级记忆的演示流程",
    workflowType: "stage5_layered_memory_ui",
    harnessType: "FLOW",
    status: "ENABLED",
    config: {
      memoryEnabled: true,
      memoryStrategyType: "LAYERED",
      memorySummaryInterval: 2
    },
    inputSchema: {
      type: "object",
      properties: {
        ticketId: { type: "string" },
        content: { type: "string" }
      }
    },
    outputSchema: {
      type: "object"
    },
    nodes: [
      {
        nodeKey: "prepareContext",
        nodeName: "准备上下文",
        nodeType: "ACTION",
        actionType: "NOOP",
        nodeOrder: 1,
        config: {}
      },
      {
        nodeKey: "generateSolution",
        nodeName: "生成处理方案",
        nodeType: "ACTION",
        actionType: "NOOP",
        nodeOrder: 2,
        config: {}
      },
      {
        nodeKey: "evaluateSolution",
        nodeName: "验收处理方案",
        nodeType: "EVALUATOR",
        nodeOrder: 3,
        config: {
          evaluatorType: "RULE",
          targetNodeKey: "generateSolution",
          requiredFields: ["message", "nodeKey"],
          minLength: 20,
          maxReflectionRounds: 0,
          retryNodeKey: "generateSolution"
        }
      },
      {
        nodeKey: "end",
        nodeName: "结束",
        nodeType: "END",
        nodeOrder: 4,
        config: {}
      }
    ],
    edges: [
      {
        sourceNodeKey: "prepareContext",
        targetNodeKey: "generateSolution",
        edgeType: "DEFAULT",
        priority: 1
      },
      {
        sourceNodeKey: "generateSolution",
        targetNodeKey: "evaluateSolution",
        edgeType: "DEFAULT",
        priority: 1
      },
      {
        sourceNodeKey: "evaluateSolution",
        targetNodeKey: "end",
        edgeType: "DEFAULT",
        priority: 1
      }
    ]
  };
}
