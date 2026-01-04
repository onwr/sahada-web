import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getPlatformStats, getAllReservations, getAllUsers, getAllComplaints } from '../../services/firestoreService';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import AdminSidebar from '../../components/AdminSidebar';
import AdminHeader from '../../components/AdminHeader';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { 
  BarChart3, 
  Users, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  Building2,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Activity,
  RefreshCw
} from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const Dashboard = () => {
  const { userData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [recentReservations, setRecentReservations] = useState([]);
  const [recentUsers, setRecentUsers] = useState([]);
  const [complaintsCount, setComplaintsCount] = useState(0);
  const [allReservations, setAllReservations] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDashboardData();
    
    // Sadece complaints için real-time listener (orderBy kaldırıldı - index gerektirmemesi için)
    const complaintsQuery = query(
      collection(db, 'complaints'),
      where('status', '==', 'pending')
    );

    const unsubscribeComplaints = onSnapshot(complaintsQuery, (snapshot) => {
      setComplaintsCount(snapshot.size);
    }, (error) => {
      console.error('Complaints listener hatası:', error);
      // Hata durumunda loadDashboardData'dan gelen değeri kullan
    });

    return () => {
      unsubscribeComplaints();
    };
  }, []);

  const loadDashboardData = async () => {
    setError(null);

    try {
      const [statsResult, reservationsResult, usersResult, complaintsResult] = await Promise.all([
        getPlatformStats(),
        getAllReservations(),
        getAllUsers(),
        getAllComplaints({ status: 'pending' })
      ]);

      if (statsResult.success) {
        setStats(statsResult.data);
      }

      if (reservationsResult.success) {
        const sorted = reservationsResult.data.sort((a, b) => {
          const dateA = new Date(a.createdAt?.toDate?.() || a.date || 0);
          const dateB = new Date(b.createdAt?.toDate?.() || b.date || 0);
          return dateB - dateA;
        });
        setRecentReservations(sorted.slice(0, 5));
        setAllReservations(sorted);
      }

      if (usersResult.success) {
        const sortedUsers = usersResult.data.sort((a, b) => {
          const dateA = a.createdAt?.toDate?.() || new Date(0);
          const dateB = b.createdAt?.toDate?.() || new Date(0);
          return dateB - dateA;
        });
        setRecentUsers(sortedUsers.slice(0, 5));
        setAllUsers(sortedUsers);
      }

      if (complaintsResult.success) {
        setComplaintsCount(complaintsResult.data.length);
      }
    } catch (err) {
      console.error('Dashboard veri yükleme hatası:', err);
      setError('Veriler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Dashboard yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Hata</h3>
          <p className="text-gray-600 mb-4">{error || 'Veriler yüklenemedi'}</p>
          <button
            onClick={loadDashboardData}
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
      <AdminSidebar />

      <div className="flex-1 flex flex-col">
        <AdminHeader 
          title="Dashboard" 
          description="Platform genel bakış ve istatistikler"
        >
          <button
            onClick={loadDashboardData}
            className="flex items-center space-x-2 px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors duration-150"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="text-sm font-medium">Yenile</span>
          </button>
        </AdminHeader>

        <div className="flex-1 p-6 overflow-y-auto bg-gray-50">
          {/* Hoşgeldin Mesajı */}
          <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">
                  Hoş Geldiniz, {userData?.displayName || 'Admin'}
                </h2>
                <p className="text-gray-600 text-sm">
                  {new Date().toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 font-medium mb-1">Son Güncelleme</p>
                <p className="text-sm font-semibold text-gray-700">{new Date().toLocaleTimeString('tr-TR')}</p>
              </div>
            </div>
          </div>

          {/* AI Suggestions / Öneriler */}
          {complaintsCount > 0 && (
            <div className="mb-6 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl shadow-sm border border-orange-100 p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <AlertCircle className="w-32 h-32 text-orange-600" />
              </div>
              <div className="relative z-10 flex items-start space-x-4">
                <div className="bg-white p-3 rounded-full shadow-sm">
                   <AlertCircle className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">Dikkat Gerektiren Durumlar</h3>
                  <p className="text-gray-700 mb-3">
                    Şu anda <strong>{complaintsCount} adet</strong> bekleyen şikayet bulunuyor. Kullanıcı memnuniyetini artırmak için bu şikayetleri en kısa sürede incelemeniz önerilir.
                  </p>
                  <a 
                    href="/admin/sikayetler" 
                    className="inline-flex items-center px-4 py-2 bg-white text-orange-700 text-sm font-medium rounded-lg border border-orange-200 hover:bg-orange-50 transition-colors shadow-sm"
                  >
                    Şikayetleri İncele
                    <TrendingUp className="w-4 h-4 ml-2" />
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Ana İstatistikler */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">TOPLAM REZERVASYON</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.totalReservations.all}</p>
                  <div className="flex items-center mt-2 text-xs text-gray-600">
                    <Calendar className="w-3.5 h-3.5 mr-1.5" />
                    <span>Bugün: {stats.totalReservations.today}</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">AKTİF KULLANICI</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.activeUsers.total}</p>
                  <div className="flex items-center mt-2 text-xs text-gray-600">
                    <Users className="w-3.5 h-3.5 mr-1.5" />
                    <span>{stats.activeUsers.players} Oyuncu • {stats.activeUsers.owners} Sahi</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">TOPLAM GMV</p>
                  <p className="text-3xl font-bold text-gray-900">₺{Math.round(stats.gmv.total).toLocaleString()}</p>
                  <div className="flex items-center mt-2 text-xs text-gray-600">
                    <TrendingUp className="w-3.5 h-3.5 mr-1.5" />
                    <span>Aylık: ₺{Math.round(stats.gmv.monthly).toLocaleString()}</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">CONVERSION RATE</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.conversionRate.toFixed(1)}%</p>
                  <div className="flex items-center mt-2 text-xs text-gray-600">
                    <Activity className="w-3.5 h-3.5 mr-1.5" />
                    <span>Ort. sepet: ₺{Math.round(stats.avgBasketValue)}</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Hızlı Erişim */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <a
              href="/admin/tesisler"
              className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-yellow-300 transition-all duration-200 cursor-pointer"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Onay Bekleyen</p>
                  <p className="text-xl font-bold text-gray-900 mt-0.5">{stats.pendingTesisler}</p>
                </div>
              </div>
            </a>
            <a
              href="/admin/sikayetler"
              className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-red-300 transition-all duration-200 cursor-pointer"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Yeni Şikayet</p>
                  <p className="text-xl font-bold text-gray-900 mt-0.5">{complaintsCount}</p>
                </div>
              </div>
            </a>
            <a
              href="/admin/kullanicilar"
              className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-300 transition-all duration-200 cursor-pointer"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Toplam Kullanıcı</p>
                  <p className="text-xl font-bold text-gray-900 mt-0.5">{stats.activeUsers.total}</p>
                </div>
              </div>
            </a>
            <a
              href="/admin/finansal"
              className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-green-300 transition-all duration-200 cursor-pointer"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Aylık GMV</p>
                  <p className="text-xl font-bold text-gray-900 mt-0.5">₺{Math.round(stats.gmv.monthly / 1000)}K</p>
                </div>
              </div>
            </a>
          </div>

          {/* İkincil İstatistikler */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">AKTİF TESİSLER</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalTesisler}</p>
                </div>
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-gray-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">İPTAL ORANI</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.cancellationRate.toFixed(1)}%</p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <XCircle className="w-6 h-6 text-red-500" />
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">ONAY BEKLEYEN</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.pendingTesisler}</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Son Rezervasyonlar */}
          <div className="mb-8">
            <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">Son Rezervasyonlar</h2>
                      <p className="text-xs text-gray-500 mt-0.5">En son oluşturulan rezervasyonlar</p>
                    </div>
                  </div>
                  <a 
                    href="/admin/rezervasyonlar"
                    className="text-sm text-green-600 hover:text-green-700 font-medium"
                  >
                    Tümünü Gör →
                  </a>
                </div>
              </div>
              <div className="divide-y divide-gray-100">
                {recentReservations.length > 0 ? (
                  recentReservations.map((reservation) => (
                    <div key={reservation.id} className="px-6 py-4 hover:bg-gray-50 transition-colors duration-150">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <p className="font-semibold text-gray-900">{reservation.tesisName || 'Saha'}</p>
                          </div>
                          <div className="flex items-center space-x-4 mt-2 ml-5">
                            <div className="flex items-center space-x-1.5 text-sm text-gray-600">
                              <Calendar className="w-4 h-4" />
                              <span>{(reservation.date?.toDate ? reservation.date.toDate() : new Date(reservation.date)).toLocaleDateString('tr-TR')}</span>
                            </div>
                            <div className="flex items-center space-x-1.5 text-sm text-gray-600">
                              <Clock className="w-4 h-4" />
                              <span>{reservation.timeSlot}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right ml-6">
                          <p className="font-bold text-gray-900 text-lg">₺{(reservation.totalAmount || reservation.price || 0).toLocaleString()}</p>
                          <div className="flex items-center justify-end mt-1.5">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span className="text-xs text-green-600 ml-1.5 font-medium">Onaylandı</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-12 text-center text-gray-500">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Calendar className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="font-medium">Henüz rezervasyon yok</p>
                    <p className="text-sm text-gray-400 mt-1">Yeni rezervasyonlar burada görünecek</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Trend Analizi ve Detaylı Metrikler - Grafikler */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-bold text-gray-900">Rezervasyon Trendi (Son 7 Gün)</h3>
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              </div>
              <div className="h-[300px] w-full">
                {allReservations.length > 0 ? (
                  <Line
                    data={{
                      labels: (() => {
                        const labels = [];
                        for (let i = 6; i >= 0; i--) {
                          const date = new Date();
                          date.setDate(date.getDate() - i);
                          labels.push(date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }));
                        }
                        return labels;
                      })(),
                      datasets: [{
                        label: 'Rezervasyon Sayısı',
                        data: (() => {
                          const data = [];
                          for (let i = 6; i >= 0; i--) {
                            const date = new Date();
                            date.setDate(date.getDate() - i);
                            date.setHours(0, 0, 0, 0);
                            const count = allReservations.filter(r => {
                              const resDate = r.date?.toDate ? r.date.toDate() : new Date(r.date);
                              resDate.setHours(0, 0, 0, 0);
                              return resDate.getTime() === date.getTime();
                            }).length;
                            data.push(count);
                          }
                          return data;
                        })(),
                        borderColor: 'rgb(34, 197, 94)',
                        backgroundColor: 'rgba(34, 197, 94, 0.1)',
                        borderWidth: 3,
                        pointRadius: 5,
                        pointHoverRadius: 7,
                        pointBackgroundColor: 'rgb(34, 197, 94)',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        tension: 0.4,
                        fill: true
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          display: false
                        }
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          ticks: {
                            stepSize: 1
                          }
                        }
                      }
                    }}
                    style={{ height: '100%', maxHeight: '300px' }}
                  />
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-500">
                    <p>Veri yok</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-bold text-gray-900">GMV Trendi (Son 7 Gün)</h3>
                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
              </div>
              <div className="h-[300px] w-full">
                {allReservations.length > 0 ? (
                  <Bar
                    data={{
                      labels: (() => {
                        const labels = [];
                        for (let i = 6; i >= 0; i--) {
                          const date = new Date();
                          date.setDate(date.getDate() - i);
                          labels.push(date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }));
                        }
                        return labels;
                      })(),
                      datasets: [{
                        label: 'GMV (₺)',
                        data: (() => {
                          const data = [];
                          for (let i = 6; i >= 0; i--) {
                            const date = new Date();
                            date.setDate(date.getDate() - i);
                            date.setHours(0, 0, 0, 0);
                            const total = allReservations
                              .filter(r => {
                                const resDate = r.date?.toDate ? r.date.toDate() : new Date(r.date);
                                resDate.setHours(0, 0, 0, 0);
                                return resDate.getTime() === date.getTime() && 
                                       (r.status === 'confirmed' || r.status === 'completed');
                              })
                              .reduce((sum, r) => sum + (r.totalAmount || r.price || 0), 0);
                            data.push(total);
                          }
                          return data;
                        })(),
                        backgroundColor: 'rgba(16, 185, 129, 0.8)',
                        borderColor: 'rgb(16, 185, 129)',
                        borderWidth: 2,
                        borderRadius: 8
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          display: false
                        },
                        tooltip: {
                          callbacks: {
                            label: (context) => `₺${context.parsed.y.toLocaleString()}`
                          }
                        }
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          ticks: {
                            callback: (value) => `₺${value.toLocaleString()}`
                          }
                        }
                      }
                    }}
                    style={{ height: '100%', maxHeight: '300px' }}
                  />
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-500">
                    <p>Veri yok</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Kullanıcı Büyüme Grafiği */}
          <div className="grid grid-cols-1 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-bold text-gray-900">Kullanıcı Büyüme Trendi (Son 30 Gün)</h3>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                </div>
              </div>

              <div className="h-[300px] w-full">
                {allUsers.length > 0 ? (
                  <Line
                    data={{
                      labels: (() => {
                        const labels = [];
                        const today = new Date();
                        for (let i = 29; i >= 0; i -= 5) {
                          const date = new Date(today);
                          date.setDate(date.getDate() - i);
                          labels.push(date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }));
                        }
                        return labels;
                      })(),
                      datasets: [
                        {
                          label: 'Oyuncular',
                          data: (() => {
                            const data = [];
                            const today = new Date();
                            for (let i = 29; i >= 0; i -= 5) {
                              const date = new Date(today);
                              date.setDate(date.getDate() - i);
                              const count = allUsers.filter(u => {
                                const createdDate = u.createdAt?.toDate?.() || new Date(0);
                                return createdDate <= date && u.userType === 'player' && u.onboardingCompleted;
                              }).length;
                              data.push(count);
                            }
                            return data;
                          })(),
                          borderColor: 'rgb(59, 130, 246)',
                          backgroundColor: 'rgba(59, 130, 246, 0.1)',
                          borderWidth: 3,
                          pointRadius: 5,
                          pointHoverRadius: 7,
                          pointBackgroundColor: 'rgb(59, 130, 246)',
                          pointBorderColor: '#fff',
                          pointBorderWidth: 2,
                          tension: 0.4,
                          fill: true
                        },
                        {
                          label: 'Saha Sahipleri',
                          data: (() => {
                            const data = [];
                            const today = new Date();
                            for (let i = 29; i >= 0; i -= 5) {
                              const date = new Date(today);
                              date.setDate(date.getDate() - i);
                              const count = allUsers.filter(u => {
                                const createdDate = u.createdAt?.toDate?.() || new Date(0);
                                return createdDate <= date && u.userType === 'owner' && u.onboardingCompleted;
                              }).length;
                              data.push(count);
                            }
                            return data;
                          })(),
                          borderColor: 'rgb(34, 197, 94)',
                          backgroundColor: 'rgba(34, 197, 94, 0.1)',
                          borderWidth: 3,
                          pointRadius: 5,
                          pointHoverRadius: 7,
                          pointBackgroundColor: 'rgb(34, 197, 94)',
                          pointBorderColor: '#fff',
                          pointBorderWidth: 2,
                          tension: 0.4,
                          fill: true
                        }
                      ]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          display: true,
                          position: 'top'
                        }
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          ticks: {
                            stepSize: 1
                          }
                        }
                      }
                    }}
                    style={{ height: '100%', maxHeight: '300px' }}
                  />
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-500">
                    <p>Veri yok</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <h3 className="text-base font-bold text-gray-900 mb-4">Özet İstatistikler</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">Bugün</span>
                  <span className="font-semibold text-gray-900">{stats.totalReservations.today} rezervasyon</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">Bu Hafta</span>
                  <span className="font-semibold text-gray-900">{stats.totalReservations.weekly} rezervasyon</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">Bu Ay</span>
                  <span className="font-semibold text-gray-900">{stats.totalReservations.monthly} rezervasyon</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                  <span className="text-sm text-gray-700 font-medium">Toplam</span>
                  <span className="font-bold text-green-700 text-lg">{stats.totalReservations.all} rezervasyon</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">Toplam GMV</span>
                  <span className="font-semibold text-gray-900">₺{Math.round(stats.gmv.total).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">Aylık GMV</span>
                  <span className="font-semibold text-gray-900">₺{Math.round(stats.gmv.monthly).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                  <span className="text-sm text-gray-700 font-medium">Ortalama Sepet</span>
                  <span className="font-bold text-green-700 text-lg">₺{Math.round(stats.avgBasketValue)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Kullanıcı İstatistikleri */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <h3 className="text-base font-bold text-gray-900 mb-4">Kullanıcı Dağılımı</h3>
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Oyuncular</span>
                    <span className="font-semibold text-gray-900">{stats.activeUsers.players}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${stats.activeUsers.total > 0 ? (stats.activeUsers.players / stats.activeUsers.total) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Saha Sahipleri</span>
                    <span className="font-semibold text-gray-900">{stats.activeUsers.owners}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full" 
                      style={{ width: `${stats.activeUsers.total > 0 ? (stats.activeUsers.owners / stats.activeUsers.total) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <h3 className="text-base font-bold text-gray-900 mb-4">Platform Performansı</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Conversion Rate</span>
                  <span className="font-semibold text-green-600">{stats.conversionRate.toFixed(1)}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">İptal Oranı</span>
                  <span className="font-semibold text-red-600">{stats.cancellationRate.toFixed(1)}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Aktif Tesisler</span>
                  <span className="font-semibold text-gray-900">{stats.totalTesisler}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <h3 className="text-base font-bold text-gray-900 mb-4">Platform Durumu</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
                  <span className="text-sm text-gray-700">Sistem Durumu</span>
                  <span className="flex items-center space-x-1 text-green-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs font-medium">Aktif</span>
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                  <span className="text-sm text-gray-700">Veritabanı</span>
                  <span className="flex items-center space-x-1 text-blue-600">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-xs font-medium">Bağlı</span>
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 bg-yellow-50 rounded-lg">
                  <span className="text-sm text-gray-700">Bekleyen İşlemler</span>
                  <span className="text-xs font-semibold text-yellow-600">{stats.pendingTesisler}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Yeni Kullanıcılar */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900">Yeni Kullanıcılar</h2>
              <a 
                href="/admin/kullanicilar"
                className="text-sm text-green-600 hover:text-green-700 font-medium"
              >
                Tümünü Gör →
              </a>
            </div>
            <div className="divide-y divide-gray-200">
              {recentUsers.length > 0 ? (
                recentUsers.map((user) => (
                  <div key={user.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <Users className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{user.displayName || user.email}</p>
                          <p className="text-sm text-gray-500 capitalize">{user.userType || 'Kullanıcı'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">
                          {user.createdAt?.toDate?.()?.toLocaleDateString('tr-TR') || 'Tarih yok'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center text-gray-500">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p>Henüz kullanıcı yok</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

