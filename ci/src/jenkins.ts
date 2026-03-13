import type { CIAdapter, CIRun, CITestResult, CIPullRequest, TestRunOptions, JenkinsConfig } from './types.js';

export class JenkinsAdapter implements CIAdapter {
  name = 'jenkins';
  private config: JenkinsConfig;

  constructor(config: JenkinsConfig) {
    this.config = config;
  }

  async getLatestRuns(limit = 10): Promise<CIRun[]> {
    const url = `${this.config.url}/job/${this.config.job}/api/json?tree=builds[number,timestamp,result,duration,url,id,status]`;

    const response = await this.fetchJenkins(url);

    const data = await response.json();

    return data.builds.slice(0, limit).map((build: any) => ({
      id: String(build.id),
      status: this.mapStatus(build.status, build.result),
      number: build.number,
      createdAt: new Date(build.timestamp),
      duration: build.duration,
      url: build.url,
    }));
  }

  async getRunDetails(runId: string): Promise<CIRun & { testResults: CITestResult[] }> {
    const run = (await this.getLatestRuns(100)).find((r) => r.id === runId);

    if (!run) {
      throw new Error(`Build ${runId} not found`);
    }

    const testResults = await this.fetchTestResults(runId);

    return {
      ...run,
      testResults,
    };
  }

  async getPRs(limit = 10): Promise<CIPullRequest[]> {
    const url = `${this.config.url}/job/${this.config.job}/api/json?tree=builds[changeSet[items[id,msg,author[fullName]]]]`;

    const response = await this.fetchJenkins(url);

    const data = await response.json();

    const prs = new Map<number, CIPullRequest>();

    for (const build of data.builds || []) {
      for (const item of build.changeSet?.items || []) {
        const match = item.msg?.match(/#(\d+)/);

        if (match) {
          const prNumber = parseInt(match[1], 10);

          if (!prs.has(prNumber)) {
            prs.set(prNumber, {
              number: prNumber,
              title: item.msg?.split('\n')[0] || `PR #${prNumber}`,
              sha: item.id,
              branch: 'unknown',
              url: `${this.config.url}/job/${this.config.job}`,
            });
          }
        }
      }
    }

    return Array.from(prs.values()).slice(0, limit);
  }

  async getPRRuns(prNumber: number): Promise<CIRun[]> {
    const allRuns = await this.getLatestRuns(100);

    return allRuns.filter((run) => run.url.includes(`PR-${prNumber}`));
  }

  async runTests(options: TestRunOptions): Promise<string> {
    const url = `${this.config.url}/job/${this.config.job}/buildWithParameters`;

    const params = new URLSearchParams();

    if (options.branch) {
      params.append('BRANCH', options.branch);
    }

    if (options.tests) {
      params.append('TESTS', options.tests.join(','));
    }

    const response = await this.fetchJenkins(`${url}?${params.toString()}`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`Failed to trigger build: ${response.statusText}`);
    }

    return `Build triggered for ${this.config.job}`;
  }

  async cancelRun(runId: string): Promise<void> {
    const url = `${this.config.url}/job/${this.config.job}/${runId}/stop`;

    const response = await this.fetchJenkins(url, {
      method: 'POST',
    });

    if (!response.ok && response.status !== 404) {
      throw new Error(`Failed to cancel build ${runId}: ${response.statusText}`);
    }
  }

  private async fetchJenkins(url: string, options?: RequestInit): Promise<Response> {
    const headers: Record<string, string> = {};

    if (this.config.token) {
      headers.Authorization = `Bearer ${this.config.token}`;
    } else if (this.config.username && this.config.password) {
      const auth = btoa(`${this.config.username}:${this.config.password}`);
      headers.Authorization = `Basic ${auth}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    return response;
  }

  private async fetchTestResults(runId: string): Promise<CITestResult[]> {
    const url = `${this.config.url}/job/${this.config.job}/${runId}/testReport/api/json`;

    const response = await this.fetchJenkins(url);

    if (!response.ok) {
      return [];
    }

    const data = await response.json();

    const results: CITestResult[] = [];

    for (const suite of data.suites || []) {
      for (const case_ of suite.cases || []) {
        results.push({
          testName: `${suite.name}#${case_.name}`,
          status: case_.status === 'PASSED' ? 'passed' : 'failed',
          duration: case_.duration || 0,
          failedAt: case_.errorDetails ? Date.now() : undefined,
          errorMessage: case_.errorDetails?.error?.message,
          stackTrace: case_.errorDetails?.error?.stackTrace,
        });
      }
    }

    return results;
  }

  private mapStatus(status: string, result: string | null): 'success' | 'failure' | 'pending' | 'running' {
    if (result === 'SUCCESS') return 'success';
    if (result === 'FAILURE' || result === 'ABORTED') return 'failure';
    if (status === 'RUNNING') return 'running';
    return 'pending';
  }
}
