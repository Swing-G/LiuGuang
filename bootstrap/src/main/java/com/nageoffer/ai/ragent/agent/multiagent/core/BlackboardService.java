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

import com.fasterxml.jackson.databind.JsonNode;
import com.nageoffer.ai.ragent.agent.multiagent.dao.entity.AgentBlackboardDO;
import com.nageoffer.ai.ragent.agent.multiagent.dao.mapper.AgentBlackboardMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 共享Blackboard服务
 * <p>
 * Agent间通过Blackboard交换结论、批判和观察。
 * 支持按轮次读取，每轮Agent写入后其他Agent可见。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class BlackboardService {

    private final AgentBlackboardMapper blackboardMapper;

    /**
     * 写入Blackboard条目
     */
    public AgentBlackboardDO writeEntry(String nodeInstanceId, int roundNumber,
                                         String contributorKey, String entryType,
                                         String content, JsonNode structuredData) {
        AgentBlackboardDO entry = AgentBlackboardDO.builder()
                .nodeInstanceId(nodeInstanceId)
                .roundNumber(roundNumber)
                .contributorKey(contributorKey)
                .entryType(entryType)
                .content(content)
                .structuredData(structuredData != null ? structuredData.toString() : null)
                .importanceScore(50)
                .build();
        blackboardMapper.insert(entry);
        log.debug("Blackboard写入: nodeInstanceId={}, round={}, contributor={}, type={}",
                nodeInstanceId, roundNumber, contributorKey, entryType);
        return entry;
    }

    /**
     * 读取指定轮次的所有条目
     */
    public List<AgentBlackboardDO> readRound(String nodeInstanceId, int roundNumber) {
        return blackboardMapper.selectByNodeAndRound(nodeInstanceId, roundNumber);
    }

    /**
     * 读取所有条目
     */
    public List<AgentBlackboardDO> readAll(String nodeInstanceId) {
        return blackboardMapper.selectByNodeInstanceId(nodeInstanceId);
    }

    /**
     * 获取指定Agent最新一轮的输出
     */
    public AgentBlackboardDO getLatestByAgent(String nodeInstanceId, String agentKey) {
        List<AgentBlackboardDO> all = blackboardMapper.selectByNodeInstanceId(nodeInstanceId);
        return all.stream()
                .filter(e -> agentKey.equals(e.getContributorKey()))
                .reduce((first, second) -> second)
                .orElse(null);
    }
}
