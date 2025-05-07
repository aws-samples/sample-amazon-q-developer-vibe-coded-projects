import { useEffect } from "react";
import { Authenticator, useAuthenticator, View, ThemeProvider, createTheme } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { useNavigate, useLocation } from 'react-router-dom';
import "./Login.css";

// Define custom theme for Amplify UI
const theme = createTheme({
  name: 'smart-todo-theme',
  tokens: {
    colors: {
      brand: {
        primary: {
          10: '#FEBD69',
          80: '#FF9900',
          90: '#E47911',
          100: '#E47911',
        },
      },
      font: {
        interactive: '#E47911',
      },
    },
    components: {
      button: {
        primary: {
          backgroundColor: '#FF9900',
          _hover: {
            backgroundColor: '#E47911',
          },
          color: '#000000',
        },
      },
      tabs: {
        item: {
          _active: {
            color: '#FF9900',
            borderColor: '#FF9900',
          },
        },
      },
    },
  },
});

export default function Login() {
  const { route } = useAuthenticator((context) => [context.route]);
  const location = useLocation();
  const navigate = useNavigate();
  const from = location.state?.from?.pathname || '/';
  
  useEffect(() => {
    if (route === 'authenticated') {
      navigate(from, { replace: true });
    }
  }, [route, navigate, from]);
  
  return (
    <div className="login-container">
      <div className="login-illustration">
        <img src="/login-illustration.svg" alt="Smart Todo App Illustration" />
        <div className="login-title">
          <h1>
            <span>Smart</span>
            <span className="highlight">Todo</span>
            <span>App</span>
          </h1>
          <p>Organize your tasks with Amazon Nova Sonic</p>
        </div>
      </div>
      <div className="login-form">
        <View className="auth-wrapper">
          <ThemeProvider theme={theme}>
            <Authenticator 
              loginMechanisms={['email']} 
              hideSignUp={false}
              components={{
                Footer: () => <div style={{ marginTop: '20px', textAlign: 'center' }}></div>,
              }}
            ></Authenticator>
          </ThemeProvider>
        </View>
      </div>
    </div>
  );
}
