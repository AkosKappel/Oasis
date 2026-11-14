import React from 'react';
import ReactDOM from 'react-dom/client';
import { CaptureApp } from '@/features/capture/capture-app';
import '@/styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <CaptureApp />
  </React.StrictMode>,
);
