import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

if (window.location.hostname === '127.0.0.1') {
  const localhostUrl = new URL(window.location.href);
  localhostUrl.hostname = 'localhost';
  window.location.replace(localhostUrl.toString());
} else {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
