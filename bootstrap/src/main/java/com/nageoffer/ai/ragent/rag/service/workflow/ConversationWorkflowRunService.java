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

import com.fasterxml.jackson.databind.JsonNode;
import com.nageoffer.ai.ragent.agent.workflow.controller.vo.AgentWorkflowInstanceVO;
import com.nageoffer.ai.ragent.agent.workflow.controller.vo.AgentWorkflowVO;
import com.nageoffer.ai.ragent.rag.dao.entity.ConversationWorkflowRunDO;

/**
 * 会话内Workflow运行结果记忆服务
 */
public interface ConversationWorkflowRunService {

    ConversationWorkflowRunDO findLatest(String conversationId, String userId, String workflowType);

    void record(String conversationId,
                String userId,
                AgentWorkflowVO workflow,
                AgentWorkflowInstanceVO instance,
                JsonNode input,
                JsonNode entities,
                String summary);
}
