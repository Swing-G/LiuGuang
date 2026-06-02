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

import com.nageoffer.ai.ragent.framework.errorcode.BaseErrorCode;
import com.nageoffer.ai.ragent.framework.exception.ClientException;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Agent Team拓扑策略注册中心
 * <p>
 * 自动发现所有{@link TeamTopologyStrategy}实现。
 */
@Component
public class TeamTopologyStrategyRegistry {

    private final Map<String, TeamTopologyStrategy> strategyMap;

    public TeamTopologyStrategyRegistry(List<TeamTopologyStrategy> strategies) {
        this.strategyMap = strategies.stream()
                .collect(Collectors.toMap(TeamTopologyStrategy::topologyType, Function.identity()));
    }

    public TeamTopologyStrategy getRequired(String topologyType) {
        TeamTopologyStrategy strategy = strategyMap.get(topologyType);
        if (strategy == null) {
            throw new ClientException("不支持的拓扑类型: " + topologyType, BaseErrorCode.CLIENT_ERROR);
        }
        return strategy;
    }
}
