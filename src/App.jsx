// // src/App.jsx
// import React, { Suspense, lazy } from 'react';
// import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
// import { AudioProvider } from './contexts/AudioContext';
// import Navbar from './layout/Navbar';
// import AstronautAnimation from './loader/AstronautAnimation';

// import ALL_TOOLS, { getCategorizedTools } from './config/tools';
// import DocsPage from './pages/DocsPage';
// import ContactPage from './pages/ContactPage';
// import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
// import TermsAndConditionsPage from './pages/TermsAndConditionsPage';

// // --- START: Fixed Dynamic Import Logic using Vite's import.meta.glob ---
// // Get all modules from pages, components, and games directories
// const allModules = {
//   // Pages
//   ...import.meta.glob('./pages/*.jsx', { eager: false }),
//   ...import.meta.glob('./pages/*.js', { eager: false }),
//   // Components (including nested)
//   ...import.meta.glob('./components/*.jsx', { eager: false }),
//   ...import.meta.glob('./components/*.js', { eager: false }),
//   ...import.meta.glob('./components/**/*.jsx', { eager: false }),
//   ...import.meta.glob('./components/**/*.js', { eager: false }),
//   // Games (including nested) - Added to resolve routing for game components
//   ...import.meta.glob('./games/*.jsx', { eager: false }),
//   ...import.meta.glob('./games/*.js', { eager: false }),
//   ...import.meta.glob('./games/**/*.jsx', { eager: false }),
//   ...import.meta.glob('./games/**/*.js', { eager: false })
// };

// // Create a mapping function to resolve the correct module path
// const getModulePath = (importPath) => {
//   // Normalize importPath to match glob keys (e.g., "./pages/HomePage.jsx")
//   const normalizedPath = importPath.startsWith('./') ? importPath : `./${importPath}`;
  
//   // First try exact match
//   if (allModules[normalizedPath]) {
//     return allModules[normalizedPath];
//   }
  
//   // If not found, try with common extensions
//   const pathWithoutExt = normalizedPath.replace(/\.(jsx?|tsx?)$/, '');
//   const possiblePaths = [
//     `${pathWithoutExt}.jsx`,
//     `${pathWithoutExt}.js`,
//     `${pathWithoutExt}.tsx`, // Include TypeScript extensions for broader compatibility
//     `${pathWithoutExt}.ts`
//   ];
  
//   for (const path of possiblePaths) {
//     if (allModules[path]) {
//       return allModules[path];
//     }
//   }
  
//   // If still not found, return null
//   return null;
// };

// const preloadedComponents = Object.fromEntries(
//   ALL_TOOLS.map(tool => [
//     tool.component,
//     lazy(() => {
//       const moduleLoader = getModulePath(tool.importPath);
      
//       if (!moduleLoader) {
//         console.error(`Module not found for ${tool.component} at ${tool.importPath}. Please check ALL_TOOLS and file paths.`);
//         // Return a fallback component if the module is not found
//         return Promise.resolve({
//           default: () => (
//             <div className="flex items-center justify-center min-h-screen bg-red-900 text-white text-xl p-4 text-center">
//               <p>Error loading {tool.name || tool.component} page. Please try again later.</p>
//             </div>
//           )
//         });
//       }

//       return moduleLoader().catch(error => {
//         console.error(`Failed to load component for ${tool.component} from ${tool.importPath}:`, error);
//         // Return a fallback component if the import fails
//         return {
//           default: () => (
//             <div className="flex items-center justify-center min-h-screen bg-red-900 text-white text-xl p-4 text-center">
//               <p>Error loading {tool.name || tool.component} page. Please try again later.</p>
//             </div>
//           )
//         };
//       });
//     })
//   ])
// );
// // --- END: Fixed Dynamic Import Logic ---

// const App = () => {
//   const categorizedTools = getCategorizedTools(ALL_TOOLS);
//   const toolsWithoutHome = ALL_TOOLS.filter(tool => tool.id !== 'home');

//   const LoadingFallback = ({ toolName = null }) => (
//     <div className="fixed inset-0 bg-gradient-to-br from-blue-900 to-blue-600 overflow-hidden z-50 flex flex-col items-center justify-center">
//       <AstronautAnimation />
//       <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 text-white text-lg font-medium z-20 text-center">
//         {toolName ? `Loading ${toolName}...` : 'Launching into the musical galaxy...'}
//       </div>
//     </div>
//   );

//   return (
//     <Router basename={import.meta.env.VITE_BASE_PATH || '/'}>
//       <AudioProvider>
//         <div className="flex flex-col min-h-screen">
//           <Navbar allTools={ALL_TOOLS} categorizedTools={categorizedTools} />

//           <main className="flex-grow">
//             {/* The main Suspense wraps all routes to catch any initial lazy loads */}
//             <Suspense fallback={<LoadingFallback />}>
//               <Routes>
//                 <Route
//                   path="/"
//                   element={
//                     <Suspense fallback={<LoadingFallback toolName="Home" />}>
//                       {/* Ensure 'HomePage' is a valid key in preloadedComponents */}
//                       {React.createElement(preloadedComponents['HomePage'], {
//                         tools: toolsWithoutHome,
//                         allTools: ALL_TOOLS,
//                         categorizedTools: categorizedTools
//                       })}
//                     </Suspense>
//                   }
//                 />

//                 {toolsWithoutHome.map(tool => {
//                   const LazyComponent = preloadedComponents[tool.component];

//                   if (!LazyComponent) {
//                     console.error(`Error: Lazy component "${tool.component}" not found in preloadedComponents.`);
//                     return null;
//                   }

//                   return (
//                     <Route
//                       key={tool.id}
//                       path={tool.path}
//                       element={
//                         <Suspense fallback={<LoadingFallback toolName={tool.name} />}>
//                           {React.createElement(LazyComponent)}
//                         </Suspense>
//                       }
//                     />
//                   );
//                 })}

//                 {/* Static Routes that are not part of ALL_TOOLS */}
//                 <Route path="/docs" element={<DocsPage />} />
//                 <Route path="/contact" element={<ContactPage />} />
//                 <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
//                 <Route path="/terms-and-conditions" element={<TermsAndConditionsPage />} />

//                 {/* Fallback route for 404 - redirects to Home or displays a 404 component */}
//                 <Route
//                   path="*"
//                   element={
//                     <Suspense fallback={<LoadingFallback toolName="Page Not Found" />}>
//                       {/* On 404, we redirect to Home and pass the relevant props */}
//                       {React.createElement(preloadedComponents['HomePage'], {
//                         tools: toolsWithoutHome,
//                         allTools: ALL_TOOLS,
//                         categorizedTools: categorizedTools
//                       })}
//                     </Suspense>
//                   }
//                 />
//               </Routes>
//             </Suspense>
//           </main>
//         </div>
//       </AudioProvider>
//     </Router>
//   );
// };

// export default App;








// // src/App.jsx
// import React, { Suspense, lazy } from 'react';
// import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
// import { AudioProvider } from './contexts/AudioContext';
// import Navbar from './layout/Navbar';
// import AstronautAnimation from './loader/AstronautAnimation';

// import ALL_TOOLS, { getCategorizedTools } from './config/tools';
// import DocsPage from './pages/DocsPage';
// import ContactPage from './pages/ContactPage';
// import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
// import TermsAndConditionsPage from './pages/TermsAndConditionsPage';

// // --- START: Fixed Dynamic Import Logic using Vite's import.meta.glob ---
// // Get all modules from pages, components, and games directories
// const allModules = {
//   // Pages
//   ...import.meta.glob('./pages/*.jsx', { eager: false }),
//   ...import.meta.glob('./pages/*.js', { eager: false }),
//   // Components (including nested)
//   ...import.meta.glob('./components/*.jsx', { eager: false }),
//   ...import.meta.glob('./components/*.js', { eager: false }),
//   ...import.meta.glob('./components/**/*.jsx', { eager: false }),
//   ...import.meta.glob('./components/**/*.js', { eager: false }),
//   // Games (including nested) - Added to resolve routing for game components
//   ...import.meta.glob('./games/*.jsx', { eager: false }),
//   ...import.meta.glob('./games/*.js', { eager: false }),
//   ...import.meta.glob('./games/**/*.jsx', { eager: false }),
//   ...import.meta.glob('./games/**/*.js', { eager: false })
// };

// // Create a mapping function to resolve the correct module path
// const getModulePath = (importPath) => {
//   // Normalize importPath to match glob keys (e.g., "./pages/HomePage.jsx")
//   const normalizedPath = importPath.startsWith('./') ? importPath : `./${importPath}`;
  
//   // First try exact match
//   if (allModules[normalizedPath]) {
//     return allModules[normalizedPath];
//   }
  
//   // If not found, try with common extensions
//   const pathWithoutExt = normalizedPath.replace(/\.(jsx?|tsx?)$/, '');
//   const possiblePaths = [
//     `${pathWithoutExt}.jsx`,
//     `${pathWithoutExt}.js`,
//     `${pathWithoutExt}.tsx`, // Include TypeScript extensions for broader compatibility
//     `${pathWithoutExt}.ts`
//   ];
  
//   for (const path of possiblePaths) {
//     if (allModules[path]) {
//       return allModules[path];
//     }
//   }
  
//   // If still not found, return null
//   return null;
// };

// const preloadedComponents = Object.fromEntries(
//   ALL_TOOLS.map(tool => [
//     tool.component,
//     lazy(() => {
//       const moduleLoader = getModulePath(tool.importPath);
      
//       if (!moduleLoader) {
//         console.error(`Module not found for ${tool.component} at ${tool.importPath}. Please check ALL_TOOLS and file paths.`);
//         // Return a fallback component if the module is not found
//         return Promise.resolve({
//           default: () => (
//             <div className="flex items-center justify-center min-h-screen bg-red-900 text-white text-xl p-4 text-center">
//               <p>Error loading {tool.name || tool.component} page. Please try again later.</p>
//             </div>
//           )
//         });
//       }

//       return moduleLoader().catch(error => {
//         console.error(`Failed to load component for ${tool.component} from ${tool.importPath}:`, error);
//         // Return a fallback component if the import fails
//         return {
//           default: () => (
//             <div className="flex items-center justify-center min-h-screen bg-red-900 text-white text-xl p-4 text-center">
//               <p>Error loading {tool.name || tool.component} page. Please try again later.</p>
//             </div>
//           )
//         };
//       });
//     })
//   ])
// );
// // --- END: Fixed Dynamic Import Logic ---

// // Component to handle static file access (prevents React Router from catching them)
// const StaticFileHandler = () => {
//   React.useEffect(() => {
//     // This will never actually render, as the browser will serve the static file
//     // But this prevents React Router from intercepting the request
//     window.location.replace(window.location.pathname);
//   }, []);
//   return null;
// };

// const App = () => {
//   const categorizedTools = getCategorizedTools(ALL_TOOLS);
//   const toolsWithoutHome = ALL_TOOLS.filter(tool => tool.id !== 'home');

//   const LoadingFallback = ({ toolName = null }) => (
//     <div className="fixed inset-0 bg-gradient-to-br from-blue-900 to-blue-600 overflow-hidden z-50 flex flex-col items-center justify-center">
//       <AstronautAnimation />
//       <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 text-white text-lg font-medium z-20 text-center">
//         {toolName ? `Loading ${toolName}...` : 'Launching into the musical galaxy...'}
//       </div>
//     </div>
//   );

//   return (
//     <Router basename={import.meta.env.VITE_BASE_PATH || '/'}>
//       <AudioProvider>
//         <div className="flex flex-col min-h-screen">
//           <Navbar allTools={ALL_TOOLS} categorizedTools={categorizedTools} />

//           <main className="flex-grow">
//             {/* The main Suspense wraps all routes to catch any initial lazy loads */}
//             <Suspense fallback={<LoadingFallback />}>
//               <Routes>
//                 <Route
//                   path="/"
//                   element={
//                     <Suspense fallback={<LoadingFallback toolName="Home" />}>
//                       {/* Ensure 'HomePage' is a valid key in preloadedComponents */}
//                       {React.createElement(preloadedComponents['HomePage'], {
//                         tools: toolsWithoutHome,
//                         allTools: ALL_TOOLS,
//                         categorizedTools: categorizedTools
//                       })}
//                     </Suspense>
//                   }
//                 />

//                 {toolsWithoutHome.map(tool => {
//                   const LazyComponent = preloadedComponents[tool.component];

//                   if (!LazyComponent) {
//                     console.error(`Error: Lazy component "${tool.component}" not found in preloadedComponents.`);
//                     return null;
//                   }

//                   return (
//                     <Route
//                       key={tool.id}
//                       path={tool.path}
//                       element={
//                         <Suspense fallback={<LoadingFallback toolName={tool.name} />}>
//                           {React.createElement(LazyComponent)}
//                         </Suspense>
//                       }
//                     />
//                   );
//                 })}

//                 {/* Static Routes that are not part of ALL_TOOLS */}
//                 <Route path="/docs" element={<DocsPage />} />
//                 <Route path="/contact" element={<ContactPage />} />
//                 <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
//                 <Route path="/terms-and-conditions" element={<TermsAndConditionsPage />} />

//                 {/* IMPORTANT: Add these routes to prevent React Router from catching static files */}
//                 <Route path="/sitemap.xml" element={<StaticFileHandler />} />
//                 <Route path="/robots.txt" element={<StaticFileHandler />} />
//                 <Route path="/favicon.ico" element={<StaticFileHandler />} />
                
//                 {/* Fallback route for 404 - redirects to Home or displays a 404 component */}
//                 <Route
//                   path="*"
//                   element={
//                     <Suspense fallback={<LoadingFallback toolName="Page Not Found" />}>
//                       {/* On 404, we redirect to Home and pass the relevant props */}
//                       {React.createElement(preloadedComponents['HomePage'], {
//                         tools: toolsWithoutHome,
//                         allTools: ALL_TOOLS,
//                         categorizedTools: categorizedTools
//                       })}
//                     </Suspense>
//                   }
//                 />
//               </Routes>
//             </Suspense>
//           </main>
//         </div>
//       </AudioProvider>
//     </Router>
//   );
// };

// export default App;




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

// --- START: Fixed Dynamic Import Logic using Vite's import.meta.glob ---
// Get all modules from pages, components, and games directories
const allModules = {
  // Pages
  ...import.meta.glob('./pages/*.jsx', { eager: false }),
  ...import.meta.glob('./pages/*.js', { eager: false }),
  // Components (including nested)
  ...import.meta.glob('./components/*.jsx', { eager: false }),
  ...import.meta.glob('./components/*.js', { eager: false }),
  ...import.meta.glob('./components/**/*.jsx', { eager: false }),
  ...import.meta.glob('./components/**/*.js', { eager: false }),
  // Games (including nested) - Added to resolve routing for game components
  ...import.meta.glob('./games/*.jsx', { eager: false }),
  ...import.meta.glob('./games/*.js', { eager: false }),
  ...import.meta.glob('./games/**/*.jsx', { eager: false }),
  ...import.meta.glob('./games/**/*.js', { eager: false })
};

// Create a mapping function to resolve the correct module path
const getModulePath = (importPath) => {
  // Normalize importPath to match glob keys (e.g., "./pages/HomePage.jsx")
  const normalizedPath = importPath.startsWith('./') ? importPath : `./${importPath}`;
  
  // First try exact match
  if (allModules[normalizedPath]) {
    return allModules[normalizedPath];
  }
  
  // If not found, try with common extensions
  const pathWithoutExt = normalizedPath.replace(/\.(jsx?|tsx?)$/, '');
  const possiblePaths = [
    `${pathWithoutExt}.jsx`,
    `${pathWithoutExt}.js`,
    `${pathWithoutExt}.tsx`, // Include TypeScript extensions for broader compatibility
    `${pathWithoutExt}.ts`
  ];
  
  for (const path of possiblePaths) {
    if (allModules[path]) {
      return allModules[path];
    }
  }
  
  // If still not found, return null
  return null;
};

const preloadedComponents = Object.fromEntries(
  ALL_TOOLS.map(tool => [
    tool.component,
    lazy(() => {
      const moduleLoader = getModulePath(tool.importPath);
      
      if (!moduleLoader) {
        console.error(`Module not found for ${tool.component} at ${tool.importPath}. Please check ALL_TOOLS and file paths.`);
        // Return a fallback component if the module is not found
        return Promise.resolve({
          default: () => (
            <div className="flex items-center justify-center min-h-screen bg-red-900 text-white text-xl p-4 text-center">
              <p>Error loading {tool.name || tool.component} page. Please try again later.</p>
            </div>
          )
        });
      }

      return moduleLoader().catch(error => {
        console.error(`Failed to load component for ${tool.component} from ${tool.importPath}:`, error);
        // Return a fallback component if the import fails
        return {
          default: () => (
            <div className="flex items-center justify-center min-h-screen bg-red-900 text-white text-xl p-4 text-center">
              <p>Error loading {tool.name || tool.component} page. Please try again later.</p>
            </div>
          )
        };
      });
    })
  ])
);
// --- END: Fixed Dynamic Import Logic ---

// Component to serve XML sitemap content directly
const SitemapHandler = () => {
  React.useEffect(() => {
    // Set the proper content type and serve the XML
    document.querySelector('html').innerHTML = `
      <?xml version="1.0" encoding="UTF-8"?>
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        <url>
          <loc>https://www.lyrilab.com</loc>
          <lastmod>2025-07-19T11:50:35.244Z</lastmod>
          <priority>1.0</priority>
        </url>
        <url>
          <loc>https://www.lyrilab.com/eq-studio</loc>
          <lastmod>2025-07-19T11:50:35.244Z</lastmod>
          <priority>0.8</priority>
        </url>
        <url>
          <loc>https://www.lyrilab.com/reverb-studio</loc>
          <lastmod>2025-07-19T11:50:35.244Z</lastmod>
          <priority>0.8</priority>
        </url>
        <url>
          <loc>https://www.lyrilab.com/slowed-reverb-studio</loc>
          <lastmod>2025-07-19T11:50:35.244Z</lastmod>
          <priority>0.8</priority>
        </url>
        <url>
          <loc>https://www.lyrilab.com/3D-audio-studio</loc>
          <lastmod>2025-07-19T11:50:35.244Z</lastmod>
          <priority>0.8</priority>
        </url>
        <url>
          <loc>https://www.lyrilab.com/bass-booster</loc>
          <lastmod>2025-07-19T11:50:35.244Z</lastmod>
          <priority>0.8</priority>
        </url>
        <url>
          <loc>https://www.lyrilab.com/virtual-piano</loc>
          <lastmod>2025-07-19T11:50:35.244Z</lastmod>
          <priority>0.8</priority>
        </url>
        <url>
          <loc>https://www.lyrilab.com/drum-machine</loc>
          <lastmod>2025-07-19T11:50:35.244Z</lastmod>
          <priority>0.8</priority>
        </url>
        <url>
          <loc>https://www.lyrilab.com/tap-tempo-tool</loc>
          <lastmod>2025-07-19T11:50:35.244Z</lastmod>
          <priority>0.8</priority>
        </url>
        <url>
          <loc>https://www.lyrilab.com/time-signature-metronome</loc>
          <lastmod>2025-07-19T11:50:35.244Z</lastmod>
          <priority>0.8</priority>
        </url>
        <url>
          <loc>https://www.lyrilab.com/chord-explorer</loc>
          <lastmod>2025-07-19T11:50:35.244Z</lastmod>
          <priority>0.8</priority>
        </url>
        <url>
          <loc>https://www.lyrilab.com/chord-progression-builder</loc>
          <lastmod>2025-07-19T11:50:35.244Z</lastmod>
          <priority>0.8</priority>
        </url>
        <url>
          <loc>https://www.lyrilab.com/scale-explorer</loc>
          <lastmod>2025-07-19T11:50:35.244Z</lastmod>
          <priority>0.8</priority>
        </url>
        <url>
          <loc>https://www.lyrilab.com/interval-training</loc>
          <lastmod>2025-07-19T11:50:35.244Z</lastmod>
          <priority>0.8</priority>
        </url>
        <url>
          <loc>https://www.lyrilab.com/circle-of-fifths</loc>
          <lastmod>2025-07-19T11:50:35.244Z</lastmod>
          <priority>0.8</priority>
        </url>
        <url>
          <loc>https://www.lyrilab.com/arpeggiator-sequencer</loc>
          <lastmod>2025-07-19T11:50:35.244Z</lastmod>
          <priority>0.8</priority>
        </url>
        <url>
          <loc>https://www.lyrilab.com/wavetable-editor</loc>
          <lastmod>2025-07-19T11:50:35.244Z</lastmod>
          <priority>0.8</priority>
        </url>
        <url>
          <loc>https://www.lyrilab.com/lfo-modulation</loc>
          <lastmod>2025-07-19T11:50:35.244Z</lastmod>
          <priority>0.8</priority>
        </url>
        <url>
          <loc>https://www.lyrilab.com/adsr-envelope-tool</loc>
          <lastmod>2025-07-19T11:50:35.244Z</lastmod>
          <priority>0.8</priority>
        </url>
        <url>
          <loc>https://www.lyrilab.com/eq-explorer</loc>
          <lastmod>2025-07-19T11:50:35.244Z</lastmod>
          <priority>0.8</priority>
        </url>
        <url>
          <loc>https://www.lyrilab.com/compression-explorer</loc>
          <lastmod>2025-07-19T11:50:35.244Z</lastmod>
          <priority>0.8</priority>
        </url>
        <url>
          <loc>https://www.lyrilab.com/reverb-explorer</loc>
          <lastmod>2025-07-19T11:50:35.244Z</lastmod>
          <priority>0.8</priority>
        </url>
        <url>
          <loc>https://www.lyrilab.com/delay-explorer</loc>
          <lastmod>2025-07-19T11:50:35.244Z</lastmod>
          <priority>0.8</priority>
        </url>
        <url>
          <loc>https://www.lyrilab.com/polyrhythm-sequencer</loc>
          <lastmod>2025-07-19T11:50:35.244Z</lastmod>
          <priority>0.8</priority>
        </url>
        <url>
          <loc>https://www.lyrilab.com/euclidean-rhythm-generator</loc>
          <lastmod>2025-07-19T11:50:35.244Z</lastmod>
          <priority>0.8</priority>
        </url>
        <url>
          <loc>https://www.lyrilab.com/chord-training-quiz</loc>
          <lastmod>2025-07-19T11:50:35.244Z</lastmod>
          <priority>0.8</priority>
        </url>
        <url>
          <loc>https://www.lyrilab.com/ear-training-quiz</loc>
          <lastmod>2025-07-19T11:50:35.244Z</lastmod>
          <priority>0.8</priority>
        </url>
        <url>
          <loc>https://www.lyrilab.com/synthesis-challenge</loc>
          <lastmod>2025-07-19T11:50:35.244Z</lastmod>
          <priority>0.8</priority>
        </url>
        <url>
          <loc>https://www.lyrilab.com/humanizer-panel</loc>
          <lastmod>2025-07-19T11:50:35.244Z</lastmod>
          <priority>0.8</priority>
        </url>
        <url>
          <loc>https://www.lyrilab.com/portamento-glide</loc>
          <lastmod>2025-07-19T11:50:35.244Z</lastmod>
          <priority>0.8</priority>
        </url>
        <url>
          <loc>https://www.lyrilab.com/waveform-combiner</loc>
          <lastmod>2025-07-19T11:50:35.244Z</lastmod>
          <priority>0.8</priority>
        </url>
        <url>
          <loc>https://www.lyrilab.com/consonance-dissonance</loc>
          <lastmod>2025-07-19T11:50:35.244Z</lastmod>
          <priority>0.8</priority>
        </url>
        <url>
          <loc>https://www.lyrilab.com/piano-roll-basics</loc>
          <lastmod>2025-07-19T11:50:35.244Z</lastmod>
          <priority>0.8</priority>
        </url>
        <url>
          <loc>https://www.lyrilab.com/panner-tool</loc>
          <lastmod>2025-07-19T11:50:35.244Z</lastmod>
          <priority>0.8</priority>
        </url>
        <url>
          <loc>https://www.lyrilab.com/mid-side-explorer</loc>
          <lastmod>2025-07-19T11:50:35.244Z</lastmod>
          <priority>0.8</priority>
        </url>
        <url>
          <loc>https://www.lyrilab.com/pitch-shift-explorer</loc>
          <lastmod>2025-07-19T11:50:35.244Z</lastmod>
          <priority>0.8</priority>
        </url>
        <url>
          <loc>https://www.lyrilab.com/stereo-imager-explorer</loc>
          <lastmod>2025-07-19T11:50:35.244Z</lastmod>
          <priority>0.8</priority>
        </url>
        <url>
          <loc>https://www.lyrilab.com/limiter-explorer</loc>
          <lastmod>2025-07-19T11:50:35.244Z</lastmod>
          <priority>0.8</priority>
        </url>
        <url>
          <loc>https://www.lyrilab.com/saturation-explorer</loc>
          <lastmod>2025-07-19T11:50:35.244Z</lastmod>
          <priority>0.8</priority>
        </url>
        <url>
          <loc>https://www.lyrilab.com/chorus-explorer</loc>
          <lastmod>2025-07-19T11:50:35.244Z</lastmod>
          <priority>0.8</priority>
        </url>
        <url>
          <loc>https://www.lyrilab.com/tremolo-explorer</loc>
          <lastmod>2025-07-19T11:50:35.244Z</lastmod>
          <priority>0.8</priority>
        </url>
        <url>
          <loc>https://www.lyrilab.com/granular-explorer</loc>
          <lastmod>2025-07-19T11:50:35.244Z</lastmod>
          <priority>0.8</priority>
        </url>
        <url>
          <loc>https://www.lyrilab.com/beat-repeat-looper</loc>
          <lastmod>2025-07-19T11:50:35.244Z</lastmod>
          <priority>0.8</priority>
        </url>
        <url>
          <loc>https://www.lyrilab.com/swing-groove-visualizer</loc>
          <lastmod>2025-07-19T11:50:35.244Z</lastmod>
          <priority>0.8</priority>
        </url>
        <url>
          <loc>https://www.lyrilab.com/drum-sequencer-game</loc>
          <lastmod>2025-07-19T11:50:35.244Z</lastmod>
          <priority>0.8</priority>
        </url>
      </urlset>
    `;
    
    // Try to set the correct content type
    try {
      document.contentType = 'application/xml';
    } catch (e) {
      // Fallback if setting content type fails
      console.log('Could not set content type');
    }
  }, []);

  return null;
};

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
                      {/* Ensure 'HomePage' is a valid key in preloadedComponents */}
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

                {/* IMPORTANT: Add these routes to serve static content */}
                <Route path="/sitemap.xml" element={<SitemapHandler />} />
                
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