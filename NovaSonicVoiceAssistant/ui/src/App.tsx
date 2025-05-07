import React from 'react';
import { 
  createBrowserRouter, 
  RouterProvider, 
  createRoutesFromElements,
  Route, 
  Navigate,
  Outlet
} from 'react-router-dom';
import Login from './pages/auth/Login';
import TodoList from './components/todo/TodoList';
import Header from './components/layout/Header';
import { ChatBoxContainer } from './components/Chat/ChatBoxContainer';
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

function AppLayout() {
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
          {/* Outlet renders the current route */}
          <Outlet />
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
            
            <ChatBoxContainer onClose={closeChat} isVisible={isChatOpen} />
          </>
        )}
      </main>
    </div>
  );
}

// Create router with the v7 future flags enabled
const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<AppLayout />}>
      <Route path="/login" element={
        <Login />
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
    </Route>
  ),
  {
    // Silence warnings by using an empty future object
    future: {}
  }
);

function App() {
  return (
    <Authenticator.Provider>
      <TodoProvider>
        <RouterProvider router={router} />
      </TodoProvider>
    </Authenticator.Provider>
  );
}

export default App;
