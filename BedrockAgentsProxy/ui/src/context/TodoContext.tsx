import React from 'react';
import { todoApi } from '../services/api';

// Define interfaces for Todo and Note
interface Todo {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  createdAt: string;
  isNew?: boolean;
  isUpdated?: boolean;
}

interface Note {
  id: string;
  todoId: string;
  content: string;
  createdAt: string;
  isNew?: boolean;
}

// Define the shape of our context
interface TodoContextType {
  todos: Todo[];
  selectedTodoId: string | null;
  notes: Note[];
  loading: boolean;
  error: string | null;
  fetchTodos: () => Promise<void>;
  fetchNotes: (todoId: string) => Promise<void>;
  setSelectedTodoId: (id: string | null) => void;
  refreshTodos: () => Promise<void>;
  refreshNotes: (todoId: string) => Promise<void>;
  lastUpdated: number;
}

// Create the context with a default undefined value
const TodoContext = React.createContext<TodoContextType | undefined>(undefined);

// Create the provider component
export const TodoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // State declarations
  const [todos, setTodos] = React.useState<Todo[]>([]);
  const [selectedTodoId, setSelectedTodoId] = React.useState<string | null>(null);
  const [notes, setNotes] = React.useState<Note[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = React.useState<number>(Date.now());
  
  // Refs to track previous state for comparison
  const prevTodosRef = React.useRef<Todo[]>([]);
  const prevNotesRef = React.useRef<Note[]>([]);

  // Update refs when state changes
  React.useEffect(() => {
    prevTodosRef.current = todos;
  }, [todos]);

  React.useEffect(() => {
    prevNotesRef.current = notes;
  }, [notes]);

  // Fetch all todos
  const fetchTodos = React.useCallback(async () => {
    try {
      setLoading(true);
      const todoItems = await todoApi.getAllTodos();
      
      if (Array.isArray(todoItems)) {
        // Sort todos in descending order of creation date
        const sortedTodos = [...todoItems].sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setTodos(sortedTodos);
      } else {
        setTodos([]);
      }
      
      setError(null);
    } catch (err) {
      setTodos([]);
      setError('Failed to fetch todos. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh todos and mark changes
  const refreshTodos = React.useCallback(async () => {
    try {
      const todoItems = await todoApi.getAllTodos();
      
      if (Array.isArray(todoItems)) {
        // Sort todos in descending order of creation date
        const sortedTodos = [...todoItems].sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        
        // Compare with previous todos to mark changes
        const prevTodoIds = new Set(prevTodosRef.current.map(todo => todo.id));
        const updatedTodos = sortedTodos.map(todo => {
          // Mark as new if it wasn't in the previous list
          if (!prevTodoIds.has(todo.id)) {
            return { ...todo, isNew: true };
          }
          
          // Check if any properties have changed
          const prevTodo = prevTodosRef.current.find(t => t.id === todo.id);
          if (prevTodo && (prevTodo.title !== todo.title || 
              prevTodo.description !== todo.description || 
              prevTodo.completed !== todo.completed)) {
            return { ...todo, isUpdated: true };
          }
          
          return todo;
        });
        
        setTodos(updatedTodos);
        setLastUpdated(Date.now());
      } else {
        setTodos([]);
      }
      
      setError(null);
    } catch (err) {
      setError('Failed to refresh todos. Please try again later.');
    }
  }, []);

  // Fetch notes for a specific todo
  const fetchNotes = React.useCallback(async (todoId: string) => {
    if (!todoId) return;
    
    try {
      // Only set loading for initial fetch, not refreshes
      if (notes.length === 0) {
        setLoading(true);
      }
      
      const noteItems = await todoApi.getNotes(todoId);
      
      // Sort notes in descending order of creation date
      const sortedNotes = [...noteItems].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      setNotes(sortedNotes);
      setError(null);
    } catch (err) {
      setNotes([]);
      // Don't set error for notes fetch failures to avoid disrupting the UI
      console.error('Failed to fetch notes:', err);
    } finally {
      setLoading(false);
    }
  }, [notes.length]);

  // Refresh notes and mark changes
  const refreshNotes = React.useCallback(async (todoId: string) => {
    if (!todoId) return;
    
    try {
      // Don't set loading state for refreshes to avoid UI flickering
      const noteItems = await todoApi.getNotes(todoId);
      
      // Sort notes in descending order of creation date
      const sortedNotes = [...noteItems].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      // Compare with previous notes to mark changes
      const prevNoteIds = new Set(prevNotesRef.current.map(note => note.id));
      const updatedNotes = sortedNotes.map(note => {
        // Mark as new if it wasn't in the previous list
        if (!prevNoteIds.has(note.id)) {
          return { ...note, isNew: true };
        }
        return note;
      });
      
      setNotes(updatedNotes);
      setLastUpdated(Date.now());
      setError(null);
    } catch (err) {
      // Don't set error for notes refresh failures to avoid disrupting the UI
      console.error('Failed to refresh notes:', err);
    }
  }, []);

  // Provide the context value
  const contextValue = {
    todos,
    selectedTodoId,
    notes,
    loading,
    error,
    fetchTodos,
    fetchNotes,
    setSelectedTodoId,
    refreshTodos,
    refreshNotes,
    lastUpdated
  };

  return (
    <TodoContext.Provider value={contextValue}>
      {children}
    </TodoContext.Provider>
  );
};

// Custom hook to use the todo context
export const useTodo = (): TodoContextType => {
  const context = React.useContext(TodoContext);
  if (context === undefined) {
    throw new Error('useTodo must be used within a TodoProvider');
  }
  return context;
};
