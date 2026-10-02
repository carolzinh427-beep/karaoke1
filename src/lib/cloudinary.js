/**
 * Serviço de Integração com o Cloudinary (Front-end Seguro)
 * Executa upload direto assinado para a CDN do Cloudinary com progresso em tempo real
 * e sem trafegar arquivos pesados pela infraestrutura serverless da Vercel.
 */

// Limites e restrições de tamanho
export const LIMITS = {
  IMAGE_MAX_BYTES: 20 * 1024 * 1024, // 20 MB
  VIDEO_MAX_BYTES: 150 * 1024 * 1024, // 150 MB
  PDF_MAX_BYTES: 25 * 1024 * 1024, // 25 MB
};

export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'image/avif'
];

export const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/mov',
  'video/x-msvideo',
  'video/mpeg'
];

/**
 * Validação prévia de arquivos antes de qualquer tentativa de envio
 */
export function validateMediaFile(file, expectedType = 'imagem') {
  if (!file) {
    return { ok: false, error: 'Nenhum arquivo foi selecionado.' };
  }

  if (expectedType === 'video') {
    if (!file.type.startsWith('video/') && !ALLOWED_VIDEO_TYPES.includes(file.type)) {
      return {
        ok: false,
        error: `Formato de vídeo não suportado (${file.type || 'desconhecido'}). Envie arquivos MP4, WebM ou MOV.`
      };
    }
    if (file.size > LIMITS.VIDEO_MAX_BYTES) {
      const mb = (file.size / (1024 * 1024)).toFixed(1);
      return {
        ok: false,
        error: `O vídeo (${mb} MB) excede o limite máximo permitido de 150 MB.`
      };
    }
  } else if (expectedType === 'pdf') {
    if (file.type !== 'application/pdf') {
      return {
        ok: false,
        error: 'O arquivo selecionado deve ser exclusivamente um documento no formato PDF.'
      };
    }
    if (file.size > LIMITS.PDF_MAX_BYTES) {
      const mb = (file.size / (1024 * 1024)).toFixed(1);
      return {
        ok: false,
        error: `O PDF (${mb} MB) excede o limite máximo permitido de 25 MB.`
      };
    }
  } else {
    // Tipo imagem (default)
    if (!file.type.startsWith('image/') && !ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return {
        ok: false,
        error: `Formato de imagem não suportado (${file.type || 'desconhecido'}). Envie arquivos JPG, PNG ou WebP.`
      };
    }
    if (file.size > LIMITS.IMAGE_MAX_BYTES) {
      const mb = (file.size / (1024 * 1024)).toFixed(1);
      return {
        ok: false,
        error: `A imagem (${mb} MB) excede o limite máximo permitido de 20 MB.`
      };
    }
  }

  return { ok: true };
}

/**
 * Solicita ao servidor (/api/cloudinary-sign) parâmetros assinados com segurança
 */
async function getUploadSignature({ folder, idToken }) {
  const headers = {
    'Content-Type': 'application/json'
  };
  if (idToken) {
    headers['Authorization'] = `Bearer ${idToken}`;
  }

  const res = await fetch('/api/cloudinary-sign', {
    method: 'POST',
    headers,
    body: JSON.stringify({ folder })
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (data.code === 'CLOUDINARY_API_SECRET_MISSING') {
      throw new Error(
        'Configuração pendente: CLOUDINARY_API_SECRET não foi preenchida no servidor. ' +
        'Por favor, configure o API Secret nas variáveis de ambiente da Vercel ou no arquivo .env.local.'
      );
    }
    throw new Error(data.error || `Falha ao obter assinatura do servidor (${res.status}).`);
  }

  return data;
}

/**
 * Envia o arquivo diretamente para o Cloudinary utilizando XMLHttpRequest
 * para permitir acompanhamento de progresso percentual (0% a 100%) em tempo real.
 */
export async function uploadToCloudinary({ file, folder = 'backstage/galeria', onProgress = () => {}, idToken }) {
  // 1. Obter assinatura autenticada
  const signData = await getUploadSignature({ folder, idToken });
  const { signature, timestamp, apiKey, cloudName, folder: targetFolder } = signData;

  // 2. Montar FormData para o Cloudinary
  const formData = new FormData();
  formData.append('file', file);
  formData.append('api_key', apiKey);
  formData.append('timestamp', timestamp);
  formData.append('signature', signature);
  formData.append('folder', targetFolder);

  // 3. Realizar o upload com tracking de progresso
  const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', endpoint);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        const percent = Math.min(100, Math.round((event.loaded / event.total) * 100));
        onProgress(percent);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText);
          resolve({
            url: res.secure_url || res.url,
            publicId: res.public_id,
            resourceType: res.resource_type || (file.type.startsWith('video/') ? 'video' : 'image'),
            format: res.format,
            bytes: res.bytes || file.size,
            width: res.width,
            height: res.height,
            duration: res.duration
          });
        } catch (e) {
          reject(new Error('Resposta do Cloudinary não é um JSON válido.'));
        }
      } else {
        let errMessage = `Erro do Cloudinary (${xhr.status})`;
        try {
          const errRes = JSON.parse(xhr.responseText);
          if (errRes.error?.message) {
            errMessage = errRes.error.message;
          }
        } catch(e) {}
        reject(new Error(errMessage));
      }
    };

    xhr.onerror = () => {
      reject(new Error('Falha de conexão com os servidores do Cloudinary. Verifique sua rede.'));
    };

    xhr.ontimeout = () => {
      reject(new Error('Tempo limite excedido ao enviar arquivo para o Cloudinary.'));
    };

    xhr.send(formData);
  });
}

/**
 * Exclusão de arquivo no Cloudinary através do endpoint autenticado /api/cloudinary-delete
 */
export async function deleteFromCloudinary({ publicId, resourceType = 'image', idToken }) {
  if (!publicId) return { success: true };

  const headers = {
    'Content-Type': 'application/json'
  };
  if (idToken) {
    headers['Authorization'] = `Bearer ${idToken}`;
  }

  const res = await fetch('/api/cloudinary-delete', {
    method: 'POST',
    headers,
    body: JSON.stringify({ publicId, resourceType })
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || 'Erro ao excluir mídia no Cloudinary.');
  }

  return data;
}
