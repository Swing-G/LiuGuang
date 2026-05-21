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

package com.nageoffer.ai.ragent.agent.memory.core;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.nageoffer.ai.ragent.agent.memory.domain.WorkflowMemoryContext;
import com.nageoffer.ai.ragent.agent.memory.domain.WorkflowMemoryResult;
import com.nageoffer.ai.ragent.agent.memory.enums.WorkflowMemoryStrategyType;
import com.nageoffer.ai.ragent.agent.workflow.dao.entity.AgentWorkflowInstanceDO;
import com.nageoffer.ai.ragent.framework.exception.ClientException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;

/**
 * Workflow任务级记忆服务门面
 */
@Slf4j
@Service
public class WorkflowMemoryService {

    private static final int DEFAULT_SUMMARY_INTERVAL = 3;

    private final WorkflowMemoryStrategyRegistry strategyRegistry;
    private final ObjectMapper objectMapper;
    private final Executor memorySummaryExecutor;

    public WorkflowMemoryService(WorkflowMemoryStrategyRegistry strategyRegistry,
                                 ObjectMapper objectMapper,
                                 @Qualifier("memorySummaryExecutor") Executor memorySummaryExecutor) {
        this.strategyRegistry = strategyRegistry;
        this.objectMapper = objectMapper;
        this.memorySummaryExecutor = memorySummaryExecutor;
    }

    public void compressIfNeeded(AgentWorkflowInstanceDO instance, ObjectNode context, JsonNode input, JsonNode workflowConfig, String triggerNodeKey, int executedSteps) {
        if (!enabled(workflowConfig)) {
            return;
        }
        int interval = workflowConfig == null ? DEFAULT_SUMMARY_INTERVAL : workflowConfig.path("memorySummaryInterval").asInt(DEFAULT_SUMMARY_INTERVAL);
        if (interval <= 0 || executedSteps % interval != 0) {
            return;
        }
        scheduleCompression(instance, context, input, workflowConfig, triggerNodeKey, "Workflow任务记忆压缩");
    }

    public void compressOnFinish(AgentWorkflowInstanceDO instance, ObjectNode context, JsonNode input, JsonNode workflowConfig, String triggerNodeKey) {
        if (!enabled(workflowConfig)) {
            return;
        }
        scheduleCompression(instance, context, input, workflowConfig, triggerNodeKey, "Workflow完成时任务记忆压缩");
    }

    private void scheduleCompression(AgentWorkflowInstanceDO instance,
                                     ObjectNode context,
                                     JsonNode input,
                                     JsonNode workflowConfig,
                                     String triggerNodeKey,
                                     String scene) {
        String strategyType = resolveStrategyType(workflowConfig);
        AgentWorkflowInstanceDO instanceSnapshot = copyInstance(instance);
        ObjectNode contextSnapshot = context == null ? objectMapper.createObjectNode() : context.deepCopy();
        JsonNode inputSnapshot = input == null ? objectMapper.nullNode() : input.deepCopy();
        CompletableFuture.runAsync(() -> doCompress(instanceSnapshot, contextSnapshot, inputSnapshot, strategyType, triggerNodeKey, scene), memorySummaryExecutor)
                .exceptionally(ex -> {
                    log.error("{}异步任务失败 - instanceId: {}, strategy: {}", scene, instanceSnapshot.getId(), strategyType, ex);
                    return null;
                });
    }

    private void doCompress(AgentWorkflowInstanceDO instance,
                            ObjectNode context,
                            JsonNode input,
                            String strategyType,
                            String triggerNodeKey,
                            String scene) {
        try {
            WorkflowMemoryStrategy strategy = strategyRegistry.getRequired(strategyType);
            WorkflowMemoryResult result = strategy.compress(WorkflowMemoryContext.builder()
                    .instance(instance)
                    .workflowContext(context)
                    .input(input)
                    .triggerNodeKey(triggerNodeKey)
                    .build());
            log.info("{}完成 - instanceId: {}, strategy: {}, compressed: {}, eventCount: {}",
                    scene, instance.getId(), strategyType, result.isCompressed(), result.getEventCount());
        } catch (Exception ex) {
            log.error("{}失败 - instanceId: {}, strategy: {}", scene, instance.getId(), strategyType, ex);
        }
    }

    private AgentWorkflowInstanceDO copyInstance(AgentWorkflowInstanceDO source) {
        return AgentWorkflowInstanceDO.builder()
                .id(source.getId())
                .workflowId(source.getWorkflowId())
                .workflowVersion(source.getWorkflowVersion())
                .harnessType(source.getHarnessType())
                .businessType(source.getBusinessType())
                .businessId(source.getBusinessId())
                .userId(source.getUserId())
                .status(source.getStatus())
                .inputJson(source.getInputJson())
                .contextJson(source.getContextJson())
                .outputJson(source.getOutputJson())
                .errorMessage(source.getErrorMessage())
                .currentNodeKey(source.getCurrentNodeKey())
                .startedAt(source.getStartedAt())
                .completedAt(source.getCompletedAt())
                .createTime(source.getCreateTime())
                .updateTime(source.getUpdateTime())
                .deleted(source.getDeleted())
                .build();
    }

    public JsonNode parseConfig(String raw) {
        if (!StringUtils.hasText(raw)) {
            return objectMapper.createObjectNode();
        }
        try {
            return objectMapper.readTree(raw);
        } catch (Exception ex) {
            throw new ClientException("Workflow配置JSON解析失败");
        }
    }

    private boolean enabled(JsonNode workflowConfig) {
        return workflowConfig == null || workflowConfig.path("memoryEnabled").asBoolean(true);
    }

    private String resolveStrategyType(JsonNode workflowConfig) {
        if (workflowConfig != null && StringUtils.hasText(workflowConfig.path("memoryStrategyType").asText(null))) {
            return workflowConfig.path("memoryStrategyType").asText();
        }
        return WorkflowMemoryStrategyType.LAYERED.name();
    }
}
