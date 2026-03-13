import { describe, it, expect, vi } from 'vitest';
import { ProviderManager } from '../provider/ProviderManager.js';
import { CursorProvider } from '../provider/CursorProvider.js';
import { GeminiProvider } from '../provider/GeminiProvider.js';
import { OpenCodeProvider } from '../provider/OpenCodeProvider.js';
import { AiderProvider } from '../provider/AiderProvider.js';
import type { ProviderConfig, TestRunConfig } from '../provider/types.js';

describe('ProviderManager', () => {
  it('should create a ProviderManager with default config', () => {
    const manager = new ProviderManager();
    expect(manager).toBeDefined();
  });

  it('should create a ProviderManager with custom config', () => {
    const config: Record<string, ProviderConfig> = {
      claude: { enabled: true, priority: 10, command: 'claude' },
      cursor: { enabled: true, priority: 9, command: 'cursor' },
    };
    const manager = new ProviderManager(config);
    expect(manager).toBeDefined();
  });

  it('should register providers', () => {
    const manager = new ProviderManager();
    const provider = new CursorProvider('test-key');
    manager.registerProvider('cursor', provider);
    expect(manager.getAvailableProviders()).toHaveLength(0);
  });

  it('should configure providers', () => {
    const manager = new ProviderManager();
    const provider = new CursorProvider();
    manager.registerProvider('cursor', provider);
    
    const config: ProviderConfig = {
      enabled: false,
      priority: 50,
      command: 'cursor-custom',
    };
    manager.configureProvider('cursor', config);
    
    expect(provider.priority).toBe(50);
  });

  it('should return available providers sorted by priority', () => {
    const manager = new ProviderManager();
    const cursor = new CursorProvider();
    const gemini = new GeminiProvider();
    
    cursor.priority = 100;
    cursor.available = true;
    gemini.priority = 90;
    gemini.available = true;
    
    manager.registerProvider('cursor', cursor);
    manager.registerProvider('gemini', gemini);
    
    const available = manager.getAvailableProviders();
    expect(available).toHaveLength(2);
    expect(available[0].name).toBe('cursor');
    expect(available[1].name).toBe('gemini');
  });

  it('should find best provider for task', () => {
    const manager = new ProviderManager();
    const cursor = new CursorProvider();
    
    cursor.available = true;
    
    manager.registerProvider('cursor', cursor);
    
    const task = {
      type: 'run' as const,
      testType: 'e2e' as const,
    };
    
    const provider = manager.findBestProvider(task);
    expect(provider?.name).toBe('cursor');
  });

  it('should throw error when no provider available', async () => {
    const manager = new ProviderManager();
    
    const task = {
      type: 'run' as const,
      testType: 'e2e' as const,
    };
    
    await expect(manager.executeTask(task)).rejects.toThrow();
  });

  it('should chunk arrays correctly', () => {
    const manager = new ProviderManager();
    const array = [1, 2, 3, 4, 5, 6, 7];
    const chunks = manager['chunkArray'](array, 3);
    
    expect(chunks).toHaveLength(3);
    expect(chunks[0]).toEqual([1, 2, 3]);
    expect(chunks[1]).toEqual([4, 5, 6]);
    expect(chunks[2]).toEqual([7]);
  });

  it('should convert tasks to tool requests', () => {
    const manager = new ProviderManager();
    
    const runTask = {
      type: 'run' as const,
      testType: 'e2e' as const,
      testLocation: 'tests/example.spec.ts',
    };
    
    const request = manager['taskToToolRequest'](runTask);
    expect(request.tool).toBe('e2e_run_test');
    expect(request.args).toContain('tests/example.spec.ts');
  });
});

describe('CursorProvider', () => {
  it('should create CursorProvider with API key', () => {
    const provider = new CursorProvider('test-key');
    expect(provider.name).toBe('cursor');
    expect(provider.priority).toBe(100);
  });

  it('should create CursorProvider without API key', () => {
    const provider = new CursorProvider();
    expect(provider.name).toBe('cursor');
  });

  it('should handle all e2e test types', () => {
    const provider = new CursorProvider();
    
    const task = {
      type: 'run' as const,
      testType: 'e2e' as const,
    };
    
    expect(provider.canHandle(task)).toBe(true);
  });

  it('should handle unit test types', () => {
    const provider = new CursorProvider();
    
    const task = {
      type: 'run' as const,
      testType: 'unit' as const,
    };
    
    expect(provider.canHandle(task)).toBe(true);
  });
});

describe('GeminiProvider', () => {
  it('should create GeminiProvider with API key', () => {
    const provider = new GeminiProvider('test-key');
    expect(provider.name).toBe('gemini');
    expect(provider.priority).toBe(90);
  });

  it('should handle all test types', () => {
    const provider = new GeminiProvider();
    
    const e2eTask = { type: 'run' as const, testType: 'e2e' as const };
    const unitTask = { type: 'run' as const, testType: 'unit' as const };
    
    expect(provider.canHandle(e2eTask)).toBe(true);
    expect(provider.canHandle(unitTask)).toBe(true);
  });
});

describe('OpenCodeProvider', () => {
  it('should create OpenCodeProvider with config', () => {
    const provider = new OpenCodeProvider({
      apiKey: 'test-key',
      baseUrl: 'https://api.opencode.example.com',
    });
    
    expect(provider.name).toBe('opencode');
    expect(provider.priority).toBe(95);
  });

  it('should be available with API key', () => {
    const provider = new OpenCodeProvider({ apiKey: 'test-key' });
    expect(provider.available).toBe(true);
  });

  it('should be available with base URL', () => {
    const provider = new OpenCodeProvider({ baseUrl: 'https://api.example.com' });
    expect(provider.available).toBe(true);
  });

  it('should handle all test types', () => {
    const provider = new OpenCodeProvider({ apiKey: 'test-key' });
    
    const task = { type: 'run' as const, testType: 'e2e' as const };
    expect(provider.canHandle(task)).toBe(true);
  });
});

describe('AiderProvider', () => {
  it('should create AiderProvider with config', () => {
    const provider = new AiderProvider({
      apiKey: 'test-key',
      model: 'gpt-4',
    });
    
    expect(provider.name).toBe('aider');
    expect(provider.priority).toBe(85);
  });

  it('should use default model', () => {
    const provider = new AiderProvider({ apiKey: 'test-key' });
    expect(provider['model']).toBe('gpt-4');
  });

  it('should handle all test types', () => {
    const provider = new AiderProvider({ apiKey: 'test-key' });
    
    const task = { type: 'run' as const, testType: 'e2e' as const };
    expect(provider.canHandle(task)).toBe(true);
  });
});
