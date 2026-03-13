# TestFlow AI

Multi-AI CLI Playwright testing and analysis platform - cross-provider test fixing, TUI dashboard, failure pattern analysis.

## Overview

TestFlow AI extends the **playwright-autopilot** ecosystem with multi-AI provider orchestration, enabling developers to run Playwright tests across multiple AI providers (Cursor CLI, Gemini CLI, OpenCode, Aider) simultaneously, with real-time monitoring, failure pattern analysis, and CI integration.

## Key Features

### 🔀 Multi-AI Provider Support
- **Cursor CLI** - AI-powered code editor with built-in test capabilities
- **Gemini CLI** - Google's AI for test analysis and triage
- **OpenCode** - Multi-agent orchestrator via MCP protocol
- **Aider** - AI pair programmer for Python/pytest tests

### 📊 Real-Time Monitoring
- Rust + Ratatui TUI dashboard for live test monitoring
- Provider metrics (success rate, duration, total runs)
- Failure heat maps and coverage trends
- Interactive keyboard navigation

### 🔍 Intelligent Analysis
- Flaky test detection with frequency tracking
- Failure pattern categorization (app-bug, test-issue, flaky, known-issue)
- Severity determination (high/medium/low)
- Evidence bundle generation for debugging

### 🔌 CI Integration
- GitHub Actions adapter (workflow management)
- GitLab CI adapter (pipeline integration)
- Jenkins adapter (build job management)

## Installation

```bash
npm install -g testflow-ai
```

Or install locally in your project:

```bash
npm install --save-dev testflow-ai
```

## Usage

### Run Tests with Multiple AI Providers

```bash
# Run with default providers (claude, cursor, gemini)
testflow run tests/e2e/

# Specify providers
testflow run tests/e2e/ --providers claude,cursor

# Enable parallel execution
testflow run tests/e2e/ --parallel

# Retry for flaky detection
testflow run tests/e2e/ --retries 3
```

### Triage Test Failures

```bash
# Triage all e2e tests
testflow triage tests/e2e/

# Triage specific test
testflow triage tests/checkout.spec.ts
```

### View Statistics

```bash
# Show test statistics
testflow stats

# Filter by provider
testflow stats --providers claude,gemini
```

### Launch TUI Dashboard

```bash
# From the testflow-ai directory
cd dashboard
cargo run --release
```

**Dashboard Controls:**
- `Tab` - Switch between Runs/Metrics/Coverage tabs
- `↑/↓` - Navigate through test runs
- `r` - Refresh data
- `q` - Quit

## Architecture

```
testflow-ai/
├── core/           # Multi-AI provider orchestration (CLI)
├── test-playwright/ # Playwright-autopilot extensions (MCP tools)
├── analyzer/       # Failure pattern analysis
├── ci/             # CI adapters (GitHub Actions, GitLab CI, Jenkins)
└── dashboard/      # Rust TUI dashboard (Ratatui)
```

## Modules

### Core (@testflow/core)
- ProviderManager: Multi-provider registration and orchestration
- Provider Adapters: Cursor, Gemini, OpenCode, Aider
- CLI: `testflow run/triage/stats` commands

### Test-Playwright (@testflow/test-playwright)
- MCP tool extensions from playwright-autopilot
- Multi-provider test execution
- Evidence bundle generation
- Report generation (JSON/HTML)

### Analyzer (@testflow/analyzer)
- Pattern detection algorithms
- Flaky test detection
- Failure categorization
- Severity determination

### CI (@testflow/ci)
- GitHub Actions adapter: Pipeline runs, status, PR integration
- GitLab CI adapter: Pipeline management, artifact collection
- Jenkins adapter: Build job control, test result extraction

### Dashboard (testflow-dashboard)
- Ratatui-based TUI with real-time updates
- Provider metrics tracking
- Coverage visualization
- IPC communication with Node.js CLI

## Configuration

### Provider Configuration

Create a `.testflowrc.json` in your project root:

```json
{
  "providers": {
    "claude": {
      "enabled": true,
      "priority": 100,
      "apiKey": "your-claude-api-key"
    },
    "cursor": {
      "enabled": true,
      "priority": 90,
      "apiKey": "your-cursor-api-key"
    },
    "gemini": {
      "enabled": true,
      "priority": 80,
      "apiKey": "your-gemini-api-key"
    },
    "opencode": {
      "enabled": false,
      "priority": 70,
      "baseUrl": "https://api.opencode.example.com"
    },
    "aider": {
      "enabled": false,
      "priority": 60,
      "apiKey": "your-openai-api-key",
      "model": "gpt-4"
    }
  }
}
```

### CI Configuration

```json
{
  "ci": {
    "github": {
      "owner": "your-org",
      "repo": "your-repo",
      "token": "your-github-token"
    },
    "gitlab": {
      "instanceUrl": "https://gitlab.example.com",
      "projectId": 12345,
      "token": "your-gitlab-token"
    },
    "jenkins": {
      "url": "https://jenkins.example.com",
      "job": "test-job",
      "token": "your-jenkins-token"
    }
  }
}
```

## API Usage

### Programmatically Run Tests

```typescript
import { ProviderManager, CursorProvider, GeminiProvider } from '@testflow/core';

const manager = new ProviderManager();
manager.registerProvider('cursor', new CursorProvider(apiKey));
manager.registerProvider('gemini', new GeminiProvider(apiKey));

const results = await manager.runTestsParallel({
  providers: ['cursor', 'gemini'],
  testType: 'e2e',
  parallelWorkers: 4
});
```

### Analyze Failures

```typescript
import { analyzeFailure, detectFlakyTests } from '@testflow/analyzer';

const failures = [
  {
    testPath: 'tests/e2e/checkout.spec.ts',
    failureType: 'application-bug',
    category: 'api-error',
    errorMessage: 'Network request failed',
    stackTrace: '...',
    occurredAt: new Date().toISOString(),
    provider: 'claude',
    duration: 5000
  }
];

const patterns = analyzeFailure(failures);
const flaky = detectFlakyTests(failures);
```

### CI Integration

```typescript
import { GitHubActionsAdapter } from '@testflow/ci';

const adapter = new GitHubActionsAdapter({
  owner: 'your-org',
  repo: 'your-repo',
  token: 'github-token'
});

const runs = await adapter.getLatestRuns(10);
const prs = await adapter.getPRs();
```

## Test Coverage

```
Core: 22/22 tests passing (100%) ✅
Analyzer: 28/28 tests passing (100%) ✅
Test-Playwright: 19/19 tests passing (100%) ✅
CI: 13/13 tests passing (100%) ✅

Total: 82/82 tests passing (100%) ✅
```

## Requirements

- Node.js 20+
- TypeScript 5.3+
- Rust 1.70+ (for dashboard TUI)
- Playwright project (for test-playwright module)

## Build

```bash
# Build all modules
npm run build

# Build individual modules
npm run build:core
npm run build:analyzer
npm run build:ci
npm run build:test-playwright
npm run build:dashboard  # Requires Rust
```

## Development

```bash
# Run tests
npm test

# Watch mode
npm run dev

# Lint
npm run lint
```

## License

MIT

## Contributing

Contributions welcome! Please read our contributing guidelines before submitting PRs.

## Credits

- Built on top of [playwright-autopilot](https://github.com/kaizen-yutani/playwright-autopilot) (9 stars, early project)
- Uses [Ratatui](https://github.com/ratatui-org/ratatui) (19K stars) for TUI dashboard
- Inspired by multi-agent testing patterns in the AI developer tools space
