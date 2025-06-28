// src/App.jsx
import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AudioProvider } from './contexts/AudioContext.jsx';
import Navbar from './layout/Navbar.jsx';
// Footer import is no longer needed here if not used globally
// import Footer from './layout/Footer.jsx'; 

// Import the AstronautAnimation component
import AstronautAnimation from './loader/AstronautAnimation.jsx';

// HomePage import path
import HomePage from './pages/HomePage.jsx';

// Import ALL_TOOLS as default, and getCategorizedTools as named
import ALL_TOOLS, { getCategorizedTools } from './config/tools.js';

// Import the new pages directly
import DocsPage from './pages/DocsPage.jsx';
import ContactPage from './pages/ContactPage.jsx';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage.jsx'; // Import the new Privacy Policy page
import TermsAndConditionsPage from './pages/TermsAndConditionsPage.jsx'; // Import the new Terms & Conditions page

const App = () => {
  // Use ALL_TOOLS imported as default
  const categorizedTools = getCategorizedTools(ALL_TOOLS);
  const toolsForHomePage = ALL_TOOLS.filter(tool => tool.id !== 'home');

  // Create a consistent loader component
  const LoadingFallback = ({ toolName = null }) => (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-900 to-blue-600 overflow-hidden z-50 flex flex-col items-center justify-center">
      <AstronautAnimation />
      <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 text-white text-lg font-medium z-20 text-center">
        {toolName ? `Loading ${toolName}...` : 'Launching into the musical galaxy...'}
      </div>
    </div>
  );

  return (
    <Router>
      <AudioProvider>
        {/* Main layout container: flex-col ensures children stack vertically, min-h-screen ensures it takes full height */}
        {/* The main content area will flex-grow to push content down if needed */}
        <div className="flex flex-col min-h-screen">
          {/* Navbar is outside Routes so it's always visible on all pages */}
          <Navbar allTools={ALL_TOOLS} categorizedTools={categorizedTools} />

          {/* Main content area, takes up available space */}
          <main className="flex-grow">
            {/* Use AstronautAnimation as the fallback for the main Suspense boundary */}
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
                {ALL_TOOLS.map(tool => {
                  if (tool.id === 'home') {
                    // Pass ALL_TOOLS and categorizedTools to HomePage if needed there
                    return (
                      <Route
                        key="home"
                        path="/"
                        element={<HomePage tools={toolsForHomePage} allTools={ALL_TOOLS} categorizedTools={categorizedTools} />}
                      />
                    );
                  }

                  // Ensure the importPath also includes the .jsx extension if not already present
                  const importPathWithExtension = tool.importPath.endsWith('.jsx') || tool.importPath.endsWith('.js')
                    ? tool.importPath
                    : `${tool.importPath}.jsx`; // Assume .jsx for components

                  const LazyComponent = lazy(() => import(/* @vite-ignore */ `${importPathWithExtension}`));

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
                {/* Routes for Docs, Contact, Privacy Policy, and Terms & Conditions pages */}
                <Route path="/docs" element={<DocsPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/privacy-policy" element={<PrivacyPolicyPage />} /> {/* New Route */}
                <Route path="/terms-and-conditions" element={<TermsAndConditionsPage />} /> {/* New Route */}
              </Routes>
            </Suspense>
          </main>

          {/* Footer is now removed from here and will only appear if included within specific page components */}
          {/* <Footer /> */} 
        </div>
      </AudioProvider>
    </Router>
  );
}

export default App;
