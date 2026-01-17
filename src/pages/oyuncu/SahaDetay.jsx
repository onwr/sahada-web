import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getTesis, addRezervasyon } from '../../services/firestoreService';
import { Timestamp, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import OyuncuSidebar from '../../components/OyuncuSidebar';
import { MapPin, Star, Users, DollarSign, Clock, AlertCircle, Loader2, Phone, Mail, Globe, CheckCircle, X, Calendar, Plus, MessageSquare, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from '../../utils/toast';

const SahaDetay = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sahaData, setSahaData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [reservationForm, setReservationForm] = useState({
    date: '',
    timeSlot: '',
    playerCount: 1,
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [availableTimeSlots, setAvailableTimeSlots] = useState([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showImageModal, setShowImageModal] = useState(false);

  useEffect(() => {
    if (!id) return;
    
    loadSahaData();
    const cleanup = setupRealtimeListener();
    
    return () => {
      if (cleanup) cleanup();
    };
  }, [id]);

  useEffect(() => {
    if (sahaData && reservationForm.date) {
      generateTimeSlots();
    }
  }, [sahaData, reservationForm.date]);

  const generateTimeSlots = () => {
    if (!sahaData || !reservationForm.date) return;
    
    const slots = [];
    const startHour = 8; // 08:00
    const endHour = 23; // 23:00
    
    for (let hour = startHour; hour < endHour; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00 - ${(hour + 1).toString().padStart(2, '0')}:00`);
    }
    
    setAvailableTimeSlots(slots);
  };

  const setupRealtimeListener = () => {
    if (!id) return;

    const sahaDocRef = doc(db, 'tesisler', id);

    const unsubscribe = onSnapshot(sahaDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setSahaData({ id: docSnap.id, ...docSnap.data() });
        setLoading(false);
        setError(null);
      } else {
        setError('Saha bulunamadı');
        setLoading(false);
      }
    }, (error) => {
      console.error('Saha listener hatası:', error);
      setError('Saha verileri güncellenirken hata oluştu');
      setLoading(false);
    });

    return () => unsubscribe();
  };

  const loadSahaData = async () => {
    if (!id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await getTesis(id);
      if (result.success) {
        setSahaData(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error('Saha veri yükleme hatası:', err);
      setError('Saha verileri yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleImageClick = (index) => {
    setSelectedImageIndex(index);
    setShowImageModal(true);
  };

  const nextImage = () => {
    if (!sahaData?.images) return;
    setSelectedImageIndex((prev) => (prev + 1) % sahaData.images.length);
  };

  const prevImage = () => {
    if (!sahaData?.images) return;
    setSelectedImageIndex((prev) => (prev - 1 + sahaData.images.length) % sahaData.images.length);
  };

  const handleReservationSubmit = async (e) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Rezervasyon yapmak için giriş yapmalısınız');
      return;
    }
    
    if (!reservationForm.date || !reservationForm.timeSlot) {
      toast.error('Lütfen tarih ve saat seçin');
      return;
    }
    
    if (reservationForm.playerCount < 1) {
      toast.error('Oyuncu sayısı en az 1 olmalıdır');
      return;
    }
    
    setSubmitting(true);
    
    try {
      const selectedDate = new Date(reservationForm.date);
      const totalAmount = sahaData.price * reservationForm.playerCount;
      
      const reservationData = {
        tesisId: id,
        tesisName: sahaData.name,
        ownerId: sahaData.ownerId,
        players: [user.uid],
        date: Timestamp.fromDate(selectedDate),
        timeSlot: reservationForm.timeSlot,
        totalPlayers: reservationForm.playerCount,
        price: sahaData.price,
        totalAmount: totalAmount,
        status: 'pending',
        paymentMethod: 'online',
        notes: reservationForm.notes || '',
        createdAt: Timestamp.now()
      };
      
      const result = await addRezervasyon(reservationData);
      
      if (result.success) {
        toast.success('Rezervasyon başarıyla oluşturuldu');
        setShowReservationModal(false);
        setReservationForm({
          date: '',
          timeSlot: '',
          playerCount: 1,
          notes: ''
        });
      } else {
        toast.error(result.error || 'Rezervasyon oluşturulamadı');
      }
    } catch (err) {
      console.error('Rezervasyon oluşturma hatası:', err);
      toast.error('Rezervasyon oluşturulurken hata oluştu');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (error || !sahaData) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Hata</h3>
          <p className="text-gray-600">{error || 'Saha bulunamadı'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <OyuncuSidebar />

      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white shadow-sm border-b px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900">{sahaData.name}</h1>
          <p className="text-gray-600 mt-1">{sahaData.location}</p>
        </header>

        <div className="flex-1 p-6 overflow-y-auto">
          {/* Hero Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
            {sahaData.images && sahaData.images.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2 h-80">
                <div 
                  className="md:col-span-2 md:row-span-2 cursor-zoom-in group"
                  onClick={() => handleImageClick(0)}
                >
                  <img
                    src={sahaData.images[0].optimized_url || sahaData.images[0].url}
                    alt={sahaData.name}
                    className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                  />
                </div>
                {sahaData.images.slice(1, 5).map((image, index) => (
                  <div 
                    key={index} 
                    className="cursor-zoom-in group relative"
                    onClick={() => handleImageClick(index + 1)}
                  >
                    <img
                      src={image.optimized_url || image.url}
                      alt={`${sahaData.name} ${index + 2}`}
                      className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-80 bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                <MapPin className="w-32 h-32 text-white opacity-50" />
              </div>
            )}

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Saatlik Ücret</p>
                    <p className="text-xl font-bold text-gray-900">₺{sahaData.price}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Kapasite</p>
                    <p className="text-xl font-bold text-gray-900">{sahaData.capacity} kişi</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <Star className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Puan</p>
                    <p className="text-xl font-bold text-gray-900">{sahaData.rating || 0}/5</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Çalışma Saatleri</p>
                    <p className="text-xl font-bold text-gray-900">{sahaData.workingHours}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sol Kolon - Detaylar */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Açıklama</h2>
                <p className="text-gray-700 leading-relaxed">{sahaData.description}</p>
              </div>

              {sahaData.facilities && sahaData.facilities.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Olanaklar</h2>
                  <div className="grid grid-cols-2 gap-3">
                    {sahaData.facilities.map((facility, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="text-gray-700">{facility}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">İletişim</h2>
                <div className="space-y-3">
                  {sahaData.phone && (
                    <div className="flex items-center space-x-3">
                      <Phone className="w-5 h-5 text-gray-400" />
                      <span className="text-gray-700">{sahaData.phone}</span>
                    </div>
                  )}
                  {sahaData.email && (
                    <div className="flex items-center space-x-3">
                      <Mail className="w-5 h-5 text-gray-400" />
                      <span className="text-gray-700">{sahaData.email}</span>
                    </div>
                  )}
                  {sahaData.website && (
                    <div className="flex items-center space-x-3">
                      <Globe className="w-5 h-5 text-gray-400" />
                      <span className="text-gray-700">{sahaData.website}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sağ Kolon - Rezervasyon */}
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sticky top-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Rezervasyon Yap</h2>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Saatlik Ücret</p>
                    <p className="text-3xl font-bold text-green-600">₺{sahaData.price}</p>
                  </div>
                  <button 
                    className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center space-x-2 mb-2"
                    onClick={() => {
                      if (!user) {
                        toast.error('Giriş yapmalısınız');
                        return;
                      }
                      // Navigate to messages with the owner
                      navigate(`/oyuncu/mesajlar?userId=${sahaData.ownerId}`);
                    }}
                  >
                     <MessageSquare className="w-5 h-5" />
                     <span>Mesaj Gönder</span>
                  </button>
                  <button 
                    className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center space-x-2"
                    onClick={() => {
                      if (!user) {
                        toast.error('Rezervasyon yapmak için giriş yapmalısınız');
                        return;
                      }
                      navigate(`/oyuncu/rezervasyon/${id}`);
                    }}
                  >
                    <Plus className="w-5 h-5" />
                    <span>Rezervasyon Yap</span>
                  </button>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>Anında onay</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>İptal imkanı</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>Güvenli ödeme</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-3">Konum</h3>
                <p className="text-gray-700">{sahaData.address || sahaData.location}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Rezervasyon Modal */}
        {showReservationModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Rezervasyon Yap</h2>
                <button
                  onClick={() => {
                    setShowReservationModal(false);
                    setReservationForm({
                      date: '',
                      timeSlot: '',
                      playerCount: 1,
                      notes: ''
                    });
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <form onSubmit={handleReservationSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Tarih
                  </label>
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().split('T')[0]}
                    value={reservationForm.date}
                    onChange={(e) => setReservationForm({ ...reservationForm, date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Clock className="w-4 h-4 inline mr-1" />
                    Saat
                  </label>
                  <select
                    required
                    value={reservationForm.timeSlot}
                    onChange={(e) => setReservationForm({ ...reservationForm, timeSlot: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Saat seçiniz</option>
                    {availableTimeSlots.map((slot, index) => (
                      <option key={index} value={slot}>{slot}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Users className="w-4 h-4 inline mr-1" />
                    Oyuncu Sayısı
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max={sahaData.capacity || 22}
                    value={reservationForm.playerCount}
                    onChange={(e) => setReservationForm({ ...reservationForm, playerCount: parseInt(e.target.value) || 1 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Maksimum: {sahaData.capacity || 22} kişi</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notlar (Opsiyonel)</label>
                  <textarea
                    value={reservationForm.notes}
                    onChange={(e) => setReservationForm({ ...reservationForm, notes: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="Özel istekleriniz varsa buraya yazabilirsiniz..."
                  />
                </div>

                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Saatlik Ücret:</span>
                    <span className="font-medium">₺{sahaData.price}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Oyuncu Sayısı:</span>
                    <span className="font-medium">{reservationForm.playerCount} kişi</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
                    <span>Toplam:</span>
                    <span className="text-green-600">₺{(sahaData.price * reservationForm.playerCount).toLocaleString('tr-TR')}</span>
                  </div>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowReservationModal(false);
                      setReservationForm({
                        date: '',
                        timeSlot: '',
                        playerCount: 1,
                        notes: ''
                      });
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Oluşturuluyor...' : 'Rezervasyon Yap'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Image Modal */}
      {showImageModal && sahaData.images && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Close Button */}
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute top-4 right-4 z-[110] p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition-all transform hover:scale-110 active:scale-90"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Navigation Buttons */}
            {sahaData.images.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); prevImage(); }}
                  className="absolute left-4 z-[110] p-4 bg-white/5 hover:bg-white/20 backdrop-blur-sm rounded-full text-white transition-all group"
                >
                  <ChevronLeft className="w-8 h-8 group-hover:-translate-x-1 transition-transform" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); nextImage(); }}
                  className="absolute right-4 z-[110] p-4 bg-white/5 hover:bg-white/20 backdrop-blur-sm rounded-full text-white transition-all group"
                >
                  <ChevronRight className="w-8 h-8 group-hover:translate-x-1 transition-transform" />
                </button>
              </>
            )}

            {/* Main Image */}
            <div 
              className="relative max-w-5xl max-h-[85vh] flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={sahaData.images[selectedImageIndex].optimized_url || sahaData.images[selectedImageIndex].url}
                alt={`${sahaData.name} ${selectedImageIndex + 1}`}
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              />
              
              {/* Counter */}
              <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-white/70 text-sm font-medium">
                {selectedImageIndex + 1} / {sahaData.images.length}
              </div>
            </div>

            {/* Click backdrop to close */}
            <div 
              className="absolute inset-0 z-0" 
              onClick={() => setShowImageModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default SahaDetay;
