import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getReportData } from '../../services/firestoreService';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import SahaSahibiSidebar from '../../components/SahaSahibiSidebar';
import { 
  BarChart3, 
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
  FileText,
  FileSpreadsheet,
  File,
  Printer,
  Mail,
  Save,
  Users,
  DollarSign,
  Target,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Filter,
  RefreshCw
} from 'lucide-react';
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
  ArcElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import jsPDF from 'jspdf';

// Chart.js kaydet
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

const Raporlar = () => {
  const { user, userData } = useAuth();
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filtreleme ve tarih aralığı
  const [dateRange, setDateRange] = useState('month'); // today, week, month, quarter, year, custom
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showCustomRange, setShowCustomRange] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    loadReportData();
    const cleanup = setupRealtimeListener();
    
    return () => {
      if (cleanup) cleanup();
    };
  }, [user, dateRange, customStartDate, customEndDate]);

  const setupRealtimeListener = () => {
    if (!user) return;

    let unsubscribeFunctions = [];
    let innerUnsubscribes = [];

    // Tesis ID'lerini al
    const tesislerQuery = query(
      collection(db, 'tesisler'),
      where('ownerId', '==', user.uid)
    );

    const unsubscribeTesisler = onSnapshot(tesislerQuery, (snapshot) => {
      // Önceki inner listener'ları temizle
      innerUnsubscribes.forEach(unsub => unsub());
      innerUnsubscribes = [];

      const tesisIds = [];
      snapshot.forEach((doc) => {
        tesisIds.push(doc.id);
      });

      if (tesisIds.length > 0) {
        // Rezervasyonlar için real-time listener - rapor verilerini güncelle
        const reservationsQuery = query(
          collection(db, 'rezervasyonlar'),
          where('tesisId', 'in', tesisIds)
        );

        const unsubscribeReservations = onSnapshot(reservationsQuery, () => {
          // Rapor verilerini yeniden yükle
          loadReportData();
        });
        innerUnsubscribes.push(unsubscribeReservations);
      }
    });
    unsubscribeFunctions.push(unsubscribeTesisler);

    return () => {
      innerUnsubscribes.forEach(unsub => unsub());
      unsubscribeFunctions.forEach(unsub => unsub());
    };
  };

  const loadReportData = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { startDate, endDate } = getDateRange();
      const result = await getReportData(user.uid, startDate, endDate);

      if (result.success) {
        setReportData(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error('Rapor veri yükleme hatası:', err);
      setError('Veriler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const getDateRange = () => {
    const now = new Date();
    let startDate, endDate;
    
    switch (dateRange) {
      case 'today':
        startDate = endDate = now.toISOString().split('T')[0];
        break;
      case 'week':
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        startDate = weekStart.toISOString().split('T')[0];
        endDate = now.toISOString().split('T')[0];
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        endDate = now.toISOString().split('T')[0];
        break;
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1).toISOString().split('T')[0];
        endDate = now.toISOString().split('T')[0];
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
        endDate = now.toISOString().split('T')[0];
        break;
      case 'custom':
        startDate = customStartDate;
        endDate = customEndDate;
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        endDate = now.toISOString().split('T')[0];
    }
    
    return { startDate, endDate };
  };

  const formatCurrency = (amount) => {
    if (amount >= 1000000) {
      return `₺${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `₺${(amount / 1000).toFixed(1)}K`;
    }
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Tarih Yok';
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric'
    });
  };

  const formatPhoneNumber = (phone) => {
    if (!phone) return '';
    if (phone.length >= 10) {
      return phone.replace(/(\d{4})(\d{3})(\d{2})(\d{2})/, '$1 *** **$3');
    }
    return phone;
  };

  const getGrowthIcon = (growth) => {
    if (growth > 0) {
      return <TrendingUp className="w-4 h-4 text-green-500" />;
    } else if (growth < 0) {
      return <TrendingDown className="w-4 h-4 text-red-500" />;
    }
    return <div className="w-4 h-4" />;
  };

  const getGrowthColor = (growth) => {
    if (growth > 0) return 'text-green-600';
    if (growth < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getPerformanceColor = (performance) => {
    switch (performance) {
      case 'Yüksek': return 'text-green-600 bg-green-100';
      case 'Orta': return 'text-yellow-600 bg-yellow-100';
      case 'Düşük': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const handleExportPDF = () => {
    if (!reportData) return;
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Başlık
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('📊 Raporlar & Analizler', pageWidth / 2, 20, { align: 'center' });
    
    // Tarih aralığı
    const { startDate, endDate } = getDateRange();
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`${formatDate(startDate)} - ${formatDate(endDate)}`, pageWidth / 2, 30, { align: 'center' });
    
    let yPosition = 50;
    
    // Ana metrikler
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Ana Performans Metrikleri', 20, yPosition);
    yPosition += 15;
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Toplam Gelir: ${formatCurrency(reportData.totalRevenue)}`, 20, yPosition);
    yPosition += 10;
    doc.text(`Toplam Rezervasyon: ${reportData.totalReservations}`, 20, yPosition);
    yPosition += 10;
    doc.text(`Doluluk Oranı: %${reportData.occupancyRate}`, 20, yPosition);
    yPosition += 10;
    doc.text(`Ortalama Fiyat: ${formatCurrency(reportData.averagePrice)}`, 20, yPosition);
    yPosition += 10;
    doc.text(`Aktif Müşteri: ${reportData.activeCustomers}`, 20, yPosition);
    yPosition += 10;
    doc.text(`İptal Oranı: %${reportData.cancellationRate}`, 20, yPosition);
    yPosition += 20;
    
    // Dosyayı indir
    doc.save(`raporlar-${dateRange}-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Rapor verileri yükleniyor...</p>
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
            onClick={loadReportData}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Tekrar Dene
          </button>
        </div>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="text-center">
          <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Veri Bulunamadı</h3>
          <p className="text-gray-600">Seçilen tarih aralığında rapor verisi bulunamadı.</p>
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
            <div>
              <h1 className="text-2xl font-bold text-gray-900">📊 Raporlar & Analizler</h1>
              <p className="text-gray-600 mt-1">Detaylı performans analizleri ve finansal raporlar</p>
            </div>
            <div className="flex items-center space-x-4">
              <button 
                onClick={loadReportData}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Yenile</span>
              </button>
              <button 
                onClick={handleExportPDF}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Download className="w-4 h-4" />
                <span>Rapor İndir</span>
              </button>
            </div>
          </div>
        </header>

        {/* Date Range Selector */}
        <div className="bg-white border-b px-6 py-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">⏰ Rapor Zamanla:</span>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {['today', 'week', 'month', 'quarter', 'year'].map((range) => (
                <button
                  key={range}
                  onClick={() => {
                    setDateRange(range);
                    setShowCustomRange(false);
                  }}
                  className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                    dateRange === range
                      ? 'bg-green-100 text-green-700 border border-green-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {range === 'today' && 'Bugün'}
                  {range === 'week' && 'Bu Hafta'}
                  {range === 'month' && 'Bu Ay'}
                  {range === 'quarter' && 'Bu Çeyrek'}
                  {range === 'year' && 'Bu Yıl'}
                </button>
              ))}
              
              <button
                onClick={() => setShowCustomRange(!showCustomRange)}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                  dateRange === 'custom'
                    ? 'bg-green-100 text-green-700 border border-green-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Özel Aralık
              </button>
            </div>

            {showCustomRange && (
              <div className="flex items-center space-x-2">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-lg"
                />
                <span className="text-gray-500">-</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-lg"
                />
                <button
                  onClick={() => {
                    if (customStartDate && customEndDate) {
                      setDateRange('custom');
                    }
                  }}
                  className="px-3 py-1 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Uygula
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 p-6 overflow-y-auto">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Toplam Gelir</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {formatCurrency(reportData.totalRevenue)}
                  </p>
                  <div className="flex items-center mt-2">
                    {getGrowthIcon(reportData.revenueGrowth)}
                    <span className={`text-sm ml-1 ${getGrowthColor(reportData.revenueGrowth)}`}>
                      {Math.abs(reportData.revenueGrowth)}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Geçen aya göre {formatCurrency(reportData.totalRevenue * 0.2)} artış</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Rezervasyon</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {reportData.totalReservations}
                  </p>
                  <div className="flex items-center mt-2">
                    {getGrowthIcon(reportData.reservationGrowth)}
                    <span className={`text-sm ml-1 ${getGrowthColor(reportData.reservationGrowth)}`}>
                      {Math.abs(reportData.reservationGrowth)}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Günlük ortalama: {(reportData.totalReservations / 30).toFixed(1)}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Doluluk Oranı</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    %{reportData.occupancyRate}
                  </p>
                  <div className="flex items-center mt-2">
                    {getGrowthIcon(reportData.occupancyGrowth)}
                    <span className={`text-sm ml-1 ${getGrowthColor(reportData.occupancyGrowth)}`}>
                      {Math.abs(reportData.occupancyGrowth)}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">En yoğun: Cumartesi %95</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Target className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Ortalama Fiyat</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {formatCurrency(reportData.averagePrice)}
                  </p>
                  <div className="flex items-center mt-2">
                    {getGrowthIcon(reportData.priceGrowth)}
                    <span className={`text-sm ml-1 ${getGrowthColor(reportData.priceGrowth)}`}>
                      {Math.abs(reportData.priceGrowth)}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Rezervasyon başına</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Aktif Müşteri</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {reportData.activeCustomers}
                  </p>
                  <div className="flex items-center mt-2">
                    {getGrowthIcon(reportData.customerGrowth)}
                    <span className={`text-sm ml-1 ${getGrowthColor(reportData.customerGrowth)}`}>
                      {Math.abs(reportData.customerGrowth)}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">45 yeni müşteri</p>
                </div>
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-indigo-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">İptal Oranı</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    %{reportData.cancellationRate}
                  </p>
                  <div className="flex items-center mt-2">
                    {getGrowthIcon(reportData.cancellationGrowth)}
                    <span className={`text-sm ml-1 ${getGrowthColor(reportData.cancellationGrowth)}`}>
                      {Math.abs(reportData.cancellationGrowth)}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">20 iptal / {reportData.totalReservations} rezervasyon</p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <XCircle className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Weekly Revenue Chart */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Haftalık Gelir Analizi</h3>
                <div className="flex space-x-2">
                  <button className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-lg">Haftalık</button>
                  <button className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded-lg">Aylık</button>
                </div>
              </div>
              <div className="h-64">
                {reportData.weeklyRevenue && reportData.weeklyRevenue.length > 0 ? (
                  <Bar
                    data={{
                      labels: reportData.weeklyRevenue.map(item => item.day),
                      datasets: [
                        {
                          label: 'Gelir',
                          data: reportData.weeklyRevenue.map(item => item.revenue),
                          backgroundColor: 'rgba(34, 197, 94, 0.8)',
                          borderColor: 'rgb(34, 197, 94)',
                          borderWidth: 1,
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          display: false,
                        },
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          ticks: {
                            callback: function(value) {
                              return formatCurrency(value);
                            },
                          },
                        },
                      },
                    }}
                  />
                ) : (
                  <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-500">Veri bulunamadı</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Hourly Occupancy Chart */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Saatlere Göre Doluluk</h3>
                <div className="flex space-x-2">
                  <button className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-lg">Bugün</button>
                  <button className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded-lg">Haftalık</button>
                </div>
              </div>
              <div className="space-y-3">
                {reportData.hourlyOccupancy && reportData.hourlyOccupancy.length > 0 ? (
                  reportData.hourlyOccupancy.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-medium text-gray-900 w-12">{item.hour}</span>
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${item.occupancy}%` }}
                          ></div>
                        </div>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{item.occupancy}%</span>
                    </div>
                  ))
                ) : (
                  <div className="h-32 flex items-center justify-center bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <Clock className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-500">Veri bulunamadı</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Customer Segments and Payment Methods */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Customer Segments */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Müşteri Segmentleri</h3>
                <button className="text-sm text-green-600 hover:text-green-700">Detaylar</button>
              </div>
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Toplam</span>
                  <span className="text-lg font-bold text-gray-900">{reportData.activeCustomers}</span>
                </div>
              </div>
              <div className="space-y-3">
                {reportData.customerSegments && reportData.customerSegments.length > 0 ? (
                  reportData.customerSegments.map((segment, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">{segment.name}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">{segment.percentage}% ({segment.count})</span>
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${segment.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500">Segment verisi bulunamadı</p>
                  </div>
                )}
              </div>
            </div>

            {/* Payment Methods */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Ödeme Yöntemleri Dağılımı</h3>
                <button className="text-sm text-green-600 hover:text-green-700">Detaylar</button>
              </div>
              <div className="h-64">
                {reportData.paymentMethods && reportData.paymentMethods.length > 0 ? (
                  <Doughnut
                    data={{
                      labels: reportData.paymentMethods.map(item => item.name),
                      datasets: [
                        {
                          data: reportData.paymentMethods.map(item => item.percentage),
                          backgroundColor: [
                            'rgba(34, 197, 94, 0.8)',
                            'rgba(59, 130, 246, 0.8)',
                            'rgba(249, 115, 22, 0.8)',
                            'rgba(156, 163, 175, 0.8)',
                          ],
                          borderColor: [
                            'rgb(34, 197, 94)',
                            'rgb(59, 130, 246)',
                            'rgb(249, 115, 22)',
                            'rgb(156, 163, 175)',
                          ],
                          borderWidth: 2,
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'bottom',
                          labels: {
                            padding: 20,
                            usePointStyle: true,
                          },
                        },
                      },
                    }}
                  />
                ) : (
                  <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-500">Veri bulunamadı</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Saha Performance and Top Customers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Saha Performance */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Saha Bazlı Performans</h3>
                  <div className="flex items-center space-x-2">
                    <select className="text-sm border border-gray-300 rounded-lg px-2 py-1">
                      <option>Tüm Sahalar</option>
                      <option>Saha 1</option>
                      <option>Saha 2</option>
                    </select>
                    <select className="text-sm border border-gray-300 rounded-lg px-2 py-1">
                      <option>Bu Ay</option>
                      <option>Bu Hafta</option>
                      <option>Bu Yıl</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Saha Adı</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rezervasyon</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gelir</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Doluluk</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ort. Fiyat</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">İptal</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Performans</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {reportData.sahaPerformance && reportData.sahaPerformance.length > 0 ? (
                      reportData.sahaPerformance.map((saha, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{saha.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{saha.reservations}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{formatCurrency(saha.revenue)}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">%{saha.occupancy}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{formatCurrency(saha.averagePrice)}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">%{saha.cancellationRate}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPerformanceColor(saha.performance)}`}>
                              {saha.performance}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7" className="px-4 py-12 text-center text-gray-500">
                          Saha performans verisi bulunamadı
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Top Customers */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">En Değerli Müşteriler</h3>
                  <button className="text-sm text-green-600 hover:text-green-700">Top 10</button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Müşteri</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Telefon</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rezervasyon</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Toplam Gelir</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Son Ziyaret</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Segment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {reportData.topCustomers && reportData.topCustomers.length > 0 ? (
                      reportData.topCustomers.map((customer, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{customer.rank}</td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{customer.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{formatPhoneNumber(customer.phone)}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{customer.reservations}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{formatCurrency(customer.totalSpent)}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {customer.lastVisit ? new Date(customer.lastVisit).toLocaleDateString('tr-TR') : '-'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              customer.segment === 'VIP' ? 'text-purple-600 bg-purple-100' :
                              customer.segment === 'Düzenli' ? 'text-blue-600 bg-blue-100' :
                              customer.segment === 'Haftalık' ? 'text-green-600 bg-green-100' :
                              'text-gray-600 bg-gray-100'
                            }`}>
                              {customer.segment}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7" className="px-4 py-12 text-center text-gray-500">
                          Müşteri verisi bulunamadı
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Export Options */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Rapor Export Seçenekleri</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <button className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <FileText className="w-8 h-8 text-red-600 mb-2" />
                <span className="text-sm font-medium text-gray-900">PDF</span>
              </button>
              <button className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <FileSpreadsheet className="w-8 h-8 text-green-600 mb-2" />
                <span className="text-sm font-medium text-gray-900">Excel</span>
              </button>
              <button className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <File className="w-8 h-8 text-blue-600 mb-2" />
                <span className="text-sm font-medium text-gray-900">CSV</span>
              </button>
              <button className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <Printer className="w-8 h-8 text-gray-600 mb-2" />
                <span className="text-sm font-medium text-gray-900">Yazdır</span>
              </button>
              <button className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <Mail className="w-8 h-8 text-purple-600 mb-2" />
                <span className="text-sm font-medium text-gray-900">Email ile Gönder</span>
              </button>
              <button className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <Save className="w-8 h-8 text-orange-600 mb-2" />
                <span className="text-sm font-medium text-gray-900">Şablon Olarak Kaydet</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Raporlar;
