import { createLogger } from "../../../middleware/logging";
import { SessionContext, SessionData } from "../../../types/novasonic.types";

export class ToolManager {
  private toolHandlers: Map<string, (params: any, context?: SessionContext) => any> = new Map();
  private logger = createLogger('ToolManager');

  constructor() {}

  // Register a tool handler
  public registerTool(
    toolName: string, 
    handler: (params: any, context?: SessionContext) => any
  ): void {
    this.logger.debug({ toolName }, 'Registering tool handler');
    this.toolHandlers.set(toolName, handler);
  }

  // Handle tool use
  public async handleToolUse(
    sessionId: string, 
    toolUseId: string, 
    toolName: string, 
    parameters: any,
    dispatchEvent: (sessionId: string, eventType: string, data: any) => void,
    getSession: (sessionId: string) => SessionData | undefined,
    addEventToSessionQueue: (sessionId: string, event: any) => void
  ): Promise<void> {
    this.logger.info({ sessionId, toolUseId, toolName }, 'Handling tool use');
    
    try {
      const handler = this.toolHandlers.get(toolName);
      
      if (!handler) {
        this.logger.warn({ toolName }, 'No handler registered for tool');
        const errorResponse = {
          toolResult: {
            content: [{ error: `No handler registered for tool: ${toolName}` }],
            status: "error"
          }
        };
        
        dispatchEvent(sessionId, 'toolResult', {
          toolUseId,
          status: 'ERROR',
          result: JSON.stringify(errorResponse)
        });
        return;
      }
      
      // Get session to access context
      const session = getSession(sessionId);
      if (!session) {
        this.logger.error({ sessionId, toolUseId }, 'Session not found for tool execution');
        const errorResponse = {
          toolResult: {
            content: [{ error: `Session not found: ${sessionId}` }],
            status: "error"
          }
        };
        
        dispatchEvent(sessionId, 'toolResult', {
          toolUseId,
          status: 'ERROR',
          result: JSON.stringify(errorResponse)
        });
        return;
      }
      
      // Create a SessionContext object with the session context and sessionId
      const toolContext: SessionContext = {
        user: session.context?.user || { userId: 'anonymous', username: 'anonymous' },
        sessionId,
        requestId: session.context?.requestId
      };
      
      // Log parameters and user info for debugging and audit
      this.logger.debug({ 
        toolName, 
        parameters, 
        sessionId,
        userId: toolContext.user.userId 
      }, 'Executing tool for user');
      
      try {
        // Call the tool handler with parameters and context
        const handlerResult = await Promise.resolve(handler(parameters || {}, toolContext));
        
        // Log the result from the tool handler
        this.logger.debug({
          toolName,
          toolUseId,
          result: JSON.stringify(handlerResult)
        }, 'Tool handler result');
        
        // Format the successful result according to Nova model expectations
        const formattedResult = {
          toolResult: {
            content: [{ result: handlerResult }],
            status: "success"
          }
        };
        
        // Send the result back
        const toolResult = {
          toolUseId,
          status: 'SUCCESS',
          result: JSON.stringify(formattedResult)
        };
        
        this.logger.info({ sessionId, toolUseId, toolName }, 'Sending tool result');
        dispatchEvent(sessionId, 'toolResult', toolResult);
        
        // Create a content start event for the tool result
        const contentId = `tool-result-${toolUseId}`;
        addEventToSessionQueue(sessionId, {
          event: {
            contentStart: {
              promptName: session.promptName,
              contentName: contentId,
              interactive: false,
              type: "TOOL",
              role: "TOOL",
              toolResultInputConfiguration: {
                toolUseId: toolUseId,
                type: "TEXT",
                textInputConfiguration: {
                  mediaType: "text/plain"
                }
              }
            }
          }
        });
        
        // Add the tool result content - use the formatted result
        addEventToSessionQueue(sessionId, {
          event: {
            toolResult: {
              promptName: session.promptName,
              contentName: contentId,
              content: JSON.stringify(formattedResult)
            }
          }
        });
        
        // Add content end event
        addEventToSessionQueue(sessionId, {
          event: {
            contentEnd: {
              promptName: session.promptName,
              contentName: contentId
            }
          }
        });
        
        const userInfo = toolContext.user ? `for user ${toolContext.user.username}` : '';
        this.logger.info({ toolUseId, toolName, sessionId }, `Tool execution successful ${userInfo}`);
      } catch (error) {
        // Handle errors from the tool handler
        this.logger.error({ toolUseId, toolName, error }, 'Error executing tool');
        
        // Format the error according to Nova model expectations
        const errorResponse = {
          toolResult: {
            content: [{ error: error instanceof Error ? error.message : String(error) }],
            status: "error"
          }
        };
        
        dispatchEvent(sessionId, 'toolResult', {
          toolUseId,
          status: 'ERROR',
          result: JSON.stringify(errorResponse)
        });
        
        // Create a content start event for the tool error
        const contentId = `tool-result-${toolUseId}`;
        addEventToSessionQueue(sessionId, {
          event: {
            contentStart: {
              promptName: session.promptName,
              contentName: contentId,
              interactive: false,
              type: "TOOL",
              role: "TOOL",
              toolResultInputConfiguration: {
                toolUseId: toolUseId,
                type: "TEXT",
                textInputConfiguration: {
                  mediaType: "text/plain"
                }
              }
            }
          }
        });
        
        // Add the tool error content
        addEventToSessionQueue(sessionId, {
          event: {
            toolResult: {
              promptName: session.promptName,
              contentName: contentId,
              content: JSON.stringify(errorResponse)
            }
          }
        });
        
        // Add content end event
        addEventToSessionQueue(sessionId, {
          event: {
            contentEnd: {
              promptName: session.promptName,
              contentName: contentId
            }
          }
        });
      }
    } catch (error) {
      // Handle errors in the tool manager itself
      this.logger.error({ toolUseId, toolName, error }, 'Error in tool manager');
      
      // Format the error according to Nova model expectations
      const errorResponse = {
        toolResult: {
          content: [{ error: `Tool manager error: ${error instanceof Error ? error.message : String(error)}` }],
          status: "error"
        }
      };
      
      dispatchEvent(sessionId, 'toolResult', {
        toolUseId,
        status: 'ERROR',
        result: JSON.stringify(errorResponse)
      });
    }
  }
}
