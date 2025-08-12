import { Request, Response } from 'express';
import { TABLE_NAME } from '../libs/dynamodb';
import { asyncHandler, ApiError } from '../middleware';

/**
 * Health check endpoint
 */
export const healthCheck = asyncHandler(async (req: Request, res: Response) => {
  return res.status(200).json({
    status: 'ok',
    tableName: TABLE_NAME,
    timestamp: new Date().toISOString()
  });
});
