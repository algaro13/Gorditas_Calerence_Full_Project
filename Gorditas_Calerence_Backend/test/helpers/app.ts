import type { Express } from 'express';
import { buildContainer, type Container, type ContainerOverrides } from '../../src/container';
import { createApp } from '../../src/app';
import { createTestKeys, type TestKeys } from './auth';

export interface TestApp {
  app: Express;
  container: Container;
  keys: TestKeys;
}

export async function createTestApp(overrides: ContainerOverrides = {}): Promise<TestApp> {
  const keys = await createTestKeys();
  const container = buildContainer({ localJwks: keys.jwks, silentLogs: true, ...overrides });
  const app = createApp(container);
  return { app, container, keys };
}
