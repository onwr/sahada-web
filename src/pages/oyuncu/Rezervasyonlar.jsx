import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getPlayerReservations, cancelReservation, getInvoice, getTesis, getUsersByIds } from '../../services/firestoreService';
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
  X,
  Eye,
  Trash2,
  DollarSign,
  Info,
} from 'lucide-react';
import toast from '../../utils/toast';
import RatePlayersModal from '../../components/RatePlayersModal';
import { motion, AnimatePresence } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 24
    }
  }
};

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

  const filteredReservations = reservations.filter(reservation => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const tesisName = reservation.tesisName || '';
      if (!tesisName.toLowerCase().includes(searchLower)) return false;
    }
    if (statusFilter !== 'all' && reservation.status !== statusFilter) return false;
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
    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const canCancel = (reservation) => {
    if (reservation.status === 'cancelled' || reservation.status === 'completed') return false;
    const resDate = reservation.date?.toDate ? reservation.date.toDate() : new Date(reservation.date);
    return resDate > new Date();
  };

  const handleRateMatch = async (match) => {
    if (!match.players || match.players.length <= 1) {
        toast.error("Değerlendirilecek oyuncu bulunamadı.");
        return;
    }
    try {
        const result = await getUsersByIds(match.players);
        if (result.success) {
            setRateMatchData({ ...match, participantsDetails: result.data });
            setShowRateModal(true);
        } else {
            toast.error("Oyuncu bilgileri alınamadı.");
        }
    } catch (error) {
        toast.error("Bir hata oluştu.");
    }
  };

  const canRate = (match) => {
      const matchDate = match.date?.toDate ? match.date.toDate() : new Date(match.date);
      return matchDate < new Date() && match.status !== 'cancelled' && (!match.ratedBy || !match.ratedBy.includes(user.uid));
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
          <button onClick={loadReservations} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Tekrar Dene</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <OyuncuSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <DashboardHeader title="Rezervasyonlar">
           <div className="hidden sm:block text-sm text-gray-500 font-medium bg-gray-100 px-3 py-1 rounded-full">
              {filteredReservations.length} adet
           </div>
        </DashboardHeader>

        <div className="bg-white border-b px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Saha adı ile ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all"
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none bg-white text-sm"
              >
                <option value="all">Tüm Durumlar</option>
                <option value="confirmed">Onaylandı</option>
                <option value="pending">Bekliyor</option>
                <option value="cancelled">İptal Edildi</option>
              </select>
              <div className="flex bg-gray-100 rounded-xl p-1">
                {[
                  { mode: 'list', icon: List },
                  { mode: 'grid', icon: Grid3X3 },
                  { mode: 'calendar', icon: CalendarDays }
                ].map(item => (
                  <button
                    key={item.mode}
                    onClick={() => setViewMode(item.mode)}
                    className={`p-2 rounded-lg transition-all ${viewMode === item.mode ? 'bg-white shadow-sm text-green-600' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    <item.icon size={20} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={viewMode + searchTerm + statusFilter}
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
            >
              <div className="mb-6 flex items-center gap-3 bg-blue-50 border border-blue-100 p-4 rounded-xl text-blue-800 text-sm shadow-sm">
                <Info size={20} className="text-blue-500 shrink-0" />
                <p className="font-medium">Saha değerlendirmelerini maç saatiniz geçtikten sonra ilgili sahanın detay sayfasından yapabilirsiniz.</p>
              </div>

              {viewMode === 'list' && (
                <div className="space-y-4">
                  <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50 uppercase text-xs font-medium text-gray-500">
                        <tr>
                          <th className="px-6 py-3 text-left">Saha</th>
                          <th className="px-6 py-3 text-left">Tarih & Saat</th>
                          <th className="px-6 py-3 text-left">Oyuncular</th>
                          <th className="px-6 py-3 text-left">Tutar</th>
                          <th className="px-6 py-3 text-left">Ödeme</th>
                          <th className="px-6 py-3 text-left">Durum</th>
                          <th className="px-6 py-3 text-left">İşlemler</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {filteredReservations.map(res => (
                          <motion.tr key={res.id} variants={itemVariants} className="hover:bg-gray-50">
                            <td className="px-6 py-4 flex items-center gap-2"><MapPin size={16} /> {res.tesisName}</td>
                            <td className="px-6 py-4 text-sm font-medium">{formatDate(res.date)} <div className="text-gray-500 font-normal">{res.timeSlot}</div></td>
                            <td className="px-6 py-4">{res.totalPlayers} Oyuncu</td>
                            <td className="px-6 py-4 font-bold">₺{res.totalAmount || res.price}</td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 text-xs font-bold rounded-full ${res.paymentStatus === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                {res.paymentStatus === 'completed' ? 'Ödendi' : 'Bekliyor'}
                              </span>
                            </td>
                            <td className="px-6 py-4"><span className={`px-2 py-1 text-xs font-bold rounded-full ${getStatusColor(res.status)}`}>{getStatusText(res.status)}</span></td>
                            <td className="px-6 py-4 flex gap-2">
                              <button onClick={() => handleViewDetail(res)} className="p-2 text-blue-600 bg-blue-50 rounded-lg"><Eye size={16} /></button>
                              {canRate(res) && <button onClick={() => handleRateMatch(res)} className="p-2 text-yellow-600 bg-yellow-50 rounded-lg"><CheckCircle size={16} /></button>}
                              {canCancel(res) && <button onClick={() => handleCancel(res.id)} className="p-2 text-red-600 bg-red-50 rounded-lg"><Trash2 size={16} /></button>}
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="lg:hidden space-y-4">
                    {filteredReservations.map(res => (
                      <motion.div key={res.id} variants={itemVariants} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100" onClick={() => handleViewDetail(res)}>
                        <div className="flex justify-between items-start mb-3">
                           <div className="flex items-center gap-3">
                             <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center text-green-600"><Calendar size={20} /></div>
                             <div><h3 className="font-bold text-gray-900">{res.tesisName}</h3><p className="text-xs text-gray-500">{formatDate(res.date)}</p></div>
                           </div>
                           <span className={`px-2 py-1 text-[10px] font-bold rounded-full ${getStatusColor(res.status)}`}>{getStatusText(res.status)}</span>
                        </div>
                        <div className="flex justify-between border-t pt-3">
                           <span className="text-sm font-bold">₺{res.totalAmount || res.price}</span>
                           <div className="flex gap-2">
                              <button onClick={(e) => { e.stopPropagation(); handleViewDetail(res); }} className="text-blue-600"><Eye size={18} /></button>
                              {canCancel(res) && <button onClick={(e) => { e.stopPropagation(); handleCancel(res.id); }} className="text-red-600"><Trash2 size={18} /></button>}
                           </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {viewMode === 'grid' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredReservations.map(res => (
                    <motion.div key={res.id} variants={itemVariants} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleViewDetail(res)}>
                      <div className="flex justify-between items-start mb-4">
                        <div className="w-12 h-12 bg-green-600 text-white rounded-xl flex items-center justify-center"><Calendar size={24} /></div>
                        <span className={`px-2 py-1 text-xs font-bold rounded-full ${getStatusColor(res.status)}`}>{getStatusText(res.status)}</span>
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">{res.tesisName}</h3>
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-center gap-2"><Clock size={16} /> <span>{formatDate(res.date)} • {res.timeSlot}</span></div>
                        <div className="flex items-center gap-2"><Users size={16} /> <span>{res.totalPlayers} Oyuncu</span></div>
                        <div className="flex items-center gap-2 font-bold text-gray-900"><DollarSign size={16} /> ₺{res.totalAmount || res.price}</div>
                      </div>
                      <div className="mt-4 pt-4 border-t flex gap-2">
                        <button onClick={(e) => { e.stopPropagation(); handleViewDetail(res); }} className="flex-1 py-2 bg-green-600 text-white rounded-lg font-bold text-sm">Detaylar</button>
                        {canCancel(res) && <button onClick={(e) => { e.stopPropagation(); handleCancel(res.id); }} className="px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50"><Trash2 size={16} /></button>}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {viewMode === 'calendar' && (
                <motion.div variants={itemVariants} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900">Takvim Görünümü</h2>
                    <div className="flex items-center gap-2">
                      <button onClick={() => { const d = new Date(selectedDate); d.setMonth(d.getMonth() - 1); setSelectedDate(d); }} className="p-2 border rounded-lg"><ChevronLeft size={20} /></button>
                      <span className="font-bold min-w-[120px] text-center">{selectedDate.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}</span>
                      <button onClick={() => { const d = new Date(selectedDate); d.setMonth(d.getMonth() + 1); setSelectedDate(d); }} className="p-2 border rounded-lg"><ChevronRight size={20} /></button>
                      <button onClick={() => setSelectedDate(new Date())} className="px-4 py-2 bg-green-600 text-white rounded-lg font-bold">Bugün</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-7 gap-2 mb-2">
                    {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map(h => <div key={h} className="text-center text-xs font-bold text-gray-400 py-2 uppercase">{h}</div>)}
                  </div>
                  <div className="grid grid-cols-7 gap-2">
                    {Array.from({ length: 42 }, (_, i) => {
                      const d = new Date(selectedDate);
                      d.setDate(1);
                      const start = d.getDay() === 0 ? 6 : d.getDay() - 1;
                      d.setDate(i - start + 1);
                      const isCurrent = d.getMonth() === selectedDate.getMonth();
                      const dayRes = getReservationsForDate(d);
                      const isToday = d.toDateString() === new Date().toDateString();

                      return (
                        <div key={i} className={`min-h-24 p-2 border border-gray-100 rounded-xl ${isCurrent ? 'bg-white' : 'bg-gray-50/50'} ${isToday ? 'ring-2 ring-green-600' : ''}`}>
                          <div className={`text-sm font-bold mb-1 ${isCurrent ? 'text-gray-900' : 'text-gray-400'}`}>{d.getDate()}</div>
                          <div className="space-y-1">
                             {dayRes.slice(0, 2).map(r => (
                               <div key={r.id} onClick={() => handleViewDetail(r)} className="text-[10px] p-1 bg-green-50 text-green-700 rounded-md truncate cursor-pointer font-bold border border-green-100">{r.timeSlot}</div>
                             ))}
                             {dayRes.length > 2 && <div className="text-[10px] text-gray-400 text-center">+{dayRes.length - 2} daha</div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
              {filteredReservations.length === 0 && (
                <div className="py-20 text-center">
                  <Calendar className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">Rezervasyon bulunamadı.</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {showDetailModal && selectedReservation && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b flex items-center justify-between bg-gray-50">
                <h2 className="text-xl font-bold">Rezervasyon Detayı</h2>
                <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X size={20} /></button>
              </div>
              <div className="p-6 overflow-y-auto space-y-6">
                <div className="flex items-center gap-4 bg-green-50 p-4 rounded-xl border border-green-100">
                  <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center shadow-sm text-green-600"><Calendar size={32} /></div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{selectedReservation.tesisName}</h3>
                    <p className="text-sm text-gray-600">{formatDate(selectedReservation.date)} • {selectedReservation.timeSlot}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-500 font-bold uppercase mb-1">Durum</p>
                    <span className={`px-2 py-1 text-xs font-bold rounded-full ${getStatusColor(selectedReservation.status)}`}>{getStatusText(selectedReservation.status)}</span>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-500 font-bold uppercase mb-1">Ödeme</p>
                    <span className="text-sm font-bold text-gray-900">₺{selectedReservation.totalAmount || selectedReservation.price}</span>
                  </div>
                </div>
                <div>
                   <h4 className="font-bold mb-3 flex items-center gap-2"><Users size={18} /> Oyuncular ({selectedReservation.totalPlayers})</h4>
                   <div className="grid grid-cols-2 gap-2">
                      {selectedReservation.players?.map((p, idx) => (
                        <div key={idx} className="p-2 border rounded-lg text-sm font-medium bg-white flex items-center gap-2">
                           <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-[10px]">{typeof p === 'object' ? p.name?.slice(0, 1) : 'O'}</div>
                           {typeof p === 'object' ? p.name : 'Oyuncu'}
                        </div>
                      ))}
                   </div>
                </div>
              </div>
              <div className="px-6 py-4 border-t bg-gray-50 flex gap-3">
                 <button onClick={() => setShowDetailModal(false)} className="flex-1 py-3 border border-gray-300 rounded-xl font-bold hover:bg-white transition-all">Kapat</button>
                 {canCancel(selectedReservation) && (
                   <button onClick={() => handleCancel(selectedReservation.id)} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-100">İptal Et</button>
                 )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <RatePlayersModal 
         isOpen={showRateModal} 
         onClose={() => setShowRateModal(false)} 
         matchData={rateMatchData} 
      />
    </div>
  );
};

export default Rezervasyonlar;
