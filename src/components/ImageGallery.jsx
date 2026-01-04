import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Download, 
  Trash2, 
  Eye, 
  Loader2,
  AlertCircle
} from 'lucide-react';
import { getImages, deleteImage, getImageUrl, getOptimizedImageUrl } from '../services/cdnService';

const ImageGallery = ({ 
  category = 'general',
  userId,
  onImageSelect,
  onImageDelete,
  selectable = false,
  deletable = false,
  className = ''
}) => {
  const [images, setImages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Resimleri yükle
  const loadImages = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await getImages(category, userId);
      
      if (result.success) {
        setImages(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Resimler yüklenirken hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  // Resim sil
  const handleDeleteImage = async (imageId) => {
    if (!window.confirm('Bu resmi silmek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      setDeletingId(imageId);
      
      const result = await deleteImage(imageId);
      
      if (result.success) {
        setImages(prev => prev.filter(img => img.id !== imageId));
        onImageDelete?.(imageId);
      } else {
        alert('Resim silinirken hata oluştu: ' + result.error);
      }
    } catch (err) {
      alert('Resim silinirken hata oluştu');
    } finally {
      setDeletingId(null);
    }
  };

  // Resim seç
  const handleSelectImage = (image) => {
    if (selectable) {
      setSelectedImage(image);
      onImageSelect?.(image);
    } else {
      setSelectedImage(image);
      setShowModal(true);
    }
  };

  // Resim indir
  const handleDownloadImage = (image) => {
    const link = document.createElement('a');
    link.href = getImageUrl(image.url);
    link.download = image.original_name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    loadImages();
  }, [category, userId]);

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
          <p className="text-sm text-gray-600">Resimler yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="flex flex-col items-center gap-2 text-center">
          <AlertCircle className="w-8 h-8 text-red-500" />
          <p className="text-sm text-red-600">{error}</p>
          <button
            onClick={loadImages}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
          >
            Tekrar Dene
          </button>
        </div>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Eye className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-500">Henüz resim yüklenmemiş</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 ${className}`}>
        {images.map((image) => (
          <motion.div
            key={image.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative group cursor-pointer"
            onClick={() => handleSelectImage(image)}
          >
            {/* Resim */}
            <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
              <img
                src={getOptimizedImageUrl(image.url) || getImageUrl(image.url)}
                alt={image.original_name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                loading="lazy"
              />
            </div>

            {/* Overlay */}
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 rounded-lg flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedImage(image);
                    setShowModal(true);
                  }}
                  className="p-2 bg-white bg-opacity-90 rounded-full hover:bg-opacity-100 transition-all"
                >
                  <Eye size={16} className="text-gray-700" />
                </button>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownloadImage(image);
                  }}
                  className="p-2 bg-white bg-opacity-90 rounded-full hover:bg-opacity-100 transition-all"
                >
                  <Download size={16} className="text-gray-700" />
                </button>
                
                {deletable && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteImage(image.id);
                    }}
                    disabled={deletingId === image.id}
                    className="p-2 bg-red-500 bg-opacity-90 rounded-full hover:bg-opacity-100 transition-all disabled:opacity-50"
                  >
                    {deletingId === image.id ? (
                      <Loader2 size={16} className="text-white animate-spin" />
                    ) : (
                      <Trash2 size={16} className="text-white" />
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Seçili durumu */}
            {selectable && selectedImage?.id === image.id && (
              <div className="absolute top-2 right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
            )}

            {/* Resim bilgileri */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-2 rounded-b-lg">
              <p className="text-white text-xs truncate">{image.original_name}</p>
              <p className="text-white text-xs opacity-75">
                {(image.file_size / 1024 / 1024).toFixed(1)}MB
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="relative max-w-4xl max-h-full bg-white rounded-lg overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedImage.original_name}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Image */}
              <div className="p-4">
                <img
                  src={getImageUrl(selectedImage.url)}
                  alt={selectedImage.original_name}
                  className="max-w-full max-h-96 object-contain mx-auto"
                />
              </div>

              {/* Info */}
              <div className="p-4 border-t bg-gray-50">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Boyut:</span>
                    <p className="text-gray-600">
                      {selectedImage.dimensions?.width} x {selectedImage.dimensions?.height}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Dosya Boyutu:</span>
                    <p className="text-gray-600">
                      {(selectedImage.file_size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Kategori:</span>
                    <p className="text-gray-600 capitalize">{selectedImage.category}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Yüklenme Tarihi:</span>
                    <p className="text-gray-600">
                      {new Date(selectedImage.upload_date).toLocaleDateString('tr-TR')}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => handleDownloadImage(selectedImage)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Download size={16} />
                    İndir
                  </button>
                  
                  {deletable && (
                    <button
                      onClick={() => {
                        handleDeleteImage(selectedImage.id);
                        setShowModal(false);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <Trash2 size={16} />
                      Sil
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ImageGallery;
