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

package com.nageoffer.ai.ragent.agent.workflow.strategy;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.nageoffer.ai.ragent.agent.action.domain.ActionResult;
import com.nageoffer.ai.ragent.agent.multiagent.core.AgentTeamOrchestrator;
import com.nageoffer.ai.ragent.agent.multiagent.core.ResultMergeEngine;
import com.nageoffer.ai.ragent.agent.multiagent.domain.AgentExecutionResult;
import com.nageoffer.ai.ragent.agent.workflow.enums.NodeExecutionStrategyType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * Agent Team节点执行策略
 * <p>
 * 将Workflow节点的执行委托给Multi-Agent Team。
 * 通过Spring自动注入{@link NodeExecutionStrategyRegistry}。
 * <p>
 * 节点configJson配置：
 * <pre>
 * {
 *   "teamId": "xxx",          // DB中的Agent Team ID
 *   "topology": "PARALLEL",   // 可选覆盖
 *   "maxRounds": 3,           // 可选覆盖
 *   "mergeStrategy": "CONSENSUS" // 可选覆盖
 * }
 * </pre>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AgentTeamNodeExecutionStrategy implements NodeExecutionStrategy {

    private final AgentTeamOrchestrator orchestrator;
    private final ResultMergeEngine mergeEngine;
    private final ObjectMapper objectMapper;

    @Override
    public String strategyType() {
        return NodeExecutionStrategyType.AGENT_TEAM.name();
    }

    @Override
    public ActionResult execute(NodeExecutionContext context) {
        log.info("AgentTeamNodeExecutionStrategy启动: nodeKey={}, instanceId={}",
                context.getNode().getNodeKey(), context.getInstance().getId());

        try {
            String teamId = null;
            if (context.getNodeConfig() != null) {
                teamId = context.getNodeConfig().path("teamId").asText(null);
            }

            AgentExecutionResult result;
            if (teamId != null && !teamId.isEmpty()) {
                // 从DB加载Team定义并执行
                result = orchestrator.execute(teamId, context.getInstance().getId(),
                        context.getInstance().getId(),
                        context.getOriginalInput(), context.getWorkflowContext());
            } else {
                // 内联模式：从nodeConfig解析Agent配置
                log.warn("AgentTeamNode: 未配置teamId，返回错误");
                return ActionResult.fail("AgentTeam节点未配置teamId");
            }

            // 构建ActionResult：优先使用拓扑策略返回的structuredOutput（含完整agentResults）
            ObjectNode output;
            if (result.getStructuredOutput() != null && result.getStructuredOutput().isObject()) {
                output = (ObjectNode) result.getStructuredOutput();
            } else {
                output = mergeEngine.buildMergedOutput(
                        java.util.Collections.singletonList(result));
            }
            output.put("teamResult", result.getOutput());

            return ActionResult.success(output);

        } catch (Exception e) {
            log.error("AgentTeamNode执行失败: nodeKey={}", context.getNode().getNodeKey(), e);
            return ActionResult.fail("AgentTeam执行异常: " + e.getMessage());
        }
    }
}
