import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import viteCompression from 'vite-plugin-compression';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proxy = {};
  const apiProxyTarget = env.VITE_API_PROXY_TARGET || 'https://localhost';
  const isProd = mode === 'production';

  if (apiProxyTarget) {
    proxy['/api'] = {
      target: apiProxyTarget,
      changeOrigin: true
    };
  }

  return {
    plugins: [
      react(),
      viteCompression({ algorithm: 'brotliCompress', ext: '.br', deleteOriginFile: false }),
      viteCompression({ algorithm: 'gzip', ext: '.gz', deleteOriginFile: false })
    ],
    server: {
      port: 5173,
      https: true,
      proxy
    },
    build: {
      sourcemap: !isProd,
      treeshake: true,
      chunkSizeWarningLimit: 600,
      minify: 'esbuild',
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-mui': ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled']
          }
        }
      },
      esbuild: {
        drop: isProd ? ['console', 'debugger'] : []
      }
    }
  };
});
