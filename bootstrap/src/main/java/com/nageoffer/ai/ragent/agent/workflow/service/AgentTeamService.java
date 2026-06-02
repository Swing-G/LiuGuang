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

package com.nageoffer.ai.ragent.agent.workflow.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.nageoffer.ai.ragent.agent.workflow.controller.request.AgentDefinitionRequest;
import com.nageoffer.ai.ragent.agent.workflow.controller.request.AgentTeamCreateRequest;
import com.nageoffer.ai.ragent.agent.workflow.controller.vo.AgentDefinitionVO;
import com.nageoffer.ai.ragent.agent.workflow.controller.vo.AgentTeamVO;

import java.util.List;

/**
 * Agent Team服务接口
 */
public interface AgentTeamService {

    AgentTeamVO create(AgentTeamCreateRequest request);

    AgentTeamVO update(String id, AgentTeamCreateRequest request);

    AgentTeamVO get(String id);

    IPage<AgentTeamVO> page(IPage<AgentTeamVO> page, String keyword);

    void delete(String id);

    List<AgentDefinitionVO> listAgents(String teamId);

    AgentDefinitionVO addAgent(String teamId, AgentDefinitionRequest request);

    AgentDefinitionVO updateAgent(String teamId, String agentId, AgentDefinitionRequest request);

    void removeAgent(String teamId, String agentId);

    List<String> listAvailableTools();
}
