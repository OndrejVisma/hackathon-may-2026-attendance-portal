import { InjectionToken } from '@angular/core';

export interface ApiConfig {
  readonly baseUrl: string;
}

export const API_CONFIG = new InjectionToken<ApiConfig>('API_CONFIG');

// Default: hackathon mock server when running locally.
// Mock server: docker-compose at dev-extras/integration/mock-server, port 4010, prefix /api/v1.
// Swap to real BE by overriding API_CONFIG in main.ts at build time via env vars.
export const DEFAULT_API_CONFIG: ApiConfig = {
  baseUrl: 'http://localhost:4010/api/v1',
};
