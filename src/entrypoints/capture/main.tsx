import React from 'react';
import ReactDOM from 'react-dom/client';
import { CaptureApp } from '@/features/capture/capture-app';
import '@/styles.css';
const request = new URLSearchParams(window.location.hash.slice(1));
const initialTab = {
  title: request.get('title') ?? undefined,
  url: request.get('url') ?? undefined,
};
const initialError = request.get('error') ?? undefined;
window.history.replaceState(null, '', window.location.pathname);
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <CaptureApp fullPage initialTab={initialTab} initialError={initialError} />
  </React.StrictMode>,
);
