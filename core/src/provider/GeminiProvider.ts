import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import type {
  AIProvider,
  ProviderCapabilities,
  ProviderToolRequest,
  ProviderToolResponse,
  TestTask,
} from './types.js';

const execAsync = promisify(exec);

export class GeminiProvider implements AIProvider {
  name = 'gemini';
  command = 'gemini';
  available = false;
  priority = 90;
  capabilities: ProviderCapabilities = {
    supportedTestTypes: ['e2e', 'unit', 'integration', 'all'],
    supportedFrameworks: ['playwright', 'jest', 'vitest', 'cypress'],
    maxConcurrency: 2,
    canRunTests: true,
    canDebug: true,
    canAnalyze: true,
  };

  private apiKey?: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
    this.checkAvailability();
  }

  private async checkAvailability(): Promise<void> {
    try {
      await execAsync('which gemini');
      this.available = true;
    } catch {
      this.available = false;
    }
  }

  async executeTool(request: ProviderToolRequest): Promise<ProviderToolResponse> {
    if (!this.available) {
      return {
        success: false,
        output: '',
        error: 'Gemini CLI is not available',
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
    const env = this.apiKey ? { ...process.env, GEMINI_API_KEY: this.apiKey } : process.env;

    try {
      const { stdout, stderr } = await execAsync(
        `gemini test run ${testLocation} ${retries > 1 ? `--retries=${retries}` : ''}`,
        { env, timeout: 5 * 60 * 1000 }
      );

      return {
        success: !stderr.includes('ERROR') && !stderr.includes('FAIL'),
        output: stdout,
        data: {
          retries,
          testLocation,
        },
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
    const env = this.apiKey ? { ...process.env, GEMINI_API_KEY: this.apiKey } : process.env;

    try {
      const { stdout, stderr } = await execAsync(
        `gemini test report ${testLocation} --format=json`,
        { env, timeout: 2 * 60 * 1000 }
      );

      return {
        success: true,
        output: stdout,
        data: JSON.parse(stdout),
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
    const env = this.apiKey ? { ...process.env, GEMINI_API_KEY: this.apiKey } : process.env;

    try {
      const { stdout } = await execAsync(
        `gemini test triage ${testPath || '.'} --output=json`,
        { env, timeout: 10 * 60 * 1000 }
      );

      const triageData = JSON.parse(stdout);
      return {
        success: true,
        output: `Triage complete: ${triageData.total} tests analyzed`,
        data: triageData,
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
    const env = this.apiKey ? { ...process.env, GEMINI_API_KEY: this.apiKey } : process.env;

    try {
      const { stdout } = await execAsync(
        'gemini test stats --format=json',
        { env, timeout: 2 * 60 * 1000 }
      );

      return {
        success: true,
        output: 'Stats retrieved',
        data: JSON.parse(stdout),
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
    const env = this.apiKey ? { ...process.env, GEMINI_API_KEY: this.apiKey } : process.env;

    try {
      const { stdout } = await execAsync(
        `gemini test evidence ${testLocation} --format=json`,
        { env, timeout: 3 * 60 * 1000 }
      );

      return {
        success: true,
        output: 'Evidence bundle collected',
        data: JSON.parse(stdout),
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
