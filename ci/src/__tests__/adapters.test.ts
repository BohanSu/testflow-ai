import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GitHubActionsAdapter } from '../githubActions.js';
import { GitLabCIAdapter } from '../gitlabCI.js';
import { JenkinsAdapter } from '../jenkins.js';
import type { GitHubActionsConfig, GitLabCIConfig, JenkinsConfig } from '../types.js';

describe('GitHubActionsAdapter', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create GitHubActionsAdapter with config', () => {
    const config: GitHubActionsConfig = {
      owner: 'test-owner',
      repo: 'test-repo',
      token: 'test-token',
    };
    
    const adapter = new GitHubActionsAdapter(config);
    expect(adapter.name).toBe('github-actions');
  });

  it('should get latest runs', async () => {
    const config: GitHubActionsConfig = {
      owner: 'test-owner',
      repo: 'test-repo',
      token: 'test-token',
    };
    
    const adapter = new GitHubActionsAdapter(config);
    
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        workflow_runs: [
          {
            id: 1,
            run_number: 123,
            status: 'completed',
            conclusion: 'success',
            created_at: '2026-03-13T00:00:00Z',
            updated_at: '2026-03-13T00:01:00Z',
            html_url: 'https://github.com/test-owner/test-repo/actions/runs/123',
          },
        ],
      }),
    });
    
    const runs = await adapter.getLatestRuns(10);
    
    expect(runs).toHaveLength(1);
    expect(runs[0].id).toBe('1');
    expect(runs[0].status).toBe('success');
  });

  it('should throw error on fetch failure', async () => {
    const config: GitHubActionsConfig = {
      owner: 'test-owner',
      repo: 'test-repo',
      token: 'test-token',
    };
    
    const adapter = new GitHubActionsAdapter(config);
    
    mockFetch.mockResolvedValue({
      ok: false,
      statusText: 'Unauthorized',
    });
    
    await expect(adapter.getLatestRuns()).rejects.toThrow();
  });

  it('should map status correctly', async () => {
    const config: GitHubActionsConfig = {
      owner: 'test-owner',
      repo: 'test-repo',
      token: 'test-token',
    };
    
    const adapter = new GitHubActionsAdapter(config);
    
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        workflow_runs: [
          {
            id: 1,
            run_number: 123,
            status: 'completed',
            conclusion: 'failure',
            created_at: '2026-03-13T00:00:00Z',
            updated_at: '2026-03-13T00:01:00Z',
            html_url: 'https://github.com/test-owner/test-repo/actions/runs/123',
          },
        ],
      }),
    });
    
    const runs = await adapter.getLatestRuns(10);
    
    expect(runs[0].status).toBe('failure');
  });
});

describe('GitLabCIAdapter', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create GitLabCIAdapter with config', () => {
    const config: GitLabCIConfig = {
      instanceUrl: 'https://gitlab.example.com',
      projectId: 12345,
      token: 'test-token',
    };
    
    const adapter = new GitLabCIAdapter(config);
    expect(adapter.name).toBe('gitlab-ci');
  });

  it('should get latest pipelines', async () => {
    const config: GitLabCIConfig = {
      instanceUrl: 'https://gitlab.example.com',
      projectId: 12345,
      token: 'test-token',
    };
    
    const adapter = new GitLabCIAdapter(config);
    
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [
        {
          id: 123,
          status: 'success',
          created_at: '2026-03-13T00:00:00Z',
          finished_at: '2026-03-13T00:01:00Z',
          duration: 60,
          web_url: 'https://gitlab.example.com/project/-/pipelines/123',
        },
      ],
    });
    
    const runs = await adapter.getLatestRuns(10);
    
    expect(runs).toHaveLength(1);
    expect(runs[0].id).toBe('123');
    expect(runs[0].status).toBe('success');
  });

  it('should throw error on fetch failure', async () => {
    const config: GitLabCIConfig = {
      instanceUrl: 'https://gitlab.example.com',
      projectId: 12345,
      token: 'test-token',
    };
    
    const adapter = new GitLabCIAdapter(config);
    
    mockFetch.mockResolvedValue({
      ok: false,
      statusText: 'Unauthorized',
    });
    
    await expect(adapter.getLatestRuns()).rejects.toThrow();
  });
});

describe('JenkinsAdapter', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create JenkinsAdapter with config', () => {
    const config: JenkinsConfig = {
      url: 'https://jenkins.example.com',
      job: 'test-job',
      token: 'test-token',
    };
    
    const adapter = new JenkinsAdapter(config);
    expect(adapter.name).toBe('jenkins');
  });

  it('should create JenkinsAdapter with username/password', () => {
    const config: JenkinsConfig = {
      url: 'https://jenkins.example.com',
      job: 'test-job',
      username: 'admin',
      password: 'password',
    };
    
    const adapter = new JenkinsAdapter(config);
    expect(adapter.name).toBe('jenkins');
  });

  it('should get latest builds', async () => {
    const config: JenkinsConfig = {
      url: 'https://jenkins.example.com',
      job: 'test-job',
      token: 'test-token',
    };
    
    const adapter = new JenkinsAdapter(config);
    
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        builds: [
          {
            id: '123',
            number: 456,
            timestamp: 1678723200000,
            result: 'SUCCESS',
            duration: 60000,
            url: 'https://jenkins.example.com/job/test-job/123/',
          },
        ],
      }),
    });
    
    const runs = await adapter.getLatestRuns(10);
    
    expect(runs).toHaveLength(1);
    expect(runs[0].id).toBe('123');
    expect(runs[0].status).toBe('success');
  });

  it('should throw error on fetch failure', async () => {
    const config: JenkinsConfig = {
      url: 'https://jenkins.example.com',
      job: 'test-job',
      token: 'test-token',
    };
    
    const adapter = new JenkinsAdapter(config);
    
    mockFetch.mockResolvedValue({
      ok: false,
      statusText: 'Unauthorized',
    });
    
    await expect(adapter.getLatestRuns()).rejects.toThrow();
  });

  it('should set authorization header with token', async () => {
    const config: JenkinsConfig = {
      url: 'https://jenkins.example.com',
      job: 'test-job',
      token: 'test-token',
    };
    
    const adapter = new JenkinsAdapter(config);
    
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ builds: [] }),
    });
    
    await adapter.getLatestRuns(10);
    
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
      })
    );
  });

  it('should set authorization header with username/password', async () => {
    const config: JenkinsConfig = {
      url: 'https://jenkins.example.com',
      job: 'test-job',
      username: 'admin',
      password: 'password',
    };
    
    const adapter = new JenkinsAdapter(config);
    
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ builds: [] }),
    });
    
    await adapter.getLatestRuns(10);
    
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Basic YWRtaW46cGFzc3dvcmQ=',
        }),
      })
    );
  });
});
