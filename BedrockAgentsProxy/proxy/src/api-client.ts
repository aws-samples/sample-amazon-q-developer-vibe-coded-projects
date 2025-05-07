// api-client.ts
import * as https from 'https';
import * as http from 'http';
import { IncomingMessage } from 'http';
import { URL } from 'url';

/**
 * Simple API client that doesn't rely on external dependencies
 */
export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * Make a GET request to the API
   */
  async get<T>(path: string, headers?: Record<string, string>): Promise<T> {
    return this.request<T>('GET', path, undefined, headers);
  }

  /**
   * Make a POST request to the API
   */
  async post<T>(path: string, data: any, headers?: Record<string, string>): Promise<T> {
    return this.request<T>('POST', path, data, headers);
  }

  /**
   * Make a PUT request to the API
   */
  async put<T>(path: string, data: any, headers?: Record<string, string>): Promise<T> {
    return this.request<T>('PUT', path, data, headers);
  }

  /**
   * Make a DELETE request to the API
   */
  async delete<T>(path: string, headers?: Record<string, string>): Promise<T> {
    return this.request<T>('DELETE', path, undefined, headers);
  }

  /**
   * Make a request to the API
   */
  private async request<T>(
    method: string, 
    path: string, 
    data?: any, 
    customHeaders?: Record<string, string>
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      try {
        const fullUrl = this.baseUrl + (path.startsWith('/') ? path : `/${path}`);
        const url = new URL(fullUrl);
        
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          ...(customHeaders || {})
        };
        
        const options = {
          method,
          hostname: url.hostname,
          port: url.port || (url.protocol === 'https:' ? 443 : 80),
          path: url.pathname + url.search,
          headers
        };

        console.log('Request URL:', fullUrl);
        console.log('Request options:', JSON.stringify(options));
        
        // Choose http or https based on the protocol
        const requestModule = url.protocol === 'https:' ? https : http;
        
        const req = requestModule.request(options, (res: IncomingMessage) => {
          let responseData = '';
          
          res.on('data', (chunk) => {
            responseData += chunk;
          });
          
          res.on('end', () => {
            try {
              console.log(`Response status: ${res.statusCode}`);
              console.log(`Response headers: ${JSON.stringify(res.headers)}`);
              console.log(`Response data: ${responseData}`);
              
              if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                const parsedData = responseData ? JSON.parse(responseData) : {};
                resolve(parsedData as T);
              } else {
                const error = new Error(`Request failed with status code ${res.statusCode}: ${responseData}`);
                (error as any).statusCode = res.statusCode;
                reject(error);
              }
            } catch (error) {
              console.error('Error parsing response:', error);
              reject(error);
            }
          });
        });
        
        req.on('error', (error) => {
          console.error('Request error:', error);
          reject(error);
        });
        
        if (data) {
          const dataString = JSON.stringify(data);
          req.write(dataString);
          console.log(`Request body sent: ${dataString}`);
        }
        
        req.end();
      } catch (error) {
        console.error('Error creating request:', error);
        reject(error);
      }
    });
  }
}
