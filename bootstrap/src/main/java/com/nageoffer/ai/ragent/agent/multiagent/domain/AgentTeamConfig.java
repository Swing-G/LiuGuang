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

package com.nageoffer.ai.ragent.agent.multiagent.domain;

import com.nageoffer.ai.ragent.agent.multiagent.enums.AgentMergeStrategy;
import com.nageoffer.ai.ragent.agent.multiagent.enums.AgentTeamTopology;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Agent Team配置（领域模型）
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AgentTeamConfig {

    /**
     * Team ID
     */
    private String teamId;

    /**
     * Team名称
     */
    private String name;

    /**
     * 协作拓扑
     */
    private AgentTeamTopology topology;

    /**
     * 最大轮数
     */
    private Integer maxRounds;

    /**
     * 结果合并策略
     */
    private AgentMergeStrategy mergeStrategy;

    /**
     * Agent列表
     */
    private List<AgentConfig> agents;
}
