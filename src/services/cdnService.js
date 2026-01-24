
// CDN API konfigürasyonu
const CDN_CONFIG = {
  baseUrl: import.meta.env.VITE_CDN_BASE_URL || 'http://localhost',
  apiKey: import.meta.env.VITE_CDN_API_KEY || 'kurkayAyazilimSahadabulusam02awsexcvcxs03-w4'
};

// API anahtarı al
const getApiKey = () => {
  return CDN_CONFIG.apiKey;
};

// Hata yönetimi
const handleError = (error) => {
  console.error('CDN Service Error:', error);
  return {
    success: false,
    error: error.message || 'CDN servisinde hata oluştu'
  };
};

// Resim yükleme
export const uploadImage = async (file, category, userId) => {
  try {
    // Dosya validasyonu
    if (!file) {
      throw new Error('Dosya seçilmedi');
    }

    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      throw new Error('Sadece resim dosyaları ve PDF yüklenebilir');
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB
      throw new Error('Dosya boyutu 10MB\'dan küçük olmalıdır');
    }

    const formData = new FormData();
    formData.append('image', file);
    formData.append('category', category);
    formData.append('user_id', userId);

    console.log('CDN Upload URL:', `${CDN_CONFIG.baseUrl}`);
    console.log('API Key:', getApiKey());
    console.log('Form Data:', {
      category,
      userId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    });

    const response = await fetch(`${CDN_CONFIG.baseUrl}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getApiKey()}`
      },
      body: formData
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);

    const result = await response.json();
    console.log('Response data:', result);

    if (!response.ok) {
      throw new Error(result.message || 'Resim yüklenemedi');
    }

    return {
      success: true,
      data: result.data
    };
  } catch (error) {
    console.error('Upload error details:', error);
    return handleError(error);
  }
};

// Resim listesi getir
export const getImages = async (category = '', userId = '') => {
  try {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (userId) params.append('user_id', userId);

    const response = await fetch(`${CDN_CONFIG.baseUrl}?${params.toString()}`);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Resimler alınamadı');
    }

    return {
      success: true,
      data: result.data
    };
  } catch (error) {
    return handleError(error);
  }
};

// Resim sil
export const deleteImage = async (imageId) => {
  try {
    const response = await fetch(`${CDN_CONFIG.baseUrl}?id=${imageId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${getApiKey()}`
      }
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Resim silinemedi');
    }

    return {
      success: true,
      message: result.message
    };
  } catch (error) {
    return handleError(error);
  }
};

// Resim URL'i oluştur
export const getImageUrl = (imagePath) => {
  if (!imagePath) return null;
  
  // Eğer tam URL ise direkt döndür
  if (imagePath.startsWith('http')) {
    return imagePath;
  }
  
  // Eğer sadece path ise base URL ile birleştir
  return `${CDN_CONFIG.baseUrl}/${imagePath}`;
};

// Optimize edilmiş resim URL'i oluştur
export const getOptimizedImageUrl = (imagePath) => {
  if (!imagePath) return null;
  
  // Optimize edilmiş versiyonu için 'optimized_' prefix'i ekle
  const pathParts = imagePath.split('/');
  const filename = pathParts[pathParts.length - 1];
  const optimizedFilename = `optimized_${filename}`;
  
  pathParts[pathParts.length - 1] = optimizedFilename;
  const optimizedPath = pathParts.join('/');
  
  return getImageUrl(optimizedPath);
};

// Thumbnail URL'i oluştur
export const getThumbnailUrl = (imagePath, size = 'medium') => {
  if (!imagePath) return null;
  
  const pathParts = imagePath.split('/');
  const filename = pathParts[pathParts.length - 1];
  const nameWithoutExt = filename.split('.')[0];
  const extension = filename.split('.').pop();
  
  const thumbnailFilename = `${nameWithoutExt}_${size}.${extension}`;
  pathParts[pathParts.length - 1] = thumbnailFilename;
  
  return getImageUrl(pathParts.join('/'));
};

// Kategori bazlı resim yükleme yardımcı fonksiyonları
export const uploadProfileImage = async (file, userId) => {
  return uploadImage(file, 'profile', userId);
};

export const uploadFacilityImage = async (file, userId) => {
  return uploadImage(file, 'facility', userId);
};

export const uploadInvoiceImage = async (file, userId) => {
  return uploadImage(file, 'invoice', userId);
};

export const uploadDocumentImage = async (file, userId) => {
  return uploadImage(file, 'document', userId);
};

export const uploadTeamImage = async (file, teamId) => {
  return uploadImage(file, 'team', teamId);
};

// Kategori bazlı resim listesi
export const getProfileImages = async (userId) => {
  return getImages('profile', userId);
};

export const getFacilityImages = async (userId) => {
  return getImages('facility', userId);
};

export const getInvoiceImages = async (userId) => {
  return getImages('invoice', userId);
};

export const getDocumentImages = async (userId) => {
  return getImages('document', userId);
};

// Resim boyutlarını al
export const getImageDimensions = (file) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight
      });
    };
    img.onerror = () => {
      resolve(null);
    };
    img.src = URL.createObjectURL(file);
  });
};

// Resim sıkıştırma (client-side)
export const compressImage = (file, maxWidth = 1920, quality = 0.8) => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Yeni boyutları hesapla
      let { width, height } = img;
      
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Resmi çiz
      ctx.drawImage(img, 0, 0, width, height);
      
      // Canvas'ı blob'a çevir ve File objesi olarak döndür
      canvas.toBlob((blob) => {
        // Blob'u File objesine çevir
        const compressedFile = new File([blob], file.name, {
          type: file.type,
          lastModified: Date.now()
        });
        resolve(compressedFile);
      }, file.type, quality);
    };
    
    img.src = URL.createObjectURL(file);
  });
};
