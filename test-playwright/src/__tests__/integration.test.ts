import { describe, it, expect, vi } from 'vitest';
import {
  runTestsAcrossProviders,
  discoverTests,
  generateReport,
  getAvailableProviders,
} from '../index.js';
import type { MultiProviderRunOptions } from '../index.js';

describe('runTestsAcrossProviders', () => {
  it('should return empty map for empty test list', async () => {
    const options: MultiProviderRunOptions = {
      tests: [],
      providers: ['claude'],
    };

    const results = await runTestsAcrossProviders(options);
    
    expect(results.size).toBe(0);
  });

  it('should return results for single provider', async () => {
    const options: MultiProviderRunOptions = {
      tests: ['test.spec.ts'],
      providers: ['claude'],
    };

    const results = await runTestsAcrossProviders(options);
    
    expect(results.size).toBe(1);
    expect(results.has('claude')).toBe(true);
  });

  it('should return results for multiple providers', async () => {
    const options: MultiProviderRunOptions = {
      tests: ['test.spec.ts'],
      providers: ['claude', 'cursor', 'gemini'],
    };

    const results = await runTestsAcrossProviders(options);
    
    expect(results.size).toBe(3);
    expect(results.has('claude')).toBe(true);
    expect(results.has('cursor')).toBe(true);
    expect(results.has('gemini')).toBe(true);
  });

  it('should handle multiple tests', async () => {
    const options: MultiProviderRunOptions = {
      tests: ['test1.spec.ts', 'test2.spec.ts', 'test3.spec.ts'],
      providers: ['claude'],
    };

    const results = await runTestsAcrossProviders(options);
    const claudeResults = results.get('claude');
    
    expect(claudeResults).toBeDefined();
    expect(claudeResults?.length).toBe(3);
  });

  it('should respect failFast option', async () => {
    const options: MultiProviderRunOptions = {
      tests: ['test1.spec.ts', 'test2.spec.ts'],
      providers: ['claude'],
      failFast: true,
    };

    const results = await runTestsAcrossProviders(options);
    const claudeResults = results.get('claude');
    
    expect(claudeResults).toBeDefined();
  });

  it('should retry tests when specified', async () => {
    const options: MultiProviderRunOptions = {
      tests: ['test.spec.ts'],
      providers: ['claude'],
      retries: 3,
    };

    const results = await runTestsAcrossProviders(options);
    const claudeResults = results.get('claude');
    
    expect(claudeResults).toBeDefined();
    expect(claudeResults?.[0].retries).toBe(3);
  });

  it('should set test result status correctly', async () => {
    const options: MultiProviderRunOptions = {
      tests: ['test.spec.ts'],
      providers: ['claude'],
    };

    const results = await runTestsAcrossProviders(options);
    const claudeResults = results.get('claude');
    
    expect(claudeResults?.[0].status).toMatch(/^(passed|failed|flaky|error)$/);
  });

  it('should record duration for tests', async () => {
    const options: MultiProviderRunOptions = {
      tests: ['test.spec.ts'],
      providers: ['claude'],
    };

    const results = await runTestsAcrossProviders(options);
    const claudeResults = results.get('claude');
    
    expect(claudeResults?.[0].duration).toBeGreaterThan(0);
    expect(claudeResults?.[0].startedAt).toBeLessThanOrEqual(Date.now());
  });
});

describe('discoverTests', () => {
  it('should return empty array when no tests found', async () => {
    const tests = await discoverTests('e2e');
    expect(Array.isArray(tests)).toBe(true);
  });

  it('should accept e2e test type', async () => {
    const tests = await discoverTests('e2e');
    expect(Array.isArray(tests)).toBe(true);
  });

  it('should accept unit test type', async () => {
    const tests = await discoverTests('unit');
    expect(Array.isArray(tests)).toBe(true);
  });

  it('should accept integration test type', async () => {
    const tests = await discoverTests('integration');
    expect(Array.isArray(tests)).toBe(true);
  });
});

describe('generateReport', () => {
  it('should generate summary for empty results', async () => {
    const results = new Map();
    const outputPath = '/tmp/test-report.json';
    
    await generateReport(results, outputPath);
    
    const fs = await import('node:fs/promises');
    const data = await fs.readFile(outputPath, 'utf-8');
    const report = JSON.parse(data);
    
    expect(report.totalTests).toBe(0);
    expect(report.providers).toEqual([]);
  });

  it('should generate summary for single run', async () => {
    const testResults = [
      {
        test: 'test.spec.ts',
        provider: 'claude',
        status: 'passed' as const,
        startedAt: Date.now() - 1000,
        completedAt: Date.now(),
        duration: 1000,
        retries: 1,
      },
    ];
    
    const results = new Map([['claude', testResults]]);
    const outputPath = '/tmp/test-report-2.json';
    
    await generateReport(results, outputPath);
    
    const fs = await import('node:fs/promises');
    const data = await fs.readFile(outputPath, 'utf-8');
    const report = JSON.parse(data);
    
    expect(report.totalTests).toBe(1);
    expect(report.passed).toBe(1);
    expect(report.failed).toBe(0);
    expect(report.providers).toContain('claude');
  });

  it('should track failed tests', async () => {
    const testResults = [
      {
        test: 'test.spec.ts',
        provider: 'claude',
        status: 'failed' as const,
        startedAt: Date.now() - 1000,
        completedAt: Date.now(),
        duration: 1000,
        retries: 1,
        error: 'Test failed',
      },
    ];
    
    const results = new Map([['claude', testResults]]);
    const outputPath = '/tmp/test-report-3.json';
    
    await generateReport(results, outputPath);
    
    const fs = await import('node:fs/promises');
    const data = await fs.readFile(outputPath, 'utf-8');
    const report = JSON.parse(data);
    
    expect(report.totalTests).toBe(1);
    expect(report.failed).toBe(1);
    expect(report.passed).toBe(0);
  });

  it('should track flaky tests', async () => {
    const testResults = [
      {
        test: 'test.spec.ts',
        provider: 'claude',
        status: 'flaky' as const,
        startedAt: Date.now() - 1000,
        completedAt: Date.now(),
        duration: 1000,
        retries: 3,
        error: 'Flaky test',
      },
    ];
    
    const results = new Map([['claude', testResults]]);
    const outputPath = '/tmp/test-report-4.json';
    
    await generateReport(results, outputPath);
    
    const fs = await import('node:fs/promises');
    const data = await fs.readFile(outputPath, 'utf-8');
    const report = JSON.parse(data);
    
    expect(report.totalTests).toBe(1);
    expect(report.flaky).toBe(1);
  });

  it('should calculate total duration', async () => {
    const testResults = [
      {
        test: 'test1.spec.ts',
        provider: 'claude',
        status: 'passed' as const,
        startedAt: Date.now() - 2000,
        completedAt: Date.now(),
        duration: 2000,
        retries: 1,
      },
      {
        test: 'test2.spec.ts',
        provider: 'claude',
        status: 'passed' as const,
        startedAt: Date.now() - 1000,
        completedAt: Date.now(),
        duration: 1000,
        retries: 1,
      },
    ];
    
    const results = new Map([['claude', testResults]]);
    const outputPath = '/tmp/test-report-5.json';
    
    await generateReport(results, outputPath);
    
    const fs = await import('node:fs/promises');
    const data = await fs.readFile(outputPath, 'utf-8');
    const report = JSON.parse(data);
    
    expect(report.totalDuration).toBe(3000);
  });
});

describe('getAvailableProviders', () => {
  it('should return list of providers', () => {
    const providers = getAvailableProviders();
    
    expect(providers).toContain('claude');
    expect(providers).toContain('cursor');
    expect(providers).toContain('gemini');
    expect(providers).toContain('opencode');
    expect(providers).toContain('aider');
  });

  it('should return 5 providers', () => {
    const providers = getAvailableProviders();
    expect(providers.length).toBe(5);
  });
});
