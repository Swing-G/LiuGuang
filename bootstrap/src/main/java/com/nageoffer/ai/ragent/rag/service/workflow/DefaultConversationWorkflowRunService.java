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

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.databind.JsonNode;
import com.nageoffer.ai.ragent.agent.workflow.controller.vo.AgentWorkflowInstanceVO;
import com.nageoffer.ai.ragent.agent.workflow.controller.vo.AgentWorkflowVO;
import com.nageoffer.ai.ragent.rag.dao.entity.ConversationWorkflowRunDO;
import com.nageoffer.ai.ragent.rag.dao.mapper.ConversationWorkflowRunMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/**
 * 会话内Workflow运行结果记忆服务默认实现
 */
@Service
@RequiredArgsConstructor
public class DefaultConversationWorkflowRunService implements ConversationWorkflowRunService {

    private final ConversationWorkflowRunMapper conversationWorkflowRunMapper;

    @Override
    public ConversationWorkflowRunDO findLatest(String conversationId, String userId, String workflowType) {
        if (!StringUtils.hasText(conversationId) || !StringUtils.hasText(userId) || !StringUtils.hasText(workflowType)) {
            return null;
        }
        return conversationWorkflowRunMapper.selectOne(new LambdaQueryWrapper<ConversationWorkflowRunDO>()
                .eq(ConversationWorkflowRunDO::getConversationId, conversationId)
                .eq(ConversationWorkflowRunDO::getUserId, userId)
                .eq(ConversationWorkflowRunDO::getWorkflowType, workflowType)
                .eq(ConversationWorkflowRunDO::getDeleted, 0)
                .orderByDesc(ConversationWorkflowRunDO::getCreateTime)
                .last("LIMIT 1"));
    }

    @Override
    public void record(String conversationId,
                       String userId,
                       AgentWorkflowVO workflow,
                       AgentWorkflowInstanceVO instance,
                       JsonNode input,
                       JsonNode entities,
                       String summary) {
        if (!StringUtils.hasText(conversationId) || !StringUtils.hasText(userId) || workflow == null || instance == null) {
            return;
        }
        conversationWorkflowRunMapper.insert(ConversationWorkflowRunDO.builder()
                .conversationId(conversationId)
                .userId(userId)
                .workflowId(workflow.getId())
                .workflowType(workflow.getWorkflowType())
                .workflowInstanceId(instance.getId())
                .businessType(instance.getBusinessType())
                .businessId(instance.getBusinessId())
                .status(instance.getStatus())
                .entitiesJson(json(entities))
                .summary(summary)
                .inputJson(json(input))
                .outputJson(json(instance.getOutput()))
                .contextJson(json(instance.getContext()))
                .build());
    }

    private String json(JsonNode node) {
        return node == null || node.isNull() ? null : node.toString();
    }
}
