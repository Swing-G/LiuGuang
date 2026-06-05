<p align="center">
  <a href="https://github.com/Swing-G/LiuGuang">
    <picture>
      <source srcset="assets/ragent-ai-banner.png">
      <img src="assets/ragent-ai-banner.png" alt="LiuGuang - Agent Orchestration">
    </picture>
  </a>
</p>

<p align="center">
  <strong>流光 — 基于 Ragent 的 Multi-Agent 工作流编排系统</strong><br/>
  <sub>Workflow DAG + 4 种协作拓扑 + 结构化 Skill + 自进化闭环</sub>
</p>

<p align="center">
  <a href="https://github.com/Swing-G/LiuGuang/stargazers"><img alt="GitHub stars" src="https://img.shields.io/github/stars/Swing-G/LiuGuang?style=flat-square&logo=github&color=e8b227" /></a>&nbsp;
  <a href="./LICENSE"><img alt="License" src="https://img.shields.io/badge/license-Apache--2.0-4a9b8f?style=flat-square" /></a>
  <img src="https://img.shields.io/badge/Java-17-blue?style=flat-square&logo=java" />
  <img src="https://img.shields.io/badge/Spring%20Boot-3.5.7-green?style=flat-square&logo=springboot" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react" />
</p>

---

## 项目简介

本项目基于开源 RAG 平台 [Ragent AI](https://github.com/nageoffer/ragent)（Apache 2.0 协议）进行深度扩展，在原有 RAG 检索、模型路由、文档入库等能力基础上，新增 **Multi-Agent 工作流编排引擎**，将系统从"单次问答"升级为"多智能体协作"。

**核心定位**：面向企业复杂任务场景的 Agent Workflow 与运行时编排系统。通过 DAG 任务拆解、多 Agent 协作拓扑、结构化 Skill 知识库和自进化闭环，为大模型提供可控、可观测、可优化的执行链路。

> 在线体验：http://liuguangyf.top  
> 代码仓库：https://github.com/Swing-G/LiuGuang

---

## 目录

- [架构概览](#架构概览)
- [核心功能](#核心功能)
  - [1. Workflow DAG 工作流引擎](#1-workflow-dag-工作流引擎)
  - [2. Multi-Agent 协作拓扑](#2-multi-agent-协作拓扑)
  - [3. 结构化 Skill 知识库](#3-结构化-skill-知识库)
  - [4. 实时思考过程](#4-实时思考过程)
  - [5. Skill 自进化](#5-skill-自进化)
  - [6. 可视化构建与管理](#6-可视化构建与管理)
  - [7. 演示数据与一键 Demo](#7-演示数据与一键-demo)
- [技术栈](#技术栈)
- [快速启动](#快速启动)
- [项目结构](#项目结构)
- [许可证](#许可证)

---

## 架构概览

```
┌─────────────────────────────────────────────────────────┐
│                    用户对话层                             │
│  SSE 实时流式 · 思考过程可视化 · 预测问题                  │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│                 Workflow DAG 引擎                        │
│  FlowHarnessEngine: 节点流转 · 条件分支 · 状态回滚       │
└────────────────────────┬────────────────────────────────┘
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  Node #1     │ │  Node #2     │ │  Node #3     │
│  MCP 工具    │ │ Agent Team   │ │  Evaluator   │
│  数据采集     │ │  并行会诊     │ │  质量验收     │
└──────────────┘ └──────┬───────┘ └──────────────┘
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
  ┌──────────┐   ┌──────────┐   ┌──────────┐
  │ Agent A  │   │ Agent B  │   │ Agent C  │
  │ 账号分析  │   │ 支付风控  │   │ 客户关系  │
  │ PIPELINE │   │  REACT   │   │ PIPELINE │
  └──────────┘   └──────────┘   └──────────┘
        │               │               │
        └───────────────┼───────────────┘
                        ▼
              ┌──────────────────┐
              │  Skill 知识库     │
              │  自动匹配 + 注入   │
              └──────────────────┘
```

---

## 核心功能

### 1. Workflow DAG 工作流引擎

基于有向无环图的任务编排引擎，支持**条件分支**、**状态流转**、**Checkpoint 回滚**和**人工审核节点**。

- **多策略驱动**：每个节点支持 Pipeline / ReAct / Plan-Execute / Agent Team 四种执行策略
- **反思闭环**：Evaluator 验收不通过时自动触发 Reflection + 局部状态回滚
- **分层记忆**：短期上下文 + 事件记忆 + 任务状态 + 长期摘要，异步增量压缩

<!-- 截图占位：Workflow 全景视图页面，展示 DAG 节点流转 -->
> 📸 *[截图占位] Workflow DAG 流转视图*

---

### 2. Multi-Agent 协作拓扑  

在 Workflow 节点内部嵌入多 Agent 协作层，支持 **4 种协作拓扑**：

| 拓扑 | 模式 | 场景 |
|------|------|------|
| **PARALLEL** | 多专家并行分析，结果综合合并 | 多视角会诊 |
| **SEQUENTIAL** | Agent 依次执行，后者基于前者输出 | 流水线处理 |
| **DEBATE** | 多轮辩论，Moderator 判断收敛 | 争议问题 |
| **HIERARCHICAL** | Leader 拆解任务 → Worker 并行 → 合成 | 复杂任务 |

每个 Agent 拥有独立的 **角色、目标、工具集、执行策略（ReAct/PAE/Pipeline）和记忆**，Agent 间通过共享 Blackboard 交换结论。

<!-- 截图占位：Agent Team 管理页面，展示 Agent 角色、工具配置 -->
> 📸 *[截图占位] Agent Team 管理页 — 配置 Agent 角色、工具集和执行策略*

<!-- 截图占位：全景视图展开 Agent Team，显示每个 Agent 详情 -->
> 📸 *[截图占位] 全景视图 — 展开 Agent Team 查看每个 Agent 的详细信息*

---

### 3. 结构化 Skill 知识库

将业务 SOP、领域规则和工具调用范式沉淀为**可复用、可索引、可进化**的结构化 Skill。

- **LLM 自动匹配**：用户提问时自动从 Skill 库匹配最佳 Skill，注入 Agent 执行上下文
- **YAML Frontmatter 定义**：在 `resources/skills/` 下编写 `.md` 文件，启动时自动扫描入库
- **6 个预置 Skill**：续费异常 / 权限排查 / 安全事件 / 试用升级 / 账单争议 / SLA 投诉

```yaml
# resources/skills/vip_renewal_anomaly.md
---
id: vip_renewal_anomaly
name: VIP客户续费异常处理
category: ticket_handling
tags: [VIP, 续费, 风控, 支付失败]
tools: [ticket.account.query]
---
# SOP / 领域规则 / 提示词模板 / 输出规范
```

<!-- 截图占位：Skill 管理页面，展示 Skill 列表和编辑器 -->
> 📸 *[截图占位] Skill 管理页 — 查看/编辑 Skill 的 SOP、规则和模板*

---

### 4. 实时思考过程

通过 SSE（Server-Sent Events）实时推送 Agent 执行状态到前端对话界面：

- 📋 Workflow 启动 → ▶️ 节点进入/退出 → 🤖 Agent 启动/完成 → ✅ 节点完成
- 每种拓扑有定制化的步骤信息（辩论轮次、Leader-Worker 三阶段、顺序步骤）
- 自动滚到底部，流式逐字打字效果输出回复
- 内容过滤器自动拦截 JSON 代码块、敏感凭证等

<!-- 截图占位：对话界面，展示思考过程展开 + 打字效果 -->
> 📸 *[截图占位] 对话界面 — 思考过程实时展开 + 打字效果 + 底部 Skill 标注*

---

### 5. Skill 自进化

每次使用 Skill 执行任务后，LLM 自动检查 Skill 是否需要更新：

```
执行完成 → LLM 评估（SOP是否过时？规则是否需要更新？）
  → 发现问题 → 生成变更建议（PENDING_REVIEW）
    → 管理员审核 → 通过后自动合并更新
    → 拒绝 → 丢弃
```

<!-- 截图占位：Skill 进化建议审核面板 -->
> 📸 *[截图占位] Skill 进化建议审核 — 查看建议原文 vs 建议改法*

---

### 6. 可视化构建与管理  

**可视化 Workflow 构建器**：  
- 模板选择 → 下拉配置节点 → 连线定义 → 保存运行，完全无需手写 JSON
- Agent Team / Skill / 策略类型全部通过下拉选择

**Workflow 全景视图**：  
- 横向前端显示完整 DAG 节点流转
- 展开 Agent Team → 查看每个 Agent 的角色、工具、策略
- 边定义 + 数据流转描述

<!-- 截图占位：可视化构建器页面 -->
> 📸 *[截图占位] 可视化构建器 — 节点编排 + 策略选择 + Team 下拉*

---

### 7. 演示数据与一键 Demo

- **12 个账号**、14 条支付记录、14 条工单，覆盖续费/权限/安全/试用/账单/SLA 6 种真实业务场景
- **一键创建全流程 Demo**：自动创建 Agent Team + Workflow + 对话绑定 + 5 条提示词模板
- 5 条提示词覆盖所有业务场景，点击即可发送测试

<!-- 截图占位：一键创建 Demo 按钮 + 对话绑定提示词 -->
> 📸 *[截图占位] 对话页面 — 选 WORKFLOW 模式查看 Demo 链路和提示词模板*

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 后端框架 | Java 17, Spring Boot 3.5.7, Maven 多模块 |
| 前端 | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| ORM | MyBatis-Plus |
| 数据库 | PostgreSQL + pgvector（向量检索） |
| 向量数据库 | Milvus |
| 缓存/分布式 | Redis, Redisson（分布式锁 + 信号量） |
| 消息队列 | RocketMQ |
| 认证 | Sa-Token（Redis 会话 + 权限） |
| 文档解析 | Apache Tika（PDF/Word/PPT）+ Markdown |
| AI 基础设施 | 多 Provider Chat/Embedding/Rerank（Ollama/SiliconFlow/BaiLian），三态熔断器，首包探测，优先级降级 |
| MCP | io.modelcontextprotocol.sdk（本地 + 远程工具统一注册） |
| SSE | SseEmitter + TransmittableThreadLocal（流式 + Agent 状态实时推送） |
| 线程池 | 10 个专用线程池 + Alibaba TTL 上下文透传 |

---

## 快速启动

### 1. 环境要求
- JDK 17+
- Maven 3.6+
- PostgreSQL 14+（需安装 pgvector 扩展）
- Redis
- Node.js 18+

### 2. 后端启动
```bash
# 配置数据库和 Redis 连接（application.yml）
# 运行数据库迁移脚本
psql -h localhost -U postgres -d ragent -f resources/database/schema_pg.sql
psql -h localhost -U postgres -d ragent -f resources/database/upgrade_v1.2_to_v1.3_agent_workflow.sql
psql -h localhost -U postgres -d ragent -f resources/database/upgrade_v1.3_to_v1.4_multi_agent.sql
psql -h localhost -U postgres -d ragent -f resources/database/upgrade_v1.4_to_v1.5_skill.sql
psql -h localhost -U postgres -d ragent -f resources/database/upgrade_v1.5_to_v1.6_demo_data_plus.sql

# 编译运行
mvn clean compile -pl bootstrap
mvn spring-boot:run -pl bootstrap
```

### 3. 前端启动
```bash
cd frontend
npm install
npm run dev
```

### 4. 一键创建 Demo 链路
1. 访问 `http://localhost:5173/admin` → Workflow 管理 → 可视化构建
2. 点击 **"🎬 一键创建VIP工单全流程Demo"**
3. 自动创建 Agent Team + Workflow + 对话绑定
4. 切换到聊天页 → WORKFLOW 模式 → 选"VIP工单全流程 Demo" → 点击提示词开始测试

---

## 项目结构

```
ragent/
├── bootstrap/          # 主应用 - 所有业务逻辑
│   └── src/main/java/com/nageoffer/ai/ragent/
│       ├── agent/
│       │   ├── multiagent/      # 🆕 Multi-Agent 引擎
│       │   │   ├── core/        # AgentRunner, Orchestrator, MergeEngine
│       │   │   ├── topology/    # PARALLEL/SEQUENTIAL/DEBATE/HIERARCHICAL
│       │   │   ├── domain/      # AgentConfig, ExecutionContext, Result
│       │   │   └── dao/         # 5张某表
│       │   ├── skill/           # 🆕 结构化 Skill 体系
│       │   │   ├── core/        # SkillLoader, SkillService, EvolutionEvaluator
│       │   │   ├── controller/  # Skill CRUD + 审核 API
│       │   │   └── dao/         # Skill + Suggestion 表
│       │   └── workflow/        # Workflow 引擎（原有 + 扩展）
│       └── rag/
│           ├── service/
│           │   ├── workflow/    # 🆕 WorkflowChatRouter（对话Skill匹配）
│           │   └── filter/      # 🆕 内容过滤器
│           └── config/          # 10 线程池配置
├── framework/          # 基础设施层
├── infra-ai/           # AI Provider 抽象层
├── frontend/           # React 前端
│   └── src/
│       ├── pages/admin/workflows/  # WorkflowBuilder, Overview, AgentTeam
│       ├── pages/admin/skills/     # Skill 管理页
│       ├── services/              # multiAgentService, skillService
│       └── components/chat/       # MessageItem, ChatInput（思考过程+提示词）
├── resources/
│   ├── database/       # SQL 迁移脚本
│   └── skills/         # Skill .md 定义文件
└── docs/               # 文档 + 架构图
```

---

## 许可证

本项目基于 [Ragent AI](https://github.com/nageoffer/ragent)（© nageoffer, Apache 2.0 License）进行二次开发。

原创部分同样以 [Apache License 2.0](./LICENSE) 开源。

---

## 联系方式

- **在线体验**：http://liuguangyf.top
- **GitHub**：https://github.com/Swing-G/LiuGuang
- **原作者项目**：https://github.com/nageoffer/ragent
