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

package com.nageoffer.ai.ragent.rag.service.workflow;

import cn.hutool.core.util.IdUtil;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.nageoffer.ai.ragent.agent.workflow.controller.request.AgentWorkflowRunRequest;
import com.nageoffer.ai.ragent.agent.workflow.controller.vo.AgentWorkflowInstanceVO;
import com.nageoffer.ai.ragent.agent.workflow.controller.vo.AgentWorkflowVO;
import com.nageoffer.ai.ragent.agent.workflow.service.AgentWorkflowService;
import com.nageoffer.ai.ragent.framework.convention.ChatMessage;
import com.nageoffer.ai.ragent.framework.convention.ChatRequest;
import com.nageoffer.ai.ragent.infra.chat.LLMService;
import com.nageoffer.ai.ragent.infra.chat.StreamCallback;
import com.nageoffer.ai.ragent.rag.core.memory.ConversationMemoryService;
import com.nageoffer.ai.ragent.rag.dao.entity.ConversationWorkflowRunDO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 对话式Workflow路由器
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class WorkflowChatRouter {

    private static final String DEFAULT_WORKFLOW_TYPE = "ticket_triage_chat";
    private static final String TICKET_TRIAGE_WORKFLOW_TYPE = "ticket_triage_chat";
    private static final String TICKET_QUICK_TRIAGE_WORKFLOW_TYPE = "ticket_quick_triage_chat";
    private static final String CUSTOMER_SUCCESS_WORKFLOW_TYPE = "customer_success_followup_chat";
    private static final Pattern TICKET_ID_PATTERN = Pattern.compile("[Tt][-_]?[0-9]{6,}");
    private static final Pattern ACCOUNT_ID_PATTERN = Pattern.compile("[Aa][-_]?[0-9]{4,}");
    private static final Pattern ORDER_ID_PATTERN = Pattern.compile("(?i)(?:PAY|ORD|ORDER)[-_]?[0-9]{4,}");

    private final AgentWorkflowService workflowService;
    private final ConversationMemoryService memoryService;
    private final ConversationWorkflowRunService conversationWorkflowRunService;
    private final ObjectMapper objectMapper;
    private final LLMService llmService;

    public boolean handle(String question, String conversationId, String userId, String workflowType,
                          StreamCallback callback) {
        String selectedWorkflowType = resolveWorkflowType(workflowType);
        AgentWorkflowVO workflow = workflowService.findEnabledByType(selectedWorkflowType);
        if (workflow == null) {
            callback.onContent("当前未配置可用的 Flow。请先在 Workflow 管理页创建并启用 workflowType=" + selectedWorkflowType + " 的流程。");
            callback.onComplete();
            return true;
        }
        List<ChatMessage> history = memoryService.loadAndAppend(conversationId, userId, ChatMessage.user(question));
        return runOrAskForMoreInfo(question, conversationId, userId, callback, workflow, history);
    }

    public boolean tryHandle(String question, String conversationId, String userId, StreamCallback callback) {
        if (!matchTicketTriage(question)) {
            return false;
        }
        AgentWorkflowVO workflow = workflowService.findEnabledByType(TICKET_TRIAGE_WORKFLOW_TYPE);
        if (workflow == null) {
            log.info("未配置可用工单处理Workflow，回退普通RAG。workflowType={}", TICKET_TRIAGE_WORKFLOW_TYPE);
            return false;
        }
        List<ChatMessage> history = memoryService.loadAndAppend(conversationId, userId, ChatMessage.user(question));
        return runOrAskForMoreInfo(question, conversationId, userId, callback, workflow, history);
    }

    private String resolveWorkflowType(String workflowType) {
        if (!StringUtils.hasText(workflowType)) {
            return DEFAULT_WORKFLOW_TYPE;
        }
        String normalized = workflowType.trim();
        if (TICKET_TRIAGE_WORKFLOW_TYPE.equals(normalized)
                || TICKET_QUICK_TRIAGE_WORKFLOW_TYPE.equals(normalized)
                || CUSTOMER_SUCCESS_WORKFLOW_TYPE.equals(normalized)) {
            return normalized;
        }
        return DEFAULT_WORKFLOW_TYPE;
    }

    private boolean runOrAskForMoreInfo(String question, String conversationId, String userId, StreamCallback callback, AgentWorkflowVO workflow, List<ChatMessage> history) {
        ConversationWorkflowRunDO previousRun = conversationWorkflowRunService.findLatest(conversationId, userId, workflow.getWorkflowType());
        WorkflowIdentifiers identifiers = resolveIdentifiers(question, history, previousRun);
        boolean quickTriageFlow = TICKET_QUICK_TRIAGE_WORKFLOW_TYPE.equals(workflow.getWorkflowType());
        if (!identifiers.hasAnyLookupKey() && !quickTriageFlow) {
            completeWithAssistantMessage(conversationId, userId, callback, buildMissingInfoReply());
            return true;
        }
        try {
            ObjectNode input = buildInput(question, userId, identifiers, previousRun);
            AgentWorkflowRunRequest request = new AgentWorkflowRunRequest();
            request.setBusinessType("chat_ticket_triage");
            request.setBusinessId("chat-ticket-" + IdUtil.getSnowflakeNextIdStr());
            request.setInput(input);
            AgentWorkflowInstanceVO instance = workflowService.run(workflow.getId(), request);
            String reply = toNaturalLanguage(question, instance, previousRun);
            conversationWorkflowRunService.record(conversationId, userId, workflow, instance, input, buildEntities(identifiers), buildWorkflowRunSummary(instance, reply));
            completeWithAssistantMessage(conversationId, userId, callback, reply);
            return true;
        } catch (Exception ex) {
            log.error("对话式Workflow执行失败。workflowId={}", workflow.getId(), ex);
            completeWithAssistantMessage(conversationId, userId, callback, buildSafeFailureReply());
            return true;
        }
    }

    private boolean matchTicketTriage(String question) {
        if (!StringUtils.hasText(question)) return false;
        String normalized = question.toLowerCase(Locale.ROOT);
        return normalized.contains("workflow")
                || question.contains("工单")
                || question.contains("账户")
                || question.contains("账号")
                || question.contains("订单")
                || question.contains("续费")
                || question.contains("支付")
                || question.contains("投诉")
                || question.contains("客诉")
                || question.contains("处理建议")
                || question.contains("分诊");
    }

    private ObjectNode buildInput(String question, String userId, WorkflowIdentifiers identifiers, ConversationWorkflowRunDO previousRun) {
        ObjectNode input = objectMapper.createObjectNode();
        input.put("question", question);
        input.put("content", question);
        putIfPresent(input, "ticketId", identifiers.ticketId());
        putIfPresent(input, "accountId", identifiers.accountId());
        putIfPresent(input, "orderId", identifiers.orderId());
        if (previousRun != null) {
            ObjectNode previous = objectMapper.createObjectNode();
            putIfPresent(previous, "workflowInstanceId", previousRun.getWorkflowInstanceId());
            putIfPresent(previous, "summary", previousRun.getSummary());
            setJsonIfPresent(previous, "entities", previousRun.getEntitiesJson());
            setJsonIfPresent(previous, "output", previousRun.getOutputJson());
            setJsonIfPresent(previous, "context", previousRun.getContextJson());
            input.set("previousWorkflow", previous);
        }
        if (StringUtils.hasText(userId)) {
            input.put("operatorUserId", userId);
        }
        input.put("source", "chat");
        return input;
    }

    private WorkflowIdentifiers resolveIdentifiers(String question, List<ChatMessage> history, ConversationWorkflowRunDO previousRun) {
        String ticketId = extractFirst(TICKET_ID_PATTERN, question);
        String accountId = extractFirst(ACCOUNT_ID_PATTERN, question);
        String orderId = extractFirst(ORDER_ID_PATTERN, question);
        if (StringUtils.hasText(ticketId) || StringUtils.hasText(accountId) || StringUtils.hasText(orderId)) {
            return new WorkflowIdentifiers(ticketId, accountId, orderId);
        }
        WorkflowIdentifiers fromPreviousRun = resolveIdentifiersFromPreviousRun(previousRun);
        ticketId = firstNonBlank(ticketId, fromPreviousRun.ticketId());
        accountId = firstNonBlank(accountId, fromPreviousRun.accountId());
        orderId = firstNonBlank(orderId, fromPreviousRun.orderId());
        if (StringUtils.hasText(ticketId) || StringUtils.hasText(accountId) || StringUtils.hasText(orderId)) {
            return new WorkflowIdentifiers(ticketId, accountId, orderId);
        }
        if (history != null) {
            for (int i = history.size() - 1; i >= 0; i--) {
                ChatMessage message = history.get(i);
                if (message == null || message.getRole() != ChatMessage.Role.USER || !StringUtils.hasText(message.getContent())) {
                    continue;
                }
                String content = message.getContent();
                ticketId = firstNonBlank(ticketId, extractFirst(TICKET_ID_PATTERN, content));
                accountId = firstNonBlank(accountId, extractFirst(ACCOUNT_ID_PATTERN, content));
                orderId = firstNonBlank(orderId, extractFirst(ORDER_ID_PATTERN, content));
                if (StringUtils.hasText(ticketId) || StringUtils.hasText(accountId) || StringUtils.hasText(orderId)) {
                    return new WorkflowIdentifiers(ticketId, accountId, orderId);
                }
            }
        }
        return new WorkflowIdentifiers(null, null, null);
    }

    private WorkflowIdentifiers resolveIdentifiersFromPreviousRun(ConversationWorkflowRunDO previousRun) {
        if (previousRun == null) {
            return new WorkflowIdentifiers(null, null, null);
        }
        JsonNode entities = parseJson(previousRun.getEntitiesJson());
        JsonNode output = parseJson(previousRun.getOutputJson());
        JsonNode context = parseJson(previousRun.getContextJson());
        String ticketId = firstText(entities, output, context, "ticketId", "ticket_id");
        String accountId = firstText(entities, output, context, "accountId", "account_id");
        String orderId = firstText(entities, output, context, "orderId", "order_id");
        return new WorkflowIdentifiers(ticketId, accountId, orderId);
    }

    private String extractFirst(Pattern pattern, String text) {
        if (!StringUtils.hasText(text)) {
            return null;
        }
        Matcher matcher = pattern.matcher(text);
        if (!matcher.find()) {
            return null;
        }
        return matcher.group().toUpperCase(Locale.ROOT).replace("-", "").replace("_", "");
    }

    private String firstNonBlank(String current, String candidate) {
        return StringUtils.hasText(current) ? current : candidate;
    }

    private void putIfPresent(ObjectNode node, String field, String value) {
        if (StringUtils.hasText(value)) {
            node.put(field, value);
        }
    }

    private void setJsonIfPresent(ObjectNode node, String field, String rawJson) {
        JsonNode parsed = parseJson(rawJson);
        if (parsed != null && !parsed.isNull() && !parsed.isMissingNode()) {
            node.set(field, parsed);
        }
    }

    private JsonNode parseJson(String rawJson) {
        if (!StringUtils.hasText(rawJson)) {
            return null;
        }
        try {
            return objectMapper.readTree(rawJson);
        } catch (Exception ex) {
            log.warn("Workflow历史结果JSON解析失败，将跳过。", ex);
            return null;
        }
    }

    private String firstText(JsonNode first, JsonNode second, JsonNode third, String... fields) {
        for (String field : fields) {
            String value = textAt(first, field);
            if (StringUtils.hasText(value)) {
                return value;
            }
            value = textAt(second, field);
            if (StringUtils.hasText(value)) {
                return value;
            }
            value = textAt(third, field);
            if (StringUtils.hasText(value)) {
                return value;
            }
        }
        return null;
    }

    private String textAt(JsonNode node, String field) {
        if (node == null || node.isNull() || node.isMissingNode()) {
            return null;
        }
        String direct = node.path(field).asText(null);
        if (StringUtils.hasText(direct)) {
            return direct;
        }
        JsonNode analyzeAccountTicket = node.path("analyzeAccountTicket");
        if (!analyzeAccountTicket.isMissingNode()) {
            String nested = analyzeAccountTicket.path(field).asText(null);
            if (StringUtils.hasText(nested)) {
                return nested;
            }
        }
        JsonNode buildFollowupPlan = node.path("buildFollowupPlan");
        if (!buildFollowupPlan.isMissingNode()) {
            String nested = buildFollowupPlan.path(field).asText(null);
            if (StringUtils.hasText(nested)) {
                return nested;
            }
        }
        JsonNode triageTicket = node.path("triageTicket");
        if (!triageTicket.isMissingNode()) {
            String nested = triageTicket.path(field).asText(null);
            if (StringUtils.hasText(nested)) {
                return nested;
            }
        }
        JsonNode input = node.path("input");
        if (!input.isMissingNode()) {
            String nested = input.path(field).asText(null);
            if (StringUtils.hasText(nested)) {
                return nested;
            }
        }
        return null;
    }

    private ObjectNode buildEntities(WorkflowIdentifiers identifiers) {
        ObjectNode entities = objectMapper.createObjectNode();
        putIfPresent(entities, "ticketId", identifiers.ticketId());
        putIfPresent(entities, "accountId", identifiers.accountId());
        putIfPresent(entities, "orderId", identifiers.orderId());
        return entities;
    }

    private JsonNode primaryAnalysis(JsonNode context) {
        if (context == null || context.isNull() || context.isMissingNode()) {
            return null;
        }
        JsonNode analysis = context.path("analyzeAccountTicket");
        if (isPresentNode(analysis)) {
            return analysis;
        }
        analysis = context.path("buildFollowupPlan");
        if (isPresentNode(analysis)) {
            return analysis;
        }
        analysis = context.path("triageTicket");
        if (isPresentNode(analysis)) {
            return analysis;
        }
        return null;
    }

    private boolean isPresentNode(JsonNode node) {
        return node != null && !node.isMissingNode() && !node.isNull() && !node.isEmpty();
    }

    private String buildWorkflowRunSummary(AgentWorkflowInstanceVO instance, String reply) {
        JsonNode context = instance == null ? null : instance.getContext();
        JsonNode analysis = context == null ? null : primaryAnalysis(context);
        if (analysis == null || analysis.isMissingNode() || analysis.isNull() || analysis.isEmpty()) {
            analysis = context == null ? null : context.path("triageTicket");
        }
        if (analysis != null && !analysis.isMissingNode() && !analysis.isNull()) {
            String accountId = analysis.path("accountId").asText(null);
            String ticketId = analysis.path("ticketId").asText(null);
            String riskLevel = analysis.path("riskLevel").asText(null);
            String rootCause = analysis.path("rootCause").asText(null);
            String suggestion = analysis.path("suggestion").asText(null);
            return "账号=" + defaultText(accountId) + "，工单=" + defaultText(ticketId)
                    + "，风险等级=" + defaultText(riskLevel)
                    + "，原因=" + defaultText(rootCause)
                    + "，建议=" + defaultText(suggestion);
        }
        return StringUtils.hasText(reply) ? reply : null;
    }

    private String defaultText(String value) {
        return StringUtils.hasText(value) ? value : "-";
    }

    private String buildMissingInfoReply() {
        return "我可以帮你查询并分析工单、账号或订单状态。请补充至少一个可查询编号，例如：\n\n"
                + "- 工单编号：T20260520001\n"
                + "- 账号编号：A10001\n"
                + "- 订单编号：PAY10001\n\n"
                + "你也可以直接说：查一下账号 A10001 的续费失败原因。";
    }

    private String buildSafeFailureReply() {
        return "工单处理 Workflow 暂时无法完成查询。请稍后重试，或确认工单编号、账号编号、订单编号是否正确后再发起查询。";
    }

    private void completeWithAssistantMessage(String conversationId, String userId, StreamCallback callback, String content) {
        callback.onContent(content);
        callback.onComplete();
    }

    private String toNaturalLanguage(String question, AgentWorkflowInstanceVO instance, ConversationWorkflowRunDO previousRun) {
        ObjectNode context = instance.getContext() != null && instance.getContext().isObject()
                ? (ObjectNode) instance.getContext()
                : objectMapper.createObjectNode();
        JsonNode analysis = primaryAnalysis(context);
        if (!isValidAnalysis(analysis)) {
            return buildInvalidAnalysisReply(context);
        }
        String fallbackReply = buildCustomerFacingReply(analysis);
        return polishWorkflowReply(question, analysis, fallbackReply, previousRun);
    }

    private String polishWorkflowReply(String question, JsonNode analysis, String fallbackReply, ConversationWorkflowRunDO previousRun) {
        try {
            String analysisJson = objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(analysis);
            String previousText = buildPreviousWorkflowPrompt(previousRun);
            ChatRequest request = ChatRequest.builder()
                    .messages(List.of(
                            ChatMessage.system(buildWorkflowReplyPolishSystemPrompt()),
                            ChatMessage.user(buildWorkflowReplyPolishUserPrompt(question, analysisJson, fallbackReply, previousText))
                    ))
                    .temperature(0.2)
                    .maxTokens(700)
                    .build();
            String reply = llmService.chat(request);
            return StringUtils.hasText(reply) ? reply.trim() : fallbackReply;
        } catch (Exception ex) {
            log.warn("Workflow结果大模型整合失败，使用规则模板兜底。", ex);
            return fallbackReply;
        }
    }

    private String buildWorkflowReplyPolishSystemPrompt() {
        return "你是一名专业、克制、像真人一样沟通的企业售后客服。"
                + "你的任务是把工作流查询到的结构化结果改写成自然、可直接发送给客户的中文回复。"
                + "要求："
                + "1. 只基于给定事实回答，不编造新的金额、编号、承诺或处理结果；"
                + "2. 不要暴露工作流、节点、JSON、字段名、模型推理过程；"
                + "3. 不要机械罗列‘当前判断/建议动作/补充说明’等字段名，改成顺畅口语；"
                + "4. 先说明已经核实到的关键原因，再给出下一步处理建议；"
                + "5. 语气像真人客服，简洁、负责、有安抚感，但不要夸张道歉；"
                + "6. 如果有高优先级、售后支持、人工续期、回访记录等事实，可以自然合并进一句话；"
                + "7. 输出最终回复正文即可，不要添加标题、项目符号或多余解释。";
    }

    private String buildWorkflowReplyPolishUserPrompt(String question, String analysisJson, String fallbackReply, String previousText) {
        return "用户问题：\n" + question + "\n\n"
                + previousText
                + "工作流结构化结果：\n" + analysisJson + "\n\n"
                + "规则兜底回复（仅供参考，不要照抄这种机械结构）：\n" + fallbackReply + "\n\n"
                + "请将以上信息整合成一段自然的客服回复。";
    }

    private String buildPreviousWorkflowPrompt(ConversationWorkflowRunDO previousRun) {
        if (previousRun == null || !StringUtils.hasText(previousRun.getSummary())) {
            return "";
        }
        return "上一轮Workflow结果摘要（用于理解连续追问；若与本轮查询结果冲突，以本轮为准）：\n"
                + previousRun.getSummary().trim() + "\n\n";
    }

    private String buildCustomerFacingReply(JsonNode analysis) {
        String customerName = analysis.path("customerName").asText("您好");
        String rootCause = analysis.path("rootCause").asText("");
        String suggestion = analysis.path("suggestion").asText("建议继续补充信息后由人工跟进。");
        String latestNote = analysis.path("latestNote").asText("");
        String customerReply = analysis.path("customerReply").asText("");

        StringBuilder reply = new StringBuilder();
        reply.append("已完成核实。\n\n");
        if (StringUtils.hasText(customerReply)) {
            reply.append(customerReply);
        } else {
            reply.append(customerName).append("，我们已核实账号与工单状态。");
            if (StringUtils.hasText(rootCause)) {
                reply.append("本次问题主要是：").append(rootCause).append("。");
            }
            reply.append(suggestion);
        }
        if (StringUtils.hasText(latestNote)) {
            reply.append("\n\n补充说明：").append(latestNote);
        }
        return reply.toString();
    }

    private boolean isValidAnalysis(JsonNode analysis) {
        if (analysis == null || analysis.isMissingNode() || analysis.isNull() || analysis.isEmpty()) {
            return false;
        }
        boolean hasIdentity = StringUtils.hasText(analysis.path("ticketId").asText(null))
                || StringUtils.hasText(analysis.path("accountId").asText(null));
        boolean hasBusinessResult = StringUtils.hasText(analysis.path("currentState").asText(null))
                || StringUtils.hasText(analysis.path("rootCause").asText(null))
                || StringUtils.hasText(analysis.path("customerReply").asText(null));
        return hasIdentity && hasBusinessResult;
    }

    private String buildInvalidAnalysisReply(ObjectNode context) {
        JsonNode queryResult = context.path("queryAccountTicket");
        String error = queryResult.path("errorMessage").asText(null);
        if (!StringUtils.hasText(error)) {
            error = queryResult.path("structuredContent").path("error").asText(null);
        }
        if (!StringUtils.hasText(error)) {
            error = queryResult.path("metadata").path("error").asText(null);
        }
        String hint = StringUtils.hasText(error) ? "原因：" + error : "没有拿到有效的账号、工单或订单查询结果。";
        return "暂时无法完成查询分析，" + hint + "\n\n请确认编号是否正确，或补充工单编号、账号编号、订单编号中的至少一个后再试。";
    }

    private record WorkflowIdentifiers(String ticketId, String accountId, String orderId) {

        private boolean hasAnyLookupKey() {
            return StringUtils.hasText(ticketId) || StringUtils.hasText(accountId) || StringUtils.hasText(orderId);
        }
    }
}
