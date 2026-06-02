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

package com.nageoffer.ai.ragent.agent.workflow.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nageoffer.ai.ragent.agent.multiagent.dao.entity.AgentDefinitionDO;
import com.nageoffer.ai.ragent.agent.multiagent.dao.entity.AgentTeamDefinitionDO;
import com.nageoffer.ai.ragent.agent.multiagent.dao.mapper.AgentDefinitionMapper;
import com.nageoffer.ai.ragent.agent.multiagent.dao.mapper.AgentTeamDefinitionMapper;
import com.nageoffer.ai.ragent.agent.workflow.controller.request.AgentDefinitionRequest;
import com.nageoffer.ai.ragent.agent.workflow.controller.request.AgentTeamCreateRequest;
import com.nageoffer.ai.ragent.agent.workflow.controller.vo.AgentDefinitionVO;
import com.nageoffer.ai.ragent.agent.workflow.controller.vo.AgentTeamVO;
import com.nageoffer.ai.ragent.agent.workflow.service.AgentTeamService;
import com.nageoffer.ai.ragent.framework.errorcode.BaseErrorCode;
import com.nageoffer.ai.ragent.framework.exception.ClientException;
import com.nageoffer.ai.ragent.rag.core.mcp.McpToolRegistry;
import io.modelcontextprotocol.spec.McpSchema;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Agent Team服务实现
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AgentTeamServiceImpl implements AgentTeamService {

    private final AgentTeamDefinitionMapper teamMapper;
    private final AgentDefinitionMapper agentMapper;
    private final McpToolRegistry mcpToolRegistry;
    private final ObjectMapper objectMapper;

    @Override
    @Transactional
    public AgentTeamVO create(AgentTeamCreateRequest request) {
        AgentTeamDefinitionDO teamDO = AgentTeamDefinitionDO.builder()
                .name(request.getName())
                .description(request.getDescription())
                .topology(request.getTopology())
                .maxRounds(request.getMaxRounds())
                .mergeStrategy(request.getMergeStrategy())
                .configJson(request.getConfig() != null ? request.getConfig().toString() : null)
                .build();
        teamMapper.insert(teamDO);

        if (request.getAgents() != null) {
            for (AgentDefinitionRequest agentReq : request.getAgents()) {
                addAgentInternal(teamDO.getId(), agentReq);
            }
        }

        return get(teamDO.getId());
    }

    @Override
    @Transactional
    public AgentTeamVO update(String id, AgentTeamCreateRequest request) {
        AgentTeamDefinitionDO existing = teamMapper.selectById(id);
        if (existing == null) {
            throw new ClientException("Agent Team不存在: " + id, BaseErrorCode.CLIENT_ERROR);
        }

        existing.setName(request.getName());
        existing.setDescription(request.getDescription());
        existing.setTopology(request.getTopology());
        existing.setMaxRounds(request.getMaxRounds());
        existing.setMergeStrategy(request.getMergeStrategy());
        if (request.getConfig() != null) {
            existing.setConfigJson(request.getConfig().toString());
        }
        teamMapper.updateById(existing);

        return get(id);
    }

    @Override
    public AgentTeamVO get(String id) {
        AgentTeamDefinitionDO teamDO = teamMapper.selectById(id);
        if (teamDO == null) {
            throw new ClientException("Agent Team不存在: " + id, BaseErrorCode.CLIENT_ERROR);
        }

        AgentTeamVO vo = new AgentTeamVO();
        vo.setId(teamDO.getId());
        vo.setName(teamDO.getName());
        vo.setDescription(teamDO.getDescription());
        vo.setTopology(teamDO.getTopology());
        vo.setMaxRounds(teamDO.getMaxRounds());
        vo.setMergeStrategy(teamDO.getMergeStrategy());
        vo.setCreateTime(teamDO.getCreateTime());
        vo.setUpdateTime(teamDO.getUpdateTime());
        vo.setAgents(listAgents(teamDO.getId()));
        return vo;
    }

    @Override
    public IPage<AgentTeamVO> page(IPage<AgentTeamVO> page, String keyword) {
        LambdaQueryWrapper<AgentTeamDefinitionDO> wrapper = new LambdaQueryWrapper<>();
        if (keyword != null && !keyword.isEmpty()) {
            wrapper.like(AgentTeamDefinitionDO::getName, keyword);
        }
        wrapper.orderByDesc(AgentTeamDefinitionDO::getCreateTime);
        IPage<AgentTeamDefinitionDO> doPage = new com.baomidou.mybatisplus.extension.plugins.pagination.Page<>(
                page.getCurrent(), page.getSize());
        return teamMapper.selectPage(doPage, wrapper).convert(teamDO -> {
            AgentTeamVO vo = new AgentTeamVO();
            vo.setId(teamDO.getId());
            vo.setName(teamDO.getName());
            vo.setDescription(teamDO.getDescription());
            vo.setTopology(teamDO.getTopology());
            vo.setMaxRounds(teamDO.getMaxRounds());
            vo.setMergeStrategy(teamDO.getMergeStrategy());
            vo.setCreateTime(teamDO.getCreateTime());
            vo.setUpdateTime(teamDO.getUpdateTime());
            return vo;
        });
    }

    @Override
    @Transactional
    public void delete(String id) {
        teamMapper.deleteById(id);
    }

    @Override
    public List<AgentDefinitionVO> listAgents(String teamId) {
        return agentMapper.selectByTeamId(teamId).stream()
                .map(this::toVO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public AgentDefinitionVO addAgent(String teamId, AgentDefinitionRequest request) {
        addAgentInternal(teamId, request);
        return toVO(agentMapper.selectByTeamId(teamId).stream()
                .filter(a -> request.getAgentKey().equals(a.getAgentKey()))
                .findFirst()
                .orElseThrow());
    }

    @Override
    @Transactional
    public AgentDefinitionVO updateAgent(String teamId, String agentId, AgentDefinitionRequest request) {
        AgentDefinitionDO existing = agentMapper.selectById(agentId);
        if (existing == null || !teamId.equals(existing.getTeamId())) {
            throw new ClientException("Agent不存在", BaseErrorCode.CLIENT_ERROR);
        }
        fillAgentDO(existing, request);
        agentMapper.updateById(existing);
        return toVO(existing);
    }

    @Override
    @Transactional
    public void removeAgent(String teamId, String agentId) {
        agentMapper.deleteById(agentId);
    }

    @Override
    public List<String> listAvailableTools() {
        return mcpToolRegistry.listAllTools().stream()
                .map(McpSchema.Tool::name)
                .collect(Collectors.toList());
    }

    private void addAgentInternal(String teamId, AgentDefinitionRequest request) {
        AgentDefinitionDO agentDO = new AgentDefinitionDO();
        agentDO.setTeamId(teamId);
        fillAgentDO(agentDO, request);
        agentMapper.insert(agentDO);
    }

    private void fillAgentDO(AgentDefinitionDO agentDO, AgentDefinitionRequest request) {
        agentDO.setAgentKey(request.getAgentKey());
        agentDO.setAgentName(request.getAgentName());
        agentDO.setRole(request.getRole());
        agentDO.setGoal(request.getGoal());
        agentDO.setModelId(request.getModelId());
        agentDO.setAgentOrder(request.getAgentOrder() != null ? request.getAgentOrder() : 0);
        agentDO.setIsLeader(request.getIsLeader() != null ? request.getIsLeader() : false);
        agentDO.setMemoryStrategy(request.getMemoryStrategy() != null ? request.getMemoryStrategy() : "CONVERSATION");
        try {
            if (request.getToolNames() != null) {
                agentDO.setToolNames(objectMapper.writeValueAsString(request.getToolNames()));
            }
            if (request.getLlmConfig() != null) {
                agentDO.setLlmConfig(objectMapper.writeValueAsString(request.getLlmConfig()));
            }
            if (request.getConfig() != null) {
                agentDO.setConfigJson(objectMapper.writeValueAsString(request.getConfig()));
            }
        } catch (Exception e) {
            log.warn("序列化Agent配置失败", e);
        }
    }

    private AgentDefinitionVO toVO(AgentDefinitionDO agentDO) {
        AgentDefinitionVO vo = new AgentDefinitionVO();
        vo.setId(agentDO.getId());
        vo.setAgentKey(agentDO.getAgentKey());
        vo.setAgentName(agentDO.getAgentName());
        vo.setRole(agentDO.getRole());
        vo.setGoal(agentDO.getGoal());
        vo.setModelId(agentDO.getModelId());
        vo.setAgentOrder(agentDO.getAgentOrder());
        vo.setIsLeader(agentDO.getIsLeader());
        vo.setMemoryStrategy(agentDO.getMemoryStrategy());
        vo.setCreateTime(agentDO.getCreateTime());
        try {
            if (agentDO.getToolNames() != null) {
                vo.setToolNames(objectMapper.readValue(agentDO.getToolNames(), List.class));
            }
            if (agentDO.getLlmConfig() != null) {
                vo.setLlmConfig(objectMapper.readTree(agentDO.getLlmConfig()));
            }
            if (agentDO.getConfigJson() != null) {
                vo.setConfig(objectMapper.readTree(agentDO.getConfigJson()));
            }
        } catch (Exception ignored) {
        }
        return vo;
    }
}
