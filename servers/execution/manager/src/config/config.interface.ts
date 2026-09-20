export type CorsAllowOrigin = string | string[];

export interface IConfig {
  loadConfig(configPath?: string): void;
  getHostname(): string;
  getPort(): number;
  getCorsAllowOrigin(): CorsAllowOrigin;
  getCorsAllowCredentials(): boolean;
  getTls(): boolean;
  getCertsDirectory(): string;
}
