-- Multi-Agent Runtime schema
-- Adds Agent Team, Agent Definition, Execution Records, Agent Memory, and Shared Blackboard tables.

CREATE TABLE IF NOT EXISTS t_agent_team_definition (
    id              VARCHAR(20)  NOT NULL PRIMARY KEY,
    name            VARCHAR(128) NOT NULL,
    description     VARCHAR(512),
    topology        VARCHAR(32)  NOT NULL DEFAULT 'PARALLEL',
    max_rounds      INTEGER      NOT NULL DEFAULT 3,
    merge_strategy  VARCHAR(32)  NOT NULL DEFAULT 'CONSENSUS',
    config_json     JSONB,
    create_time     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    update_time     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    deleted         SMALLINT     DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_agent_team_name ON t_agent_team_definition (name);
COMMENT ON TABLE t_agent_team_definition IS 'Agent Team定义表';
COMMENT ON COLUMN t_agent_team_definition.topology IS '协作拓扑：PARALLEL、SEQUENTIAL、DEBATE、HIERARCHICAL';
COMMENT ON COLUMN t_agent_team_definition.merge_strategy IS '结果合并策略：CONSENSUS、MAJORITY、LEADER、FIRST';
COMMENT ON COLUMN t_agent_team_definition.config_json IS '全局Team配置（temperature, timeout等）';

CREATE TABLE IF NOT EXISTS t_agent_definition (
    id              VARCHAR(20)  NOT NULL PRIMARY KEY,
    team_id         VARCHAR(20)  NOT NULL,
    agent_key       VARCHAR(64)  NOT NULL,
    agent_name      VARCHAR(128) NOT NULL,
    role            VARCHAR(512) NOT NULL,
    goal            VARCHAR(512),
    model_id        VARCHAR(64),
    tool_names      JSONB        DEFAULT '[]',
    llm_config      JSONB,
    agent_order     INTEGER      DEFAULT 0,
    is_leader       BOOLEAN      DEFAULT FALSE,
    memory_strategy VARCHAR(32)  DEFAULT 'CONVERSATION',
    config_json     JSONB,
    create_time     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    update_time     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    deleted         SMALLINT     DEFAULT 0,
    CONSTRAINT uk_agent_definition_key UNIQUE (team_id, agent_key)
);
CREATE INDEX IF NOT EXISTS idx_agent_definition_team ON t_agent_definition (team_id);
COMMENT ON TABLE t_agent_definition IS 'Agent定义表';
COMMENT ON COLUMN t_agent_definition.role IS 'Agent角色描述（System Prompt）';
COMMENT ON COLUMN t_agent_definition.goal IS 'Agent高层次目标';
COMMENT ON COLUMN t_agent_definition.tool_names IS '可调用的MCP工具名称列表，JSON数组';
COMMENT ON COLUMN t_agent_definition.llm_config IS 'LLM调用配置（temperature, maxTokens, strategyType等）';
COMMENT ON COLUMN t_agent_definition.is_leader IS '是否为Hierarchical拓扑中的Leader';

CREATE TABLE IF NOT EXISTS t_agent_execution_record (
    id                 VARCHAR(20)  NOT NULL PRIMARY KEY,
    node_instance_id   VARCHAR(80)  NOT NULL,
    instance_id        VARCHAR(20)  NOT NULL,
    agent_key          VARCHAR(64)  NOT NULL,
    round_number       INTEGER      DEFAULT 1,
    status             VARCHAR(32)  NOT NULL DEFAULT 'PENDING',
    input_json         JSONB,
    output_json        JSONB,
    tool_results_json  JSONB        DEFAULT '[]',
    error_message      TEXT,
    started_at         TIMESTAMP,
    completed_at       TIMESTAMP,
    duration_ms        BIGINT,
    create_time        TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    update_time        TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    deleted            SMALLINT     DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_agent_execution_record_node ON t_agent_execution_record (node_instance_id);
CREATE INDEX IF NOT EXISTS idx_agent_execution_record_instance ON t_agent_execution_record (instance_id);
COMMENT ON TABLE t_agent_execution_record IS 'Agent执行记录表';
COMMENT ON COLUMN t_agent_execution_record.round_number IS '辩论/迭代轮次编号';
COMMENT ON COLUMN t_agent_execution_record.tool_results_json IS '工具调用结果数组';
COMMENT ON COLUMN t_agent_execution_record.status IS '执行状态：PENDING、RUNNING、SUCCESS、FAILED';

CREATE TABLE IF NOT EXISTS t_agent_memory (
    id                 VARCHAR(20)  NOT NULL PRIMARY KEY,
    instance_id        VARCHAR(20)  NOT NULL,
    node_instance_id   VARCHAR(80)  NOT NULL,
    agent_key          VARCHAR(64)  NOT NULL,
    round_number       INTEGER      DEFAULT 1,
    role               VARCHAR(16)  NOT NULL,
    content            TEXT         NOT NULL,
    token_count        INTEGER      DEFAULT 0,
    importance_score   INTEGER      DEFAULT 50,
    create_time        TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_agent_memory_instance ON t_agent_memory (instance_id, agent_key);
CREATE INDEX IF NOT EXISTS idx_agent_memory_round ON t_agent_memory (node_instance_id, agent_key, round_number);
COMMENT ON TABLE t_agent_memory IS 'Agent对话记忆表';
COMMENT ON COLUMN t_agent_memory.role IS '消息角色：SYSTEM、USER、ASSISTANT、TOOL';
COMMENT ON COLUMN t_agent_memory.token_count IS '预估Token数量';
COMMENT ON COLUMN t_agent_memory.importance_score IS '重要性评分（0-100）';

CREATE TABLE IF NOT EXISTS t_agent_blackboard (
    id                 VARCHAR(20)  NOT NULL PRIMARY KEY,
    node_instance_id   VARCHAR(80)  NOT NULL,
    round_number       INTEGER      DEFAULT 1,
    contributor_key    VARCHAR(64),
    entry_type         VARCHAR(32)  NOT NULL DEFAULT 'RESULT',
    content            TEXT         NOT NULL,
    structured_data    JSONB,
    importance_score   INTEGER      DEFAULT 50,
    create_time        TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_agent_blackboard_node ON t_agent_blackboard (node_instance_id);
CREATE INDEX IF NOT EXISTS idx_agent_blackboard_round ON t_agent_blackboard (node_instance_id, round_number);
COMMENT ON TABLE t_agent_blackboard IS 'Agent共享Blackboard表';
COMMENT ON COLUMN t_agent_blackboard.entry_type IS '条目类型：RESULT、CRITIQUE、OBSERVATION、DECISION';
COMMENT ON COLUMN t_agent_blackboard.contributor_key IS '贡献Agent的Key';

-- Fix column width for node_instance_id (accommodates Snowflake IDs up to 64 chars)
ALTER TABLE t_agent_execution_record ALTER COLUMN node_instance_id TYPE VARCHAR(80);
ALTER TABLE t_agent_memory ALTER COLUMN node_instance_id TYPE VARCHAR(80);
ALTER TABLE t_agent_blackboard ALTER COLUMN node_instance_id TYPE VARCHAR(80);
