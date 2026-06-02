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

package com.nageoffer.ai.ragent.agent.multiagent.core;

import com.nageoffer.ai.ragent.agent.multiagent.dao.entity.AgentMemoryDO;
import com.nageoffer.ai.ragent.agent.multiagent.dao.mapper.AgentMemoryMapper;
import com.nageoffer.ai.ragent.infra.chat.LLMService;
import com.nageoffer.ai.ragent.infra.token.TokenCounterService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;
import java.util.stream.Collectors;

/**
 * Agent级对话记忆服务
 * <p>
 * 为每个Agent维护独立的对话历史，支持记忆摘要压缩。
 * 复用infra-ai层的TokenCounterService进行Token估算。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AgentMemoryService {

    private final AgentMemoryMapper memoryMapper;
    private final TokenCounterService tokenCounterService;
    private final LLMService llmService;
    private final Executor memorySummaryExecutor;

    private static final int MAX_HISTORY_TOKENS = 4000;

    /**
     * 保存消息
     */
    public void saveMessage(String instanceId, String nodeInstanceId, String agentKey,
                            int roundNumber, String role, String content) {
        int tokenCount = (int) tokenCounterService.countTokens(content);
        AgentMemoryDO memory = AgentMemoryDO.builder()
                .instanceId(instanceId)
                .nodeInstanceId(nodeInstanceId)
                .agentKey(agentKey)
                .roundNumber(roundNumber)
                .role(role)
                .content(content)
                .tokenCount(tokenCount)
                .importanceScore(50)
                .build();
        memoryMapper.insert(memory);
    }

    /**
     * 获取Agent的对话历史
     */
    public List<AgentMemoryDO> getHistory(String nodeInstanceId, String agentKey) {
        return memoryMapper.selectByNodeAndAgent(nodeInstanceId, agentKey);
    }

    /**
     * 获取Agent的对话历史（限制Token总量）
     */
    public List<AgentMemoryDO> getHistoryWithTokenLimit(String nodeInstanceId, String agentKey) {
        List<AgentMemoryDO> all = memoryMapper.selectByNodeAndAgent(nodeInstanceId, agentKey);
        int totalTokens = 0;
        List<AgentMemoryDO> limited = new java.util.ArrayList<>();
        for (int i = all.size() - 1; i >= 0; i--) {
            AgentMemoryDO msg = all.get(i);
            totalTokens += msg.getTokenCount() != null ? msg.getTokenCount() : 0;
            if (totalTokens > MAX_HISTORY_TOKENS && !limited.isEmpty()) {
                break;
            }
            limited.add(0, msg);
        }
        return limited;
    }

    /**
     * 异步压缩记忆
     */
    public void compressAsync(String instanceId, String nodeInstanceId, String agentKey) {
        CompletableFuture.runAsync(() -> {
            try {
                List<AgentMemoryDO> history = getHistory(nodeInstanceId, agentKey);
                if (history.size() < 5) return;

                String conversation = history.stream()
                        .map(m -> m.getRole() + ": " + m.getContent())
                        .collect(Collectors.joining("\n"));

                String summary = llmService.chat(
                        "请将以下对话历史压缩为200字以内的摘要，保留关键信息和决策：\n\n" + conversation
                );

                saveMessage(instanceId, nodeInstanceId, agentKey, 0, "SYSTEM",
                        "[记忆摘要] " + summary);
                log.debug("Agent记忆压缩完成: agentKey={}, 原始消息数={}", agentKey, history.size());
            } catch (Exception e) {
                log.warn("Agent记忆压缩失败: agentKey={}", agentKey, e);
            }
        }, memorySummaryExecutor);
    }
}
