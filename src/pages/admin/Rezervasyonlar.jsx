import React, { useState, useEffect } from 'react';
import { 
  getAllReservations,
  getReservationStats,
  getReservationDetails,
  getReservationActivityLogs,
  bulkUpdateReservationStatus,
  bulkDeleteReservations,
  updateReservationAdmin,
  deleteRezervasyon,
  logAdminAction,
  updateReservationStatus
} from '../../services/firestoreService';
import { useAuth } from '../../contexts/AuthContext';
import AdminSidebar from '../../components/AdminSidebar';
import Pagination from '../../components/Pagination';
import { 
  Calendar, 
  AlertCircle, 
  Filter, 
  Download, 
  Search, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  TrendingUp,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Users,
  CreditCard,
  FileText,
  Activity,
  X
} from 'lucide-react';
import { exportToCSV, exportToExcel, exportToPDF } from '../../utils/exportUtils';
import { collection, query, onSnapshot, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
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
  ArcElement,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
);

const Rezervasyonlar = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [reservations, setReservations] = useState([]);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  
  // Yeni state'ler
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState({
    status: '',
    dateFrom: '',
    dateTo: '',
    tesisId: '',
    minAmount: '',
    maxAmount: '',
    paymentStatus: ''
  });
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [editingReservation, setEditingReservation] = useState(null);
  const [deletingReservation, setDeletingReservation] = useState(null);
  const [activityLogs, setActivityLogs] = useState([]);
  const [allTesisler, setAllTesisler] = useState([]);
  const [activeTab, setActiveTab] = useState('info');

  useEffect(() => {
    loadReservations();
    loadStats();
    loadTesisler();
    setCurrentPage(1);

    let q = query(collection(db, 'rezervasyonlar'));
    
    if (filter !== 'all') {
      q = query(collection(db, 'rezervasyonlar'), where('status', '==', filter));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reservationsData = [];
      snapshot.forEach((doc) => {
        reservationsData.push({ id: doc.id, ...doc.data() });
      });
      setReservations(reservationsData);
    }, (error) => {
      console.error('Real-time listener hatası:', error);
    });

    return () => unsubscribe();
  }, [filter]);

  useEffect(() => {
    if (reservations.length > 0) {
      loadChartData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reservations]);

  useEffect(() => {
    if (selectedReservation) {
      loadActivityLogs(selectedReservation.id);
    }
  }, [selectedReservation]);

  const loadReservations = async () => {
    setLoading(true);
    setError(null);
    try {
      const filters = filter !== 'all' ? { status: filter } : {};
      const result = await getAllReservations(filters);
      if (result.success) {
        setReservations(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Rezervasyonlar yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const result = await getReservationStats();
      if (result.success) {
        setStats(result.data);
      }
    } catch (err) {
      console.error('İstatistikler yüklenirken hata:', err);
    }
  };

  const loadChartData = async () => {
    try {
      const result = await getReservationStats();
      if (result.success) {
        const data = result.data;
        
        // Durum dağılımı
        const statusData = {
          labels: ['Onaylanan', 'Bekleyen', 'İptal'],
          datasets: [{
            data: [data.confirmed, data.pending, data.cancelled],
            backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
            borderWidth: 0
          }]
        };

        // Son 30 gün trendi - gerçek verilerle
        const now = new Date();
        const dates = [];
        const counts = [];
        
        for (let i = 29; i >= 0; i--) {
          const date = new Date(now);
          date.setDate(date.getDate() - i);
          date.setHours(0, 0, 0, 0);
          dates.push(date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' }));
          
          // Bu tarihteki rezervasyon sayısını hesapla
          const count = reservations.filter(r => {
            const resDate = r.date?.toDate ? r.date.toDate() : new Date(r.date || 0);
            resDate.setHours(0, 0, 0, 0);
            return resDate.getTime() === date.getTime();
          }).length;
          
          counts.push(count);
        }

        const trendData = {
          labels: dates,
          datasets: [{
            label: 'Rezervasyon Sayısı',
            data: counts,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            fill: true,
            tension: 0.4
          }]
        };

        // Tesis bazlı dağılım (top 5)
        const tesisEntries = Object.entries(data.byTesis || {})
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5);
        
        const tesisData = {
          labels: tesisEntries.map(([name]) => name.length > 15 ? name.substring(0, 15) + '...' : name),
          datasets: [{
            label: 'Rezervasyon Sayısı',
            data: tesisEntries.map(([, count]) => count),
            backgroundColor: '#10b981',
            borderRadius: 8
          }]
        };

        setChartData({
          status: statusData,
          trend: trendData,
          tesis: tesisData
        });
      }
    } catch (err) {
      console.error('Grafik verileri yüklenirken hata:', err);
    }
  };

  const loadTesisler = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'tesisler'));
      const tesislerData = [];
      snapshot.forEach((doc) => {
        tesislerData.push({ id: doc.id, ...doc.data() });
      });
      setAllTesisler(tesislerData);
    } catch (err) {
      console.error('Tesisler yüklenirken hata:', err);
    }
  };

  const loadActivityLogs = async (reservationId) => {
    try {
      const result = await getReservationActivityLogs(reservationId);
      if (result.success) {
        setActivityLogs(result.data);
      }
    } catch (err) {
      console.error('Aktivite logları yüklenirken hata:', err);
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 ml-1 text-gray-400" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-4 h-4 ml-1 text-green-600" />
      : <ArrowDown className="w-4 h-4 ml-1 text-green-600" />;
  };

  const sortData = (data) => {
    if (!sortField) return data;
    
    return [...data].sort((a, b) => {
      let aValue, bValue;
      
      if (sortField === 'tesisName') {
        aValue = a.tesisName || '';
        bValue = b.tesisName || '';
      } else if (sortField === 'customerName') {
        const organizatorA = a.players?.find(p => p.status === 'organizator');
        const organizatorB = b.players?.find(p => p.status === 'organizator');
        aValue = organizatorA?.name || a.customerName || 'Müşteri';
        bValue = organizatorB?.name || b.customerName || 'Müşteri';
      } else if (sortField === 'date') {
        aValue = a.date?.toDate ? a.date.toDate() : new Date(a.date || 0);
        bValue = b.date?.toDate ? b.date.toDate() : new Date(b.date || 0);
      } else if (sortField === 'totalAmount') {
        aValue = a.totalAmount || a.price || 0;
        bValue = b.totalAmount || b.price || 0;
      } else if (sortField === 'status') {
        aValue = a.status || '';
        bValue = b.status || '';
      } else if (sortField === 'createdAt') {
        aValue = a.createdAt?.toDate?.() || new Date(0);
        bValue = b.createdAt?.toDate?.() || new Date(0);
      }
      
      if (aValue instanceof Date) {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      if (typeof aValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const applyAdvancedFilters = (data) => {
    return data.filter(reservation => {
      if (advancedFilters.status && reservation.status !== advancedFilters.status) return false;
      
      if (advancedFilters.dateFrom) {
        const resDate = reservation.date?.toDate ? reservation.date.toDate() : new Date(reservation.date || 0);
        const fromDate = new Date(advancedFilters.dateFrom);
        fromDate.setHours(0, 0, 0, 0);
        if (resDate < fromDate) return false;
      }
      
      if (advancedFilters.dateTo) {
        const resDate = reservation.date?.toDate ? reservation.date.toDate() : new Date(reservation.date || 0);
        const toDate = new Date(advancedFilters.dateTo);
        toDate.setHours(23, 59, 59, 999);
        if (resDate > toDate) return false;
      }
      
      if (advancedFilters.tesisId && reservation.tesisId !== advancedFilters.tesisId) return false;
      
      const amount = reservation.totalAmount || reservation.price || 0;
      if (advancedFilters.minAmount && amount < parseFloat(advancedFilters.minAmount)) return false;
      if (advancedFilters.maxAmount && amount > parseFloat(advancedFilters.maxAmount)) return false;
      
      if (advancedFilters.paymentStatus && reservation.paymentStatus !== advancedFilters.paymentStatus) return false;
      
      return true;
    });
  };

  const handleViewDetails = async (reservation) => {
    try {
      const result = await getReservationDetails(reservation.id);
      if (result.success) {
        setSelectedReservation(result.data);
        setActiveTab('info');
      }
    } catch (err) {
      setError('Rezervasyon detayları yüklenirken hata oluştu');
    }
  };

  const handleEdit = (reservation) => {
    setEditingReservation({ ...reservation });
  };

  // Rezervasyon onaylama süreci: Admin tarafından onaylanır, saha sahibi onaylamaz
  // Saha sahibi sadece rezervasyonları görüntüleyebilir ve yönetebilir
  const handleSaveEdit = async () => {
    try {
      // Undefined değerleri filtrele
      const updateData = {};
      if (editingReservation.date !== undefined && editingReservation.date !== null) {
        updateData.date = editingReservation.date;
      }
      if (editingReservation.timeSlot !== undefined && editingReservation.timeSlot !== null && editingReservation.timeSlot !== '') {
        updateData.timeSlot = editingReservation.timeSlot;
      }
      if (editingReservation.status !== undefined && editingReservation.status !== null) {
        updateData.status = editingReservation.status;
      }
      if (editingReservation.totalAmount !== undefined && editingReservation.totalAmount !== null) {
        updateData.totalAmount = editingReservation.totalAmount;
      }
      if (editingReservation.adminNotes !== undefined && editingReservation.adminNotes !== null && editingReservation.adminNotes !== '') {
        updateData.adminNotes = editingReservation.adminNotes;
      }

      const result = await updateReservationAdmin(editingReservation.id, updateData);
      
      if (result.success) {
        // Undefined değerleri filtrele
        const logDetails = {
          reservationId: editingReservation.id
        };
        if (updateData.date !== undefined) logDetails.date = updateData.date;
        if (updateData.timeSlot !== undefined) logDetails.timeSlot = updateData.timeSlot;
        if (updateData.status !== undefined) logDetails.status = updateData.status;
        if (updateData.totalAmount !== undefined) logDetails.totalAmount = updateData.totalAmount;
        if (updateData.adminNotes !== undefined) logDetails.adminNotes = updateData.adminNotes;

        await logAdminAction(user?.uid || 'admin', 'reservation_updated', logDetails);
        setSuccess('Rezervasyon başarıyla güncellendi.');
        setEditingReservation(null);
        loadReservations();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Rezervasyon güncellenirken hata oluştu');
    }
  };

  const handleDelete = async (reservationId) => {
    try {
      const result = await deleteRezervasyon(reservationId);
      if (result.success) {
        await logAdminAction(user?.uid || 'admin', 'reservation_deleted', {
          reservationId
        });
        setSuccess('Rezervasyon başarıyla silindi.');
        setDeletingReservation(null);
        loadReservations();
        loadStats();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Rezervasyon silinirken hata oluştu');
    }
  };

  const handleBulkStatusUpdate = async (status) => {
    if (selectedIds.length === 0) return;
    
    try {
      const result = await bulkUpdateReservationStatus(selectedIds, status);
      if (result.success) {
        await logAdminAction(user?.uid || 'admin', 'reservation_bulk_status_update', {
          count: selectedIds.length,
          status,
          reservationIds: selectedIds
        });
        setSuccess(`${selectedIds.length} rezervasyon durumu güncellendi.`);
        setSelectedIds([]);
        setSelectAll(false);
        loadReservations();
        loadStats();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Toplu durum güncelleme sırasında hata oluştu');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    
    try {
      const result = await bulkDeleteReservations(selectedIds);
      if (result.success) {
        await logAdminAction(user?.uid || 'admin', 'reservation_bulk_deleted', {
          count: selectedIds.length,
          reservationIds: selectedIds
        });
        setSuccess(`${selectedIds.length} rezervasyon başarıyla silindi.`);
        setSelectedIds([]);
        setSelectAll(false);
        loadReservations();
        loadStats();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Toplu silme sırasında hata oluştu');
    }
  };

  const handleToggleSelect = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleToggleSelectAll = () => {
    if (selectAll) {
      setSelectedIds([]);
      setSelectAll(false);
    } else {
      const filtered = getFilteredReservations();
      setSelectedIds(filtered.map(r => r.id));
      setSelectAll(true);
    }
  };

  const getFilteredReservations = () => {
    let filtered = reservations;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(reservation => {
        const organizator = reservation.players?.find(p => p.status === 'organizator');
        const customerName = organizator?.name || reservation.customerName || 'Müşteri';
        return (
          reservation.tesisName?.toLowerCase().includes(query) ||
          customerName.toLowerCase().includes(query)
        );
      });
    }
    
    if (showAdvancedFilters) {
      filtered = applyAdvancedFilters(filtered);
    }
    
    return sortData(filtered);
  };

  const handleExport = (format) => {
    const filteredReservations = getFilteredReservations();
    
    const headers = ['Tesis', 'Müşteri', 'Tarih', 'Saat', 'Oyuncu Sayısı', 'Tutar', 'Durum'];
    const rows = filteredReservations.map(r => {
      const organizator = r.players?.find(p => p.status === 'organizator');
      const customerName = organizator?.name || r.customerName || 'Müşteri';
      return [
        r.tesisName || 'Saha',
        customerName,
        (r.date?.toDate ? r.date.toDate() : new Date(r.date || 0)).toLocaleDateString('tr-TR'),
        r.timeSlot || '',
        r.totalPlayers || r.players?.length || 0,
        r.totalAmount || r.price || 0,
        r.status === 'confirmed' ? 'Onaylandı' : r.status === 'pending' ? 'Beklemede' : 'İptal'
      ];
    });
    
    if (format === 'csv') {
      exportToCSV(rows, headers, 'rezervasyonlar');
    } else if (format === 'excel') {
      exportToExcel(rows, headers, 'rezervasyonlar');
    } else if (format === 'pdf') {
      exportToPDF(rows, headers, 'Rezervasyon Listesi', 'rezervasyonlar');
    }
  };

  const clearAdvancedFilters = () => {
    setAdvancedFilters({
      status: '',
      dateFrom: '',
      dateTo: '',
      tesisId: '',
      minAmount: '',
      maxAmount: '',
      paymentStatus: ''
    });
  };

  if (loading && !stats) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  const filteredReservations = getFilteredReservations();
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedReservations = filteredReservations.slice(startIndex, endIndex);

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Tüm Rezervasyonlar</h1>
              <p className="text-gray-600 mt-1">Platform rezervasyonlarını görüntüle ve yönet</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Tesis, müşteri ara..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 w-64"
                />
              </div>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              >
                <option value="all">Tümü</option>
                <option value="confirmed">Onaylananlar</option>
                <option value="pending">Bekleyenler</option>
                <option value="cancelled">İptal Edilenler</option>
              </select>
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={`flex items-center space-x-2 px-4 py-2 border rounded-lg ${
                  showAdvancedFilters 
                    ? 'bg-green-50 border-green-500 text-green-700' 
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Filter className="w-4 h-4" />
                <span>Gelişmiş Filtre</span>
                {showAdvancedFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              <div className="relative group">
                <button className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                  <Download className="w-4 h-4" />
                  <span>Dışa Aktar</span>
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                  <button
                    onClick={() => handleExport('csv')}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-t-lg"
                  >
                    CSV olarak indir
                  </button>
                  <button
                    onClick={() => handleExport('excel')}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Excel olarak indir
                  </button>
                  <button
                    onClick={() => handleExport('pdf')}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-b-lg"
                  >
                    PDF olarak indir
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>
        <div className="flex-1 p-6 overflow-y-auto">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
              <AlertCircle className="w-5 h-5 mr-2" />
              {error}
            </div>
          )}
          {success && (
            <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center">
              <CheckCircle className="w-5 h-5 mr-2" />
              {success}
            </div>
          )}

          {/* İstatistik Kartları */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Toplam Rezervasyon</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Onaylanan</p>
                    <p className="text-2xl font-bold text-green-600">{stats.confirmed}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Bekleyen</p>
                    <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                  </div>
                  <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-6 h-6 text-yellow-600" />
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Toplam Gelir</p>
                    <p className="text-2xl font-bold text-gray-900">₺{stats.totalRevenue.toLocaleString('tr-TR')}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Bugünkü</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.today}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Bu Ay</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.thisMonth}</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">İptal Edilen</p>
                    <p className="text-2xl font-bold text-red-600">{stats.cancelled}</p>
                  </div>
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                    <XCircle className="w-6 h-6 text-red-600" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Grafikler */}
          {chartData && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Durum Dağılımı</h3>
                <Doughnut data={chartData.status} options={{
                  responsive: true,
                  maintainAspectRatio: true,
                  plugins: {
                    legend: {
                      position: 'bottom'
                    }
                  }
                }} />
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 lg:col-span-2">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Son 30 Gün Trendi</h3>
                <Line data={chartData.trend} options={{
                  responsive: true,
                  maintainAspectRatio: true,
                  plugins: {
                    legend: {
                      display: false
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true
                    }
                  }
                }} />
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 lg:col-span-3">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">En Çok Rezervasyon Olan Tesisler (Top 5)</h3>
                <Bar data={chartData.tesis} options={{
                  responsive: true,
                  maintainAspectRatio: true,
                  plugins: {
                    legend: {
                      display: false
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true
                    }
                  }
                }} />
              </div>
            </div>
          )}

          {/* Gelişmiş Filtreler */}
          {showAdvancedFilters && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Durum</label>
                  <select
                    value={advancedFilters.status}
                    onChange={(e) => setAdvancedFilters({ ...advancedFilters, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Tümü</option>
                    <option value="confirmed">Onaylanan</option>
                    <option value="pending">Bekleyen</option>
                    <option value="cancelled">İptal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Başlangıç Tarihi</label>
                  <input
                    type="date"
                    value={advancedFilters.dateFrom}
                    onChange={(e) => setAdvancedFilters({ ...advancedFilters, dateFrom: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bitiş Tarihi</label>
                  <input
                    type="date"
                    value={advancedFilters.dateTo}
                    onChange={(e) => setAdvancedFilters({ ...advancedFilters, dateTo: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tesis</label>
                  <select
                    value={advancedFilters.tesisId}
                    onChange={(e) => setAdvancedFilters({ ...advancedFilters, tesisId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Tümü</option>
                    {allTesisler.map(tesis => (
                      <option key={tesis.id} value={tesis.id}>{tesis.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Min Tutar</label>
                  <input
                    type="number"
                    value={advancedFilters.minAmount}
                    onChange={(e) => setAdvancedFilters({ ...advancedFilters, minAmount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Max Tutar</label>
                  <input
                    type="number"
                    value={advancedFilters.maxAmount}
                    onChange={(e) => setAdvancedFilters({ ...advancedFilters, maxAmount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="10000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ödeme Durumu</label>
                  <select
                    value={advancedFilters.paymentStatus}
                    onChange={(e) => setAdvancedFilters({ ...advancedFilters, paymentStatus: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Tümü</option>
                    <option value="paid">Ödendi</option>
                    <option value="pending">Beklemede</option>
                    <option value="failed">Başarısız</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={clearAdvancedFilters}
                    className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Filtreleri Temizle
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Toplu İşlemler */}
          {selectedIds.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center justify-between">
              <span className="text-green-700 font-medium">{selectedIds.length} rezervasyon seçildi</span>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleBulkStatusUpdate('confirmed')}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                >
                  Toplu Onayla
                </button>
                <button
                  onClick={() => handleBulkStatusUpdate('cancelled')}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                >
                  Toplu İptal Et
                </button>
                <button
                  onClick={() => handleBulkDelete()}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                >
                  Toplu Sil
                </button>
              </div>
            </div>
          )}

          {/* Tablo */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectAll}
                        onChange={handleToggleSelectAll}
                        className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                      />
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('tesisName')}
                    >
                      <div className="flex items-center">
                        Tesis
                        {getSortIcon('tesisName')}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('customerName')}
                    >
                      <div className="flex items-center">
                        Müşteri
                        {getSortIcon('customerName')}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('date')}
                    >
                      <div className="flex items-center">
                        Tarih & Saat
                        {getSortIcon('date')}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Oyuncu Sayısı</th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('totalAmount')}
                    >
                      <div className="flex items-center">
                        Tutar
                        {getSortIcon('totalAmount')}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center">
                        Durum
                        {getSortIcon('status')}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedReservations.length > 0 ? (
                    paginatedReservations.map((reservation) => {
                      const organizator = reservation.players?.find(p => p.status === 'organizator');
                      const customerName = organizator?.name || reservation.customerName || 'Müşteri';
                      
                      return (
                        <tr key={reservation.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(reservation.id)}
                              onChange={() => handleToggleSelect(reservation.id)}
                              className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {reservation.tesisName || 'Saha'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {customerName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {(reservation.date?.toDate ? reservation.date.toDate() : new Date(reservation.date || 0)).toLocaleDateString('tr-TR')} • {reservation.timeSlot || 'Saat belirtilmemiş'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {reservation.totalPlayers || reservation.players?.length || 0} kişi
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            ₺{reservation.totalAmount || reservation.price || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              reservation.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                              reservation.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {reservation.status === 'confirmed' ? 'Onaylandı' :
                               reservation.status === 'pending' ? 'Beklemede' : 'İptal'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleViewDetails(reservation)}
                                className="text-gray-600 hover:text-gray-900"
                                title="Detaylar"
                              >
                                <Eye className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => handleEdit(reservation)}
                                className="text-gray-600 hover:text-gray-900"
                                title="Düzenle"
                              >
                                <Edit className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => setDeletingReservation(reservation)}
                                className="text-gray-600 hover:text-gray-900"
                                title="Sil"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                        <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p>Rezervasyon bulunamadı</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {filteredReservations.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil(filteredReservations.length / itemsPerPage)}
                onPageChange={setCurrentPage}
                itemsPerPage={itemsPerPage}
                onItemsPerPageChange={(value) => {
                  setItemsPerPage(value);
                  setCurrentPage(1);
                }}
                totalItems={filteredReservations.length}
              />
            )}
          </div>
        </div>
      </div>

      {/* Detay Modal */}
      {selectedReservation && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-slideUp">
            <div className="p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">Rezervasyon Detayları</h3>
                <button
                  onClick={() => {
                    setSelectedReservation(null);
                    setActivityLogs([]);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="flex space-x-4 mt-4 border-b border-gray-200">
                <button
                  onClick={() => setActiveTab('info')}
                  className={`pb-2 px-2 text-sm font-medium ${
                    activeTab === 'info' 
                      ? 'text-green-600 border-b-2 border-green-600' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Bilgiler
                </button>
                <button
                  onClick={() => setActiveTab('players')}
                  className={`pb-2 px-2 text-sm font-medium ${
                    activeTab === 'players' 
                      ? 'text-green-600 border-b-2 border-green-600' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Oyuncular
                </button>
                <button
                  onClick={() => setActiveTab('payment')}
                  className={`pb-2 px-2 text-sm font-medium ${
                    activeTab === 'payment' 
                      ? 'text-green-600 border-b-2 border-green-600' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Ödeme
                </button>
                <button
                  onClick={() => setActiveTab('activity')}
                  className={`pb-2 px-2 text-sm font-medium ${
                    activeTab === 'activity' 
                      ? 'text-green-600 border-b-2 border-green-600' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Aktivite
                </button>
              </div>
            </div>
            <div className="p-6">
              {activeTab === 'info' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Tesis</p>
                      <p className="text-lg font-semibold text-gray-900">{selectedReservation.tesisName || 'Saha'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Müşteri</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {selectedReservation.players?.find(p => p.status === 'organizator')?.name || selectedReservation.customerName || 'Müşteri'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Tarih</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {(selectedReservation.date?.toDate ? selectedReservation.date.toDate() : new Date(selectedReservation.date || 0)).toLocaleDateString('tr-TR')}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Saat</p>
                      <p className="text-lg font-semibold text-gray-900">{selectedReservation.timeSlot || 'Belirtilmemiş'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Oyuncu Sayısı</p>
                      <p className="text-lg font-semibold text-gray-900">{selectedReservation.totalPlayers || selectedReservation.players?.length || 0} kişi</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Tutar</p>
                      <p className="text-lg font-semibold text-gray-900">₺{selectedReservation.totalAmount || selectedReservation.price || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Durum</p>
                      <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                        selectedReservation.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                        selectedReservation.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {selectedReservation.status === 'confirmed' ? 'Onaylandı' :
                         selectedReservation.status === 'pending' ? 'Beklemede' : 'İptal'}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Oluşturulma</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {selectedReservation.createdAt?.toDate?.()?.toLocaleDateString('tr-TR') || 'Bilinmiyor'}
                      </p>
                    </div>
                  </div>
                  {selectedReservation.adminNotes && (
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Admin Notu</p>
                      <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">{selectedReservation.adminNotes}</p>
                    </div>
                  )}
                </div>
              )}
              {activeTab === 'players' && (
                <div className="space-y-4">
                  {selectedReservation.players && selectedReservation.players.length > 0 ? (
                    <div className="space-y-2">
                      {selectedReservation.players.map((player, index) => (
                        <div key={index} className="bg-gray-50 p-4 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-gray-900">{player.name || 'Oyuncu'}</p>
                              {player.email && <p className="text-sm text-gray-600">{player.email}</p>}
                            </div>
                            {player.status === 'organizator' && (
                              <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded-full">
                                Organizatör
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">Oyuncu bilgisi bulunamadı</p>
                  )}
                </div>
              )}
              {activeTab === 'payment' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Ödeme Yöntemi</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {selectedReservation.paymentMethod || 'Belirtilmemiş'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Ödeme Durumu</p>
                      <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                        selectedReservation.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' :
                        selectedReservation.paymentStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {selectedReservation.paymentStatus === 'paid' ? 'Ödendi' :
                         selectedReservation.paymentStatus === 'pending' ? 'Beklemede' : 'Başarısız'}
                      </span>
                    </div>
                    {selectedReservation.transactionId && (
                      <div>
                        <p className="text-sm text-gray-600">İşlem ID</p>
                        <p className="text-lg font-semibold text-gray-900">{selectedReservation.transactionId}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {activeTab === 'activity' && (
                <div className="space-y-4">
                  {activityLogs.length > 0 ? (
                    <div className="space-y-2">
                      {activityLogs.map((log) => (
                        <div key={log.id} className="bg-gray-50 p-4 rounded-lg">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-semibold text-gray-900">{log.action}</p>
                              {log.details && (
                                <p className="text-sm text-gray-600 mt-1">{JSON.stringify(log.details, null, 2)}</p>
                              )}
                            </div>
                            <p className="text-xs text-gray-500">
                              {log.createdAt?.toDate ? log.createdAt.toDate().toLocaleString('tr-TR') : 'Bilinmiyor'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">Aktivite logu bulunamadı</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Düzenleme Modal */}
      {editingReservation && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full animate-slideUp">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">Rezervasyon Düzenle</h3>
                <button
                  onClick={() => setEditingReservation(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tarih</label>
                <input
                  type="date"
                  value={editingReservation.date?.toDate ? editingReservation.date.toDate().toISOString().split('T')[0] : editingReservation.date || ''}
                  onChange={(e) => setEditingReservation({ ...editingReservation, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Saat</label>
                <input
                  type="text"
                  value={editingReservation.timeSlot || ''}
                  onChange={(e) => setEditingReservation({ ...editingReservation, timeSlot: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="Örn: 10:00 - 11:00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Durum</label>
                <select
                  value={editingReservation.status || ''}
                  onChange={(e) => setEditingReservation({ ...editingReservation, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="pending">Beklemede</option>
                  <option value="confirmed">Onaylandı</option>
                  <option value="cancelled">İptal</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tutar</label>
                <input
                  type="number"
                  value={editingReservation.totalAmount || editingReservation.price || ''}
                  onChange={(e) => setEditingReservation({ ...editingReservation, totalAmount: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Admin Notu</label>
                <textarea
                  value={editingReservation.adminNotes || ''}
                  onChange={(e) => setEditingReservation({ ...editingReservation, adminNotes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  rows="3"
                  placeholder="Admin notu ekleyin..."
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setEditingReservation(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  İptal
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Kaydet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Silme Onay Modal */}
      {deletingReservation && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full animate-slideUp">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">Rezervasyonu Sil</h3>
                <button
                  onClick={() => setDeletingReservation(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600 mb-2">
                <strong>{deletingReservation.tesisName || 'Rezervasyon'}</strong> rezervasyonunu silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setDeletingReservation(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  İptal
                </button>
                <button
                  onClick={() => handleDelete(deletingReservation.id)}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Sil
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Rezervasyonlar;
