import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import Config from 'src/config/config.service.js';

const baseEnv = { ...process.env };

describe('Config service', () => {
  let tempDir = '';

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'dtaas-manager-config-'));
    process.env = { ...baseEnv };
    delete process.env.EXECUTION_MANAGER_CONFIG_PATH;
    delete process.env.EXECUTION_MANAGER_HOSTNAME;
    delete process.env.EXECUTION_MANAGER_PORT;
    delete process.env.EXECUTION_MANAGER_CORS_ALLOW_ORIGIN;
    delete process.env.EXECUTION_MANAGER_CORS_ALLOW_CREDENTIALS;
    delete process.env.EXECUTION_MANAGER_TLS;
    delete process.env.EXECUTION_MANAGER_CERTS_DIR;
  });

  afterEach(async () => {
    process.env = { ...baseEnv };
    await rm(tempDir, { recursive: true, force: true });
  });

  it('returns defaults when no config is provided', () => {
    const config = new Config();

    expect(config.getHostname()).toBe('127.0.0.1');
    expect(config.getPort()).toBe(4004);
    expect(config.getCorsAllowOrigin()).toBe('');
    expect(config.getCorsAllowCredentials()).toBe(false);
    expect(config.getTls()).toBe(false);
    expect(config.getCertsDirectory()).toBe(
      path.resolve(process.cwd(), 'certs'),
    );
  });

  it('loads yaml config with relative paths', async () => {
    const configPath = path.join(tempDir, 'manager.yaml');
    await writeFile(
      configPath,
      [
        'hostname: 127.0.0.1',
        'port: 4500',
        'cors-allow-origin: https://client.example',
        'cors-allow-credentials: true',
        'tls: true',
        'certs: ./secure-certs',
      ].join('\n'),
      'utf8',
    );

    process.env.EXECUTION_MANAGER_CONFIG_PATH = configPath;
    const config = new Config();

    expect(config.getHostname()).toBe('127.0.0.1');
    expect(config.getPort()).toBe(4500);
    expect(config.getCorsAllowOrigin()).toBe('https://client.example');
    expect(config.getCorsAllowCredentials()).toBe(true);
    expect(config.getTls()).toBe(true);
    expect(config.getCertsDirectory()).toBe(
      path.resolve(tempDir, 'secure-certs'),
    );
  });

  it('uses env vars to override yaml values', async () => {
    const configPath = path.join(tempDir, 'manager.yaml');
    await writeFile(
      configPath,
      [
        'hostname: 127.0.0.1',
        'port: 4500',
        'tls: false',
        'certs: ./secure-certs',
      ].join('\n'),
      'utf8',
    );

    process.env.EXECUTION_MANAGER_CONFIG_PATH = configPath;
    process.env.EXECUTION_MANAGER_HOSTNAME = '0.0.0.0';
    process.env.EXECUTION_MANAGER_PORT = '4900';
    process.env.EXECUTION_MANAGER_CORS_ALLOW_ORIGIN =
      'http://frontend.local:3000';
    process.env.EXECUTION_MANAGER_CORS_ALLOW_CREDENTIALS = 'true';
    process.env.EXECUTION_MANAGER_TLS = 'true';
    process.env.EXECUTION_MANAGER_CERTS_DIR = './runtime-certs';

    const config = new Config();

    expect(config.getHostname()).toBe('0.0.0.0');
    expect(config.getPort()).toBe(4900);
    expect(config.getCorsAllowOrigin()).toBe('http://frontend.local:3000');
    expect(config.getCorsAllowCredentials()).toBe(true);
    expect(config.getTls()).toBe(true);
    expect(config.getCertsDirectory()).toBe(
      path.resolve(process.cwd(), 'runtime-certs'),
    );
  });

  it('loads multiple yaml cors origins', async () => {
    const configPath = path.join(tempDir, 'manager.yaml');
    await writeFile(
      configPath,
      [
        'cors-allow-origin:',
        '  - https://client-a.example.org',
        '  - https://client-b.example.org',
        '  - https://client-c.example.org',
      ].join('\n'),
      'utf8',
    );

    process.env.EXECUTION_MANAGER_CONFIG_PATH = configPath;
    const config = new Config();

    expect(config.getCorsAllowOrigin()).toEqual([
      'https://client-a.example.org',
      'https://client-b.example.org',
      'https://client-c.example.org',
    ]);
  });

  it('parses shorthand boolean env values', () => {
    process.env.EXECUTION_MANAGER_TLS = 'y';
    expect(new Config().getTls()).toBe(true);

    process.env.EXECUTION_MANAGER_TLS = 'n';
    expect(new Config().getTls()).toBe(false);
  });

  it('ignores blank env overrides', () => {
    process.env.EXECUTION_MANAGER_CONFIG_PATH = '';
    process.env.EXECUTION_MANAGER_HOSTNAME = '   ';
    process.env.EXECUTION_MANAGER_PORT = '';
    process.env.EXECUTION_MANAGER_CORS_ALLOW_ORIGIN = '   ';
    process.env.EXECUTION_MANAGER_CORS_ALLOW_CREDENTIALS = '';
    process.env.EXECUTION_MANAGER_TLS = '';
    process.env.EXECUTION_MANAGER_CERTS_DIR = '';

    const config = new Config();

    expect(config.getHostname()).toBe('127.0.0.1');
    expect(config.getPort()).toBe(4004);
    expect(config.getCorsAllowOrigin()).toBe('');
    expect(config.getCorsAllowCredentials()).toBe(false);
    expect(config.getTls()).toBe(false);
    expect(config.getCertsDirectory()).toBe(
      path.resolve(process.cwd(), 'certs'),
    );
  });

  it('throws when a boolean env value is invalid', () => {
    process.env.EXECUTION_MANAGER_TLS = 'maybe';

    expect(() => new Config()).toThrow(
      'EXECUTION_MANAGER_TLS must be a boolean value (true/false, yes/no, 1/0)',
    );
  });

  it('throws when a numeric env value is not a number', () => {
    process.env.EXECUTION_MANAGER_PORT = 'not-a-number';

    expect(() => new Config()).toThrow(
      'EXECUTION_MANAGER_PORT must be a positive integer',
    );
  });

  it('throws when a numeric env value is not positive', () => {
    process.env.EXECUTION_MANAGER_PORT = '0';

    expect(() => new Config()).toThrow(
      'EXECUTION_MANAGER_PORT must be a positive integer',
    );
  });

  it('treats an empty yaml config as defaults', async () => {
    const configPath = path.join(tempDir, 'manager.yaml');
    await writeFile(configPath, '', 'utf8');

    process.env.EXECUTION_MANAGER_CONFIG_PATH = configPath;
    const config = new Config();

    expect(config.getHostname()).toBe('127.0.0.1');
    expect(config.getPort()).toBe(4004);
    expect(config.getCorsAllowOrigin()).toBe('');
  });

  it('throws when yaml tls is not a boolean', async () => {
    const configPath = path.join(tempDir, 'manager.yaml');
    await writeFile(configPath, 'tls: 2\n', 'utf8');

    process.env.EXECUTION_MANAGER_CONFIG_PATH = configPath;

    expect(() => new Config()).toThrow();
  });

  it('throws when the yaml config holds more than one document', async () => {
    const configPath = path.join(tempDir, 'manager.yaml');
    await writeFile(configPath, 'port: 4500\n---\nport: 4600\n', 'utf8');

    process.env.EXECUTION_MANAGER_CONFIG_PATH = configPath;

    expect(() => new Config()).toThrow('must contain a single YAML document');
  });

  it('keeps a custom yaml cors origin when loading an explicit path with an env port', async () => {
    const configPath = path.join(tempDir, 'custom-manager.yaml');
    await writeFile(
      configPath,
      ['port: 4500', 'cors-allow-origin: https://custom.example'].join('\n'),
      'utf8',
    );
    process.env.EXECUTION_MANAGER_PORT = '4900';

    const config = new Config();
    config.loadConfig(configPath);

    expect(config.getPort()).toBe(4900);
    expect(config.getCorsAllowOrigin()).toBe('https://custom.example');
  });
});
