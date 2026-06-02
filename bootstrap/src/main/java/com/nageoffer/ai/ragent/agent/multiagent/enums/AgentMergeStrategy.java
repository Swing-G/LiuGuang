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

package com.nageoffer.ai.ragent.agent.multiagent.enums;

/**
 * Agent Team结果合并策略
 */
public enum AgentMergeStrategy {

    /**
     * 共识：所有Agent必须达成一致
     */
    CONSENSUS,

    /**
     * 多数：少数服从多数
     */
    MAJORITY,

    /**
     * Leader决策：由Leader Agent的合成结果为准
     */
    LEADER,

    /**
     * 优先：第一个成功的Agent输出即为最终结果
     */
    FIRST
}
