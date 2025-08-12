import { Router, Request, Response } from 'express';

const router = Router();

/**
 * GET /health
 * Health check endpoint to verify the API is running
 */
router.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    message: 'API is healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

export default router;
