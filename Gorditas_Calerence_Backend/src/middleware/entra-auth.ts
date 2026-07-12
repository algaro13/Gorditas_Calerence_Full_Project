import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

export interface EntraAuthRequest extends Request {
  entraUser?: {
    oid: string;
    email: string;
    name: string;
  };
  user?: any;
  tenantSlug?: string;
}

// JWKS client with caching (keys are cached for 10 hours)
const client = jwksClient({
  jwksUri: `https://calerence.ciamlogin.com/discovery/v2.0/keys`,
  cache: true,
  cacheMaxAge: 36000000, // 10 hours
  rateLimit: true,
  jwksRequestsPerMinute: 10,
});

function getKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err);
      return;
    }
    const signingKey = key?.getPublicKey();
    callback(null, signingKey);
  });
}

export const entraAuth = async (req: EntraAuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Token no proporcionado' });
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify token using JWKS
    const decoded = await new Promise<any>((resolve, reject) => {
      jwt.verify(
        token,
        getKey,
        {
          algorithms: ['RS256'],
          issuer: `https://calerence.ciamlogin.com/f126e948-b284-4332-ade2-6cffc98a879d/v2.0`,
          audience: 'fe1da7e9-2e49-470b-8ac4-5534f45d2a9b',
        },
        (err, decoded) => {
          if (err) reject(err);
          else resolve(decoded);
        }
      );
    });

    // Extract user info from token
    req.entraUser = {
      oid: decoded.oid || decoded.sub,
      email: decoded.emails?.[0] || decoded.email || decoded.preferred_username || '',
      name: decoded.name || decoded.given_name || '',
    };

    next();
  } catch (error: any) {
    console.error('Entra auth error:', error.message);
    return res.status(401).json({ success: false, message: 'Token no válido' });
  }
};
