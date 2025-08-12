import jwt from 'jsonwebtoken';
import jwkToPem from 'jwk-to-pem';
import axios from 'axios';
import { createLogger } from '../middleware/logging';

const logger = createLogger('TokenValidator');

// Cache for JWKs to avoid fetching them on every request
let jwksCache: { keys: any[] } | null = null;
let jwksCacheTime = 0;
const JWKS_CACHE_DURATION = 3600000; // 1 hour in milliseconds

/**
 * Fetch the JSON Web Key Set (JWKS) from Cognito
 */
async function getJwks(): Promise<{ keys: any[] }> {
  const now = Date.now();
  
  // Return cached JWKS if available and not expired
  if (jwksCache && (now - jwksCacheTime < JWKS_CACHE_DURATION)) {
    return jwksCache;
  }
  
  // Get Cognito region and user pool ID from environment variables
  const region = process.env.COGNITO_REGION || 'us-east-1';
  const userPoolId = process.env.COGNITO_USER_POOL_ID;
  
  if (!userPoolId) {
    logger.error('COGNITO_USER_POOL_ID environment variable is not set');
    throw new Error('COGNITO_USER_POOL_ID environment variable is not set. Authentication cannot proceed.');
  }
  
  try {
    // Fetch JWKS from Cognito
    const url = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`;
    const response = await axios.get(url);
    
    // Cache the JWKS
    jwksCache = response.data;
    jwksCacheTime = now;
    
    return response.data;
  } catch (error) {
    logger.error(`Error fetching JWKS: ${(error as Error).message}`);
    throw new Error('Failed to fetch JWKS');
  }
}

/**
 * Verify and decode a JWT token
 */
export async function verifyToken(token: string): Promise<any> {
  try {
    // Get the JWKS
    const jwks = await getJwks();
    
    // Get the kid (Key ID) from the token header
    const decodedToken = jwt.decode(token, { complete: true });
    if (!decodedToken || typeof decodedToken === 'string' || !decodedToken.header.kid) {
      throw new Error('Invalid token');
    }
    
    // Find the matching key in the JWKS
    const key = jwks.keys.find(k => k.kid === decodedToken.header.kid);
    if (!key) {
      throw new Error('Key not found in JWKS');
    }
    
    // Convert JWK to PEM format
    const pem = jwkToPem(key);
    
    // Verify the token
    const userPoolId = process.env.COGNITO_USER_POOL_ID;
    const clientId = process.env.COGNITO_CLIENT_ID;
    
    if (!userPoolId || !clientId) {
      logger.error('Missing Cognito configuration: COGNITO_USER_POOL_ID or COGNITO_CLIENT_ID not set');
      throw new Error('Missing Cognito configuration. Authentication cannot proceed.');
    }
    
    // Verify the token with the PEM
    return jwt.verify(token, pem, {
      issuer: `https://cognito-idp.${process.env.COGNITO_REGION || 'us-east-1'}.amazonaws.com/${userPoolId}`,
      audience: clientId
    });
  } catch (error) {
    logger.error(`Token verification error: ${(error as Error).message}`);
    throw new Error(`Token verification failed: ${(error as Error).message}`);
  }
}

/**
 * Extract user information from a decoded token
 */
export function extractUserFromToken(decodedToken: any): {
  userId: string;
  email?: string;
  username?: string;
  groups?: string[];
  scope?: string;
  claims?: Record<string, any>;
} {
  return {
    userId: decodedToken.sub,
    email: decodedToken.email,
    username: decodedToken['cognito:username'],
    groups: decodedToken['cognito:groups'],
    scope: decodedToken.scope,
    claims: decodedToken
  };
}

/**
 * Parse URL query parameters
 * Note: This function should be used carefully to avoid logging sensitive data
 */
export function parseQueryParams(url: string): Record<string, string> {
  const params: Record<string, string> = {};
  try {
    const queryString = url.split('?')[1];
    if (!queryString) return params;
    
    const pairs = queryString.split('&');
    for (const pair of pairs) {
      const [key, value] = pair.split('=');
      params[decodeURIComponent(key)] = decodeURIComponent(value || '');
    }
  } catch (error) {
    logger.error(`Error parsing query parameters: ${(error as Error).message}`);
  }
  
  // Don't log the params as they may contain sensitive information
  logger.debug(`Parsed ${Object.keys(params).length} query parameters`);
  return params;
}
