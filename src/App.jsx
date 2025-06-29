import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AudioProvider } from './contexts/AudioContext';
import Navbar from './layout/Navbar';
import AstronautAnimation from './loader/AstronautAnimation';
import HomePage from './pages/HomePage';
import ALL_TOOLS, { getCategorizedTools } from './config/tools';
import DocsPage from './pages/DocsPage';
import ContactPage from './pages/ContactPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsAndConditionsPage from './pages/TermsAndConditionsPage';

// Preload common components
const preloadedComponents = {
  VirtualPiano: lazy(() => import('./components/VirtualPiano')),
  GuitarFretboardApp: lazy(() => import('./components/GuitarFretboardApp')),
  // Add other frequently used components here
};

const App = () => {
  const categorizedTools = getCategorizedTools(ALL_TOOLS);
  const toolsForHomePage = ALL_TOOLS.filter(tool => tool.id !== 'home');

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
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
                <Route 
                  path="/" 
                  element={
                    <HomePage 
                      tools={toolsForHomePage} 
                      categorizedTools={categorizedTools} 
                    />
                  } 
                />
                
                {ALL_TOOLS.filter(tool => tool.id !== 'home').map(tool => {
                  const LazyComponent = preloadedComponents[tool.component] || 
                    lazy(() => import(`./components/${tool.component}`));

                  return (
                    <Route
                      key={tool.id}
                      path={tool.path}
                      element={
                        <Suspense fallback={<LoadingFallback toolName={tool.name} />}>
                          <LazyComponent />
                        </Suspense>
                      }
                    />
                  );
                })}
                
                <Route path="/docs" element={<DocsPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
                <Route path="/terms-and-conditions" element={<TermsAndConditionsPage />} />
                
                {/* Fallback route */}
                <Route path="*" element={<HomePage tools={toolsForHomePage} />} />
              </Routes>
            </Suspense>
          </main>
        </div>
      </AudioProvider>
    </Router>
  );
};

export default App;