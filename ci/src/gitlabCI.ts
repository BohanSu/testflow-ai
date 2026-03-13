import type { CIAdapter, CIRun, CITestResult, CIPullRequest, TestRunOptions, GitLabCIConfig } from './types.js';

export class GitLabCIAdapter implements CIAdapter {
  name = 'gitlab-ci';
  private config: GitLabCIConfig;

  constructor(config: GitLabCIConfig) {
    this.config = config;
  }

  async getLatestRuns(limit = 10): Promise<CIRun[]> {
    const url = `${this.config.instanceUrl}/api/v4/projects/${this.config.projectId}/pipelines?per_page=${limit}`;

    const response = await fetch(url, {
      headers: {
        'PRIVATE-TOKEN': this.config.token,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch GitLab CI pipelines: ${response.statusText}`);
    }

    const pipelines = await response.json();

    return pipelines.map((pipeline: any) => ({
      id: String(pipeline.id),
      status: this.mapStatus(pipeline.status),
      number: pipeline.id,
      createdAt: new Date(pipeline.created_at),
      completedAt: pipeline.finished_at ? new Date(pipeline.finished_at) : undefined,
      duration: pipeline.duration ? pipeline.duration * 1000 : undefined,
      url: pipeline.web_url,
    }));
  }

  async getRunDetails(runId: string): Promise<CIRun & { testResults: CITestResult[] }> {
    const run = (await this.getLatestRuns(100)).find((r) => r.id === runId);

    if (!run) {
      throw new Error(`Pipeline ${runId} not found`);
    }

    const testResults = await this.fetchTestResults(runId);

    return {
      ...run,
      testResults,
    };
  }

  async getPRs(limit = 10): Promise<CIPullRequest[]> {
    const url = `${this.config.instanceUrl}/api/v4/projects/${this.config.projectId}/merge_requests?state=opened&per_page=${limit}`;

    const response = await fetch(url, {
      headers: {
        'PRIVATE-TOKEN': this.config.token,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch MRs: ${response.statusText}`);
    }

    const mrs = await response.json();

    return mrs.map((mr: any) => ({
      number: mr.iid,
      title: mr.title,
      sha: mr.sha,
      branch: mr.source_branch,
      url: mr.web_url,
    }));
  }

  async getPRRuns(prNumber: number): Promise<CIRun[]> {
    const prs = await this.getPRs(100);
    const pr = prs.find((p) => p.number === prNumber);

    if (!pr) {
      throw new Error(`MR ${prNumber} not found`);
    }

    const allRuns = await this.getLatestRuns(100);

    return allRuns.filter((run) => run.url.includes(`/merge_requests/${prNumber}/`));
  }

  async runTests(options: TestRunOptions): Promise<string> {
    const url = `${this.config.instanceUrl}/api/v4/projects/${this.config.projectId}/pipeline`;

    const body: Record<string, unknown> = {
      ref: options.branch || 'main',
    };

    if (options.tests) {
      body.variables = [
        {
          key: 'TESTS',
          value: options.tests.join(','),
        },
      ];
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'PRIVATE-TOKEN': this.config.token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Failed to trigger pipeline: ${response.statusText}`);
    }

    const pipeline = await response.json();

    return `Pipeline triggered: ${pipeline.web_url}`;
  }

  async cancelRun(runId: string): Promise<void> {
    const url = `${this.config.instanceUrl}/api/v4/projects/${this.config.projectId}/pipelines/${runId}/cancel`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'PRIVATE-TOKEN': this.config.token,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to cancel pipeline ${runId}: ${response.statusText}`);
    }
  }

  private async fetchTestResults(runId: string): Promise<CITestResult[]> {
    const url = `${this.config.instanceUrl}/api/v4/projects/${this.config.projectId}/pipelines/${runId}/jobs`;

    const response = await fetch(url, {
      headers: {
        'PRIVATE-TOKEN': this.config.token,
      },
    });

    if (!response.ok) {
      return [];
    }

    const jobs = await response.json();

    const results: CITestResult[] = [];

    for (const job of jobs) {
      if (job.name.includes('test')) {
        const duration = job.duration ? job.duration * 1000 : 0;

        results.push({
          testName: job.name,
          status: this.mapJobStatus(job.status),
          duration,
          failedAt: job.failed_at ? Date.now() : undefined,
          errorMessage: job.failure_reason,
        });
      }
    }

    return results;
  }

  private mapStatus(status: string): 'success' | 'failure' | 'pending' | 'running' {
    if (status === 'success') return 'success';
    if (status === 'failed' || status === 'canceled') return 'failure';
    if (status === 'running') return 'running';
    return 'pending';
  }

  private mapJobStatus(status: string): 'passed' | 'failed' | 'skipped' | 'flaky' {
    if (status === 'success') return 'passed';
    if (status === 'failed') return 'failed';
    if (status === 'skipped') return 'skipped';
    if (status === 'success_with_issues') return 'flaky';
    return 'failed';
  }
}
