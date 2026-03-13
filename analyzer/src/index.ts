export interface TestFailure {
  testPath: string;
  failureType: 'application-bug' | 'test-code-issue' | 'flaky' | 'known-issue' | 'unknown';
  category: string;
  stackTrace?: string;
  errorMessage: string;
  occurredAt: string;
  provider: string;
  duration: number;
}

export interface FailurePattern {
  pattern: string;
  occurrences: number;
  testPaths: string[];
  affectedProviders: string[];
  severity: 'low' | 'medium' | 'high';
  suggestedFix?: string;
  references?: string[];
}

export interface CoverageMetric {
  totalTests: number;
  coveredTests: number;
  coveragePercentage: number;
  gaps: { path: string; reason: string }[];
}

export interface TestSuiteHealth {
  passRate: number;
  flakyScore: number;
  totalFailures: number;
  failureCategories: Record<string, number>;
  trends: Array<{ runId: string; passRate: number }>;
  lastUpdated: string;
}

export { normalizeErrorMessage, determineSeverity };

export function analyzeFailure(failures: TestFailure[]): FailurePattern[] {
  const patternMap = new Map<string, FailurePattern>();

  for (const failure of failures) {
    const key = `${failure.category}:${failure.errorMessage.substring(0, 50)}`;
    const normalizedError = normalizeErrorMessage(failure.errorMessage);

    if (!patternMap.has(key)) {
      patternMap.set(key, {
        pattern: normalizedError,
        occurrences: 1,
        testPaths: [failure.testPath],
        affectedProviders: [failure.provider],
        severity: determineSeverity(failure),
      });
    } else {
      const pattern = patternMap.get(key)!;
      pattern.occurrences++;
      if (!pattern.testPaths.includes(failure.testPath)) {
        pattern.testPaths.push(failure.testPath);
      }
      if (!pattern.affectedProviders.includes(failure.provider)) {
        pattern.affectedProviders.push(failure.provider);
      }
    }
  }

  return Array.from(patternMap.values()).sort((a) => b.occurrences - a.occurrences);
}

export function detectFlakyTests(failures: TestFailure[]): Map<string, number> {
  const flakyTests = new Map<string, number>();

  for (const failure of failures) {
    const key = failure.testPath;
    const count = flakyTests.get(key) || 0;
    flakyTests.set(key, count + 1);
  }

  return flakyTests;
}

export function categorizeFailure(errorMessage: string, stackTrace?: string): 'application-bug' | 'test-code-issue' | 'flaky' | 'known-issue' | 'unknown' {
  const lowerError = errorMessage.toLowerCase();

  const appBugPatterns = [
    'timeout',
    'connection refused',
    '400 bad request',
    '500 internal server error',
    'authentication failed',
    'unauthorized',
    'network error',
    'network request failed',
    'fetch failed',
  ];

  if (appBugPatterns.some((pattern) => lowerError.includes(pattern))) {
    return 'application-bug';
  }

  const testIssuePatterns = [
    'assertion failed',
    'expect.toequal',
    'matcher not found',
    'async test timeout',
    'element click intercepted',
    'selector not found',
    'element with selector',
  ];

  if (testIssuePatterns.some((pattern) => lowerError.includes(pattern))) {
    return 'test-code-issue';
  }

  if (lowerError.includes('flaky') || lowerError.includes('timing out')) {
    return 'flaky';
  }

  if (stackTrace && stackTrace.includes('known_issue_')) {
    return 'known-issue';
  }

  return 'unknown';
}

function normalizeErrorMessage(message: string): string {
  return message
    .replace(/\d{4}-\d{2}-\d{2}/g, 'YYYY-MM-DD')
    .replace(/[a-f0-9]{20,}/gi, '[HASH]')
    .replace(/\/home\/[^\/]+/g, '~/')
    .replace(/\/Users\/[^\/]+/g, '~/')
    .replace(/C:\\Users\\[^\\]+\\/g, '~/');
}

function determineSeverity(failure: TestFailure): 'low' | 'medium' | 'high' {
  const categoryPriorities: Record<string, 'high' | 'medium' | 'low'> = {
    'authentication-failure': 'high',
    'payment-failure': 'high',
    'data-loss': 'high',
    'authentication': 'medium',
    'api-error': 'medium',
    'ui-bug': 'medium',
    'selector-issue': 'low',
    'timing-issue': 'low',
    'unknown': 'medium',
  };

  const category = categoryPriorities[failure.category?.toLowerCase() || 'unknown'] || 'medium';
  return category;
}
