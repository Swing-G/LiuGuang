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

import cn.hutool.core.lang.Assert;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.databind.JsonNode;
import com.nageoffer.ai.ragent.agent.workflow.controller.request.AgentWorkflowChatOptionRequest;
import com.nageoffer.ai.ragent.agent.workflow.controller.vo.AgentWorkflowChatOptionVO;
import com.nageoffer.ai.ragent.agent.workflow.dao.entity.AgentWorkflowChatOptionDO;
import com.nageoffer.ai.ragent.agent.workflow.dao.entity.AgentWorkflowDefinitionDO;
import com.nageoffer.ai.ragent.agent.workflow.dao.mapper.AgentWorkflowChatOptionMapper;
import com.nageoffer.ai.ragent.agent.workflow.dao.mapper.AgentWorkflowDefinitionMapper;
import com.nageoffer.ai.ragent.agent.workflow.service.AgentWorkflowChatOptionService;
import com.nageoffer.ai.ragent.framework.exception.ClientException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AgentWorkflowChatOptionServiceImpl implements AgentWorkflowChatOptionService {

    private final AgentWorkflowChatOptionMapper optionMapper;
    private final AgentWorkflowDefinitionMapper workflowMapper;

    @Override
    public List<AgentWorkflowChatOptionVO> list(Boolean enabledOnly) {
        return optionMapper.selectList(new LambdaQueryWrapper<AgentWorkflowChatOptionDO>()
                        .eq(AgentWorkflowChatOptionDO::getDeleted, 0)
                        .eq(Boolean.TRUE.equals(enabledOnly), AgentWorkflowChatOptionDO::getEnabled, 1)
                        .orderByAsc(AgentWorkflowChatOptionDO::getSortOrder)
                        .orderByDesc(AgentWorkflowChatOptionDO::getUpdateTime))
                .stream()
                .map(this::toVO)
                .toList();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public AgentWorkflowChatOptionVO create(AgentWorkflowChatOptionRequest request) {
        validate(request);
        AgentWorkflowDefinitionDO workflow = requiredWorkflow(request.getWorkflowId());
        ensureOptionKeyUnique(request.getOptionKey(), null);
        AgentWorkflowChatOptionDO option = AgentWorkflowChatOptionDO.builder()
                .optionKey(request.getOptionKey().trim())
                .label(request.getLabel().trim())
                .description(request.getDescription())
                .workflowId(workflow.getId())
                .workflowType(workflow.getWorkflowType())
                .enabled(Boolean.FALSE.equals(request.getEnabled()) ? 0 : 1)
                .sortOrder(request.getSortOrder() == null ? 0 : request.getSortOrder())
                .promptPresets(promptPresetsJson(request.getPromptPresets()))
                .build();
        optionMapper.insert(option);
        return toVO(optionMapper.selectById(option.getId()));
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public AgentWorkflowChatOptionVO update(String id, AgentWorkflowChatOptionRequest request) {
        AgentWorkflowChatOptionDO option = requiredOption(id);
        validate(request);
        AgentWorkflowDefinitionDO workflow = requiredWorkflow(request.getWorkflowId());
        ensureOptionKeyUnique(request.getOptionKey(), id);
        option.setOptionKey(request.getOptionKey().trim());
        option.setLabel(request.getLabel().trim());
        option.setDescription(request.getDescription());
        option.setWorkflowId(workflow.getId());
        option.setWorkflowType(workflow.getWorkflowType());
        option.setEnabled(Boolean.FALSE.equals(request.getEnabled()) ? 0 : 1);
        option.setSortOrder(request.getSortOrder() == null ? 0 : request.getSortOrder());
        option.setPromptPresets(promptPresetsJson(request.getPromptPresets()));
        optionMapper.updateById(option);
        return toVO(optionMapper.selectById(id));
    }

    @Override
    public void delete(String id) {
        requiredOption(id);
        optionMapper.deleteById(id);
    }

    @Override
    public AgentWorkflowChatOptionVO findEnabledByOptionKey(String optionKey) {
        if (!StringUtils.hasText(optionKey)) {
            return null;
        }
        return optionMapper.selectList(new LambdaQueryWrapper<AgentWorkflowChatOptionDO>()
                        .eq(AgentWorkflowChatOptionDO::getDeleted, 0)
                        .eq(AgentWorkflowChatOptionDO::getEnabled, 1)
                        .eq(AgentWorkflowChatOptionDO::getOptionKey, optionKey.trim())
                        .orderByDesc(AgentWorkflowChatOptionDO::getUpdateTime))
                .stream()
                .findFirst()
                .map(this::toVO)
                .orElse(null);
    }

    private void validate(AgentWorkflowChatOptionRequest request) {
        Assert.notNull(request, () -> new ClientException("请求不能为空"));
        if (!StringUtils.hasText(request.getOptionKey())) {
            throw new ClientException("选项Key不能为空");
        }
        if (!StringUtils.hasText(request.getLabel())) {
            throw new ClientException("展示名称不能为空");
        }
        if (!StringUtils.hasText(request.getWorkflowId())) {
            throw new ClientException("绑定Workflow编号不能为空");
        }
    }

    private String promptPresetsJson(JsonNode promptPresets) {
        if (promptPresets == null || promptPresets.isNull() || promptPresets.isMissingNode()) {
            return null;
        }
        if (!promptPresets.isArray()) {
            throw new ClientException("提示词模板必须是JSON数组");
        }
        return promptPresets.toString();
    }

    private void ensureOptionKeyUnique(String optionKey, String currentId) {
        List<AgentWorkflowChatOptionDO> matched = optionMapper.selectList(new LambdaQueryWrapper<AgentWorkflowChatOptionDO>()
                .eq(AgentWorkflowChatOptionDO::getDeleted, 0)
                .eq(AgentWorkflowChatOptionDO::getOptionKey, optionKey.trim()));
        boolean duplicated = matched.stream().anyMatch(each -> !each.getId().equals(currentId));
        if (duplicated) {
            throw new ClientException("选项Key已存在");
        }
    }

    private AgentWorkflowChatOptionDO requiredOption(String id) {
        AgentWorkflowChatOptionDO option = optionMapper.selectById(id);
        Assert.notNull(option, () -> new ClientException("未找到Workflow对话选项"));
        return option;
    }

    private AgentWorkflowDefinitionDO requiredWorkflow(String workflowId) {
        AgentWorkflowDefinitionDO workflow = workflowMapper.selectById(workflowId);
        Assert.notNull(workflow, () -> new ClientException("未找到绑定Workflow"));
        return workflow;
    }

    private AgentWorkflowChatOptionVO toVO(AgentWorkflowChatOptionDO option) {
        AgentWorkflowDefinitionDO workflow = StringUtils.hasText(option.getWorkflowId()) ? workflowMapper.selectById(option.getWorkflowId()) : null;
        AgentWorkflowChatOptionVO vo = new AgentWorkflowChatOptionVO();
        vo.setId(option.getId());
        vo.setOptionKey(option.getOptionKey());
        vo.setLabel(option.getLabel());
        vo.setDescription(option.getDescription());
        vo.setWorkflowId(option.getWorkflowId());
        vo.setWorkflowName(workflow == null ? null : workflow.getName());
        vo.setWorkflowType(workflow == null ? option.getWorkflowType() : workflow.getWorkflowType());
        vo.setEnabled(option.getEnabled() != null && option.getEnabled() == 1);
        vo.setSortOrder(option.getSortOrder());
        vo.setPromptPresets(option.getPromptPresets());
        vo.setCreateTime(option.getCreateTime());
        vo.setUpdateTime(option.getUpdateTime());
        return vo;
    }
}
