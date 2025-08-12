// index.ts
import { OpenApiEvent, OpenApiResponse } from './types';
import { ApiClient } from './api-client';
import { retrieveAndDecryptUserToken, decryptToken } from './encryption';

const API_HOST = process.env.API_HOST || 'example.com';
const API_BASE_PATH = process.env.API_BASE_PATH || '/api';

/**
 * Convert string values to appropriate types (boolean, number, etc.)
 */
function convertValueType(key: string, value: any): any {
  // If value is null or undefined, return as is
  if (value === null || value === undefined) {
    return value;
  }

  // Handle boolean values
  if (typeof value === 'string') {
    // Convert string "true" or "false" to boolean
    if (value.toLowerCase() === 'true') {
      console.log(`Converting string "${value}" to boolean true for key "${key}"`);
      return true;
    }
    if (value.toLowerCase() === 'false') {
      console.log(`Converting string "${value}" to boolean false for key "${key}"`);
      return false;
    }
    
    // Convert numeric strings to numbers
    if (/^-?\d+(\.\d+)?$/.test(value)) {
      const numValue = Number(value);
      if (!isNaN(numValue)) {
        console.log(`Converting string "${value}" to number ${numValue} for key "${key}"`);
        return numValue;
      }
    }
  }
  
  // Return the original value if no conversion was applied
  return value;
}

/**
 * Transform parameters from Bedrock Agent format to API format
 */
function transformParameters(params: any): any {
  // If there's no params or it's not in the expected format, return as is
  if (!params || !params.content || !params.content['application/json'] || !params.content['application/json'].properties) {
    return params;
  }

  // Extract properties from the Bedrock Agent format
  const properties = params.content['application/json'].properties;
  
  // Create a new object with the properties in the format expected by the API
  const transformedParams: Record<string, any> = {};
  
  for (const prop of properties) {
    if (prop.name && prop.value !== undefined) {
      // Convert the value to the appropriate type
      transformedParams[prop.name] = convertValueType(prop.name, prop.value);
    }
  }
  
  console.log('Transformed parameters:', JSON.stringify(transformedParams));
  return transformedParams;
}

/**
 * Process path parameters in the API path
 * @param apiPath The API path with parameter placeholders
 * @param parameters The parameters array from the event
 * @returns The processed API path with actual parameter values
 */
function processPathParameters(apiPath: string, parameters: any[]): string {
  if (!parameters || !Array.isArray(parameters) || parameters.length === 0) {
    return apiPath;
  }

  console.log('Processing path parameters:', JSON.stringify({ apiPath, parameters }));
  
  let processedPath = apiPath;
  
  // Replace each path parameter placeholder with its actual value
  for (const param of parameters) {
    if (param.name && param.value !== undefined) {
      const placeholder = `{${param.name}}`;
      if (processedPath.includes(placeholder)) {
        processedPath = processedPath.replace(placeholder, encodeURIComponent(param.value));
        console.log(`Replaced ${placeholder} with ${param.value}, new path: ${processedPath}`);
      }
    }
  }
  
  return processedPath;
}

/**
 * Call the API with the given method, path, and parameters
 */
async function callApi(method: string, path: string, params: any, headers?: Record<string, string>): Promise<any> {
  // Normalize the path to ensure it starts with a slash
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  // Combine the base path with the normalized path
  const fullPath = `${API_BASE_PATH}${normalizedPath}`;
  
  // Transform parameters for methods that send a request body
  const transformedParams = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase()) 
    ? transformParameters(params) 
    : params;
  
  // Create the API client with just the host
  const apiClient = new ApiClient(`https://${API_HOST}`);
  
  console.log(`Making ${method} request to https://${API_HOST}${fullPath}`);
  console.log('Headers:', JSON.stringify(headers));
  if (transformedParams) {
    console.log('Request body:', JSON.stringify(transformedParams));
  }
  
  switch (method.toUpperCase()) {
    case 'GET':
      return apiClient.get(fullPath, headers);
    case 'POST':
      return apiClient.post(fullPath, transformedParams, headers);
    case 'PUT':
      return apiClient.put(fullPath, transformedParams, headers);
    case 'PATCH':
      return apiClient.put(fullPath, transformedParams, headers); // Using put for patch
    case 'DELETE':
      return apiClient.delete(fullPath, headers);
    default:
      throw new Error(`Unsupported method: ${method}`);
  }
}

/**
 * Format response according to Bedrock Agent's expected format
 */
function formatBedrockResponse(
  messageVersion: string,
  actionGroup: string,
  apiPath: string,
  httpMethod: string,
  statusCode: number,
  responseData: any,
  errorMessage?: string
): OpenApiResponse {
  console.log('Formatting response:', JSON.stringify({
    messageVersion,
    actionGroup,
    apiPath,
    httpMethod,
    statusCode,
    responseData,
    errorMessage
  }));

  const responseBody = responseData ? {
    'application/json': {
      body: JSON.stringify(responseData)
    }
  } : {
    'application/json': {
      body: '{}'
    }
  };

  return {
    messageVersion,
    response: {
      actionGroup,
      apiPath,
      httpMethod,
      httpStatusCode: statusCode,
      responseBody
    },
    ...(errorMessage ? { error: { message: errorMessage } } : {})
  };
}

/**
 * Extract the token from the event
 */
async function extractToken(event: OpenApiEvent): Promise<string | null> {
  try {
    console.log('Extracting token from event:', JSON.stringify({
      hasRequestHeaders: !!event.requestHeaders,
      hasSessionAttributes: !!event.sessionAttributes,
      hasPromptSessionAttributes: !!event.promptSessionAttributes
    }));
    
    // Check if there's a token in the request headers
    if (event.requestHeaders && event.requestHeaders.Authorization) {
      const authHeader = event.requestHeaders.Authorization;
      if (authHeader.startsWith('Bearer ')) {
        console.log('Found token in request headers');
        return authHeader.substring(7);
      }
    }

    // Check if there's an encrypted token in the session attributes
    if (event.sessionAttributes && event.sessionAttributes.encryptedToken) {
      console.log('Found encrypted token in session attributes');
      const [userId, tokenId, encryptedToken] = event.sessionAttributes.encryptedToken.split(':');
      return await decryptToken(encryptedToken, userId, tokenId);
    }
    
    // Check if there's user ID and token ID in prompt session attributes
    if (event.promptSessionAttributes && 
        event.promptSessionAttributes.userId && 
        event.promptSessionAttributes.tokenId) {
      console.log('Found user ID and token ID in prompt session attributes');
      
      // Get the user ID and token ID
      const userId = event.promptSessionAttributes.userId;
      const tokenId = event.promptSessionAttributes.tokenId;
      
      // Retrieve and decrypt the token from DynamoDB using KMS
      return await retrieveAndDecryptUserToken(userId, tokenId);
    }

    console.log('No token found in event');
    return null;
  } catch (error) {
    console.error('Error extracting token:', error);
    return null;
  }
}

/**
 * Handle the OpenAPI event
 */
export async function handler(event: OpenApiEvent): Promise<OpenApiResponse> {
  console.log('Received event:', JSON.stringify(event));

  const { messageVersion } = event;
  const actionGroup = event.actionGroup;
  const originalApiPath = event.apiPath; // Store the original API path
  let processedApiPath = event.apiPath;
  const httpMethod = event.httpMethod;
  const parameters = event.parameters || [];
  const requestBody = event.requestBody;

  try {
    // Process path parameters if they exist
    processedApiPath = processPathParameters(processedApiPath, parameters);
    console.log(`Processed API path: ${processedApiPath}`);
    
    // Extract the token from the event
    const token = await extractToken(event);
    const headers: Record<string, string> = {};
    
    // Add the token to the headers if it exists
    if (token) {
      console.log('Adding authorization token to headers');
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      console.log('No authorization token available');
    }

    // Call the API
    console.log('Calling API:', httpMethod, processedApiPath);
    const response = await callApi(httpMethod, processedApiPath, requestBody, headers);
    
    return formatBedrockResponse(
      messageVersion,
      actionGroup,
      originalApiPath, // Use original API path in the response
      httpMethod,
      200,
      response
    );
  } catch (error: any) {
    console.error('Error handling request:', error);
    
    // Extract status code if available
    const statusCode = error.statusCode || 500;
    
    return formatBedrockResponse(
      messageVersion,
      actionGroup,
      originalApiPath, // Use original API path in the response
      httpMethod,
      statusCode,
      null,
      error.message || 'An error occurred while processing the request'
    );
  }
}
