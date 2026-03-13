import { spawn } from 'node:child_process';
import type {
  AIProvider,
  ProviderCapabilities,
  ProviderToolRequest,
  ProviderToolResponse,
  TestTask,
} from './types.js';

export class OpenCodeProvider implements AIProvider {
  name = 'opencode';
  command = 'opencode';
  available = false;
  priority = 95;
  capabilities: ProviderCapabilities = {
    supportedTestTypes: ['e2e', 'unit', 'integration', 'all'],
    supportedFrameworks: ['playwright', 'jest', 'vitest', 'mocha', 'cypress'],
    maxConcurrency: 4,
    canRunTests: true,
    canDebug: true,
    canAnalyze: true,
  };

  private apiKey?: string;
  private baseUrl?: string;

  constructor(config?: { apiKey?: string; baseUrl?: string }) {
    this.apiKey = config?.apiKey;
    this.baseUrl = config?.baseUrl;
    this.checkAvailability();
  }

  private async checkAvailability(): Promise<void> {
    this.available = !!(this.apiKey || this.baseUrl);
  }

  async executeTool(request: ProviderToolRequest): Promise<ProviderToolResponse> {
    if (!this.available) {
      return {
        success: false,
        output: '',
        error: 'OpenCode is not available (no API key or base URL configured)',
      };
    }

    try {
      switch (request.tool) {
        case 'e2e_run_test': {
          const [testLocation, options] = request.args as [string, { retries?: number }?];
          const retries = options?.retries || 1;
          return await this.runTest(testLocation, retries);
        }

        case 'e2e_get_failure_report': {
          const [testLocation] = request.args as [string];
          return await this.getFailureReport(testLocation);
        }

        case 'e2e_triage_e2e': {
          const [testPath] = request.args as [string];
          return await this.triageTests(testPath);
        }

        case 'e2e_get_stats': {
          return await this.getStats();
        }

        case 'e2e_get_evidence_bundle': {
          const [testLocation] = request.args as [string];
          return await this.getEvidenceBundle(testLocation);
        }

        default:
          return {
            success: false,
            output: '',
            error: `Unknown tool: ${request.tool}`,
          };
      }
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  canHandle(task: TestTask): boolean {
    return this.capabilities.supportedTestTypes.includes(task.testType) ||
           this.capabilities.supportedTestTypes.includes('all');
  }

  private async runTest(testLocation: string, retries: number): Promise<ProviderToolResponse> {
    try {
      const result = await this.callMCPTool('e2e_run_test', {
        location: testLocation,
        retries,
      });

      return {
        success: result.success || false,
        output: result.output || '',
        data: result.data,
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async getFailureReport(testLocation: string): Promise<ProviderToolResponse> {
    try {
      const result = await this.callMCPTool('e2e_get_failure_report', {
        location: testLocation,
      });

      return {
        success: true,
        output: JSON.stringify(result.data, null, 2),
        data: result.data,
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async triageTests(testPath: string): Promise<ProviderToolResponse> {
    try {
      const result = await this.callMCPTool('e2e_triage_e2e', {
        path: testPath || '.',
      });

      return {
        success: true,
        output: `Triage complete via OpenCode`,
        data: result.data,
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async getStats(): Promise<ProviderToolResponse> {
    try {
      const result = await this.callMCPTool('e2e_get_stats', {});

      return {
        success: true,
        output: 'Stats retrieved via OpenCode',
        data: result.data,
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async getEvidenceBundle(testLocation: string): Promise<ProviderToolResponse> {
    try {
      const result = await this.callMCPTool('e2e_get_evidence_bundle', {
        location: testLocation,
      });

      return {
        success: true,
        output: 'Evidence bundle collected via OpenCode',
        data: result.data,
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Call MCP tool - stub implementation, TODO: implement actual MCP protocol communication
   * This would connect to OpenCode MCP server and execute tools
   */
  private async callMCPTool(toolName: string, args: Record<string, unknown>): Promise<{
    success: boolean;
    output?: string;
    data?: unknown;
    error?: string;
  }> {
    if (!this.baseUrl) {
      throw new Error('OpenCode base URL not configured');
    }

    return {
      success: true,
      output: `Executed ${toolName} via OpenCode`,
      data: {
        tool: toolName,
        args,
        timestamp: new Date().toISOString(),
      },
    };
  }

  private async executeOpenCodeCLI(args: string[], timeout: number = 5 * 60 * 1000): Promise<{
    stdout: string;
    stderr: string;
  }> {
    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';

      const child = spawn('opencode', args, {
        env: {
          ...process.env,
          ...(this.apiKey && { OPENCODE_API_KEY: this.apiKey }),
        },
      });

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          reject(new Error(`OpenCode CLI exited with code ${code}: ${stderr}`));
        }
      });

      const timeoutId = setTimeout(() => {
        child.kill('SIGTERM');
        reject(new Error(`OpenCode CLI timeout after ${timeout}ms`));
      }, timeout);

      child.on('close', () => {
        clearTimeout(timeoutId);
      });
    });
  }
}
