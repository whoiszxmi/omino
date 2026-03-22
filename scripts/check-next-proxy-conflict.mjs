import { existsSync } from 'node:fs';

const middlewareCandidates = ['middleware.ts', 'src/middleware.ts'];
const proxyCandidates = ['proxy.ts', 'src/proxy.ts'];

const hasMiddleware = middlewareCandidates.some((p) => existsSync(p));
const hasProxy = proxyCandidates.some((p) => existsSync(p));

if (hasMiddleware && hasProxy) {
  console.error(
    'Next.js detected both middleware and proxy conventions. Keep only proxy.ts (or src/proxy.ts).',
  );
  process.exit(1);
}
