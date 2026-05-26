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
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;

/**
 * ReAct节点执行策略
 */
@Component
@RequiredArgsConstructor
public class ReActNodeExecutionStrategy implements NodeExecutionStrategy {

    private static final int DEFAULT_MAX_ITERATIONS = 5;
    private static final int DEFAULT_MAX_TOKENS = 1024;
    private static final double DEFAULT_TEMPERATURE = 0.2D;

    private final LLMService llmService;
    private final AgentActionExecutorRegistry executorRegistry;
    private final ObjectMapper objectMapper;

    @Override
    public String strategyType() {
        return NodeExecutionStrategyType.REACT.name();
    }

    @Override
    public ActionResult execute(NodeExecutionContext context) {
        JsonNode config = context.getNodeConfig();
        int maxIterations = config.path("maxIterations").asInt(DEFAULT_MAX_ITERATIONS);
        List<ChatMessage> messages = new ArrayList<>();
        messages.add(ChatMessage.system(buildSystemPrompt(config)));
        messages.add(ChatMessage.user(buildUserPrompt(context)));

        ArrayNode steps = objectMapper.createArrayNode();
        for (int i = 1; i <= maxIterations; i++) {
            String response = llmService.chat(buildChatRequest(config, messages), config.path("modelId").asText(null));
            JsonNode decision = parseDecision(response);
            ObjectNode step = objectMapper.createObjectNode();
            step.put("iteration", i);
            step.set("decision", decision);

            String type = decision.path("type").asText(null);
            if ("final".equalsIgnoreCase(type)) {
                ObjectNode finalOutput = objectMapper.createObjectNode();
                finalOutput.put("strategyType", strategyType());
                finalOutput.set("answer", decision.path("answer").isMissingNode() ? decision.path("output") : decision.path("answer"));
                steps.add(step);
                finalOutput.set("steps", steps);
                return ActionResult.success(finalOutput, buildMetadata(context, maxIterations, i, true));
            }
            if (!"action".equalsIgnoreCase(type)) {
                steps.add(step);
                return ActionResult.fail("ReAct输出类型非法: " + type, buildFailureMetadata(steps));
            }

            ToolDescriptor tool = resolveTool(config, decision.path("tool").asText(null));
            ActionResult toolResult = executeTool(context, tool, decision.path("parameters"));
            step.set("toolResult", objectMapper.valueToTree(toolResult));
            steps.add(step);
            if (!toolResult.isSuccess()) {
                return ActionResult.fail(toolResult.getErrorMessage(), buildFailureMetadata(steps));
            }
            messages.add(ChatMessage.assistant(decision.toString()));
            messages.add(ChatMessage.user(buildObservationPrompt(tool, toolResult)));
        }
        ObjectNode timeoutOutput = objectMapper.createObjectNode();
        timeoutOutput.put("reason", "ReAct达到最大迭代次数仍未产生final输出");
        timeoutOutput.set("steps", steps);
        return ActionResult.fail("ReAct执行未收敛", timeoutOutput);
    }

    private ChatRequest buildChatRequest(JsonNode config, List<ChatMessage> messages) {
        Double temperature = config.hasNonNull("temperature") ? config.path("temperature").asDouble() : DEFAULT_TEMPERATURE;
        Integer maxTokens = config.hasNonNull("maxTokens") ? config.path("maxTokens").asInt() : DEFAULT_MAX_TOKENS;
        return ChatRequest.builder()
                .messages(messages)
                .temperature(temperature)
                .maxTokens(maxTokens)
                .thinking(config.path("thinking").asBoolean(false))
                .build();
    }

    private String buildSystemPrompt(JsonNode config) {
        String custom = config.path("systemPrompt").asText(null);
        String rules = "你是Workflow节点内部的ReAct执行策略。你必须只输出一个JSON对象，不要输出Markdown。"
                + "如果需要调用工具，输出：{\"type\":\"action\",\"thought\":\"你的简短判断\",\"tool\":\"工具名\",\"parameters\":{}}。"
                + "如果已经得到最终答案，输出：{\"type\":\"final\",\"answer\":{}}。"
                + "不要调用未列出的工具，不要编造工具返回结果。";
        return StringUtils.hasText(custom) ? custom + "\n" + rules : rules;
    }

    private String buildUserPrompt(NodeExecutionContext context) {
        JsonNode config = context.getNodeConfig();
        String taskPrompt = config.path("taskPrompt").asText(null);
        StringBuilder prompt = new StringBuilder();
        if (StringUtils.hasText(taskPrompt)) {
            prompt.append(taskPrompt).append("\n\n");
        }
        prompt.append("当前节点：").append(context.getNode().getNodeKey()).append("\n");
        prompt.append("原始输入：").append(toJson(context.getOriginalInput())).append("\n");
        prompt.append("工作流上下文：").append(toJson(context.getWorkflowContext())).append("\n");
        prompt.append("可用工具：").append(describeTools(config)).append("\n");
        prompt.append("请按ReAct格式选择下一步action或final。");
        return prompt.toString();
    }

    private String buildObservationPrompt(ToolDescriptor tool, ActionResult result) {
        ObjectNode observation = objectMapper.createObjectNode();
        observation.put("tool", tool.name());
        observation.set("result", objectMapper.valueToTree(result));
        return "工具观察结果：" + observation + "\n请继续输出下一个JSON对象。";
    }

    private JsonNode parseDecision(String response) {
        try {
            String cleaned = LLMResponseCleaner.stripMarkdownCodeFence(response);
            return objectMapper.readTree(cleaned);
        } catch (Exception ex) {
            throw new ClientException("ReAct模型输出不是合法JSON: " + response);
        }
    }

    private ToolDescriptor resolveTool(JsonNode config, String toolName) {
        if (!StringUtils.hasText(toolName)) {
            throw new ClientException("ReAct action缺少tool字段");
        }
        JsonNode tools = config.path("allowedTools");
        if (tools.isArray()) {
            for (JsonNode tool : tools) {
                if (toolName.equals(tool.path("name").asText(null))) {
                    String actionType = tool.path("actionType").asText(ActionType.MCP_TOOL.name());
                    JsonNode toolConfig = tool.path("config");
                    ObjectNode configNode = toolConfig.isObject() ? (ObjectNode) toolConfig : objectMapper.createObjectNode();
                    return new ToolDescriptor(toolName, actionType, configNode);
                }
            }
        }
        throw new ClientException("ReAct工具未授权: " + toolName);
    }

    private ActionResult executeTool(NodeExecutionContext context, ToolDescriptor tool, JsonNode parameters) {
        AgentWorkflowInstanceDO instance = context.getInstance();
        AgentWorkflowNodeDO node = context.getNode();
        AgentActionExecutor executor = executorRegistry.getRequired(tool.actionType());
        ObjectNode mergedConfig = tool.config().deepCopy();
        if (parameters != null && parameters.isObject()) {
            mergedConfig.set("parameters", parameters);
        }
        return executor.execute(ActionContext.builder()
                        .instanceId(instance.getId())
                        .workflowId(instance.getWorkflowId())
                        .nodeKey(node.getNodeKey())
                        .input(asObject(context.getOriginalInput()))
                        .context(context.getWorkflowContext())
                        .build(),
                ActionConfig.builder()
                        .actionType(tool.actionType())
                        .config(mergedConfig)
                        .build());
    }

    private JsonNode describeTools(JsonNode config) {
        ArrayNode descriptions = objectMapper.createArrayNode();
        JsonNode tools = config.path("allowedTools");
        if (!tools.isArray()) {
            return descriptions;
        }
        for (JsonNode tool : tools) {
            ObjectNode item = objectMapper.createObjectNode();
            item.put("name", tool.path("name").asText(""));
            item.put("description", tool.path("description").asText(""));
            JsonNode parameterSchema = tool.path("parameters");
            if (!parameterSchema.isMissingNode()) {
                item.set("parameters", parameterSchema);
            }
            descriptions.add(item);
        }
        return descriptions;
    }

    private ObjectNode buildMetadata(NodeExecutionContext context, int maxIterations, int usedIterations, boolean converged) {
        ObjectNode metadata = objectMapper.createObjectNode();
        metadata.put("strategyType", strategyType());
        metadata.put("nodeKey", context.getNode().getNodeKey());
        metadata.put("maxIterations", maxIterations);
        metadata.put("usedIterations", usedIterations);
        metadata.put("converged", converged);
        return metadata;
    }

    private JsonNode buildFailureMetadata(JsonNode steps) {
        ObjectNode metadata = objectMapper.createObjectNode();
        metadata.put("strategyType", strategyType());
        metadata.set("steps", steps);
        return metadata;
    }

    private ObjectNode asObject(JsonNode node) {
        return node != null && node.isObject() ? (ObjectNode) node : objectMapper.createObjectNode();
    }

    private String toJson(JsonNode node) {
        return node == null || node.isNull() ? "{}" : node.toString();
    }

    private record ToolDescriptor(String name, String actionType, ObjectNode config) {
    }
}
