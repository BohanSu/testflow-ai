export interface CIRun {
  id: string;
  status: 'success' | 'failure' | 'pending' | 'running';
  number: number;
  createdAt: Date;
  completedAt?: Date;
  duration?: number;
  url: string;
}

export interface CITestResult {
  testName: string;
  status: 'passed' | 'failed' | 'skipped' | 'flaky';
  duration: number;
  failedAt?: number;
  errorMessage?: string;
  stackTrace?: string;
}

export interface CIPullRequest {
  number: number;
  title: string;
  sha: string;
  branch: string;
  url: string;
}

export interface CIAdapter {
  name: string;
  getLatestRuns(limit?: number): Promise<CIRun[]>;
  getRunDetails(runId: string): Promise<CIRun & { testResults: CITestResult[] }>;
  getPRs(limit?: number): Promise<CIPullRequest[]>;
  getPRRuns(prNumber: number): Promise<CIRun[]>;
  runTests(options: TestRunOptions): Promise<string>;
  cancelRun(runId: string): Promise<void>;
}

export interface TestRunOptions {
  tests?: string[];
  branch?: string;
  prNumber?: number;
  parallel?: boolean;
}

export interface GitHubActionsConfig {
  owner: string;
  repo: string;
  token: string;
  apiUrl?: string;
}

export interface GitLabCIConfig {
  instanceUrl: string;
  projectId: number;
  token: string;
}

export interface JenkinsConfig {
  url: string;
  job: string;
  username?: string;
  password?: string;
  token?: string;
}
