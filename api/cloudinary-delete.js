import { v2 as cloudinary } from 'cloudinary';
import { verifyAdminToken } from './_auth.js';

export default async function handler(req, res) {
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

  // 2. Verificar credenciais do Cloudinary
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || 'ccfnbxfz';
  const apiKey = process.env.CLOUDINARY_API_KEY || '421453349311654';
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!apiSecret) {
    return res.status(500).json({
      error: 'Variável de ambiente CLOUDINARY_API_SECRET não está configurada no servidor.',
      code: 'CLOUDINARY_API_SECRET_MISSING'
    });
  }

  const { publicId, resourceType } = req.body || {};

  if (!publicId || typeof publicId !== 'string') {
    return res.status(400).json({ error: 'Parâmetro publicId é obrigatório para exclusão.' });
  }

  try {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true
    });

    const safeResourceType = (resourceType === 'video' || resourceType === 'raw') ? resourceType : 'image';

    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: safeResourceType,
      invalidate: true
    });

    return res.status(200).json({
      success: true,
      result: result.result || 'ok'
    });
  } catch (err) {
    console.error('Erro ao excluir mídia no Cloudinary:', err);
    return res.status(500).json({
      error: 'Falha ao excluir arquivo no Cloudinary: ' + err.message
    });
  }
}
