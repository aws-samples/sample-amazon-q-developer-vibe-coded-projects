import { Link, useNavigate } from 'react-router-dom';
import './Header.css';
import { useAuthenticator } from '@aws-amplify/ui-react';

export default function Header() {
  const { user, signOut } = useAuthenticator((context) => [context.user, context.signOut]);
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const userEmail = user?.signInDetails?.loginId || 'Guest';

  return (
    <header className="app-header">
      <div className="header-container">
        <div className="logo">
          <Link to="/">Smart <span>Todo</span> App</Link>
        </div>
        <nav className="nav-links">
          {user ? (
            <div className="user-menu">
              <span className="welcome-text">
                Hello, {userEmail}
              </span>
              <button onClick={handleSignOut} className="sign-out-btn">
                Sign Out
              </button>
            </div>
          ) : (
            <Link to="/login" className="sign-in-link">
              Sign In
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
