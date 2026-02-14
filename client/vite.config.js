import { defineConfig, loadEnv } from 'vite';
import pkg from './package.json';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '../');

  return {
    envDir: '../',
    define: {
      'import.meta.env.VERSION': JSON.stringify(pkg.version),
    },
    server: {
      allowedHosts: [
        env.VITE_URL_MAPPING
      ],
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
          ws: true,
        },
        '/music': 'http://localhost:3001',
      },
      hmr: {
        clientPort: 443,
      },
    },
  };
});
