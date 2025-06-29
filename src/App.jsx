// src/App.jsx
import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AudioProvider } from './contexts/AudioContext';
import Navbar from './layout/Navbar';
import AstronautAnimation from './loader/AstronautAnimation';

import ALL_TOOLS, { getCategorizedTools } from './config/tools';
import DocsPage from './pages/DocsPage';
import ContactPage from './pages/ContactPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsAndConditionsPage from './pages/TermsAndConditionsPage';

// --- START: Enhanced Dynamic Import Logic ---
const preloadedComponents = Object.fromEntries(
  ALL_TOOLS.map(tool => [
    tool.component,
    lazy(() =>
      import(/* @vite-ignore */ `${tool.importPath}`)
        .catch(error => {
          console.error(`Failed to load component for ${tool.component} from ${tool.importPath}:`, error);
          // Return a fallback component if the import fails
          return {
            default: () => (
              <div className="flex items-center justify-center min-h-screen bg-red-900 text-white text-xl p-4 text-center">
                <p>Error loading {tool.name || tool.component} page. Please try again later.</p>
              </div>
            )
          };
        })
    )
  ])
);
// --- END: Enhanced Dynamic Import Logic ---


const App = () => {
  const categorizedTools = getCategorizedTools(ALL_TOOLS);
  const toolsWithoutHome = ALL_TOOLS.filter(tool => tool.id !== 'home');

  const LoadingFallback = ({ toolName = null }) => (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-900 to-blue-600 overflow-hidden z-50 flex flex-col items-center justify-center">
      <AstronautAnimation />
      <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 text-white text-lg font-medium z-20 text-center">
        {toolName ? `Loading ${toolName}...` : 'Launching into the musical galaxy...'}
      </div>
    </div>
  );

  return (
    <Router basename={import.meta.env.VITE_BASE_PATH || '/'}>
      <AudioProvider>
        <div className="flex flex-col min-h-screen">
          <Navbar allTools={ALL_TOOLS} categorizedTools={categorizedTools} />

          <main className="flex-grow">
            {/* The main Suspense wraps all routes to catch any initial lazy loads */}
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
                <Route
                  path="/"
                  element={
                    <Suspense fallback={<LoadingFallback toolName="Home" />}>
                      {React.createElement(preloadedComponents['HomePage'], {
                        tools: toolsWithoutHome,
                        allTools: ALL_TOOLS,
                        categorizedTools: categorizedTools
                      })}
                    </Suspense>
                  }
                />

                {toolsWithoutHome.map(tool => {
                  const LazyComponent = preloadedComponents[tool.component];

                  if (!LazyComponent) {
                    console.error(`Error: Lazy component "${tool.component}" not found in preloadedComponents.`);
                    return null;
                  }

                  return (
                    <Route
                      key={tool.id}
                      path={tool.path}
                      element={
                        <Suspense fallback={<LoadingFallback toolName={tool.name} />}>
                          {React.createElement(LazyComponent)}
                        </Suspense>
                      }
                    />
                  );
                })}

                {/* Static Routes that are not part of ALL_TOOLS */}
                <Route path="/docs" element={<DocsPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
                <Route path="/terms-and-conditions" element={<TermsAndConditionsPage />} />

                {/* Fallback route for 404 - redirects to Home or displays a 404 component */}
                <Route
                  path="*"
                  element={
                    <Suspense fallback={<LoadingFallback toolName="Page Not Found" />}>
                      {/* On 404, we redirect to Home and pass the relevant props */}
                      {React.createElement(preloadedComponents['HomePage'], {
                        tools: toolsWithoutHome,
                        allTools: ALL_TOOLS,
                        categorizedTools: categorizedTools
                      })}
                    </Suspense>
                  }
                />
              </Routes>
            </Suspense>
          </main>
        </div>
      </AudioProvider>
    </Router>
  );
};

export default App;