import type { CIAdapter, CIRun, CITestResult, CIPullRequest, TestRunOptions, GitHubActionsConfig } from './types.js';

export class GitHubActionsAdapter implements CIAdapter {
  name = 'github-actions';
  private config: GitHubActionsConfig;

  constructor(config: GitHubActionsConfig) {
    this.config = config;
  }

  async getLatestRuns(limit = 10): Promise<CIRun[]> {
    const url = `${this.config.apiUrl || 'https://api.github.com'}/repos/${this.config.owner}/${this.config.repo}/actions/runs?per_page=${limit}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `token ${this.config.token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch GitHub Actions runs: ${response.statusText}`);
    }

    const data = await response.json();

    return data.workflow_runs.map((run: any) => ({
      id: String(run.id),
      status: this.mapStatus(run.status, run.conclusion),
      number: run.run_number,
      createdAt: new Date(run.created_at),
      completedAt: run.updated_at ? new Date(run.updated_at) : undefined,
      duration: run.updated_at
        ? new Date(run.updated_at).getTime() - new Date(run.created_at).getTime()
        : undefined,
      url: run.html_url,
    }));
  }

  async getRunDetails(runId: string): Promise<CIRun & { testResults: CITestResult[] }> {
    const run = (await this.getLatestRuns(100)).find((r) => r.id === runId);

    if (!run) {
      throw new Error(`Run ${runId} not found`);
    }

    const testResults = await this.fetchTestResults(runId);

    return {
      ...run,
      testResults,
    };
  }

  async getPRs(limit = 10): Promise<CIPullRequest[]> {
    const url = `${this.config.apiUrl || 'https://api.github.com'}/repos/${this.config.owner}/${this.config.repo}/pulls?state=open&per_page=${limit}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `token ${this.config.token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch PRs: ${response.statusText}`);
    }

    const data = await response.json();

    return data.map((pr: any) => ({
      number: pr.number,
      title: pr.title,
      sha: pr.head.sha,
      branch: pr.head.ref,
      url: pr.html_url,
    }));
  }

  async getPRRuns(prNumber: number): Promise<CIRun[]> {
    const prs = await this.getPRs(100);
    const pr = prs.find((p) => p.number === prNumber);

    if (!pr) {
      throw new Error(`PR ${prNumber} not found`);
    }

    const allRuns = await this.getLatestRuns(100);

    return allRuns.filter((run) => run.url.includes(`/pull/${prNumber}/`));
  }

  async runTests(options: TestRunOptions): Promise<string> {
    const url = `${this.config.apiUrl || 'https://api.github.com'}/repos/${this.config.owner}/${this.config.repo}/actions/workflows/test.yml/dispatches`;

    const body: Record<string, unknown> = {
      ref: options.branch || 'main',
    };

    if (options.tests) {
      body.inputs = {
        tests: options.tests.join(','),
      };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `token ${this.config.token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Failed to trigger test run: ${response.statusText}`);
    }

    return `Test run triggered for branch ${options.branch || 'main'}`;
  }

  async cancelRun(runId: string): Promise<void> {
    const url = `${this.config.apiUrl || 'https://api.github.com'}/repos/${this.config.owner}/${this.config.repo}/actions/runs/${runId}/cancel`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `token ${this.config.token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to cancel run ${runId}: ${response.statusText}`);
    }
  }

  private async fetchTestResults(runId: string): Promise<CITestResult[]> {
    const url = `${this.config.apiUrl || 'https://api.github.com'}/repos/${this.config.owner}/${this.config.repo}/actions/runs/${runId}/logs`;

    const response = await fetch(url, {
      headers: {
        Authorization: `token ${this.config.token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      return [];
    }

    const logs = await response.text();

    return this.parseTestLogs(logs);
  }

  private parseTestLogs(logs: string): CITestResult[] {
    const results: CITestResult[] = [];

    const lines = logs.split('\n');

    for (const line of lines) {
      if (line.includes('PASS')) {
        const match = line.match(/PASS\s+(.+?)\s+\((\d+)ms\)/);
        if (match) {
          results.push({
            testName: match[1],
            status: 'passed',
            duration: parseInt(match[2], 10),
          });
        }
      } else if (line.includes('FAIL')) {
        const match = line.match(/FAIL\s+(.+?)\s+\((\d+)ms\)/);
        if (match) {
          results.push({
            testName: match[1],
            status: 'failed',
            duration: parseInt(match[2], 10),
            failedAt: Date.now(),
          });
        }
      }
    }

    return results;
  }

  private mapStatus(status: string, conclusion: string | null): 'success' | 'failure' | 'pending' | 'running' {
    if (status === 'completed') {
      if (conclusion === 'success') return 'success';
      if (conclusion === 'failure' || conclusion === 'timed_out') return 'failure';
    }

    if (status === 'in_progress' || status === 'queued') return 'running';
    if (status === 'pending') return 'pending';

    return 'pending';
  }
}
