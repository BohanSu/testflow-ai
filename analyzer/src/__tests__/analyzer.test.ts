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
        testName: 'timeout test',
        errorMessage: 'Test timeout after 5000ms',
        stackTrace: 'Error: timeout\n    at test.js:10',
        timestamp: new Date(),
      },
    ];

    const patterns = analyzeFailure(failures);
    expect(patterns.length).toBeGreaterThan(0);
    expect(patterns[0].pattern).toBe('timeout');
  });

  it('should detect selector not found patterns', () => {
    const failures = [
      {
        testName: 'selector test',
        errorMessage: 'Element with selector .not-found not found',
        stackTrace: 'Error: selector not found\n    at page.js:20',
        timestamp: new Date(),
      },
    ];

    const patterns = analyzeFailure(failures);
    expect(patterns.length).toBeGreaterThan(0);
  });

  it('should detect network error patterns', () => {
    const failures = [
      {
        testName: 'api test',
        errorMessage: 'Network request to /api/data failed',
        stackTrace: 'Error: 500 Internal Server Error\n    at fetch.js:5',
        timestamp: new Date(),
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
        testName: 'flaky test',
        errorMessage: 'sometimes fails',
        stackTrace: '',
        timestamp: new Date(),
      },
      {
        testName: 'flaky test',
        errorMessage: 'sometimes passes',
        stackTrace: '',
        timestamp: new Date(),
      },
    ];

    const flaky = detectFlakyTests(failures);
    expect(flaky.size).toBe(1);
    expect(flaky.get('flaky test')).toBe(2);
  });

  it('should detect consistently failing tests', () => {
    const failures = [
      {
        testName: 'failing test',
        errorMessage: 'always fails',
        stackTrace: '',
        timestamp: new Date(),
      },
      {
        testName: 'failing test',
        errorMessage: 'always fails',
        stackTrace: '',
        timestamp: new Date(),
      },
    ];

    const flaky = detectFlakyTests(failures);
    expect(flaky.get('failing test')).toBe(2);
  });

  it('should track frequency of failures', () => {
    const failures = Array(5).fill({
      testName: 'often failing',
      errorMessage: 'fails often',
      stackTrace: '',
      timestamp: new Date(),
    });

    const flaky = detectFlakyTests(failures);
    expect(flaky.get('often failing')).toBe(5);
  });
});

describe('categorizeFailure', () => {
  it('should categorize authentication failures as app-bug', () => {
    const category = categorizeFailure('Authentication failed: invalid credentials');
    expect(category).toBe('app-bug');
  });

  it('should categorize selector not found as test-issue', () => {
    const category = categorizeFailure('Element with selector .test not found');
    expect(category).toBe('test-issue');
  });

  it('should categorize timeout as flaky', () => {
    const category = categorizeFailure('Test timeout after 10000ms');
    expect(category).toBe('flaky');
  });

  it('should categorize known error as known-issue', () => {
    const category = categorizeFailure('KNOWN-ERROR-123: This is a known issue');
    expect(category).toBe('known-issue');
  });

  it('should categorize unexpected errors as unknown', () => {
    const category = categorizeFailure('Something unexpected happened');
    expect(category).toBe('unknown');
  });

  it('should categorize network errors with stack traces', () => {
    const category = categorizeFailure(
      'Network error',
      'Error: fetch failed\n    at api.js:10'
    );
    expect(category).toBe('app-bug');
  });
});

describe('normalizeErrorMessage', () => {
  it('should replace dates with placeholder', () => {
    const normalized = normalizeErrorMessage('Error on 2026-03-13');
    expect(normalized).toContain('YYYY-MM-DD');
    expect(normalized).not.toContain('2026-03-13');
  });

  it('should replace hashes with placeholder', () => {
    const normalized = normalizeErrorMessage('Error with abc123def456789abc123def456789');
    expect(normalized).toContain('[HASH]');
  });

  it('should replace user paths with placeholder', () => {
    const normalized = normalizeErrorMessage('Error at /home/user/project/test.js');
    expect(normalized).toContain('~/');
    expect(normalized).not.toContain('/home/user');
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
      testName: 'auth test',
      errorMessage: 'Authentication failed',
      stackTrace: '',
      timestamp: new Date(),
    };

    const severity = determineSeverity(failure);
    expect(severity).toBe('high');
  });

  it('should treat payment failures as high severity', () => {
    const failure = {
      testName: 'payment test',
      errorMessage: 'Payment gateway error',
      stackTrace: '',
      timestamp: new Date(),
    };

    const severity = determineSeverity(failure);
    expect(severity).toBe('high');
  });

  it('should treat selector not found as medium severity', () => {
    const failure = {
      testName: 'ui test',
      errorMessage: 'Element not found',
      stackTrace: '',
      timestamp: new Date(),
    };

    const severity = determineSeverity(failure);
    expect(severity).toBe('medium');
  });

  it('should treat timeout as low severity', () => {
    const failure = {
      testName: 'slow test',
      errorMessage: 'Test timeout',
      stackTrace: '',
      timestamp: new Date(),
    };

    const severity = determineSeverity(failure);
    expect(severity).toBe('low');
  });

  it('should treat unknown errors as medium severity', () => {
    const failure = {
      testName: 'unknown test',
      errorMessage: 'Something went wrong',
      stackTrace: '',
      timestamp: new Date(),
    };

    const severity = determineSeverity(failure);
    expect(severity).toBe('medium');
  });
});
