import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import SahaSahibiSidebar from '../../components/SahaSahibiSidebar';
import { 
  getTournamentStats,
  getTournamentsByOwner as getTournaments,
  createTournament,
  updateTournament,
  deleteTournament,
  getTournamentParticipants,
  getTournamentMatches,
  getTournamentStandings,
  generateRoundRobinMatches,
  verifyMatchScore,
  distributeTournamentPrizes
} from '../../services/firestoreService';
import { collection, query, onSnapshot, where, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';
import toast from '../../utils/toast';
import { 
  Trophy,
  Plus,
  Calendar,
  Users,
  Target,
  DollarSign,
  Eye,
  Edit,
  Trash2,
  Download,
  Clock,
  MapPin,
  BarChart3,
  X,
  Save,
  Check,
  AlertCircle,
  Play,
  Pause,
  MoreHorizontal,
  ChevronRight
} from 'lucide-react';

const Turnuvalar = () => {
  const { user, userData } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // State'ler
  const [tournamentStats, setTournamentStats] = useState(null);
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [tournamentTeams, setTournamentTeams] = useState([]);
  const [tournamentMatches, setTournamentMatches] = useState([]);

  // Modal state'leri
  const [showTournamentModal, setShowTournamentModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [editingTournament, setEditingTournament] = useState(null);

  // Standings state
  const [standings, setStandings] = useState([]);

  // Calculate standings when matches or teams change
  useEffect(() => {
    if (tournamentTeams.length === 0) {
      setStandings([]);
      return;
    }

    const newStandings = tournamentTeams.map(team => ({
      ...team,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      points: 0
    }));

    tournamentMatches.forEach(match => {
      if (match.status === 'completed' && match.score) {
        const team1 = newStandings.find(t => t.id === match.team1Id);
        const team2 = newStandings.find(t => t.id === match.team2Id);

        if (team1 && team2) {
          team1.played += 1;
          team2.played += 1;
          team1.goalsFor += match.score.score1 || 0;
          team1.goalsAgainst += match.score.score2 || 0;
          team2.goalsFor += match.score.score2 || 0;
          team2.goalsAgainst += match.score.score1 || 0;

          if (match.score.score1 > match.score.score2) {
            team1.won += 1;
            team1.points += 3;
            team2.lost += 1;
          } else if (match.score.score1 < match.score.score2) {
            team2.won += 1;
            team2.points += 3;
            team1.lost += 1;
          } else {
            team1.drawn += 1;
            team1.points += 1;
            team2.drawn += 1;
            team2.points += 1;
          }
        }
      }
    });

    // Sort by points, then goal difference, then goals for
    newStandings.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      const gdA = a.goalsFor - a.goalsAgainst;
      const gdB = b.goalsFor - b.goalsAgainst;
      if (gdB !== gdA) return gdB - gdA;
      return b.goalsFor - a.goalsFor;
    });

    setStandings(newStandings);
  }, [tournamentMatches, tournamentTeams]);

  // Form state'leri
  const [tournamentForm, setTournamentForm] = useState({
    name: '',
    description: '',
    format: 'round_robin',
    type: 'team', // 'individual' | 'team'
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

  const [tesisler, setTesisler] = useState([]);
  const [showScoreVerificationModal, setShowScoreVerificationModal] = useState(false);
  const [selectedMatchForVerification, setSelectedMatchForVerification] = useState(null);
  const [scoreVerificationData, setScoreVerificationData] = useState({ score1: 0, score2: 0 });

  const [teamForm, setTeamForm] = useState({
    teamName: '',
    captainName: '',
    captainPhone: '',
    captainEmail: '',
    players: []
  });

  // Verileri yükle
  useEffect(() => {
    if (!user) return;
    
    loadTournamentData();
    const cleanup = setupRealtimeListener();
    
    return () => {
      if (cleanup) cleanup();
    };
  }, [user, selectedTournament]);



  const setupRealtimeListener = () => {
    if (!user) return;

    let unsubscribeFunctions = [];

    // Turnuvalar için real-time listener
    const tournamentsQuery = query(
      collection(db, 'tournaments'),
      where('ownerId', '==', user.uid)
    );

    const unsubscribeTournaments = onSnapshot(tournamentsQuery, (snapshot) => {
      const tournamentsData = [];
      snapshot.forEach((doc) => {
        tournamentsData.push({ id: doc.id, ...doc.data() });
      });
      
      // Client-side sort
      tournamentsData.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
        return dateB - dateA;
      });

      setTournaments(tournamentsData);
      
      // Select first tournament if none selected
      if (!selectedTournament && tournamentsData.length > 0) {
        setSelectedTournament(tournamentsData[0]);
      }
      
      // İstatistikleri yeniden yükle
      loadTournamentData();
    });
    unsubscribeFunctions.push(unsubscribeTournaments);

    // Tesisler için real-time listener
    const tesislerQuery = query(
      collection(db, 'tesisler'),
      where('ownerId', '==', user.uid)
    );

    const unsubscribeTesisler = onSnapshot(tesislerQuery, (snapshot) => {
      const tesislerData = [];
      snapshot.forEach((doc) => {
        tesislerData.push({ id: doc.id, ...doc.data() });
      });
      setTesisler(tesislerData);
    });
    unsubscribeFunctions.push(unsubscribeTesisler);

    // Seçili turnuva için takımlar ve maçlar için real-time listener
    if (selectedTournament) {
      const teamsQuery = query(
        collection(db, 'tournamentTeams'),
        where('tournamentId', '==', selectedTournament.id),
        orderBy('registeredAt', 'desc')
      );

      const unsubscribeTeams = onSnapshot(teamsQuery, (snapshot) => {
        const teams = [];
        snapshot.forEach((doc) => {
          teams.push({ id: doc.id, ...doc.data() });
        });
        setTournamentTeams(teams);
      });
      unsubscribeFunctions.push(unsubscribeTeams);

      const matchesQuery = query(
        collection(db, 'tournamentMatches'),
        where('tournamentId', '==', selectedTournament.id),
        orderBy('matchDate', 'desc')
      );

      const unsubscribeMatches = onSnapshot(matchesQuery, (snapshot) => {
        const matches = [];
        snapshot.forEach((doc) => {
          matches.push({ id: doc.id, ...doc.data() });
        });
        setTournamentMatches(matches);
      });
      unsubscribeFunctions.push(unsubscribeMatches);
    }

    return () => {
      unsubscribeFunctions.forEach(unsub => unsub());
    };
  };

  const loadTournamentData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [statsResult, tournamentsResult] = await Promise.all([
        getTournamentStats(user.uid),
        getTournaments(user.uid)
      ]);

      if (statsResult.success) {
        setTournamentStats(statsResult.data);
        setTournaments(statsResult.data.tournaments || []);
      }

      if (tournamentsResult.success) {
        setTournaments(tournamentsResult.data);
      }

    } catch (err) {
      console.error('Turnuva veri yükleme hatası:', err);
      setError('Veriler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const loadTournamentDetails = async (tournamentId) => {
    try {
      const [participantsResult, matchesResult] = await Promise.all([
        getTournamentParticipants(tournamentId),
        getTournamentMatches(tournamentId)
      ]);

      if (participantsResult.success) {
        setTournamentTeams(participantsResult.data);
      }

      if (matchesResult.success) {
        setTournamentMatches(matchesResult.data);
      }
    } catch (err) {
      console.error('Turnuva detayları yükleme hatası:', err);
    }
  };

  // Turnuva ekleme/düzenleme
  const handleTournamentSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const tournamentData = {
        name: tournamentForm.name,
        description: tournamentForm.description,
        format: tournamentForm.format,
        type: tournamentForm.type,
        sportType: tournamentForm.sportType,
        ownerId: user.uid,
        ownerType: 'owner',
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

      let result;
      if (editingTournament) {
        result = await updateTournament(editingTournament.id, tournamentData);
      } else {
        result = await createTournament(tournamentData);
      }

      if (result.success) {
        setShowTournamentModal(false);
        resetTournamentForm();
        setEditingTournament(null);
        setSuccess(editingTournament ? 'Turnuva güncellendi' : 'Turnuva oluşturuldu');
        loadTournamentData();
      } else {
        setError(result.error || 'Turnuva kaydedilirken hata oluştu');
      }
    } catch (error) {
      console.error('Turnuva kaydetme hatası:', error);
      setError('Turnuva kaydedilirken hata oluştu');
    }
  };

  const resetTournamentForm = () => {
    setTournamentForm({
      name: '',
      description: '',
      format: 'round_robin',
      type: 'team',
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

  // Round Robin maçlarını oluştur
  const handleGenerateMatches = async (tournamentId) => {
    try {
      setLoading(true);
      const result = await generateRoundRobinMatches(tournamentId);
      if (result.success) {
        setSuccess(`${result.matchCount} maç oluşturuldu`);
        loadTournamentDetails(tournamentId);
      } else {
        setError(result.error || 'Maçlar oluşturulamadı');
      }
    } catch (error) {
      console.error('Maç oluşturma hatası:', error);
      setError('Maçlar oluşturulurken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // Skor doğrulama
  const handleVerifyScore = async () => {
    if (!selectedMatchForVerification) return;

    try {
      setLoading(true);
      const result = await verifyMatchScore(selectedMatchForVerification.id, {
        score1: parseInt(scoreVerificationData.score1),
        score2: parseInt(scoreVerificationData.score2)
      });

      if (result.success) {
        setSuccess('Skor doğrulandı');
        setShowScoreVerificationModal(false);
        setSelectedMatchForVerification(null);
        if (selectedTournament) {
          loadTournamentDetails(selectedTournament.id);
        }
      } else {
        setError(result.error || 'Skor doğrulanamadı');
      }
    } catch (error) {
      console.error('Skor doğrulama hatası:', error);
      setError('Skor doğrulanırken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // Turnuva silme
  const handleDeleteTournament = async (tournamentId) => {
    if (window.confirm('Bu turnuvayı silmek istediğinizden emin misiniz?')) {
      try {
        const result = await deleteTournament(tournamentId);
        if (result.success) {
          setSuccess('Turnuva silindi');
          loadTournamentData();
        }
      } catch (error) {
        console.error('Turnuva silme hatası:', error);
        setError('Turnuva silinirken hata oluştu');
      }
    }
  };

  // Turnuva düzenleme
  const handleEditTournament = (tournament) => {
    setEditingTournament(tournament);
    
    const startDate = tournament.startDate?.toDate ? tournament.startDate.toDate().toISOString().split('T')[0] : '';
    const endDate = tournament.endDate?.toDate ? tournament.endDate.toDate().toISOString().split('T')[0] : '';
    const registrationDeadline = tournament.registrationDeadline?.toDate ? tournament.registrationDeadline.toDate().toISOString().split('T')[0] : '';
    
    setTournamentForm({
      name: tournament.name || '',
      description: tournament.description || '',
      format: tournament.format || 'round_robin',
      type: tournament.type || 'team',
      sportType: tournament.sportType || 'football',
      tesisId: tournament.tesisId || '',
      startDate: startDate,
      endDate: endDate,
      registrationDeadline: registrationDeadline || startDate,
      maxParticipants: tournament.maxParticipants || 16,
      maxTeams: tournament.maxTeams || 16,
      minTeamSize: tournament.minTeamSize || 1,
      maxTeamSize: tournament.maxTeamSize || 11,
      registrationFee: tournament.registrationFee || 0,
      prizePool: tournament.prizePool || 0,
      prizeDistribution: tournament.prizeDistribution || [
        { rank: 1, percentage: 50 },
        { rank: 2, percentage: 30 },
        { rank: 3, percentage: 20 }
      ],
      rules: tournament.rules || '',
      status: tournament.status || 'draft',
      settings: tournament.settings || {
        allowDraw: true,
        pointsWin: 3,
        pointsDraw: 1,
        pointsLoss: 0,
        autoAdvance: false
      }
    });
    setShowTournamentModal(true);
  };

  const formatCurrency = (amount) => {
    if (amount >= 1000000) {
      return `₺${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `₺${(amount / 1000).toFixed(1)}K`;
    }
    return `₺${amount}`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'registration_open': return 'bg-blue-100 text-blue-600';
      case 'ongoing': return 'bg-green-100 text-green-600';
      case 'completed': return 'bg-gray-100 text-gray-600';
      case 'cancelled': return 'bg-red-100 text-red-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'registration_open': return 'Kayıt Açık';
      case 'ongoing': return 'Devam Eden';
      case 'completed': return 'Tamamlandı';
      case 'cancelled': return 'İptal Edildi';
      default: return 'Bilinmeyen';
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <SahaSahibiSidebar />
      
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white shadow-sm border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">🏆 Turnuvalar & Etkinlikler</h1>
              <p className="text-gray-600 mt-1">Aktif turnuvaları yönetin ve takip edin</p>
            </div>
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => {
                  toast.info('Takvim indirme özelliği yakında eklenecektir.'); // Placeholder functionality
                  console.log('Takvim indir tıklandı');
                }}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg"
              >
                <Calendar className="w-4 h-4" />
                <span>📅 Takvimi İndir</span>
              </button>
              <button 
                onClick={() => setShowTournamentModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Plus className="w-4 h-4" />
                <span>➕ Yeni Turnuva</span>
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          {/* Success/Error Messages */}
          {success && (
            <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center">
              <Check className="w-5 h-5 mr-2" />
              {success}
              <button onClick={() => setSuccess(null)} className="ml-auto">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
              <AlertCircle className="w-5 h-5 mr-2" />
              {error}
              <button onClick={() => setError(null)} className="ml-auto">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Stats Cards */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 animate-pulse">
                  <div className="h-20 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          ) : tournamentStats ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Aktif Turnuva</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                      {tournamentStats.activeTournaments || 0}
                    </p>
                    <p className="text-xs text-green-600 mt-1">+1 bu hafta</p>
                  </div>
                  <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <Trophy className="w-6 h-6 text-yellow-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Katılımcı Takım</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                      {tournamentStats.totalTeams || 0}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">+12 yeni</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Toplam Maç</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                      {tournamentStats.totalMatches || 0}
                    </p>
                    <p className="text-xs text-purple-600 mt-1">⚽ Maçlar</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Target className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Turnuva Geliri</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                      {formatCurrency(tournamentStats.totalRevenue || 0)}
                    </p>
                    <p className="text-xs text-green-600 mt-1">+28%</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-center mb-8">
              <p className="text-gray-500">Turnuva verileri yükleniyor...</p>
            </div>
          )}

          {/* Active Tournaments */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-8">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Aktif Turnuvalar</h3>
                <div className="flex items-center space-x-2">
                  <button className="text-sm text-gray-500 hover:text-gray-700">Tümü</button>
                  <span className="text-gray-300">|</span>
                  <button className="text-sm text-green-600 hover:text-green-700">Devam Eden</button>
                  <span className="text-gray-300">|</span>
                  <button className="text-sm text-blue-600 hover:text-blue-700">Kayıt Açık</button>
                </div>
              </div>
            </div>
            
            <div className="divide-y divide-gray-200">
              {tournaments.length > 0 ? (
                tournaments.map((tournament) => (
                  <div 
                    key={tournament.id} 
                    className={`p-6 hover:bg-gray-50 transition-colors cursor-pointer ${selectedTournament?.id === tournament.id ? 'bg-green-50' : ''}`}
                    onClick={() => setSelectedTournament(tournament)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="text-2xl">🏆</div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h4 className="font-semibold text-gray-900">{tournament.name}</h4>
                            <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(tournament.status)}`}>
                              {getStatusText(tournament.status)}
                            </span>
                          </div>
                          <div className="flex items-center space-x-6 text-sm text-gray-500">
                            <span className="flex items-center">
                              <Calendar className="w-4 h-4 mr-1" />
                              {tournament.startDate?.toDate ? new Date(tournament.startDate.toDate()).toLocaleDateString('tr-TR') : tournament.startDate} - {tournament.endDate?.toDate ? new Date(tournament.endDate.toDate()).toLocaleDateString('tr-TR') : tournament.endDate}
                            </span>
                          </div>
                          <div className="grid grid-cols-4 gap-4 mt-3">
                            <div className="flex items-center space-x-2">
                              <Users className="w-4 h-4 text-blue-500" />
                              <span className="text-sm font-medium">{Array.isArray(tournament.registeredTeams) ? tournament.registeredTeams.length : (tournament.registeredTeams || 0)}/{tournament.maxTeams} Takım</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Target className="w-4 h-4 text-purple-500" />
                              <span className="text-sm font-medium">{tournament.totalMatches || 0} Maç</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <DollarSign className="w-4 h-4 text-green-500" />
                              <span className="text-sm font-medium">
                                {tournament.registrationFee > 0 ? formatCurrency(tournament.registrationFee) : 'Ücretsiz'} Kayıt
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Trophy className="w-4 h-4 text-yellow-500" />
                              <span className="text-sm font-medium">
                                {tournament.prizeType === 'money' ? formatCurrency(tournament.prizeAmount) : 
                                 tournament.prizeType === 'trophy' ? 'Kupa' : 
                                 `${formatCurrency(tournament.prizeAmount)} + Kupa`} Ödül
                              </span>
                            </div>
                          </div>
                          {tournament.status === 'ongoing' && (
                            <div className="mt-3">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">İlerleme</span>
                                <span className="font-medium">{tournamentMatches.filter(m => m.status === 'completed').length || 0} / {tournamentMatches.length || 0} maç</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                                <div 
                                  className="bg-green-600 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${((tournamentMatches.filter(m => m.status === 'completed').length || 0) / (tournamentMatches.length || 1)) * 100}%` }}
                                ></div>
                              </div>
                            </div>
                          )}
                          {tournament.status === 'completed' && tournament.prizePool > 0 && (
                            <div className="mt-3">
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (window.confirm('Ödülleri dağıtmak istediğinizden emin misiniz?')) {
                                    try {
                                      setLoading(true);
                                      const result = await distributeTournamentPrizes(tournament.id);
                                      if (result.success) {
                                        toast.success('Ödüller başarıyla dağıtıldı');
                                        loadTournamentData();
                                      } else {
                                        toast.error(result.error || 'Ödüller dağıtılamadı');
                                      }
                                    } catch (error) {
                                      console.error('Ödül dağıtım hatası:', error);
                                      toast.error('Ödüller dağıtılırken hata oluştu');
                                    } finally {
                                      setLoading(false);
                                    }
                                  }
                                }}
                                className="w-full px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 text-sm font-medium"
                              >
                                Ödülleri Dağıt
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button className="text-gray-400 hover:text-gray-600" onClick={(e) => e.stopPropagation()}>
                          <BarChart3 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditTournament(tournament);
                          }}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTournament(tournament.id);
                          }}
                          className="text-red-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center">
                  <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Henüz turnuva yok</h4>
                  <p className="text-gray-500 mb-4">İlk turnuvanızı oluşturmak için yukarıdaki butona tıklayın.</p>
                </div>
              )}
            </div>
          </div>

          {/* Matches Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-8">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedTournament ? `${selectedTournament.name} - Maçlar` : 'Maçlar'}
                </h3>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {tournamentMatches.length > 0 ? (
                  tournamentMatches.map((match) => (
                    <div key={match.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-4 flex-1">
                        <div className="text-center w-24">
                          <span className="text-xs text-gray-500 font-bold block truncate">{match.team1Name || 'Takım 1'}</span>
                        </div>
                        <div className="text-center px-2">
                          {match.status === 'completed' ? (
                             <span className="font-bold text-gray-900">{match.score?.score1} - {match.score?.score2}</span>
                          ) : (
                             <span className="text-gray-400">VS</span>
                          )}
                        </div>
                        <div className="text-center w-24">
                          <span className="text-xs text-gray-500 font-bold block truncate">{match.team2Name || 'Takım 2'}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-gray-900">
                          {match.matchDate?.toDate ? match.matchDate.toDate().toLocaleTimeString('tr-TR', {hour: '2-digit', minute:'2-digit'}) : match.matchTime}
                        </div>
                        <div className="text-xs text-gray-500">
                          {match.matchDate?.toDate ? match.matchDate.toDate().toLocaleDateString('tr-TR') : match.date}
                        </div>
                        <div className="text-xs text-gray-500">{match.pitchName || 'Saha Belirlenmedi'}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-gray-500 py-4">
                    {selectedTournament ? 'Bu turnuvada henüz maç bulunmuyor.' : 'Maçları görüntülemek için bir turnuva seçin.'}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Standings Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                   {selectedTournament ? `${selectedTournament.name} - Puan Durumu` : 'Puan Durumu'}
                </h3>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sıra</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Takım</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">O</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">G</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">B</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">M</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">A</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Y</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">AV</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">P</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {standings.length > 0 ? (
                    standings.map((team, index) => (
                      <tr key={team.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{index + 1}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                             <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-xs uppercase">
                               {team.teamName?.substring(0, 2) || 'TK'}
                             </div>
                            <span className="font-medium">{team.teamName}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-gray-900">{team.played}</td>
                        <td className="px-6 py-4 text-center text-sm text-gray-900">{team.won}</td>
                        <td className="px-6 py-4 text-center text-sm text-gray-900">{team.drawn}</td>
                        <td className="px-6 py-4 text-center text-sm text-gray-900">{team.lost}</td>
                        <td className="px-6 py-4 text-center text-sm text-gray-900">{team.goalsFor}</td>
                        <td className="px-6 py-4 text-center text-sm text-gray-900">{team.goalsAgainst}</td>
                        <td className="px-6 py-4 text-center text-sm text-gray-900">{team.goalsFor - team.goalsAgainst}</td>
                        <td className="px-6 py-4 text-center text-sm font-bold text-gray-900">{team.points}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="10" className="px-6 py-4 text-center text-sm text-gray-500">
                        {selectedTournament ? 'Henüz takım verisi bulunmuyor.' : 'Puan durumunu görüntülemek için bir turnuva seçin.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Turnuva Modal */}
      {showTournamentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingTournament ? 'Turnuva Düzenle' : 'Yeni Turnuva'}
                </h2>
                <button
                  onClick={() => {
                    setShowTournamentModal(false);
                    setEditingTournament(null);
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
                      <option value="swimming">Yüzme</option>
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
                        <label className="block text-sm font-bold text-gray-900 mb-1">
                          Toplam Takım Sayısı *
                        </label>
                        <p className="text-[11px] text-gray-500 mb-2 uppercase font-bold tracking-tight">Turnuvada yarışacak toplam ekip adedi</p>
                        <input
                          type="number"
                          value={tournamentForm.maxTeams}
                          onChange={(e) => setTournamentForm(prev => ({ ...prev, maxTeams: parseInt(e.target.value) }))}
                          className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:bg-white transition-all font-medium"
                          min="2"
                          max="128"
                          required
                          placeholder="Örn: 16"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-900 mb-1">
                          Min. Kadro Boyutu
                        </label>
                        <p className="text-[11px] text-gray-500 mb-2 uppercase font-bold tracking-tight">Bir takımdaki minimum oyuncu sayısı</p>
                        <input
                          type="number"
                          value={tournamentForm.minTeamSize}
                          onChange={(e) => setTournamentForm(prev => ({ ...prev, minTeamSize: parseInt(e.target.value) }))}
                          className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:bg-white transition-all font-medium"
                          min="1"
                          placeholder="Örn: 5"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-900 mb-1">
                          Maks. Kadro Boyutu
                        </label>
                        <p className="text-[11px] text-gray-500 mb-2 uppercase font-bold tracking-tight">Bir takımdaki maksimum oyuncu sayısı</p>
                        <input
                          type="number"
                          value={tournamentForm.maxTeamSize}
                          onChange={(e) => setTournamentForm(prev => ({ ...prev, maxTeamSize: parseInt(e.target.value) }))}
                          className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:bg-white transition-all font-medium"
                          min="1"
                          placeholder="Örn: 11"
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
                      Tesis (Opsiyonel)
                    </label>
                    <select
                      value={tournamentForm.tesisId}
                      onChange={(e) => setTournamentForm(prev => ({ ...prev, tesisId: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="">Tesis Seçiniz</option>
                      {tesisler.map((tesis) => (
                        <option key={tesis.id} value={tesis.id}>
                          {tesis.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Başlangıç Tarihi
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
                      Bitiş Tarihi
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
                      setEditingTournament(null);
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
                    <span>{editingTournament ? 'Güncelle' : 'Oluştur'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Skor Doğrulama Modal */}
      {showScoreVerificationModal && selectedMatchForVerification && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Skor Doğrulama</h2>
                <button
                  onClick={() => {
                    setShowScoreVerificationModal(false);
                    setSelectedMatchForVerification(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-2">
                    {selectedMatchForVerification.participant1Name} vs {selectedMatchForVerification.participant2Name}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {selectedMatchForVerification.participant1Name} Skoru
                    </label>
                    <input
                      type="number"
                      value={scoreVerificationData.score1}
                      onChange={(e) => setScoreVerificationData(prev => ({ ...prev, score1: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      min="0"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {selectedMatchForVerification.participant2Name} Skoru
                    </label>
                    <input
                      type="number"
                      value={scoreVerificationData.score2}
                      onChange={(e) => setScoreVerificationData(prev => ({ ...prev, score2: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      min="0"
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowScoreVerificationModal(false);
                      setSelectedMatchForVerification(null);
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    İptal
                  </button>
                  <button
                    onClick={handleVerifyScore}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Skoru Doğrula
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Turnuvalar;
