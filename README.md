# TestFlow AI - Multi-AI Testing Platform / 多 AI 测试平台

![TestFlow AI](https://img.shields.io/badge/TestFlow-AI-brightgreen)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Test Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen.svg)](https://github.com/BohanSu/testflow-ai)

**Next-generation AI-powered Playwright testing platform with multi-provider orchestration, real-time TUI dashboard, and advanced failure analysis.**
**下一代 AI 驱动的 Playwright 测试平台，支持多提供商编排、实时 TUI 仪表板和高级故障分析。**

---

## 📚 Table of Contents / 目录

- [What is TestFlow AI? / 什么是 TestFlow AI?](#what-is-testflow-ai--什么是-testflow-ai)
- [Why TestFlow AI? / 为什么选择 TestFlow AI?](#why-testflow-ai--为什么选择-testflow-ai)
- [Architecture / 架构](#architecture--架构)
- [Features / 功能特性](#features--功能特性)
- [Quick Start / 快速开始](#quick-start--快速开始)
- [Multi-AI Providers / 多 AI 提供商](#multi-ai-providers--多-ai-提供商)
- [TUI Dashboard / TUI 仪表板](#tui-dashboard--tui-仪表板)
- [Contributing / 贡献](#contributing--贡献)
- [License / 许可证](#license--许可证)

---

## 🎯 What is TestFlow AI? / 什么是 TestFlow AI?

### English

TestFlow AI extends [playwright-autopilot](https://github.com/kaizen-yutani/playwright-autopilot) to support **multiple AI CLI providers**, not just Claude Code. It transforms how you test AI-powered applications by:

- **Multi-AI Provider Orchestration** — Route test fixing across Cursor CLI, Gemini CLI, OpenCode, and more
- **Real-Time TUI Dashboard** — Rust + Ratatui terminal dashboard for live monitoring
- **Advanced Failure Analysis** — Detect flaky tests, categorize failures, track patterns
- **CI/CD Platform Integration** — Native adapters for GitHub Actions, GitLab CI, Jenkins

### 中文

TestFlow AI 扩展了 [playwright-autopilot](https://github.com/kaizen-yutani/playwright-autopilot) 以支持**多个 AI CLI 提供商**，而不仅仅是 Claude Code。它通过以下方式改变了您测试 AI 驱动应用程序的方式：

- **多 AI 提供商编排** — 在 Cursor CLI、Gemini CLI、OpenCode 等之间路由测试修复
- **实时 TUI 仪表板** — Rust + Ratatui 终端仪表板，用于实时监控
- **高级故障分析** — 检测不稳定测试、分类故障、跟踪模式
- **CI/CD 平台集成** — GitHub Actions、GitLab CI、Jenkins 的原生适配器

---

## 💡 Why TestFlow AI? / 为什么选择 TestFlow AI?

### English

#### Problem 1: Single-Vendor Lock-In

Playwright-autopilot works great with Claude Code, but what about:
- Teams using Cursor IDE?
- Google Gemini CLI adopters?
- OpenCode MCP users?
- Aider pytest integrators?

**Solution:** Multi-provider orchestration routes each test to the optimal AI.

#### Problem 2: Test Failure Blindness

When tests fail, you waste hours investigating:
- Is it a flaky test or real bug?
- What's the failure pattern?
- Has this happened before?

**Solution:** AI-powered failure analysis detects patterns and provides actionable insights.

#### Problem 3: CI Bottlenecks

Manual triaging in CI pipelines is slow:
- Which tests to re-run?
- When to block deployment?
- How to report to developers?

**Solution:** Automated triaging with intelligent rerouting and reporting.

### 中文

#### 问题 1：单一供应商锁定

Playwright-autopilot 与 Claude Code 配合得很好，但对于以下情况呢：
- 使用 Cursor IDE 的团队？
- Google Gemini CLI 采用者？
- OpenCode MCP 用户？
- Aider pytest 集成者？

**解决方案：** 多提供商编排将每个测试路由到最优的 AI。

#### 问题 2：测试故障盲区

当测试失败时，您会浪费数小时调查：
- 是不稳定测试还是真正的错误？
- 故障模式是什么？
- 这之前发生过吗？

**解决方案：** AI 驱动的故障分析检测模式并提供可操作的见解。

#### 问题 3：CI 瓶颈

CI 流水线中的人工分类很慢：
- 要重新运行哪些测试？
- 何时阻止部署？
- 如何向开发人员报告？

**解决方案：** 具有智能重新路由和报告的自动分类。

---

## 🏗️ Architecture / 架构

### English

```
testflow-ai/
├── core/              # Multi-AI provider orchestration (CLI)
├── analyzer/          # Failure pattern analysis + coverage
├── test-playwright/   # Extended playwright-autopilot MCP tools
├── dashboard/         # Rust + Ratatui TUI dashboard
└── ci/                # CI platform adapters
```

**Data Flow:**

```
CLI ──► Provider Manager ──► Multiple AI Providers
                           ├─ Cursor CLI
                           ├─ Gemini CLI
                           ├─ OpenCode MCP
                           └─ Aider pytest

Analyzer (patterns, flaky detection, categorization)

CI Adapters (GitHub, GitLab, Jenkins)

Dashboard (real-time monitoring)
```

### 中文

```
testflow-ai/
├── core/              # 多 AI 提供商编排 (CLI)
├── analyzer/          # 故障模式分析 + 覆盖率
├── test-playwright/   # 扩展的 playwright-autopilot MCP 工具
├── dashboard/         # Rust + Ratatui TUI 仪表板
└── ci/                # CI 平台适配器
```

**数据流：**

```
CLI ──► 提供商管理器 ──► 多个 AI 提供商
                          ├─ Cursor CLI
                          ├─ Gemini CLI
                          ├─ OpenCode MCP
                          └─ Aider pytest

分析器（模式、不稳定检测、分类）

CI 适配器（GitHub、GitLab、Jenkins）

仪表板（实时监控）
```

---

## ✨ Features / 功能特性

### English

#### 🤖 Multi-AI Provider Support

TestFlow AI automatically routes test fixing to the most capable AI provider:

| Provider | Best For | Strengths |
|----------|----------|-----------|
| **Cursor CLI** | E2E UI Testing | Visual context, browser-aware |
| **Gemini CLI** | Unit/Integration Tests | Google's multimodal AI |
| **OpenCode MCP** | General Code Repair | OpenAI GPT-4 tools |
| **Aider pytest** | Test Code Only | Specialized pytest runner |

**Smart Routing Criteria:**
- Test category (E2E, unit, integration)
- Language/framework match
- Token cost optimization
- Provider availability

#### 🧠 Intelligent Triaging

Classify failures automatically:

| Category | Description | Action |
|----------|-------------|--------|
| **Application Bug** | Real issue in production code | Auto-create GitHub issue |
| **Test Code Issue** | Test logic/flakiness problem | Fix automatically |
| **Flaky Test** | Non-deterministic failure | Detect statistically |
| **Known Issue** | Already reported | Cross-reference, skip triage |

#### 📊 Real-Time TUI Dashboard

Built with **Rust + Ratatui** for maximum performance:

**Three Tabs:**
1. **Test Runs** — Live status of all test executions
2. **Failures** — Deep dive into issues with heatmaps
3. **Coverage** — Test coverage trends and gaps

**Features:**
- Interactive keyboard navigation
- Color-coded status indicators
- Real-time updates
- Export to CSV/JSON

### 中文

#### 🤖 多 AI 提供商支持

TestFlow AI 自动将测试修复路由到最 capable 的 AI 提供商：

| 提供商 | 最适合 | 优势 |
|--------|--------|------|
| **Cursor CLI** | E2E UI 测试 | 视觉上下文、浏览器感知 |
| **Gemini CLI** | 单元/集成测试 | Google 的多模态 AI |
| **OpenCode MCP** | 通用代码修复 | OpenAI GPT-4 工具 |
| **Aider pytest** | 仅测试代码 | 专用 pytest 运行器 |

**智能路由标准：**
- 测试类别（E2E、单元、集成）
- 语言/框架匹配
- Token 成本优化
- 提供商可用性

#### 🧠 智能分类

自动分类故障：

| 类别 | 描述 | 操作 |
|------|------|------|
| **应用程序错误** | 生产代码中的真正问题 | 自动创建 GitHub 问题 |
| **测试代码问题** | 测试逻辑/不稳定问题 | 自动修复 |
| **不稳定测试** | 非确定性故障 | 统计检测 |
| **已知问题** | 已报告 | 交叉引用，跳过分类 |

#### 📊 实时 TUI 仪表板

使用 **Rust + Ratatui** 构建，以实现最大性能：

**三个标签页：**
1. **测试运行** — 所有测试执行的实时状态
2. **故障** — 使用热图深入探讨问题
3. **覆盖率** — 测试覆盖率趋势和差距

**功能：**
- 交互式键盘导航
- 彩色状态指示器
- 实时更新
- 导出到 CSV/JSON

---

## 📦 Installation / 安装

### English

#### From npm (Recommended)

```bash
npm install -g testflow-ai
```

#### From Source

```bash
git clone https://github.com/BohanSu/testflow-ai.git
cd testflow-ai
npm install
npm run build
npm link
```

#### Rust TUI Dashboard (Optional)

```bash
cd dashboard
cargo build --release
```

Binary location: `dashboard/target/release/tflow`

### 中文

#### 从 npm（推荐）

```bash
npm install -g testflow-ai
```

#### 从源码

```bash
git clone https://github.com/BohanSu/testflow-ai.git
cd testflow-ai
npm install
npm run build
npm link
```

#### Rust TUI 仪表板（可选）

```bash
cd dashboard
cargo build --release
```

二进制位置：`dashboard/target/release/tflow`

---

## 🚀 Quick Start / 快速开始

### English

#### Step 1: Initialize in Playwright Project

```bash
cd my-playwright-app
testflow init
```

#### Step 2: Run Tests with Multi-AI Providers

```bash
# Run with all configured providers
testflow run

# Run with specific providers
testflow run --providers cursor gemini
```

#### Step 3: Launch TUI Dashboard

```bash
tflow
```

#### Step 4: Triage Failures

```bash
testflow triage
```

### 中文

#### 第一步：在 Playwright 项目中初始化

```bash
cd my-playwright-app
testflow init
```

#### 第二步：使用多 AI 提供商运行测试

```bash
# 使用所有配置的提供商运行
testflow run

# 使用特定提供商运行
testflow run --providers cursor gemini
```

#### 第三步：启动 TUI 仪表板

```bash
tflow
```

#### 第四步：分类故障

```bash
testflow triage
```

---

## 🤖 Multi-AI Providers / 多 AI 提供商

### English

#### Cursor CLI Integration

**Best For:** E2E UI tests with visual context

**Strengths:**
- Visual IDE integration
- Browser-aware context
- Excellent for UI/UX testing

#### Gemini CLI Integration

**Best For:** Unit and integration tests

**Strengths:**
- Google's multimodal AI
- Strong on logic and state management
- Good for complex test scenarios

### 中文

#### Cursor CLI 集成

**最适合：** 具有视觉上下文的 E2E UI 测试

**优势：**
- 视觉 IDE 集成
- 浏览器感知上下文
- 非常适合 UI/UX 测试

#### Gemini CLI 集成

**最适合：** 单元和集成测试

**优势：**
- Google 的多模态 AI
- 在逻辑和状态管理方面很强
- 适合复杂的测试场景

---

## 🖥️ TUI Dashboard / TUI 仪表板

### English

**Built with Rust + Ratatui for maximum performance.**

#### Launch Dashboard

```bash
tflow
```

#### Keyboard Controls

| Key | Action |
|-----|--------|
| `Tab` | Switch between tabs |
| `↑/↓` | Navigate list |
| `Enter` | View details |
| `r` | Refresh data |
| `q` / `Esc` | Quit |
| `1/2/3` | Jump to specific tab |

### 中文

**使用 Rust + Ratatui 构建，以实现最大性能。**

#### 启动仪表板

```bash
tflow
```

#### 键盘控制

| 键 | 操作 |
|-----|------|
| `Tab` | 在标签之间切换 |
| `↑/↓` | 导航列表 |
| `Enter` | 查看详细信息 |
| `r` | 刷新数据 |
| `q` / `Esc` | 退出 |
| `1/2/3` | 跳转到特定标签 |

---

## 🛠️ Development / 开发

### English

#### Prerequisites

- Node.js >= 18
- npm >= 9
- Rust 1.70+ (optional, for dashboard)

#### Setup

```bash
npm install
npm run build
npm test
npm run lint
```

### 中文

#### 前置要求

- Node.js >= 18
- npm >= 9
- Rust 1.70+（可选，用于仪表板）

#### 设置

```bash
npm install
npm run build
npm test
npm run lint
```

---

## 📊 Test Results / 测试结果

### English

```
Module          Tests    Status
--------------  --------  --------
Core            22/22    ✅ 100%
Analyzer        28/28    ✅ 100%
Test-Playwright 19/19    ✅ 100%
CI              13/13    ✅ 100%
--------------  --------  --------
Total           82/82    ✅ 100%
```

### 中文

```
模块            测试      状态
--------------  --------  --------
Core            22/22    ✅ 100%
Analyzer        28/28    ✅ 100%
Test-Playwright 19/19    ✅ 100%
CI              13/13    ✅ 100%
--------------  --------  --------
总计            82/82    ✅ 100%
```

---

## 🤝 Contributing / 贡献

### English

Contributions are welcome!

1. Fork the repository
2. Create a feature branch
3. Write tests for new features
4. Ensure all tests pass (100% coverage required)
5. Submit a Pull Request

### 中文

欢迎贡献！

1. Fork 该仓库
2. 创建功能分支
3. 为新功能编写测试
4. 确保所有测试通过（需要 100% 覆盖率）
5. 提交 Pull Request

---

## 📄 License / 许可证

MIT License - see [LICENSE](LICENSE) file.

MIT 许可证 - 参见 [LICENSE](LICENSE) 文件。

---

## 🙏 Acknowledgments / 致谢

### English

Built on:
- [playwright-autopilot](https://github.com/kaizen-yutani/playwright-autopilot) by kaizen-yutani (37 MCP tools)
- [Playwright](https://playwright.dev/) by Microsoft (84K stars)
- [Ratatui](https://github.com/ratatui-org/ratatui) (19K stars)
- [Commander.js](https://github.com/tj/commander.js)

### 中文

基于：
- [playwright-autopilot](https://github.com/kaizen-yutani/playwright-autopilot) 作者 kaizen-yutani（37 个 MCP 工具）
- [Playwright](https://playwright.dev/) 作者 Microsoft（8.4 万星）
- [Ratatui](https://github.com/ratatui-org/ratatui)（1.9 万星）
- [Commander.js](https://github.com/tj/commander.js)

---

## 📞 Support / 支持

### English
- 📖 [Documentation](https://github.com/BohanSu/testflow-ai)
- 🐛 [Issue Tracker](https://github.com/BohanSu/testflow-ai/issues)
- 💬 [Discussions](https://github.com/BohanSu/testflow-ai/discussions)

### 中文
- 📖 [文档](https://github.com/BohanSu/testflow-ai)
- 🐛 [问题追踪](https://github.com/BohanSu/testflow-ai/issues)
- 💬 [讨论](https://github.com/BohanSu/testflow-ai/discussions)

---

**Orchestrate AI-powered testing with ease! 🚀**
**轻松编排 AI 驱动的测试！🚀**
