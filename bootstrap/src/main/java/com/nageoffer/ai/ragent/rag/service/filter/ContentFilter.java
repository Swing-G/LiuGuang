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

package com.nageoffer.ai.ragent.rag.service.filter;

import org.springframework.stereotype.Component;

import java.util.regex.Pattern;

/**
 * 内容过滤器
 * 拦截 JSON 代码块、敏感信息等不适内容
 */
@Component
public class ContentFilter {

    // JSON 代码块
    private static final Pattern JSON_BLOCK = Pattern.compile("```json[\\s\\S]*?```", Pattern.DOTALL);
    // 裸 JSON 对象（50字符以上的）
    private static final Pattern LARGE_JSON = Pattern.compile("\\{[^{}]*\"[^\"]{10,}\"[^{}]*\\{[^{}]*\\}[^{}]*\\}", Pattern.DOTALL);
    // API Key / Token
    private static final Pattern API_KEY = Pattern.compile("(?i)(sk|api[_-]?key|token|secret|password)[:=]\\s*[\"']?[\\w\\-.]{20,}[\"']?");
    // 手机号
    private static final Pattern PHONE = Pattern.compile("1[3-9]\\d{9}");
    // 身份证号
    private static final Pattern ID_CARD = Pattern.compile("\\d{6}(19|20)\\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\\d|3[01])\\d{3}[\\dXx]");
    // 邮箱
    private static final Pattern EMAIL = Pattern.compile("[\\w.\\-]+@[\\w\\-]+\\.\\w{2,}");

    /**
     * 过滤内容，返回清理后的文本
     */
    public String filter(String content) {
        if (content == null || content.isEmpty()) return content;
        String filtered = content;
        filtered = JSON_BLOCK.matcher(filtered).replaceAll("[已过滤JSON代码块]");
        filtered = LARGE_JSON.matcher(filtered).replaceAll("[已过滤结构化数据]");
        filtered = API_KEY.matcher(filtered).replaceAll("[已过滤敏感凭证]");
        filtered = PHONE.matcher(filtered).replaceAll(m -> m.group().substring(0, 3) + "****" + m.group().substring(7));
        filtered = ID_CARD.matcher(filtered).replaceAll(m -> m.group().substring(0, 6) + "********" + m.group().substring(14));
        filtered = EMAIL.matcher(filtered).replaceAll("[邮箱]");
        return filtered;
    }
}
