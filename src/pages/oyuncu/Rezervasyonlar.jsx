import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getPlayerReservations, cancelReservation, getInvoice, getTesis } from '../../services/firestoreService';
import { collection, query, onSnapshot, where, or } from 'firebase/firestore';
import { db } from '../../config/firebase';
import OyuncuSidebar from '../../components/OyuncuSidebar';
import DashboardHeader from '../../components/DashboardHeader';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Search, 
  List, 
  CalendarDays, 
  Grid3X3,
  AlertCircle,
  CheckCircle,
  XCircle,
  X,
  Eye,
  Download,
  Trash2,
  DollarSign,
  FileText,
  QrCode,
  Phone,
  ExternalLink,
  CreditCard,
  User,
  Mail,
  Building,
  Receipt,
  Info,
  Navigation
} from 'lucide-react';
import toast from '../../utils/toast';
import RatePlayersModal from '../../components/RatePlayersModal';
import { getUsersByIds } from '../../services/firestoreService';

const Rezervasyonlar = () => {
  const { user } = useAuth();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('list');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [invoice, setInvoice] = useState(null);
  const [loadingInvoice, setLoadingInvoice] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [tesisData, setTesisData] = useState(null);
  const [loadingTesis, setLoadingTesis] = useState(false);
  const [showRateModal, setShowRateModal] = useState(false);
  const [rateMatchData, setRateMatchData] = useState(null);

  useEffect(() => {
    if (!user) return;
    
    loadReservations();
    const cleanup = setupRealtimeListener();
    
    return () => {
      if (cleanup) cleanup();
    };
  }, [user]);

  const setupRealtimeListener = () => {
    if (!user) return;

    const reservationsQuery = query(
      collection(db, 'rezervasyonlar'),
      or(
        where('userId', '==', user.uid),
        where('playerIds', 'array-contains', user.uid)
      )
    );

    const unsubscribe = onSnapshot(reservationsQuery, (snapshot) => {
      const reservationsData = [];
      snapshot.forEach((doc) => {
        reservationsData.push({ id: doc.id, ...doc.data() });
      });
      
      // Client-side sıralama
      reservationsData.sort((a, b) => {
        const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
        const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
        return dateB - dateA;
      });
      
      setReservations(reservationsData);
      setLoading(false);
    }, (error) => {
      console.error('Rezervasyon listener hatası:', error);
      toast.error('Rezervasyon verileri güncellenirken hata oluştu');
      setLoading(false);
    });

    return () => unsubscribe();
  };

  const loadReservations = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await getPlayerReservations(user.uid);
      if (result.success) {
        setReservations(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error('Rezervasyonlar yükleme hatası:', err);
      setError('Veriler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetail = async (reservation) => {
    setSelectedReservation(reservation);
    setShowDetailModal(true);
    setLoadingInvoice(true);
    setLoadingTesis(true);
    setTesisData(null);
    setInvoice(null);
    
    try {
      const [invoiceResult, tesisResult] = await Promise.all([
        getInvoice(reservation.id, user.uid).catch(() => ({ success: false })),
        reservation.tesisId ? getTesis(reservation.tesisId).catch(() => ({ success: false })) : Promise.resolve({ success: false })
      ]);
      
      if (invoiceResult.success) {
        setInvoice(invoiceResult.data);
      }
      
      if (tesisResult.success) {
        setTesisData(tesisResult.data);
      }
    } catch (err) {
      console.error('Detay yükleme hatası:', err);
    } finally {
      setLoadingInvoice(false);
      setLoadingTesis(false);
    }
  };

  const handleCancel = async (reservationId) => {
    if (!confirm('Bu rezervasyonu iptal etmek istediğinize emin misiniz? İptal işleminde para iadesi yapılmayacaktır.')) return;
    
    try {
      const result = await cancelReservation(reservationId, user.uid);
      if (result.success) {
        toast.success('Rezervasyon başarıyla iptal edildi');
        setShowDetailModal(false);
      } else {
        toast.error(result.error || 'Rezervasyon iptal edilemedi');
      }
    } catch (err) {
      console.error('Rezervasyon iptal hatası:', err);
      toast.error('Rezervasyon iptal edilirken hata oluştu');
    }
  };

  const handleDownloadInvoice = () => {
    if (!invoice) return;
    
    // Basit PDF oluşturma (daha gelişmiş için jsPDF kullanılabilir)
    const invoiceContent = `
FATURA
Rezervasyon No: ${invoice.reservationNumber}
Tarih: ${invoice.date.toLocaleDateString('tr-TR')}
Saha: ${invoice.tesisName}
Adres: ${invoice.tesisAddress}
Saat: ${invoice.timeSlot}
Oyuncu Sayısı: ${invoice.playerCount}
Toplam Tutar: ₺${invoice.totalAmount.toLocaleString('tr-TR')}
Kişi Başı: ₺${invoice.amountPerPlayer.toLocaleString('tr-TR')}
Ödeme Yöntemi: ${invoice.paymentMethod}
Durum: ${getStatusText(invoice.status)}
    `.trim();
    
    const blob = new Blob([invoiceContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fatura-${invoice.reservationNumber}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('Fatura indirildi');
  };

  const filteredReservations = reservations.filter(reservation => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const tesisName = reservation.tesisName || '';
      if (!tesisName.toLowerCase().includes(searchLower)) {
        return false;
      }
    }

    if (statusFilter !== 'all' && reservation.status !== statusFilter) {
      return false;
    }

    return true;
  });

  const getReservationsForDate = (date) => {
    return filteredReservations.filter(res => {
      const resDate = res.date?.toDate ? res.date.toDate() : new Date(res.date);
      return resDate.toDateString() === date.toDateString();
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'pending_payment': return 'bg-orange-100 text-orange-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'confirmed': return 'Onaylandı';
      case 'pending': return 'Beklemede';
      case 'pending_payment': return 'Ödeme Bekliyor';
      case 'cancelled': return 'İptal';
      case 'completed': return 'Tamamlandı';
      default: return 'Bilinmiyor';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Tarih Yok';
    const date = dateString?.toDate ? dateString.toDate() : new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = dateString?.toDate ? dateString.toDate() : new Date(dateString);
    return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  };

  const canCancel = (reservation) => {
    if (reservation.status === 'cancelled' || reservation.status === 'completed') return false;
    const resDate = reservation.date?.toDate ? reservation.date.toDate() : new Date(reservation.date);
    return resDate > new Date();
  };

  const handleRateMatch = async (match) => {
    // Fetch participants details
    if (!match.players || match.players.length <= 1) { // Just self or empty
        toast.error("Değerlendirilecek oyuncu bulunamadı.");
        return;
    }
    
    // We assume loading state if needed for modal but for now just wait for data
    try {
        const result = await getUsersByIds(match.players);
        if (result.success) {
            setRateMatchData({
                ...match,
                participantsDetails: result.data
            });
            setShowRateModal(true);
        } else {
            toast.error("Oyuncu bilgileri alınamadı.");
        }
    } catch (error) {
        console.error("Rate fetch error", error);
        toast.error("Bir hata oluştu.");
    }
  };

  const isPastMatch = (match) => {
      const matchDate = match.date?.toDate ? match.date.toDate() : new Date(match.date);
      return matchDate < new Date();
  };

  const canRate = (match) => {
      // Check if past, not cancelled, and user not already rated
      // Note: match object needs to have 'ratedBy' updated from realtime listener
      return isPastMatch(match) && match.status !== 'cancelled' && (!match.ratedBy || !match.ratedBy.includes(user.uid));
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Rezervasyonlar yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Hata</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadReservations}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Tekrar Dene
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <OyuncuSidebar />

      <div className="flex-1 flex flex-col">
        {/* Header */}
        <DashboardHeader title="Rezervasyonlar">
           <div className="hidden sm:block text-sm text-gray-500 font-medium bg-gray-100 px-3 py-1 rounded-full">
              {filteredReservations.length} adet
           </div>
        </DashboardHeader>

        {/* Filters */}
        <div className="bg-white border-b px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Saha adı ile ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex-1 sm:flex-none px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none bg-white text-sm"
              >
                <option value="all">Tüm Durumlar</option>
                <option value="confirmed">Onaylandı</option>
                <option value="pending">Bekliyor</option>
                <option value="cancelled">İptal Edildi</option>
              </select>

              <div className="flex bg-gray-100 rounded-xl p-1">
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-green-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <List size={20} />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-green-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <Grid3X3 size={20} />
                </button>
                <button
                  onClick={() => setViewMode('calendar')}
                  className={`p-2 rounded-lg transition-all ${viewMode === 'calendar' ? 'bg-white shadow-sm text-green-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <CalendarDays size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
          <div className="mb-6 flex items-center gap-3 bg-blue-50 border border-blue-100 p-4 rounded-xl text-blue-800 text-sm shadow-sm">
            <Info size={20} className="text-blue-500 shrink-0" />
            <p className="font-medium">
              Saha değerlendirmelerini maç saatiniz geçtikten sonra ilgili sahanın detay sayfasından yapabilirsiniz. Keyifli maçlar!
            </p>
          </div>
          {viewMode === 'list' && (
            <div className="space-y-4">
              {/* Desktop Tabela Görünümü */}
              <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Saha</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tarih & Saat</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Oyuncu Sayısı</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tutar</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ödeme Durumu</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredReservations.length > 0 ? (
                      filteredReservations.map((reservation) => (
                        <tr key={reservation.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <MapPin className="w-4 h-4 text-gray-400 mr-2" />
                              {reservation.tesisName || 'Bilinmeyen Saha'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>{formatDate(reservation.date)}</div>
                            <div className="text-gray-500">{reservation.timeSlot}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <Users className="w-4 h-4 text-gray-400 mr-2" />
                              <div>
                                <div className="font-medium text-gray-900">{reservation.totalPlayers || 0} kişi</div>
                                {reservation.players && Array.isArray(reservation.players) && reservation.players.length > 0 && (
                                  <div className="text-xs text-gray-500">
                                    {reservation.players.filter(p => typeof p === 'object' && p?.name).length > 0 
                                      ? `${reservation.players.filter(p => typeof p === 'object' && p?.name).length} onaylı`
                                      : `${reservation.players.length} oyuncu`}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              ₺{(reservation.totalAmount || reservation.price || 0).toLocaleString('tr-TR')}
                            </div>
                            {reservation.totalPlayers > 0 && (reservation.totalAmount || reservation.price) && (
                              <div className="text-xs text-gray-500">
                                Kişi başı: ₺{Math.round((reservation.totalAmount || reservation.price) / reservation.totalPlayers).toLocaleString('tr-TR')}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
                              reservation.paymentStatus === 'completed' || reservation.paymentStatus === 'paid'
                                ? 'bg-green-100 text-green-800'
                                : reservation.paymentStatus === 'pending' || reservation.paymentStatus === 'partial_payment'
                                ? 'bg-yellow-100 text-yellow-800'
                                : reservation.paymentStatus === 'failed' || reservation.paymentStatus === 'cancelled'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {reservation.paymentStatus === 'completed' || reservation.paymentStatus === 'paid' ? 'Ödendi' :
                               reservation.paymentStatus === 'pending' ? 'Ödeme Bekliyor' :
                               reservation.paymentStatus === 'partial_payment' ? 'Kısmi Ödeme' :
                               reservation.paymentStatus === 'failed' ? 'Ödeme Başarısız' :
                               reservation.paymentStatus === 'cancelled' ? 'İptal' :
                               reservation.paymentMethod ? 'Ödeme Yapıldı' : 'Ödeme Bekliyor'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(reservation.status)}`}>
                              {getStatusText(reservation.status)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleViewDetail(reservation)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Detayları Gör"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              {canRate(reservation) && (
                                <button
                                  onClick={() => handleRateMatch(reservation)}
                                  className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                                  title="Değerlendir"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                              )}
                              {canCancel(reservation) && (
                                <button
                                  onClick={() => handleCancel(reservation.id)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="İptal Et"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                          <div className="flex flex-col items-center">
                            <Calendar className="w-12 h-12 text-gray-300 mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Rezervasyon Yok</h3>
                            <p className="text-gray-600">Rezervasyon bulunmuyor.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobil Kart Görünümü */}
              <div className="lg:hidden space-y-4">
                {filteredReservations.length > 0 ? (
                  filteredReservations.map((reservation) => (
                    <div 
                      key={reservation.id} 
                      className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col gap-4"
                      onClick={() => handleViewDetail(reservation)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-green-600">
                            <Calendar size={24} />
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-900">{reservation.tesisName || 'Bilinmeyen Saha'}</h3>
                            <div className="flex items-center text-xs text-gray-500 mt-0.5">
                              <Clock size={12} className="mr-1" />
                              {formatDate(reservation.date)} • {reservation.timeSlot}
                            </div>
                          </div>
                        </div>
                        <span className={`px-2 py-1 text-[10px] font-bold rounded-full uppercase ${getStatusColor(reservation.status)}`}>
                          {getStatusText(reservation.status)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 py-3 border-y border-gray-50">
                        <div className="flex items-center gap-2">
                          <Users size={16} className="text-gray-400" />
                          <span className="text-sm text-gray-700 font-medium">{reservation.totalPlayers || 0} Oyuncu</span>
                        </div>
                        <div className="flex items-center gap-2 justify-end">
                          <span className="text-sm font-bold text-gray-900">₺{(reservation.totalAmount || reservation.price || 0).toLocaleString('tr-TR')}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[10px] font-medium px-2 py-1 rounded-lg ${
                          reservation.paymentStatus === 'completed' || reservation.paymentStatus === 'paid'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {reservation.paymentStatus === 'completed' || reservation.paymentStatus === 'paid' ? 'Ödendi' : 'Ödeme Bekliyor'}
                        </span>
                        
                        <div className="flex gap-2">
                           <button
                            onClick={(e) => { e.stopPropagation(); handleViewDetail(reservation); }}
                            className="p-2 text-blue-600 bg-blue-50 rounded-xl"
                          >
                            <Eye size={20} />
                          </button>
                          {canRate(reservation) && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleRateMatch(reservation); }}
                              className="p-2 text-yellow-600 bg-yellow-50 rounded-xl"
                            >
                              <CheckCircle size={20} />
                            </button>
                          )}
                          {canCancel(reservation) && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleCancel(reservation.id); }}
                              className="p-2 text-red-600 bg-red-50 rounded-xl"
                            >
                              <Trash2 size={20} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-gray-200">
                    <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">Kayıtlı rezervasyon bulunamadı.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredReservations.length > 0 ? (
                filteredReservations.map((reservation) => (
                  <div 
                    key={reservation.id} 
                    className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleViewDetail(reservation)}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                        <Calendar className="w-6 h-6 text-white" />
                      </div>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(reservation.status)}`}>
                        {getStatusText(reservation.status)}
                      </span>
                    </div>
                    
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{reservation.tesisName || 'Bilinmeyen Saha'}</h3>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <Clock className="w-4 h-4 mr-2" />
                        <div>
                          <div className="font-medium text-gray-900">{formatDate(reservation.date)}</div>
                          <div className="text-xs text-gray-500">{reservation.timeSlot}</div>
                        </div>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Users className="w-4 h-4 mr-2" />
                        <div>
                          <span className="font-medium text-gray-900">{reservation.totalPlayers || 0} oyuncu</span>
                          {reservation.players && Array.isArray(reservation.players) && reservation.players.length > 0 && (
                            <span className="text-xs text-gray-500 ml-2">
                              ({reservation.players.filter(p => typeof p === 'object' && p?.status === 'confirmed').length || reservation.players.length} onaylı)
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <DollarSign className="w-4 h-4 mr-2" />
                        <div>
                          <div className="font-bold text-gray-900">₺{(reservation.totalAmount || reservation.price || 0).toLocaleString('tr-TR')}</div>
                          {reservation.totalPlayers > 0 && (reservation.totalAmount || reservation.price) && (
                            <div className="text-xs text-gray-500">Kişi başı: ₺{Math.round((reservation.totalAmount || reservation.price) / reservation.totalPlayers).toLocaleString('tr-TR')}</div>
                          )}
                        </div>
                      </div>
                      <div className="pt-2 border-t border-gray-200">
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
                          reservation.paymentStatus === 'completed' || reservation.paymentStatus === 'paid'
                            ? 'bg-green-100 text-green-800'
                            : reservation.paymentStatus === 'pending' || reservation.paymentStatus === 'partial_payment'
                            ? 'bg-yellow-100 text-yellow-800'
                            : reservation.paymentStatus === 'failed' || reservation.paymentStatus === 'cancelled'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          <CreditCard className="w-3 h-3 mr-1" />
                          {reservation.paymentStatus === 'completed' || reservation.paymentStatus === 'paid' ? 'Ödendi' :
                           reservation.paymentStatus === 'pending' ? 'Ödeme Bekliyor' :
                           reservation.paymentStatus === 'partial_payment' ? 'Kısmi Ödeme' :
                           reservation.paymentStatus === 'failed' ? 'Ödeme Başarısız' :
                           reservation.paymentStatus === 'cancelled' ? 'İptal' :
                           reservation.paymentMethod ? 'Ödeme Yapıldı' : 'Ödeme Bekliyor'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewDetail(reservation);
                        }}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                      >
                        Detaylar
                      </button>
                      
                      {canRate(reservation) && (
                          <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleRateMatch(reservation);
                            }}
                            className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors text-sm font-medium flex items-center gap-1"
                          >
                             <CheckCircle size={16} />
                             Değerlendir
                          </button>
                      )}

                      {canCancel(reservation) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCancel(reservation.id);
                          }}
                          className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium"
                        >
                          İptal
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                    <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Rezervasyon Yok</h3>
                    <p className="text-gray-600">Rezervasyon bulunmuyor.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {viewMode === 'calendar' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">Takvim Görünümü</h2>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        const prev = new Date(selectedDate);
                        prev.setMonth(prev.getMonth() - 1);
                        setSelectedDate(prev);
                      }}
                      className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Önceki
                    </button>
                    <span className="px-4 py-1 text-sm font-medium text-gray-700">
                      {selectedDate.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}
                    </span>
                    <button
                      onClick={() => {
                        const next = new Date(selectedDate);
                        next.setMonth(next.getMonth() + 1);
                        setSelectedDate(next);
                      }}
                      className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Sonraki
                    </button>
                    <button
                      onClick={() => setSelectedDate(new Date())}
                      className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Bugün
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-7 gap-2 mb-4">
                {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map(day => (
                  <div key={day} className="text-center text-sm font-medium text-gray-700 py-2">
                    {day}
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: 42 }, (_, i) => {
                  const date = new Date(selectedDate);
                  date.setDate(1);
                  const firstDay = date.getDay() === 0 ? 6 : date.getDay() - 1;
                  date.setDate(i - firstDay + 1);
                  
                  const dayReservations = getReservationsForDate(date);
                  const isCurrentMonth = date.getMonth() === selectedDate.getMonth();
                  const isToday = date.toDateString() === new Date().toDateString();
                  
                  return (
                    <div
                      key={i}
                      className={`min-h-24 p-2 border border-gray-200 rounded-lg ${
                        isCurrentMonth ? 'bg-white' : 'bg-gray-50'
                      } ${isToday ? 'ring-2 ring-green-500' : ''}`}
                    >
                      <div className={`text-sm font-medium mb-1 ${isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}`}>
                        {date.getDate()}
                      </div>
                      <div className="space-y-1">
                        {dayReservations.slice(0, 2).map(res => (
                          <div
                            key={res.id}
                            onClick={() => handleViewDetail(res)}
                            className="text-xs p-1 bg-green-100 text-green-800 rounded cursor-pointer hover:bg-green-200 truncate"
                            title={res.tesisName}
                          >
                            {res.timeSlot}
                          </div>
                        ))}
                        {dayReservations.length > 2 && (
                          <div className="text-xs text-gray-500">
                            +{dayReservations.length - 2} daha
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Detail Modal */}
        {showDetailModal && selectedReservation && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[95vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Rezervasyon Detayları</h2>
                  <p className="text-sm text-gray-600 mt-1">Rezervasyon No: {selectedReservation.id.slice(0, 8).toUpperCase()}</p>
                </div>
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    setSelectedReservation(null);
                    setInvoice(null);
                    setTesisData(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Rezervasyon Özeti - Üst Kart */}
                <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-sm">
                        <Calendar className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 font-medium">Tarih</p>
                        <p className="text-sm font-bold text-gray-900">{formatDate(selectedReservation.date)}</p>
                        <p className="text-xs text-gray-600">{selectedReservation.timeSlot}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-sm">
                        <Users className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 font-medium">Oyuncu Sayısı</p>
                        <p className="text-sm font-bold text-gray-900">{selectedReservation.totalPlayers || 0} kişi</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-sm">
                        <DollarSign className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 font-medium">Toplam Tutar</p>
                        <p className="text-sm font-bold text-gray-900">₺{(selectedReservation.totalAmount || selectedReservation.price || 0).toLocaleString('tr-TR')}</p>
                        {selectedReservation.totalPlayers > 0 && (selectedReservation.totalAmount || selectedReservation.price) && (
                          <p className="text-xs text-gray-600">Kişi başı: ₺{Math.round((selectedReservation.totalAmount || selectedReservation.price) / selectedReservation.totalPlayers).toLocaleString('tr-TR')}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between pt-4 border-t border-green-200">
                    <div>
                      <p className="text-xs text-gray-600 font-medium">Durum</p>
                      <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full mt-1 ${getStatusColor(selectedReservation.status)}`}>
                        {getStatusText(selectedReservation.status)}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 font-medium">Ödeme Durumu</p>
                      <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full mt-1 ${
                        selectedReservation.paymentStatus === 'completed' || selectedReservation.paymentStatus === 'paid'
                          ? 'bg-green-100 text-green-800'
                          : selectedReservation.paymentStatus === 'pending' || selectedReservation.paymentStatus === 'partial_payment'
                          ? 'bg-yellow-100 text-yellow-800'
                          : selectedReservation.paymentStatus === 'failed' || selectedReservation.paymentStatus === 'cancelled'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedReservation.paymentStatus === 'completed' || selectedReservation.paymentStatus === 'paid' ? 'Ödendi' :
                         selectedReservation.paymentStatus === 'pending' ? 'Ödeme Bekliyor' :
                         selectedReservation.paymentStatus === 'partial_payment' ? 'Kısmi Ödeme' :
                         selectedReservation.paymentStatus === 'failed' ? 'Ödeme Başarısız' :
                         selectedReservation.paymentStatus === 'cancelled' ? 'İptal' :
                         selectedReservation.paymentMethod ? 'Ödeme Yapıldı' : 'Ödeme Bekliyor'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Sol Kolon */}
                  <div className="space-y-6">
                    {/* Tesis Bilgileri */}
                    <div className="bg-white border border-gray-200 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <Building className="w-5 h-5 mr-2 text-green-600" />
                        Saha Bilgileri
                      </h3>
                      {loadingTesis ? (
                        <div className="text-center py-4">
                          <div className="w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-bold text-gray-900 text-lg mb-2">{selectedReservation.tesisName || tesisData?.name || 'Bilinmeyen Saha'}</h4>
                            {tesisData?.address || selectedReservation.tesisLocation ? (
                              <div className="flex items-start space-x-2 text-sm text-gray-600">
                                <MapPin className="w-4 h-4 mt-0.5 text-gray-400 flex-shrink-0" />
                                <span>{tesisData?.address || selectedReservation.tesisLocation}</span>
                              </div>
                            ) : null}
                          </div>
                          
                          <div className="grid grid-cols-1 gap-3 pt-3 border-t border-gray-200">
                            {tesisData?.phone && (
                              <div className="flex items-center space-x-2 text-sm">
                                <Phone className="w-4 h-4 text-gray-400" />
                                <a href={`tel:${tesisData.phone}`} className="text-green-600 hover:text-green-700 font-medium">
                                  {tesisData.phone}
                                </a>
                              </div>
                            )}
                            {tesisData?.email && (
                              <div className="flex items-center space-x-2 text-sm">
                                <Mail className="w-4 h-4 text-gray-400" />
                                <a href={`mailto:${tesisData.email}`} className="text-green-600 hover:text-green-700 font-medium">
                                  {tesisData.email}
                                </a>
                              </div>
                            )}
                            {tesisData?.capacity && (
                              <div className="flex items-center space-x-2 text-sm text-gray-600">
                                <Users className="w-4 h-4 text-gray-400" />
                                <span>Kapasite: {tesisData.capacity} kişi</span>
                              </div>
                            )}
                            {(tesisData?.address || selectedReservation.tesisLocation) && (
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(tesisData?.address || selectedReservation.tesisLocation || '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center space-x-2 text-sm text-green-600 hover:text-green-700 font-medium"
                              >
                                <Navigation className="w-4 h-4" />
                                <span>Haritada Görüntüle</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Oyuncu Listesi */}
                    {selectedReservation.players && Array.isArray(selectedReservation.players) && selectedReservation.players.length > 0 && (
                      <div className="bg-white border border-gray-200 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                          <Users className="w-5 h-5 mr-2 text-green-600" />
                          Oyuncu Listesi ({selectedReservation.players.length} kişi)
                        </h3>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {selectedReservation.players.map((player, index) => {
                            const playerName = typeof player === 'object' ? player?.name : `Oyuncu ${index + 1}`;
                            const playerPhone = typeof player === 'object' ? player?.phone : null;
                            const playerStatus = typeof player === 'object' ? player?.status : 'confirmed';
                            const paymentStatus = typeof player === 'object' ? player?.paymentStatus : null;
                            const isCurrentUser = typeof player === 'object' && player?.id === user?.uid;
                            
                            return (
                              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center space-x-3 flex-1">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                    isCurrentUser ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                                  }`}>
                                    <User className="w-4 h-4" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-medium ${isCurrentUser ? 'text-green-700' : 'text-gray-900'}`}>
                                      {playerName} {isCurrentUser && '(Sen)'}
                                    </p>
                                    {playerPhone && (
                                      <p className="text-xs text-gray-500">{playerPhone}</p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  {paymentStatus && (
                                    <span className={`text-xs px-2 py-1 rounded-full ${
                                      paymentStatus === 'paid' || paymentStatus === 'completed'
                                        ? 'bg-green-100 text-green-700'
                                        : paymentStatus === 'pending'
                                        ? 'bg-yellow-100 text-yellow-700'
                                        : 'bg-gray-100 text-gray-700'
                                    }`}>
                                      {paymentStatus === 'paid' || paymentStatus === 'completed' ? 'Ödendi' : 'Bekliyor'}
                                    </span>
                                  )}
                                  {playerStatus && (
                                    <span className={`text-xs px-2 py-1 rounded-full ${
                                      playerStatus === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                                    }`}>
                                      {playerStatus === 'confirmed' ? 'Onaylı' : playerStatus}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Sağ Kolon */}
                  <div className="space-y-6">
                    {/* Ödeme Detayları */}
                    <div className="bg-white border border-gray-200 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <CreditCard className="w-5 h-5 mr-2 text-green-600" />
                        Ödeme Detayları
                      </h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center py-2 border-b border-gray-200">
                          <span className="text-sm text-gray-600">Toplam Tutar</span>
                          <span className="text-lg font-bold text-gray-900">₺{(selectedReservation.totalAmount || selectedReservation.price || 0).toLocaleString('tr-TR')}</span>
                        </div>
                        {selectedReservation.totalPlayers > 0 && (selectedReservation.totalAmount || selectedReservation.price) && (
                          <div className="flex justify-between items-center py-2 border-b border-gray-200">
                            <span className="text-sm text-gray-600">Kişi Başı</span>
                            <span className="text-sm font-medium text-gray-900">₺{Math.round((selectedReservation.totalAmount || selectedReservation.price) / selectedReservation.totalPlayers).toLocaleString('tr-TR')}</span>
                          </div>
                        )}
                        {selectedReservation.paymentMethod && (
                          <div className="flex justify-between items-center py-2 border-b border-gray-200">
                            <span className="text-sm text-gray-600">Ödeme Yöntemi</span>
                            <span className="text-sm font-medium text-gray-900">
                              {selectedReservation.paymentMethod === 'kredi-karti' ? 'Kredi Kartı' :
                               selectedReservation.paymentMethod === 'banka-karti' ? 'Banka Kartı' :
                               selectedReservation.paymentMethod === 'havale' ? 'Havale/EFT' :
                               selectedReservation.paymentMethod === 'nakit' ? 'Nakit' :
                               selectedReservation.paymentMethod}
                            </span>
                          </div>
                        )}
                        {selectedReservation.userCommission && (
                          <div className="flex justify-between items-center py-2 border-b border-gray-200">
                            <span className="text-sm text-gray-600">Platform Komisyonu</span>
                            <span className="text-sm font-medium text-gray-900">₺{selectedReservation.userCommission.toLocaleString('tr-TR')}</span>
                          </div>
                        )}
                        {selectedReservation.splitPaymentEnabled && selectedReservation.splitPaymentData && (
                          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <p className="text-xs font-semibold text-blue-900 mb-2">Bölünen Ödeme</p>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-blue-700">Organizatör Ödemesi:</span>
                                <span className="font-medium text-blue-900">₺{(selectedReservation.splitPaymentData?.organizerAmount || 0).toLocaleString('tr-TR')}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-blue-700">Oyuncu Ödemeleri:</span>
                                <span className="font-medium text-blue-900">₺{(selectedReservation.splitPaymentData?.playerAmount || 0).toLocaleString('tr-TR')}</span>
                              </div>
                            </div>
                          </div>
                        )}
                        {selectedReservation.createdAt && (
                          <div className="pt-3 mt-3 border-t border-gray-200">
                            <p className="text-xs text-gray-500">
                              Oluşturulma: {selectedReservation.createdAt?.toDate 
                                ? selectedReservation.createdAt.toDate().toLocaleDateString('tr-TR', { 
                                    day: 'numeric', 
                                    month: 'long', 
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })
                                : new Date(selectedReservation.createdAt).toLocaleDateString('tr-TR')}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Rezervasyon QR Kodu */}
                    <div className="bg-white border border-gray-200 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <QrCode className="w-5 h-5 mr-2 text-green-600" />
                        Rezervasyon Kodu
                      </h3>
                      <div className="bg-gray-50 rounded-lg p-6 flex flex-col items-center justify-center">
                        <div className="w-48 h-48 bg-white rounded-lg border-2 border-gray-300 flex items-center justify-center mb-4">
                          <div className="text-center">
                            <QrCode className="w-24 h-24 mx-auto text-gray-400 mb-2" />
                            <p className="text-xs text-gray-500 font-mono">{selectedReservation.id.slice(0, 8).toUpperCase()}</p>
                          </div>
                        </div>
                        <p className="text-xs text-gray-600 text-center">
                          Bu kodu sahaya geldiğinizde gösterin
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Fatura Bilgileri */}
                {loadingInvoice ? (
                  <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <div className="text-center py-4">
                      <div className="w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                      <p className="text-sm text-gray-600 mt-2">Fatura bilgileri yükleniyor...</p>
                    </div>
                  </div>
                ) : invoice ? (
                  <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <Receipt className="w-5 h-5 mr-2 text-green-600" />
                      Fatura Bilgileri
                    </h3>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Fatura No</p>
                          <p className="text-sm font-medium text-gray-900">{invoice.reservationNumber || selectedReservation.id.slice(0, 8).toUpperCase()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Fatura Tarihi</p>
                          <p className="text-sm font-medium text-gray-900">{invoice.date?.toDate ? invoice.date.toDate().toLocaleDateString('tr-TR') : invoice.date?.toLocaleDateString('tr-TR') || formatDate(selectedReservation.createdAt)}</p>
                        </div>
                        {invoice.amountPerPlayer && (
                          <div>
                            <p className="text-xs text-gray-600 mb-1">Kişi Başı Tutar</p>
                            <p className="text-sm font-medium text-gray-900">₺{invoice.amountPerPlayer.toLocaleString('tr-TR')}</p>
                          </div>
                        )}
                        {invoice.paymentMethod && (
                          <div>
                            <p className="text-xs text-gray-600 mb-1">Ödeme Yöntemi</p>
                            <p className="text-sm font-medium text-gray-900">{invoice.paymentMethod}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={handleDownloadInvoice}
                      className="mt-4 w-full flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      <span>Fatura İndir</span>
                    </button>
                  </div>
                ) : null}

                {/* İşlemler */}
                <div className="flex items-center space-x-3 pt-4 border-t border-gray-200 bg-gray-50 -mx-6 px-6 py-4">
                  {canRate(selectedReservation) && (
                    <button
                      onClick={() => handleRateMatch(selectedReservation)}
                      className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Oyuncuları Değerlendir</span>
                    </button>
                  )}
                  {canCancel(selectedReservation) && (
                    <button
                      onClick={() => handleCancel(selectedReservation.id)}
                      className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Rezervasyonu İptal Et</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      setSelectedReservation(null);
                      setInvoice(null);
                      setTesisData(null);
                    }}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Kapat
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Rate Players Modal */}
      <RatePlayersModal
        isOpen={showRateModal}
        onClose={() => setShowRateModal(false)}
        match={rateMatchData}
        currentUser={user}
      />
    </div>
  );
};

export default Rezervasyonlar;
