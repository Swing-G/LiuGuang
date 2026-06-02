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
 * Agent Team协作拓扑类型
 */
public enum AgentTeamTopology {

    /**
     * 并行：所有Agent并发执行，各自独立分析，结果合并
     */
    PARALLEL,

    /**
     * 顺序：Agent按顺序执行，后者看到前者输出
     */
    SEQUENTIAL,

    /**
     * 辩论：多轮辩论，Agent互相看到对方结论，通过Moderator判断收敛
     */
    DEBATE,

    /**
     * 层级：Leader Agent拆解任务，分派给Worker执行，最终合成
     */
    HIERARCHICAL
}
