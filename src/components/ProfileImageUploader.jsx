import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, X, Check, Loader2 } from 'lucide-react';
import { uploadProfileImage, getImageUrl, getOptimizedImageUrl } from '../services/cdnService';

const ProfileImageUploader = ({ 
  userId,
  currentImage,
  onImageChange,
  size = 'large',
  className = ''
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);

  const sizes = {
    small: 'w-16 h-16',
    medium: 'w-24 h-24',
    large: 'w-32 h-32',
    xlarge: 'w-40 h-40'
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validasyon
    if (!file.type.startsWith('image/')) {
      setError('Sadece resim dosyaları yüklenebilir');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB
      setError('Dosya boyutu 5MB\'dan küçük olmalıdır');
      return;
    }

    setError(null);
    setPreview(URL.createObjectURL(file));
    setIsUploading(true);

    try {
      const result = await uploadProfileImage(file, userId);
      
      if (result.success) {
        onImageChange?.(result.data);
        setPreview(null);
      } else {
        setError(result.error);
        setPreview(null);
      }
    } catch (err) {
      setError('Resim yüklenirken hata oluştu');
      setPreview(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = () => {
    onImageChange?.(null);
    setPreview(null);
    setError(null);
  };

  const getImageSrc = () => {
    if (preview) return preview;
    if (currentImage?.url) {
      return getOptimizedImageUrl(currentImage.url) || getImageUrl(currentImage.url);
    }
    return null;
  };

  return (
    <div className={`flex flex-col items-center space-y-4 ${className}`}>
      {/* Profil Fotoğrafı */}
      <div className="relative">
        <div className={`${sizes[size]} rounded-full bg-gray-200 flex items-center justify-center overflow-hidden`}>
          {getImageSrc() ? (
            <img
              src={getImageSrc()}
              alt="Profil fotoğrafı"
              className="w-full h-full object-contain"
            />
          ) : (
            <Camera className="w-8 h-8 text-gray-400" />
          )}
        </div>

        {/* Upload Overlay */}
        <motion.label
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center cursor-pointer opacity-0 hover:opacity-100 transition-opacity"
        >
          {isUploading ? (
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          ) : (
            <Camera className="w-6 h-6 text-white" />
          )}
        </motion.label>

        {/* Remove Button */}
        {getImageSrc() && (
          <button
            onClick={handleRemoveImage}
            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
          >
            <X size={14} />
          </button>
        )}

        {/* Success Indicator */}
        {isUploading && (
          <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center">
            <Check size={14} />
          </div>
        )}
      </div>

      {/* File Input */}
      <input
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        id="profile-image-upload"
        disabled={isUploading}
      />

      {/* Upload Button */}
      <motion.label
        htmlFor="profile-image-upload"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`px-4 py-2 bg-green-600 text-white rounded-lg cursor-pointer hover:bg-green-700 transition-colors text-sm font-medium ${
          isUploading ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        {isUploading ? 'Yükleniyor...' : getImageSrc() ? 'Fotoğrafı Değiştir' : 'Fotoğraf Yükle'}
      </motion.label>

      {/* Error Message */}
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-red-500 text-sm text-center max-w-xs"
        >
          {error}
        </motion.p>
      )}

      {/* Image Info */}
      {currentImage && (
        <div className="text-center text-xs text-gray-500">
          <p>Yüklenme: {new Date(currentImage.upload_date).toLocaleDateString('tr-TR')}</p>
          <p>Boyut: {(currentImage.file_size / 1024 / 1024).toFixed(1)}MB</p>
        </div>
      )}
    </div>
  );
};

export default ProfileImageUploader;
