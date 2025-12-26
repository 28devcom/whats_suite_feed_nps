import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ChatProvider } from './context/ChatContext.jsx';
import { ThemeModeProvider } from './context/ThemeModeContext.jsx';
import { NotifyProvider } from './context/NotifyContext.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeModeProvider>
      <BrowserRouter>
        <AuthProvider>
          <NotifyProvider>
            <ChatProvider>
              <ErrorBoundary>
                <App />
              </ErrorBoundary>
            </ChatProvider>
          </NotifyProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeModeProvider>
  </React.StrictMode>
);
