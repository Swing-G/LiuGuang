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

package com.nageoffer.ai.ragent.agent.workflow.controller;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.nageoffer.ai.ragent.agent.workflow.controller.request.AgentDefinitionRequest;
import com.nageoffer.ai.ragent.agent.workflow.controller.request.AgentTeamCreateRequest;
import com.nageoffer.ai.ragent.agent.workflow.controller.vo.AgentDefinitionVO;
import com.nageoffer.ai.ragent.agent.workflow.controller.vo.AgentTeamVO;
import com.nageoffer.ai.ragent.agent.workflow.service.AgentTeamService;
import com.nageoffer.ai.ragent.framework.convention.Result;
import com.nageoffer.ai.ragent.framework.web.Results;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Agent Team控制层
 */
@RestController
@RequiredArgsConstructor
@Validated
public class AgentTeamController {

    private final AgentTeamService agentTeamService;

    /**
     * 创建Agent Team
     */
    @PostMapping("/agent/teams")
    public Result<AgentTeamVO> create(@RequestBody AgentTeamCreateRequest request) {
        return Results.success(agentTeamService.create(request));
    }

    /**
     * 更新Agent Team
     */
    @PutMapping("/agent/teams/{id}")
    public Result<AgentTeamVO> update(@PathVariable String id, @RequestBody AgentTeamCreateRequest request) {
        return Results.success(agentTeamService.update(id, request));
    }

    /**
     * 获取Agent Team详情
     */
    @GetMapping("/agent/teams/{id}")
    public Result<AgentTeamVO> get(@PathVariable String id) {
        return Results.success(agentTeamService.get(id));
    }

    /**
     * 分页查询Agent Team
     */
    @GetMapping("/agent/teams")
    public Result<IPage<AgentTeamVO>> page(@RequestParam(value = "pageNo", defaultValue = "1") int pageNo,
                                            @RequestParam(value = "pageSize", defaultValue = "10") int pageSize,
                                            @RequestParam(value = "keyword", required = false) String keyword) {
        return Results.success(agentTeamService.page(new Page<>(pageNo, pageSize), keyword));
    }

    /**
     * 删除Agent Team
     */
    @DeleteMapping("/agent/teams/{id}")
    public Result<Void> delete(@PathVariable String id) {
        agentTeamService.delete(id);
        return Results.success();
    }

    /**
     * 获取Team下的Agent列表
     */
    @GetMapping("/agent/teams/{teamId}/agents")
    public Result<List<AgentDefinitionVO>> listAgents(@PathVariable String teamId) {
        return Results.success(agentTeamService.listAgents(teamId));
    }

    /**
     * 添加Agent到Team
     */
    @PostMapping("/agent/teams/{teamId}/agents")
    public Result<AgentDefinitionVO> addAgent(@PathVariable String teamId,
                                               @RequestBody AgentDefinitionRequest request) {
        return Results.success(agentTeamService.addAgent(teamId, request));
    }

    /**
     * 更新Agent
     */
    @PutMapping("/agent/teams/{teamId}/agents/{agentId}")
    public Result<AgentDefinitionVO> updateAgent(@PathVariable String teamId,
                                                  @PathVariable String agentId,
                                                  @RequestBody AgentDefinitionRequest request) {
        return Results.success(agentTeamService.updateAgent(teamId, agentId, request));
    }

    /**
     * 移除Agent
     */
    @DeleteMapping("/agent/teams/{teamId}/agents/{agentId}")
    public Result<Void> removeAgent(@PathVariable String teamId, @PathVariable String agentId) {
        agentTeamService.removeAgent(teamId, agentId);
        return Results.success();
    }

    /**
     * 获取可用MCP工具列表
     */
    @GetMapping("/agent/teams/available-tools")
    public Result<List<String>> listAvailableTools() {
        return Results.success(agentTeamService.listAvailableTools());
    }
}
