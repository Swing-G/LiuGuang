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

package com.nageoffer.ai.ragent.agent.workflow.controller.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

/**
 * Agent Team创建请求
 */
@Data
public class AgentTeamCreateRequest {

    @NotBlank(message = "Team名称不能为空")
    private String name;

    private String description;

    @NotBlank(message = "拓扑不能为空")
    private String topology;

    @NotNull(message = "最大轮数不能为空")
    private Integer maxRounds;

    @NotBlank(message = "合并策略不能为空")
    private String mergeStrategy;

    private Object config;

    private List<AgentDefinitionRequest> agents;
}
