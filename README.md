# TestFlow AI

Multi-AI CLI Playwright testing and analysis platform with cross-provider test fixing, TUI dashboard, failure pattern analysis.

## What is TestFlow AI?

TestFlow AI extends [playwright-autopilot](https://github.com/kaizen-yutani/playwright-autopilot) to support multiple AI CLI providers, not just Claude Code. It adds:
- **Multi-AI Provider Support**: Cursor CLI, Gemini CLI, OpenCode, and more
- **TUI Dashboard**: Real-time test visualization with Rust + Ratatui
- **Failure Pattern Analysis**: Detect flaky tests, common failure modes
- **Test Coverage Tracking**: Coverage metrics and gap analysis
- **CI Integration**: GitHub Actions, GitLab CI, Jenkins adapters
- **Comprehensive Reports**: HTML/PDF reports with actionable insights

## Quick Start

```bash
# Install
npm install -g testflow-ai

# Setup your Playwright project
cd my-playwright-app
testflow init

# Run tests with multiple AI providers
testflow test --providers claude cursor gemini
```

## Architecture

```
testflow-ai/
├── core/           # Main CLI + multi-AI provider orchestration
├── analyzer/      # Failure pattern analysis + coverage tracking
├── test-playwright/  # Extended playwright-autopilot MCP tools
├── dashboard/      # Rust + Ratatui TUI dashboard
└── ci/            # CI platform adapters
```

## Features

### Multi-AI Provider Support

TestFlow AI automatically routes test fixing to the most capable AI provider based on:
- Test category (E2E, unit, integration)
- Language/framework match
- Token cost optimization
- Provider availability

### Intelligent Triaging

Classify failures into:
- Application bugs (auto-report to issue tracker)
- Test code issues (fixes automatically)
- Flaky tests (detect with statistical analysis)
- Known issues (cross-reference existing tickets)

### TUI Dashboard

Real-time visualization with:
- Test run progress tracking
- Failure heat maps
- Coverage trends
- Provider performance metrics
- Interactive debugging

## Integration with play-autopilot

TestFlow AI builds upon playwright-autopilot's 37 MCP tools and extends them:
- All original Claude Code features preserved
- Additional tools for provider management
- Enhanced evidence gathering
- Multi-run orchestration

## License

MIT

## Credits

- Built on [playwright-autopilot](https://github.com/kaizen-yutani/playwright-autopilot) by kaizen-yutani
- Powered by [Playwright](https://playwright.dev/) by Microsoft
- TUI built with [Ratatui](https://github.com/ratatui-org/ratatui)
