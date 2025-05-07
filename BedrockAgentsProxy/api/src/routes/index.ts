import { Router } from 'express';
import todoRoutes from './todo';
import healthRoutes from './health';
import chatRoutes from './chat';

const router = Router();

// Register routes
router.use('/health', healthRoutes);
router.use('/todos', todoRoutes);
router.use('/chat', chatRoutes);

export default router;
