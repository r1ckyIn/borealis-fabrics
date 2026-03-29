import './instrument';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// Global styles - Ant Design handles most styling
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
