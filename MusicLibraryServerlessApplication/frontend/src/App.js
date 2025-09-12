import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Container } from '@mui/material';
import { AuthProvider } from './hooks/useAuth';
import { useAuth } from './hooks/useAuth';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Songs from './pages/Songs';
import Playlists from './pages/Playlists';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  return user ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <AuthProvider>
      <div className="App">
        <Navbar />
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/songs" element={
              <ProtectedRoute>
                <Songs />
              </ProtectedRoute>
            } />
            <Route path="/playlists" element={
              <ProtectedRoute>
                <Playlists />
              </ProtectedRoute>
            } />
          </Routes>
        </Container>
      </div>
    </AuthProvider>
  );
}

export default App;