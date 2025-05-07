import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/auth/Login';
import TodoList from './components/todo/TodoList';
import Header from './components/layout/Header';
import { ChatBox } from './components/Chat';
import '@aws-amplify/ui-react/styles.css';
import { Authenticator, useAuthenticator } from '@aws-amplify/ui-react';
import { TodoProvider } from './context/TodoContext';
import './App.css';

// Protected route component
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { route } = useAuthenticator((context) => [context.route]);
  
  if (route !== 'authenticated') {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

function AppRoutes() {
  const { route } = useAuthenticator((context) => [context.route]);
  const [isChatOpen, setIsChatOpen] = React.useState(false);
  
  const toggleChat = () => {
    setIsChatOpen(!isChatOpen);
  };
  
  const closeChat = () => {
    setIsChatOpen(false);
  };
  
  return (
    <div className="app-container">
      <Header />
      <main className={`main-content ${isChatOpen ? 'with-chat' : ''}`}>
        <div className="content-area">
          <Routes>
            <Route path="/login" element={
              route === 'authenticated' ? <Navigate to="/" replace /> : <Login />
            } />
            <Route path="/" element={
              <RequireAuth>
                <TodoList />
              </RequireAuth>
            } />
            <Route path="/todos" element={
              <RequireAuth>
                <TodoList />
              </RequireAuth>
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
        
        {/* Chat component is available on all pages when authenticated */}
        {route === 'authenticated' && (
          <>
            {!isChatOpen && (
              <button 
                className="chat-toggle-button"
                onClick={toggleChat}
                aria-label="Open chat"
              >
                💬
              </button>
            )}
            
            {isChatOpen && (
              <div className="chat-container">
                <ChatBox onClose={closeChat} />
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function App() {
  return (
    <Authenticator.Provider>
      <BrowserRouter>
        <TodoProvider>
          <AppRoutes />
        </TodoProvider>
      </BrowserRouter>
    </Authenticator.Provider>
  );
}

export default App;
