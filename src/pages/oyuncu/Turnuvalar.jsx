import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  getAllTournaments, 
  getTournament, 
  getTournamentParticipants,
  registerToTournament,
  registerTeamToTournament 
} from '../../services/firestoreService';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import OyuncuSidebar from '../../components/OyuncuSidebar';
import TournamentDetail from '../../components/tournament/TournamentDetail';
import TournamentPayment from '../../components/tournament/TournamentPayment';
import DashboardHeader from '../../components/DashboardHeader';
import { Trophy, Calendar, MapPin, DollarSign, Users, AlertCircle, CheckCircle, X, Eye, UserPlus, Search, Filter } from 'lucide-react';
import toast from '../../utils/toast';
import { getTournamentStatusLabel, formatTournamentDate, canRegister } from '../../utils/tournamentUtils';

const Turnuvalar = () => {
  const { user, userData } = useAuth();
  const [tournaments, setTournaments] = useState([]);
  const [myTournaments, setMyTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // all, open, my, completed
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!user) return;
    
    loadTournaments();
    loadMyTournaments();
    const cleanup = setupRealtimeListener();
    
    return () => {
      if (cleanup) cleanup();
    };
  }, [user]);

  const setupRealtimeListener = () => {
    if (!user) return;

    const tournamentsQuery = query(
      collection(db, 'tournaments'),
      where('status', 'in', ['registration_open', 'ongoing'])
    );

    const unsubscribe = onSnapshot(tournamentsQuery, (snapshot) => {
      const tournamentsData = [];
      snapshot.forEach((doc) => {
        tournamentsData.push({ id: doc.id, ...doc.data() });
      });
      
      setTournaments(tournamentsData);
      loadMyTournaments();
    }, (error) => {
      console.error('Turnuva listener hatası:', error);
      // Index hatası olabilir, tüm turnuvaları yükle
      loadAllTournaments();
    });

    return () => unsubscribe();
  };

  const loadAllTournaments = async () => {
    try {
      const result = await getAllTournaments({ status: 'registration_open' });
      if (result.success) {
        setTournaments(result.data);
      }
    } catch (error) {
      console.error('Turnuvalar yükleme hatası:', error);
    }
  };

  const loadTournaments = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await getAllTournaments({ status: 'registration_open' });
      if (result.success) {
        setTournaments(result.data);
      }
    } catch (err) {
      console.error('Turnuvalar yükleme hatası:', err);
      setError('Veriler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const loadMyTournaments = async () => {
    if (!user) return;
    
    try {
      // Kullanıcının kayıtlı olduğu turnuvaları getir
      const participantsQuery = query(
        collection(db, 'tournamentParticipants'),
        where('participantId', '==', user.uid)
      );
      
      // Bu sorgu için listener kurulamazsa, tüm turnuvaları kontrol edebiliriz
      const allResult = await getAllTournaments({});
      if (allResult.success) {
        // Participant kontrolü yapılacak
        const myTours = [];
        for (const tournament of allResult.data) {
          const participantsResult = await getTournamentParticipants(tournament.id);
          if (participantsResult.success) {
            const isRegistered = participantsResult.data.some(p => p.participantId === user.uid);
            if (isRegistered) {
              myTours.push(tournament);
            }
          }
        }
        setMyTournaments(myTours);
      }
    } catch (err) {
      console.error('Benim turnuvalarım yükleme hatası:', err);
    }
  };

  const handleViewDetail = (tournament) => {
    setSelectedTournament(tournament);
    setShowDetailModal(true);
  };

  const handleRegisterClick = async (tournament) => {
    if (!user) {
      toast.error('Kayıt olmak için giriş yapmalısınız');
      return;
    }

    setSelectedTournament(tournament);
    setShowDetailModal(true);
  };

  const handlePaymentRequest = (tournamentId, participantId) => {
    setShowDetailModal(false);
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    setSelectedTournament(null);
    loadMyTournaments();
    toast.success('Ödeme başarıyla tamamlandı!');
  };

  const isRegistered = (tournament) => {
    if (!tournament || !user) return false;
    return myTournaments.some(t => t.id === tournament.id);
  };

  const filteredTournaments = (filter === 'my' ? myTournaments : tournaments).filter(tournament => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return tournament.name?.toLowerCase().includes(query) ||
             tournament.description?.toLowerCase().includes(query) ||
             tournament.sportType?.toLowerCase().includes(query);
    }

    if (filter === 'all') return true;
    if (filter === 'open' && tournament.status === 'registration_open') return true;
    if (filter === 'active' && tournament.status === 'ongoing') return true;
    if (filter === 'completed' && tournament.status === 'completed') return true;
    return false;
  });


  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Hata</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadTournaments}
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
      <OyuncuSidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <DashboardHeader title="Turnuvalar">
          <div className="relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Turnuva ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-1.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 w-48 lg:w-64 text-sm outline-none transition-all"
            />
          </div>
        </DashboardHeader>

        <div className="bg-white border-b sticky top-0 z-10">
          <div className="px-4 sm:px-6 py-3 flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
            {/* Horizontal Scroll Filters */}
            <div className="flex space-x-2 overflow-x-auto pb-1 sm:pb-0 no-scrollbar items-center">
              <button
                onClick={() => setFilter('all')}
                className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  filter === 'all' ? 'bg-green-600 text-white shadow-lg shadow-green-200' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                Tümü
              </button>
              <button
                onClick={() => setFilter('open')}
                className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  filter === 'open' ? 'bg-green-600 text-white shadow-lg shadow-green-200' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                Kayıtlar Açık
              </button>
              <button
                onClick={() => setFilter('my')}
                className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  filter === 'my' ? 'bg-green-600 text-white shadow-lg shadow-green-200' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                Maçlarım
              </button>
              <button
                onClick={() => setFilter('active')}
                className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  filter === 'active' ? 'bg-green-600 text-white shadow-lg shadow-green-200' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                Devam Ediyor
              </button>
              <button
                onClick={() => setFilter('completed')}
                className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  filter === 'completed' ? 'bg-green-600 text-white shadow-lg shadow-green-200' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                Tamamlanan
              </button>
            </div>

            {/* Mobile Search - Visible only on mobile */}
            <div className="relative sm:hidden">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Turnuva ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-green-500 text-sm outline-none"
              />
            </div>
          </div>
        </div>

        <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredTournaments.length > 0 ? (
              filteredTournaments.map((tournament) => (
                <div key={tournament.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 hover:shadow-xl hover:shadow-green-900/5 transition-all duration-300 group">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-200 group-hover:scale-110 transition-transform duration-500">
                      <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                    </div>
                    <span className={`px-3 py-1 text-[10px] sm:text-xs font-bold rounded-full tracking-wider uppercase ${
                      tournament.status === 'registration_open' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                      tournament.status === 'ongoing' ? 'bg-green-50 text-green-600 border border-green-100' :
                      tournament.status === 'completed' ? 'bg-gray-50 text-gray-600 border border-gray-100' :
                      'bg-gray-50 text-gray-600 border border-gray-100'
                    }`}>
                      {getTournamentStatusLabel(tournament.status)}
                    </span>
                  </div>

                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 line-clamp-1 group-hover:text-green-600 transition-colors">{tournament.name}</h3>
                  <p className="text-gray-500 mb-4 text-xs sm:text-sm line-clamp-2 leading-relaxed">{tournament.description}</p>

                  <div className="space-y-2.5 mb-6">
                    <div className="flex items-center text-xs sm:text-sm text-gray-600 bg-gray-50 rounded-lg p-2">
                      <Calendar className="w-4 h-4 mr-2 text-orange-500" />
                      <span className="font-medium">{formatTournamentDate(tournament.startDate)} - {formatTournamentDate(tournament.endDate)}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center text-xs sm:text-sm text-gray-600 bg-gray-50 rounded-lg p-2">
                        <Users className="w-4 h-4 mr-2 text-blue-500" />
                        <span className="font-medium">
                          {tournament.type === 'team' 
                            ? `${tournament.maxTeams || 0} Takım`
                            : `${tournament.maxParticipants || 0} Kişi`}
                        </span>
                      </div>
                      {tournament.registrationFee > 0 && (
                        <div className="flex items-center text-xs sm:text-sm text-gray-600 bg-gray-50 rounded-lg p-2">
                          <DollarSign className="w-4 h-4 mr-2 text-green-500" />
                          <span className="font-bold">{tournament.registrationFee} ₺</span>
                        </div>
                      )}
                    </div>
                    {tournament.prizePool > 0 && (
                      <div className="flex items-center text-xs sm:text-sm text-gray-900 bg-yellow-50 rounded-lg p-2 border border-yellow-100">
                        <Trophy className="w-4 h-4 mr-2 text-yellow-600" />
                        <span className="font-bold">Ödül: {tournament.prizePool} ₺</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleViewDetail(tournament)}
                      className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 text-xs sm:text-sm font-bold rounded-xl hover:bg-gray-200 transition-all active:scale-95"
                    >
                      Detaylar
                    </button>
                    {canRegister(tournament) && !isRegistered(tournament) && (
                      <button
                        onClick={() => handleRegisterClick(tournament)}
                        className="flex-1 px-4 py-2.5 bg-green-600 text-white text-xs sm:text-sm font-bold rounded-xl hover:bg-green-700 shadow-lg shadow-green-100 transition-all active:scale-95 flex items-center justify-center gap-2"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>Kayıt Ol</span>
                      </button>
                    )}
                    {isRegistered(tournament) && (
                      <div className="flex-1 flex items-center justify-center gap-2 text-green-600 bg-green-50 px-4 py-2.5 rounded-xl border border-green-100 transition-all">
                        <CheckCircle className="w-4 h-4" />
                        <span className="font-bold text-xs sm:text-sm">Kayıtlı</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                  <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz turnuva yok</h3>
                  <p className="text-gray-600">Bu filtrede turnuva bulunmuyor</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Detail Modal */}
        {showDetailModal && selectedTournament && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
              <TournamentDetail
                tournament={selectedTournament}
                userId={user?.uid}
                userType="player"
                userData={userData}
                onRegister={handlePaymentRequest}
                onBack={() => {
                  setShowDetailModal(false);
                  setSelectedTournament(null);
                }}
              />
            </div>
          </div>
        )}

        {/* Payment Modal */}
        {showPaymentModal && selectedTournament && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <TournamentPayment
                tournament={selectedTournament}
                participantId={user?.uid}
                userId={user?.uid}
                participantName={user?.displayName || 'Oyuncu'}
                onPaymentSuccess={handlePaymentSuccess}
                onCancel={() => {
                  setShowPaymentModal(false);
                  setSelectedTournament(null);
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Turnuvalar;
