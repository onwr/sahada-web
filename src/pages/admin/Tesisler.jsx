import React, { useState, useEffect } from 'react';
import { 
  getAllTesislerAdmin, 
  updateTesisStatus, 
  getUserData, 
  logAdminAction,
  getTesisStats,
  getTesisReservations,
  getTesisRevenue,
  getTesisActivityLogs,
  bulkDeleteTesis,
  bulkUpdateTesis,
  updateTesis,
  deleteTesis
} from '../../services/firestoreService';
import { useAuth } from '../../contexts/AuthContext';
import AdminSidebar from '../../components/AdminSidebar';
import Pagination from '../../components/Pagination';
import { 
  Building2, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye, 
  AlertCircle, 
  MapPin, 
  Phone, 
  Mail, 
  Search, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Download, 
  Trash2,
  Edit,
  Filter,
  ChevronDown,
  ChevronUp,
  Calendar,
  DollarSign,
  BarChart3,
  TrendingUp,
  Activity,
  Image as ImageIcon,
  FileText
} from 'lucide-react';
import { exportToCSV, exportToExcel, exportToPDF } from '../../utils/exportUtils';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
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

const Tesisler = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tesisler, setTesisler] = useState([]);
  const [filter, setFilter] = useState('all');
  const [selectedTesis, setSelectedTesis] = useState(null);
  const [ownerData, setOwnerData] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');
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
    city: '',
    district: '',
    type: '',
    dateFrom: '',
    dateTo: '',
    priceMin: '',
    priceMax: ''
  });
  const [editingTesis, setEditingTesis] = useState(null);
  const [deletingTesis, setDeletingTesis] = useState(null);
  const [activeTab, setActiveTab] = useState('info');
  const [tesisReservations, setTesisReservations] = useState([]);
  const [tesisRevenue, setTesisRevenue] = useState(null);
  const [activityLogs, setActivityLogs] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    loadTesisler();
    loadStats();
    setCurrentPage(1);

    const filters = filter !== 'all' ? { status: filter } : {};
    let q = query(collection(db, 'tesisler'));
    
    if (filter !== 'all') {
      q = query(collection(db, 'tesisler'), where('status', '==', filter));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tesislerData = [];
      snapshot.forEach((doc) => {
        tesislerData.push({ id: doc.id, ...doc.data() });
      });
      setTesisler(tesislerData);
      loadStats(); // İstatistikleri güncelle
    }, (error) => {
      console.error('Real-time listener hatası:', error);
    });

    return () => unsubscribe();
  }, [filter]);

  useEffect(() => {
    if (tesisler.length > 0) {
      prepareChartData();
    }
  }, [tesisler]);

  const loadTesisler = async () => {
    setLoading(true);
    setError(null);

    try {
      const filters = filter !== 'all' ? { status: filter } : {};
      const result = await getAllTesislerAdmin(filters);

      if (result.success) {
        setTesisler(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error('Tesisler yükleme hatası:', err);
      setError('Tesisler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const result = await getTesisStats();
      if (result.success) {
        setStats(result.data);
      }
    } catch (err) {
      console.error('İstatistikler yükleme hatası:', err);
    }
  };

  const prepareChartData = () => {
    const now = new Date();
    const last30Days = [];
    const dailyCounts = {};
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const dateKey = date.toISOString().split('T')[0];
      last30Days.push(dateKey);
      dailyCounts[dateKey] = 0;
    }

    tesisler.forEach(tesis => {
      const createdAt = tesis.createdAt?.toDate ? tesis.createdAt.toDate() : new Date(tesis.createdAt || 0);
      createdAt.setHours(0, 0, 0, 0);
      const dateKey = createdAt.toISOString().split('T')[0];
      if (dailyCounts.hasOwnProperty(dateKey)) {
        dailyCounts[dateKey]++;
      }
    });

    const statusCounts = {
      pending: tesisler.filter(t => t.status === 'pending').length,
      approved: tesisler.filter(t => t.status === 'approved' || t.status === 'active').length,
      rejected: tesisler.filter(t => t.status === 'rejected').length
    };

    const cityCounts = {};
    tesisler.forEach(tesis => {
      const city = tesis.city || 'Bilinmiyor';
      cityCounts[city] = (cityCounts[city] || 0) + 1;
    });

    const topCities = Object.entries(cityCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    setChartData({
      statusDistribution: {
        labels: ['Onay Bekleyen', 'Onaylanan', 'Reddedilen'],
        datasets: [{
          data: [statusCounts.pending, statusCounts.approved, statusCounts.rejected],
          backgroundColor: [
            'rgba(251, 191, 36, 0.8)',
            'rgba(34, 197, 94, 0.8)',
            'rgba(239, 68, 68, 0.8)'
          ],
          borderColor: [
            'rgb(251, 191, 36)',
            'rgb(34, 197, 94)',
            'rgb(239, 68, 68)'
          ],
          borderWidth: 2
        }]
      },
      dailyTrend: {
        labels: last30Days.map(date => {
          const d = new Date(date);
          return `${d.getDate()}/${d.getMonth() + 1}`;
        }),
        datasets: [{
          label: 'Eklenen Tesisler',
          data: last30Days.map(date => dailyCounts[date] || 0),
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4
        }]
      },
      cityDistribution: {
        labels: topCities.map(([city]) => city),
        datasets: [{
          label: 'Tesis Sayısı',
          data: topCities.map(([, count]) => count),
          backgroundColor: 'rgba(16, 185, 129, 0.8)',
          borderColor: 'rgb(16, 185, 129)',
          borderWidth: 2,
          borderRadius: 8
        }]
      }
    });
  };

  const handleStatusUpdate = async (tesisId, status) => {
    try {
      const result = await updateTesisStatus(tesisId, status, adminNotes);
      if (result.success) {
        const tesis = tesisler.find(t => t.id === tesisId);
        await logAdminAction(user?.uid || 'admin', `tesis_${status}`, {
          tesisId,
          tesisName: tesis?.name || 'Bilinmiyor',
          notes: adminNotes
        });
        setSuccess(`Tesis ${status === 'approved' ? 'onaylandı' : 'reddedildi'}`);
        setAdminNotes('');
        setSelectedTesis(null);
        loadTesisler();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error('Durum güncelleme hatası:', err);
      setError('Durum güncellenirken hata oluştu');
    }
  };

  const handleViewDetails = async (tesis) => {
    setSelectedTesis(tesis);
    setAdminNotes('');
    setActiveTab('info');
    setLoadingDetails(true);
    setTesisReservations([]);
    setTesisRevenue(null);
    setActivityLogs([]);
    
    if (tesis.ownerId) {
      try {
        const ownerResult = await getUserData(tesis.ownerId);
        if (ownerResult.success) {
          setOwnerData(ownerResult.data);
        }
      } catch (err) {
        console.error('Sahibi bilgisi yükleme hatası:', err);
      }
    }

    // Rezervasyonları yükle
    try {
      const resResult = await getTesisReservations(tesis.id);
      if (resResult.success) {
        setTesisReservations(resResult.data);
      }
    } catch (err) {
      console.error('Rezervasyonlar yükleme hatası:', err);
    }

    // Gelir bilgilerini yükle
    try {
      const revResult = await getTesisRevenue(tesis.id);
      if (revResult.success) {
        setTesisRevenue(revResult.data);
      }
    } catch (err) {
      console.error('Gelir bilgileri yükleme hatası:', err);
    }

    // Aktivite loglarını yükle
    try {
      const logsResult = await getTesisActivityLogs(tesis.id);
      if (logsResult.success) {
        setActivityLogs(logsResult.data);
      }
    } catch (err) {
      console.error('Aktivite logları yükleme hatası:', err);
    }

    setLoadingDetails(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
      case 'active':
        return 'bg-gradient-to-r from-green-500 to-emerald-500 text-white';
      case 'pending':
        return 'bg-gradient-to-r from-yellow-400 to-amber-500 text-white';
      case 'rejected':
        return 'bg-gradient-to-r from-red-500 to-rose-500 text-white';
      default:
        return 'bg-gradient-to-r from-gray-400 to-gray-500 text-white';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'approved':
      case 'active':
        return 'Onaylandı';
      case 'pending':
        return 'Beklemede';
      case 'rejected':
        return 'Reddedildi';
      default:
        return 'Bilinmiyor';
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
      let aValue = a[sortField];
      let bValue = b[sortField];
      
      if (sortField === 'name') {
        aValue = a.name || '';
        bValue = b.name || '';
      } else if (sortField === 'ownerName') {
        aValue = a.ownerName || '';
        bValue = b.ownerName || '';
      } else if (sortField === 'city') {
        aValue = `${a.city || ''} / ${a.district || ''}`;
        bValue = `${b.city || ''} / ${b.district || ''}`;
      } else if (sortField === 'status') {
        aValue = getStatusText(a.status);
        bValue = getStatusText(b.status);
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

  const handleExport = (format) => {
    const filteredTesisler = tesisler.filter(tesis => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        tesis.name?.toLowerCase().includes(query) ||
        tesis.ownerName?.toLowerCase().includes(query) ||
        tesis.city?.toLowerCase().includes(query) ||
        tesis.district?.toLowerCase().includes(query) ||
        tesis.address?.toLowerCase().includes(query)
      );
    });
    
    const headers = ['Tesis Adı', 'Tip', 'Sahibi', 'Konum', 'Durum', 'Telefon'];
    const rows = filteredTesisler.map(t => [
      t.name || '',
      t.type || 'Halı Saha',
      t.ownerName || 'Bilinmiyor',
      `${t.city || 'İstanbul'} / ${t.district || 'İlçe'}`,
      getStatusText(t.status),
      t.phone || ''
    ]);
    
    if (format === 'csv') {
      exportToCSV(rows, headers, 'tesisler');
    } else if (format === 'excel') {
      exportToExcel(rows, headers, 'tesisler');
    } else if (format === 'pdf') {
      exportToPDF(rows, headers, 'Tesis Listesi', 'tesisler');
    }
  };

  const handleSelectAll = (checked) => {
    setSelectAll(checked);
    if (checked) {
      const filteredTesisler = getFilteredTesisler();
      const sortedTesisler = sortData(filteredTesisler);
      setSelectedIds(sortedTesisler.map(t => t.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectItem = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(selectedId => selectedId !== id)
        : [...prev, id]
    );
  };

  const handleBulkStatusUpdate = async (status) => {
    if (selectedIds.length === 0) return;
    
    try {
      const promises = selectedIds.map(id => updateTesisStatus(id, status, 'Toplu işlem'));
      await Promise.all(promises);
      await logAdminAction(user?.uid || 'admin', `tesis_bulk_${status}`, {
        count: selectedIds.length,
        tesisIds: selectedIds
      });
      setSuccess(`${selectedIds.length} tesis ${status === 'approved' ? 'onaylandı' : 'reddedildi'}`);
      setSelectedIds([]);
      setSelectAll(false);
      loadTesisler();
      loadStats();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Toplu işlem hatası:', err);
      setError('Toplu işlem sırasında hata oluştu');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    
    if (!window.confirm(`${selectedIds.length} tesis silinecek. Emin misiniz?`)) {
      return;
    }
    
    try {
      const result = await bulkDeleteTesis(selectedIds);
      if (result.success) {
        await logAdminAction(user?.uid || 'admin', 'tesis_bulk_delete', {
          count: selectedIds.length,
          tesisIds: selectedIds
        });
        setSuccess(`${selectedIds.length} tesis silindi`);
        setSelectedIds([]);
        setSelectAll(false);
        loadTesisler();
        loadStats();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error('Toplu silme hatası:', err);
      setError('Toplu silme sırasında hata oluştu');
    }
  };

  const handleEditTesis = async (tesisData) => {
    if (!editingTesis) return;
    
    try {
      const result = await updateTesis(editingTesis.id, tesisData);
      if (result.success) {
        await logAdminAction(user?.uid || 'admin', 'tesis_edit', {
          tesisId: editingTesis.id,
          tesisName: editingTesis.name,
          changes: tesisData
        });
        setSuccess('Tesis güncellendi');
        setEditingTesis(null);
        loadTesisler();
        loadStats();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error('Tesis güncelleme hatası:', err);
      setError('Tesis güncellenirken hata oluştu');
    }
  };

  const handleDeleteTesis = async () => {
    if (!deletingTesis) return;
    
    try {
      const result = await deleteTesis(deletingTesis.id);
      if (result.success) {
        await logAdminAction(user?.uid || 'admin', 'tesis_delete', {
          tesisId: deletingTesis.id,
          tesisName: deletingTesis.name
        });
        setSuccess('Tesis silindi');
        setDeletingTesis(null);
        setSelectedTesis(null);
        loadTesisler();
        loadStats();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error('Tesis silme hatası:', err);
      setError('Tesis silinirken hata oluştu');
    }
  };

  const getFilteredTesisler = () => {
    let filtered = [...tesisler];

    // Arama sorgusu
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(tesis =>
        tesis.name?.toLowerCase().includes(query) ||
        tesis.ownerName?.toLowerCase().includes(query) ||
        tesis.city?.toLowerCase().includes(query) ||
        tesis.district?.toLowerCase().includes(query) ||
        tesis.address?.toLowerCase().includes(query)
      );
    }

    // Gelişmiş filtreler
    if (advancedFilters.city) {
      filtered = filtered.filter(t => t.city === advancedFilters.city);
    }
    if (advancedFilters.district) {
      filtered = filtered.filter(t => t.district === advancedFilters.district);
    }
    if (advancedFilters.type) {
      filtered = filtered.filter(t => t.type === advancedFilters.type);
    }
    if (advancedFilters.dateFrom) {
      const fromDate = new Date(advancedFilters.dateFrom);
      filtered = filtered.filter(t => {
        const createdAt = t.createdAt?.toDate ? t.createdAt.toDate() : new Date(t.createdAt || 0);
        return createdAt >= fromDate;
      });
    }
    if (advancedFilters.dateTo) {
      const toDate = new Date(advancedFilters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(t => {
        const createdAt = t.createdAt?.toDate ? t.createdAt.toDate() : new Date(t.createdAt || 0);
        return createdAt <= toDate;
      });
    }
    if (advancedFilters.priceMin) {
      filtered = filtered.filter(t => (t.price || 0) >= parseFloat(advancedFilters.priceMin));
    }
    if (advancedFilters.priceMax) {
      filtered = filtered.filter(t => (t.price || 0) <= parseFloat(advancedFilters.priceMax));
    }

    return filtered;
  };

  const getUniqueCities = () => {
    const cities = new Set();
    tesisler.forEach(t => {
      if (t.city) cities.add(t.city);
    });
    return Array.from(cities).sort();
  };

  const getDistrictsForCity = (city) => {
    const districts = new Set();
    tesisler.filter(t => t.city === city).forEach(t => {
      if (t.district) districts.add(t.district);
    });
    return Array.from(districts).sort();
  };

  const getUniqueTypes = () => {
    const types = new Set();
    tesisler.forEach(t => {
      if (t.type) types.add(t.type);
    });
    return Array.from(types).sort();
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
        <header className="bg-gradient-to-r from-white to-gray-50 shadow-lg border-b border-gray-200 px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <Building2 className="w-6 h-6 text-green-600" />
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Tesis Yönetimi</h1>
              </div>
              <p className="text-gray-600 text-sm font-medium">Tüm tesisleri görüntüle ve yönet</p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Tesis adı, sahibi, konum ara..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-12 pr-4 py-2.5 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white shadow-sm transition-all duration-150 w-72"
                />
              </div>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-4 py-2.5 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white shadow-sm font-medium text-gray-700 transition-all duration-150"
              >
                <option value="all">Tümü</option>
                <option value="pending">Onay Bekleyenler</option>
                <option value="approved">Onaylananlar</option>
                <option value="rejected">Reddedilenler</option>
              </select>
              <div className="relative group">
                <button className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105">
                  <Download className="w-5 h-5" />
                  <span>Dışa Aktar</span>
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
            </div>
          </div>
          {filter !== 'all' && (
            <div className="mt-4 flex items-center space-x-2">
              <span className="text-sm text-gray-600 font-medium">Filtre:</span>
              <span className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 text-xs font-bold rounded-full">
                {filter === 'pending' ? 'Onay Bekleyenler' : filter === 'approved' ? 'Onaylananlar' : 'Reddedilenler'}
                <button
                  onClick={() => setFilter('all')}
                  className="ml-2 text-green-600 hover:text-green-800"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </span>
            </div>
          )}
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">TOPLAM</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>
              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">BEKLEYEN</p>
                    <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                  </div>
                  <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-6 h-6 text-yellow-600" />
                  </div>
                </div>
              </div>
              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">ONAYLANAN</p>
                    <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>
              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">REDDEDİLEN</p>
                    <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
                  </div>
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                    <XCircle className="w-6 h-6 text-red-600" />
                  </div>
                </div>
              </div>
              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">BU AY</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.thisMonth}</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </div>
              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">ŞEHİRLER</p>
                    <p className="text-2xl font-bold text-gray-900">{Object.keys(stats.byCity).length}</p>
                  </div>
                  <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-indigo-600" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Grafikler */}
          {chartData && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Durum Dağılımı</h3>
                <div className="h-64">
                  <Doughnut 
                    data={chartData.statusDistribution}
                    options={{
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'bottom'
                        }
                      }
                    }}
                  />
                </div>
              </div>
              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Son 30 Gün Trendi</h3>
                <div className="h-64">
                  <Line 
                    data={chartData.dailyTrend}
                    options={{
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
              </div>
              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Şehir Dağılımı</h3>
                <div className="h-64">
                  <Bar 
                    data={chartData.cityDistribution}
                    options={{
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
              </div>
            </div>
          )}

          {/* Gelişmiş Filtreleme */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <Filter className="w-5 h-5 text-gray-600" />
                <span className="font-semibold text-gray-900">Gelişmiş Filtreleme</span>
              </div>
              {showAdvancedFilters ? (
                <ChevronUp className="w-5 h-5 text-gray-600" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-600" />
              )}
            </button>
            {showAdvancedFilters && (
              <div className="px-6 pb-6 border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Şehir</label>
                    <select
                      value={advancedFilters.city}
                      onChange={(e) => {
                        setAdvancedFilters({ ...advancedFilters, city: e.target.value, district: '' });
                        setCurrentPage(1);
                      }}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    >
                      <option value="">Tümü</option>
                      {getUniqueCities().map(city => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">İlçe</label>
                    <select
                      value={advancedFilters.district}
                      onChange={(e) => {
                        setAdvancedFilters({ ...advancedFilters, district: e.target.value });
                        setCurrentPage(1);
                      }}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      disabled={!advancedFilters.city}
                    >
                      <option value="">Tümü</option>
                      {advancedFilters.city && getDistrictsForCity(advancedFilters.city).map(district => (
                        <option key={district} value={district}>{district}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tesis Tipi</label>
                    <select
                      value={advancedFilters.type}
                      onChange={(e) => {
                        setAdvancedFilters({ ...advancedFilters, type: e.target.value });
                        setCurrentPage(1);
                      }}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    >
                      <option value="">Tümü</option>
                      {getUniqueTypes().map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Başlangıç Tarihi</label>
                    <input
                      type="date"
                      value={advancedFilters.dateFrom}
                      onChange={(e) => {
                        setAdvancedFilters({ ...advancedFilters, dateFrom: e.target.value });
                        setCurrentPage(1);
                      }}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Bitiş Tarihi</label>
                    <input
                      type="date"
                      value={advancedFilters.dateTo}
                      onChange={(e) => {
                        setAdvancedFilters({ ...advancedFilters, dateTo: e.target.value });
                        setCurrentPage(1);
                      }}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Min Fiyat</label>
                      <input
                        type="number"
                        value={advancedFilters.priceMin}
                        onChange={(e) => {
                          setAdvancedFilters({ ...advancedFilters, priceMin: e.target.value });
                          setCurrentPage(1);
                        }}
                        placeholder="₺0"
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Max Fiyat</label>
                      <input
                        type="number"
                        value={advancedFilters.priceMax}
                        onChange={(e) => {
                          setAdvancedFilters({ ...advancedFilters, priceMax: e.target.value });
                          setCurrentPage(1);
                        }}
                        placeholder="₺∞"
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => {
                      setAdvancedFilters({
                        city: '',
                        district: '',
                        type: '',
                        dateFrom: '',
                        dateTo: '',
                        priceMin: '',
                        priceMax: ''
                      });
                      setCurrentPage(1);
                    }}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg border border-gray-300"
                  >
                    Filtreleri Temizle
                  </button>
                </div>
              </div>
            )}
          </div>

          {selectedIds.length > 0 && (
            <div className="mb-6 bg-blue-50 border border-blue-200 px-4 py-3 rounded-lg flex items-center justify-between">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 mr-2 text-blue-600" />
                <span className="text-blue-700 font-medium">{selectedIds.length} tesis seçildi</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleBulkStatusUpdate('approved')}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                >
                  Toplu Onayla
                </button>
                <button
                  onClick={() => handleBulkStatusUpdate('rejected')}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
                >
                  Toplu Reddet
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 text-sm font-medium"
                >
                  Toplu Sil
                </button>
                <button
                  onClick={() => {
                    setSelectedIds([]);
                    setSelectAll(false);
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm font-medium"
                >
                  Seçimi İptal Et
                </button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-12">
                      <input
                        type="checkbox"
                        checked={selectAll}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-2 focus:ring-green-500 cursor-pointer"
                      />
                    </th>
                    <th 
                      className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors duration-150"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Tesis Adı</span>
                        {getSortIcon('name')}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors duration-150"
                      onClick={() => handleSort('ownerName')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Sahibi</span>
                        {getSortIcon('ownerName')}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors duration-150"
                      onClick={() => handleSort('city')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Konum</span>
                        {getSortIcon('city')}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors duration-150"
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Durum</span>
                        {getSortIcon('status')}
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {(() => {
                    const filteredTesisler = getFilteredTesisler();
                    const sortedTesisler = sortData(filteredTesisler);
                    const startIndex = (currentPage - 1) * itemsPerPage;
                    const endIndex = startIndex + itemsPerPage;
                    const paginatedTesisler = sortedTesisler.slice(startIndex, endIndex);
                    
                    return paginatedTesisler.length > 0 ? (
                      paginatedTesisler.map((tesis, index) => (
                      <tr key={tesis.id} className={`transition-all duration-150 hover:bg-gradient-to-r hover:from-gray-50 hover:to-white ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                        <td className="px-6 py-5 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(tesis.id)}
                            onChange={() => handleSelectItem(tesis.id)}
                            className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-2 focus:ring-green-500 cursor-pointer"
                          />
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center mr-3">
                              <Building2 className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-gray-900">{tesis.name}</div>
                              <div className="text-xs text-gray-500 mt-0.5">{tesis.type || 'Halı Saha'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{tesis.ownerName || 'Bilinmiyor'}</div>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-700">{tesis.city || 'İstanbul'} / {tesis.district || 'İlçe'}</div>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap">
                          <span className={`inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-full shadow-sm ${getStatusColor(tesis.status)}`}>
                            {getStatusText(tesis.status)}
                          </span>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleViewDetails(tesis)}
                              className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all duration-150"
                              title="Detay"
                            >
                              <Eye className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => setEditingTesis(tesis)}
                              className="p-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-all duration-150"
                              title="Düzenle"
                            >
                              <Edit className="w-5 h-5" />
                            </button>
                            {tesis.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleStatusUpdate(tesis.id, 'approved')}
                                  className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-all duration-150"
                                  title="Onayla"
                                >
                                  <CheckCircle className="w-5 h-5" />
                                </button>
                                <button
                                  onClick={() => handleStatusUpdate(tesis.id, 'rejected')}
                                  className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-150"
                                  title="Reddet"
                                >
                                  <XCircle className="w-5 h-5" />
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => setDeletingTesis(tesis)}
                              className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-150"
                              title="Sil"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="px-6 py-16 text-center">
                          <div className="flex flex-col items-center">
                            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                              <Building2 className="w-10 h-10 text-gray-400" />
                            </div>
                            <p className="text-gray-600 font-semibold text-lg mb-1">Tesis bulunamadı</p>
                            <p className="text-gray-400 text-sm">Arama kriterlerinize uygun tesis bulunmuyor</p>
                          </div>
                        </td>
                      </tr>
                    );
                  })()}
                </tbody>
              </table>
            </div>
            {(() => {
              const filteredTesisler = getFilteredTesisler();
              const sortedTesisler = sortData(filteredTesisler);
              return sortedTesisler.length > 0 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={Math.ceil(sortedTesisler.length / itemsPerPage)}
                  onPageChange={setCurrentPage}
                  itemsPerPage={itemsPerPage}
                  onItemsPerPageChange={(value) => {
                    setItemsPerPage(value);
                    setCurrentPage(1);
                  }}
                  totalItems={sortedTesisler.length}
                />
              );
            })()}
          </div>
        </div>
      </div>

      {/* Tesis Detay Modal */}
      {selectedTesis && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden transform transition-all duration-300 scale-100">
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white">Tesis Detayları</h3>
                </div>
                <button
                  onClick={() => {
                    setSelectedTesis(null);
                    setOwnerData(null);
                  }}
                  className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-colors duration-150"
                >
                  <XCircle className="w-6 h-6 text-white" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {/* Tabs */}
              <div className="border-b border-gray-200">
                <div className="flex space-x-1">
                  <button
                    onClick={() => setActiveTab('info')}
                    className={`px-4 py-2 font-medium text-sm transition-colors ${
                      activeTab === 'info'
                        ? 'text-green-600 border-b-2 border-green-600'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Bilgiler
                  </button>
                  <button
                    onClick={() => setActiveTab('reservations')}
                    className={`px-4 py-2 font-medium text-sm transition-colors ${
                      activeTab === 'reservations'
                        ? 'text-green-600 border-b-2 border-green-600'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Rezervasyonlar
                  </button>
                  <button
                    onClick={() => setActiveTab('revenue')}
                    className={`px-4 py-2 font-medium text-sm transition-colors ${
                      activeTab === 'revenue'
                        ? 'text-green-600 border-b-2 border-green-600'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Gelir
                  </button>
                  <button
                    onClick={() => setActiveTab('activity')}
                    className={`px-4 py-2 font-medium text-sm transition-colors ${
                      activeTab === 'activity'
                        ? 'text-green-600 border-b-2 border-green-600'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Aktivite
                  </button>
                </div>
              </div>

              {/* Tab Content */}
              {activeTab === 'info' && (
                <div className="space-y-6">
                  {/* Resimler */}
                  {selectedTesis.images && selectedTesis.images.length > 0 && (
                    <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200">
                      <h4 className="font-bold text-gray-900 p-4 border-b border-gray-100 flex items-center">
                        <ImageIcon className="w-5 h-5 text-purple-600 mr-2" />
                        Tesis Görselleri
                      </h4>
                      <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                        {selectedTesis.images.map((img, index) => {
                          const imgUrl = typeof img === 'string' ? img : (img.optimized_url || img.url);
                          return (
                            <div key={index} className="relative aspect-video group overflow-hidden rounded-lg border border-gray-100">
                              <img 
                                src={imgUrl} 
                                alt={`${selectedTesis.name} - ${index + 1}`} 
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = 'https://via.placeholder.com/400x300?text=Resim+Yok';
                                }}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-6">
                       <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-5 border border-gray-200 shadow-sm">
                        <h4 className="font-bold text-gray-900 mb-4 text-lg flex items-center border-b border-gray-200 pb-2">
                          <div className="w-1 h-6 bg-green-600 rounded-full mr-3"></div>
                          Temel Bilgiler
                        </h4>
                        <div className="space-y-3 text-sm">
                          <div className="flex justify-between border-b border-gray-100 pb-2">
                            <span className="text-gray-500 font-medium">Tesis Adı</span>
                            <span className="text-gray-900 font-semibold text-right">{selectedTesis.name}</span>
                          </div>
                          <div className="flex justify-between border-b border-gray-100 pb-2">
                            <span className="text-gray-500 font-medium">Tip</span>
                            <span className="text-gray-900 font-semibold">{selectedTesis.type || 'Halı Saha'}</span>
                          </div>
                           <div className="flex justify-between border-b border-gray-100 pb-2">
                            <span className="text-gray-500 font-medium">Saatlik Ücret</span>
                            <span className="font-bold text-green-600">₺{selectedTesis.price || 0}</span>
                          </div>
                          <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                            <span className="text-gray-500 font-medium">Durum</span>
                            <span className={`inline-flex items-center px-2.5 py-1 text-xs font-bold rounded-full shadow-sm ${getStatusColor(selectedTesis.status)}`}>
                              {getStatusText(selectedTesis.status)}
                            </span>
                          </div>
                          <div className="pt-2">
                            <span className="text-gray-500 font-medium block mb-1">Açıklama</span>
                            <p className="text-gray-700 bg-white p-3 rounded-lg border border-gray-100 text-xs leading-relaxed max-h-32 overflow-y-auto">
                              {selectedTesis.description || 'Açıklama bulunmuyor.'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Özellikler / İmkanlar */}
                      {(selectedTesis.features || selectedTesis.amenities || selectedTesis.facilities) && (
                         <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
                          <h4 className="font-bold text-gray-900 mb-3 text-lg flex items-center">
                            <CheckCircle className="w-5 h-5 text-blue-600 mr-2" />
                            İmkanlar
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {(selectedTesis.features || selectedTesis.amenities || selectedTesis.facilities || []).map((feature, idx) => (
                              <span key={idx} className="inline-flex items-center px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium border border-blue-100">
                                {feature}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-6">
                      <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-5 border border-gray-200 shadow-sm">
                        <h4 className="font-bold text-gray-900 mb-4 text-lg flex items-center border-b border-gray-200 pb-2">
                          <MapPin className="w-5 h-5 text-red-500 mr-2" />
                          Konum & İletişim
                        </h4>
                        <div className="space-y-4 text-sm">
                          <div>
                            <p className="text-gray-500 font-medium mb-1">Şehir / İlçe</p>
                            <p className="text-gray-900 font-semibold">{selectedTesis.city} / {selectedTesis.district}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 font-medium mb-1">Açık Adres</p>
                            <p className="text-gray-900 font-medium bg-white p-2 rounded border border-gray-100">
                              {selectedTesis.address || 'Belirtilmemiş'}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500 font-medium mb-1 flex items-center">
                              <Phone className="w-3 h-3 mr-1" /> Telefon
                            </p>
                            <p className="text-gray-900 font-mono font-medium">{selectedTesis.phone || 'Belirtilmemiş'}</p>
                          </div>
                          {selectedTesis.mapsUrl && (
                             <a 
                              href={selectedTesis.mapsUrl} 
                              target="_blank" 
                              rel="noreferrer"
                              className="inline-flex items-center text-blue-600 hover:text-blue-800 text-xs font-medium"
                            >
                              Haritada Görüntüle →
                            </a>
                          )}
                        </div>
                      </div>

                      {ownerData && (
                        <div className="bg-gradient-to-br from-blue-50 to-white rounded-xl p-5 border border-blue-200 shadow-sm">
                          <h4 className="font-bold text-gray-900 mb-4 text-lg flex items-center border-b border-blue-100 pb-2">
                            <div className="w-1 h-6 bg-blue-600 rounded-full mr-3"></div>
                            Sahibi Bilgileri
                          </h4>
                          <div className="space-y-3 text-sm">
                            <div className="flex flex-col">
                              <span className="text-gray-500 font-medium text-xs uppercase tracking-wider mb-0.5">Ad Soyad</span>
                              <span className="text-gray-900 font-bold">{ownerData.displayName || 'İsimsiz'}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-gray-500 font-medium text-xs uppercase tracking-wider mb-0.5">E-posta</span>
                              <span className="text-gray-900 font-medium flex items-center">
                                <Mail className="w-3 h-3 mr-1.5 text-gray-400" />
                                {ownerData.email || 'Yok'}
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-gray-500 font-medium text-xs uppercase tracking-wider mb-0.5">Telefon</span>
                              <span className="text-gray-900 font-medium flex items-center">
                                <Phone className="w-3 h-3 mr-1.5 text-gray-400" />
                                {ownerData.phone || 'Yok'}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedTesis.status === 'pending' && (
                    <div className="bg-gradient-to-br from-yellow-50 to-white rounded-xl p-5 border border-yellow-200 mt-6 shadow-sm">
                      <h4 className="font-bold text-gray-900 mb-4 text-lg flex items-center">
                        <div className="w-1 h-6 bg-yellow-600 rounded-full mr-3"></div>
                        Onay İşlemi
                      </h4>
                      <textarea
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-150 bg-white shadow-sm"
                        rows="4"
                        placeholder="Onay/red notu (isteğe bağlı)"
                      />
                      <div className="flex space-x-3 mt-5">
                        <button
                          onClick={() => handleStatusUpdate(selectedTesis.id, 'approved')}
                          className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 flex items-center justify-center"
                        >
                          <CheckCircle className="w-5 h-5 mr-2" />
                          Onayla
                        </button>
                        <button
                          onClick={() => handleStatusUpdate(selectedTesis.id, 'rejected')}
                          className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl hover:from-red-700 hover:to-rose-700 font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 flex items-center justify-center"
                        >
                          <XCircle className="w-5 h-5 mr-2" />
                          Reddet
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'reservations' && (
                <div className="space-y-4">
                  {loadingDetails ? (
                    <div className="text-center py-8">
                      <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-gray-600">Yükleniyor...</p>
                    </div>
                  ) : tesisReservations.length > 0 ? (
                    <>
                      <div className="grid grid-cols-4 gap-4 mb-4">
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <p className="text-sm text-gray-600 mb-1">Toplam</p>
                          <p className="text-2xl font-bold text-blue-600">{tesisReservations.length}</p>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg">
                          <p className="text-sm text-gray-600 mb-1">Onaylanan</p>
                          <p className="text-2xl font-bold text-green-600">
                            {tesisReservations.filter(r => r.status === 'confirmed' || r.status === 'completed').length}
                          </p>
                        </div>
                        <div className="bg-yellow-50 p-4 rounded-lg">
                          <p className="text-sm text-gray-600 mb-1">Bekleyen</p>
                          <p className="text-2xl font-bold text-yellow-600">
                            {tesisReservations.filter(r => r.status === 'pending').length}
                          </p>
                        </div>
                        <div className="bg-red-50 p-4 rounded-lg">
                          <p className="text-sm text-gray-600 mb-1">İptal</p>
                          <p className="text-2xl font-bold text-red-600">
                            {tesisReservations.filter(r => r.status === 'cancelled').length}
                          </p>
                        </div>
                      </div>
                      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Tarih</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Saat</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Müşteri</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Durum</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Tutar</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {tesisReservations.slice(0, 10).map((res) => (
                              <tr key={res.id}>
                                <td className="px-4 py-3 text-sm text-gray-900">
                                  {res.date?.toDate ? res.date.toDate().toLocaleDateString('tr-TR') : new Date(res.date).toLocaleDateString('tr-TR')}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600">{res.timeSlot}</td>
                                <td className="px-4 py-3 text-sm text-gray-600">{res.customerName || 'Bilinmiyor'}</td>
                                <td className="px-4 py-3">
                                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                    res.status === 'confirmed' || res.status === 'completed' ? 'bg-green-100 text-green-800' :
                                    res.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'
                                  }`}>
                                    {res.status === 'confirmed' ? 'Onaylandı' : res.status === 'completed' ? 'Tamamlandı' : res.status === 'pending' ? 'Bekliyor' : 'İptal'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-sm font-semibold text-gray-900">₺{res.totalAmount || res.price || 0}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                      <p>Henüz rezervasyon yok</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'revenue' && (
                <div className="space-y-4">
                  {loadingDetails ? (
                    <div className="text-center py-8">
                      <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-gray-600">Yükleniyor...</p>
                    </div>
                  ) : tesisRevenue ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gradient-to-br from-green-50 to-white p-6 rounded-xl border border-green-200">
                        <div className="flex items-center justify-between mb-2">
                          <DollarSign className="w-8 h-8 text-green-600" />
                          <span className="text-sm text-gray-600">Bu Ay</span>
                        </div>
                        <p className="text-3xl font-bold text-gray-900">₺{Math.round(tesisRevenue.total).toLocaleString()}</p>
                        <p className="text-sm text-gray-600 mt-1">{tesisRevenue.count} rezervasyon</p>
                      </div>
                      <div className="bg-gradient-to-br from-blue-50 to-white p-6 rounded-xl border border-blue-200">
                        <div className="flex items-center justify-between mb-2">
                          <TrendingUp className="w-8 h-8 text-blue-600" />
                          <span className="text-sm text-gray-600">Tüm Zamanlar</span>
                        </div>
                        <p className="text-3xl font-bold text-gray-900">₺{Math.round(tesisRevenue.allTime).toLocaleString()}</p>
                        <p className="text-sm text-gray-600 mt-1">{tesisRevenue.allTimeCount} rezervasyon</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <DollarSign className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                      <p>Gelir bilgisi bulunamadı</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'activity' && (
                <div className="space-y-4">
                  {loadingDetails ? (
                    <div className="text-center py-8">
                      <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-gray-600">Yükleniyor...</p>
                    </div>
                  ) : activityLogs.length > 0 ? (
                    <div className="space-y-3">
                      {activityLogs.map((log) => (
                        <div key={log.id} className="bg-white p-4 rounded-lg border border-gray-200">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900">{log.action || 'İşlem'}</p>
                              <p className="text-sm text-gray-600 mt-1">{log.description || 'Açıklama yok'}</p>
                              <p className="text-xs text-gray-500 mt-2">
                                {log.createdAt?.toDate ? log.createdAt.toDate().toLocaleString('tr-TR') : new Date(log.createdAt).toLocaleString('tr-TR')}
                              </p>
                            </div>
                            <Activity className="w-5 h-5 text-gray-400" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                      <p>Aktivite logu bulunamadı</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Düzenleme Modal */}
      {editingTesis && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-white">Tesis Düzenle</h3>
                <button
                  onClick={() => setEditingTesis(null)}
                  className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-colors"
                >
                  <XCircle className="w-6 h-6 text-white" />
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target);
                  const tesisData = {
                    name: formData.get('name'),
                    type: formData.get('type'),
                    city: formData.get('city'),
                    district: formData.get('district'),
                    address: formData.get('address'),
                    phone: formData.get('phone'),
                    price: parseFloat(formData.get('price')) || 0,
                    description: formData.get('description')
                  };
                  handleEditTesis(tesisData);
                }}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tesis Adı</label>
                    <input
                      type="text"
                      name="name"
                      defaultValue={editingTesis.name}
                      required
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tip</label>
                    <input
                      type="text"
                      name="type"
                      defaultValue={editingTesis.type}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Şehir</label>
                    <input
                      type="text"
                      name="city"
                      defaultValue={editingTesis.city}
                      required
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">İlçe</label>
                    <input
                      type="text"
                      name="district"
                      defaultValue={editingTesis.district}
                      required
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Adres</label>
                    <input
                      type="text"
                      name="address"
                      defaultValue={editingTesis.address}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Telefon</label>
                    <input
                      type="text"
                      name="phone"
                      defaultValue={editingTesis.phone}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Fiyat (₺)</label>
                    <input
                      type="number"
                      name="price"
                      defaultValue={editingTesis.price}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Açıklama</label>
                    <textarea
                      name="description"
                      defaultValue={editingTesis.description}
                      rows="4"
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                </div>
                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 font-semibold shadow-lg hover:shadow-xl transition-all"
                  >
                    Kaydet
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingTesis(null)}
                    className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 font-semibold transition-all"
                  >
                    İptal
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Silme Onay Modal */}
      {deletingTesis && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="bg-gradient-to-r from-red-600 to-rose-600 p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-white">Tesis Sil</h3>
                <button
                  onClick={() => setDeletingTesis(null)}
                  className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-colors"
                >
                  <XCircle className="w-6 h-6 text-white" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="mb-6">
                <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <p className="text-center text-gray-700 font-medium mb-2">
                  <strong>{deletingTesis.name}</strong> tesisini silmek istediğinize emin misiniz?
                </p>
                <p className="text-center text-sm text-gray-500">
                  Bu işlem geri alınamaz. Tesis ve ilişkili veriler kalıcı olarak silinecektir.
                </p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handleDeleteTesis}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl hover:from-red-700 hover:to-rose-700 font-semibold shadow-lg hover:shadow-xl transition-all"
                >
                  Evet, Sil
                </button>
                <button
                  onClick={() => setDeletingTesis(null)}
                  className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 font-semibold transition-all"
                >
                  İptal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tesisler;

