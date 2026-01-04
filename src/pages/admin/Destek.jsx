import React, { useState, useEffect, useRef } from 'react';
import { 
  getAllTickets, 
  updateTicket, 
  addTicketReply, 
  logAdminAction, 
  getTicketDetails,
  getTicketStats,
  getTicketActivityLogs,
  bulkUpdateTicketStatus,
  bulkDeleteTickets,
  updateTicketAdmin,
  deleteTicketAdmin
} from '../../services/firestoreService';
import { useAuth } from '../../contexts/AuthContext';
import AdminSidebar from '../../components/AdminSidebar';
import AdminHeader from '../../components/AdminHeader';
import Pagination from '../../components/Pagination';
import { 
  FileText, 
  MessageSquare, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Clock, 
  User, 
  Send, 
  Search, 
  Download, 
  BarChart3, 
  TrendingUp, 
  Filter, 
  X,
  Edit,
  Trash2,
  Eye,
  ChevronDown,
  ChevronUp,
  Activity
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

const Destek = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState([]);
  const [filter, setFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [editingTicket, setEditingTicket] = useState(null);
  const [deletingTicket, setDeletingTicket] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  const [activityLogs, setActivityLogs] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const exportMenuRef = useRef(null);
  
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [advancedFilters, setAdvancedFilters] = useState({
    dateFrom: '',
    dateTo: '',
    userId: ''
  });

  useEffect(() => {
    setupRealtimeListener();
    loadStats();
  }, [filter]);

  useEffect(() => {
    if (tickets.length > 0) {
      loadChartData();
    }
  }, [tickets]);

  useEffect(() => {
    if (selectedTicket) {
      loadActivityLogs(selectedTicket.id);
    }
  }, [selectedTicket]);

  useEffect(() => {
    if (showExportMenu) {
      const handleClickOutside = (event) => {
        if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
          setShowExportMenu(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showExportMenu]);

  const setupRealtimeListener = () => {
    try {
      let q = query(collection(db, 'tickets'));
      
      if (filter !== 'all') {
        q = query(collection(db, 'tickets'), where('status', '==', filter));
      }

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const ticketsData = [];
        snapshot.forEach((doc) => {
          ticketsData.push({ id: doc.id, ...doc.data() });
        });
        
        ticketsData.sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
          return dateB - dateA;
        });
        
        setTickets(ticketsData);
        setLoading(false);
      }, (error) => {
        console.error('Real-time listener hatası:', error);
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (err) {
      console.error('Listener kurulum hatası:', err);
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const result = await getTicketStats();
      if (result.success) {
        setStats(result.data);
      }
    } catch (err) {
      console.error('İstatistikler yüklenirken hata:', err);
    }
  };

  const loadChartData = async () => {
    try {
      const result = await getTicketStats();
      if (result.success) {
        const data = result.data;
        
        // Durum dağılımı
        const statusData = {
          labels: ['Açık', 'Devam Ediyor', 'Çözüldü', 'Kapatıldı'],
          datasets: [{
            data: [data.open, data.inProgress, data.resolved, data.closed],
            backgroundColor: ['#f59e0b', '#3b82f6', '#10b981', '#6b7280'],
            borderWidth: 0
          }]
        };

        // Son 30 gün trendi
        const now = new Date();
        const dates = [];
        const counts = [];
        
        for (let i = 29; i >= 0; i--) {
          const date = new Date(now);
          date.setDate(date.getDate() - i);
          date.setHours(0, 0, 0, 0);
          dates.push(date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' }));
          
          const count = tickets.filter(t => {
            const createdDate = t.createdAt?.toDate ? t.createdAt.toDate() : new Date(t.createdAt || 0);
            createdDate.setHours(0, 0, 0, 0);
            return createdDate.getTime() === date.getTime();
          }).length;
          
          counts.push(count);
        }

        const trendData = {
          labels: dates,
          datasets: [{
            label: 'Ticket Sayısı',
            data: counts,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            fill: true,
            tension: 0.4
          }]
        };

        // Kategori bazlı dağılım (top 5)
        const categoryEntries = Object.entries(data.byCategory || {})
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5);
        
        const categoryData = {
          labels: categoryEntries.map(([name]) => {
            const categoryNames = {
              'general': 'Genel',
              'technical': 'Teknik',
              'billing': 'Faturalama',
              'account': 'Hesap',
              'other': 'Diğer',
              'Bilinmiyor': 'Bilinmiyor'
            };
            return categoryNames[name] || name;
          }),
          datasets: [{
            label: 'Ticket Sayısı',
            data: categoryEntries.map(([, count]) => count),
            backgroundColor: '#10b981',
            borderRadius: 8
          }]
        };

        // Öncelik dağılımı
        const priorityData = {
          labels: ['Yüksek', 'Orta', 'Düşük'],
          datasets: [{
            label: 'Ticket Sayısı',
            data: [
              data.byPriority?.high || 0,
              data.byPriority?.medium || 0,
              data.byPriority?.low || 0
            ],
            backgroundColor: ['#ef4444', '#f59e0b', '#10b981'],
            borderRadius: 8
          }]
        };

        setChartData({
          status: statusData,
          trend: trendData,
          category: categoryData,
          priority: priorityData
        });
      }
    } catch (err) {
      console.error('Grafik verileri yüklenirken hata:', err);
    }
  };

  const loadActivityLogs = async (ticketId) => {
    try {
      const result = await getTicketActivityLogs(ticketId);
      if (result.success) {
        setActivityLogs(result.data);
      }
    } catch (err) {
      console.error('Aktivite logları yüklenirken hata:', err);
    }
  };

  const handleStatusUpdate = async (ticketId, status) => {
    try {
      const result = await updateTicket(ticketId, { status });
      if (result.success) {
        const ticket = tickets.find(t => t.id === ticketId);
        await logAdminAction(user?.uid || 'admin', status === 'closed' ? 'ticket_closed' : 'ticket_updated', {
          ticketId,
          ticketTitle: ticket?.title || 'Ticket',
          status
        });
        toast.success(`Ticket ${status === 'closed' ? 'kapatıldı' : 'güncellendi'}`);
        if (selectedTicket?.id === ticketId) {
          setSelectedTicket({ ...selectedTicket, status });
        }
      } else {
        toast.error(result.error || 'Güncelleme başarısız');
      }
    } catch (err) {
      console.error('Durum güncelleme hatası:', err);
      toast.error('Durum güncellenirken hata oluştu');
    }
  };

  const handleReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedTicket) return;

    try {
      const result = await addTicketReply(selectedTicket.id, {
        userId: user?.uid || 'admin',
        userName: user?.displayName || 'Admin',
        message: replyText,
        isAdmin: true
      });
      if (result.success) {
        await logAdminAction(user?.uid || 'admin', 'ticket_replied', {
          ticketId: selectedTicket.id,
          ticketTitle: selectedTicket.title || 'Ticket',
          replyLength: replyText.length
        });
        setReplyText('');
        toast.success('Yanıt eklendi');
        const updatedResult = await getTicketDetails(selectedTicket.id);
        if (updatedResult.success) {
          setSelectedTicket(updatedResult.data);
        }
      } else {
        toast.error(result.error || 'Yanıt eklenemedi');
      }
    } catch (err) {
      console.error('Yanıt ekleme hatası:', err);
      toast.error('Yanıt eklenirken hata oluştu');
    }
  };

  const handleEdit = async () => {
    if (!editingTicket) return;

    try {
      const cleanData = {};
      Object.keys(editingTicket).forEach(key => {
        if (editingTicket[key] !== undefined && editingTicket[key] !== null && key !== 'id') {
          cleanData[key] = editingTicket[key];
        }
      });

      const result = await updateTicketAdmin(editingTicket.id, cleanData);
      if (result.success) {
        await logAdminAction(user?.uid || 'admin', 'ticket_updated', {
          ticketId: editingTicket.id,
          ticketTitle: editingTicket.title || 'Ticket'
        });
        toast.success('Ticket güncellendi');
        setEditingTicket(null);
        const updatedResult = await getTicketDetails(editingTicket.id);
        if (updatedResult.success) {
          if (selectedTicket?.id === editingTicket.id) {
            setSelectedTicket(updatedResult.data);
          }
        }
      } else {
        toast.error(result.error || 'Güncelleme başarısız');
      }
    } catch (err) {
      console.error('Ticket düzenleme hatası:', err);
      toast.error('Ticket düzenlenirken hata oluştu');
    }
  };

  const handleDelete = async () => {
    if (!deletingTicket) return;

    try {
      const result = await deleteTicketAdmin(deletingTicket.id);
      if (result.success) {
        await logAdminAction(user?.uid || 'admin', 'ticket_deleted', {
          ticketId: deletingTicket.id,
          ticketTitle: deletingTicket.title || 'Ticket'
        });
        toast.success('Ticket silindi');
        setDeletingTicket(null);
        if (selectedTicket?.id === deletingTicket.id) {
          setSelectedTicket(null);
        }
      } else {
        toast.error(result.error || 'Silme başarısız');
      }
    } catch (err) {
      console.error('Ticket silme hatası:', err);
      toast.error('Ticket silinirken hata oluştu');
    }
  };

  const handleBulkStatusUpdate = async (status) => {
    if (selectedIds.length === 0) {
      toast.error('Lütfen en az bir ticket seçin');
      return;
    }

    try {
      const result = await bulkUpdateTicketStatus(selectedIds, status);
      if (result.success) {
        await logAdminAction(user?.uid || 'admin', 'ticket_bulk_updated', {
          ticketIds: selectedIds,
          status
        });
        toast.success(`${selectedIds.length} ticket durumu güncellendi`);
        setSelectedIds([]);
        setSelectAll(false);
      } else {
        toast.error(result.error || 'Toplu güncelleme başarısız');
      }
    } catch (err) {
      console.error('Toplu durum güncelleme hatası:', err);
      toast.error('Toplu durum güncellenirken hata oluştu');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) {
      toast.error('Lütfen en az bir ticket seçin');
      return;
    }

    if (!confirm(`${selectedIds.length} ticket silinecek. Emin misiniz?`)) {
      return;
    }

    try {
      const result = await bulkDeleteTickets(selectedIds);
      if (result.success) {
        await logAdminAction(user?.uid || 'admin', 'ticket_bulk_deleted', {
          ticketIds: selectedIds
        });
        toast.success(`${selectedIds.length} ticket silindi`);
        setSelectedIds([]);
        setSelectAll(false);
      } else {
        toast.error(result.error || 'Toplu silme başarısız');
      }
    } catch (err) {
      console.error('Toplu silme hatası:', err);
      toast.error('Toplu silme sırasında hata oluştu');
    }
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredTickets.map(t => t.id));
    }
    setSelectAll(!selectAll);
  };

  const handleSelectTicket = (ticketId) => {
    if (selectedIds.includes(ticketId)) {
      setSelectedIds(selectedIds.filter(id => id !== ticketId));
    } else {
      setSelectedIds([...selectedIds, ticketId]);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open':
        return 'bg-yellow-100 text-yellow-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleExport = (format) => {
    const filtered = getFilteredTickets();
    
    const headers = ['Başlık', 'Açıklama', 'Durum', 'Öncelik', 'Kategori', 'Oluşturulma Tarihi', 'Kullanıcı ID'];
    const rows = filtered.map(t => [
      t.title || '',
      t.description || '',
      t.status === 'open' ? 'Açık' : t.status === 'in_progress' ? 'Devam Ediyor' : t.status === 'resolved' ? 'Çözüldü' : 'Kapatıldı',
      t.priority === 'high' ? 'Yüksek' : t.priority === 'medium' ? 'Orta' : 'Düşük',
      t.category === 'general' ? 'Genel' : t.category === 'technical' ? 'Teknik' : t.category === 'billing' ? 'Faturalama' : t.category === 'account' ? 'Hesap' : 'Diğer',
      t.createdAt?.toDate?.()?.toLocaleDateString('tr-TR') || 'Tarih yok',
      t.userId || ''
    ]);
    
    if (format === 'csv') {
      exportToCSV(headers, rows, 'ticketlar');
    } else if (format === 'excel') {
      exportToExcel(headers, rows, 'ticketlar');
    } else if (format === 'pdf') {
      exportToPDF(headers, rows, 'Ticket Listesi', 'ticketlar');
    }
    
    setShowExportMenu(false);
    toast.success('Dışa aktarma başarılı');
  };

  const getFilteredTickets = () => {
    return tickets.filter(ticket => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!ticket.title?.toLowerCase().includes(query) && 
            !ticket.description?.toLowerCase().includes(query) &&
            !ticket.userName?.toLowerCase().includes(query)) {
          return false;
        }
      }
      if (categoryFilter !== 'all' && ticket.category !== categoryFilter) {
        return false;
      }
      if (priorityFilter !== 'all' && ticket.priority !== priorityFilter) {
        return false;
      }
      if (advancedFilters.dateFrom) {
        const ticketDate = ticket.createdAt?.toDate ? ticket.createdAt.toDate() : new Date(ticket.createdAt || 0);
        const filterDate = new Date(advancedFilters.dateFrom);
        filterDate.setHours(0, 0, 0, 0);
        ticketDate.setHours(0, 0, 0, 0);
        if (ticketDate < filterDate) {
          return false;
        }
      }
      if (advancedFilters.dateTo) {
        const ticketDate = ticket.createdAt?.toDate ? ticket.createdAt.toDate() : new Date(ticket.createdAt || 0);
        const filterDate = new Date(advancedFilters.dateTo);
        filterDate.setHours(23, 59, 59, 999);
        ticketDate.setHours(0, 0, 0, 0);
        if (ticketDate > filterDate) {
          return false;
        }
      }
      if (advancedFilters.userId) {
        if (!ticket.userId?.includes(advancedFilters.userId)) {
          return false;
        }
      }
      return true;
    });
  };

  const clearAdvancedFilters = () => {
    setAdvancedFilters({
      dateFrom: '',
      dateTo: '',
      userId: ''
    });
  };

  const filteredTickets = getFilteredTickets();
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTickets = filteredTickets.slice(startIndex, endIndex);
  const totalPages = Math.ceil(filteredTickets.length / itemsPerPage);

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <AdminSidebar />
        <div className="flex-1 lg:ml-64 flex items-center justify-center">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Yükleniyor...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <AdminSidebar />
      <div className="flex-1 flex flex-col">
        <AdminHeader 
          title="Destek Yönetimi" 
          description="Ticket yönetimi ve müşteri desteği"
          showSearch={true}
          searchQuery={searchQuery}
          onSearch={(e) => {
            setSearchQuery(e.target.value);
            setCurrentPage(1);
          }}
        >
              <div className="relative group" ref={exportMenuRef}>
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <Download className="w-4 h-4" />
                  <span>Dışa Aktar</span>
                </button>
                <div className={`absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 ${showExportMenu ? 'opacity-100 visible' : 'opacity-0 invisible'} transition-all z-10`}>
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
        </AdminHeader>
        <div className="flex-1 p-6 overflow-y-auto">
          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4 mb-6">
              <div 
                onClick={() => setFilter('all')}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 cursor-pointer hover:border-gray-300 transition-colors"
              >
                <div className="text-sm text-gray-600 mb-1">Toplam Ticket</div>
                <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              </div>
              <div 
                onClick={() => setFilter('open')}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 cursor-pointer hover:border-yellow-300 transition-colors"
                style={{borderColor: filter === 'open' ? '#FCD34D' : ''}}
              >
                <div className="text-sm text-gray-600 mb-1">Açık</div>
                <div className="text-2xl font-bold text-yellow-600">{stats.open}</div>
              </div>
              <div 
                onClick={() => setFilter('in_progress')}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 cursor-pointer hover:border-blue-300 transition-colors"
                style={{borderColor: filter === 'in_progress' ? '#60A5FA' : ''}}
              >
                <div className="text-sm text-gray-600 mb-1">Devam Ediyor</div>
                <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
              </div>
              <div 
                 onClick={() => setFilter('resolved')}
                 className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 cursor-pointer hover:border-green-300 transition-colors"
                 style={{borderColor: filter === 'resolved' ? '#34D399' : ''}}
              >
                <div className="text-sm text-gray-600 mb-1">Çözüldü</div>
                <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
              </div>
              <div 
                 onClick={() => setFilter('closed')}
                 className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 cursor-pointer hover:border-gray-300 transition-colors"
                 style={{borderColor: filter === 'closed' ? '#9CA3AF' : ''}}
              >
                <div className="text-sm text-gray-600 mb-1">Kapatıldı</div>
                <div className="text-2xl font-bold text-gray-600">{stats.closed}</div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <div className="text-sm text-gray-600 mb-1">Bugün</div>
                <div className="text-2xl font-bold text-purple-600">{stats.today}</div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <div className="text-sm text-gray-600 mb-1">Bu Ay</div>
                <div className="text-2xl font-bold text-indigo-600">{stats.thisMonth}</div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <div className="text-sm text-gray-600 mb-1">Ort. Çözüm Süresi</div>
                <div className="text-2xl font-bold text-pink-600">{stats.averageResolutionTime || 0} saat</div>
              </div>
            </div>
          )}

          {/* Charts */}
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
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 lg:col-span-2">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Kategori Bazlı Dağılım</h3>
                <Bar data={chartData.category} options={{
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
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Öncelik Dağılımı</h3>
                <Bar data={chartData.priority} options={{
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

          {/* Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Filtreler</h3>
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
              >
                {showAdvancedFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                Gelişmiş Filtreler
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <select
                  value={filter}
                  onChange={(e) => {
                    setFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="all">Tüm Durumlar</option>
                  <option value="open">Açık</option>
                  <option value="in_progress">Devam Ediyor</option>
                  <option value="resolved">Çözüldü</option>
                  <option value="closed">Kapatıldı</option>
                </select>
              </div>
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              >
                <option value="all">Tüm Kategoriler</option>
                <option value="general">Genel</option>
                <option value="technical">Teknik</option>
                <option value="billing">Faturalama</option>
                <option value="account">Hesap</option>
                <option value="other">Diğer</option>
              </select>
              <select
                value={priorityFilter}
                onChange={(e) => {
                  setPriorityFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              >
                <option value="all">Tüm Öncelikler</option>
                <option value="high">Yüksek</option>
                <option value="medium">Orta</option>
                <option value="low">Düşük</option>
              </select>
            </div>

            {/* Advanced Filters */}
            {showAdvancedFilters && (
              <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Başlangıç Tarihi</label>
                  <input
                    type="date"
                    value={advancedFilters.dateFrom}
                    onChange={(e) => setAdvancedFilters({ ...advancedFilters, dateFrom: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bitiş Tarihi</label>
                  <input
                    type="date"
                    value={advancedFilters.dateTo}
                    onChange={(e) => setAdvancedFilters({ ...advancedFilters, dateTo: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Kullanıcı ID</label>
                  <input
                    type="text"
                    value={advancedFilters.userId}
                    onChange={(e) => setAdvancedFilters({ ...advancedFilters, userId: e.target.value })}
                    placeholder="Kullanıcı ID ara..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div className="sm:col-span-3">
                  <button
                    onClick={clearAdvancedFilters}
                    className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    Filtreleri Temizle
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Bulk Actions */}
          {selectedIds.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center justify-between">
              <span className="text-green-800 font-medium">{selectedIds.length} ticket seçildi</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleBulkStatusUpdate('open')}
                  className="px-3 py-1 text-sm bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                >
                  Açık Yap
                </button>
                <button
                  onClick={() => handleBulkStatusUpdate('in_progress')}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Devam Et Yap
                </button>
                <button
                  onClick={() => handleBulkStatusUpdate('resolved')}
                  className="px-3 py-1 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Çözüldü Yap
                </button>
                <button
                  onClick={() => handleBulkStatusUpdate('closed')}
                  className="px-3 py-1 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Kapat
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="px-3 py-1 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Sil
                </button>
              </div>
            </div>
          )}

          {/* Error/Success Messages */}
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

          {/* Ticket Listesi */}
          <div className="space-y-4 mb-6">
            {paginatedTickets.length > 0 ? (
              <>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Tümünü Seç</span>
                  </label>
                </div>
                {paginatedTickets.map((ticket) => (
                  <div key={ticket.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-start gap-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(ticket.id)}
                        onChange={() => handleSelectTicket(ticket.id)}
                        className="mt-1 w-4 h-4 text-green-600 rounded focus:ring-green-500"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <MessageSquare className="w-5 h-5 text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-lg font-semibold text-gray-900 mb-1 line-clamp-2">{ticket.title}</h3>
                              <p className="text-sm text-gray-500">
                                {ticket.createdAt?.toDate?.()?.toLocaleDateString('tr-TR') || 'Tarih yok'} • 
                                <span className="ml-1">Kullanıcı ID: {ticket.userId?.substring(0, 8)}...</span>
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(ticket.priority)}`}>
                              {ticket.priority === 'high' ? 'Yüksek' : ticket.priority === 'medium' ? 'Orta' : 'Düşük'}
                            </span>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(ticket.status)}`}>
                              {ticket.status === 'open' ? 'Açık' :
                               ticket.status === 'in_progress' ? 'Devam Ediyor' :
                               ticket.status === 'resolved' ? 'Çözüldü' : 'Kapatıldı'}
                            </span>
                          </div>
                        </div>
                        <p className="text-gray-600 mb-4 line-clamp-3">{ticket.description}</p>
                        {ticket.replies && ticket.replies.length > 0 && (
                          <div className="space-y-2 mb-4">
                            <p className="text-sm font-medium text-gray-700 mb-2">
                              {ticket.replies.length} yanıt
                            </p>
                            {ticket.replies.slice(0, 2).map((reply, index) => (
                              <div key={index} className={`p-3 rounded-lg ${
                                reply.isAdmin ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'
                              }`}>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm font-medium text-gray-900">
                                    {reply.isAdmin ? 'Admin' : reply.userName || 'Kullanıcı'}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {reply.createdAt?.toDate?.()?.toLocaleDateString('tr-TR') || 'Tarih yok'}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-700 line-clamp-2">{reply.message}</p>
                              </div>
                            ))}
                            {ticket.replies.length > 2 && (
                              <p className="text-xs text-gray-500">+{ticket.replies.length - 2} yanıt daha</p>
                            )}
                          </div>
                        )}
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={async () => {
                              const result = await getTicketDetails(ticket.id);
                              if (result.success) {
                                setSelectedTicket(result.data);
                                setActiveTab('info');
                                setReplyText('');
                              } else {
                                toast.error(result.error || 'Ticket detayları yüklenemedi');
                              }
                            }}
                            className="flex items-center gap-1 px-3 py-1 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
                          >
                            <Eye className="w-4 h-4" />
                            Detay
                          </button>
                          <button
                            onClick={() => {
                              setEditingTicket({ ...ticket });
                            }}
                            className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                          >
                            <Edit className="w-4 h-4" />
                            Düzenle
                          </button>
                          <button
                            onClick={() => setDeletingTicket(ticket)}
                            className="flex items-center gap-1 px-3 py-1 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                            Sil
                          </button>
                          {ticket.status === 'open' && (
                            <button
                              onClick={() => handleStatusUpdate(ticket.id, 'in_progress')}
                              className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                              Devam Et
                            </button>
                          )}
                          {ticket.status !== 'closed' && (
                            <button
                              onClick={() => handleStatusUpdate(ticket.id, 'closed')}
                              className="px-3 py-1 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                            >
                              Kapat
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-500">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p>Ticket bulunamadı</p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {filteredTickets.length > 0 && totalPages > 1 && (
            <div className="mt-6">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                itemsPerPage={itemsPerPage}
                onItemsPerPageChange={(value) => {
                  setItemsPerPage(value);
                  setCurrentPage(1);
                }}
                totalItems={filteredTickets.length}
              />
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-slideUp">
            <div className="p-4 sm:p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
              <div className="flex items-center justify-between">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900">Ticket Detayları</h3>
                <button
                  onClick={() => {
                    setSelectedTicket(null);
                    setReplyText('');
                    setActiveTab('info');
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                >
                  <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>
              <div className="flex gap-2 mt-4 border-b border-gray-200">
                <button
                  onClick={() => setActiveTab('info')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'info' 
                      ? 'border-green-600 text-green-600' 
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Bilgiler
                </button>
                <button
                  onClick={() => setActiveTab('replies')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'replies' 
                      ? 'border-green-600 text-green-600' 
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Yanıtlar ({selectedTicket.replies?.length || 0})
                </button>
                <button
                  onClick={() => setActiveTab('activity')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'activity' 
                      ? 'border-green-600 text-green-600' 
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Aktivite
                </button>
              </div>
            </div>
            <div className="p-4 sm:p-6">
              {activeTab === 'info' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Başlık</label>
                    <p className="text-gray-900">{selectedTicket.title}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
                    <p className="text-gray-900 whitespace-pre-wrap">{selectedTicket.description}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Durum</label>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedTicket.status)}`}>
                        {selectedTicket.status === 'open' ? 'Açık' :
                         selectedTicket.status === 'in_progress' ? 'Devam Ediyor' :
                         selectedTicket.status === 'resolved' ? 'Çözüldü' : 'Kapatıldı'}
                      </span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Öncelik</label>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(selectedTicket.priority)}`}>
                        {selectedTicket.priority === 'high' ? 'Yüksek' : selectedTicket.priority === 'medium' ? 'Orta' : 'Düşük'}
                      </span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                      <p className="text-gray-900">
                        {selectedTicket.category === 'general' ? 'Genel' : 
                         selectedTicket.category === 'technical' ? 'Teknik' : 
                         selectedTicket.category === 'billing' ? 'Faturalama' : 
                         selectedTicket.category === 'account' ? 'Hesap' : 'Diğer'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Kullanıcı ID</label>
                      <p className="text-gray-900 font-mono text-sm">{selectedTicket.userId}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Oluşturulma Tarihi</label>
                      <p className="text-gray-900">
                        {selectedTicket.createdAt?.toDate?.()?.toLocaleString('tr-TR') || 'Tarih yok'}
                      </p>
                    </div>
                    {selectedTicket.updatedAt && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Son Güncelleme</label>
                        <p className="text-gray-900">
                          {selectedTicket.updatedAt?.toDate?.()?.toLocaleString('tr-TR') || 'Tarih yok'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'replies' && (
                <div className="space-y-4">
                  {selectedTicket.replies && selectedTicket.replies.length > 0 ? (
                    selectedTicket.replies.map((reply, index) => (
                      <div key={index} className={`p-4 rounded-lg ${
                        reply.isAdmin ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-900">
                            {reply.isAdmin ? 'Admin' : reply.userName || 'Kullanıcı'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {reply.createdAt?.toDate?.()?.toLocaleString('tr-TR') || 'Tarih yok'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{reply.message}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-8">Henüz yanıt yok</p>
                  )}
                  <form onSubmit={handleReply} className="mt-4 pt-4 border-t border-gray-200">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Yanıt Ekle</label>
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm sm:text-base"
                        rows="4"
                        placeholder="Yanıtınızı yazın..."
                        required
                      />
                    </div>
                    <div className="flex justify-end gap-3 mt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTicket(null);
                          setReplyText('');
                          setActiveTab('info');
                        }}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        İptal
                      </button>
                      <button
                        type="submit"
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <Send className="w-4 h-4" />
                        <span>Gönder</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {activeTab === 'activity' && (
                <div className="space-y-3">
                  {activityLogs.length > 0 ? (
                    activityLogs.map((log) => (
                      <div key={log.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {log.action === 'ticket_created' ? 'Ticket Oluşturuldu' :
                               log.action === 'ticket_updated' ? 'Ticket Güncellendi' :
                               log.action === 'ticket_replied' ? 'Yanıt Eklendi' :
                               log.action === 'ticket_closed' ? 'Ticket Kapatıldı' :
                               log.action === 'ticket_deleted' ? 'Ticket Silindi' :
                               log.action}
                            </p>
                            {log.details && (
                              <p className="text-xs text-gray-600 mt-1">
                                {log.details.ticketTitle && `Ticket: ${log.details.ticketTitle}`}
                                {log.details.status && ` • Durum: ${log.details.status}`}
                              </p>
                            )}
                          </div>
                          <span className="text-xs text-gray-500">
                            {log.createdAt?.toDate?.()?.toLocaleString('tr-TR') || 
                             log.timestamp?.toDate?.()?.toLocaleString('tr-TR') || 
                             'Tarih yok'}
                          </span>
                        </div>
                        {log.userId && (
                          <p className="text-xs text-gray-500">Kullanıcı ID: {log.userId}</p>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-8">Aktivite logu bulunamadı</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingTicket && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-slideUp">
            <div className="p-4 sm:p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
              <div className="flex items-center justify-between">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900">Ticket Düzenle</h3>
                <button
                  onClick={() => setEditingTicket(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                >
                  <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>
            </div>
            <div className="p-4 sm:p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Başlık</label>
                  <input
                    type="text"
                    value={editingTicket.title || ''}
                    onChange={(e) => setEditingTicket({ ...editingTicket, title: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Açıklama</label>
                  <textarea
                    value={editingTicket.description || ''}
                    onChange={(e) => setEditingTicket({ ...editingTicket, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    rows="4"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Durum</label>
                    <select
                      value={editingTicket.status || 'open'}
                      onChange={(e) => setEditingTicket({ ...editingTicket, status: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    >
                      <option value="open">Açık</option>
                      <option value="in_progress">Devam Ediyor</option>
                      <option value="resolved">Çözüldü</option>
                      <option value="closed">Kapatıldı</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Öncelik</label>
                    <select
                      value={editingTicket.priority || 'low'}
                      onChange={(e) => setEditingTicket({ ...editingTicket, priority: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    >
                      <option value="low">Düşük</option>
                      <option value="medium">Orta</option>
                      <option value="high">Yüksek</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Kategori</label>
                    <select
                      value={editingTicket.category || 'general'}
                      onChange={(e) => setEditingTicket({ ...editingTicket, category: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    >
                      <option value="general">Genel</option>
                      <option value="technical">Teknik</option>
                      <option value="billing">Faturalama</option>
                      <option value="account">Hesap</option>
                      <option value="other">Diğer</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Admin Notu (Opsiyonel)</label>
                  <textarea
                    value={editingTicket.adminNotes || ''}
                    onChange={(e) => setEditingTicket({ ...editingTicket, adminNotes: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    rows="3"
                    placeholder="Admin notu ekleyin..."
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    onClick={() => setEditingTicket(null)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    İptal
                  </button>
                  <button
                    onClick={handleEdit}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Kaydet
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingTicket && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl w-full max-w-md animate-slideUp">
            <div className="p-4 sm:p-6 border-b border-gray-200">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900">Ticket Sil</h3>
            </div>
            <div className="p-4 sm:p-6">
              <p className="text-gray-700 mb-4">
                <strong>{deletingTicket.title}</strong> başlıklı ticket silinecek. Bu işlem geri alınamaz.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeletingTicket(null)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
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

export default Destek;
