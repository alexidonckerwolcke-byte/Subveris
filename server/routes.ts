import * as legacy from '../server-legacy/routes.ts';
export * from '../server-legacy/routes.ts';

export const registerRoutes = legacy.registerRoutes;
export default legacy;