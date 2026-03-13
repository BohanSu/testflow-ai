import { GitHubActionsAdapter } from './githubActions.js';
import { GitLabCIAdapter } from './gitlabCI.js';
import { JenkinsAdapter } from './jenkins.js';

export type {
  CIAdapter,
  CIRun,
  CITestResult,
  CIPullRequest,
  TestRunOptions,
  GitHubActionsConfig,
  GitLabCIConfig,
  JenkinsConfig,
} from './types.js';

export function createCIAdapter(
  type: 'github' | 'gitlab' | 'jenkins',
  config: any
): import('./types.js').CIAdapter {
  switch (type) {
    case 'github':
      return new GitHubActionsAdapter(config);
    case 'gitlab':
      return new GitLabCIAdapter(config);
    case 'jenkins':
      return new JenkinsAdapter(config);
    default:
      throw new Error(`Unknown CI type: ${type}`);
  }
}

export { GitHubActionsAdapter, GitLabCIAdapter, JenkinsAdapter };
