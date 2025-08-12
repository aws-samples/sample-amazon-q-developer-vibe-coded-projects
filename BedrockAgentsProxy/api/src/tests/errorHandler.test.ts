import { Request, Response } from 'express';
import { ApiError, errorHandler } from '../middleware/errorHandler';

// Mock request and response objects
const mockRequest = {} as Request;
const mockResponse = {
  status: jest.fn().mockReturnThis(),
  json: jest.fn()
} as unknown as Response;
const mockNext = jest.fn();

// Mock logger
jest.mock('../middleware/logging', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    child: jest.fn().mockReturnValue({
      error: jest.fn(),
      warn: jest.fn()
    })
  }
}));

describe('Error Handler Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = 'production';
  });

  it('should handle ApiError correctly', () => {
    const apiError = new ApiError(400, 'Bad Request');
    
    errorHandler(apiError, mockRequest, mockResponse, mockNext);
    
    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'error',
        statusCode: 400,
        message: 'Bad Request'
      })
    );
  });

  it('should handle unknown errors as 500 Internal Server Error', () => {
    const unknownError = new Error('Something went wrong');
    
    errorHandler(unknownError, mockRequest, mockResponse, mockNext);
    
    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'error',
        statusCode: 500,
        message: 'Internal Server Error'
      })
    );
  });

  it('should include stack trace in development environment', () => {
    process.env.NODE_ENV = 'development';
    const error = new Error('Development error');
    
    errorHandler(error, mockRequest, mockResponse, mockNext);
    
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        stack: expect.any(String)
      })
    );
  });

  it('should not include stack trace in production environment', () => {
    process.env.NODE_ENV = 'production';
    const error = new Error('Production error');
    
    errorHandler(error, mockRequest, mockResponse, mockNext);
    
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.not.objectContaining({
        stack: expect.any(String)
      })
    );
  });
});
