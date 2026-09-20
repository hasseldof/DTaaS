import { readFileSync } from 'node:fs';
import path from 'node:path';
import * as yaml from 'js-yaml';
import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { type CorsAllowOrigin, IConfig } from './config.interface.js';
import resolveFile from './util.js';

type ConfigValues = {
  hostname: string;
  port: number;
  'cors-allow-origin': CorsAllowOrigin;
  'cors-allow-credentials': boolean;
  tls: boolean;
  certs: string;
};

const DEFAULT_HOSTNAME = '127.0.0.1';
const DEFAULT_PORT = 4004;
const DEFAULT_CORS_ALLOW_ORIGIN = '';
const DEFAULT_CORS_ALLOW_CREDENTIALS = false;
const DEFAULT_CERTS_DIR = 'certs';

const booleanSchema = z.preprocess((value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return value;

  const normalized = value.trim().toLowerCase();
  if (['true', '1', 'yes', 'y'].includes(normalized)) return true;
  if (['false', '0', 'no', 'n'].includes(normalized)) return false;
  return value;
}, z.boolean());

const managerConfigSchema = z
  .object({
    hostname: z.string().trim().min(1).optional(),
    port: z.coerce.number().int().positive().optional(),
    'cors-allow-origin': z
      .union([
        z.string().trim().min(1),
        z.array(z.string().trim().min(1)).min(1),
      ])
      .optional(),
    'cors-allow-credentials': booleanSchema.optional(),
    tls: booleanSchema.optional(),
    certs: z.string().trim().min(1).optional(),
  })
  .strict();

function defaultConfigValues(): ConfigValues {
  return {
    hostname: DEFAULT_HOSTNAME,
    port: DEFAULT_PORT,
    'cors-allow-origin': DEFAULT_CORS_ALLOW_ORIGIN,
    'cors-allow-credentials': DEFAULT_CORS_ALLOW_CREDENTIALS,
    tls: false,
    certs: path.resolve(process.cwd(), DEFAULT_CERTS_DIR),
  };
}

function resolvePath(pathValue: string, baseDirectory: string): string {
  if (path.isAbsolute(pathValue)) return pathValue;
  return path.resolve(baseDirectory, pathValue);
}

function parseBooleanEnv(
  envValue: string | undefined,
  variableName: string,
): boolean | undefined {
  if (envValue === undefined || envValue.trim() === '') return undefined;

  const parsed = booleanSchema.safeParse(envValue);
  if (!parsed.success) {
    throw new Error(
      `${variableName} must be a boolean value (true/false, yes/no, 1/0)`,
    );
  }
  return parsed.data;
}

function parsePositiveIntegerEnv(
  envValue: string | undefined,
  variableName: string,
): number | undefined {
  if (envValue === undefined || envValue.trim() === '') return undefined;

  const parsed = Number.parseInt(envValue, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    throw new Error(`${variableName} must be a positive integer`);
  }
  return parsed;
}

@Injectable()
export default class Config implements IConfig {
  private configValues: ConfigValues = defaultConfigValues();

  constructor() {
    this.loadConfig();
  }

  loadConfig(configPath?: string): void {
    this.configValues = defaultConfigValues();
    const selectedConfigPath =
      configPath ?? process.env.EXECUTION_MANAGER_CONFIG_PATH;
    if (selectedConfigPath !== undefined && selectedConfigPath.trim() !== '') {
      this.loadYamlConfig(selectedConfigPath);
    }
    this.applyEnvOverrides();
  }

  getHostname(): string {
    return this.configValues.hostname;
  }

  getPort(): number {
    return this.configValues.port;
  }

  getCorsAllowOrigin(): CorsAllowOrigin {
    return this.configValues['cors-allow-origin'];
  }

  getCorsAllowCredentials(): boolean {
    return this.configValues['cors-allow-credentials'];
  }

  getTls(): boolean {
    return this.configValues.tls;
  }

  getCertsDirectory(): string {
    return this.configValues.certs;
  }

  private loadYamlConfig(configPath: string): void {
    const resolvedConfigPath = resolveFile(configPath);
    const configDirectory = path.dirname(resolvedConfigPath);
    const configFile = readFileSync(resolvedConfigPath, 'utf8');

    const documents = yaml.loadAll(configFile);
    if (documents.length > 1) {
      throw new Error(
        `${resolvedConfigPath} must contain a single YAML document`,
      );
    }
    const [loadedYaml] = documents;
    const yamlValues =
      loadedYaml === undefined ? {} : managerConfigSchema.parse(loadedYaml);
    this.configValues = { ...this.configValues, ...yamlValues };
    if (yamlValues.certs !== undefined) {
      this.configValues.certs = resolvePath(yamlValues.certs, configDirectory);
    }
  }

  private applyEnvOverrides(): void {
    const hostname = process.env.EXECUTION_MANAGER_HOSTNAME;
    if (hostname !== undefined && hostname.trim() !== '') {
      this.configValues.hostname = hostname.trim();
    }

    const port = parsePositiveIntegerEnv(
      process.env.EXECUTION_MANAGER_PORT,
      'EXECUTION_MANAGER_PORT',
    );
    if (port !== undefined) this.configValues.port = port;

    this.applyCorsEnvOverrides();
    this.applyTlsEnvOverrides();
  }

  private applyCorsEnvOverrides(): void {
    const corsAllowOrigin = process.env.EXECUTION_MANAGER_CORS_ALLOW_ORIGIN;
    if (corsAllowOrigin !== undefined && corsAllowOrigin.trim() !== '') {
      this.configValues['cors-allow-origin'] = corsAllowOrigin.trim();
    }

    const corsAllowCredentials = parseBooleanEnv(
      process.env.EXECUTION_MANAGER_CORS_ALLOW_CREDENTIALS,
      'EXECUTION_MANAGER_CORS_ALLOW_CREDENTIALS',
    );
    if (corsAllowCredentials !== undefined) {
      this.configValues['cors-allow-credentials'] = corsAllowCredentials;
    }
  }

  private applyTlsEnvOverrides(): void {
    const tls = parseBooleanEnv(
      process.env.EXECUTION_MANAGER_TLS,
      'EXECUTION_MANAGER_TLS',
    );
    if (tls !== undefined) this.configValues.tls = tls;

    const certsDirectory = process.env.EXECUTION_MANAGER_CERTS_DIR;
    if (certsDirectory !== undefined && certsDirectory.trim() !== '') {
      this.configValues.certs = resolvePath(certsDirectory, process.cwd());
    }
  }
}
