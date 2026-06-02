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

package com.nageoffer.ai.ragent.agent.harness.engine;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.nageoffer.ai.ragent.agent.harness.domain.HarnessContext;
import com.nageoffer.ai.ragent.agent.harness.domain.HarnessResult;
import com.nageoffer.ai.ragent.agent.multiagent.core.AgentTeamOrchestrator;
import com.nageoffer.ai.ragent.agent.workflow.enums.HarnessType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * Multi-Agent编排引擎
 * <p>
 * 允许整个Workflow以Multi-Agent模式运行（Workflow级别的多Agent编排）。
 * 当前为预留实现，Agent Team主要在节点级别使用（{@code AgentTeamNodeExecutionStrategy}）。
 * <p>
 * 通过Spring自动注入{@link HarnessEngineRegistry}。
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class MultiAgentHarnessEngine implements HarnessEngine {

    private final AgentTeamOrchestrator orchestrator;
    private final ObjectMapper objectMapper;

    @Override
    public String harnessType() {
        return HarnessType.MULTI_AGENT.name();
    }

    @Override
    public HarnessResult run(HarnessContext context) {
        log.info("MultiAgentHarnessEngine启动: workflowId={}", context.getInstance().getWorkflowId());
        log.warn("MultiAgentHarnessEngine当前为预留实现，请使用节点级别的AGENT_TEAM策略");

        // 预留：未来可实现Workflow级别的多Agent编排
        return HarnessResult.fail(
                context.getWorkflowContext(),
                null,
                "Workflow级Multi-Agent编排暂未实现，请在节点中使用AGENT_TEAM策略"
        );
    }
}
