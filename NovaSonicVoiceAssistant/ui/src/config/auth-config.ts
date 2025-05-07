/**
 * Centralized authentication configuration
 * 
 * This file contains all the authentication-related configuration for the application.
 * All values are sourced from environment variables.
 */

// Cognito User Pool configuration
export const cognitoConfig = {
  userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
  userPoolClientId: import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID,
  region: import.meta.env.VITE_COGNITO_REGION || 'us-east-1',
};

// API configuration
export const apiConfig = {
  endpoint: import.meta.env.VITE_API_ENDPOINT || '/api',
};
