import axios from 'axios';
import { mockSongs, mockPlaylists } from './mockData';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
const USE_MOCK = process.env.REACT_APP_USE_MOCK === 'true';

// Use local mock data instead of external server
const mockData = {
  songs: mockSongs,
  playlists: mockPlaylists
};

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Mock API functions
const mockApi = {
  auth: {
    login: async (credentials) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (credentials.email === 'test@example.com' && credentials.password === 'password') {
        return {
          data: {
            access_token: 'mock-token',
            user_id: 'mock-user-id',
            token_type: 'Bearer'
          }
        };
      }
      throw new Error('Invalid credentials');
    },
    register: async (userData) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return {
        data: {
          message: 'User registered successfully',
          user_id: 'mock-user-id'
        }
      };
    }
  },
  songs: {
    getAll: async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
      return { data: { songs: mockData.songs } };
    },
    create: async (songData) => {
      await new Promise(resolve => setTimeout(resolve, 500));
      const newSong = {
        ...songData,
        song_id: Date.now().toString(),
        added_at: new Date().toISOString()
      };
      mockData.songs.push(newSong);
      return { data: { song: newSong } };
    },
    update: async (songId, updates) => {
      await new Promise(resolve => setTimeout(resolve, 500));
      const songIndex = mockData.songs.findIndex(s => s.song_id === songId);
      if (songIndex !== -1) {
        mockData.songs[songIndex] = { ...mockData.songs[songIndex], ...updates };
        return { data: { song: mockData.songs[songIndex] } };
      }
      throw new Error('Song not found');
    },
    delete: async (songId) => {
      await new Promise(resolve => setTimeout(resolve, 500));
      const songIndex = mockData.songs.findIndex(s => s.song_id === songId);
      if (songIndex !== -1) {
        mockData.songs.splice(songIndex, 1);
        return { data: { message: 'Song deleted' } };
      }
      throw new Error('Song not found');
    }
  },
  playlists: {
    getAll: async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
      return { data: { playlists: mockData.playlists } };
    },
    create: async (playlistData) => {
      await new Promise(resolve => setTimeout(resolve, 500));
      const newPlaylist = {
        ...playlistData,
        playlist_id: Date.now().toString(),
        song_count: 0,
        created_at: new Date().toISOString()
      };
      mockData.playlists.push(newPlaylist);
      return { data: { playlist: newPlaylist } };
    },
    update: async (playlistId, updates) => {
      await new Promise(resolve => setTimeout(resolve, 500));
      const playlistIndex = mockData.playlists.findIndex(p => p.playlist_id === playlistId);
      if (playlistIndex !== -1) {
        mockData.playlists[playlistIndex] = { ...mockData.playlists[playlistIndex], ...updates };
        return { data: { playlist: mockData.playlists[playlistIndex] } };
      }
      throw new Error('Playlist not found');
    },
    delete: async (playlistId) => {
      await new Promise(resolve => setTimeout(resolve, 500));
      const playlistIndex = mockData.playlists.findIndex(p => p.playlist_id === playlistId);
      if (playlistIndex !== -1) {
        mockData.playlists.splice(playlistIndex, 1);
        return { data: { message: 'Playlist deleted' } };
      }
      throw new Error('Playlist not found');
    }
  }
};

// Real API functions
const realApi = {
  auth: {
    login: (credentials) => api.post('/auth/login', credentials),
    register: (userData) => api.post('/auth/register', userData)
  },
  songs: {
    getAll: (params) => api.get('/songs', { params }),
    create: (songData) => api.post('/songs', songData),
    update: (songId, updates) => api.put(`/songs/${songId}`, updates),
    delete: (songId) => api.delete(`/songs/${songId}`)
  },
  playlists: {
    getAll: () => api.get('/playlists'),
    create: (playlistData) => api.post('/playlists', playlistData),
    get: (playlistId) => api.get(`/playlists/${playlistId}`),
    update: (playlistId, updates) => api.put(`/playlists/${playlistId}`, updates),
    delete: (playlistId) => api.delete(`/playlists/${playlistId}`),
    addSong: (playlistId, songData) => api.post(`/playlists/${playlistId}/songs`, songData)
  }
};

export default USE_MOCK ? mockApi : realApi;
