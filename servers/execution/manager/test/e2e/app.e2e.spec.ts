import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from '@jest/globals';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { HttpStatus, INestApplication } from '@nestjs/common';
import supertest from 'supertest';
import Config from 'src/config/config.service.js';
import { createExecutionManagerApp } from 'src/main.js';

describe('Execution Manager e2e', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createExecutionManagerApp(new Config(), { logger: false });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health returns ok', async () => {
    await supertest(app.getHttpServer())
      .get('/health')
      .expect(HttpStatus.OK)
      .expect({ status: 'ok' });
  });
});

describe('Execution Manager configuration pipeline', () => {
  const originalEnv = { ...process.env };
  let tempDir = '';

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'dtaas-manager-e2e-'));
    process.env = { ...originalEnv };
    delete process.env.EXECUTION_MANAGER_CONFIG_PATH;
    delete process.env.EXECUTION_MANAGER_HOSTNAME;
    delete process.env.EXECUTION_MANAGER_PORT;
    delete process.env.EXECUTION_MANAGER_CORS_ALLOW_ORIGIN;
    delete process.env.EXECUTION_MANAGER_CORS_ALLOW_CREDENTIALS;
  });

  afterEach(async () => {
    process.env = { ...originalEnv };
    await rm(tempDir, { recursive: true, force: true });
  });

  it('injects configuration from EXECUTION_MANAGER_CONFIG_PATH', async () => {
    const configPath = path.join(tempDir, 'manager.yaml');
    await writeFile(configPath, 'hostname: 127.0.0.7\nport: 4700\n', 'utf8');
    process.env.EXECUTION_MANAGER_CONFIG_PATH = configPath;

    const app = await createExecutionManagerApp(new Config(), {
      logger: false,
    });
    const config = app.get(Config);

    expect(config.getHostname()).toBe('127.0.0.7');
    expect(config.getPort()).toBe(4700);

    await app.close();
  });

  it('applies the configured CORS policy', async () => {
    process.env.EXECUTION_MANAGER_CORS_ALLOW_ORIGIN = '*';
    const app = await createExecutionManagerApp(new Config(), {
      logger: false,
    });
    await app.init();

    const response = await supertest(app.getHttpServer())
      .options('/health')
      .set('Origin', 'http://localhost:4000')
      .set('Access-Control-Request-Method', 'GET');

    expect(response.status).toBe(HttpStatus.NO_CONTENT);
    expect(response.headers['access-control-allow-origin']).toBe(
      'http://localhost:4000',
    );
    expect(
      response.headers['access-control-allow-credentials'],
    ).toBeUndefined();

    await app.close();
  });
});
