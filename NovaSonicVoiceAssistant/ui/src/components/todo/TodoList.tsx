import React from 'react';
import { todoApi } from '../../services/api';
import TodoDetails from './TodoDetails';
import './TodoList.css';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { useTodo } from '../../context/TodoContext';

export default function TodoList() {
  const [newTodo, setNewTodo] = React.useState({ title: '', description: '' });
  const [refreshing, setRefreshing] = React.useState(false);
  const { user } = useAuthenticator((context) => [context.user]);
  const { 
    todos, 
    selectedTodoId, 
    error, 
    fetchTodos, 
    refreshTodos,
    setSelectedTodoId
  } = useTodo();

  // Initial fetch of todos when component mounts
  React.useEffect(() => {
    if (user) {
      fetchTodos();
    }
  }, [user, fetchTodos]);
  
  // Clear selected todo when there are no todos
  React.useEffect(() => {
    if (todos.length === 0 && selectedTodoId !== null) {
      setSelectedTodoId(null);
    }
  }, [todos, selectedTodoId, setSelectedTodoId]);

  // Set up periodic refresh
  React.useEffect(() => {
    const refreshInterval = setInterval(() => {
      if (user && !refreshing) {
        handleRefresh();
      }
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(refreshInterval);
  }, [user, refreshing]);

  const handleRefresh = React.useCallback(async () => {
    if (refreshing) return;
    
    setRefreshing(true);
    await refreshTodos();
    setRefreshing(false);
  }, [refreshTodos, refreshing]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewTodo({ ...newTodo, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newTodo.title.trim()) return;
    
    await todoApi.createTodo({
      title: newTodo.title.trim(),
      description: newTodo.description.trim(),
      completed: false
    });
    
    setNewTodo({ title: '', description: '' });
    fetchTodos(); // Refresh the list after adding
  };

  const handleToggleComplete = async (e: React.SyntheticEvent, id: string, completed: boolean) => {
    // Stop the event from bubbling up to the list item
    e.stopPropagation();
    
    await todoApi.updateTodo(id, { completed: !completed });
    await fetchTodos(); // Use fetchTodos to ensure we get fresh data
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    // Stop the event from bubbling up to the list item
    e.stopPropagation();
    
    await todoApi.deleteTodo(id);
    
    // If the deleted todo was selected, clear the selection
    if (selectedTodoId === id) {
      setSelectedTodoId(null);
    }
    
    fetchTodos(); // Refresh the list after deleting
  };

  const handleSelectTodo = (id: string) => {
    setSelectedTodoId(id === selectedTodoId ? null : id);
  };

  const handleCloseDetails = () => {
    setSelectedTodoId(null);
  };

  // Remove loading indicator completely
  // if (loading && todos.length === 0) {
  //   return <div className="loading">Loading todos...</div>;
  // }

  return (
    <div className="todo-container">
      {error && <div className="error-message">{error}</div>}
      
      <form className="todo-form" onSubmit={handleSubmit}>
        <div className="form-row">
          <input
            type="text"
            name="title"
            value={newTodo.title}
            onChange={handleInputChange}
            placeholder="Add a new todo..."
            className="todo-input"
            required
          />
          <input
            type="text"
            name="description"
            value={newTodo.description}
            onChange={handleInputChange}
            placeholder="Description (optional)"
            className="todo-input description-input"
          />
          <button type="submit" className="add-button">Add</button>
        </div>
      </form>
      
      <div className="todo-content-container">
        <ul className="todo-list">
          {todos.length === 0 ? (
            <div className="empty-state">No todos yet. Add one above!</div>
          ) : (
            todos.map((todo) => {
              // Ensure completed is a boolean value
              const isCompleted = todo.completed === true;
              
              return (
                <li
                  key={todo.id}
                  className={`todo-item ${isCompleted ? 'completed' : ''} ${
                    todo.id === selectedTodoId ? 'selected' : ''
                  } ${todo.isNew ? 'new-item' : ''} ${todo.isUpdated ? 'updated-item' : ''}`}
                  onClick={() => handleSelectTodo(todo.id)}
                >
                  <div className="todo-header-row">
                    <div 
                      className="checkbox-container"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={isCompleted}
                        onChange={(e) => handleToggleComplete(e, todo.id, isCompleted)}
                        className="todo-checkbox"
                      />
                    </div>
                    <h3 className="todo-title">{todo.title}</h3>
                    <button
                      onClick={(e) => handleDelete(e, todo.id)}
                      className="delete-button"
                      aria-label="Delete todo"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                      </svg>
                    </button>
                  </div>
                  {todo.description && (
                    <p className="todo-description">{todo.description}</p>
                  )}
                  <div className="todo-date">
                    {new Date(todo.createdAt).toLocaleDateString()}
                  </div>
                </li>
              );
            })
          )}
        </ul>
        
        {selectedTodoId && (
          <TodoDetails todoId={selectedTodoId} onClose={handleCloseDetails} />
        )}
      </div>
    </div>
  );
}
