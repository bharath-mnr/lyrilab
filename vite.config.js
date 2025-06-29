import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [tailwindcss(), react()],
    base: env.VITE_BASE_PATH || '/',
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      chunkSizeWarningLimit: 1600, // Increased for audio assets
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom')) {
                return 'vendor-react';
              }
              if (id.includes('tone') || id.includes('howler')) {
                return 'vendor-audio';
              }
              if (id.includes('react-router-dom')) {
                return 'vendor-router';
              }
              return 'vendor-other';
            }
            // Group components by feature
            if (id.includes('src/components/')) {
              const componentName = id.split('/').pop().split('.')[0];
              return `components-${componentName}`;
            }
          },
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]'
        }
      }
    },
    server: {
      historyApiFallback: {
        rewrites: [
          { from: /\/assets\/.*/, to: '/index.html' }, // Fix for asset paths
          { from: /./, to: '/index.html' } // All other paths
        ]
      },
      port: 3000,
      strictPort: true
    },
    preview: {
      port: 3000,
      strictPort: true
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        'tone',
        'howler'
      ],
      exclude: ['@tailwindcss/vite']
    }
  };
});