import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        cardapio: resolve(__dirname, 'cardapio.html'),
        salas: resolve(__dirname, 'salas.html'),
        admin: resolve(__dirname, 'admin/index.html'),
      },
    },
  },
  plugins: [
    {
      name: 'admin-route-rewrite',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url && req.url.startsWith('/admin') && !req.url.includes('.')) {
            req.url = '/admin/index.html';
          }
          next();
        });
      },
    },
  ],
});
