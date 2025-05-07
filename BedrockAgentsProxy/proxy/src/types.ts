// types.ts
// OpenAPI schema specific types
export interface OpenApiEvent {
  messageVersion: string;
  agent?: {
    name: string;
    version: string;
    id: string;
    alias: string;
  };
  actionGroup: string;
  apiPath: string;
  httpMethod: string;
  requestBody?: any;
  parameters?: Array<{
    name: string;
    type: string;
    value: string;
  }>;
  requestHeaders?: Record<string, string>;
  sessionAttributes?: Record<string, string>;
  promptSessionAttributes?: Record<string, string>;
  sessionId?: string;
  inputText?: string;
}

export interface OpenApiResponse {
  messageVersion: string;
  response: {
    actionGroup: string;
    apiPath: string;
    httpMethod: string;
    httpStatusCode: number;
    responseBody: {
      [contentType: string]: {
        body: string;
      };
    };
  };
  sessionAttributes?: Record<string, string>;
  promptSessionAttributes?: Record<string, string>;
  error?: {
    message: string;
  };
  knowledgeBasesConfiguration?: Array<{
    knowledgeBaseId: string;
    retrievalConfiguration?: {
      vectorSearchConfiguration?: {
        numberOfResults?: number;
        overrideSearchType?: 'HYBRID' | 'SEMANTIC';
        filter?: any;
      };
    };
  }>;
}
