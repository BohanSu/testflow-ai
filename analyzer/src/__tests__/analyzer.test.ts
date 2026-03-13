import { describe, it, expect } from 'vitest';
import {
  analyzeFailure,
  detectFlakyTests,
  categorizeFailure,
  normalizeErrorMessage,
  determineSeverity,
} from '../index.js';

describe('analyzeFailure', () => {
  it('should return empty array for no failures', () => {
    const patterns = analyzeFailure([]);
    expect(patterns).toEqual([]);
  });

  it('should detect timeout patterns', () => {
    const failures = [
      {
        testPath: 'timeout/spec.test.ts',
        failureType: 'application-bug' as const,
        category: 'timing-issue',
        errorMessage: 'Test timeout after 5000ms',
        stackTrace: 'Error: timeout\n    at test.js:10',
        occurredAt: '2026-03-13T00:00:00Z',
        provider: 'claude',
        duration: 5000,
      },
    ];

    const patterns = analyzeFailure(failures);
    expect(patterns.length).toBeGreaterThan(0);
    expect(patterns[0].pattern).toContain('timeout');
  });

  it('should detect selector not found patterns', () => {
    const failures = [
      {
        testPath: 'selector/spec.test.ts',
        failureType: 'application-bug' as const,
        category: 'selector-issue',
        errorMessage: 'Element with selector .not-found not found',
        stackTrace: 'Error: selector not found\n    at page.js:20',
        occurredAt: '2026-03-13T00:00:00Z',
        provider: 'claude',
        duration: 2000,
      },
    ];

    const patterns = analyzeFailure(failures);
    expect(patterns.length).toBeGreaterThan(0);
  });

  it('should detect network error patterns', () => {
    const failures = [
      {
        testPath: 'api/spec.test.ts',
        failureType: 'application-bug' as const,
        category: 'api-error',
        errorMessage: 'Network request to /api/data failed',
        stackTrace: 'Error: 500 Internal Server Error\n    at fetch.js:5',
        occurredAt: '2026-03-13T00:00:00Z',
        provider: 'claude',
        duration: 3000,
      },
    ];

    const patterns = analyzeFailure(failures);
    expect(patterns.length).toBeGreaterThan(0);
  });
});

describe('detectFlakyTests', () => {
  it('should return empty map for no failures', () => {
    const flaky = detectFlakyTests([]);
    expect(flaky.size).toBe(0);
  });

  it('should detect flaky tests with mixed results', () => {
    const failures = [
      {
        testPath: 'flaky/spec.test.ts',
        failureType: 'application-bug' as const,
        category: 'flaky',
        errorMessage: 'sometimes fails',
        stackTrace: '',
        occurredAt: '2026-03-13T00:00:00Z',
        provider: 'claude',
        duration: 1000,
      },
      {
        testPath: 'flaky/spec.test.ts',
        failureType: 'application-bug' as const,
        category: 'flaky',
        errorMessage: 'sometimes passes',
        stackTrace: '',
        occurredAt: '2026-03-13T00:00:01Z',
        provider: 'claude',
        duration: 1000,
      },
    ];

    const flaky = detectFlakyTests(failures);
    expect(flaky.size).toBe(1);
    expect(flaky.get('flaky/spec.test.ts')).toBe(2);
  });

  it('should detect consistently failing tests', () => {
    const failures = [
      {
        testPath: 'failing/spec.test.ts',
        failureType: 'application-bug' as const,
        category: 'unknown',
        errorMessage: 'always fails',
        stackTrace: '',
        occurredAt: '2026-03-13T00:00:00Z',
        provider: 'claude',
        duration: 1000,
      },
      {
        testPath: 'failing/spec.test.ts',
        failureType: 'application-bug' as const,
        category: 'unknown',
        errorMessage: 'always fails',
        stackTrace: '',
        occurredAt: '2026-03-13T00:00:01Z',
        provider: 'claude',
        duration: 1000,
      },
    ];

    const flaky = detectFlakyTests(failures);
    expect(flaky.get('failing/spec.test.ts')).toBe(2);
  });

  it('should track frequency of failures', () => {
    const failure = {
      testPath: 'often/failing/spec.test.ts',
      failureType: 'application-bug' as const,
      category: 'unknown',
      errorMessage: 'fails often',
      stackTrace: '',
      occurredAt: '2026-03-13T00:00:00Z',
      provider: 'claude',
      duration: 1000,
    };

    const failures = Array(5).fill({...failure});

    const flaky = detectFlakyTests(failures);
    expect(flaky.get('often/failing/spec.test.ts')).toBe(5);
  });
});

describe('categorizeFailure', () => {
  it('should categorize authentication failures as application-bug', () => {
    const category = categorizeFailure('Authentication failed: invalid credentials');
    expect(category).toBe('application-bug');
  });

  it('should categorize selector not found as test-code-issue', () => {
    const category = categorizeFailure('Element with selector .test not found');
    expect(category).toBe('test-code-issue');
  });

  it('should categorize timeout as application-bug', () => {
    const category = categorizeFailure('Test timeout after 10000ms');
    expect(category).toBe('application-bug');
  });

  it('should categorize flaky keyword as flaky', () => {
    const category = categorizeFailure('This is a flaky test');
    expect(category).toBe('flaky');
  });

  it('should categorize timing out as flaky', () => {
    const category = categorizeFailure('Test keeps timing out');
    expect(category).toBe('flaky');
  });

  it('should categorize known issue in stack trace as known-issue', () => {
    const stackTrace = 'Error: something\n    at known_issue_function()';
    const category = categorizeFailure('Error occurred', stackTrace);
    expect(category).toBe('known-issue');
  });

  it('should categorize unexpected errors as unknown', () => {
    const category = categorizeFailure('Something unexpected happened');
    expect(category).toBe('unknown');
  });

  it('should categorize network errors with stack traces as application-bug', () => {
    const stackTrace = 'Error: fetch failed\n    at api.js:10';
    const category = categorizeFailure('Network error', stackTrace);
    expect(category).toBe('application-bug');
  });
});

describe('normalizeErrorMessage', () => {
  it('should replace hashes with placeholder', () => {
    const normalized = normalizeErrorMessage('Error with abc123def456789abc123def456789');
    expect(normalized).toContain('[HASH]');
  });

  it('should replace dates with placeholder', () => {
    const normalized = normalizeErrorMessage('Error on 2026-03-13');
    expect(normalized).toContain('YYYY-MM-DD');
    expect(normalized).not.toContain('2026-03-13');
  });

  it('should replace user paths with placeholder', () => {
    const normalized = normalizeErrorMessage('Error at /home/user/project/test.js');
    expect(normalized).toContain('~/');
    expect(normalized).not.toContain('/home/user');
  });

  it('should replace Mac paths', () => {
    const normalized = normalizeErrorMessage('Error at /Users/username/project/test.js');
    expect(normalized).toContain('~/');
    expect(normalized).not.toContain('/Users/username');
  });

  it('should replace Windows paths', () => {
    const normalized = normalizeErrorMessage('Error at C:\\Users\\user\\project\\test.js');
    expect(normalized).toContain('~/');
    expect(normalized).not.toContain('C:\\Users\\user');
  });

  it('should normalize multiple patterns in one message', () => {
    const message = 'Error at /home/user/test.js on 2026-03-13 with hash abc1234567890abcdef1234567890abcdef';
    const normalized = normalizeErrorMessage(message);
    
    expect(normalized).toContain('~/');
    expect(normalized).toContain('YYYY-MM-DD');
    expect(normalized).toContain('[HASH]');
  });
});

describe('determineSeverity', () => {
  it('should treat authentication failures as high severity', () => {
    const failure = {
      testPath: 'auth/spec.test.ts',
      failureType: 'application-bug' as const,
      category: 'authentication-failure',
      errorMessage: 'Authentication failed',
      stackTrace: '',
      occurredAt: '2026-03-13T00:00:00Z',
      provider: 'claude',
      duration: 1000,
    };

    const severity = determineSeverity(failure);
    expect(severity).toBe('high');
  });

  it('should treat payment failures as high severity', () => {
    const failure = {
      testPath: 'payment/spec.test.ts',
      failureType: 'application-bug' as const,
      category: 'payment-failure',
      errorMessage: 'Payment gateway error',
      stackTrace: '',
      occurredAt: '2026-03-13T00:00:00Z',
      provider: 'claude',
      duration: 2000,
    };

    const severity = determineSeverity(failure);
    expect(severity).toBe('high');
  });

  it('should treat selector issues as low severity', () => {
    const failure = {
      testPath: 'ui/spec.test.ts',
      failureType: 'application-bug' as const,
      category: 'selector-issue',
      errorMessage: 'Element not found',
      stackTrace: '',
      occurredAt: '2026-03-13T00:00:00Z',
      provider: 'claude',
      duration: 1000,
    };

    const severity = determineSeverity(failure);
    expect(severity).toBe('low');
  });

  it('should treat timeout as low severity', () => {
    const failure = {
      testPath: 'slow/spec.test.ts',
      failureType: 'application-bug' as const,
      category: 'timing-issue',
      errorMessage: 'Test timeout',
      stackTrace: '',
      occurredAt: '2026-03-13T00:00:00Z',
      provider: 'claude',
      duration: 5000,
    };

    const severity = determineSeverity(failure);
    expect(severity).toBe('low');
  });

  it('should treat unknown errors as medium severity', () => {
    const failure = {
      testPath: 'unknown/spec.test.ts',
      failureType: 'unknown' as const,
      category: 'unknown',
      errorMessage: 'Something went wrong',
      stackTrace: '',
      occurredAt: '2026-03-13T00:00:00Z',
      provider: 'claude',
      duration: 1000,
    };

    const severity = determineSeverity(failure);
    expect(severity).toBe('medium');
  });

  it('should handle missing category gracefully', () => {
    const failure = {
      testPath: 'test/spec.test.ts',
      failureType: 'unknown' as const,
      category: undefined as any,
      errorMessage: 'Error',
      stackTrace: '',
      occurredAt: '2026-03-13T00:00:00Z',
      provider: 'claude',
      duration: 1000,
    };

    const severity = determineSeverity(failure);
    expect(severity).toBe('medium');
  });
});
