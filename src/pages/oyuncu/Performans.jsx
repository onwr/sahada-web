import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getPlayerReservations, getPlayerStats, exportPerformanceData } from '../../services/firestoreService';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { usePremium } from '../../hooks/usePremium';
import PremiumUpgrade from '../../components/PremiumUpgrade';
import OyuncuSidebar from '../../components/OyuncuSidebar';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
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
  ArcElement
} from 'chart.js';
import { BarChart3, TrendingUp, Trophy, Calendar, Users, Target, AlertCircle, DollarSign, MapPin, Clock, Download, CheckCircle } from 'lucide-react';
import toast from '../../utils/toast';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const Performans = () => {
  const { user } = useAuth();
  const { isPremium, isLoading: premiumLoading } = usePremium();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [error, setError] = useState(null);
  const [monthlyTrend, setMonthlyTrend] = useState({ labels: [], data: [] });
  const [sahaDistribution, setSahaDistribution] = useState({ labels: [], data: [] });
  const [spendingAnalysis, setSpendingAnalysis] = useState({ labels: [], data: [] });
  const [detailedStats, setDetailedStats] = useState({
    favoriteTesis: null,
    favoriteTimeSlot: null,
    averageMatchDuration: 0,
    totalSpent: 0,
    averageSpentPerMatch: 0
  });

  useEffect(() => {
    if (user && !premiumLoading && isPremium) {
      loadPerformanceData();
      const cleanup = setupRealtimeListener();
      return () => {
        if (cleanup) cleanup();
      };
    }
  }, [user, premiumLoading, isPremium]);

  const setupRealtimeListener = () => {
    if (!user) return;

    const reservationsQuery = query(
      collection(db, 'rezervasyonlar'),
      where('players', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(reservationsQuery, (snapshot) => {
      const reservationsData = [];
      snapshot.forEach((doc) => {
        reservationsData.push({ id: doc.id, ...doc.data() });
      });
      
      setReservations(reservationsData);
      calculateAnalytics(reservationsData);
    }, (error) => {
      console.error('Rezervasyon listener hatası:', error);
      toast.error('Veriler güncellenirken hata oluştu');
    });

    return () => unsubscribe();
  };

  const loadPerformanceData = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const [statsResult, reservationsResult] = await Promise.all([
        getPlayerStats(user.uid),
        getPlayerReservations(user.uid)
      ]);
      
      if (statsResult.success) {
        setStats(statsResult.data);
      }
      
      if (reservationsResult.success) {
        setReservations(reservationsResult.data);
        calculateAnalytics(reservationsResult.data);
      }
    } catch (err) {
      setError('Performans verileri yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const calculateAnalytics = (reservationsData) => {
    if (!reservationsData || reservationsData.length === 0) return;

    // Aylık rezervasyon trendi
    const last6Months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      last6Months.push({
        month: date.toLocaleDateString('tr-TR', { month: 'short', year: 'numeric' }),
        count: 0
      });
    }
    
    reservationsData.forEach(res => {
      if (res.date) {
        const resDate = res.date?.toDate ? res.date.toDate() : new Date(res.date);
        const monthIndex = (resDate.getFullYear() - now.getFullYear()) * 12 + (resDate.getMonth() - now.getMonth());
        if (monthIndex >= -5 && monthIndex <= 0) {
          const index = 5 + monthIndex;
          if (index >= 0 && index < last6Months.length) {
            last6Months[index].count++;
          }
        }
      }
    });
    
    setMonthlyTrend({
      labels: last6Months.map(m => m.month),
      data: last6Months.map(m => m.count)
    });

    // Saha bazlı dağılım
    const tesisCounts = {};
    reservationsData.forEach(r => {
      const tesisName = r.tesisName || 'Bilinmeyen Saha';
      tesisCounts[tesisName] = (tesisCounts[tesisName] || 0) + 1;
    });
    
    const sortedTesis = Object.entries(tesisCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    
    setSahaDistribution({
      labels: sortedTesis.map(t => t[0]),
      data: sortedTesis.map(t => t[1])
    });

    // Harcama analizi (aylık)
    const monthlySpending = {};
    reservationsData
      .filter(r => r.status === 'completed' || r.status === 'confirmed')
      .forEach(r => {
        if (r.date) {
          const resDate = r.date?.toDate ? r.date.toDate() : new Date(r.date);
          const monthKey = resDate.toLocaleDateString('tr-TR', { month: 'short', year: 'numeric' });
          monthlySpending[monthKey] = (monthlySpending[monthKey] || 0) + (r.totalAmount || r.price || 0);
        }
      });
    
    const sortedMonths = Object.entries(monthlySpending)
      .sort((a, b) => {
        const dateA = new Date(a[0]);
        const dateB = new Date(b[0]);
        return dateA - dateB;
      })
      .slice(-6);
    
    setSpendingAnalysis({
      labels: sortedMonths.map(m => m[0]),
      data: sortedMonths.map(m => m[1])
    });

    // Detaylı istatistikler
    const totalSpent = reservationsData
      .filter(r => r.status === 'completed' || r.status === 'confirmed')
      .reduce((sum, r) => sum + (r.totalAmount || r.price || 0), 0);
    
    const completedMatches = reservationsData.filter(r => r.status === 'completed' || r.status === 'confirmed').length;
    const averageSpentPerMatch = completedMatches > 0 ? totalSpent / completedMatches : 0;
    
    const favoriteTesis = sortedTesis.length > 0 ? sortedTesis[0][0] : null;
    
    const timeSlotCounts = {};
    reservationsData.forEach(r => {
      if (r.timeSlot) {
        timeSlotCounts[r.timeSlot] = (timeSlotCounts[r.timeSlot] || 0) + 1;
      }
    });
    const favoriteTimeSlot = Object.entries(timeSlotCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    
    setDetailedStats({
      favoriteTesis,
      favoriteTimeSlot,
      averageMatchDuration: 90, // Varsayılan 90 dakika
      totalSpent,
      averageSpentPerMatch
    });
  };

  const handleExport = async (format = 'excel') => {
    if (!user) return;
    
    try {
      const result = await exportPerformanceData(user.uid, format);
      if (result.success) {
        if (format === 'excel' || format === 'csv') {
          const blob = new Blob([result.csv], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `performans-raporu-${new Date().toISOString().split('T')[0]}.csv`;
          a.click();
          URL.revokeObjectURL(url);
          toast.success('Rapor başarıyla indirildi');
        } else if (format === 'json') {
          const blob = new Blob([result.json], { type: 'application/json;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `performans-raporu-${new Date().toISOString().split('T')[0]}.json`;
          a.click();
          URL.revokeObjectURL(url);
          toast.success('Rapor başarıyla indirildi');
        }
      } else {
        toast.error(result.error || 'Rapor indirilemedi');
      }
    } catch (error) {
      console.error('Export hatası:', error);
      toast.error('Rapor indirilirken hata oluştu');
    }
  };

  if (premiumLoading || loading) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!isPremium) {
    return (
      <div className="flex h-screen bg-gray-50">
        <OyuncuSidebar />
        <div className="flex-1 flex flex-col">
          <header className="bg-white shadow-sm border-b px-6 py-4">
            <h1 className="text-2xl font-bold text-gray-900">Performans Analytics</h1>
          </header>
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="mb-6">
              <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 text-center mb-2">Premium Özellik</h2>
              <p className="text-gray-600 text-center mb-6">
                Bu özelliğe erişmek için Premium üyelik gereklidir
              </p>
            </div>
            <PremiumUpgrade userType="player" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <OyuncuSidebar />
      <div className="flex-1 flex flex-col">
        <header className="bg-white shadow-sm border-b px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Performans Analytics</h1>
        </header>
        <div className="flex-1 p-6 overflow-y-auto">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
              <AlertCircle className="w-5 h-5 mr-2" />
              {error}
            </div>
          )}
          {stats && (
            <>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Performans Özeti</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleExport('excel')}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <Download className="w-4 h-4" />
                    <span>CSV İndir</span>
                  </button>
                  <button
                    onClick={() => handleExport('json')}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Download className="w-4 h-4" />
                    <span>JSON İndir</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">TOPLAM MAÇ</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalMatches || 0}</p>
                    </div>
                    <Trophy className="w-12 h-12 text-purple-400" />
                  </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">TOPLAM HARCAMA</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">₺{detailedStats.totalSpent.toLocaleString('tr-TR')}</p>
                    </div>
                    <DollarSign className="w-12 h-12 text-green-400" />
                  </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">ORTALAMA HARCAMA</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">₺{Math.round(detailedStats.averageSpentPerMatch).toLocaleString('tr-TR')}</p>
                    </div>
                    <Target className="w-12 h-12 text-blue-400" />
                  </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">TAMAMLANAN</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">{stats.completedMatches || 0}</p>
                    </div>
                    <CheckCircle className="w-12 h-12 text-green-400" />
                  </div>
                </div>
              </div>

              {/* Grafikler */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Aylık Rezervasyon Trendi</h3>
                  {monthlyTrend.labels.length > 0 ? (
                    <div className="h-64">
                      <Line
                        data={{
                          labels: monthlyTrend.labels,
                          datasets: [
                            {
                              label: 'Rezervasyon Sayısı',
                              data: monthlyTrend.data,
                              borderColor: 'rgb(34, 197, 94)',
                              backgroundColor: 'rgba(34, 197, 94, 0.1)',
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
                      />
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">Veri yok</p>
                  )}
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Saha Bazlı Dağılım</h3>
                  {sahaDistribution.labels.length > 0 ? (
                    <div className="h-64">
                      <Doughnut
                        data={{
                          labels: sahaDistribution.labels,
                          datasets: [
                            {
                              data: sahaDistribution.data,
                              backgroundColor: [
                                'rgba(34, 197, 94, 0.8)',
                                'rgba(59, 130, 246, 0.8)',
                                'rgba(168, 85, 247, 0.8)',
                                'rgba(236, 72, 153, 0.8)',
                                'rgba(251, 146, 60, 0.8)'
                              ]
                            }
                          ]
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              position: 'bottom'
                            }
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">Veri yok</p>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Aylık Harcama Analizi</h3>
                {spendingAnalysis.labels.length > 0 ? (
                  <div className="h-64">
                    <Bar
                      data={{
                        labels: spendingAnalysis.labels,
                        datasets: [
                          {
                            label: 'Harcama (₺)',
                            data: spendingAnalysis.data,
                            backgroundColor: 'rgba(34, 197, 94, 0.8)'
                          }
                        ]
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
                              callback: function(value) {
                                return '₺' + value.toLocaleString('tr-TR');
                              }
                            }
                          }
                        }
                      }}
                    />
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">Veri yok</p>
                )}
              </div>

              {/* Detaylı İstatistikler */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex items-center space-x-3 mb-2">
                    <MapPin className="w-5 h-5 text-gray-400" />
                    <p className="text-sm font-medium text-gray-600">Favori Saha</p>
                  </div>
                  <p className="text-lg font-bold text-gray-900">{detailedStats.favoriteTesis || 'Yok'}</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex items-center space-x-3 mb-2">
                    <Clock className="w-5 h-5 text-gray-400" />
                    <p className="text-sm font-medium text-gray-600">Favori Saat</p>
                  </div>
                  <p className="text-lg font-bold text-gray-900">{detailedStats.favoriteTimeSlot || 'Yok'}</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex items-center space-x-3 mb-2">
                    <Clock className="w-5 h-5 text-gray-400" />
                    <p className="text-sm font-medium text-gray-600">Ortalama Süre</p>
                  </div>
                  <p className="text-lg font-bold text-gray-900">{detailedStats.averageMatchDuration} dk</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex items-center space-x-3 mb-2">
                    <Users className="w-5 h-5 text-gray-400" />
                    <p className="text-sm font-medium text-gray-600">Yaklaşan Maç</p>
                  </div>
                  <p className="text-lg font-bold text-gray-900">{stats.upcomingMatches || 0}</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Performans;

