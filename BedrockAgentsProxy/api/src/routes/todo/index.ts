import { Router } from 'express';
import { authMiddleware } from '../../middleware';
import { 
  getAllTodos, 
  createTodo, 
  getTodoById, 
  updateTodo, 
  deleteTodo 
} from '../../controllers/todoController';
import {
  getNotesByTodoId,
  createNote,
  deleteNote
} from '../../controllers/noteController';

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Todo routes
router.get('/', getAllTodos);
router.post('/', createTodo);
router.get('/:id', getTodoById);
router.put('/:id', updateTodo);
router.delete('/:id', deleteTodo);

// Note routes
router.get('/:todoId/notes', getNotesByTodoId);
router.post('/:todoId/notes', createNote);
router.delete('/:todoId/notes/:noteId', deleteNote);

export default router;
