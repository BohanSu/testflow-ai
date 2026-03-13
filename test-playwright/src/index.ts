import { existsSync } from 'node:fs';
import { join } from 'node:path';

export interface ProviderTestConfig {
  providerName: string;
  model?: string;
  apiKey?: string;
  endpoint?: string;
}

export interface MultiProviderRunOptions {
  tests: string[];
  providers: string[];
  failFast?: boolean;
  retries?: number;
  testType?: 'e2e' | 'unit' | 'integration';
}

export interface TestResult {
  test: string;
  provider: string;
  status: 'passed' | 'failed' | 'flaky' | 'error';
  startedAt: number;
  completedAt?: number;
  duration?: number;
  error?: string;
  evidence?: unknown;
  retries: number;
}

export interface EvidenceBundle {
  testLocation: string;
  provider: string;
  error: string;
  stackTrace?: string;
  actions: unknown[];
  failedNetworkRequests: unknown[];
  consoleErrors: unknown[];
  domSnapshot?: string;
  screenshot?: string;
  suggestedFix?: string;
}

export async function runTestsAcrossProviders(options: MultiProviderRunOptions): Promise<Map<string, TestResult[]>> {
  const results = new Map<string, TestResult[]>();
  const startTime = Date.now();

  const mcpAvailable = await checkPlaywrightAutopilotAvailable();

  if (!mcpAvailable) {
    console.warn('playwright-autopilot MCP server not available, using fallback implementation');
  }

  for (const provider of options.providers) {
    const providerResults: TestResult[] = [];

    for (const test of options.tests) {
      const result: TestResult = {
        test,
        provider,
        status: 'running',
        startedAt: Date.now(),
        retries: options.retries || 1,
      };

      try {
        if (mcpAvailable) {
          await executeWithMCP(result, options);
        } else {
          await executeFallback(result, options);
        }

        result.completedAt = Date.now();
        result.duration = result.completedAt - result.startedAt;

        providerResults.push(result);

        if (options.failFast && result.status === 'failed') {
          break;
        }
      } catch (error) {
        result.status = 'error';
        result.error = error instanceof Error ? error.message : String(error);
        result.completedAt = Date.now();
        result.duration = result.completedAt - result.startedAt;
        providerResults.push(result);

        if (options.failFast) {
          break;
        }
      }
    }

    if (providerResults.length > 0) {
      results.set(provider, providerResults);
    }
  }

  return results;
}

async function checkPlaywrightAutopilotAvailable(): Promise<boolean> {
  const workspaceRoot = process.cwd();

  const possiblePaths = [
    join(workspaceRoot, 'node_modules', 'playwright-autopilot', 'plugin', '.claude-plugin', 'tools'),
    join(workspaceRoot, '.mcp', 'playwright-autopilot', 'server', 'mcp-server.js'),
  ];

  return possiblePaths.some((path) => existsSync(path));
}

async function executeWithMCP(result: TestResult, options: MultiProviderRunOptions): Promise<void> {
  const retries = options.retries || 1;

  let attempts = 0;
  let passedCount = 0;

  for (let i = 0; i < retries; i++) {
    attempts++;

    const runResult = await callMCPTool('e2e_run_test', {
      location: result.test,
      retries: 0,
      provider: result.provider,
    });

    if (runResult.success) {
      passedCount++;
    }
  }

  if (passedCount === attempts) {
    result.status = 'passed';
  } else if (passedCount === 0) {
    result.status = 'failed';
    const failureReport = await callMCPTool('e2e_get_failure_report', {
      location: result.test,
      provider: result.provider,
    });
    result.error = failureReport.data?.error || 'Test failed';
    result.evidence = await collectEvidence(result.test, result.provider);
  } else {
    result.status = 'flaky';
    result.evidence = await collectEvidence(result.test, result.provider);
  }
}

async function executeFallback(result: TestResult, options: MultiProviderRunOptions): Promise<void> {
  const retries = options.retries || 1;

  let attempts = 0;
  let passedCount = 0;

  for (let i = 0; i < retries; i++) {
    attempts++;

    try {
      const { exec } = await import('node:child_process');
      const { promisify } = await import('node:util');
      const execAsync = promisify(exec);

      const { stdout, stderr } = await execAsync(
        `npx playwright test ${result.test} --reporter=json`,
        { timeout: 5 * 60 * 1000 }
      );

      const output = stdout + stderr;

      if (output.includes('passed') && !output.includes('failed')) {
        passedCount++;
      }
    } catch (error) {
      if (error instanceof Error && !error.message.includes('non-zero')) {
        throw error;
      }
    }
  }

  if (passedCount === attempts) {
    result.status = 'passed';
  } else if (passedCount === 0) {
    result.status = 'failed';
    result.error = 'Test failed (playwright-autopilot MCP not available for detailed report)';
  } else {
    result.status = 'flaky';
    result.error = `Test passed ${passedCount}/${attempts} times - indicates flakiness`;
  }
}

async function collectEvidence(testLocation: string, provider: string): Promise<EvidenceBundle> {
  const mcpAvailable = await checkPlaywrightAutopilotAvailable();

  if (!mcpAvailable) {
    return {
      testLocation,
      provider,
      error: 'playwright-autopilot MCP server not available',
      actions: [],
      failedNetworkRequests: [],
      consoleErrors: [],
    };
  }

  try {
    const bundle = await callMCPTool('e2e_get_evidence_bundle', {
      location: testLocation,
      provider,
    });

    return {
      testLocation,
      provider,
      error: bundle.data?.error || 'Test failed',
      stackTrace: bundle.data?.stackTrace,
      actions: bundle.data?.actions || [],
      failedNetworkRequests: bundle.data?.failedNetworkRequests || [],
      consoleErrors: bundle.data?.consoleErrors || [],
      domSnapshot: bundle.data?.domSnapshot,
      screenshot: bundle.data?.screenshot,
      suggestedFix: bundle.data?.suggestedFix,
    };
  } catch (error) {
    return {
      testLocation,
      provider,
      error: error instanceof Error ? error.message : 'Failed to collect evidence',
      actions: [],
      failedNetworkRequests: [],
      consoleErrors: [],
    };
  }
}

async function callMCPTool(toolName: string, args: Record<string, unknown>): Promise<{
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}> {
  try {
    const { exec } = await import('node:child_process');
    const { promisify } = await import('node:util');
    const execAsync = promisify(exec);

    const { stdout } = await execAsync(
      JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: args,
        },
      }),
      {
        timeout: 10 * 60 * 1000,
        env: {
          ...process.env,
          PW_PROJECT_DIR: process.env.PW_PROJECT_DIR || process.cwd(),
        },
      }
    );

    const response = JSON.parse(stdout);

    if (response.error) {
      return {
        success: false,
        error: response.error.message,
      };
    }

    return {
      success: true,
      data: response.result?.content?.[0]?.text
        ? JSON.parse(response.result.content[0].text as string)
        : undefined,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to call MCP tool',
    };
  }
}

export function getAvailableProviders(): string[] {
  return ['claude', 'cursor', 'gemini', 'opencode', 'aider'];
}

export async function discoverTests(testType: 'e2e' | 'unit' | 'integration' = 'e2e'): Promise<string[]> {
  const mcpAvailable = await checkPlaywrightAutopilotAvailable();

  if (mcpAvailable) {
    const result = await callMCPTool('e2e_list_tests', {
      filterType: testType,
    });

    if (result.success && result.data?.tests) {
      return result.data.tests as string[];
    }
  }

  const { glob } = await import('glob');

  const patterns: Record<string, string> = {
    e2e: '**/*.spec.ts',
    unit: '**/*.test.ts',
    integration: '**/*.integration.ts',
  };

  const files = await glob(patterns[testType], { cwd: process.cwd() });

  return files;
}

export async function generateReport(runResults: Map<string, TestResult[]>, outputPath: string): Promise<void> {
  const allResults = Array.from(runResults.values()).flat();

  const summary = {
    totalTests: allResults.length,
    passed: allResults.filter((r) => r.status === 'passed').length,
    failed: allResults.filter((r) => r.status === 'failed').length,
    flaky: allResults.filter((r) => r.status === 'flaky').length,
    errors: allResults.filter((r) => r.status === 'error').length,
    totalDuration: allResults.reduce((sum, r) => sum + (r.duration || 0), 0),
    providers: Array.from(runResults.keys()),
    resultsByProvider: Object.fromEntries(runResults),
  };

  const reportContent = JSON.stringify(summary, null, 2);

  const { writeFile } = await import('node:fs/promises');
  await writeFile(outputPath, reportContent, 'utf-8');
}
