import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { createOpenMatch, getAllTesisler, getReservationsByTesisId } from '../../services/firestoreService';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import OyuncuSidebar from '../../components/OyuncuSidebar';
import { 
  Calendar, MapPin, DollarSign, Users, Clock, X, Search,
  Building2, AlertCircle, CheckCircle
} from 'lucide-react';
import toast from '../../utils/toast';

const MacOlustur = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [tesisler, setTesisler] = useState([]);
  const [tesisSearchQuery, setTesisSearchQuery] = useState('');
  const [showTesisDropdown, setShowTesisDropdown] = useState(false);
  const [selectedTesis, setSelectedTesis] = useState(null);
  const [bookedSlots, setBookedSlots] = useState([]);
  
  const [formData, setFormData] = useState({
    tesisId: '',
    tesisName: '',
    location: '',
    address: '',
    date: '',
    timeSlot: '', // Added dummy comment to ensure context matching if needed, but actually simple replacment is better.
    title: '', // Added title field
    format: 'football',
    level: 'intermediate',
    maxPlayers: 10,
    pricePerPlayer: 0,
    description: ''
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    loadTesisler();
    const cleanup = setupRealtimeListener();
    
    return () => {
      if (cleanup) cleanup();
    };
  }, [user]);

  // Saha veya tarih değiştiğinde rezervasyonları kontrol et
  useEffect(() => {
    const fetchReservations = async () => {
      if (selectedTesis && formData.date) {
        try {
          const result = await getReservationsByTesisId(selectedTesis.id, formData.date);
          if (result.success) {
            const booked = result.data.map(res => res.timeSlot);
            setBookedSlots(booked);
          }
        } catch (error) {
          console.error('Rezervasyonlar yüklenemedi:', error);
        }
      } else {
        setBookedSlots([]);
      }
    };

    fetchReservations();
  }, [selectedTesis, formData.date]);

  const setupRealtimeListener = () => {
    const tesislerQuery = query(collection(db, 'tesisler'), where('status', '==', 'active'));

    const unsubscribe = onSnapshot(tesislerQuery, (snapshot) => {
      const tesislerData = [];
      snapshot.forEach((doc) => {
        tesislerData.push({ id: doc.id, ...doc.data() });
      });
      setTesisler(tesislerData);
    }, (error) => {
      console.error('Tesisler listener hatası:', error);
    });

    return () => unsubscribe();
  };

  const loadTesisler = async () => {
    try {
      const result = await getAllTesisler();
      if (result.success) {
        setTesisler(result.data);
      }
    } catch (error) {
      console.error('Tesisler yükleme hatası:', error);
    }
  };

  const filteredTesisler = tesisler.filter(tesis => {
    if (!tesisSearchQuery) return true;
    const query = tesisSearchQuery.toLowerCase();
    return (
      tesis.name?.toLowerCase().includes(query) ||
      tesis.location?.toLowerCase().includes(query) ||
      tesis.address?.toLowerCase().includes(query)
    );
  });

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

  const handleTesisSelect = (tesis) => {
    setSelectedTesis(tesis);
    setFormData(prev => ({
      ...prev,
      tesisId: tesis.id,
      tesisName: tesis.name,
      location: tesis.location || '',
      address: tesis.address || ''
    }));
    setTesisSearchQuery(tesis.name);
    setShowTesisDropdown(false);
  };

  const handleRemoveTesis = () => {
    setSelectedTesis(null);
    setFormData(prev => ({
      ...prev,
      tesisId: '',
      tesisName: '',
      location: '',
      address: ''
    }));
    setTesisSearchQuery('');
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.date) {
      newErrors.date = 'Tarih seçmelisiniz';
    } else {
      const selectedDate = new Date(formData.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate < today) {
        newErrors.date = 'Geçmiş bir tarih seçemezsiniz';
      }
    }

    if (!formData.timeSlot) {
      newErrors.timeSlot = 'Saat seçmelisiniz';
    }

    if (!formData.location && !formData.tesisId) {
      newErrors.location = 'Konum veya saha seçmelisiniz';
    }

    if (formData.maxPlayers < 2) {
      newErrors.maxPlayers = 'Minimum 2 oyuncu olmalı';
    }

    if (formData.maxPlayers > 50) {
      newErrors.maxPlayers = 'Maksimum 50 oyuncu olabilir';
    }

    if (formData.pricePerPlayer < 0) {
      newErrors.pricePerPlayer = 'Ücret negatif olamaz';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Lütfen formu kontrol edin');
      return;
    }

    setLoading(true);
    try {
      const result = await createOpenMatch({
        organizerId: user.uid,
        title: formData.title || null,
        tesisId: formData.tesisId || null,
        tesisName: formData.tesisName || null,
        location: formData.location || formData.tesisName || 'Konum belirtilmemiş',
        address: formData.address || null,
        date: formData.date,
        timeSlot: formData.timeSlot,
        format: formData.format,
        level: formData.level,
        maxPlayers: parseInt(formData.maxPlayers),
        currentPlayers: 1, // Organizatör dahil
        pricePerPlayer: parseFloat(formData.pricePerPlayer) || 0,
        description: formData.description || ''
      });

      if (result.success) {
        toast.success('Maç başarıyla oluşturuldu!');
        navigate('/oyuncu/oyuncu-bul');
      } else {
        toast.error(result.error || 'Maç oluşturulamadı');
      }
    } catch (error) {
      console.error('Maç oluşturma hatası:', error);
      toast.error('Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };
  // Generate time slots
  const timeSlots = [];
  for (let hour = 6; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      timeSlots.push(timeString);
    }
  }

  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="flex min-h-screen bg-gray-50">
      <OyuncuSidebar />
      
      <div className="flex-1 p-6 md:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Maç Oluştur
          </h1>
          <p className="text-lg text-gray-600">
            Eksik oyuncu arayan bir maç oluştur ve takımını tamamla
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl shadow-sm p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Maç Başlığı */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maç Başlığı <span className="text-gray-400 font-normal">(Opsiyonel)</span>
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Örn: Haftasonu Maçı, Dostluk Maçı vb."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* Saha Seçimi */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Saha Seçimi (Opsiyonel)
              </label>
              <div className="relative z-20">
                {selectedTesis ? (
                  <div className="flex items-center justify-between p-3 border border-gray-300 rounded-lg bg-gray-50">
                    <div className="flex items-center space-x-3">
                      <Building2 className="w-5 h-5 text-gray-600" />
                      <div>
                        <p className="font-medium text-gray-900">{selectedTesis.name}</p>
                        <p className="text-sm text-gray-600">{selectedTesis.location}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveTesis}
                      className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <X size={18} />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                      <input
                        type="text"
                        placeholder="Saha ara veya 'Saha olmadan' bırakın..."
                        value={tesisSearchQuery}
                        onChange={(e) => {
                          setTesisSearchQuery(e.target.value);
                          setShowTesisDropdown(true);
                        }}
                        onFocus={() => setShowTesisDropdown(true)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                    {showTesisDropdown && filteredTesisler.length > 0 && (
                      <div className="absolute z-30 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {filteredTesisler.map((tesis) => (
                          <button
                            key={tesis.id}
                            type="button"
                            onClick={() => handleTesisSelect(tesis)}
                            className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center space-x-3"
                          >
                            <Building2 className="w-5 h-5 text-gray-400" />
                            <div>
                              <p className="font-medium text-gray-900">{tesis.name}</p>
                              <p className="text-sm text-gray-600">{tesis.location}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Saha seçmezseniz, manuel olarak konum girebilirsiniz
              </p>
            </div>

            {/* Konum (Saha seçilmediyse) */}
            {!selectedTesis && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Konum <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    placeholder="Örn: Kadıköy Spor Kompleksi"
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 ${
                      errors.location ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-green-500'
                    }`}
                  />
                </div>
                {errors.location && (
                  <p className="mt-1 text-sm text-red-600 flex items-center space-x-1">
                    <AlertCircle size={14} />
                    <span>{errors.location}</span>
                  </p>
                )}
              </div>
            )}

            {/* Adres (Opsiyonel) */}
            {!selectedTesis && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Detaylı Adres (Opsiyonel)
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Örn: Kadıköy, İstanbul"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            )}

            {/* Tarih ve Saat */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tarih <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    min={today}
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 ${
                      errors.date ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-green-500'
                    }`}
                  />
                </div>
                {errors.date && (
                  <p className="mt-1 text-sm text-red-600 flex items-center space-x-1">
                    <AlertCircle size={14} />
                    <span>{errors.date}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Saat <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <select
                    name="timeSlot"
                    value={formData.timeSlot}
                    onChange={handleInputChange}
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 ${
                      errors.timeSlot ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-green-500'
                    }`}
                  >
                    <option value="">Saat seçin</option>
                    {timeSlots.map((time) => {
                      const isBooked = bookedSlots.includes(time);
                      return (
                        <option 
                          key={time} 
                          value={time}
                          disabled={isBooked}
                          className={isBooked ? 'text-gray-400 bg-gray-100' : ''}
                        >
                          {time} {isBooked ? '(Dolu)' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>
                {errors.timeSlot && (
                  <p className="mt-1 text-sm text-red-600 flex items-center space-x-1">
                    <AlertCircle size={14} />
                    <span>{errors.timeSlot}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Format ve Seviye */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Format <span className="text-red-500">*</span>
                </label>
                <select
                  name="format"
                  value={formData.format}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="football">⚽ Halı Saha</option>
                  <option value="basketball">🏀 Basketbol</option>
                  <option value="tennis">🎾 Tenis</option>
                  <option value="volleyball">🏐 Voleybol</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Seviye <span className="text-red-500">*</span>
                </label>
                <select
                  name="level"
                  value={formData.level}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="beginner">Başlangıç</option>
                  <option value="intermediate">Orta</option>
                  <option value="good">İyi</option>
                  <option value="advanced">İleri</option>
                  <option value="mixed">Karışık</option>
                </select>
              </div>
            </div>

            {/* Oyuncu Sayısı ve Ücret */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maksimum Oyuncu Sayısı <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="number"
                    name="maxPlayers"
                    value={formData.maxPlayers}
                    onChange={handleInputChange}
                    min="2"
                    max="50"
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 ${
                      errors.maxPlayers ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-green-500'
                    }`}
                  />
                </div>
                {errors.maxPlayers && (
                  <p className="mt-1 text-sm text-red-600 flex items-center space-x-1">
                    <AlertCircle size={14} />
                    <span>{errors.maxPlayers}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kişi Başı Ücret (₺) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="number"
                    name="pricePerPlayer"
                    value={formData.pricePerPlayer}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    placeholder="0 = Ücretsiz"
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 ${
                      errors.pricePerPlayer ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-green-500'
                    }`}
                  />
                </div>
                {errors.pricePerPlayer && (
                  <p className="mt-1 text-sm text-red-600 flex items-center space-x-1">
                    <AlertCircle size={14} />
                    <span>{errors.pricePerPlayer}</span>
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Ücretsiz maç için 0 girin
                </p>
              </div>
            </div>

            {/* Açıklama */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Açıklama / Notlar (Opsiyonel)
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                placeholder="Maç hakkında ek bilgiler, kurallar, vb..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              />
            </div>

            {/* Submit Button */}
            <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => navigate('/oyuncu/oyuncu-bul')}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Oluşturuluyor...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle size={20} />
                    <span>Maç Oluştur</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Click outside to close dropdown */}
      {showTesisDropdown && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setShowTesisDropdown(false)}
        />
      )}
    </div>
  );
};

export default MacOlustur;

