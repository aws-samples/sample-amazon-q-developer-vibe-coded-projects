import { Router } from 'express';
import { healthCheck } from '../../controllers/healthController';

const router = Router();

// Health check endpoint
router.get('/', healthCheck);

export default router;
