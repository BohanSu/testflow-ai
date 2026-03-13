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

export class AiderProvider implements AIProvider {
  name = 'aider';
  command = 'aider';
  available = false;
  priority = 85;
  capabilities: ProviderCapabilities = {
    supportedTestTypes: ['e2e', 'unit', 'integration', 'all'],
    supportedFrameworks: ['pytest', 'unittest', 'playwright', 'cypress'],
    maxConcurrency: 2,
    canRunTests: true,
    canDebug: true,
    canAnalyze: true,
  };

  private apiKey?: string;
  private model?: string;

  constructor(config?: { apiKey?: string; model?: string }) {
    this.apiKey = config?.apiKey;
    this.model = config?.model || 'gpt-4';
    this.checkAvailability();
  }

  private async checkAvailability(): Promise<void> {
    try {
      await execAsync('which aider');
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
        error: 'Aider CLI is not available',
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
    const env = {
      ...process.env,
      ...(this.apiKey && { OPENAI_API_KEY: this.apiKey }),
    };

    try {
      const testCmd = `python -m pytest ${testLocation} ${retries > 1 ? `--count=${retries}` : ''} -v`;

      const { stdout, stderr } = await execAsync(testCmd, {
        env,
        timeout: 5 * 60 * 1000,
      });

      if ((stdout.includes('FAILED') || stderr.includes('FAILED')) && this.apiKey) {
        const analysis = await this.analyzeWithAider(testLocation, stdout + stderr);
        return {
          success: false,
          output: stdout + '\n\nAider Analysis:\n' + analysis,
          data: {
            retries,
            testLocation,
            aiderAnalysis: analysis,
          },
        };
      }

      return {
        success: !stdout.includes('FAILED') && !stderr.includes('FAILED'),
        output: stdout,
        data: {
          retries,
          testLocation,
        },
      };
    } catch (error) {
      if (this.apiKey && error instanceof Error) {
        try {
          const analysis = await this.analyzeWithAider(testLocation, error.message);
          return {
            success: false,
            output: error.message + '\n\nAider Analysis:\n' + analysis,
            data: {
              retries,
              testLocation,
              aiderAnalysis: analysis,
            },
          };
        } catch {
        }
      }

      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async getFailureReport(testLocation: string): Promise<ProviderToolResponse> {
    if (!this.apiKey) {
      return {
        success: false,
        output: '',
        error: 'Aider requires API key for failure report generation',
      };
    }

    try {
      const env = { ...process.env, OPENAI_API_KEY: this.apiKey };

      const { stdout, stderr } = await execAsync(`python -m pytest ${testLocation} -v`, {
        env,
        timeout: 5 * 60 * 1000,
      });

      const analysis = await this.analyzeWithAider(testLocation, stdout + stderr);

      return {
        success: true,
        output: analysis,
        data: {
          testOutput: stdout + stderr,
          analysis,
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

  private async triageTests(testPath: string): Promise<ProviderToolResponse> {
    if (!this.apiKey) {
      return {
        success: false,
        output: '',
        error: 'Aider requires API key for test triage',
      };
    }

    try {
      const env = { ...process.env, OPENAI_API_KEY: this.apiKey };

      const { stdout, stderr } = await execAsync(
        `python -m pytest ${testPath || '.'} -v --tb=short`,
        { env, timeout: 10 * 60 * 1000 }
      );

      const triage = await this.triageWithAider(testPath || '.', stdout + stderr);

      return {
        success: true,
        output: triage.summary,
        data: triage,
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
    if (!this.apiKey) {
      return {
        success: false,
        output: '',
        error: 'Aider requires API key for stats generation',
      };
    }

    try {
      const env = { ...process.env, OPENAI_API_KEY: this.apiKey };

      const { stdout, stderr } = await execAsync(
        'python -m pytest --collect-only -q',
        { env, timeout: 2 * 60 * 1000 }
      );

      return {
        success: true,
        output: 'Stats retrieved',
        data: {
          collection: stdout + stderr,
          provider: 'aider',
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

  private async getEvidenceBundle(testLocation: string): Promise<ProviderToolResponse> {
    if (!this.apiKey) {
      return {
        success: false,
        output: '',
        error: 'Aider requires API key for evidence bundle',
      };
    }

    try {
      const env = { ...process.env, OPENAI_API_KEY: this.apiKey };

      const { stdout, stderr } = await execAsync(
        `python -m pytest ${testLocation} -vv --tb=long`,
        { env, timeout: 5 * 60 * 1000 }
      );

      const evidence = await this.generateEvidenceWithAider(
        testLocation,
        stdout + stderr
      );

      return {
        success: true,
        output: 'Evidence bundle generated',
        data: evidence,
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async analyzeWithAider(testLocation: string, output: string): Promise<string> {
    const env = { ...process.env, OPENAI_API_KEY: this.apiKey };

    const analysisPrompt = `
Analyze the following test failure and provide:
1. Root cause analysis
2. Suggested fix
3. Additional context needed

Test: ${testLocation}

Output:
${output}
`;

    const { stdout } = await execAsync(
      `echo ${JSON.stringify(analysisPrompt)} | aider --model ${this.model} --read --message stdin`,
      { env, timeout: 3 * 60 * 1000 }
    );

    return stdout;
  }

  private async triageWithAider(
    testPath: string,
    output: string
  ): Promise<{
    summary: string;
    failures: Array<{ test: string; category: string; suggestion: string }>;
  }> {
    const env = { ...process.env, OPENAI_API_KEY: this.apiKey };

    const triagePrompt = `
Triage the following test failures and classify each as:
- app-bug: Application code issue
- test-issue: Test code issue
- flaky: Intermittent failure
- config-issue: Configuration or environment issue

Test Path: ${testPath}

Output:
${output}

Format as JSON:
{
  "summary": "Overall triage summary",
  "failures": [
    { "test": "test_name", "category": "category", "suggestion": "suggestion" }
  ]
}
`;

    const { stdout } = await execAsync(
      `echo ${JSON.stringify(triagePrompt)} | aider --model ${this.model} --read --message stdin`,
      { env, timeout: 5 * 60 * 1000 }
    );

    try {
      return JSON.parse(stdout);
    } catch {
      return {
        summary: stdout,
        failures: [],
      };
    }
  }

  private async generateEvidenceWithAider(
    testLocation: string,
    output: string
  ): Promise<{
    testLocation: string;
    output: string;
    analysis: string;
    reproductionSteps: string[];
  }> {
    const env = { ...process.env, OPENAI_API_KEY: this.apiKey };

    const evidencePrompt = `
Generate an evidence bundle for the following test failure including:
1. Detailed error description
2. Step-by-step reproduction
3. Expected vs actual behavior
4. Relevant code snippets

Test: ${testLocation}

Output:
${output}

Format as JSON:
{
  "testLocation": "...",
  "output": "...",
  "analysis": "...",
  "reproductionSteps": ["step1", "step2", ...]
}
`;

    const { stdout } = await execAsync(
      `echo ${JSON.stringify(evidencePrompt)} | aider --model ${this.model} --read --message stdin`,
      { env, timeout: 5 * 60 * 1000 }
    );

    try {
      return JSON.parse(stdout);
    } catch {
      return {
        testLocation,
        output,
        analysis: stdout,
        reproductionSteps: [],
      };
    }
  }
}
