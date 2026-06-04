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

package com.nageoffer.ai.ragent.agent.skill.core;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nageoffer.ai.ragent.agent.skill.dao.entity.AgentSkillDO;
import com.nageoffer.ai.ragent.agent.skill.dao.entity.AgentSkillSuggestionDO;
import com.nageoffer.ai.ragent.agent.skill.dao.mapper.AgentSkillMapper;
import com.nageoffer.ai.ragent.agent.skill.dao.mapper.AgentSkillSuggestionMapper;
import com.nageoffer.ai.ragent.framework.convention.ChatMessage;
import com.nageoffer.ai.ragent.framework.convention.ChatRequest;
import com.nageoffer.ai.ragent.infra.chat.LLMService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;

/**
 * Skill 自进化评估器
 * <p>
 * 在 Agent 执行完成后异步检查 Skill 内容是否需要更新：
 * 1. SOP 步骤是否仍然有效
 * 2. 领域规则是否过时
 * 3. 工具绑定是否需要调整
 * 4. 输出规范是否需要补充
 * 发现问题时生成 {@link AgentSkillSuggestionDO}，状态为 PENDING_REVIEW。
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class SkillEvolutionEvaluator {

    private final AgentSkillMapper skillMapper;
    private final AgentSkillSuggestionMapper suggestionMapper;
    private final LLMService llmService;
    private final Executor memorySummaryExecutor; // 复用已有线程池
    private final ObjectMapper objectMapper;

    /**
     * 异步评估 Skill 是否需要进化
     *
     * @param skillKey       使用的 Skill key
     * @param userQuestion   用户原始问题
     * @param agentOutput    Agent 的最终输出
     * @param instanceId     Workflow instance ID
     */
    public void evaluateAsync(String skillKey, String userQuestion, String agentOutput, String instanceId) {
        CompletableFuture.runAsync(() -> evaluate(skillKey, userQuestion, agentOutput, instanceId),
                memorySummaryExecutor);
    }

    private void evaluate(String skillKey, String userQuestion, String agentOutput, String instanceId) {
        AgentSkillDO skill = skillMapper.selectBySkillKey(skillKey);
        if (skill == null) {
            log.debug("Skill 进化评估跳过: skillKey={} 不存在", skillKey);
            return;
        }

        try {
            // 1. 检查已有 PENDING 建议，避免重复生成
            long pendingCount = suggestionMapper.selectPendingBySkillId(skill.getId()).size();
            if (pendingCount >= 3) {
                log.info("Skill 进化评估跳过: skillKey={} 已有 {} 条待审核建议", skillKey, pendingCount);
                return;
            }

            // 2. 构建评估 prompt
            String prompt = buildEvolutionPrompt(skill, userQuestion, agentOutput);

            // 3. LLM 评估
            ChatRequest request = ChatRequest.builder()
                    .messages(List.of(ChatMessage.user(prompt)))
                    .temperature(0.1)
                    .maxTokens(800)
                    .build();
            String response = llmService.chat(request);

            // 4. 解析评估结果
            List<SkillSuggestion> suggestions = parseSuggestions(response, skill.getId(), instanceId);
            if (suggestions.isEmpty()) {
                log.info("Skill 评估完成: skillKey={}, 无需更新", skillKey);
                return;
            }

            // 5. 写入变更建议
            for (SkillSuggestion s : suggestions) {
                suggestionMapper.insert(s.toDO());
                log.info("Skill 进化建议已生成: skillKey={}, field={}, confidence={}",
                        skillKey, s.fieldPath, s.confidence);
            }
        } catch (Exception e) {
            log.warn("Skill 进化评估异常: skillKey={}", skillKey, e);
        }
    }

    private String buildEvolutionPrompt(AgentSkillDO skill, String userQuestion, String agentOutput) {
        StringBuilder sb = new StringBuilder();
        sb.append("你是一个 Skill 质量审核员。评估以下 Skill 在执行后是否有需要更新的地方。\n\n");

        sb.append("## Skill 当前内容\n");
        sb.append("- 名称: ").append(skill.getName()).append("\n");
        if (skill.getSopContent() != null) {
            sb.append("- SOP:\n").append(skill.getSopContent()).append("\n");
        }
        if (skill.getDomainRules() != null) {
            sb.append("- 领域规则:\n").append(skill.getDomainRules()).append("\n");
        }
        if (skill.getPromptTemplate() != null) {
            sb.append("- 提示词模板:\n").append(skill.getPromptTemplate()).append("\n");
        }
        if (skill.getOutputSpec() != null) {
            sb.append("- 输出规范:\n").append(skill.getOutputSpec()).append("\n");
        }

        sb.append("\n## 本次执行\n");
        sb.append("- 用户问题: ").append(truncate(userQuestion, 500)).append("\n");
        sb.append("- Agent 输出: ").append(truncate(agentOutput, 1000)).append("\n");

        sb.append("\n## 评估要求\n");
        sb.append("检查 Skill 是否存在以下问题，每个问题输出一行 JSON：\n");
        sb.append("1. SOP 步骤是否过时或遗漏\n");
        sb.append("2. 领域规则是否需要更新\n");
        sb.append("3. 提示词模板是否需要优化\n");
        sb.append("4. 输出规范是否需要补充\n\n");
        sb.append("如果无需更新，回复: NO_CHANGE\n");
        sb.append("如果需要更新，每行输出: {\"field\":\"字段名\",\"original\":\"原文(摘要)\",\"suggested\":\"建议改法\",\"reason\":\"理由\",\"confidence\":0.8}\n");
        sb.append("只保留 confidence >= 0.7 的建议。");

        return sb.toString();
    }

    private List<SkillSuggestion> parseSuggestions(String response, String skillId, String instanceId) {
        List<SkillSuggestion> result = new java.util.ArrayList<>();
        if (response == null || response.trim().contains("NO_CHANGE")) return result;

        for (String line : response.split("\n")) {
            line = line.trim();
            if (!line.startsWith("{")) continue;
            try {
                JsonNode node = objectMapper.readTree(line);
                if (!node.has("field") || !node.has("suggested") || !node.has("reason")) continue;

                double confidence = node.path("confidence").asDouble(0.5);
                if (confidence < 0.7) continue;

                // 映射 field 到数据库字段
                String field = mapField(node.path("field").asText());
                if (field == null) continue;

                SkillSuggestion s = new SkillSuggestion();
                s.skillId = skillId;
                s.suggestionType = "UPDATE";
                s.fieldPath = field;
                s.originalText = node.path("original").asText("");
                s.suggestedText = node.path("suggested").asText("");
                s.reason = node.path("reason").asText("");
                s.confidence = new BigDecimal(String.valueOf(confidence));
                s.sourceInstance = instanceId;
                s.status = "PENDING";
                result.add(s);
            } catch (Exception ignored) {
            }
        }
        return result;
    }

    private String mapField(String field) {
        return switch (field.toLowerCase()) {
            case "sop", "sop_content", "流程" -> "sop_content";
            case "rules", "domain_rules", "规则", "领域规则" -> "domain_rules";
            case "prompt", "prompt_template", "模板", "提示词", "提示词模板" -> "prompt_template";
            case "output", "output_spec", "输出", "输出规范" -> "output_spec";
            default -> null;
        };
    }

    private String truncate(String text, int maxLen) {
        if (text == null) return "";
        return text.length() <= maxLen ? text : text.substring(0, maxLen) + "...";
    }

    private static class SkillSuggestion {
        String skillId;
        String suggestionType;
        String fieldPath;
        String originalText;
        String suggestedText;
        String reason;
        BigDecimal confidence;
        String sourceInstance;
        String status;

        AgentSkillSuggestionDO toDO() {
            AgentSkillSuggestionDO d = new AgentSkillSuggestionDO();
            d.setSkillId(skillId);
            d.setSuggestionType(suggestionType);
            d.setFieldPath(fieldPath);
            d.setOriginalText(originalText);
            d.setSuggestedText(suggestedText);
            d.setReason(reason);
            d.setConfidence(confidence);
            d.setSourceInstance(sourceInstance);
            d.setStatus(status);
            return d;
        }
    }
}
