import { Router } from 'express';
import { handleChatMessage } from '../controllers/chatController';
import { authMiddleware } from '../middleware';

const router = Router();

// Apply auth middleware to chat routes
// Comment this out if you want to allow unauthenticated chat access
router.use(authMiddleware);

// Chat routes
router.post('/', handleChatMessage);

export default router;
