import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  X, 
  Image as ImageIcon, 
  Check, 
  AlertCircle,
  Loader2
} from 'lucide-react';
import { uploadImage, compressImage } from '../services/cdnService';

const ImageUploader = ({ 
  category = 'general',
  userId,
  onUploadSuccess,
  onUploadError,
  onImagesChange,
  initialImages = [], // New prop for persistence
  maxFiles = 1,
  minFiles = 0,
  maxSize = 10, // MB
  // Updated default accepted types to include PDF
  acceptedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'],
  className = '',
  showPreview = true,
  compress = true
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  // Initialize with initialImages if present
  const [uploadedImages, setUploadedImages] = useState(initialImages || []);
  const [errors, setErrors] = useState([]);
  const fileInputRef = useRef(null);

  // Dosya validasyonu
  const validateFile = (file) => {
    const errors = [];
    
    if (!acceptedTypes.includes(file.type)) {
      errors.push(`${file.name}: Desteklenmeyen dosya tipi`);
    }
    
    if (file.size > maxSize * 1024 * 1024) {
      errors.push(`${file.name}: Dosya boyutu ${maxSize}MB'dan büyük`);
    }
    
    return errors;
  };

  // Dosya yükleme işlemi
  const handleFileUpload = async (files) => {
    const fileArray = Array.from(files);
    const newErrors = [];
    const validFiles = [];

    // Validasyon
    fileArray.forEach(file => {
      const fileErrors = validateFile(file);
      if (fileErrors.length > 0) {
        newErrors.push(...fileErrors);
      } else {
        validFiles.push(file);
      }
    });

    if (newErrors.length > 0) {
      setErrors(newErrors);
      onUploadError?.(newErrors);
      return;
    }

    // Maksimum dosya sayısı kontrolü
    if (uploadedImages.length + validFiles.length > maxFiles) {
      const error = `Maksimum ${maxFiles} dosya yükleyebilirsiniz`;
      setErrors([error]);
      onUploadError?.([error]);
      return;
    }

    setErrors([]);
    setIsUploading(true);

    try {
      const uploadPromises = validFiles.map(async (file) => {
        try {
          // Dosya adı kontrolü
          if (!file.name) {
            throw new Error('Dosya adı bulunamadı');
          }

          // Resim sıkıştırma (sadece resimler için)
          let fileToUpload = file;
          if (compress && file.type.startsWith('image/')) {
            fileToUpload = await compressImage(file);
          }

          console.log('Uploading file:', {
            name: fileToUpload.name,
            type: fileToUpload.type,
            size: fileToUpload.size
          });

          const result = await uploadImage(fileToUpload, category, userId);
          
          if (result.success) {
            return {
              ...result.data,
              file: file, // Keep the original file object for previews if needed
              original_name: file.name,
              file_size: file.size,
              mime_type: file.type,
              status: 'success'
            };
          } else {
            throw new Error(result.error);
          }
        } catch (error) {
          return {
            file: file,
            status: 'error',
            error: error.message
          };
        }
      });

      const results = await Promise.all(uploadPromises);
      const successfulUploads = results.filter(r => r.status === 'success');
      const failedUploads = results.filter(r => r.status === 'error');

      if (successfulUploads.length > 0) {
        const newImages = [...uploadedImages, ...successfulUploads];
        setUploadedImages(newImages);
        onUploadSuccess?.(successfulUploads);
        onImagesChange?.(newImages); // Notify parent
      }

      if (failedUploads.length > 0) {
        const uploadErrors = failedUploads.map(r => `${r.file.name}: ${r.error}`);
        setErrors(prev => [...prev, ...uploadErrors]);
        onUploadError?.(uploadErrors);
      }

    } catch (error) {
      const errorMessage = `Yükleme hatası: ${error.message}`;
      setErrors([errorMessage]);
      onUploadError?.([errorMessage]);
    } finally {
      setIsUploading(false);
    }
  };

  // Drag & Drop handlers
  const handleDragEnter = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files);
    }
  };

  // File input handler
  const handleFileInputChange = (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      handleFileUpload(files);
    }
    // Input'u temizle
    e.target.value = '';
  };

  // Dosya silme
  const removeImage = (index) => {
    const newImages = uploadedImages.filter((_, i) => i !== index);
    setUploadedImages(newImages);
    onImagesChange?.(newImages);
  };

  // Hata temizleme
  const clearErrors = () => {
    setErrors([]);
  };

  const renderPreview = (image) => {
    // Determine if it's a PDF
    const isPdf = image.mime_type === 'application/pdf' || 
                  image?.file?.type === 'application/pdf' ||
                  image?.url?.endsWith('.pdf') ||
                  image?.original_name?.endsWith('.pdf');

    if (isPdf) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 text-gray-500">
          <div className="p-2 bg-red-100 rounded-lg mb-2">
            <span className="text-2xl">📄</span>
          </div>
          <span className="text-xs font-medium text-center px-2 truncate w-full">
            {image.original_name || 'PDF Belgesi'}
          </span>
        </div>
      );
    }

    // It's an image
    let src = '';
    if (image.file) {
      src = URL.createObjectURL(image.file);
    } else if (image.url) {
      src = image.url;
    }

    return (
       <img
        src={src}
        alt={image.original_name}
        className="w-full h-full object-cover"
        onError={(e) => {
          e.target.onerror = null; 
          e.target.src = 'https://via.placeholder.com/150?text=Error';
        }}
      />
    );
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
          isDragging
            ? 'border-green-500 bg-green-50'
            : 'border-gray-300 hover:border-gray-400'
        } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()} // Make the whole area clickable
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple={maxFiles > 1}
          accept={acceptedTypes.join(',')}
          onChange={handleFileInputChange}
          className="hidden" // Hiding input but triggering via ref
          disabled={isUploading}
        />
        
        <div className="space-y-2 pointer-events-none"> {/* content shouldn't block click */}
          {isUploading ? (
            <Loader2 className="w-8 h-8 mx-auto text-green-600 animate-spin" />
          ) : (
            <Upload className="w-8 h-8 mx-auto text-gray-400" />
          )}
          
          <div>
            <p className="text-sm font-medium text-gray-900">
              {isUploading ? 'Yükleniyor...' : maxFiles > 1 ? 'Dosyaları yüklemek için tıklayın veya sürükleyin' : 'Dosya yüklemek için tıklayın veya sürükleyin'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              JPG, PNG, PDF (Max {maxSize}MB)
              {maxFiles > 1 && ` • Maksimum ${maxFiles} dosya`}
              {minFiles > 0 && ` • En az ${minFiles} dosya`}
            </p>
          </div>
        </div>
      </div>

      {/* Error Messages */}
      <AnimatePresence>
        {errors.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-1"
          >
            {errors.map((error, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-2 rounded"
              >
                <AlertCircle size={16} />
                <span>{error}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    clearErrors();
                  }}
                  className="ml-auto text-red-400 hover:text-red-600"
                >
                  <X size={16} />
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Uploaded Images Preview */}
      {showPreview && uploadedImages.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-900">
            Yüklenen Dosyalar ({uploadedImages.length})
          </h4>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {uploadedImages.map((image, index) => (
              <motion.div
                 key={image.id || image.url || index}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative group"
              >
                <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                   {renderPreview(image)}
                </div>
                
                {/* Success indicator */}
                <div className="absolute top-1 right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                  <Check size={12} className="text-white" />
                </div>
                
                {/* Remove button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeImage(index);
                  }}
                  className="absolute top-1 left-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110"
                >
                  <X size={12} className="text-white" />
                </button>
                
                {/* Image info */}
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white text-xs p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="truncate">{image.original_name || image.fileName || 'Dosya'}</p>
                  <p>{image.file_size ? (image.file_size / 1024 / 1024).toFixed(1) : (image.fileSize / 1024 / 1024).toFixed(1)}MB</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {isUploading && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Dosyalar yükleniyor...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUploader;
