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
import lombok.Data;

import java.util.List;

/**
 * Agent定义请求
 */
@Data
public class AgentDefinitionRequest {

    @NotBlank(message = "Agent Key不能为空")
    private String agentKey;

    @NotBlank(message = "Agent名称不能为空")
    private String agentName;

    @NotBlank(message = "角色描述不能为空")
    private String role;

    private String goal;

    private String modelId;

    private List<String> toolNames;

    private Object llmConfig;

    private Integer agentOrder;

    private Boolean isLeader;

    private String memoryStrategy;

    private Object config;
}
