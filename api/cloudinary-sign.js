import { v2 as cloudinary } from 'cloudinary';
import { verifyAdminToken } from './_auth.js';

export default async function handler(req, res) {
  // Configurar CORS caso necessário
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido. Utilize POST.' });
  }

  // 1. Validar autenticação e autorização do Administrador
  const authCheck = await verifyAdminToken(req);
  if (!authCheck.ok) {
    return res.status(authCheck.status).json({ error: authCheck.error });
  }

  // 2. Verificar credenciais do Cloudinary no ambiente
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || 'ccfnbxfz';
  const apiKey = process.env.CLOUDINARY_API_KEY || '421453349311654';
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!apiSecret) {
    return res.status(500).json({
      error: 'Variável de ambiente CLOUDINARY_API_SECRET não está configurada no servidor. Por favor, adicione o API Secret no painel da Vercel (Environment Variables) ou no .env.local.',
      code: 'CLOUDINARY_API_SECRET_MISSING'
    });
  }

  try {
    // 3. Sanitizar pasta de destino
    const requestedFolder = (req.body?.folder || 'backstage/galeria').trim();
    // Permite apenas pastas dentro do escopo backstage/
    const safeFolder = requestedFolder.startsWith('backstage/') 
      ? requestedFolder.replace(/[^a-zA-Z0-9_\-\/]/g, '')
      : 'backstage/galeria';

    const timestamp = Math.round(new Date().getTime() / 1000);

    const paramsToSign = {
      folder: safeFolder,
      timestamp: timestamp
    };

    // 4. Gerar assinatura criptográfica segura usando o Cloudinary SDK
    const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);

    // 5. Retornar dados necessários para o upload direto (NUNCA expondo o API Secret)
    return res.status(200).json({
      signature,
      timestamp,
      folder: safeFolder,
      apiKey,
      cloudName
    });
  } catch (err) {
    console.error('Erro ao gerar assinatura Cloudinary:', err);
    return res.status(500).json({
      error: 'Falha ao processar assinatura para o Cloudinary: ' + err.message
    });
  }
}
