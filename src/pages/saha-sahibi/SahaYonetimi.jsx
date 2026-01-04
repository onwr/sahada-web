import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getTesisler, addTesis, updateTesis, deleteTesis } from '../../services/firestoreService';
import { uploadFacilityImage, getFacilityImages, deleteImage } from '../../services/cdnService';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import SahaSahibiSidebar from '../../components/SahaSahibiSidebar';
// FreeMapPicker import'u kaldırıldı - SahaSahibiOnboard'daki harita sistemi kullanılacak
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Eye, 
  MapPin, 
  Clock, 
  Users, 
  Star,
  Calendar,
  DollarSign,
  Building2,
  Phone,
  Mail,
  Globe,
  Image as ImageIcon,
  Settings,
  BarChart3,
  CreditCard,
  Megaphone,
  Trophy,
  FileText,
  Settings as SettingsIcon,
  X,
  CircleAlert
} from 'lucide-react';

const SahaYonetimi = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSaha, setEditingSaha] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    latitude: '',
    longitude: '',
    type: 'Futbol',
    capacity: '',
    price: '',
    description: '',
    facilities: [],
    workingHours: '08:00 - 24:00',
    phone: '',
    status: 'active',
    customPrices: [],
    location: '',
    address: ''
  });


  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sahaImages, setSahaImages] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Harita state'leri (SahaSahibiOnboard'dan)
  const [showMap, setShowMap] = useState(false);
  const [mapSearchQuery, setMapSearchQuery] = useState('');
  const [mapSearchResults, setMapSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [mapCenter, setMapCenter] = useState({ lat: 41.0082, lng: 28.9784 });
  const [isDragging, setIsDragging] = useState(false);
  const [pinPosition, setPinPosition] = useState({ x: 50, y: 50 });

  const [sahalar, setSahalar] = useState([]);

  // Sahaları yükle
  useEffect(() => {
    if (!user) return;
    
    loadSahalar();
    const cleanup = setupRealtimeListener();
    
    return () => {
      if (cleanup) cleanup();
    };
  }, [user]);

  const loadSahalar = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const result = await getTesisler(user.uid);
      if (result.success) {
        setSahalar(result.data);
      } else {
        console.error('Sahalar yüklenemedi:', result.error);
      }
    } catch (error) {
      console.error('Sahalar yükleme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeListener = () => {
    if (!user) return;

    const tesislerQuery = query(
      collection(db, 'tesisler'),
      where('ownerId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(tesislerQuery, (snapshot) => {
      const sahalar = [];
      snapshot.forEach((doc) => {
        sahalar.push({ id: doc.id, ...doc.data() });
      });
      setSahalar(sahalar);
    });

    return unsubscribe;
  };

  const filteredSahalar = sahalar.filter(saha => {
    const matchesSearch = saha.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         saha.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || saha.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active': return 'Aktif';
      case 'inactive': return 'Pasif';
      case 'maintenance': return 'Bakımda';
      default: return 'Bilinmiyor';
    }
  };

  const handleDelete = async (id) => {
    try {
      const result = await deleteTesis(id);
      if (result.success) {
        setSahalar(sahalar.filter(saha => saha.id !== id));
        setShowDeleteModal(null);
      } else {
        console.error('Saha silinemedi:', result.error);
      }
    } catch (error) {
      console.error('Saha silme hatası:', error);
    }
  };

  const handleEdit = (saha) => {
    setEditingSaha(saha);
    setFormData({
      name: saha.name,
      latitude: saha.latitude || '',
      longitude: saha.longitude || '',
      type: saha.type,
      capacity: saha.capacity.toString(),
      price: saha.price.toString(),
      description: saha.description,
      facilities: saha.facilities || [],
      workingHours: saha.workingHours,
      phone: saha.phone,
      status: saha.status,
      customPrices: saha.customPrices || []
    });
    setSahaImages(saha.images || []);
    
    // Harita state'lerini güncelle
    if (saha.latitude && saha.longitude) {
      setMapCenter({ lat: parseFloat(saha.latitude), lng: parseFloat(saha.longitude) });
      setSelectedLocation({ 
        lat: parseFloat(saha.latitude), 
        lng: parseFloat(saha.longitude), 
        address: saha.address || saha.location 
      });
    }
    
    setShowAddModal(true);
  };

  const handleAddNew = () => {
    setEditingSaha(null);
    setFormData({
      name: '',
      latitude: '',
      longitude: '',
      type: 'Futbol',
      capacity: '',
      price: '',
      description: '',
      facilities: [],
      workingHours: '08:00 - 24:00',
      phone: '',
      status: 'active',
      customPrices: [],
      location: '',
      address: ''
    });
    setSahaImages([]);
    setErrors({});
    
    // Harita state'lerini sıfırla
    setMapCenter({ lat: 41.0082, lng: 28.9784 });
    setSelectedLocation(null);
    setMapSearchQuery('');
    setShowSearchResults(false);
    setPinPosition({ x: 50, y: 50 });
    
    setShowAddModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleFacilityChange = (facility) => {
    setFormData(prev => ({
      ...prev,
      facilities: prev.facilities.includes(facility)
        ? prev.facilities.filter(f => f !== facility)
        : [...prev.facilities, facility]
    }));
  };

  const handleImageUpload = async (files) => {
    if (!user) return;
    
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
      setSahaImages(prev => [...prev, ...uploadedImages]);
    } catch (error) {
      console.error('Resim yükleme hatası:', error);
    } finally {
      setUploadingImages(false);
    }
  };

  const handleImageRemove = async (imageId) => {
    try {
      const result = await deleteImage(imageId);
      if (result.success) {
        setSahaImages(prev => prev.filter(img => img.id !== imageId));
      }
    } catch (error) {
      console.error('Resim silme hatası:', error);
    }
  };

  const handleLocationSelect = (lat, lng, address) => {
    setFormData(prev => ({
      ...prev,
      address,
      latitude: lat.toString(),
      longitude: lng.toString(),
      location: address
    }));
    setShowMap(false);
    setMapSearchQuery('');
    setShowSearchResults(false);
  };

  // SahaSahibiOnboard'dan harita fonksiyonları
  const handleMapSearch = (query) => {
    setMapSearchQuery(query);
    
    // Önceki timeout'u temizle
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    if (query.length < 2) {
      setMapSearchResults([]);
      setShowSearchResults(false);
      setIsSearching(false);
      return;
    }

    // Debounce: 500ms bekle
    const timeout = setTimeout(async () => {
      setIsSearching(true);
      
      try {
        // OpenStreetMap Nominatim API kullanarak gerçek adres verilerini çek
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ', Türkiye')}&limit=10&addressdetails=1&extratags=1&namedetails=1`,
          {
            headers: {
              'User-Agent': 'SahadaApp/1.0'
            }
          }
        );
        
        if (!response.ok) {
          throw new Error('API isteği başarısız');
        }
        
        const data = await response.json();
        
        // API verilerini uygulama formatına dönüştür
        const results = data.map((item, index) => {
          const address = item.display_name;
          const lat = parseFloat(item.lat);
          const lng = parseFloat(item.lon);
          
          // Konum tipini belirle
          let type = 'Konum';
          if (item.type === 'administrative' && item.class === 'boundary') {
            type = 'İlçe';
          } else if (item.type === 'residential' || item.class === 'place') {
            type = 'Mahalle';
          } else if (item.type === 'highway' && item.class === 'highway') {
            type = 'Cadde';
          } else if (item.type === 'amenity' && item.class === 'leisure') {
            type = 'Spor Tesisi';
          } else if (item.type === 'amenity' && item.class === 'government') {
            type = 'Kamu';
          } else if (item.type === 'natural' && item.class === 'water') {
            type = 'Sahil';
          } else if (item.type === 'highway' && item.class === 'residential') {
            type = 'Sokak';
          }
          
          return {
            name: item.display_name.split(',')[0] || item.name || `Konum ${index + 1}`,
            lat,
            lng,
            address,
            type,
            importance: item.importance || 0
          };
        });
        
        // Önem sırasına göre sırala
        results.sort((a, b) => b.importance - a.importance);
        
        setMapSearchResults(results);
        setShowSearchResults(true);
        
      } catch (error) {
        console.error('Adres arama hatası:', error);
        
        // Hata durumunda boş sonuç göster
        setMapSearchResults([]);
        setShowSearchResults(true);
      } finally {
        setIsSearching(false);
      }
    }, 500);
    
    setSearchTimeout(timeout);
  };

  const handleSearchResultSelect = (result) => {
    setSelectedLocation({ lat: result.lat, lng: result.lng, address: result.address });
    setMapCenter({ lat: result.lat, lng: result.lng });
    handleLocationSelect(result.lat, result.lng, result.address);
  };

  const handleMapClick = (event) => {
    // Harita tıklamasından koordinat al (basit örnek)
    const lat = mapCenter.lat + (Math.random() - 0.5) * 0.01;
    const lng = mapCenter.lng + (Math.random() - 0.5) * 0.01;
    const address = `Seçilen Konum (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
    
    setSelectedLocation({ lat, lng, address });
    handleLocationSelect(lat, lng, address);
  };

  const handlePinDragStart = (event) => {
    setIsDragging(true);
    event.preventDefault();
  };

  const handlePinDrag = (event) => {
    if (!isDragging) return;
    
    const rect = event.currentTarget.parentElement.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    
    // Sınırları kontrol et
    const clampedX = Math.max(0, Math.min(100, x));
    const clampedY = Math.max(0, Math.min(100, y));
    
    setPinPosition({ x: clampedX, y: clampedY });
    
    // Koordinatları hesapla
    const lat = mapCenter.lat + (0.5 - clampedY / 100) * 0.01;
    const lng = mapCenter.lng + (clampedX / 100 - 0.5) * 0.01;
    const address = `Seçilen Konum (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
    
    setSelectedLocation({ lat, lng, address });
  };

  const handlePinDragEnd = (event) => {
    if (!isDragging) return;
    
    setIsDragging(false);
    
    // Son konumu kaydet
    const lat = mapCenter.lat + (0.5 - pinPosition.y / 100) * 0.01;
    const lng = mapCenter.lng + (pinPosition.x / 100 - 0.5) * 0.01;
    const address = `Seçilen Konum (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
    
    handleLocationSelect(lat, lng, address);
  };

  const handleAddPriceRule = () => {
    setFormData(prev => ({
      ...prev,
      customPrices: [
        ...prev.customPrices, 
        { start: 17, end: 24, price: parseFloat(prev.price) || 0 }
      ]
    }));
  };

  const handleRemovePriceRule = (index) => {
    setFormData(prev => ({
      ...prev,
      customPrices: prev.customPrices.filter((_, i) => i !== index)
    }));
  };

  const handlePriceRuleChange = (index, field, value) => {
    setFormData(prev => {
      const newPrices = [...prev.customPrices];
      newPrices[index] = { ...newPrices[index], [field]: parseFloat(value) };
      return { ...prev, customPrices: newPrices };
    });
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name?.trim()) newErrors.name = 'Saha adı gereklidir';
    // location ve address kontrolü
    if (!formData.location?.trim() && !formData.address?.trim()) newErrors.location = 'Konum gereklidir';
    if (!formData.address?.trim()) newErrors.address = 'Adres gereklidir';
    if (!formData.latitude || !formData.longitude) newErrors.location = 'Haritadan konum seçiniz';
    if (!formData.capacity || formData.capacity < 1) newErrors.capacity = 'Geçerli bir kapasite giriniz';
    if (!formData.price || formData.price < 0) newErrors.price = 'Geçerli bir fiyat giriniz';
    if (!formData.description?.trim()) newErrors.description = 'Açıklama gereklidir';
    if (!formData.phone?.trim()) newErrors.phone = 'Telefon numarası gereklidir';
    if (sahaImages.length === 0) newErrors.images = 'En az bir saha fotoğrafı yükleyiniz';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      const sahaData = {
        name: formData.name,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        type: formData.type,
        capacity: parseInt(formData.capacity),
        price: parseInt(formData.price),
        description: formData.description,
        facilities: formData.facilities,
        workingHours: formData.workingHours,
        phone: formData.phone,
        status: formData.status,
        customPrices: formData.customPrices,
        images: sahaImages,
        ownerId: user.uid,
        isActive: formData.status === 'active',
        rating: editingSaha ? editingSaha.rating || 0 : 0,
        reservations: editingSaha ? editingSaha.reservations || 0 : 0,
        revenue: editingSaha ? editingSaha.revenue || 0 : 0
      };
      
      let result;
      if (editingSaha) {
        result = await updateTesis(editingSaha.id, sahaData);
        if (result.success) {
          setSahalar(prev => prev.map(saha => 
            saha.id === editingSaha.id ? { ...saha, ...sahaData } : saha
          ));
        }
      } else {
        result = await addTesis(sahaData);
        if (result.success) {
          const newSaha = { id: result.id, ...sahaData };
          setSahalar(prev => [...prev, newSaha]);
        }
      }
      
      if (result.success) {
        setShowAddModal(false);
        setEditingSaha(null);
        setFormData({
          name: '',
          latitude: '',
          longitude: '',
          type: 'Futbol',
          capacity: '',
          price: '',
          description: '',
          facilities: [],
          workingHours: '08:00 - 24:00',
          phone: '',
          status: 'active',
          customPrices: []
        });
        setSahaImages([]);
        setErrors({});
      } else {
        console.error('Saha kaydetme hatası:', result.error);
      }
    } catch (error) {
      console.error('Saha kaydetme hatası:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const availableFacilities = [
    'Giriş', 'Çıkış', 'Kafeterya', 'Soyunma Odası', 'Duş', 
    'Park Alanı', 'Güvenlik', 'Klima', 'Ses Sistemi', 'Aydınlatma'
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <SahaSahibiSidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white shadow-sm border-b pl-16 pr-6 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Saha Yönetimi</h1>
              <p className="text-gray-600">Sahalarınızı yönetin ve düzenleyin</p>
            </div>
            <div className="flex items-center space-x-4">
              <button 
                onClick={handleAddNew}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Plus className="w-4 h-4" />
                <span>Yeni Saha Ekle</span>
              </button>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex-1 p-6 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Sahalar yükleniyor...</p>
              </div>
            </div>
          ) : (
            <>
            {/* Search and Filter */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Saha adı veya konum ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="all">Tüm Durumlar</option>
                  <option value="active">Aktif</option>
                  <option value="inactive">Pasif</option>
                  <option value="maintenance">Bakımda</option>
                </select>
                <button className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg border border-gray-300">
                  <Filter className="w-4 h-4" />
                  <span>Filtrele</span>
                </button>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Toplam Saha</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{sahalar.length}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Aktif Saha</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {sahalar.filter(s => s.status === 'active').length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Toplam Rezervasyon</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {sahalar.reduce((sum, s) => sum + s.reservations, 0)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Toplam Gelir</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    ₺{sahalar.reduce((sum, s) => sum + s.revenue, 0).toLocaleString()}
                  </p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Sahalar Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSahalar.map((saha) => (
              <div key={saha.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                {/* Saha Image */}
                <div className="relative h-48 bg-gray-200">
                  {saha.images && saha.images.length > 0 ? (
                    <img
                      src={saha.images[0].optimized_url || saha.images[0].url}
                      alt={saha.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-200">
                      <ImageIcon className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                  <div className="absolute top-4 right-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(saha.status)}`}>
                      {getStatusText(saha.status)}
                    </span>
                  </div>
                  <div className="absolute bottom-4 left-4 text-white">
                    <h3 className="text-xl font-bold">{saha.name}</h3>
                    <p className="text-sm opacity-90">{saha.location}</p>
                  </div>
                </div>

                {/* Saha Info */}
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">{saha.type}</span>
                      <span className="text-gray-300">•</span>
                      <div className="flex items-center space-x-1">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">{saha.capacity} kişi</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span className="text-sm font-medium">{saha.rating}</span>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Saatlik Ücret</span>
                      <span className="font-semibold text-green-600">₺{saha.price}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Bu Ay Rezervasyon</span>
                      <span className="font-semibold">{saha.reservations}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Bu Ay Gelir</span>
                      <span className="font-semibold">₺{saha.revenue.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <button
                      onClick={() => navigate(`/saha-sahibi/saha-detay/${saha.id}`)}
                      className="flex items-center space-x-2 text-green-600 hover:text-green-700 font-medium"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Detayları Gör</span>
                    </button>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEdit(saha)}
                        className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setShowDeleteModal(saha.id)}
                        className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredSahalar.length === 0 && (
            <div className="text-center py-12">
              <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Saha bulunamadı</h3>
              <p className="text-gray-600 mb-6">Arama kriterlerinize uygun saha bulunamadı.</p>
              <button
                onClick={handleAddNew}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Plus className="w-4 h-4" />
                <span>İlk Sahanızı Ekleyin</span>
              </button>
            </div>
          )}
            </>
          )}
        </div>
      </div>

      {/* Add/Edit Saha Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">
                  {editingSaha ? 'Sahayı Düzenle' : 'Yeni Saha Ekle'}
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Saha Adı */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Saha Adı *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                      errors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Saha adını giriniz"
                  />
                  {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                </div>

                {/* Saha Tipi */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Saha Tipi
                  </label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="Futbol">Futbol</option>
                    <option value="Basketbol">Basketbol</option>
                    <option value="Tenis">Tenis</option>
                    <option value="Voleybol">Voleybol</option>
                    <option value="Badminton">Badminton</option>
                    <option value="Squash">Squash</option>
                  </select>
                </div>

                {/* Kapasite */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kapasite *
                  </label>
                  <input
                    type="number"
                    name="capacity"
                    value={formData.capacity}
                    onChange={handleInputChange}
                    min="1"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                      errors.capacity ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Maksimum kişi sayısı"
                  />
                  {errors.capacity && <p className="text-red-500 text-sm mt-1">{errors.capacity}</p>}
                </div>

                {/* Saatlik Ücret */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Saatlik Ücret (₺) *
                  </label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    min="0"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                      errors.price ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Saatlik ücret"
                  />
                  {errors.price && <p className="text-red-500 text-sm mt-1">{errors.price}</p>}
                </div>

                {/* Özel Fiyatlandırma */}
                <div className="md:col-span-2 bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-medium text-gray-900">Özel Fiyatlandırma</h4>
                      <p className="text-sm text-gray-500">Belirli saat aralıkları için farklı fiyatlar belirleyin</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddPriceRule}
                      className="text-sm text-green-600 hover:text-green-700 font-medium flex items-center gap-1"
                    >
                      <Plus size={16} />
                      Kural Ekle
                    </button>
                  </div>

                  {formData.customPrices?.length > 0 ? (
                    <div className="space-y-3">
                      {formData.customPrices.map((rule, index) => (
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
                            type="button"
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

                {/* Çalışma Saatleri */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Çalışma Saatleri
                  </label>
                  <input
                    type="text"
                    name="workingHours"
                    value={formData.workingHours}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Örn: 08:00 - 24:00"
                  />
                </div>

                {/* Telefon */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Telefon *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                      errors.phone ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Telefon numarası"
                  />
                  {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
                </div>

                {/* Durum */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Durum
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="active">Aktif</option>
                    <option value="inactive">Pasif</option>
                    <option value="maintenance">Bakımda</option>
                  </select>
                </div>
              </div>

              {/* Konum Seçimi */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Konum Seçimi *
                </label>
                <div className="space-y-3">
                  <div className="relative">
                    <MapPin className="absolute top-1/2 left-3 -translate-y-1/2 transform text-gray-400" size={20} />
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => handleInputChange({ target: { name: 'address', value: e.target.value } })}
                      placeholder="Tam adres bilginizi girin veya harita üzerinden seçin"
                      className={`w-full rounded-lg border py-3 pr-4 pl-10 transition-all duration-200 focus:border-transparent focus:ring-2 focus:ring-green-500 focus:outline-none ${
                        errors.address ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                  </div>
                  
                  {/* Harita Butonu */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowMap(!showMap)}
                      className="flex items-center gap-2 rounded-lg border border-green-500 bg-green-50 px-4 py-2 text-green-700 transition-colors hover:bg-green-100"
                    >
                      <MapPin size={16} />
                      <span className="text-sm font-medium">
                        {showMap ? 'Haritayı Gizle' : 'Harita Üzerinden Seç'}
                      </span>
                    </button>
                    
                    {formData.latitude && formData.longitude && (
                      <button
                        type="button"
                        onClick={() => {
                          const url = `https://www.google.com/maps?q=${formData.latitude},${formData.longitude}`;
                          window.open(url, '_blank');
                        }}
                        className="flex items-center gap-2 rounded-lg border border-blue-500 bg-blue-50 px-4 py-2 text-blue-700 transition-colors hover:bg-blue-100"
                      >
                        <MapPin size={16} />
                        <span className="text-sm font-medium">Konumu Görüntüle</span>
                      </button>
                    )}
                  </div>
                </div>
                
                {errors.location && <p className="text-red-500 text-sm mt-1">{errors.location}</p>}
                {errors.address && <p className="text-red-500 text-sm mt-1">{errors.address}</p>}
              </div>

              {/* Saha Fotoğrafları */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Saha Fotoğrafları *
                </label>
                
                {/* Resim Yükleme */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e.target.files)}
                    className="hidden"
                    id="image-upload"
                    disabled={uploadingImages}
                  />
                  <label
                    htmlFor="image-upload"
                    className={`cursor-pointer ${uploadingImages ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-lg font-medium text-gray-700 mb-2">
                      {uploadingImages ? 'Yükleniyor...' : 'Fotoğraf Yükle'}
                    </p>
                    <p className="text-sm text-gray-500">
                      PNG, JPG, GIF, WebP (Max 10MB) • En az 1 fotoğraf
                    </p>
                  </label>
                </div>

                {/* Yüklenen Resimler */}
                {sahaImages.length > 0 && (
                  <div className="mt-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {sahaImages.map((image, index) => (
                        <div key={image.id || index} className="relative group">
                          <img
                            src={image.url}
                            alt={`Saha ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => handleImageRemove(image.id)}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {errors.images && <p className="text-red-500 text-sm mt-1">{errors.images}</p>}
              </div>

              {/* Harita Modal */}
              {showMap && (
                <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4 shadow-lg">
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="font-medium text-gray-900">Konum Seçin</h4>
                    <button
                      type="button"
                      onClick={() => setShowMap(false)}
                      className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  
                  {/* Adres Arama */}
                  <div className="mb-4 relative">
                    <div className="relative">
                      <MapPin className="absolute top-1/2 left-3 -translate-y-1/2 transform text-gray-400" size={16} />
                      <input
                        type="text"
                        value={mapSearchQuery}
                        onChange={(e) => handleMapSearch(e.target.value)}
                        placeholder="Sokak, mahalle, cadde arayın"
                        className="w-full rounded-lg border border-gray-300 py-2 pr-4 pl-10 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-500 focus:outline-none"
                      />
                    </div>
                    
                    {/* Loading State */}
                    {isSearching && (
                      <div className="absolute top-full left-0 right-0 z-10 mt-1 rounded-lg border border-gray-200 bg-white p-4 shadow-lg">
                        <div className="flex items-center gap-3">
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-green-500 border-t-transparent"></div>
                          <span className="text-sm text-gray-600">Aranıyor...</span>
                        </div>
                      </div>
                    )}

                    {/* Arama Sonuçları Dropdown */}
                    {showSearchResults && !isSearching && mapSearchResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 z-10 mt-1 max-h-80 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                        {mapSearchResults.map((result, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => handleSearchResultSelect(result)}
                            className="w-full p-3 text-left hover:bg-green-50 border-b border-gray-100 last:border-b-0"
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 mt-1">
                                {result.type === 'Spor Tesisi' && <span className="text-green-500">🏟️</span>}
                                {result.type === 'İlçe' && <span className="text-blue-500">🏘️</span>}
                                {result.type === 'Mahalle' && <span className="text-purple-500">🏠</span>}
                                {result.type === 'Cadde' && <span className="text-orange-500">🛣️</span>}
                                {result.type === 'Sokak' && <span className="text-red-500">🛤️</span>}
                                {result.type === 'Kamu' && <span className="text-indigo-500">🏛️</span>}
                                {result.type === 'Sahil' && <span className="text-cyan-500">🏖️</span>}
                                {!['Spor Tesisi', 'İlçe', 'Mahalle', 'Cadde', 'Sokak', 'Kamu', 'Sahil'].includes(result.type) && <MapPin size={16} className="text-gray-500" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <div className="font-medium text-gray-900 text-sm truncate">{result.name}</div>
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                    {result.type}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-500 line-clamp-2">{result.address}</div>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {/* Arama Sonucu Bulunamadı */}
                    {showSearchResults && !isSearching && mapSearchResults.length === 0 && mapSearchQuery.length >= 2 && (
                      <div className="absolute top-full left-0 right-0 z-10 mt-1 rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <CircleAlert size={16} />
                          <span>"{mapSearchQuery}" için sonuç bulunamadı</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="mb-3 rounded-lg border border-gray-200 overflow-hidden relative">
                    <iframe
                      src={`https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3010.279749111567!2d${mapCenter.lng}!3d${mapCenter.lat}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x14cab9bd6571d149%3A0x1c515b0b4b4b4b4b!2sIstanbul!5e0!3m2!1str!2str!4v1234567890123!5m2!1str!2str`}
                      width="100%"
                      height="300"
                      style={{ border: 0 }}
                      allowFullScreen=""
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      title="Konum Seçimi"
                      onClick={handleMapClick}
                    />
                    
                    {/* Pin Overlay */}
                    <div 
                      className="absolute cursor-move z-10 select-none"
                      style={{
                        left: `${pinPosition.x}%`,
                        top: `${pinPosition.y}%`,
                        transform: 'translate(-50%, -100%)'
                      }}
                      onMouseDown={handlePinDragStart}
                      onMouseMove={handlePinDrag}
                      onMouseUp={handlePinDragEnd}
                      onMouseLeave={handlePinDragEnd}
                    >
                      <div className="relative">
                        <div className={`w-8 h-8 bg-red-500 rounded-full border-4 border-white shadow-lg flex items-center justify-center transition-transform ${isDragging ? 'scale-110' : 'scale-100'}`}>
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1">
                          <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-red-500"></div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Pin Sürükleme Talimatı */}
                    <div className="absolute top-2 left-2 bg-white bg-opacity-90 rounded-lg px-3 py-2 text-xs text-gray-600 shadow-sm">
                      📍 Pin'i sürükleyerek konum seçin
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      Adres arama kutusuna yazarak konum arayabilir veya harita üzerindeki pin'i sürükleyerek konum seçebilirsiniz
                    </p>
                    
                    {/* Seçilen Konum Gösterimi */}
                    {selectedLocation && (
                      <div className="rounded-lg bg-green-50 border border-green-200 p-3">
                        <div className="flex items-start gap-2">
                          <MapPin size={16} className="text-green-600 mt-0.5" />
                          <div className="text-sm text-green-700">
                            <p className="font-medium">Seçilen Konum:</p>
                            <p className="text-xs">{selectedLocation.address}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="rounded-lg bg-blue-50 p-3">
                      <div className="flex items-start gap-2">
                        <CircleAlert size={16} className="text-blue-600 mt-0.5" />
                        <div className="text-xs text-blue-700">
                          <p className="font-medium">İpucu:</p>
                          <p>Adres arama kutusuna "İstanbul" gibi anahtar kelimeler yazarak arama yapabilir veya harita üzerindeki kırmızı pin'i sürükleyerek konum seçebilirsiniz.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Açıklama */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Açıklama *
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                    errors.description ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Saha hakkında detaylı açıklama"
                />
                {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
              </div>

              {/* Olanaklar */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Olanaklar
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {availableFacilities.map((facility) => (
                    <label key={facility} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.facilities.includes(facility)}
                        onChange={() => handleFacilityChange(facility)}
                        className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                      />
                      <span className="text-sm text-gray-700">{facility}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  disabled={isSubmitting}
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isSubmitting && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  )}
                  <span>{editingSaha ? 'Güncelle' : 'Kaydet'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50">
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
              <strong>{sahalar.find(s => s.id === showDeleteModal)?.name}</strong> adlı sahayı silmek istediğinizden emin misiniz?
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteModal(null)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                İptal
              </button>
              <button
                onClick={() => handleDelete(showDeleteModal)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SahaYonetimi;
