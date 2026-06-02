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

package com.nageoffer.ai.ragent.agent.multiagent.topology;

import com.nageoffer.ai.ragent.agent.multiagent.domain.AgentExecutionResult;

/**
 * Agent Team拓扑策略接口
 * <p>
 * 每种拓扑定义了Agent如何协作执行。
 * 实现类通过Spring Bean自动注册到{@link TeamTopologyStrategyRegistry}。
 */
public interface TeamTopologyStrategy {

    /**
     * 拓扑类型
     */
    String topologyType();

    /**
     * 执行拓扑策略
     *
     * @param context 拓扑执行上下文
     * @return 合并后的执行结果
     */
    AgentExecutionResult execute(TeamTopologyContext context);
}
