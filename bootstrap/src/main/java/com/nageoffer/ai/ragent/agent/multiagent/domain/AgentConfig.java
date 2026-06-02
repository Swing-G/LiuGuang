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

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Agent配置（领域模型）
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AgentConfig {

    /**
     * Agent唯一Key
     */
    private String agentKey;

    /**
     * Agent名称
     */
    private String agentName;

    /**
     * 角色描述（System Prompt）
     */
    private String role;

    /**
     * 高层次目标
     */
    private String goal;

    /**
     * 模型ID（可选覆盖）
     */
    private String modelId;

    /**
     * 可调用的工具名称列表
     */
    private List<String> toolNames;

    /**
     * 执行策略类型（PIPELINE/REACT/PLAN_EXECUTE）
     */
    private String strategyType;

    /**
     * 温度参数
     */
    private Double temperature;

    /**
     * 最大Token数
     */
    private Integer maxTokens;

    /**
     * 是否启用深度思考
     */
    private Boolean thinking;

    /**
     * 排序
     */
    private Integer agentOrder;

    /**
     * 是否为Leader
     */
    private Boolean isLeader;

    /**
     * 记忆策略
     */
    private String memoryStrategy;
}
