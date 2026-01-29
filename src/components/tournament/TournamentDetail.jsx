import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Calendar, 
  Users, 
  DollarSign, 
  MapPin, 
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Play,
  Award,
  FileText,
  UserPlus,
  CreditCard
} from 'lucide-react';
import { 
  getTournamentParticipants,
  getTournamentMatches,
  getTournamentStandings,
  registerToTournament,
  registerTeamToTournament,
  getUserTeams,
  createTeam
} from '../../services/firestoreService';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import TournamentStandings from './TournamentStandings';
import MatchScoreEntry from './MatchScoreEntry';
import { formatTournamentDate, formatTournamentDateTime, getTournamentStatusLabel, canRegister, isTournamentFull } from '../../utils/tournamentUtils';
import toast from '../../utils/toast';

const TournamentDetail = ({ tournament, userId, userType = 'player', userData = null, onRegister, onBack }) => {
  const [activeTab, setActiveTab] = useState('info');
  const [participants, setParticipants] = useState([]);
  const [matches, setMatches] = useState([]);
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [userParticipation, setUserParticipation] = useState(null);
  
  // Team registration states
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [userTeams, setUserTeams] = useState([]);
  const [teamForm, setTeamForm] = useState({ name: '', members: [] });
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);

  // Kayıt durumu kontrolü
  const isFull = isTournamentFull(tournament, participants.length);
  const canReg = canRegister(tournament);
  const showRegisterButton = canReg && !isFull && !isRegistered;
  
  // isDeadlinePassed: canRegister false döndüyse VE status registration_open ise deadline geçmiş demektir
  const isDeadlinePassed = !canReg && tournament.status === 'registration_open' && tournament.registrationDeadline;
  
  // Detaylı kayıt durumu loglama
  useEffect(() => {
    console.log('📊 Turnuva Kayıt Durumu:', {
      tournamentId: tournament?.id,
      tournamentName: tournament?.name,
      tournamentStatus: tournament?.status,
      registrationDeadline: tournament?.registrationDeadline,
      isDeadlinePassed,
      isFull,
      participantsCount: participants.length,
      maxParticipants: tournament?.maxParticipants || tournament?.maxTeams,
      canRegister: canReg,
      isRegistered,
      showRegisterButton
    });
  }, [tournament, isDeadlinePassed, isFull, participants.length, canReg, isRegistered, showRegisterButton]);

  useEffect(() => {
    if (tournament) {
      loadTournamentData();
      setupRealtimeListeners();
    }
    
    if (userId) {
      fetchUserTeams();
    }
    
    return () => {
      // Cleanup listeners will be handled by unsubscribe functions
    };
  }, [tournament, userId]);

  const fetchUserTeams = async () => {
    if (!userId) return;
    try {
      const result = await getUserTeams(userId);
      if (result.success) {
        setUserTeams(result.data);
        // Auto-select first team if none selected
        if (result.data.length > 0 && !selectedTeamId) {
          setSelectedTeamId(result.data[0].id);
        }
      }
    } catch (error) {
      console.error('Takımları getirme hatası:', error);
    }
  };

  const setupRealtimeListeners = () => {
    if (!tournament?.id) return;

    const unsubscribeFunctions = [];

    // Participants listener
    const participantsQuery = query(
      collection(db, 'tournamentParticipants'),
      where('tournamentId', '==', tournament.id)
    );
    
    const unsubscribeParticipants = onSnapshot(participantsQuery, (snapshot) => {
      const participantsData = [];
      snapshot.forEach((doc) => {
        participantsData.push({ id: doc.id, ...doc.data() });
      });
      setParticipants(participantsData);
    });
    unsubscribeFunctions.push(unsubscribeParticipants);

    // Matches listener
    const matchesQuery = query(
      collection(db, 'tournamentMatches'),
      where('tournamentId', '==', tournament.id)
    );
    
    const unsubscribeMatches = onSnapshot(matchesQuery, (snapshot) => {
      const matchesData = [];
      snapshot.forEach((doc) => {
        matchesData.push({ id: doc.id, ...doc.data() });
      });
      
      // Sort by round and matchNumber
      matchesData.sort((a, b) => {
        if (a.round !== b.round) return a.round - b.round;
        return (a.matchNumber || 0) - (b.matchNumber || 0);
      });
      
      setMatches(matchesData);
    });
    unsubscribeFunctions.push(unsubscribeMatches);

    // Standings listener - orderBy kaldırıldı (index hatası nedeniyle), client-side sorting yapılıyor
    const standingsQuery = query(
      collection(db, 'tournamentStandings'),
      where('tournamentId', '==', tournament.id)
    );
    
    const unsubscribeStandings = onSnapshot(standingsQuery, (snapshot) => {
      const standingsData = [];
      snapshot.forEach((doc) => {
        standingsData.push({ id: doc.id, ...doc.data() });
      });
      
      // Client-side sort by rank (index hatası nedeniyle orderBy kullanılmıyor)
      standingsData.sort((a, b) => (a.rank || 0) - (b.rank || 0));
      
      setStandings(standingsData);
    }, (error) => {
      console.error('Standings listener hatası:', error);
      // Index hatası durumunda sessizce devam et
    });
    unsubscribeFunctions.push(unsubscribeStandings);

    return () => {
      unsubscribeFunctions.forEach(unsub => unsub());
    };
  };

  // Update isRegistered whenever participants or userTeams change
  useEffect(() => {
    if (!userId) {
      setIsRegistered(false);
      setUserParticipation(null);
      return;
    }

    let participation = null;
    if (tournament?.type === 'team') {
      const userTeamIds = userTeams.map(t => t.id);
      participation = participants.find(
        p => p.participantType === 'team' && userTeamIds.includes(p.participantId)
      );
    } else {
      participation = participants.find(
        p => p.participantId === userId
      );
    }
    
    setUserParticipation(participation);
    setIsRegistered(!!participation);
  }, [participants, userTeams, tournament?.type, userId]);

  const loadTournamentData = async () => {
    if (!tournament?.id) return;

    try {
      setLoading(true);
      const [participantsResult, matchesResult, standingsResult] = await Promise.all([
        getTournamentParticipants(tournament.id),
        getTournamentMatches(tournament.id),
        getTournamentStandings(tournament.id)
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
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!userId) {
      toast.error('Kayıt olmak için giriş yapmalısınız');
      return;
    }

    try {
      setRegistering(true);
      
      let result;
      const participantName = userData?.fullName || userData?.displayName || 'Oyuncu';
      
      if (tournament.type === 'individual') {
        result = await registerToTournament(tournament.id, {
          participantId: userId,
          participantName: participantName
        });
      } else {
        // Takım kaydı için modalı aç
        if (userTeams.length > 0) {
          setSelectedTeamId(userTeams[0].id); // İlk takımı varsayılan seç
        }
        setShowTeamModal(true);
        setRegistering(false); // Modal açıldığı için loading'i kapat
        return;
      }

      if (result.success) {
        if (result.requiresPayment && tournament.registrationFee > 0) {
          toast.success('Kayıt başarılı. Ödeme sayfasına yönlendiriliyorsunuz...');
          if (onRegister) {
            onRegister(tournament.id, userId);
          }
        } else {
          toast.success('Turnuvaya başarıyla kayıt oldunuz!');
          setIsRegistered(true);
          loadTournamentData();
        }
      } else {
        toast.error(result.error || 'Kayıt olunamadı');
      }
    } catch (error) {
      console.error('Kayıt hatası:', error);
      toast.error('Kayıt olurken hata oluştu');
    } finally {
      setRegistering(false);
    }
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!teamForm.name.trim()) return;

    try {
      setRegistering(true);
      const result = await createTeam({
        name: teamForm.name,
        captainId: userId,
        captainName: userData?.fullName || userData?.displayName || 'Kaptan',
        members: [userId], // Kaptan otomatik üye
        sportType: tournament.sportType || 'football'
      });

      if (result.success) {
        toast.success('Takım oluşturuldu');
        await fetchUserTeams(); // Listeyi güncelle
        setSelectedTeamId(result.id); // Yeni takımı seç
        setIsCreatingTeam(false);
        setTeamForm({ name: '', members: [] });
      } else {
        toast.error(result.error || 'Takım oluşturulamadı');
      }
    } catch (error) {
      console.error('Takım oluşturma hatası:', error);
      toast.error('Hata oluştu');
    } finally {
      setRegistering(false);
    }
  };

  const handleTeamRegister = async () => {
    if (!selectedTeamId) {
      toast.error('Lütfen bir takım seçin');
      return;
    }

    try {
      setRegistering(true);
      const result = await registerTeamToTournament(tournament.id, selectedTeamId, userId);

      if (result.success) {
        setShowTeamModal(false);
        if (result.requiresPayment && tournament.registrationFee > 0) {
          toast.success('Kayıt başarılı. Ödeme sayfasına yönlendiriliyorsunuz...');
          if (onRegister) {
            // Takım turnuvası için takım ID'sini, bireysel için kullanıcı ID'sini gönder
            onRegister(tournament.id, selectedTeamId);
          }
        } else {
          toast.success('Takımınız turnuvaya başarıyla kaydedildi!');
          setIsRegistered(true);
          loadTournamentData();
        }
      } else {
        toast.error(result.error || 'Kayıt olunamadı');
      }
    } catch (error) {
      console.error('Takım kayıt hatası:', error);
      toast.error('Kayıt olurken hata oluştu');
    } finally { 
      setRegistering(false);
    }
  };

  const userMatches = matches.filter(m => 
    m.participant1Id === userId || 
    m.participant2Id === userId ||
    (m.participant1Id && m.participant2Id && (
      m.participant1Id.includes(userId) || m.participant2Id.includes(userId)
    ))
  );

  if (!tournament) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 text-center">
        <p className="text-gray-500">Turnuva bulunamadı</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-8 text-white">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {onBack && (
              <button
                onClick={onBack}
                className="text-white/80 hover:text-white mb-4 text-sm flex items-center space-x-1"
              >
                <span>← Geri</span>
              </button>
            )}
            <h1 className="text-3xl font-bold mb-2">{tournament.name}</h1>
            <p className="text-green-100 text-lg">{tournament.description || ''}</p>
          </div>
          <div className="ml-6">
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
              tournament.status === 'registration_open' ? 'bg-green-500 text-white' :
              tournament.status === 'ongoing' ? 'bg-blue-500 text-white' :
              tournament.status === 'completed' ? 'bg-gray-500 text-white' :
              'bg-gray-400 text-white'
            }`}>
              {getTournamentStatusLabel(tournament.status)}
            </span>
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <Calendar className="w-5 h-5 mb-2" />
            <p className="text-sm text-green-100">Başlangıç</p>
            <p className="text-lg font-semibold">{formatTournamentDate(tournament.startDate)}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <Users className="w-5 h-5 mb-2" />
            <p className="text-sm text-green-100">Katılımcı</p>
            <p className="text-lg font-semibold">
              {participants.length} / {tournament.type === 'team' ? tournament.maxTeams : tournament.maxParticipants}
            </p>
          </div>
          {tournament.registrationFee > 0 && (
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <DollarSign className="w-5 h-5 mb-2" />
              <p className="text-sm text-green-100">Kayıt Ücreti</p>
              <p className="text-lg font-semibold">{tournament.registrationFee} ₺</p>
            </div>
          )}
          {tournament.prizePool > 0 && (
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <Award className="w-5 h-5 mb-2" />
              <p className="text-sm text-green-100">Ödül Havuzu</p>
              <p className="text-lg font-semibold">{tournament.prizePool} ₺</p>
            </div>
          )}
        </div>

        {/* Register Button */}
        {userType === 'player' && userId && (
          <div className="mt-6">
            {isRegistered ? (
              userParticipation?.status === 'pending_payment' && tournament.registrationFee > 0 ? (
                <div className="bg-white/20 backdrop-blur-sm rounded-lg p-5 border border-white/30">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center space-x-3 text-white">
                      <div className="w-10 h-10 bg-yellow-400/30 rounded-full flex items-center justify-center">
                        <CreditCard className="w-6 h-6 text-yellow-300" />
                      </div>
                      <div>
                        <p className="font-bold text-lg">Ödeme Bekleniyor</p>
                        <p className="text-sm text-green-100 italic">Kayıt işlemini tamamlamak için ödeme yapmalısınız.</p>
                      </div>
                    </div>
                    <button
                      onClick={() => onRegister && onRegister(tournament.id, userParticipation.participantId)}
                      className="w-full sm:w-auto px-6 py-3 bg-white text-green-700 font-bold rounded-xl hover:bg-yellow-50 transition-all flex items-center justify-center gap-2 shadow-lg hover:scale-105 active:scale-95"
                    >
                      <CreditCard className="w-5 h-5" />
                      <span>{tournament.registrationFee} ₺ Ödeme Yap</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-white/20 backdrop-blur-sm rounded-lg border border-white/30">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-6 h-6 text-white" />
                    <div>
                      <span className="font-bold text-lg block leading-tight">Turnuvaya Kayıtlısınız</span>
                      <span className="text-xs text-green-100">Katılımınız onaylanmıştır.</span>
                    </div>
                  </div>
                </div>
              )
            ) : showRegisterButton ? (
              <button
                onClick={handleRegister}
                disabled={registering}
                className="bg-white text-green-600 px-8 py-4 rounded-lg font-bold text-lg hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-3 shadow-lg transition-all hover:scale-105"
              >
                {registering ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-600"></div>
                    <span>Kayıt olunuyor...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-6 h-6" />
                    <span>
                      {tournament.registrationFee > 0 
                        ? `Turnuvaya Kayıt Ol (${tournament.registrationFee} ₺)` 
                        : 'Turnuvaya Ücretsiz Kayıt Ol'}
                    </span>
                  </>
                )}
              </button>
            ) : isFull ? (
              <div className="p-4 bg-white/20 backdrop-blur-sm rounded-lg">
                <div className="flex items-center space-x-2 text-yellow-100">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-medium">Turnuva kontenjanı dolmuş</span>
                </div>
              </div>
            ) : isDeadlinePassed && tournament.status === 'registration_open' ? (
              <div className="p-4 bg-white/20 backdrop-blur-sm rounded-lg">
                <div className="flex items-center space-x-2 text-yellow-100">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-medium">Kayıt süresi dolmuş</span>
                </div>
              </div>
            ) : tournament.status !== 'registration_open' ? (
              <div className="p-4 bg-white/20 backdrop-blur-sm rounded-lg">
                <div className="flex items-center space-x-2 text-yellow-100">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-medium">Kayıtlar şu anda açık değil</span>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          {['info', 'participants', 'matches', 'standings'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab === 'info' && 'Bilgiler'}
              {tab === 'participants' && `Katılımcılar (${participants.length})`}
              {tab === 'matches' && `Maçlar (${matches.length})`}
              {tab === 'standings' && 'Puan Durumu'}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'info' && (
          <div className="space-y-6">
            {/* Register Button for Info Tab */}
            {userType === 'player' && userId && !isRegistered && canRegister(tournament) && !isTournamentFull(tournament, participants.length) && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Turnuvaya Katıl</h4>
                    <p className="text-sm text-gray-600">
                      {tournament.registrationFee > 0 
                        ? `${tournament.registrationFee} ₺ kayıt ücreti ile katılabilirsiniz`
                        : 'Ücretsiz olarak katılabilirsiniz'}
                    </p>
                  </div>
                  <button
                    onClick={handleRegister}
                    disabled={registering}
                    className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors"
                  >
                    {registering ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Kayıt olunuyor...</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-5 h-5" />
                        <span>Katıl</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {userType === 'player' && userId && isRegistered && (
              <div className={`border rounded-lg p-5 ${
                userParticipation?.status === 'pending_payment' 
                  ? 'bg-yellow-50 border-yellow-200' 
                  : 'bg-green-50 border-green-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {userParticipation?.status === 'pending_payment' ? (
                      <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600">
                        <CreditCard size={20} />
                      </div>
                    ) : (
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                        <CheckCircle size={20} />
                      </div>
                    )}
                    <div>
                      <h4 className={`font-bold ${userParticipation?.status === 'pending_payment' ? 'text-yellow-800' : 'text-green-800'}`}>
                        {userParticipation?.status === 'pending_payment' ? 'Ödeme Bekleniyor' : 'Turnuvaya Kayıtlısınız'}
                      </h4>
                      <p className={`text-sm ${userParticipation?.status === 'pending_payment' ? 'text-yellow-700' : 'text-green-700'}`}>
                        {userParticipation?.status === 'pending_payment' 
                          ? 'Kayıt işleminiz ödeme sonrası onaylanacaktır.' 
                          : 'Katılımınız başarıyla tamamlandı.'}
                      </p>
                    </div>
                  </div>
                  {userParticipation?.status === 'pending_payment' && tournament.registrationFee > 0 && (
                    <button
                      onClick={() => onRegister && onRegister(tournament.id, userParticipation.participantId)}
                      className="px-5 py-2.5 bg-yellow-600 text-white font-bold rounded-xl hover:bg-yellow-700 transition-colors shadow-sm text-sm"
                    >
                      Bakiye Öde
                    </button>
                  )}
                </div>
              </div>
            )}

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Turnuva Bilgileri</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Spor Türü</p>
                  <p className="text-base font-medium text-gray-900">{tournament.sportType || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Turnuva Tipi</p>
                  <p className="text-base font-medium text-gray-900">
                    {tournament.type === 'individual' ? 'Bireysel' : 'Takımlı'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Format</p>
                  <p className="text-base font-medium text-gray-900">
                    {tournament.format === 'round_robin' ? 'Round Robin (Herkes Herkesle)' : tournament.format}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Kayıt Son Tarihi</p>
                  <p className="text-base font-medium text-gray-900">
                    {formatTournamentDate(tournament.registrationDeadline)}
                  </p>
                </div>
              </div>
            </div>

            {tournament.rules && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Kurallar</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-700 whitespace-pre-line">{tournament.rules}</p>
                </div>
              </div>
            )}

            {tournament.prizeDistribution && tournament.prizeDistribution.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Ödül Dağılımı</h3>
                <div className="space-y-2">
                  {tournament.prizeDistribution.map((prize, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                      <span className="font-medium text-gray-900">
                        {prize.rank}. Sıra
                      </span>
                      <span className="text-green-600 font-semibold">
                        %{prize.percentage} ({tournament.prizePool ? (tournament.prizePool * prize.percentage / 100).toFixed(2) : 0} ₺)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'participants' && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Katılımcılar</h3>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
              </div>
            ) : participants.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {participants.map((participant, idx) => {
                  const isCurrentUser = participant.participantId === userId;
                  const isPendingPayment = participant.status === 'pending_payment';
                  const isConfirmed = participant.status === 'confirmed';
                  const isPending = participant.status === 'pending';
                  
                  const getStatusLabel = () => {
                    if (isConfirmed) return 'Onaylandı';
                    if (isPendingPayment) return 'Ödeme Bekleniyor';
                    if (isPending) return 'Beklemede';
                    return participant.status || 'Bilinmiyor';
                  };
                  
                  const getStatusColor = () => {
                    if (isConfirmed) return 'bg-green-100 text-green-800';
                    if (isPendingPayment) return 'bg-yellow-100 text-yellow-800';
                    if (isPending) return 'bg-blue-100 text-blue-800';
                    return 'bg-gray-100 text-gray-800';
                  };    
                  
                  return (
                    <div key={participant.id || idx} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900">
                          {participant.participantName || 'Bilinmeyen'}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor()}`}>
                          {getStatusLabel()}
                        </span>
                      </div>
                      {isCurrentUser && isPendingPayment && tournament.registrationFee > 0 && (
                        <>
                          <button
                            onClick={() => {
                              if (onRegister) {
                                onRegister(tournament.id, userId);
                              }
                            }}
                            className="w-full mt-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center space-x-2 text-sm font-medium transition-colors"
                          >
                            <CreditCard className="w-4 h-4" />
                            <span>Ödeme Yap ({tournament.registrationFee} ₺)</span>
                          </button>
                          <p className="text-xs text-gray-600 mt-1 text-center">
                            Turnuvaya katılmak için ödeme yapmanız gerekiyor
                          </p>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">Henüz katılımcı yok</p>
            )}
          </div>
        )}

        {activeTab === 'matches' && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Maçlar</h3>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
              </div>
            ) : matches.length > 0 ? (
              <div className="space-y-4">
                {isRegistered ? (
                  <>
                    <h4 className="font-medium text-gray-900 mb-3">Sizin Maçlarınız</h4>
                    {userMatches.length > 0 ? (
                      userMatches.map((match) => (
                        <MatchScoreEntry
                          key={match.id}
                          match={match}
                          userId={userId}
                          canEdit={isRegistered}
                          realtime={true}
                          onScoreSubmitted={loadTournamentData}
                        />
                      ))
                    ) : (
                      <p className="text-gray-500 text-center py-4">Henüz maçınız yok</p>
                    )}
                    
                    {matches.length > userMatches.length && (
                      <>
                        <h4 className="font-medium text-gray-900 mb-3 mt-6">Diğer Maçlar</h4>
                        {matches.filter(m => !userMatches.includes(m)).map((match) => (
                          <div key={match.id} className="bg-gray-50 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-gray-900">
                                {match.participant1Name} vs {match.participant2Name}
                              </span>
                              {match.status === 'completed' && match.score1 !== null && (
                                <span className="text-lg font-bold text-gray-900">
                                  {match.score1} - {match.score2}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </>
                ) : (
                  matches.map((match) => (
                    <div key={match.id} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900">
                          {match.participant1Name} vs {match.participant2Name}
                        </span>
                        {match.status === 'completed' && match.score1 !== null && (
                          <span className="text-lg font-bold text-gray-900">
                            {match.score1} - {match.score2}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">Henüz maç yok</p>
            )}
          </div>
        )}

        {activeTab === 'standings' && (
          <TournamentStandings 
            standings={standings} 
            loading={loading} 
            tournamentId={tournament.id}
            realtime={true}
          />
        )}
      </div>


      {/* Team Selection/Creation Modal */}
      {showTeamModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[110]">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                {isCreatingTeam ? 'Yeni Takım Oluştur' : 'Takım Seçimi'}
              </h2>
              <button 
                onClick={() => setShowTeamModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {!isCreatingTeam ? (
              <div className="space-y-4">
                {userTeams.length > 0 ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Takımınızı Seçin
                    </label>
                    <select
                      value={selectedTeamId}
                      onChange={(e) => setSelectedTeamId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      {userTeams.map(team => (
                        <option key={team.id} value={team.id}>{team.name}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="text-center py-4 bg-gray-50 rounded-lg">
                    <p className="text-gray-600 mb-2">Henüz kaptanı olduğunuz bir takım yok.</p>
                  </div>
                )}

                <button
                  onClick={() => setIsCreatingTeam(true)}
                  className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-green-500 hover:text-green-600 transition-colors flex items-center justify-center space-x-2"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Yeni Takım Oluştur</span>
                </button>

                {userTeams.length > 0 && (
                  <button
                    onClick={handleTeamRegister}
                    disabled={registering || !selectedTeamId}
                    className="w-full py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 mt-4"
                  >
                    {registering ? 'Kaydediliyor...' : 'Seçili Takımla Katıl'}
                  </button>
                )}
              </div>
            ) : (
              <form onSubmit={handleCreateTeam} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Takım Adı
                  </label>
                  <input
                    type="text"
                    value={teamForm.name}
                    onChange={(e) => setTeamForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Örn: Yıldızlar SK"
                    required
                  />
                </div>

                <div className="flex bg-blue-50 p-3 rounded-lg text-sm text-blue-700">
                  <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
                  <p>
                    Takımı oluşturduktan sonra diğer oyuncuları davet edebilirsiniz. Şu an sadece siz (Kaptan) ekleniyorsunuz.
                  </p>
                </div>

                <div className="flex space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreatingTeam(false)}
                    className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    disabled={registering}
                    className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {registering ? 'Oluşturuluyor...' : 'Oluştur ve Seç'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TournamentDetail;

