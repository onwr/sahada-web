import React, { useState, useEffect } from 'react';
import { 
  getAllUsers, 
  updateUserStatus, 
  logAdminAction,
  getUserStats,
  getUserReservations,
  getUserActivityLogs,
  getUserTesis,
  addTesis,
  updateUserData,
  bulkUpdateUserStatus,
  updateUserDataAdmin,
  deleteUserAdmin,
  bulkDeleteUsers
} from '../../services/firestoreService';
import { useAuth } from '../../contexts/AuthContext';
import AdminSidebar from '../../components/AdminSidebar';
import Pagination from '../../components/Pagination';
import { 
  Users, 
  Shield, 
  Ban, 
  CheckCircle, 
  AlertCircle, 
  Mail, 
  Phone, 
  Calendar, 
  XCircle, 
  Search, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Download,
  Edit,
  Filter,
  ChevronDown,
  ChevronUp,
  Trophy,
  Building2,
  Activity,
  FileText,
  Eye,
  Trash2,
  Plus,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { exportToCSV, exportToExcel, exportToPDF } from '../../utils/exportUtils';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import toast from '../../utils/toast';
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

const Kullanicilar = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [statusReason, setStatusReason] = useState('');
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
    accountStatus: '',
    dateFrom: '',
    dateTo: '',
    onboardingCompleted: ''
  });
  const [editingUser, setEditingUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);
  const [activeTab, setActiveTab] = useState('info');
  const [userReservations, setUserReservations] = useState([]);
  const [userTesis, setUserTesis] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    loadUsers();
    loadStats();
    setCurrentPage(1);

    let q = query(collection(db, 'users'));
    
    if (filter !== 'all') {
      q = query(collection(db, 'users'), where('userType', '==', filter));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersData = [];
      snapshot.forEach((doc) => {
        usersData.push({ id: doc.id, ...doc.data() });
      });
      setUsers(usersData);
      loadStats(); // İstatistikleri güncelle
    }, (error) => {
      console.error('Real-time listener hatası:', error);
    });

    return () => unsubscribe();
  }, [filter]);

  useEffect(() => {
    if (users.length > 0) {
      prepareChartData();
    }
  }, [users]);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);

    try {
      const filters = filter !== 'all' ? { userType: filter } : {};
      const result = await getAllUsers(filters);

      if (result.success) {
        const sorted = result.data.sort((a, b) => {
          const dateA = a.createdAt?.toDate?.() || new Date(0);
          const dateB = b.createdAt?.toDate?.() || new Date(0);
          return dateB - dateA;
        });
        setUsers(sorted);
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error('Kullanıcılar yükleme hatası:', err);
      setError('Kullanıcılar yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const result = await getUserStats();
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

    users.forEach(user => {
      const createdAt = user.createdAt?.toDate ? user.createdAt.toDate() : new Date(user.createdAt || 0);
      createdAt.setHours(0, 0, 0, 0);
      const dateKey = createdAt.toISOString().split('T')[0];
      if (dailyCounts.hasOwnProperty(dateKey)) {
        dailyCounts[dateKey]++;
      }
    });

    const statusCounts = {
      active: users.filter(u => u.accountStatus === 'active' || !u.accountStatus).length,
      banned: users.filter(u => u.accountStatus === 'banned').length,
      suspended: users.filter(u => u.accountStatus === 'suspended').length
    };

    const typeCounts = {
      player: users.filter(u => u.userType === 'player').length,
      owner: users.filter(u => u.userType === 'owner').length,
      admin: users.filter(u => u.userType === 'admin').length
    };

    setChartData({
      statusDistribution: {
        labels: ['Aktif', 'Yasaklı', 'Askıya Alınan'],
        datasets: [{
          data: [statusCounts.active, statusCounts.banned, statusCounts.suspended],
          backgroundColor: [
            'rgba(34, 197, 94, 0.8)',
            'rgba(239, 68, 68, 0.8)',
            'rgba(251, 191, 36, 0.8)'
          ],
          borderColor: [
            'rgb(34, 197, 94)',
            'rgb(239, 68, 68)',
            'rgb(251, 191, 36)'
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
          label: 'Yeni Kayıtlar',
          data: last30Days.map(date => dailyCounts[date] || 0),
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4
        }]
      },
      typeDistribution: {
        labels: ['Oyuncu', 'Saha Sahibi', 'Admin'],
        datasets: [{
          label: 'Kullanıcı Sayısı',
          data: [typeCounts.player, typeCounts.owner, typeCounts.admin],
          backgroundColor: 'rgba(16, 185, 129, 0.8)',
          borderColor: 'rgb(16, 185, 129)',
          borderWidth: 2,
          borderRadius: 8
        }]
      }
    });
  };

  const handleCreateTesisFromProfile = async () => {
    if (!selectedUser) return;
    
    setLoadingDetails(true);
    try {
      const tesisData = {
        name: selectedUser.businessName || `${selectedUser.displayName} Tesisi`,
        latitude: selectedUser.businessLocation?.lat || 41.0082,
        longitude: selectedUser.businessLocation?.lng || 28.9784,
        type: 'Futbol',
        capacity: 14,
        price: 0,
        description: selectedUser.description || 'Yeni tesisimiz hizmetinizde.',
        facilities: [
          selectedUser.hasShower && 'Duş',
          selectedUser.hasParking && 'Otopark',
          selectedUser.hasCafeteria && 'Kafeterya'
        ].filter(Boolean),
        workingHours: '08:00 - 24:00',
        phone: selectedUser.businessPhone || selectedUser.phone,
        status: 'active',
        isActive: true,
        images: selectedUser.facilityPhotos || [],
        ownerId: selectedUser.id,
        rating: 0,
        reservations: 0,
        revenue: 0,
        location: selectedUser.city && selectedUser.district ? `${selectedUser.district}, ${selectedUser.city}` : selectedUser.businessAddress || '',
        address: selectedUser.businessAddress || '',
        city: selectedUser.city || '',
        district: selectedUser.district || '',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await addTesis(tesisData);
      if (result.success) {
        toast.success('Saha başarıyla oluşturuldu!');
        // Tesisleri yeniden yükle
        const tesisList = await getUserTesis(selectedUser.id);
        if (tesisList.success) setUserTesis(tesisList.data);
      } else {
        toast.error('Saha oluşturulamadı: ' + result.error);
      }
    } catch (error) {
      console.error('Saha oluşturma hatası:', error);
      toast.error('Bir hata oluştu');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleStatusUpdate = async (userId, status) => {
    try {
      const result = await updateUserStatus(userId, status, statusReason);
      if (result.success) {
        const userData = users.find(u => u.id === userId);
        await logAdminAction(user?.uid || 'admin', status === 'banned' ? 'user_banned' : 'user_activated', {
          userId,
          userEmail: userData?.email || 'Bilinmiyor',
          reason: statusReason
        });
        setSuccess(`Kullanıcı ${status === 'banned' ? 'yasaklandı' : 'aktif edildi'}`);
        setStatusReason('');
        setSelectedUser(null);
        loadUsers();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error('Durum güncelleme hatası:', err);
      setError('Durum güncellenirken hata oluştu');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'banned':
        return 'bg-red-100 text-red-800';
      case 'suspended':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active':
        return 'Aktif';
      case 'banned':
        return 'Yasaklı';
      case 'suspended':
        return 'Askıya Alındı';
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
      
      if (sortField === 'displayName') {
        aValue = a.displayName || '';
        bValue = b.displayName || '';
      } else if (sortField === 'email') {
        aValue = a.email || '';
        bValue = b.email || '';
      } else if (sortField === 'userType') {
        aValue = a.userType || '';
        bValue = b.userType || '';
      } else if (sortField === 'accountStatus') {
        aValue = getStatusText(a.accountStatus || 'active');
        bValue = getStatusText(b.accountStatus || 'active');
      } else if (sortField === 'createdAt') {
        aValue = a.createdAt?.toDate?.() || new Date(0);
        bValue = b.createdAt?.toDate?.() || new Date(0);
      }
      
      if (aValue instanceof Date) {
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

  const handleSelectAll = (checked) => {
    setSelectAll(checked);
    if (checked) {
      const filteredUsers = getFilteredUsers();
      const sortedUsers = sortData(filteredUsers);
      setSelectedIds(sortedUsers.map(u => u.id));
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

  const handleViewDetails = async (userData) => {
    setSelectedUser(userData);
    setStatusReason('');
    setActiveTab('info');
    setLoadingDetails(true);
    setUserReservations([]);
    setUserTesis([]);
    setActivityLogs([]);
    
    // Rezervasyonları yükle
    try {
      const resResult = await getUserReservations(userData.id);
      if (resResult.success) {
        setUserReservations(resResult.data);
      }
    } catch (err) {
      console.error('Rezervasyonlar yükleme hatası:', err);
    }

    // Tesisleri yükle (saha sahibi ise)
    if (userData.userType === 'owner') {
      try {
        const tesisResult = await getUserTesis(userData.id);
        if (tesisResult.success) {
          setUserTesis(tesisResult.data);
        }
      } catch (err) {
        console.error('Tesisler yükleme hatası:', err);
      }
    }

    // Aktivite loglarını yükle
    try {
      const logsResult = await getUserActivityLogs(userData.id);
      if (logsResult.success) {
        setActivityLogs(logsResult.data);
      }
    } catch (err) {
      console.error('Aktivite logları yükleme hatası:', err);
    }

    setLoadingDetails(false);
  };

  const handleBulkStatusUpdate = async (status) => {
    if (selectedIds.length === 0) return;
    
    try {
      const result = await bulkUpdateUserStatus(selectedIds, status, 'Toplu işlem');
      if (result.success) {
        await logAdminAction(user?.uid || 'admin', status === 'active' ? 'user_bulk_activated' : status === 'banned' ? 'user_bulk_banned' : 'user_bulk_suspended', {
          count: selectedIds.length,
          userIds: selectedIds
        });
        setSuccess(`${selectedIds.length} kullanıcı ${status === 'active' ? 'aktif edildi' : status === 'banned' ? 'yasaklandı' : 'askıya alındı'}`);
        setSelectedIds([]);
        setSelectAll(false);
        loadUsers();
        loadStats();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error('Toplu işlem hatası:', err);
      setError('Toplu işlem sırasında hata oluştu');
    }
  };

  const handleEditUser = async (userData) => {
    if (!editingUser) return;
    
    try {
      const result = await updateUserDataAdmin(editingUser.id, userData);
      if (result.success) {
        await logAdminAction(user?.uid || 'admin', 'user_edit', {
          userId: editingUser.id,
          userEmail: editingUser.email,
          changes: userData
        });
        setSuccess('Kullanıcı güncellendi');
        setEditingUser(null);
        loadUsers();
        loadStats();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error('Kullanıcı güncelleme hatası:', err);
      setError('Kullanıcı güncellenirken hata oluştu');
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    
    try {
      const result = await deleteUserAdmin(deletingUser.id);
      if (result.success) {
        await logAdminAction(user?.uid || 'admin', 'user_delete', {
          userId: deletingUser.id,
          userEmail: deletingUser.email,
          userName: deletingUser.displayName
        });
        setSuccess('Kullanıcı silindi');
        setDeletingUser(null);
        setSelectedUser(null);
        loadUsers();
        loadStats();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error('Kullanıcı silme hatası:', err);
      setError('Kullanıcı silinirken hata oluştu');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    
    if (!window.confirm(`${selectedIds.length} kullanıcı silinecek. Emin misiniz?`)) {
      return;
    }
    
    try {
      const result = await bulkDeleteUsers(selectedIds);
      if (result.success) {
        await logAdminAction(user?.uid || 'admin', 'user_bulk_delete', {
          count: selectedIds.length,
          userIds: selectedIds
        });
        setSuccess(`${selectedIds.length} kullanıcı silindi`);
        setSelectedIds([]);
        setSelectAll(false);
        loadUsers();
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

  const getFilteredUsers = () => {
    let filtered = [...users];

    // Arama sorgusu
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user =>
        user.displayName?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query) ||
        user.phone?.toLowerCase().includes(query)
      );
    }

    // Gelişmiş filtreler
    if (advancedFilters.accountStatus) {
      filtered = filtered.filter(u => u.accountStatus === advancedFilters.accountStatus || (!u.accountStatus && advancedFilters.accountStatus === 'active'));
    }
    if (advancedFilters.dateFrom) {
      const fromDate = new Date(advancedFilters.dateFrom);
      filtered = filtered.filter(u => {
        const createdAt = u.createdAt?.toDate ? u.createdAt.toDate() : new Date(u.createdAt || 0);
        return createdAt >= fromDate;
      });
    }
    if (advancedFilters.dateTo) {
      const toDate = new Date(advancedFilters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(u => {
        const createdAt = u.createdAt?.toDate ? u.createdAt.toDate() : new Date(u.createdAt || 0);
        return createdAt <= toDate;
      });
    }
    if (advancedFilters.onboardingCompleted !== '') {
      const isCompleted = advancedFilters.onboardingCompleted === 'true';
      filtered = filtered.filter(u => u.onboardingCompleted === isCompleted);
    }

    return filtered;
  };

  const handleExport = (format) => {
    const filteredUsers = getFilteredUsers();
    
    const headers = ['Kullanıcı Adı', 'E-posta', 'Telefon', 'Tip', 'Durum', 'Kayıt Tarihi'];
    const rows = filteredUsers.map(u => [
      u.displayName || 'İsimsiz',
      u.email || '',
      u.phone || '',
      u.userType || 'player',
      getStatusText(u.accountStatus || 'active'),
      u.createdAt?.toDate?.()?.toLocaleDateString('tr-TR') || 'Bilinmiyor'
    ]);
    
    if (format === 'csv') {
      exportToCSV(rows, headers, 'kullanicilar');
    } else if (format === 'excel') {
      exportToExcel(rows, headers, 'kullanicilar');
    } else if (format === 'pdf') {
      exportToPDF(rows, headers, 'Kullanıcı Listesi', 'kullanicilar');
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
        <header className="bg-gradient-to-r from-white to-gray-50 shadow-lg border-b border-gray-200 px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <Users className="w-6 h-6 text-green-600" />
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Kullanıcı Yönetimi</h1>
              </div>
              <p className="text-gray-600 text-sm font-medium">Tüm kullanıcıları görüntüle ve yönet</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="İsim, email, telefon ara..."
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
                <option value="player">Oyuncular</option>
                <option value="owner">Saha Sahipleri</option>
              </select>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">TOPLAM</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>
              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">AKTİF</p>
                    <p className="text-2xl font-bold text-green-600">{stats.active}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>
              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">YASAKLI</p>
                    <p className="text-2xl font-bold text-red-600">{stats.banned}</p>
                  </div>
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                    <Ban className="w-6 h-6 text-red-600" />
                  </div>
                </div>
              </div>
              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">ASKıYA ALINAN</p>
                    <p className="text-2xl font-bold text-yellow-600">{stats.suspended}</p>
                  </div>
                  <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-yellow-600" />
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
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">ONBOARDING</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.onboardingCompleted}</p>
                  </div>
                  <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <Shield className="w-6 h-6 text-indigo-600" />
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
                <h3 className="text-lg font-bold text-gray-900 mb-4">Kullanıcı Tipi</h3>
                <div className="h-64">
                  <Bar 
                    data={chartData.typeDistribution}
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Durum</label>
                    <select
                      value={advancedFilters.accountStatus}
                      onChange={(e) => {
                        setAdvancedFilters({ ...advancedFilters, accountStatus: e.target.value });
                        setCurrentPage(1);
                      }}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    >
                      <option value="">Tümü</option>
                      <option value="active">Aktif</option>
                      <option value="banned">Yasaklı</option>
                      <option value="suspended">Askıya Alınan</option>
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Onboarding</label>
                    <select
                      value={advancedFilters.onboardingCompleted}
                      onChange={(e) => {
                        setAdvancedFilters({ ...advancedFilters, onboardingCompleted: e.target.value });
                        setCurrentPage(1);
                      }}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    >
                      <option value="">Tümü</option>
                      <option value="true">Tamamlanan</option>
                      <option value="false">Tamamlanmayan</option>
                    </select>
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => {
                      setAdvancedFilters({
                        accountStatus: '',
                        dateFrom: '',
                        dateTo: '',
                        onboardingCompleted: ''
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
                <span className="text-blue-700 font-medium">{selectedIds.length} kullanıcı seçildi</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleBulkStatusUpdate('active')}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                >
                  Toplu Aktif Et
                </button>
                <button
                  onClick={() => handleBulkStatusUpdate('banned')}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
                >
                  Toplu Yasakla
                </button>
                <button
                  onClick={() => handleBulkStatusUpdate('suspended')}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm font-medium"
                >
                  Toplu Askıya Al
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

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase w-12">
                      <input
                        type="checkbox"
                        checked={selectAll}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                      />
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('displayName')}
                    >
                      <div className="flex items-center">
                        Kullanıcı
                        {getSortIcon('displayName')}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('email')}
                    >
                      <div className="flex items-center">
                        E-posta
                        {getSortIcon('email')}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('userType')}
                    >
                      <div className="flex items-center">
                        Tip
                        {getSortIcon('userType')}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('accountStatus')}
                    >
                      <div className="flex items-center">
                        Durum
                        {getSortIcon('accountStatus')}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('createdAt')}
                    >
                      <div className="flex items-center">
                        Kayıt Tarihi
                        {getSortIcon('createdAt')}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {(() => {
                    const filteredUsers = getFilteredUsers();
                    const sortedUsers = sortData(filteredUsers);
                    const startIndex = (currentPage - 1) * itemsPerPage;
                    const endIndex = startIndex + itemsPerPage;
                    const paginatedUsers = sortedUsers.slice(startIndex, endIndex);
                    
                    return paginatedUsers.length > 0 ? (
                      paginatedUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(user.id)}
                            onChange={() => handleSelectItem(user.id)}
                            className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                              <Users className="w-5 h-5 text-green-600" />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{user.displayName || 'İsimsiz'}</div>
                              <div className="text-sm text-gray-500">{user.phone || 'Telefon yok'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 capitalize">
                            {user.userType || 'player'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(user.accountStatus || 'active')}`}>
                            {getStatusText(user.accountStatus || 'active')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.createdAt?.toDate?.()?.toLocaleDateString('tr-TR') || 'Bilinmiyor'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleViewDetails(user)}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg p-2 transition-all"
                              title="Detay"
                            >
                              <Eye className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => setEditingUser(user)}
                              className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg p-2 transition-all"
                              title="Düzenle"
                            >
                              <Edit className="w-5 h-5" />
                            </button>
                            {user.accountStatus !== 'banned' && (
                              <button
                                onClick={() => {
                                  setSelectedUser(user);
                                  setStatusReason('');
                                }}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg p-2 transition-all"
                                title="Yasakla"
                              >
                                <Ban className="w-5 h-5" />
                              </button>
                            )}
                            {user.accountStatus === 'banned' && (
                              <button
                                onClick={() => handleStatusUpdate(user.id, 'active')}
                                className="text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg p-2 transition-all"
                                title="Aktif Et"
                              >
                                <CheckCircle className="w-5 h-5" />
                              </button>
                            )}
                            <button
                              onClick={() => setDeletingUser(user)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg p-2 transition-all"
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
                        <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                          <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                          <p>Kullanıcı bulunamadı</p>
                        </td>
                      </tr>
                    );
                  })()}
                </tbody>
              </table>
            </div>
            {(() => {
              const filteredUsers = getFilteredUsers();
              const sortedUsers = sortData(filteredUsers);
              return sortedUsers.length > 0 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={Math.ceil(sortedUsers.length / itemsPerPage)}
                  onPageChange={setCurrentPage}
                  itemsPerPage={itemsPerPage}
                  onItemsPerPageChange={(value) => {
                    setItemsPerPage(value);
                    setCurrentPage(1);
                  }}
                  totalItems={sortedUsers.length}
                />
              );
            })()}
          </div>
        </div>
      </div>

      {/* Detay Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white">Kullanıcı Detayları</h3>
                </div>
                <button
                  onClick={() => {
                    setSelectedUser(null);
                    setStatusReason('');
                  }}
                  className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-colors"
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
                  {selectedUser.userType === 'owner' && (
                    <button
                      onClick={() => setActiveTab('tesis')}
                      className={`px-4 py-2 font-medium text-sm transition-colors ${
                        activeTab === 'tesis'
                          ? 'text-green-600 border-b-2 border-green-600'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Tesisler
                    </button>
                  )}
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
                <>
                  <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-5 border border-gray-200">
                    <h4 className="font-bold text-gray-900 mb-4 text-lg flex items-center">
                      <div className="w-1 h-6 bg-green-600 rounded-full mr-3"></div>
                      Kullanıcı Bilgileri
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500 font-medium mb-1">Ad Soyad</p>
                        <p className="text-gray-900 font-semibold">{selectedUser.displayName || 'Belirtilmemiş'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 font-medium mb-1">E-posta</p>
                        <p className="text-gray-900 font-semibold">{selectedUser.email}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 font-medium mb-1">Telefon</p>
                        <p className="text-gray-900 font-semibold">{selectedUser.phone || 'Belirtilmemiş'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 font-medium mb-1">Kullanıcı Tipi</p>
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 capitalize">
                          {selectedUser.userType || 'player'}
                        </span>
                      </div>
                      <div>
                        <p className="text-gray-500 font-medium mb-1">Durum</p>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedUser.accountStatus || 'active')}`}>
                          {getStatusText(selectedUser.accountStatus || 'active')}
                        </span>
                      </div>
                      <div>
                        <p className="text-gray-500 font-medium mb-1">Kayıt Tarihi</p>
                        <p className="text-gray-900 font-semibold">
                          {selectedUser.createdAt?.toDate?.()?.toLocaleDateString('tr-TR') || 'Bilinmiyor'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 font-medium mb-1">Onboarding</p>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          selectedUser.onboardingCompleted ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {selectedUser.onboardingCompleted ? 'Tamamlandı' : 'Tamamlanmadı'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Doğrulama Belgeleri */}
                  {selectedUser.userType === 'owner' && (
                    <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-5 border border-gray-200">
                      <h4 className="font-bold text-gray-900 mb-4 text-lg flex items-center">
                        <div className="w-1 h-6 bg-blue-600 rounded-full mr-3"></div>
                        Doğrulama Belgeleri
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(selectedUser.taxPlate || selectedUser.businessLicense) && (
                          <div className="bg-white p-3 rounded-lg border border-gray-100 flex items-center justify-between">
                            <div className="flex items-center text-left">
                              <FileText className="w-8 h-8 text-blue-500 mr-3" />
                              <div>
                                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">{selectedUser.companyType === 'individual' ? 'Vergi Levhası' : 'İşletme Ruhsatı'}</p>
                                <p className="text-sm font-semibold truncate max-w-[150px] text-gray-900">
                                  {(selectedUser.taxPlate || selectedUser.businessLicense).original_name || (selectedUser.taxPlate || selectedUser.businessLicense).fileName || 'Belge'}
                                </p>
                              </div>
                            </div>
                            <a 
                              href={(selectedUser.taxPlate || selectedUser.businessLicense).url} 
                              target="_blank" 
                              rel="noreferrer"
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors shadow-sm border border-blue-100 bg-blue-50/50"
                              title="Görüntüle"
                            >
                              <Eye className="w-5 h-5" />
                            </a>
                          </div>
                        )}
                        {(selectedUser.activityCertificate || selectedUser.signatureCircular) && (
                          <div className="bg-white p-3 rounded-lg border border-gray-100 flex items-center justify-between">
                            <div className="flex items-center text-left">
                              <FileText className="w-8 h-8 text-indigo-500 mr-3" />
                              <div>
                                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">{selectedUser.companyType === 'individual' ? 'Faaliyet Belgesi' : 'İmza Sirküleri'}</p>
                                <p className="text-sm font-semibold truncate max-w-[150px] text-gray-900">
                                  {(selectedUser.activityCertificate || selectedUser.signatureCircular).original_name || (selectedUser.activityCertificate || selectedUser.signatureCircular).fileName || 'Belge'}
                                </p>
                              </div>
                            </div>
                            <a 
                              href={(selectedUser.activityCertificate || selectedUser.signatureCircular).url} 
                              target="_blank" 
                              rel="noreferrer"
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors shadow-sm border border-blue-100 bg-blue-50/50"
                              title="Görüntüle"
                            >
                              <Eye className="w-5 h-5" />
                            </a>
                          </div>
                        )}
                        {(!selectedUser.taxPlate && !selectedUser.businessLicense && !selectedUser.activityCertificate && !selectedUser.signatureCircular) && (
                          <div className="col-span-2 py-4 text-center text-gray-500 italic text-sm">
                            Yüklenmiş belge bulunamadı.
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedUser.accountStatus !== 'banned' && (
                    <div className="bg-gradient-to-br from-yellow-50 to-white rounded-xl p-5 border border-yellow-200">
                      <h4 className="font-bold text-gray-900 mb-4 text-lg flex items-center">
                        <div className="w-1 h-6 bg-yellow-600 rounded-full mr-3"></div>
                        Kullanıcıyı Yasakla
                      </h4>
                      <textarea
                        value={statusReason}
                        onChange={(e) => setStatusReason(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-150 bg-white"
                        rows="4"
                        placeholder="Yasaklama sebebi (isteğe bağlı)"
                      />
                      <div className="flex space-x-3 mt-5">
                        <button
                          onClick={() => handleStatusUpdate(selectedUser.id, 'banned')}
                          className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl hover:from-red-700 hover:to-rose-700 font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                        >
                          Yasakla
                        </button>
                        <button
                          onClick={() => {
                            setSelectedUser(null);
                            setStatusReason('');
                          }}
                          className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 font-semibold transition-all"
                        >
                          İptal
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {activeTab === 'reservations' && (
                <div className="space-y-4">
                  {loadingDetails ? (
                    <div className="text-center py-8">
                      <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-gray-600">Yükleniyor...</p>
                    </div>
                  ) : userReservations.length > 0 ? (
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Tarih</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Saat</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Tesis</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Durum</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Tutar</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {userReservations.map((res) => (
                            <tr key={res.id}>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {res.date?.toDate ? res.date.toDate().toLocaleDateString('tr-TR') : new Date(res.date).toLocaleDateString('tr-TR')}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">{res.timeSlot}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">{res.tesisName || 'Bilinmiyor'}</td>
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
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                      <p>Henüz rezervasyon yok</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'tesis' && selectedUser.userType === 'owner' && (
                <div className="space-y-4">
                  {loadingDetails ? (
                    <div className="text-center py-8">
                      <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-gray-600">Yükleniyor...</p>
                    </div>
                  ) : userTesis.length > 0 ? (
                    <div className="space-y-3">
                      {userTesis.map((tesis) => (
                        <div key={tesis.id} className="bg-white p-4 rounded-lg border border-gray-200">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-gray-900">{tesis.name}</p>
                              <p className="text-sm text-gray-600">{tesis.city} / {tesis.district}</p>
                            </div>
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              tesis.status === 'approved' || tesis.status === 'active' ? 'bg-green-100 text-green-800' :
                              tesis.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {tesis.status === 'approved' ? 'Onaylandı' : tesis.status === 'pending' ? 'Beklemede' : 'Reddedildi'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-gray-200">
                      <Building2 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                      <p className="text-gray-900 font-bold text-lg">Henüz tesis yok</p>
                      <p className="text-gray-500 text-sm max-w-xs mx-auto mb-6">
                        Bu kullanıcıya ait herhangi bir tesis kaydı bulunamadı.
                      </p>
                      {selectedUser.onboardingCompleted && (
                        <button
                          onClick={handleCreateTesisFromProfile}
                          className="px-6 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-2 mx-auto"
                        >
                          <Plus className="w-5 h-5" />
                          Profil Verilerinden Saha Oluştur
                        </button>
                      )}
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
      {editingUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-white">Kullanıcı Düzenle</h3>
                <button
                  onClick={() => setEditingUser(null)}
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
                  const userData = {
                    displayName: formData.get('displayName'),
                    phone: formData.get('phone'),
                    accountStatus: formData.get('accountStatus')
                  };
                  handleEditUser(userData);
                }}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Ad Soyad</label>
                    <input
                      type="text"
                      name="displayName"
                      defaultValue={editingUser.displayName}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Telefon</label>
                    <input
                      type="text"
                      name="phone"
                      defaultValue={editingUser.phone}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Durum</label>
                    <select
                      name="accountStatus"
                      defaultValue={editingUser.accountStatus || 'active'}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    >
                      <option value="active">Aktif</option>
                      <option value="banned">Yasaklı</option>
                      <option value="suspended">Askıya Alınan</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">E-posta</label>
                    <input
                      type="email"
                      value={editingUser.email}
                      disabled
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl bg-gray-100 text-gray-500"
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
                    onClick={() => setEditingUser(null)}
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
      {deletingUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="bg-gradient-to-r from-red-600 to-rose-600 p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-white">Kullanıcı Sil</h3>
                <button
                  onClick={() => setDeletingUser(null)}
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
                  <strong>{deletingUser.displayName || deletingUser.email}</strong> kullanıcısını silmek istediğinize emin misiniz?
                </p>
                <p className="text-center text-sm text-gray-500">
                  Bu işlem geri alınamaz. Kullanıcı ve ilişkili veriler kalıcı olarak silinecektir.
                </p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handleDeleteUser}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl hover:from-red-700 hover:to-rose-700 font-semibold shadow-lg hover:shadow-xl transition-all"
                >
                  Evet, Sil
                </button>
                <button
                  onClick={() => setDeletingUser(null)}
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

export default Kullanicilar;

