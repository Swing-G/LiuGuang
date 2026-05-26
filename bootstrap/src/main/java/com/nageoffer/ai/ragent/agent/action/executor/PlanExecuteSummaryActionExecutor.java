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

package com.nageoffer.ai.ragent.agent.action.executor;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.nageoffer.ai.ragent.agent.action.domain.ActionConfig;
import com.nageoffer.ai.ragent.agent.action.domain.ActionContext;
import com.nageoffer.ai.ragent.agent.action.domain.ActionResult;
import com.nageoffer.ai.ragent.agent.action.enums.ActionType;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/**
 * Plan-and-Execute 最终答案整理动作执行器
 */
@Component
@RequiredArgsConstructor
public class PlanExecuteSummaryActionExecutor implements AgentActionExecutor {

    private final ObjectMapper objectMapper;

    @Override
    public String actionType() {
        return ActionType.PLAN_EXECUTE_SUMMARY.name();
    }

    @Override
    public ActionResult execute(ActionContext context, ActionConfig config) {
        String sourceNodeKey = config.getConfig() == null ? "planExecute" : config.getConfig().path("sourceNodeKey").asText("planExecute");
        JsonNode source = context.getContext() == null ? null : context.getContext().path(sourceNodeKey);
        if (source == null || source.isMissingNode() || source.isNull()) {
            return ActionResult.fail("缺少 Plan-and-Execute 节点输出: " + sourceNodeKey);
        }
        JsonNode answer = source.path("answer");
        if (answer.isMissingNode() || answer.isNull() || answer.isEmpty()) {
            answer = source.path("execution").path("answer");
        }
        if (answer.isMissingNode() || answer.isNull() || answer.isEmpty()) {
            answer = source.path("execution");
        }
        ObjectNode output = objectMapper.createObjectNode();
        output.put("ticketId", text(answer, "ticketId", text(context.getInput(), "ticketId", "PLAN-EXECUTE-DEMO")));
        output.put("accountId", text(answer, "accountId", text(context.getInput(), "accountId", "PLAN-EXECUTE-DEMO")));
        output.put("customerName", text(answer, "customerName", "Plan-and-Execute 推理对象"));
        output.put("subject", text(answer, "subject", text(context.getInput(), "question", text(context.getInput(), "content", "Plan-and-Execute 工作流任务"))));
        output.put("riskLevel", text(answer, "riskLevel", text(answer, "priority", "MEDIUM")));
        output.put("rootCause", firstText(answer, "rootCause", "analysis", "reason", "已完成计划和执行，但未输出明确原因。"));
        output.put("currentState", firstText(answer, "currentState", "state", "status", "Plan-and-Execute 节点已完成规划与执行。"));
        output.put("latestNote", "该结果来自单个 Plan-and-Execute 节点的规划和执行结果。" );
        output.put("suggestion", firstText(answer, "suggestion", "plan", "nextStep", "建议按执行结果继续处理，并保留复核记录。"));
        output.put("customerReply", firstText(answer, "customerReply", "reply", "finalReply", "已完成计划和执行分析，建议按当前结论继续处理。"));
        output.set("plan", source.path("plan"));
        output.set("execution", source.path("execution"));
        output.set("planExecuteSteps", source.path("steps").isMissingNode() ? objectMapper.createArrayNode() : source.path("steps"));
        return ActionResult.success(output);
    }

    private String firstText(JsonNode node, String fieldA, String fieldB, String fieldC, String defaultValue) {
        String value = text(node, fieldA, null);
        if (StringUtils.hasText(value)) {
            return value;
        }
        value = text(node, fieldB, null);
        if (StringUtils.hasText(value)) {
            return value;
        }
        value = text(node, fieldC, null);
        return StringUtils.hasText(value) ? value : defaultValue;
    }

    private String text(JsonNode node, String field, String defaultValue) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return defaultValue;
        }
        String value = node.path(field).asText(null);
        return StringUtils.hasText(value) ? value : defaultValue;
    }
}
