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

package com.nageoffer.ai.ragent.agent.multiagent.dao.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.nageoffer.ai.ragent.agent.multiagent.dao.entity.AgentExecutionRecordDO;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

/**
 * Agent执行记录Mapper
 */
public interface AgentExecutionRecordMapper extends BaseMapper<AgentExecutionRecordDO> {

    @Select("SELECT * FROM t_agent_execution_record WHERE node_instance_id = #{nodeInstanceId} AND deleted = 0 ORDER BY round_number ASC, agent_key ASC")
    List<AgentExecutionRecordDO> selectByNodeInstanceId(@Param("nodeInstanceId") String nodeInstanceId);

    @Select("SELECT * FROM t_agent_execution_record WHERE instance_id = #{instanceId} AND deleted = 0 ORDER BY create_time ASC")
    List<AgentExecutionRecordDO> selectByInstanceId(@Param("instanceId") String instanceId);
}
