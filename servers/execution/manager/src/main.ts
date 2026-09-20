#!/usr/bin/env -S NODE_OPTIONS="--experimental-specifier-resolution=node" NODE_NO_WARNINGS=1 node

import { INestApplication, NestApplicationOptions } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import AppModule from './app.module.js';
import Config from './config/config.service.js';
import resolveConfigPath from './config/cli.js';
import { ensureCertificates } from './config/certificates.js';
import { buildCorsOptions } from './config/cors.js';

export function configureExecutionManagerApp(
  app: INestApplication,
  config: Config,
): void {
  app.enableCors(
    buildCorsOptions(
      config.getCorsAllowOrigin(),
      config.getCorsAllowCredentials(),
    ),
  );
}

export async function createExecutionManagerApp(
  config: Config,
  nestOptions: NestApplicationOptions = {},
): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule, nestOptions);
  configureExecutionManagerApp(app, config);
  return app;
}

async function buildHttpsOptions(config: Config) {
  if (!config.getTls()) return undefined;
  const certPaths = await ensureCertificates(config.getCertsDirectory());
  return {
    cert: await readFile(certPaths.certFile),
    key: await readFile(certPaths.keyFile),
  };
}

function isEntrypoint(): boolean {
  const entrypoint = process.argv[1];
  return (
    entrypoint !== undefined &&
    import.meta.url === pathToFileURL(entrypoint).href
  );
}

async function bootstrap(): Promise<void> {
  const configPath = resolveConfigPath(process.argv);
  if (configPath !== undefined) {
    process.env.EXECUTION_MANAGER_CONFIG_PATH = configPath;
  }

  const startupConfig = new Config();
  startupConfig.loadConfig(configPath);
  const httpsOptions = await buildHttpsOptions(startupConfig);
  const app = await createExecutionManagerApp(startupConfig, { httpsOptions });
  await app.listen(startupConfig.getPort(), startupConfig.getHostname());
}

if (isEntrypoint()) {
  await bootstrap();
}
