import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getTesis, updateTesis, deleteTesis, getReservations } from '../../services/firestoreService';
import { deleteImage, uploadFacilityImage } from '../../services/cdnService';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import SahaSahibiSidebar from '../../components/SahaSahibiSidebar';
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Star, 
  MapPin, 
  Clock, 
  Users, 
  Phone, 
  Mail, 
  Globe, 
  Calendar,
  DollarSign,
  BarChart3,
  Settings,
  Image as ImageIcon,
  Plus,
  Eye,
  Building2,
  CreditCard,
  Megaphone,
  Trophy,
  FileText,
  Settings as SettingsIcon,
  X,
  Loader2
} from 'lucide-react';

const SahaDetay = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [sahaData, setSahaData] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reservationsLoading, setReservationsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    price: '',
    capacity: '',
    workingHours: '',
    phone: '',
    email: '',
    website: '',
    status: 'active',
    customPrices: []
  });

  // Saha verilerini ve rezervasyonları yükle
  useEffect(() => {
    loadSahaData();
    const cleanup = setupReservationsListener();
    return () => {
      if (cleanup) cleanup();
    };
  }, [id]);

  const loadSahaData = async () => {
    if (!id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await getTesis(id);
      if (result.success) {
        setSahaData(result.data);
        setEditForm({
          name: result.data.name || '',
          description: result.data.description || '',
          price: result.data.price || '',
          capacity: result.data.capacity || '',
          workingHours: result.data.workingHours || '08:00 - 24:00',
          phone: result.data.phone || '',
          email: result.data.email || '',
          website: result.data.website || '',
          status: result.data.status || 'active',
          customPrices: result.data.customPrices || []
        });
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Saha verileri yüklenirken hata oluştu');
      console.error('Saha yükleme hatası:', err);
    } finally {
      setLoading(false);
    }
  };

  const setupReservationsListener = () => {
    if (!id) return;

    setReservationsLoading(true);
    const q = query(
      collection(db, 'rezervasyonlar'),
      where('tesisId', '==', id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reservationsData = [];
      snapshot.forEach((doc) => {
        reservationsData.push({ id: doc.id, ...doc.data() });
      });
      // Sort by date descending
      reservationsData.sort((a, b) => {
        const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
        const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
        return dateB - dateA;
      });
      setReservations(reservationsData);
      setReservationsLoading(false);
    });

    return unsubscribe;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'confirmed': return 'Onaylandı';
      case 'pending': return 'Beklemede';
      case 'cancelled': return 'İptal';
      case 'active': return 'Aktif';
      case 'inactive': return 'Pasif';
      case 'maintenance': return 'Bakımda';
      default: return 'Bilinmiyor';
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditForm({
      name: sahaData.name || '',
      description: sahaData.description || '',
      price: sahaData.price || '',
      capacity: sahaData.capacity || '',
      workingHours: sahaData.workingHours || '08:00 - 24:00',
      phone: sahaData.phone || '',
      email: sahaData.email || '',
      website: sahaData.website || '',
      status: sahaData.status || 'active',
      customPrices: sahaData.customPrices || []
    });
  };

  const handleSave = async () => {
    if (!sahaData) return;
    
    setIsSaving(true);
    try {
      const result = await updateTesis(id, editForm);
      if (result.success) {
        setSahaData(prev => ({ ...prev, ...editForm }));
        setIsEditing(false);
      } else {
        console.error('Güncelleme hatası:', result.error);
      }
    } catch (error) {
      console.error('Güncelleme hatası:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!sahaData) return;
    
    setIsDeleting(true);
    try {
      const result = await deleteTesis(id);
      if (result.success) {
        navigate('/saha-sahibi/saha-yonetimi');
      } else {
        console.error('Silme hatası:', result.error);
      }
    } catch (error) {
      console.error('Silme hatası:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleImageDelete = async (imageId) => {
    try {
      const result = await deleteImage(imageId);
      if (result.success) {
        setSahaData(prev => ({
          ...prev,
          images: prev.images.filter(img => img.id !== imageId)
        }));
      }
    } catch (error) {
      console.error('Resim silme hatası:', error);
    }
  };

  const handleImageUpload = async (files) => {
    if (!user || !id) return;
    
    setUploadingImages(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const result = await uploadFacilityImage(file, user.uid);
        if (result.success) {
          return result.data;
        }
        return null;
      });
      
      const uploadedImages = (await Promise.all(uploadPromises)).filter(img => img !== null);
      
      // Update local state first
      setSahaData(prev => ({
        ...prev,
        images: [...(prev.images || []), ...uploadedImages]
      }));
      
      // Update database
      await updateTesis(id, {
        images: [...(sahaData.images || []), ...uploadedImages]
      });
      
    } catch (error) {
      console.error('Resim yükleme hatası:', error);
    } finally {
      setUploadingImages(false);
    }
  };

  const handleAddPriceRule = () => {
    setEditForm(prev => ({
      ...prev,
      customPrices: [
        ...prev.customPrices, 
        { start: 17, end: 24, price: parseFloat(prev.price) || 0 }
      ]
    }));
  };

  const handleRemovePriceRule = (index) => {
    setEditForm(prev => ({
      ...prev,
      customPrices: prev.customPrices.filter((_, i) => i !== index)
    }));
  };

  const handlePriceRuleChange = (index, field, value) => {
    setEditForm(prev => {
      const newPrices = [...prev.customPrices];
      newPrices[index] = { ...newPrices[index], [field]: parseFloat(value) };
      return { ...prev, customPrices: newPrices };
    });
  };

  const handleNewReservation = () => {
    navigate('/saha-sahibi/rezervasyonlar', { 
      state: { 
        openNewReservation: true, 
        tesisId: id 
      } 
    });
  };

  const handleSetCover = async (index) => {
    if (!sahaData || !sahaData.images || index === 0) return;
    
    // Create new array with selected image at index 0
    const newImages = [...sahaData.images];
    const selectedImage = newImages.splice(index, 1)[0];
    newImages.unshift(selectedImage);
    
    // Optimistically update UI
    setSahaData(prev => ({ ...prev, images: newImages }));
    
    // Update backend
    try {
      const result = await updateTesis(id, { images: newImages });
      if (!result.success) {
        // Revert on failure
        console.error('Kapak fotoğrafı güncellenemedi');
        loadSahaData(); // Reload to sync
      }
    } catch (error) {
      console.error('Kapak fotoğrafı güncelleme hatası:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-green-600" />
          <p className="text-gray-600">Saha verileri yükleniyor...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Hata</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/saha-sahibi/saha-yonetimi')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Geri Dön
          </button>
        </div>
      </div>
    );
  }

  // Saha bulunamadı
  if (!sahaData) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-gray-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Saha Bulunamadı</h3>
          <p className="text-gray-600 mb-4">Aradığınız saha bulunamadı veya silinmiş olabilir.</p>
          <button
            onClick={() => navigate('/saha-sahibi/saha-yonetimi')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Saha Yönetimine Dön
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <SahaSahibiSidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white shadow-sm border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/saha-sahibi/saha-yonetimi')}
                className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{sahaData.name}</h1>
                <p className="text-gray-600">{sahaData.location}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {!isEditing ? (
                <>
                  <button 
                    onClick={handleEdit}
                    className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg border border-gray-300"
                  >
                    <Edit className="w-4 h-4" />
                    <span>Düzenle</span>
                  </button>
                  <button 
                    onClick={() => setShowDeleteModal(true)}
                    className="flex items-center space-x-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg border border-red-300"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Sil</span>
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={handleCancelEdit}
                    className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg border border-gray-300"
                  >
                    <X className="w-4 h-4" />
                    <span>İptal</span>
                  </button>
                  <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Edit className="w-4 h-4" />
                    )}
                    <span>{isSaving ? 'Kaydediliyor...' : 'Kaydet'}</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex-1 p-6 overflow-y-auto">
          {/* Hero Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
            <div className="relative h-64 bg-gradient-to-r from-green-600 to-green-700">
              {sahaData.images && sahaData.images.length > 0 ? (
                <img
                  src={sahaData.images[0].optimized_url || sahaData.images[0].url}
                  alt={sahaData.name}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-green-700"></div>
              )}
              <div className="absolute inset-0 bg-black/40 bg-opacity-40"></div>
              <div className="absolute bottom-6 left-6 text-white">
                <h2 className="text-3xl font-bold mb-2">{sahaData.name}</h2>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1">
                    <MapPin className="w-4 h-4" />
                    <span>{sahaData.location}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    <span>{sahaData.rating || 0}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Users className="w-4 h-4" />
                    <span>{sahaData.capacity} kişi</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(sahaData.status)}`}>
                      {getStatusText(sahaData.status)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Calendar className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">{reservations.length}</h3>
                  <p className="text-gray-600">Toplam Rezervasyon</p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <DollarSign className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    ₺{reservations.reduce((acc, curr) => acc + (Number(curr.totalAmount) || Number(curr.price) || 0), 0).toLocaleString()}
                  </h3>
                  <p className="text-gray-600">Toplam Gelir</p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Star className="w-8 h-8 text-yellow-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">{sahaData.rating || 0}</h3>
                  <p className="text-gray-600">Ortalama Puan</p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <BarChart3 className="w-8 h-8 text-purple-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">{sahaData.capacity || 0}</h3>
                  <p className="text-gray-600">Kapasite</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
            <div className="border-b border-gray-100">
              <nav className="flex space-x-8 px-6">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'overview'
                      ? 'border-green-500 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Genel Bakış
                </button>
                <button
                  onClick={() => setActiveTab('reservations')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'reservations'
                      ? 'border-green-500 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Rezervasyonlar
                </button>
                <button
                  onClick={() => setActiveTab('gallery')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'gallery'
                      ? 'border-green-500 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Galeri
                </button>
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'settings'
                      ? 'border-green-500 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Ayarlar
                </button>
              </nav>
            </div>

            <div className="p-6">
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Saha Bilgileri */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Saha Bilgileri</h3>
                      <div className="space-y-4">
                        <div className="flex items-center space-x-3">
                          <Building2 className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-600">Saha Tipi</p>
                            <p className="font-medium">{sahaData.type}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Users className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-600">Kapasite</p>
                            <p className="font-medium">{sahaData.capacity} kişi</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <DollarSign className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-600">Saatlik Ücret</p>
                            <p className="font-medium">₺{sahaData.price}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Clock className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-600">Çalışma Saatleri</p>
                            <p className="font-medium">{sahaData.workingHours}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <MapPin className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-600">Adres</p>
                            <p className="font-medium">{sahaData.address}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* İletişim Bilgileri */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">İletişim Bilgileri</h3>
                      <div className="space-y-4">
                        <div className="flex items-center space-x-3">
                          <Phone className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-600">Telefon</p>
                            <p className="font-medium">{sahaData.phone}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Mail className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-600">E-posta</p>
                            <p className="font-medium">{sahaData.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Globe className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-600">Web Sitesi</p>
                            <p className="font-medium">{sahaData.website}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Açıklama */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Açıklama</h3>
                    <p className="text-gray-700 leading-relaxed">{sahaData.description}</p>
                  </div>

                  {/* Olanaklar */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Olanaklar</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {sahaData.facilities.map((facility, index) => (
                        <div key={index} className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-sm text-gray-700">{facility}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Reservations Tab */}
              {activeTab === 'reservations' && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">Son Rezervasyonlar</h3>
                    <button 
                      onClick={handleNewReservation}
                      className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Yeni Rezervasyon</span>
                    </button>
                  </div>
                  
                  <div className="overflow-x-auto">
                    {reservationsLoading ? (
                      <div className="text-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-green-600" />
                        <p className="text-gray-600">Rezervasyonlar yükleniyor...</p>
                      </div>
                    ) : (
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Müşteri</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarih</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Saat</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tutar</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {reservations && reservations.length > 0 ? (
                            reservations.map((reservation) => {
                              // Müşteri bilgilerini belirle
                              let customerName = reservation.customerName || 'Misafir';
                              let customerPhone = reservation.customerPhone || '';
                              
                              if ((!reservation.customerName || customerName === 'Misafir') && reservation.players && reservation.players.length > 0) {
                                const organizator = reservation.players.find(p => p.status === 'organizator') || reservation.players[0];
                                if (organizator) {
                                   customerName = organizator.name || customerName;
                                   customerPhone = organizator.phone || customerPhone;
                                }
                              }

                              // Format date safely
                              let dateObj;
                              if (reservation.date && typeof reservation.date === 'object' && reservation.date.toDate) {
                                dateObj = reservation.date.toDate();
                              } else if (reservation.date && typeof reservation.date === 'object' && reservation.date.seconds) {
                                dateObj = new Date(reservation.date.seconds * 1000);
                              } else {
                                dateObj = new Date(reservation.date);
                              }
                              
                              const formattedDate = !isNaN(dateObj.getTime()) 
                                ? dateObj.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
                                : 'Tarih Yok';
                                
                              return (
                                <tr key={reservation.id} className="hover:bg-gray-50">
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {customerName}
                                    <div className="text-xs text-gray-500">{customerPhone}</div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {formattedDate}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {reservation.timeSlot}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    ₺{reservation.totalAmount || reservation.price}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(reservation.status)}`}>
                                      {getStatusText(reservation.status)}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    <div className="flex space-x-2">
                                      <button 
                                        onClick={() => navigate('/saha-sahibi/rezervasyonlar')}
                                        className="text-gray-400 hover:text-green-600"
                                      >
                                        <Eye className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                                <div className="flex flex-col items-center">
                                  <Calendar className="w-12 h-12 text-gray-300 mb-4" />
                                  <h3 className="text-lg font-medium text-gray-900 mb-2">Rezervasyon Yok</h3>
                                  <p className="text-gray-600">Bu saha için henüz rezervasyon bulunmuyor.</p>
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}

              {/* Gallery Tab */}
              {activeTab === 'gallery' && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">Saha Fotoğrafları</h3>
                    <div>
                      <input
                        type="file"
                        id="gallery-upload"
                        multiple
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageUpload(e.target.files)}
                        disabled={uploadingImages}
                      />
                      <label
                        htmlFor="gallery-upload"
                        className={`flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 cursor-pointer ${uploadingImages ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {uploadingImages ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Plus className="w-4 h-4" />
                        )}
                        <span>{uploadingImages ? 'Yükleniyor...' : 'Fotoğraf Ekle'}</span>
                      </label>
                    </div>
                  </div>
                  
                  {sahaData.images && sahaData.images.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {sahaData.images.map((image, index) => (
                        <div key={image.id || index} className="relative group">
                          <div className="aspect-w-16 aspect-h-9 bg-gray-200 rounded-lg overflow-hidden">
                            <img
                              src={image.optimized_url || image.url}
                              alt={`Saha ${index + 1}`}
                              className="w-full h-48 object-cover"
                              onError={(e) => {
                                console.error('Resim yüklenemedi:', image.optimized_url || image.url);
                                e.target.style.display = 'none';
                              }}
                            />
                          </div>
                          <div className="absolute inset-0  bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded-lg flex items-center justify-center">
                            <div className="opacity-0 group-hover:opacity-100 flex space-x-2">
                              <button 
                                onClick={() => handleSetCover(index)}
                                className={`p-2 bg-white rounded-lg hover:bg-gray-100 ${index === 0 ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'}`}
                                title={index === 0 ? 'Kapak Fotoğrafı' : 'Kapak Yap'}
                              >
                                <Star className={`w-4 h-4 ${index === 0 ? 'fill-current' : ''}`} />
                              </button>
                              <button 
                                onClick={() => window.open(image.optimized_url || image.url, '_blank')}
                                className="p-2 bg-white rounded-lg text-gray-700 hover:bg-gray-100"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleImageDelete(image.id)}
                                className="p-2 bg-white rounded-lg text-red-600 hover:bg-red-100"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <ImageIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Fotoğraf Yok</h3>
                      <p className="text-gray-600 mb-6">Bu saha için henüz fotoğraf eklenmemiş.</p>
                      <button className="inline-flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                        <Plus className="w-4 h-4" />
                        <span>İlk Fotoğrafı Ekle</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Settings Tab */}
              {activeTab === 'settings' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Genel Ayarlar</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Saha Adı</label>
                        <input
                          type="text"
                          name="name"
                          value={editForm.name}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Açıklama</label>
                        <textarea
                          name="description"
                          value={editForm.description}
                          onChange={handleInputChange}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Saatlik Ücret (₺)</label>
                          <input
                            type="number"
                            name="price"
                            value={editForm.price}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          />
                        </div>

                        {/* Özel Fiyatlandırma */}
                        <div className="md:col-span-2 bg-gray-50 p-4 rounded-lg border border-gray-200">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h4 className="font-medium text-gray-900">Özel Fiyatlandırma</h4>
                              <p className="text-sm text-gray-500">Belirli saat aralıkları için farklı fiyatlar belirleyin</p>
                            </div>
                            <button
                              onClick={handleAddPriceRule}
                              className="text-sm text-green-600 hover:text-green-700 font-medium flex items-center gap-1"
                            >
                              <Plus size={16} />
                              Kural Ekle
                            </button>
                          </div>

                          {editForm.customPrices?.length > 0 ? (
                            <div className="space-y-3">
                              {editForm.customPrices.map((rule, index) => (
                                <div key={index} className="flex items-end gap-3 bg-white p-3 rounded-md border border-gray-200 shadow-sm relative group">
                                  <div className="flex-1">
                                    <label className="block text-xs text-gray-500 mb-1">Başlangıç Saati</label>
                                    <select
                                      value={rule.start}
                                      onChange={(e) => handlePriceRuleChange(index, 'start', e.target.value)}
                                      className="w-full text-sm border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                                    >
                                      {Array.from({ length: 24 }).map((_, i) => (
                                        <option key={`start-${i}`} value={i}>{String(i).padStart(2, '0')}:00</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div className="flex-shrink-0 pb-2 text-gray-400">-</div>
                                  <div className="flex-1">
                                    <label className="block text-xs text-gray-500 mb-1">Bitiş Saati</label>
                                    <select
                                      value={rule.end}
                                      onChange={(e) => handlePriceRuleChange(index, 'end', e.target.value)}
                                      className="w-full text-sm border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                                    >
                                      {Array.from({ length: 24 }).map((_, i) => (
                                        <option key={`end-${i}`} value={i + 1}>{String(i + 1).padStart(2, '0')}:00</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div className="flex-1">
                                    <label className="block text-xs text-gray-500 mb-1">Fiyat (₺)</label>
                                    <input
                                      type="number"
                                      value={rule.price}
                                      onChange={(e) => handlePriceRuleChange(index, 'price', e.target.value)}
                                      className="w-full text-sm border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                                      placeholder="0"
                                    />
                                  </div>
                                  <button
                                    onClick={() => handleRemovePriceRule(index)}
                                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-4 text-gray-500 text-sm italic bg-white rounded-md border border-gray-200 border-dashed">
                              Henüz özel fiyat kuralı eklenmemiş. Standart saatlik ücret geçerli olacaktır.
                            </div>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Kapasite</label>
                          <input
                            type="number"
                            name="capacity"
                            value={editForm.capacity}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Telefon</label>
                          <input
                            type="tel"
                            name="phone"
                            value={editForm.phone}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">E-posta</label>
                          <input
                            type="email"
                            name="email"
                            value={editForm.email}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Web Sitesi</label>
                          <input
                            type="url"
                            name="website"
                            value={editForm.website}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Durum</label>
                          <select
                            name="status"
                            value={editForm.status}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          >
                            <option value="active">Aktif</option>
                            <option value="inactive">Pasif</option>
                            <option value="maintenance">Bakımda</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button 
                      onClick={handleCancelEdit}
                      className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                    >
                      İptal
                    </button>
                    <button 
                      onClick={handleSave}
                      disabled={isSaving}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2"
                    >
                      {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                      <span>{isSaving ? 'Kaydediliyor...' : 'Kaydet'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Sahayı Sil</h3>
                <p className="text-gray-600">Bu işlem geri alınamaz.</p>
              </div>
            </div>
            <p className="text-gray-700 mb-6">
              <strong>{sahaData?.name}</strong> adlı sahayı silmek istediğinizden emin misiniz?
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                İptal
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{isDeleting ? 'Siliniyor...' : 'Sil'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SahaDetay;
