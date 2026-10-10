import { resolve } from 'path';
import { defineConfig, loadEnv } from 'vite';
import signHandler from './api/cloudinary-sign.js';
import deleteHandler from './api/cloudinary-delete.js';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  Object.assign(process.env, env);

  return {
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
        name: 'admin-route-and-api-middleware',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            // Rota admin SPA rewrite
            if (req.url && req.url.startsWith('/admin') && !req.url.includes('.')) {
              req.url = '/admin/index.html';
              return next();
            }

            // Rotas de API para ambiente de desenvolvimento local
            if (req.url && req.url.startsWith('/api/')) {
              const urlObj = new URL(req.url, 'http://localhost');
              const pathname = urlObj.pathname;
              req.query = Object.fromEntries(urlObj.searchParams.entries());

              const chunks = [];
              req.on('data', chunk => chunks.push(chunk));
              req.on('end', async () => {
                const raw = Buffer.concat(chunks).toString();
                try {
                  req.body = JSON.parse(raw);
                } catch (e) {
                  req.body = {};
                }

                // Adapter para emular métodos res.status e res.json da Vercel
                res.status = function(code) {
                  res.statusCode = code;
                  return this;
                };
                res.json = function(data) {
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify(data));
                  return this;
                };

                try {
                  if (pathname === '/api/cloudinary-sign') {
                    await signHandler(req, res);
                  } else if (pathname === '/api/cloudinary-delete') {
                    await deleteHandler(req, res);
                  } else if (pathname === '/api/asaas-criar-cobranca') {
                    const asaasCriarHandler = (await import('./api/asaas-criar-cobranca.js')).default;
                    await asaasCriarHandler(req, res);
                  } else if (pathname === '/api/asaas-webhook') {
                    const asaasWebhookHandler = (await import('./api/asaas-webhook.js')).default;
                    await asaasWebhookHandler(req, res);
                  } else if (pathname === '/api/asaas-status') {
                    const asaasStatusHandler = (await import('./api/asaas-status.js')).default;
                    await asaasStatusHandler(req, res);
                  } else if (pathname === '/api/admin-cardapio') {
                    const adminCardapioHandler = (await import('./api/admin-cardapio.js')).default;
                    await adminCardapioHandler(req, res);
                  } else if (pathname === '/api/admin-configuracoes') {
                    const adminConfigHandler = (await import('./api/admin-configuracoes.js')).default;
                    await adminConfigHandler(req, res);
                  } else {
                    next();
                  }
                } catch (handlerErr) {
                  console.error('Erro na API no servidor dev:', handlerErr);
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: handlerErr.message }));
                }
              });
              return;
            }

            next();
          });
        },
      },
    ],
  };
});
