// Re-export hybrid auth as the default authenticate middleware
// This allows existing route imports to work without changes
export { hybridAuth as authenticate, HybridAuthRequest as AuthRequest, authorize, isAdmin, isEncargado, isMesero, isDespachador, isCocinero } from './hybrid-auth';
