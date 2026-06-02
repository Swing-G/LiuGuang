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

import com.fasterxml.jackson.databind.JsonNode;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Agent执行结果
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AgentExecutionResult {

    /**
     * Agent Key
     */
    private String agentKey;

    /**
     * 是否成功
     */
    private boolean success;

    /**
     * 执行状态
     */
    private String status;

    /**
     * LLM输出
     */
    private String output;

    /**
     * 结构化输出
     */
    private JsonNode structuredOutput;

    /**
     * 工具调用结果
     */
    private List<JsonNode> toolResults;

    /**
     * 错误信息
     */
    private String errorMessage;

    /**
     * 执行耗时（ms）
     */
    private Long durationMs;

    /**
     * Token估算
     */
    private Integer estimatedTokens;

    public static AgentExecutionResult success(String agentKey, String output, JsonNode structuredOutput, long durationMs) {
        return AgentExecutionResult.builder()
                .agentKey(agentKey)
                .success(true)
                .status("SUCCESS")
                .output(output)
                .structuredOutput(structuredOutput)
                .durationMs(durationMs)
                .build();
    }

    public static AgentExecutionResult fail(String agentKey, String errorMessage, long durationMs) {
        return AgentExecutionResult.builder()
                .agentKey(agentKey)
                .success(false)
                .status("FAILED")
                .errorMessage(errorMessage)
                .durationMs(durationMs)
                .build();
    }
}
