import axios from 'axios';
import { fetchAuthSession } from '@aws-amplify/auth';

// Get the API URL from environment variables or use a default
const API_URL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token in every request
api.interceptors.request.use(async (request) => {
  try {
    // Get the ID token from the current session
    let { idToken } = (await fetchAuthSession()).tokens ?? {};
    
    // If no token is found, try to force refresh the session
    if (!idToken) {
      const refreshedSession = await fetchAuthSession({ forceRefresh: true });
      idToken = refreshedSession.tokens?.idToken;
    }
    
    // Add the token to the Authorization header if available
    if (idToken) {
      request.headers.Authorization = `Bearer ${idToken.toString()}`;
    }
  } catch (err) {
    // Let the request proceed without the token
  }
  return request;
});

export const todoApi = {
  getAllTodos: async () => {
    const response = await api.get('/todos');
    
    // Check if the response is an array or has an items property
    if (Array.isArray(response.data)) {
      return response.data;
    } else if (response.data && response.data.items) {
      return response.data.items;
    } else {
      return [];
    }
  },
  
  getTodo: async (id: string) => {
    const response = await api.get(`/todos/${id}`);
    return response.data;
  },
  
  createTodo: async (todo: any) => {
    const response = await api.post('/todos', todo);
    return response.data;
  },
  
  updateTodo: async (id: string, todo: any) => {
    const response = await api.put(`/todos/${id}`, todo);
    return response.data;
  },
  
  deleteTodo: async (id: string) => {
    const response = await api.delete(`/todos/${id}`);
    return response.data;
  },
  
  // Notes API
  getNotes: async (todoId: string) => {
    const response = await api.get(`/todos/${todoId}/notes`);
    
    if (Array.isArray(response.data)) {
      return response.data;
    } else if (response.data && response.data.items) {
      return response.data.items;
    } else {
      return [];
    }
  },
  
  addNote: async (todoId: string, noteData: { content: string }) => {
    const response = await api.post(`/todos/${todoId}/notes`, noteData);
    return response.data;
  },
  
  deleteNote: async (todoId: string, noteId: string) => {
    const response = await api.delete(`/todos/${todoId}/notes/${noteId}`);
    return response.data;
  }
};

// Export todoApi as default for backward compatibility
export default todoApi;
