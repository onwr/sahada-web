import React, { useState, useEffect } from 'react';
import { getPlatformStats, getAllReservations, getPlatformSettings, getAllWithdrawalRequests, updateWithdrawalRequestStatus, logAdminAction } from '../../services/firestoreService';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, onSnapshot, orderBy, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import AdminSidebar from '../../components/AdminSidebar';
import { DollarSign, TrendingUp, TrendingDown, AlertCircle, Download, BarChart3, CreditCard, CheckCircle, XCircle, Eye, Clock } from 'lucide-react';
import { exportToCSV, exportToExcel, exportToPDF } from '../../utils/exportUtils';
import toast from '../../utils/toast';

const Finansal = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [platformSettings, setPlatformSettings] = useState(null);
  const [timeRange, setTimeRange] = useState('month');
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [withdrawalRequests, setWithdrawalRequests] = useState([]);
  const [withdrawalFilter, setWithdrawalFilter] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [adminNote, setAdminNote] = useState('');
  const [processingRequest, setProcessingRequest] = useState(false);

  useEffect(() => {
    loadFinancialData();
  }, [timeRange]);

  useEffect(() => {
    if (activeTab === 'withdrawals') {
      loadWithdrawalRequests();
      const unsubscribe = setupWithdrawalListener();
      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, [activeTab, withdrawalFilter]);

  const loadFinancialData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsResult, reservationsResult, settingsResult] = await Promise.all([
        getPlatformStats(),
        getAllReservations(),
        getPlatformSettings()
      ]);
      
      if (statsResult.success) {
        setStats(statsResult.data);
      }
      
      if (reservationsResult.success) {
        setReservations(reservationsResult.data);
      }

      if (settingsResult.success) {
        setPlatformSettings(settingsResult.data);
      }
    } catch (err) {
      setError('Finansal veriler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const calculateCommission = (amount) => {
    const commissionRate = platformSettings?.commissionRate || 10;
    return (amount * commissionRate) / 100;
  };

  const getFilteredReservations = () => {
    const now = new Date();
    const filtered = reservations.filter(r => r.status === 'confirmed' || r.status === 'completed');
    
    if (timeRange === 'today') {
      return filtered.filter(r => {
        const resDate = new Date(r.date);
        return resDate.toDateString() === now.toDateString();
      });
    } else if (timeRange === 'week') {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return filtered.filter(r => {
        const resDate = new Date(r.date);
        return resDate >= weekAgo;
      });
    } else if (timeRange === 'month') {
      const monthAgo = new Date(now);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return filtered.filter(r => {
        const resDate = new Date(r.date);
        return resDate >= monthAgo;
      });
    }
    return filtered;
  };

  const filteredReservations = getFilteredReservations();
  const totalRevenue = filteredReservations.reduce((sum, r) => sum + (r.totalAmount || r.price || 0), 0);
  const totalCommission = filteredReservations.reduce((sum, r) => sum + calculateCommission(r.totalAmount || r.price || 0), 0);
  const netRevenue = totalRevenue - totalCommission;

  const loadWithdrawalRequests = async () => {
    try {
      const filters = withdrawalFilter !== 'all' ? { status: withdrawalFilter } : {};
      const result = await getAllWithdrawalRequests(filters);
      if (result.success) {
        setWithdrawalRequests(result.data);
      }
    } catch (err) {
      console.error('Çekim talepleri yükleme hatası:', err);
    }
  };

  const setupWithdrawalListener = () => {
    let q = query(
      collection(db, 'withdrawalRequests'),
      orderBy('createdAt', 'desc')
    );

    if (withdrawalFilter !== 'all') {
      q = query(q, where('status', '==', withdrawalFilter));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const requests = [];
      snapshot.forEach((doc) => {
        requests.push({ id: doc.id, ...doc.data() });
      });
      setWithdrawalRequests(requests);
    });

    return unsubscribe;
  };

  const handleWithdrawalStatusUpdate = async (requestId, status) => {
    if (!user?.uid) {
      toast.error('Kullanıcı bilgisi bulunamadı');
      return;
    }

    setProcessingRequest(true);
    try {
      const result = await updateWithdrawalRequestStatus(requestId, status, user.uid, adminNote);
      
      if (result.success) {
        await logAdminAction(user.uid, `withdrawal_${status}`, {
          requestId,
          status
        });
        
        toast.success(`Çekim talebi ${status === 'approved' ? 'onaylandı' : 'reddedildi'}`);
        setSelectedRequest(null);
        setAdminNote('');
        loadWithdrawalRequests();
      } else {
        toast.error(result.error || 'İşlem başarısız');
      }
    } catch (err) {
      console.error('Çekim talebi güncelleme hatası:', err);
      toast.error('İşlem sırasında hata oluştu');
    } finally {
      setProcessingRequest(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'approved':
        return 'Onaylandı';
      case 'rejected':
        return 'Reddedildi';
      case 'pending':
        return 'Beklemede';
      default:
        return 'Bilinmiyor';
    }
  };

  const handleExport = (format) => {
    const headers = ['Tesis', 'Tarih', 'Tutar', 'Komisyon', 'Net Gelir'];
    const rows = filteredReservations.map(r => {
      const commission = calculateCommission(r.totalAmount || r.price || 0);
      const net = (r.totalAmount || r.price || 0) - commission;
      return [
        r.tesisName || 'Saha',
        new Date(r.date).toLocaleDateString('tr-TR'),
        r.totalAmount || r.price || 0,
        Math.round(commission),
        Math.round(net)
      ];
    });
    
    if (format === 'csv') {
      exportToCSV(rows, headers, 'finansal_rapor');
    } else if (format === 'excel') {
      exportToExcel(rows, headers, 'finansal_rapor');
    } else if (format === 'pdf') {
      exportToPDF(rows, headers, 'Finansal Rapor', 'finansal_rapor');
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar />
      <div className="flex-1 flex flex-col">
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Finansal Yönetim</h1>
              <p className="text-gray-500 text-sm mt-0.5">Platform finansal özeti ve çekim talepleri</p>
            </div>
            <div className="flex items-center space-x-3">
              {activeTab === 'overview' && (
                <>
                  <select
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value)}
                    className="px-4 py-2 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white shadow-sm font-medium text-gray-700 transition-all duration-150"
                  >
                    <option value="today">Bugün</option>
                    <option value="week">Bu Hafta</option>
                    <option value="month">Bu Ay</option>
                    <option value="all">Tüm Zamanlar</option>
                  </select>
                  <div className="relative group">
                    <button className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 font-semibold shadow-lg hover:shadow-xl transition-all duration-200">
                      <Download className="w-5 h-5" />
                      <span>Rapor İndir</span>
                    </button>
                    <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-2xl border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 overflow-hidden">
                      <button
                        onClick={() => handleExport('csv')}
                        className="w-full text-left px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-white transition-colors duration-150"
                      >
                        📄 CSV olarak indir
                      </button>
                      <button
                        onClick={() => handleExport('excel')}
                        className="w-full text-left px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-white transition-colors duration-150 border-t border-gray-100"
                      >
                        📊 Excel olarak indir
                      </button>
                      <button
                        onClick={() => handleExport('pdf')}
                        className="w-full text-left px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-white transition-colors duration-150 border-t border-gray-100"
                      >
                        📑 PDF olarak indir
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>
        <div className="flex-1 p-6 overflow-y-auto bg-gray-50">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
              <AlertCircle className="w-5 h-5 mr-2" />
              {error}
            </div>
          )}

          {/* Tabs */}
          <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-1">
            <div className="flex space-x-1">
              <button
                onClick={() => setActiveTab('overview')}
                className={`flex-1 px-4 py-2.5 rounded-lg font-semibold transition-all duration-200 ${
                  activeTab === 'overview'
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                Özet
              </button>
              <button
                onClick={() => setActiveTab('withdrawals')}
                className={`flex-1 px-4 py-2.5 rounded-lg font-semibold transition-all duration-200 relative ${
                  activeTab === 'withdrawals'
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                Çekim Talepleri
                {withdrawalRequests.filter(r => r.status === 'pending').length > 0 && (
                  <span className="absolute top-1 right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {withdrawalRequests.filter(r => r.status === 'pending').length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {activeTab === 'overview' && stats && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <p className="text-sm font-medium text-gray-600">TOPLAM GELİR</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">₺{Math.round(totalRevenue).toLocaleString()}</p>
                  <div className="flex items-center mt-2">
                    <DollarSign className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-green-600 ml-1">{filteredReservations.length} rezervasyon</span>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <p className="text-sm font-medium text-gray-600">PLATFORM KOMİSYONU</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">₺{Math.round(totalCommission).toLocaleString()}</p>
                  <div className="flex items-center mt-2">
                    <BarChart3 className="w-4 h-4 text-blue-500" />
                    <span className="text-sm text-blue-600 ml-1">%{platformSettings?.commissionRate || 10} komisyon</span>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <p className="text-sm font-medium text-gray-600">NET GELİR</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">₺{Math.round(netRevenue).toLocaleString()}</p>
                  <div className="flex items-center mt-2">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-green-600 ml-1">Platform geliri</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <p className="text-sm font-medium text-gray-600 mb-4">GMV ÖZETİ</p>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Toplam GMV:</span>
                      <span className="font-semibold">₺{Math.round(stats.gmv.total).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Haftalık GMV:</span>
                      <span className="font-semibold">₺{Math.round(stats.gmv.weekly).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Aylık GMV:</span>
                      <span className="font-semibold">₺{Math.round(stats.gmv.monthly).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <p className="text-sm font-medium text-gray-600 mb-4">PERFORMANS METRİKLERİ</p>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Conversion Rate:</span>
                      <span className="font-semibold">{stats.conversionRate.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Ortalama Sepet:</span>
                      <span className="font-semibold">₺{Math.round(stats.avgBasketValue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">İptal Oranı:</span>
                      <span className="font-semibold">{stats.cancellationRate.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="p-6 border-b border-gray-100">
                  <h2 className="text-xl font-bold text-gray-900">Rezervasyon Detayları</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tesis</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tarih</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tutar</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Komisyon</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredReservations.slice(0, 10).map((reservation) => (
                        <tr key={reservation.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {reservation.tesisName || 'Saha'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(reservation.date).toLocaleDateString('tr-TR')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            ₺{reservation.totalAmount || reservation.price || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ₺{Math.round(calculateCommission(reservation.totalAmount || reservation.price || 0))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {activeTab === 'withdrawals' && (
            <div>
              {/* Filtre */}
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <select
                    value={withdrawalFilter}
                    onChange={(e) => setWithdrawalFilter(e.target.value)}
                    className="px-4 py-2.5 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white shadow-sm font-medium text-gray-700 transition-all duration-150"
                  >
                    <option value="all">Tümü</option>
                    <option value="pending">Bekleyen</option>
                    <option value="approved">Onaylanan</option>
                    <option value="rejected">Reddedilen</option>
                  </select>
                  <div className="text-sm text-gray-600">
                    <span className="font-semibold">{withdrawalRequests.length}</span> talep bulundu
                  </div>
                </div>
              </div>

              {/* Çekim Talepleri Tablosu */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Saha Sahibi</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Ad Soyad</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">IBAN</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Miktar</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Tarih</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Durum</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {withdrawalRequests.length > 0 ? (
                        withdrawalRequests.map((request, index) => (
                          <tr key={request.id} className={`transition-all duration-150 hover:bg-gradient-to-r hover:from-gray-50 hover:to-white ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                            <td className="px-6 py-5 whitespace-nowrap">
                              <div className="text-sm font-semibold text-gray-900">{request.ownerName || 'Bilinmiyor'}</div>
                              <div className="text-xs text-gray-500 mt-0.5">{request.ownerEmail || ''}</div>
                            </td>
                            <td className="px-6 py-5 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{request.fullName || '-'}</div>
                            </td>
                            <td className="px-6 py-5 whitespace-nowrap">
                              <div className="text-sm font-mono text-gray-700">{request.iban || '-'}</div>
                            </td>
                            <td className="px-6 py-5 whitespace-nowrap">
                              <div className="text-sm font-bold text-gray-900">₺{request.amount?.toLocaleString() || 0}</div>
                            </td>
                            <td className="px-6 py-5 whitespace-nowrap">
                              <div className="text-sm text-gray-700">
                                {request.createdAt?.toDate?.()?.toLocaleDateString('tr-TR') || '-'}
                              </div>
                              <div className="text-xs text-gray-500 mt-0.5">
                                {request.createdAt?.toDate?.()?.toLocaleTimeString('tr-TR') || ''}
                              </div>
                            </td>
                            <td className="px-6 py-5 whitespace-nowrap">
                              <span className={`inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-full shadow-sm ${getStatusColor(request.status)}`}>
                                {getStatusText(request.status)}
                              </span>
                            </td>
                            <td className="px-6 py-5 whitespace-nowrap">
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => setSelectedRequest(request)}
                                  className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all duration-150"
                                  title="Detay"
                                >
                                  <Eye className="w-5 h-5" />
                                </button>
                                {request.status === 'pending' && (
                                  <>
                                    <button
                                      onClick={() => handleWithdrawalStatusUpdate(request.id, 'approved')}
                                      disabled={processingRequest}
                                      className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                                      title="Onayla"
                                    >
                                      <CheckCircle className="w-5 h-5" />
                                    </button>
                                    <button
                                      onClick={() => handleWithdrawalStatusUpdate(request.id, 'rejected')}
                                      disabled={processingRequest}
                                      className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                                      title="Reddet"
                                    >
                                      <XCircle className="w-5 h-5" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="7" className="px-6 py-16 text-center">
                            <div className="flex flex-col items-center">
                              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                <CreditCard className="w-10 h-10 text-gray-400" />
                              </div>
                              <p className="text-gray-600 font-semibold text-lg mb-1">Çekim talebi bulunamadı</p>
                              <p className="text-gray-400 text-sm">Henüz çekim talebi oluşturulmamış</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Çekim Talebi Detay Modal */}
        {selectedRequest && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden transform transition-all duration-300">
              <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                      <CreditCard className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-white">Çekim Talebi Detayı</h3>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedRequest(null);
                      setAdminNote('');
                    }}
                    className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-colors duration-150"
                  >
                    <XCircle className="w-6 h-6 text-white" />
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-5 border border-gray-200">
                  <h4 className="font-bold text-gray-900 mb-4 text-lg flex items-center">
                    <div className="w-1 h-6 bg-green-600 rounded-full mr-3"></div>
                    Talep Bilgileri
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500 font-medium mb-1">Saha Sahibi</p>
                      <p className="text-gray-900 font-semibold">{selectedRequest.ownerName || 'Bilinmiyor'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 font-medium mb-1">E-posta</p>
                      <p className="text-gray-900 font-semibold">{selectedRequest.ownerEmail || '-'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 font-medium mb-1">Ad Soyad</p>
                      <p className="text-gray-900 font-semibold">{selectedRequest.fullName || '-'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 font-medium mb-1">IBAN</p>
                      <p className="text-gray-900 font-semibold font-mono">{selectedRequest.iban || '-'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 font-medium mb-1">Miktar</p>
                      <p className="text-gray-900 font-bold text-lg">₺{selectedRequest.amount?.toLocaleString() || 0}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 font-medium mb-1">Durum</p>
                      <span className={`inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-full shadow-sm ${getStatusColor(selectedRequest.status)}`}>
                        {getStatusText(selectedRequest.status)}
                      </span>
                    </div>
                    <div>
                      <p className="text-gray-500 font-medium mb-1">Talep Tarihi</p>
                      <p className="text-gray-900 font-semibold">
                        {selectedRequest.createdAt?.toDate?.()?.toLocaleDateString('tr-TR') || '-'}
                      </p>
                    </div>
                    {selectedRequest.processedAt && (
                      <div>
                        <p className="text-gray-500 font-medium mb-1">İşlem Tarihi</p>
                        <p className="text-gray-900 font-semibold">
                          {selectedRequest.processedAt?.toDate?.()?.toLocaleDateString('tr-TR') || '-'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {selectedRequest.status === 'pending' && (
                  <div className="bg-gradient-to-br from-yellow-50 to-white rounded-xl p-5 border border-yellow-200">
                    <h4 className="font-bold text-gray-900 mb-4 text-lg flex items-center">
                      <div className="w-1 h-6 bg-yellow-600 rounded-full mr-3"></div>
                      İşlem
                    </h4>
                    <textarea
                      value={adminNote}
                      onChange={(e) => setAdminNote(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-150 bg-white mb-4"
                      rows="3"
                      placeholder="Admin notu (isteğe bağlı)"
                    />
                    <div className="flex space-x-3">
                      <button
                        onClick={() => handleWithdrawalStatusUpdate(selectedRequest.id, 'approved')}
                        disabled={processingRequest}
                        className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {processingRequest ? 'İşleniyor...' : 'Onayla'}
                      </button>
                      <button
                        onClick={() => handleWithdrawalStatusUpdate(selectedRequest.id, 'rejected')}
                        disabled={processingRequest}
                        className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl hover:from-red-700 hover:to-rose-700 font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {processingRequest ? 'İşleniyor...' : 'Reddet'}
                      </button>
                    </div>
                  </div>
                )}

                {selectedRequest.adminNote && (
                  <div className="bg-gradient-to-br from-blue-50 to-white rounded-xl p-5 border border-blue-200">
                    <h4 className="font-bold text-gray-900 mb-2 text-lg flex items-center">
                      <div className="w-1 h-6 bg-blue-600 rounded-full mr-3"></div>
                      Admin Notu
                    </h4>
                    <p className="text-sm text-gray-700">{selectedRequest.adminNote}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Finansal;

