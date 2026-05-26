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
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
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
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/**
 * 默认Pipeline策略，兼容原Action执行模型
 */
@Component
@RequiredArgsConstructor
public class PipelineNodeExecutionStrategy implements NodeExecutionStrategy {

    private final AgentActionExecutorRegistry executorRegistry;

    @Override
    public String strategyType() {
        return NodeExecutionStrategyType.PIPELINE.name();
    }

    @Override
    public ActionResult execute(NodeExecutionContext context) {
        AgentWorkflowInstanceDO instance = context.getInstance();
        AgentWorkflowNodeDO node = context.getNode();
        String actionType = StringUtils.hasText(node.getActionType()) ? node.getActionType() : ActionType.NOOP.name();
        AgentActionExecutor executor = executorRegistry.getRequired(actionType);
        return executor.execute(ActionContext.builder()
                        .instanceId(instance.getId())
                        .workflowId(instance.getWorkflowId())
                        .nodeKey(node.getNodeKey())
                        .input(asObject(context.getOriginalInput()))
                        .context(context.getWorkflowContext())
                        .build(),
                ActionConfig.builder()
                        .actionType(actionType)
                        .config(context.getNodeConfig())
                        .inputMapping(parseObjectField(context.getNodeConfig(), "inputMapping"))
                        .outputMapping(parseObjectField(context.getNodeConfig(), "outputMapping"))
                        .build());
    }

    private ObjectNode asObject(JsonNode node) {
        return node != null && node.isObject() ? (ObjectNode) node : JsonNodeFactory.instance.objectNode();
    }

    private JsonNode parseObjectField(JsonNode config, String field) {
        JsonNode value = config == null ? null : config.path(field);
        return value == null || value.isMissingNode() || value.isNull() ? null : value;
    }
}
