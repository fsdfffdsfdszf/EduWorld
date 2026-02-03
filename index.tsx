import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');

const mountApp = () => {
  if (!rootElement) {
    console.error("LMS ERROR: Root element missing from DOM.");
    return;
  }

  try {
    console.log("LMS: Mounting Neural Core...");
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    console.log("LMS: System Operational.");
  } catch (error) {
    console.error("LMS CRITICAL: Mounting sequence aborted:", error);
    
    // Display error to user instead of a blank screen
    const errorOverlay = document.getElementById('critical-error');
    const errorMsg = document.getElementById('error-msg');
    if (errorOverlay && errorMsg) {
      errorOverlay.style.display = 'flex';
      errorMsg.textContent = error instanceof Error 
        ? `${error.name}: ${error.message}` 
        : "Failed to initialize React environment. Ensure your hosting supports ESM modules.";
    }
  }
};

// Start initialization
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountApp);
} else {
  // Use a small timeout to ensure all polyfills have propagated in the global scope
  setTimeout(mountApp, 10);
}
