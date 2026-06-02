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

package com.nageoffer.ai.ragent.agent.multiagent.dao.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import com.nageoffer.ai.ragent.knowledge.dao.handler.JsonbTypeHandler;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;

/**
 * Agent执行记录实体
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@TableName("t_agent_execution_record")
public class AgentExecutionRecordDO {

    @TableId(type = IdType.ASSIGN_ID)
    private String id;

    private String nodeInstanceId;

    private String instanceId;

    private String agentKey;

    private Integer roundNumber;

    private String status;

    @TableField(typeHandler = JsonbTypeHandler.class)
    private String inputJson;

    @TableField(typeHandler = JsonbTypeHandler.class)
    private String outputJson;

    @TableField(typeHandler = JsonbTypeHandler.class)
    private String toolResultsJson;

    private String errorMessage;

    private Date startedAt;

    private Date completedAt;

    private Long durationMs;

    @TableField(fill = FieldFill.INSERT)
    private Date createTime;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private Date updateTime;

    @TableLogic
    private Integer deleted;
}
