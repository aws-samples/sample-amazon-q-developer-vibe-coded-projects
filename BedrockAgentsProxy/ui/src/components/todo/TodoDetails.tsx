import React from 'react';
import { todoApi } from '../../services/api';
import './TodoDetails.css';
import { useTodo } from '../../context/TodoContext';
import { TransitionGroup, CSSTransition } from 'react-transition-group';

interface Note {
  id: string;
  todoId: string;
  content: string;
  createdAt: string;
  isNew?: boolean;
}

interface TodoDetailsProps {
  todoId: string | null;
  onClose: () => void;
}

export default function TodoDetails({ todoId, onClose }: TodoDetailsProps) {
  const [newNote, setNewNote] = React.useState('');
  const [refreshing, setRefreshing] = React.useState(false);
  const { notes, fetchNotes, refreshNotes, loading, error } = useTodo();

  // Initial fetch of notes when component mounts or todoId changes
  React.useEffect(() => {
    if (todoId) {
      fetchNotes(todoId);
    }
  }, [todoId, fetchNotes]);
  
  // Additional check to ensure the todo still exists
  React.useEffect(() => {
    const checkTodoExists = async () => {
      if (todoId) {
        try {
          await todoApi.getTodo(todoId);
        } catch (error) {
          // If the todo doesn't exist anymore, close the details panel
          onClose();
        }
      }
    };
    
    checkTodoExists();
  }, [todoId, onClose]);

  // Set up periodic refresh for notes
  React.useEffect(() => {
    if (!todoId) return;

    const refreshInterval = setInterval(() => {
      if (todoId && !refreshing) {
        handleRefreshNotes();
      }
    }, 15000); // Refresh notes every 15 seconds

    return () => clearInterval(refreshInterval);
  }, [todoId, refreshing]);

  // Function to refresh notes
  const handleRefreshNotes = React.useCallback(async () => {
    if (!todoId || refreshing) return;
    
    setRefreshing(true);
    await refreshNotes(todoId);
    setRefreshing(false);
  }, [todoId, refreshNotes, refreshing]);

  // Sort notes in descending order by creation date
  const sortedNotes = [...notes].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!todoId || !newNote.trim()) return;
    
    await todoApi.addNote(todoId, { content: newNote.trim() });
    setNewNote('');
    fetchNotes(todoId); // Refresh notes after adding
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!todoId) return;
    
    await todoApi.deleteNote(todoId, noteId);
    fetchNotes(todoId); // Refresh notes after deleting
  };

  if (!todoId) return null;

  return (
    <div className="todo-details">
      <div className="details-header">
        <h3>Notes</h3>
        <button onClick={onClose} className="close-button" aria-label="Close notes">
          ×
        </button>
      </div>
      
      <form className="note-form" onSubmit={handleAddNote}>
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Add a note..."
          className="note-input"
          required
        />
        <button type="submit" className="add-note-button">
          Add Note
        </button>
      </form>
      
      {error && <div className="error-message">{error}</div>}
      
      <TransitionGroup component="ul" className="notes-list">
        {sortedNotes.length === 0 ? (
          <div className="empty-notes">No notes yet. Add one above!</div>
        ) : (
          sortedNotes.map((note) => (
            <CSSTransition
              key={note.id}
              timeout={300}
              classNames="note-item"
            >
              <li className={`note-item ${note.isNew ? 'new-note' : ''}`}>
                <div className="note-header">
                  <div className="note-content">{note.content}</div>
                  <button
                    onClick={() => handleDeleteNote(note.id)}
                    className="delete-note-button"
                    aria-label="Delete note"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                    </svg>
                  </button>
                </div>
                <div className="note-footer">
                  <span className="note-date">
                    {new Date(note.createdAt).toLocaleString()}
                  </span>
                </div>
              </li>
            </CSSTransition>
          ))
        )}
      </TransitionGroup>
    </div>
  );
}
