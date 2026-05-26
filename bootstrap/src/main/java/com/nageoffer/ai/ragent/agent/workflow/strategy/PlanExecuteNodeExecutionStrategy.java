/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package com.nageoffer.ai.ragent.agent.workflow.strategy;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.nageoffer.ai.ragent.agent.action.domain.ActionConfig;
import com.nageoffer.ai.ragent.agent.action.domain.ActionContext;
import com.nageoffer.ai.ragent.agent.action.domain.ActionResult;
import com.nageoffer.ai.ragent.agent.action.enums.ActionType;
import com.nageoffer.ai.ragent.agent.action.executor.AgentActionExecutor;
import com.nageoffer.ai.ragent.agent.action.executor.AgentActionExecutorRegistry;
import com.nageoffer.ai.ragent.agent.workflow.dao.entity.AgentWorkflowInstanceDO;
import com.nageoffer.ai.ragent.agent.workflow.dao.entity.AgentWorkflowNodeDO;
import com.nageoffer.ai.ragent.agent.workflow.enums.NodeExecutionStrategyType;
import com.nageoffer.ai.ragent.framework.convention.ChatMessage;
import com.nageoffer.ai.ragent.framework.convention.ChatRequest;
import com.nageoffer.ai.ragent.framework.exception.ClientException;
import com.nageoffer.ai.ragent.infra.chat.LLMService;
import com.nageoffer.ai.ragent.infra.util.LLMResponseCleaner;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.List;

/**
 * Plan-and-Execute节点执行策略
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PlanExecuteNodeExecutionStrategy implements NodeExecutionStrategy {

    private static final int DEFAULT_MAX_STEPS = 5;
    private static final int DEFAULT_MAX_TOKENS = 1200;
    private static final double DEFAULT_TEMPERATURE = 0.2D;

    private final LLMService llmService;
    private final AgentActionExecutorRegistry executorRegistry;
    private final ObjectMapper objectMapper;

    @Override
    public String strategyType() {
        return NodeExecutionStrategyType.PLAN_EXECUTE.name();
    }

    @Override
    public ActionResult execute(NodeExecutionContext context) {
        JsonNode config = context.getNodeConfig();
        JsonNode plan = callLlm(config, planSystem(config), planUser(context), "Plan-and-Execute规划阶段输出不是合法JSON");
        log.info("Plan-and-Execute规划完成, instanceId={}, nodeKey={}, plan={}", context.getInstance().getId(), context.getNode().getNodeKey(), plan);
        ArrayNode executedSteps = executeSteps(context, config, plan);
        JsonNode execution = callLlm(config, finalSystem(config), finalUser(context, plan, executedSteps), "Plan-and-Execute总结阶段输出不是合法JSON");
        log.info("Plan-and-Execute总结完成, instanceId={}, nodeKey={}, execution={}", context.getInstance().getId(), context.getNode().getNodeKey(), execution);
        ObjectNode output = objectMapper.createObjectNode();
        output.put("strategyType", strategyType());
        output.set("plan", plan);
        output.set("execution", execution);
        output.set("answer", execution.path("answer").isMissingNode() ? execution : execution.path("answer"));
        output.set("steps", steps(plan, executedSteps, execution));
        return ActionResult.success(output, metadata(context, executedSteps.size()));
    }

    private ArrayNode executeSteps(NodeExecutionContext context, JsonNode config, JsonNode plan) {
        ArrayNode results = objectMapper.createArrayNode();
        JsonNode plannedSteps = plan.path("steps");
        if (!plannedSteps.isArray()) {
            return results;
        }
        int count = 0;
        int maxSteps = Math.max(1, config.path("maxSteps").asInt(DEFAULT_MAX_STEPS));
        for (JsonNode step : plannedSteps) {
            if (count >= maxSteps) {
                break;
            }
            ObjectNode stepResult = objectMapper.createObjectNode();
            stepResult.set("step", step);
            String toolHint = step.path("toolHint").asText(null);
            if (StringUtils.hasText(toolHint) && !"none".equalsIgnoreCase(toolHint) && hasTool(config, toolHint)) {
                ActionResult toolResult = executeTool(context, resolveTool(config, toolHint), buildToolParameters(context, step));
                stepResult.set("decision", objectMapper.createObjectNode().put("type", "tool").put("tool", toolHint).set("parameters", buildToolParameters(context, step)));
                stepResult.set("toolResult", objectMapper.valueToTree(toolResult));
                stepResult.put("status", toolResult.isSuccess() ? "SUCCESS" : "FAILED");
                if (toolResult.isSuccess()) {
                    stepResult.set("result", toolResult.getOutput());
                } else {
                    stepResult.put("result", toolResult.getErrorMessage());
                }
                log.info("Plan-and-Execute步骤按toolHint执行工具, instanceId={}, nodeKey={}, step={}, tool={}, success={}",
                        context.getInstance().getId(), context.getNode().getNodeKey(), step.path("id").asText("-"), toolHint, toolResult.isSuccess());
                results.add(stepResult);
                count++;
                continue;
            }
            JsonNode decision = callLlm(config, stepSystem(config), stepUser(context, plan, step, results), "Plan-and-Execute步骤执行输出不是合法JSON");
            log.info("Plan-and-Execute步骤决策完成, instanceId={}, nodeKey={}, step={}, decision={}",
                    context.getInstance().getId(), context.getNode().getNodeKey(), step.path("id").asText("-"), decision);
            stepResult.set("decision", decision);
            if ("tool".equalsIgnoreCase(decision.path("type").asText(null))) {
                ActionResult toolResult = executeTool(context, resolveTool(config, decision.path("tool").asText(null)), decision.path("parameters"));
                stepResult.set("toolResult", objectMapper.valueToTree(toolResult));
                stepResult.put("status", toolResult.isSuccess() ? "SUCCESS" : "FAILED");
                if (toolResult.isSuccess()) {
                    stepResult.set("result", toolResult.getOutput());
                } else {
                    stepResult.put("result", toolResult.getErrorMessage());
                }
            } else {
                stepResult.put("status", "SUCCESS");
                stepResult.set("result", decision.path("result").isMissingNode() ? decision : decision.path("result"));
            }
            results.add(stepResult);
            count++;
        }
        return results;
    }

    private JsonNode callLlm(JsonNode config, String system, String user, String error) {
        String response = llmService.chat(ChatRequest.builder()
                .messages(List.of(ChatMessage.system(system), ChatMessage.user(user)))
                .temperature(config.hasNonNull("temperature") ? config.path("temperature").asDouble() : DEFAULT_TEMPERATURE)
                .maxTokens(config.hasNonNull("maxTokens") ? config.path("maxTokens").asInt() : DEFAULT_MAX_TOKENS)
                .thinking(config.path("thinking").asBoolean(false))
                .build(), config.path("modelId").asText(null));
        try {
            return objectMapper.readTree(LLMResponseCleaner.stripMarkdownCodeFence(response));
        } catch (Exception ex) {
            throw new ClientException(error + ": " + response);
        }
    }

    private String planSystem(JsonNode config) {
        String custom = config.path("plannerPrompt").asText(null);
        String rules = "你是Workflow节点内部的Plan-and-Execute规划器。只输出JSON，不要Markdown。"
                + "输出格式：{\"goal\":\"目标\",\"steps\":[{\"id\":1,\"task\":\"步骤任务\",\"reason\":\"为什么需要\",\"toolHint\":\"none或工具名\"}],\"risks\":[\"风险\"]}。"
                + "必须把任务拆成多个可执行步骤；如果原始输入包含accountId、ticketId或orderId，且可用工具里存在queryAccountStatus，必须至少安排一个toolHint为queryAccountStatus的查询步骤；可用工具只写toolHint，不要在规划阶段执行。";
        return StringUtils.hasText(custom) ? custom + "\n" + rules : rules;
    }

    private String stepSystem(JsonNode config) {
        String custom = config.path("stepExecutorPrompt").asText(null);
        String rules = "你是Workflow节点内部的Plan-and-Execute步骤执行器。只输出JSON，不要Markdown。"
                + "需要工具时输出：{\"type\":\"tool\",\"tool\":\"工具名\",\"parameters\":{}}。"
                + "不需要工具时输出：{\"type\":\"result\",\"result\":{\"summary\":\"步骤结果\",\"evidence\":\"依据\"}}。"
                + "只能调用可用工具列表中的工具，不要编造工具结果。";
        return StringUtils.hasText(custom) ? custom + "\n" + rules : rules;
    }

    private String finalSystem(JsonNode config) {
        String custom = config.path("finalizerPrompt").asText(null);
        String rules = "你是Workflow节点内部的Plan-and-Execute总结器。只输出JSON，不要Markdown。"
                + "根据计划和步骤执行结果输出：{\"answer\":{\"rootCause\":\"...\",\"currentState\":\"...\",\"suggestion\":\"...\",\"customerReply\":\"...\",\"riskLevel\":\"LOW|MEDIUM|HIGH\"},\"executedSteps\":[{\"id\":1,\"result\":\"...\"}]}。"
                + "没有工具结果时，不要编造已查询事实。";
        return StringUtils.hasText(custom) ? custom + "\n" + rules : rules;
    }

    private String planUser(NodeExecutionContext context) {
        JsonNode config = context.getNodeConfig();
        String taskPrompt = config.path("taskPrompt").asText(null);
        return (StringUtils.hasText(taskPrompt) ? taskPrompt + "\n\n" : "")
                + "当前节点：" + context.getNode().getNodeKey() + "\n"
                + "原始输入：" + json(context.getOriginalInput()) + "\n"
                + "工作流上下文：" + json(context.getWorkflowContext()) + "\n"
                + "可用工具：" + describeTools(config) + "\n请先制定多步骤执行计划。";
    }

    private String stepUser(NodeExecutionContext context, JsonNode plan, JsonNode step, ArrayNode previousResults) {
        return "原始输入：" + json(context.getOriginalInput()) + "\n工作流上下文：" + json(context.getWorkflowContext())
                + "\n完整计划：" + json(plan) + "\n当前步骤：" + json(step)
                + "\n已执行步骤结果：" + json(previousResults)
                + "\n可用工具：" + describeTools(context.getNodeConfig()) + "\n请只执行当前步骤。";
    }

    private String finalUser(NodeExecutionContext context, JsonNode plan, ArrayNode executedSteps) {
        return "原始输入：" + json(context.getOriginalInput()) + "\n工作流上下文：" + json(context.getWorkflowContext())
                + "\n计划：" + json(plan) + "\n步骤执行结果：" + json(executedSteps) + "\n请综合生成最终JSON。";
    }

    private boolean hasTool(JsonNode config, String toolName) {
        for (JsonNode tool : config.path("allowedTools")) {
            if (toolName.equals(tool.path("name").asText(null))) {
                return true;
            }
        }
        return false;
    }

    private ObjectNode buildToolParameters(NodeExecutionContext context, JsonNode step) {
        ObjectNode parameters = objectMapper.createObjectNode();
        JsonNode input = context.getOriginalInput();
        copyIfPresent(parameters, input, "accountId");
        copyIfPresent(parameters, input, "ticketId");
        copyIfPresent(parameters, input, "orderId");
        parameters.put("stepId", step.path("id").asText(""));
        parameters.put("task", step.path("task").asText(""));
        return parameters;
    }

    private void copyIfPresent(ObjectNode target, JsonNode source, String field) {
        if (source != null && source.hasNonNull(field)) {
            target.set(field, source.path(field));
        }
    }

    private ToolDescriptor resolveTool(JsonNode config, String toolName) {
        if (!StringUtils.hasText(toolName)) {
            throw new ClientException("Plan-and-Execute步骤缺少tool字段");
        }
        for (JsonNode tool : config.path("allowedTools")) {
            if (toolName.equals(tool.path("name").asText(null))) {
                JsonNode toolConfig = tool.path("config");
                return new ToolDescriptor(toolName, tool.path("actionType").asText(ActionType.MCP_TOOL.name()),
                        toolConfig.isObject() ? (ObjectNode) toolConfig : objectMapper.createObjectNode());
            }
        }
        throw new ClientException("Plan-and-Execute工具未授权: " + toolName);
    }

    private ActionResult executeTool(NodeExecutionContext context, ToolDescriptor tool, JsonNode parameters) {
        AgentWorkflowInstanceDO instance = context.getInstance();
        AgentWorkflowNodeDO node = context.getNode();
        AgentActionExecutor executor = executorRegistry.getRequired(tool.actionType());
        ObjectNode mergedConfig = tool.config().deepCopy();
        if (parameters != null && parameters.isObject()) {
            mergedConfig.set("parameters", parameters);
        }
        return executor.execute(ActionContext.builder().instanceId(instance.getId()).workflowId(instance.getWorkflowId())
                .nodeKey(node.getNodeKey()).input(asObject(context.getOriginalInput())).context(context.getWorkflowContext()).build(),
                ActionConfig.builder().actionType(tool.actionType()).config(mergedConfig).build());
    }

    private JsonNode describeTools(JsonNode config) {
        ArrayNode descriptions = objectMapper.createArrayNode();
        for (JsonNode tool : config.path("allowedTools")) {
            ObjectNode item = objectMapper.createObjectNode();
            item.put("name", tool.path("name").asText(""));
            item.put("description", tool.path("description").asText(""));
            if (!tool.path("parameters").isMissingNode()) {
                item.set("parameters", tool.path("parameters"));
            }
            descriptions.add(item);
        }
        return descriptions;
    }

    private ArrayNode steps(JsonNode plan, ArrayNode executedSteps, JsonNode execution) {
        ArrayNode steps = objectMapper.createArrayNode();
        ObjectNode p = objectMapper.createObjectNode();
        p.put("phase", "PLAN");
        p.set("output", plan);
        steps.add(p);
        for (JsonNode executedStep : executedSteps) {
            ObjectNode e = objectMapper.createObjectNode();
            e.put("phase", "EXECUTE_STEP");
            e.set("output", executedStep);
            steps.add(e);
        }
        ObjectNode f = objectMapper.createObjectNode();
        f.put("phase", "FINALIZE");
        f.set("output", execution);
        steps.add(f);
        return steps;
    }

    private ObjectNode metadata(NodeExecutionContext context, int executedStepCount) {
        ObjectNode metadata = objectMapper.createObjectNode();
        metadata.put("strategyType", strategyType());
        metadata.put("nodeKey", context.getNode().getNodeKey());
        metadata.put("executedStepCount", executedStepCount);
        return metadata;
    }

    private ObjectNode asObject(JsonNode node) {
        return node != null && node.isObject() ? (ObjectNode) node : objectMapper.createObjectNode();
    }

    private String json(JsonNode node) {
        return node == null || node.isNull() ? "{}" : node.toString();
    }

    private record ToolDescriptor(String name, String actionType, ObjectNode config) {
    }
}
