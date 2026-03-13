import type { AIProvider, ProviderConfig, TestTask, ProviderExecutionResult } from './types.js';

export class ProviderManager {
  private providers: Map<string, AIProvider> = new Map();
  private config: Map<string, ProviderConfig> = new Map();

  constructor(config?: Record<string, ProviderConfig>) {
    if (config) {
      Object.entries(config).forEach(([name, cfg]) => {
        this.config.set(name, { enabled: true, priority: 100, command: 'auto', ...cfg });
      });
    }
  }

  registerProvider(name: string, provider: AIProvider): void {
    this.providers.set(name, provider);
  }

  configureProvider(name: string, config: ProviderConfig): void {
    this.config.set(name, config);
    const provider = this.providers.get(name);
    if (provider) {
      provider.available = config.enabled;
      provider.priority = config.priority;
      if (config.env) {
        // Env setting would be done at process level
      }
    }
  }

  getAvailableProviders(): AIProvider[] {
    return Array.from(this.providers.values())
      .filter((p) => p.available)
      .sort((a, b) => b.priority - a.priority);
  }

  findBestProvider(task: TestTask): AIProvider | null {
    const available = this.getAvailableProviders();

    for (const provider of available) {
      if (provider.canHandle(task)) {
        return provider;
      }
    }

    return available.length > 0 ? available[0] : null;
  }

  async executeTask(task: TestTask, providerName?: string): Promise<ProviderExecutionResult> {
    const provider = providerName
      ? this.providers.get(providerName)
      : this.findBestProvider(task);

    if (!provider) {
      throw new Error(`No available provider for task type: ${task.type}, testType: ${task.testType}`);
    }

    const startTime = Date.now();
    const result = await this.executeWithProvider(provider, task);
    const duration = Date.now() - startTime;

    return {
      providerName: provider.name,
      testLocation: task.testLocation || 'unknown',
      exitCode: result.success ? 0 : 1,
      output: result.output,
      duration,
    };
  }

  private async executeWithProvider(
    provider: AIProvider,
    task: TestTask,
  ): Promise<{ success: boolean; output: string }> {
    const toolRequest = this.taskToToolRequest(task);
    const response = await provider.executeTool(toolRequest);
    return {
      success: response.success,
      output: response.output,
    };
  }

  private taskToToolRequest(task: TestTask): import('./types.js').ProviderToolRequest {
    if (task.type === 'run' && task.testLocation) {
      return {
        provider: '',
        tool: 'e2e_run_test',
        args: [task.testLocation, { retries: task.testType === 'e2e' ? 3 : 1 }],
      };
    }

    if (task.type === 'triage') {
      return {
        provider: '',
        tool: 'e2e_triage_e2e',
        args: [task.testFiles?.[0] || 'e2e/'],
      };
    }

    if (task.type === 'analyze') {
      return {
        provider: '',
        tool: 'e2e_get_stats',
        args: [],
      };
    }

    if (task.type === 'debug') {
      return {
        provider: '',
        tool: 'e2e_get_failure_report',
        args: [task.testLocation],
      };
    }

    throw new Error(`Unsupported task type: ${task.type}`);
  }

  async runTestsParallel(config: import('./types.js').TestRunConfig): Promise<ProviderExecutionResult[]> {
    const providers = this.getAvailableProviders()
      .filter((p) => config.providers.includes(p.name));

    if (providers.length === 0) {
      throw new Error('No configured providers found');
    }

    // Collect all tests
    // This would integrate with test-playwright to list tests
    const testLocations: string[] = []; // TODO: Get from test-playwright
    const batches = this.chunkArray(testLocations, providers.length);

    const allResults: ProviderExecutionResult[] = [];

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      const promises = batch.map((testLocation: string, idx: number) => {
        const provider = providers[idx % providers.length];
        const task: import('./types.js').TestTask = {
          type: 'run',
          testType: config.testType,
          testLocation,
        };
        return this.executeTask(task, provider.name);
      });

      const batchResults = await Promise.all(promises);
      allResults.push(...batchResults);
    }

    return allResults;
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}
