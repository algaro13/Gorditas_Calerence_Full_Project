import { buildContainer } from './container';
import { createApp } from './app';

async function main(): Promise<void> {
  const container = buildContainer();
  const { env, logger } = container;

  await container.prisma.$connect();
  const app = createApp(container);
  const server = app.listen(env.PORT, () => {
    logger.info('Kustodela POS API escuchando', {
      port: env.PORT,
      env: env.NODE_ENV,
      appDomain: env.APP_DOMAIN,
      issuer: env.ZITADEL_ISSUER,
      identityProvider: env.IDENTITY_PROVIDER,
    });
  });

  const shutdown = (signal: string) => {
    logger.info(`Señal ${signal}: cerrando`);
    server.close(async () => {
      await container.shutdown();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
