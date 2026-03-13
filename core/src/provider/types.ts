export interface AIProvider {
  name: string;
  command: string;
  capabilities: ProviderCapabilities;
  available: boolean;
  priority: number;

  executeTool(request: ProviderToolRequest): Promise<ProviderToolResponse>;
  canHandle(task: TestTask): boolean;
}

export interface ProviderCapabilities {
  supportedTestTypes: ('e2e' | 'unit' | 'integration' | 'all')[];
  supportedFrameworks: string[];
  maxConcurrency: number;
  canRunTests: boolean;
  canDebug: boolean;
  canAnalyze: boolean;
}

export interface ProviderToolRequest {
  provider: string;
  tool: string;
  args: unknown[];
}

export interface ProviderToolResponse {
  success: boolean;
  output: string;
  data?: unknown;
  error?: string;
}

export interface TestTask {
  type: 'run' | 'debug' | 'triage' | 'analyze';
  testType: 'e2e' | 'unit' | 'integration';
  framework?: string;
  testLocation?: string;
  testFiles?: string[];
}

export interface ProviderExecutionResult {
  providerName: string;
  testLocation: string;
  exitCode: number;
  output: string;
  duration: number;
}

export interface ProviderConfig {
  enabled: boolean;
  priority: number;
  command: string;
  env?: Record<string, string>;
}

export interface TestRunConfig {
  providers: string[];
  testType: 'e2e' | 'unit' | 'integration';
  retries?: number;
  parallelWorkers?: number;
}
