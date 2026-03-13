#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';

import { ProviderManager, type TestRunConfig } from './provider/ProviderManager.js';

interface CLIOptions {
  providers?: string[];
  testType?: 'e2e' | 'unit' | 'integration';
  retries?: number;
  parallel?: boolean;
  debug?: boolean;
  verbose?: boolean;
}

async function run(options: CLIOptions): Promise<void> {
  console.log(chalk.blueBright('🧪 TestFlow AI - Multi-AI Test Runner\n'));

  const manager = new ProviderManager({
    claude: { enabled: true, priority: 10, command: 'claude' },
    cursor: { enabled: true, priority: 9, command: 'cursor' },
    gemini: { enabled: true, priority: 8, command: 'gemini' },
    opencode: { enabled: false, priority: 7, command: 'opencode' },
  });

  const providers = manager.getAvailableProviders();
  console.log(chalk.dim(`Available providers: ${providers.map((p) => p.name).join(', ')}\n`));

  const runConfig: TestRunConfig = {
    providers: options.providers || providers.map((p) => p.name),
    testType: options.testType || 'e2e',
    retries: options.retries || 1,
    parallelWorkers: options.parallel ? 4 : 1,
  };

  console.log(chalk.dim(`Running ${runConfig.testType} tests with ${runConfig.providers.length} provider(s)`));
  console.log(chalk.dim(`Retries: ${runConfig.retries}\n`));

  try {
    const results = await manager.runTestsParallel(runConfig);
    
    const passed = results.filter((r) => r.exitCode === 0);
    const failed = results.filter((r) => r.exitCode !== 0);

    console.log(chalk.green(`✓ Passed: ${passed.length}`));
    console.log(chalk.red(`✗ Failed: ${failed.length}`));

    if (failed.length > 0) {
      console.log(chalk.yellow('\nFailed tests:'));
      failed.forEach((r) => {
        console.log(chalk.dim(`  - ${r.testLocation}`));
      console.log(chalk.dim(`    Took ${r.duration}ms`));
      });
    }

    const exitCode = failed.length > 0 ? 1 : 0;

    if (exitCode === 0) {
      console.log(chalk.green('\n✓ All tests passed!'));
    } else {
      console.log(chalk.red('\n✗ Some tests failed. Run with --debug for details.'));
    }

    process.exit(exitCode);
  } catch (error) {
    console.error(chalk.red(`Error: ${error}`));
    process.exit(1);
  }
}

const program = new Command();
program
  .name('testflow')
  .description('TestFlow AI - Multi-AI Playwright testing and analysis platform')
  .version('0.1.0')
  .option('-p, --providers <list>', 'Comma-separated provider names (claude, cursor, gemini, opencode)', 'claude,cursor,gemini')
  .option('-t, --type <type>', 'Test type: e2e, unit, or integration (default: e2e)', 'e2e')
  .option('-r, --retries <number>', 'Retry count for flaky detection (default: 1)', '1')
  .option('--parallel', 'Run tests in parallel across providers', false)
  .option('-d, --debug', 'Debug mode with detailed output')
  .option('-v, --verbose', 'Verbose output')
  .command('run [test-path]', 'Run tests with multiple AI providers')
  .action(async (testPath, options) => {
    await run(options);
  });

const triageCmd = new Command('triage')
  .argument('[test-path]', 'Path to test files')
  .description('Triage test failures and categorize them')
  .option('-p, --providers <list>', 'Providers to use for triage', '')
  .action(async (testPath, options) => {
    console.log(chalk.blueBright('📋 TestFlow AI - Failure Triaging\n'));

    const runConfig: TestRunConfig = {
      providers: options.providers ? options.providers.split(',') : ['claude', 'cursor'],
      testType: 'e2e',
      retries: 2,
    };

    const manager = new ProviderManager();
    const result = await manager.executeTask(
      {
        type: 'triage',
        testType: 'e2e',
        testFiles: testPath ? [testPath] : ['e2e/'],
      },
      runConfig.providers[0],
    );

    console.log(chalk.dim('Triage complete. Check reports in test-reports/ directory.\n'));
  });

const statsCmd = new Command('stats')
  .description('Show test statistics and health metrics')
  .option('-p, --providers <list>', 'Providers to analyze (comma-separated)', '')
  .action(async (options) => {
    console.log(chalk.blueBright('📊 TestFlow AI - Statistics\n'));

    const runConfig: TestRunConfig = {
      providers: options.providers ? options.providers.split(',') : ['claude', 'cursor', 'gemini'],
      testType: 'e2e',
    };

    const manager = new ProviderManager();
    const result = await manager.executeTask(
      {
        type: 'analyze',
        testType: 'e2e',
      },
      runConfig.providers[0],
    );

    console.log(chalk.dim('Analysis complete. Check reports in test-reports/ directory.\n'));
  });

program.addCommand(triageCmd);
program.addCommand(statsCmd);

if (import.meta.url === `file://${process.argv[1]}`) {
  program.parse(process.argv);
}
