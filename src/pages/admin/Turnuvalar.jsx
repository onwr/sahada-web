import React, { useState, useEffect } from 'react';
import { 
  getAllTournaments,
  getTournament,
  createTournament,
  updateTournament,
  deleteTournament,
  getTournamentParticipants,
  getTournamentMatches,
  getTournamentStandings,
  getTournamentStatistics,
  getTournamentStats
} from '../../services/firestoreService';
import { useAuth } from '../../contexts/AuthContext';
import AdminSidebar from '../../components/AdminSidebar';
import Pagination from '../../components/Pagination';
import { 
  Trophy,
  Calendar,
  Users,
  DollarSign,
  TrendingUp,
  BarChart3,
  Search,
  Filter,
  Download,
  Plus,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Activity,
  X
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
import { 
  getTournamentStatusLabel, 
  getTournamentStatusColor,
  formatTournamentDate,
  formatTournamentDateTime 
} from '../../utils/tournamentUtils';

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

const Turnuvalar = () => {
  const { user, userData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tournaments, setTournaments] = useState([]);
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
  
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState({
    status: '',
    type: '',
    sportType: '',
    dateFrom: '',
    dateTo: ''
  });
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [editingTournament, setEditingTournament] = useState(null);
  const [deletingTournament, setDeletingTournament] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [matches, setMatches] = useState([]);
  const [standings, setStandings] = useState([]);
  const [activeTab, setActiveTab] = useState('info');
  const [showTournamentModal, setShowTournamentModal] = useState(false);
  const [tournamentForm, setTournamentForm] = useState({
    name: '',
    description: '',
    format: 'round_robin',
    type: 'individual',
    sportType: 'football',
    tesisId: '',
    startDate: '',
    endDate: '',
    registrationDeadline: '',
    maxParticipants: 16,
    maxTeams: 16,
    minTeamSize: 1,
    maxTeamSize: 11,
    registrationFee: 0,
    prizePool: 0,
    prizeDistribution: [
      { rank: 1, percentage: 50 },
      { rank: 2, percentage: 30 },
      { rank: 3, percentage: 20 }
    ],
    rules: '',
    status: 'draft',
    settings: {
      allowDraw: true,
      pointsWin: 3,
      pointsDraw: 1,
      pointsLoss: 0,
      autoAdvance: false
    }
  });

  useEffect(() => {
    loadTournaments();
    loadStats();
    setCurrentPage(1);

    const q = query(collection(db, 'tournaments'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tournamentList = [];
      snapshot.forEach((doc) => {
        tournamentList.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      let filtered = tournamentList;
      
      if (filter !== 'all') {
        filtered = filtered.filter(t => t.status === filter);
      }
      
      setTournaments(filtered);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [filter]);

  useEffect(() => {
    if (tournaments.length > 0) {
      loadChartData();
    }
  }, [tournaments]);

  useEffect(() => {
    if (selectedTournament) {
      loadTournamentDetails(selectedTournament.id);
    }
  }, [selectedTournament]);

  const loadTournaments = async () => {
    try {
      setLoading(true);
      const result = await getAllTournaments({});
      if (result.success) {
        setTournaments(result.data);
      } else {
        setError(result.error);
      }
    } catch (error) {
      console.error('Turnuvalar yükleme hatası:', error);
      setError('Turnuvalar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const result = await getTournamentStats(null);
      if (result.success) {
        setStats(result.data);
      }
    } catch (error) {
      console.error('İstatistikler yükleme hatası:', error);
    }
  };

  const loadChartData = () => {
    const statusCounts = {
      'draft': 0,
      'registration_open': 0,
      'registration_closed': 0,
      'ongoing': 0,
      'completed': 0,
      'cancelled': 0
    };

    tournaments.forEach(tournament => {
      if (statusCounts[tournament.status] !== undefined) {
        statusCounts[tournament.status]++;
      }
    });

    const totalCount = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);

    if (totalCount === 0) {
      setChartData(null);
      return;
    }

    const chart = {
      labels: Object.keys(statusCounts).map(s => getTournamentStatusLabel(s)),
      datasets: [{
        label: 'Turnuva Durumu',
        data: Object.values(statusCounts),
        backgroundColor: [
          'rgba(156, 163, 175, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(251, 191, 36, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(168, 85, 247, 0.8)',
          'rgba(239, 68, 68, 0.8)'
        ],
        borderColor: [
          'rgba(156, 163, 175, 1)',
          'rgba(34, 197, 94, 1)',
          'rgba(251, 191, 36, 1)',
          'rgba(59, 130, 246, 1)',
          'rgba(168, 85, 247, 1)',
          'rgba(239, 68, 68, 1)'
        ],
        borderWidth: 2
      }]
    };

    setChartData(chart);
  };

  const loadTournamentDetails = async (tournamentId) => {
    try {
      const [participantsResult, matchesResult, standingsResult] = await Promise.all([
        getTournamentParticipants(tournamentId),
        getTournamentMatches(tournamentId),
        getTournamentStandings(tournamentId)
      ]);

      if (participantsResult.success) {
        setParticipants(participantsResult.data);
      }
      if (matchesResult.success) {
        setMatches(matchesResult.data);
      }
      if (standingsResult.success) {
        setStandings(standingsResult.data);
      }
    } catch (error) {
      console.error('Turnuva detayları yükleme hatası:', error);
      toast.error('Turnuva detayları yüklenemedi');
    }
  };

  const handleDelete = async (tournamentId) => {
    try {
      const result = await deleteTournament(tournamentId);
      if (result.success) {
        toast.success('Turnuva silindi');
        setDeletingTournament(null);
        loadTournaments();
      } else {
        toast.error(result.error || 'Turnuva silinemedi');
      }
    } catch (error) {
      console.error('Turnuva silme hatası:', error);
      toast.error('Turnuva silinemedi');
    }
  };

  const resetTournamentForm = () => {
    setTournamentForm({
      name: '',
      description: '',
      format: 'round_robin',
      type: 'individual',
      sportType: 'football',
      tesisId: '',
      startDate: '',
      endDate: '',
      registrationDeadline: '',
      maxParticipants: 16,
      maxTeams: 16,
      minTeamSize: 1,
      maxTeamSize: 11,
      registrationFee: 0,
      prizePool: 0,
      prizeDistribution: [
        { rank: 1, percentage: 50 },
        { rank: 2, percentage: 30 },
        { rank: 3, percentage: 20 }
      ],
      rules: '',
      status: 'draft',
      settings: {
        allowDraw: true,
        pointsWin: 3,
        pointsDraw: 1,
        pointsLoss: 0,
        autoAdvance: false
      }
    });
  };

  const handleTournamentSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const tournamentData = {
        name: tournamentForm.name,
        description: tournamentForm.description,
        format: tournamentForm.format,
        type: tournamentForm.type,
        sportType: tournamentForm.sportType,
        ownerId: user?.uid || 'admin',
        ownerType: 'admin',
        tesisId: tournamentForm.tesisId || null,
        startDate: tournamentForm.startDate,
        endDate: tournamentForm.endDate,
        registrationDeadline: tournamentForm.registrationDeadline || tournamentForm.startDate,
        maxParticipants: tournamentForm.type === 'individual' ? parseInt(tournamentForm.maxParticipants) : null,
        maxTeams: tournamentForm.type === 'team' ? parseInt(tournamentForm.maxTeams) : null,
        minTeamSize: parseInt(tournamentForm.minTeamSize) || 1,
        maxTeamSize: parseInt(tournamentForm.maxTeamSize) || 11,
        registrationFee: parseFloat(tournamentForm.registrationFee) || 0,
        prizePool: parseFloat(tournamentForm.prizePool) || 0,
        prizeDistribution: tournamentForm.prizeDistribution,
        rules: tournamentForm.rules,
        status: tournamentForm.status,
        settings: tournamentForm.settings
      };

      const result = await createTournament(tournamentData);

      if (result.success) {
        setShowTournamentModal(false);
        resetTournamentForm();
        toast.success('Turnuva oluşturuldu');
        loadTournaments();
      } else {
        toast.error(result.error || 'Turnuva kaydedilirken hata oluştu');
      }
    } catch (error) {
      console.error('Turnuva kaydetme hatası:', error);
      toast.error('Turnuva kaydedilirken hata oluştu');
    }
  };

  const applyFilters = () => {
    let filtered = tournaments;

    if (searchQuery) {
      filtered = filtered.filter(t => 
        t.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (advancedFilters.status) {
      filtered = filtered.filter(t => t.status === advancedFilters.status);
    }

    if (advancedFilters.type) {
      filtered = filtered.filter(t => t.type === advancedFilters.type);
    }

    if (advancedFilters.sportType) {
      filtered = filtered.filter(t => t.sportType === advancedFilters.sportType);
    }

    return filtered;
  };

  const filteredTournaments = applyFilters();

  const sortedTournaments = [...filteredTournaments].sort((a, b) => {
    if (!sortField) return 0;
    
    let aValue = a[sortField];
    let bValue = b[sortField];
    
    if (aValue?.toDate) aValue = aValue.toDate();
    if (bValue?.toDate) bValue = bValue.toDate();
    
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sortedTournaments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTournaments = sortedTournaments.slice(startIndex, endIndex);

  const handleExport = (format) => {
    const data = filteredTournaments.map(t => ({
      'Turnuva Adı': t.name,
      'Durum': getTournamentStatusLabel(t.status),
      'Tip': t.type === 'individual' ? 'Bireysel' : 'Takımlı',
      'Spor': t.sportType,
      'Başlangıç': formatTournamentDate(t.startDate),
      'Bitiş': formatTournamentDate(t.endDate),
      'Kayıt Ücreti': t.registrationFee || 0,
      'Ödül Havuzu': t.prizePool || 0
    }));

    if (format === 'csv') {
      exportToCSV(data, 'turnuvalar');
    } else if (format === 'excel') {
      exportToExcel(data, 'turnuvalar');
    } else if (format === 'pdf') {
      exportToPDF(data, 'turnuvalar');
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <AdminSidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Yükleniyor...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Turnuvalar</h1>
              <p className="text-gray-600 mt-1">Tüm turnuvaları görüntüle ve yönet</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowTournamentModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span>Yeni Turnuva</span>
              </button>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Turnuva ara..."
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
                <option value="draft">Taslak</option>
                <option value="registration_open">Kayıtlar Açık</option>
                <option value="registration_closed">Kayıtlar Kapalı</option>
                <option value="ongoing">Devam Ediyor</option>
                <option value="completed">Tamamlandı</option>
                <option value="cancelled">İptal Edildi</option>
              </select>
            </div>
          </div>

          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-4 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm">Toplam Turnuva</p>
                    <p className="text-2xl font-bold mt-1">{stats.activeTournaments + (tournaments.length - stats.activeTournaments)}</p>
                  </div>
                  <Trophy className="w-8 h-8 text-blue-200" />
                </div>
              </div>
              <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-4 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm">Aktif Turnuvalar</p>
                    <p className="text-2xl font-bold mt-1">{stats.activeTournaments}</p>
                  </div>
                  <Activity className="w-8 h-8 text-green-200" />
                </div>
              </div>
              <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-4 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm">Toplam Takım/Oyuncu</p>
                    <p className="text-2xl font-bold mt-1">{stats.totalTeams}</p>
                  </div>
                  <Users className="w-8 h-8 text-purple-200" />
                </div>
              </div>
              <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-lg p-4 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-yellow-100 text-sm">Toplam Gelir</p>
                    <p className="text-2xl font-bold mt-1">{stats.totalRevenue?.toLocaleString('tr-TR')} ₺</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-yellow-200" />
                </div>
              </div>
            </div>
          )}
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          {chartData && tournaments.length > 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Turnuva Durumu Dağılımı</h2>
              <div className="h-80 flex items-center justify-center">
                <div className="w-full max-w-lg">
                  <Doughnut 
                    data={chartData} 
                    options={{
                      responsive: true,
                      maintainAspectRatio: true,
                      aspectRatio: 1.5,
                      plugins: {
                        legend: {
                          position: 'bottom',
                          labels: {
                            padding: 15,
                            font: {
                              size: 13
                            },
                            usePointStyle: true,
                            pointStyle: 'circle',
                            boxWidth: 12,
                            boxHeight: 12
                          }
                        },
                        tooltip: {
                          enabled: true,
                          padding: 12,
                          backgroundColor: 'rgba(0, 0, 0, 0.8)',
                          titleFont: {
                            size: 14,
                            weight: 'bold'
                          },
                          bodyFont: {
                            size: 13
                          },
                          callbacks: {
                            label: function(context) {
                              const label = context.label || '';
                              const value = context.parsed || 0;
                              const total = context.dataset.data.reduce((a, b) => a + b, 0);
                              const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                              return `${label}: ${value} (${percentage}%)`;
                            }
                          }
                        }
                      },
                      cutout: '60%'
                    }}
                  />
                </div>
              </div>
            </div>
          ) : tournaments.length === 0 && !loading ? (
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Turnuva Durumu Dağılımı</h2>
              <div className="text-center py-12 text-gray-500">
                <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p>Henüz turnuva bulunmamaktadır</p>
              </div>
            </div>
          ) : null}

          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className="flex items-center space-x-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  <Filter className="w-4 h-4" />
                  <span>Gelişmiş Filtreler</span>
                  {showAdvancedFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {showAdvancedFilters && (
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <select
                    value={advancedFilters.status}
                    onChange={(e) => setAdvancedFilters({ ...advancedFilters, status: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Tüm Durumlar</option>
                    <option value="draft">Taslak</option>
                    <option value="registration_open">Kayıtlar Açık</option>
                    <option value="ongoing">Devam Ediyor</option>
                    <option value="completed">Tamamlandı</option>
                  </select>
                  <select
                    value={advancedFilters.type}
                    onChange={(e) => setAdvancedFilters({ ...advancedFilters, type: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Tüm Tipler</option>
                    <option value="individual">Bireysel</option>
                    <option value="team">Takımlı</option>
                  </select>
                  <select
                    value={advancedFilters.sportType}
                    onChange={(e) => setAdvancedFilters({ ...advancedFilters, sportType: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Tüm Sporlar</option>
                    <option value="football">Futbol</option>
                    <option value="basketball">Basketbol</option>
                    <option value="tennis">Tenis</option>
                    <option value="volleyball">Voleybol</option>
                  </select>
                  <button
                    onClick={() => setAdvancedFilters({ status: '', type: '', sportType: '', dateFrom: '', dateTo: '' })}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg border border-gray-300"
                  >
                    Filtreleri Temizle
                  </button>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        checked={selectAll}
                        onChange={(e) => {
                          setSelectAll(e.target.checked);
                          if (e.target.checked) {
                            setSelectedIds(paginatedTournaments.map(t => t.id));
                          } else {
                            setSelectedIds([]);
                          }
                        }}
                        className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Turnuva Adı
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Durum
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tip
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Spor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Başlangıç Tarihi
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kayıt Ücreti
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      İşlemler
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedTournaments.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-6 py-8 text-center text-gray-500">
                        Turnuva bulunamadı
                      </td>
                    </tr>
                  ) : (
                    paginatedTournaments.map((tournament) => (
                      <tr key={tournament.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(tournament.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedIds([...selectedIds, tournament.id]);
                              } else {
                                setSelectedIds(selectedIds.filter(id => id !== tournament.id));
                              }
                            }}
                            className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{tournament.name}</div>
                          <div className="text-sm text-gray-500">{tournament.description?.substring(0, 50)}...</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            tournament.status === 'registration_open' ? 'bg-green-100 text-green-800' :
                            tournament.status === 'ongoing' ? 'bg-blue-100 text-blue-800' :
                            tournament.status === 'completed' ? 'bg-purple-100 text-purple-800' :
                            tournament.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {getTournamentStatusLabel(tournament.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {tournament.type === 'individual' ? 'Bireysel' : 'Takımlı'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {tournament.sportType || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatTournamentDate(tournament.startDate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {tournament.registrationFee || 0} ₺
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => setSelectedTournament(tournament)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              <Eye className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(tournament.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-gray-200">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                itemsPerPage={itemsPerPage}
                onItemsPerPageChange={setItemsPerPage}
              />
            </div>
          </div>
        </main>

        {selectedTournament && (
          <div className="fixed inset-0 bg-black/40 bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">{selectedTournament.name}</h2>
                <button
                  onClick={() => {
                    setSelectedTournament(null);
                    setParticipants([]);
                    setMatches([]);
                    setStandings([]);
                    setActiveTab('info');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6">
                <div className="flex space-x-1 border-b border-gray-200 mb-6">
                  <button
                    onClick={() => setActiveTab('info')}
                    className={`px-4 py-2 font-medium ${
                      activeTab === 'info' 
                        ? 'text-green-600 border-b-2 border-green-600' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Bilgiler
                  </button>
                  <button
                    onClick={() => setActiveTab('participants')}
                    className={`px-4 py-2 font-medium ${
                      activeTab === 'participants' 
                        ? 'text-green-600 border-b-2 border-green-600' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Katılımcılar ({participants.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('matches')}
                    className={`px-4 py-2 font-medium ${
                      activeTab === 'matches' 
                        ? 'text-green-600 border-b-2 border-green-600' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Maçlar ({matches.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('standings')}
                    className={`px-4 py-2 font-medium ${
                      activeTab === 'standings' 
                        ? 'text-green-600 border-b-2 border-green-600' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Puan Durumu
                  </button>
                </div>

                {activeTab === 'info' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Durum</label>
                        <p className="mt-1 text-sm text-gray-900">{getTournamentStatusLabel(selectedTournament.status)}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Tip</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedTournament.type === 'individual' ? 'Bireysel' : 'Takımlı'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Spor Türü</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedTournament.sportType || '-'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Başlangıç Tarihi</label>
                        <p className="mt-1 text-sm text-gray-900">{formatTournamentDate(selectedTournament.startDate)}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Bitiş Tarihi</label>
                        <p className="mt-1 text-sm text-gray-900">{formatTournamentDate(selectedTournament.endDate)}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Kayıt Ücreti</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedTournament.registrationFee || 0} ₺</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Ödül Havuzu</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedTournament.prizePool || 0} ₺</p>
                      </div>
                    </div>
                    {selectedTournament.description && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Açıklama</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedTournament.description}</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'participants' && (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Katılımcı</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ödeme Durumu</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {participants.map((participant) => (
                          <tr key={participant.id}>
                            <td className="px-4 py-3 text-sm text-gray-900">{participant.participantName}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{participant.status}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{participant.paymentStatus || 'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {activeTab === 'matches' && (
                  <div className="space-y-4">
                    {matches.map((match) => (
                      <div key={match.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{match.participant1Name} vs {match.participant2Name}</div>
                            <div className="text-sm text-gray-500 mt-1">
                              {match.score1 !== null && match.score2 !== null ? `${match.score1} - ${match.score2}` : 'Skor girilmedi'}
                            </div>
                          </div>
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            match.status === 'completed' ? 'bg-green-100 text-green-800' :
                            match.status === 'ongoing' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {match.status === 'completed' ? 'Tamamlandı' : match.status === 'ongoing' ? 'Devam Ediyor' : 'Planlandı'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'standings' && (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sıra</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Katılımcı</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">O</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">G</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">B</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">M</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">A</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Y</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Puan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {standings.map((standing) => (
                          <tr key={standing.id}>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{standing.rank}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{standing.participantName}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{standing.matchesPlayed}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{standing.wins}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{standing.draws}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{standing.losses}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{standing.goalsFor}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{standing.goalsAgainst}</td>
                            <td className="px-4 py-3 text-sm font-semibold text-gray-900">{standing.points}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {deletingTournament && (
          <div className="fixed inset-0 bg-black/40 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Turnuvayı Sil</h3>
              <p className="text-gray-600 mb-6">Bu turnuvayı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.</p>
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setDeletingTournament(null)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  İptal
                </button>
                <button
                  onClick={() => handleDelete(deletingTournament.id)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Sil
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Turnuva Oluşturma Modal */}
        {showTournamentModal && (
          <div className="fixed inset-0 bg-black/40 bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Yeni Turnuva</h2>
                  <button
                    onClick={() => {
                      setShowTournamentModal(false);
                      resetTournamentForm();
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleTournamentSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Turnuva Adı *
                      </label>
                      <input
                        type="text"
                        value={tournamentForm.name}
                        onChange={(e) => setTournamentForm(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="Yaz Turnuvası 2025"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Spor Türü *
                      </label>
                      <select
                        value={tournamentForm.sportType}
                        onChange={(e) => setTournamentForm(prev => ({ ...prev, sportType: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        required
                      >
                        <option value="football">Futbol</option>
                        <option value="basketball">Basketbol</option>
                        <option value="tennis">Tenis</option>
                        <option value="volleyball">Voleybol</option>
                        <option value="badminton">Badminton</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Turnuva Tipi *
                      </label>
                      <select
                        value={tournamentForm.type}
                        onChange={(e) => setTournamentForm(prev => ({ ...prev, type: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        required
                      >
                        <option value="individual">Bireysel</option>
                        <option value="team">Takımlı</option>
                      </select>
                    </div>

                    {tournamentForm.type === 'team' ? (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Maksimum Takım Sayısı *
                          </label>
                          <input
                            type="number"
                            value={tournamentForm.maxTeams}
                            onChange={(e) => setTournamentForm(prev => ({ ...prev, maxTeams: parseInt(e.target.value) }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            min="2"
                            max="32"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Minimum Takım Boyutu
                          </label>
                          <input
                            type="number"
                            value={tournamentForm.minTeamSize}
                            onChange={(e) => setTournamentForm(prev => ({ ...prev, minTeamSize: parseInt(e.target.value) }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            min="1"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Maksimum Takım Boyutu
                          </label>
                          <input
                            type="number"
                            value={tournamentForm.maxTeamSize}
                            onChange={(e) => setTournamentForm(prev => ({ ...prev, maxTeamSize: parseInt(e.target.value) }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            min="1"
                          />
                        </div>
                      </>
                    ) : (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Maksimum Katılımcı Sayısı *
                        </label>
                        <input
                          type="number"
                          value={tournamentForm.maxParticipants}
                          onChange={(e) => setTournamentForm(prev => ({ ...prev, maxParticipants: parseInt(e.target.value) }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          min="2"
                          max="64"
                          required
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Başlangıç Tarihi *
                      </label>
                      <input
                        type="date"
                        value={tournamentForm.startDate}
                        onChange={(e) => setTournamentForm(prev => ({ ...prev, startDate: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Bitiş Tarihi *
                      </label>
                      <input
                        type="date"
                        value={tournamentForm.endDate}
                        onChange={(e) => setTournamentForm(prev => ({ ...prev, endDate: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Kayıt Son Tarihi
                      </label>
                      <input
                        type="date"
                        value={tournamentForm.registrationDeadline}
                        onChange={(e) => setTournamentForm(prev => ({ ...prev, registrationDeadline: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Kayıt Ücreti (₺)
                      </label>
                      <input
                        type="number"
                        value={tournamentForm.registrationFee}
                        onChange={(e) => setTournamentForm(prev => ({ ...prev, registrationFee: parseFloat(e.target.value) }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        min="0"
                        step="0.01"
                        placeholder="0"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Ödül Havuzu (₺)
                      </label>
                      <input
                        type="number"
                        value={tournamentForm.prizePool}
                        onChange={(e) => setTournamentForm(prev => ({ ...prev, prizePool: parseFloat(e.target.value) }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        min="0"
                        step="0.01"
                        placeholder="10000"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Durum *
                      </label>
                      <select
                        value={tournamentForm.status}
                        onChange={(e) => setTournamentForm(prev => ({ ...prev, status: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        required
                      >
                        <option value="draft">Taslak</option>
                        <option value="registration_open">Kayıtlar Açık</option>
                        <option value="registration_closed">Kayıtlar Kapalı</option>
                        <option value="ongoing">Devam Ediyor</option>
                        <option value="completed">Tamamlandı</option>
                        <option value="cancelled">İptal Edildi</option>
                      </select>
                    </div>
                  </div>

                  {/* Turnuva Ayarları */}
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Turnuva Ayarları</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={tournamentForm.settings.allowDraw}
                            onChange={(e) => setTournamentForm(prev => ({
                              ...prev,
                              settings: { ...prev.settings, allowDraw: e.target.checked }
                            }))}
                            className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                          />
                          <span className="text-sm font-medium text-gray-700">Beraberlik İzin Ver</span>
                        </label>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Galibiyet Puanı
                        </label>
                        <input
                          type="number"
                          value={tournamentForm.settings.pointsWin}
                          onChange={(e) => setTournamentForm(prev => ({
                            ...prev,
                            settings: { ...prev.settings, pointsWin: parseInt(e.target.value) }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          min="1"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Beraberlik Puanı
                        </label>
                        <input
                          type="number"
                          value={tournamentForm.settings.pointsDraw}
                          onChange={(e) => setTournamentForm(prev => ({
                            ...prev,
                            settings: { ...prev.settings, pointsDraw: parseInt(e.target.value) }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          min="0"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Mağlubiyet Puanı
                        </label>
                        <input
                          type="number"
                          value={tournamentForm.settings.pointsLoss}
                          onChange={(e) => setTournamentForm(prev => ({
                            ...prev,
                            settings: { ...prev.settings, pointsLoss: parseInt(e.target.value) }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          min="0"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Açıklama
                    </label>
                    <textarea
                      value={tournamentForm.description}
                      onChange={(e) => setTournamentForm(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      rows="3"
                      placeholder="Turnuva hakkında detaylı bilgi..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Kurallar
                    </label>
                    <textarea
                      value={tournamentForm.rules}
                      onChange={(e) => setTournamentForm(prev => ({ ...prev, rules: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      rows="4"
                      placeholder="Turnuva kuralları ve şartları..."
                    />
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowTournamentModal(false);
                        resetTournamentForm();
                      }}
                      className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                    >
                      İptal
                    </button>
                    <button
                      type="submit"
                      className="flex items-center space-x-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      <Trophy className="w-4 h-4" />
                      <span>Oluştur</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Turnuvalar;

