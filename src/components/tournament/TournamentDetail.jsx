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
  registerTeamToTournament
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
    
    return () => {
      // Cleanup listeners will be handled by unsubscribe functions
    };
  }, [tournament]);

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
      
      const userRegistered = participantsData.some(
        p => p.participantId === userId
      );
      setIsRegistered(userRegistered);
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
        const userRegistered = participantsResult.data.some(
          p => p.participantId === userId
        );
        setIsRegistered(userRegistered);
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
        // Takım kaydı için önce takım seçimi yapılması gerekir
        // Şimdilik hata mesajı gösterelim
        toast.error('Takım kaydı için önce bir takım seçmelisiniz');
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
              <div className="p-4 bg-white/20 backdrop-blur-sm rounded-lg">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-semibold">Turnuvaya kayıtlısınız</span>
                </div>
              </div>
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
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-semibold text-gray-900">Turnuvaya kayıtlısınız</span>
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
    </div>
  );
};

export default TournamentDetail;

