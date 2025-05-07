import express from 'express';
import todoRoutes from './todo';

const router = express.Router();
// Mount routes - use singular form only
router.use('/todo', todoRoutes);  

export default router;
