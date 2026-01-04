import React, { useState, useEffect } from 'react';
import { Medal, Lock, Trophy, Target, Users, Crown, Award, Loader2, Star, Zap, Calendar, MessageSquare } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import OyuncuSidebar from '../../components/OyuncuSidebar';
import toast from '../../utils/toast';

// Rozet tanımları - Sistem akışına uygun kriterlere sahip
const BADGE_DEFINITIONS = [
  // MATCH - Maç Rozetleri
  {
    id: 'first_match',
    name: 'İlk Maç',
    description: 'İlk maçını tamamla',
    icon: '⚽',
    category: 'MATCH',
    requirement: { type: 'match_count', value: 1 },
    order: 1
  },
  {
    id: 'match_10',
    name: '10 Maç',
    description: '10 maç tamamla',
    icon: '🎯',
    category: 'MATCH',
    requirement: { type: 'match_count', value: 10 },
    order: 2
  },
  {
    id: 'match_25',
    name: '25 Maç',
    description: '25 maç tamamla',
    icon: '🏅',
    category: 'MATCH',
    requirement: { type: 'match_count', value: 25 },
    order: 3
  },
  {
    id: 'match_50',
    name: '50 Maç',
    description: '50 maç tamamla',
    icon: '🏆',
    category: 'MATCH',
    requirement: { type: 'match_count', value: 50 },
    order: 4
  },
  {
    id: 'match_100',
    name: '100 Maç',
    description: '100 maç tamamla',
    icon: '👑',
    category: 'MATCH',
    requirement: { type: 'match_count', value: 100 },
    order: 5
  },
  {
    id: 'match_200',
    name: '200 Maç',
    description: '200 maç tamamla',
    icon: '💎',
    category: 'MATCH',
    requirement: { type: 'match_count', value: 200 },
    order: 6
  },

  // SOCIAL - Sosyal Rozetler
  {
    id: 'team_founder',
    name: 'Takım Kurucusu',
    description: 'İlk takımını kur',
    icon: '⭐',
    category: 'SOCIAL',
    requirement: { type: 'team_captain', value: 1 },
    order: 1
  },
  {
    id: 'social_butterfly',
    name: 'Sosyal Kelebek',
    description: '10 farklı oyuncuyla maç yap',
    icon: '🦋',
    category: 'SOCIAL',
    requirement: { type: 'unique_players', value: 10 },
    order: 2
  },
  {
    id: 'team_builder',
    name: 'Takım Mimarı',
    description: '5 kişilik bir takım oluştur',
    icon: '🏗️',
    category: 'SOCIAL',
    requirement: { type: 'team_size', value: 5 },
    order: 3
  },
  {
    id: 'messenger',
    name: 'İletişimci',
    description: '50 mesaj gönder',
    icon: '💬',
    category: 'SOCIAL',
    requirement: { type: 'message_count', value: 50 },
    order: 4
  },
  {
    id: 'networker',
    name: 'Ağ Kurucusu',
    description: '25 farklı oyuncuyla maç yap',
    icon: '🌐',
    category: 'SOCIAL',
    requirement: { type: 'unique_players', value: 25 },
    order: 5
  },

  // SKILL - Yetenek Rozetleri
  {
    id: 'high_rated',
    name: 'Yüksek Puanlı',
    description: '4.0 ve üzeri puan al',
    icon: '⭐',
    category: 'SKILL',
    requirement: { type: 'rating', value: 4.0 },
    order: 1
  },
  {
    id: 'top_rated',
    name: 'En İyiler Arasında',
    description: '4.5 ve üzeri puan al',
    icon: '🌟',
    category: 'SKILL',
    requirement: { type: 'rating', value: 4.5 },
    order: 2
  },
  {
    id: 'mvp_1',
    name: 'İlk MVP',
    description: 'Maçın en değerlisi seçil',
    icon: '🏅',
    category: 'SKILL',
    requirement: { type: 'mvp_count', value: 1 },
    order: 3
  },
  {
    id: 'mvp_5',
    name: 'MVP Ustası',
    description: '5 kez maçın en değerlisi seçil',
    icon: '🌟',
    category: 'SKILL',
    requirement: { type: 'mvp_count', value: 5 },
    order: 4
  },
  {
    id: 'reliable',
    name: 'Güvenilir Oyuncu',
    description: '10 değerlendirme al',
    icon: '🤝',
    category: 'SKILL',
    requirement: { type: 'rating_count', value: 10 },
    order: 5
  },

  // SPECIAL - Özel Rozetler
  {
    id: 'early_bird',
    name: 'Erken Kuş',
    description: 'Platformun ilk 100 üyesinden biri ol',
    icon: '🐦',
    category: 'SPECIAL',
    requirement: { type: 'early_member', value: 100 },
    order: 1
  },
  {
    id: 'tournament_participant',
    name: 'Turnuva Katılımcısı',
    description: 'Bir turnuvaya katıl',
    icon: '🎪',
    category: 'SPECIAL',
    requirement: { type: 'tournament_participation', value: 1 },
    order: 2
  },
  {
    id: 'tournament_winner',
    name: 'Turnuva Şampiyonu',
    description: 'Bir turnuva kazan',
    icon: '🏆',
    category: 'SPECIAL',
    requirement: { type: 'tournament_wins', value: 1 },
    order: 3
  },
  {
    id: 'verified',
    name: 'Doğrulanmış Profil',
    description: 'Profilini tamamla ve doğrula',
    icon: '✅',
    category: 'SPECIAL',
    requirement: { type: 'profile_complete', value: true },
    order: 4
  },
  {
    id: 'loyal_player',
    name: 'Sadık Oyuncu',
    description: '6 ay boyunca aktif ol',
    icon: '💝',
    category: 'SPECIAL',
    requirement: { type: 'account_age_months', value: 6 },
    order: 5
  }
];

const categoryConfig = {
  MATCH: { label: 'Maç', color: 'bg-blue-100 text-blue-700', icon: Trophy },
  SKILL: { label: 'Yetenek', color: 'bg-green-100 text-green-700', icon: Target },
  SOCIAL: { label: 'Sosyal', color: 'bg-purple-100 text-purple-700', icon: Users },
  SPECIAL: { label: 'Özel', color: 'bg-yellow-100 text-yellow-700', icon: Crown },
};

const Rozetlerim = () => {
  const { user, userData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [userStats, setUserStats] = useState(null);
  const [badges, setBadges] = useState([]);
  const [newBadgesEarned, setNewBadgesEarned] = useState([]);

  useEffect(() => {
    if (user) {
      loadUserStatsAndBadges();
    }
  }, [user]);

  const loadUserStatsAndBadges = async () => {
    try {
      setLoading(true);
      
      // Kullanıcı istatistiklerini topla
      const stats = await calculateUserStats(user.uid);
      setUserStats(stats);
      
      // Rozetleri hesapla
      const calculatedBadges = calculateBadges(stats, userData);
      setBadges(calculatedBadges);
      
      // Yeni kazanılan rozetleri kontrol et ve kaydet
      await checkAndSaveNewBadges(calculatedBadges);
      
    } catch (error) {
      console.error('Rozet yükleme hatası:', error);
      toast.error('Rozetler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const calculateUserStats = async (userId) => {
    const stats = {
      matchCount: 0,
      uniquePlayers: new Set(),
      teamCaptain: false,
      teamSize: 0,
      messageCount: 0,
      rating: userData?.rating || 0,
      ratingCount: userData?.ratingCount || 0,
      mvpCount: userData?.mvpCount || 0,
      tournamentParticipation: 0,
      tournamentWins: userData?.tournamentWins || 0,
      profileComplete: false,
      accountAgeMonths: 0,
      earlyMember: false
    };

    try {
      // 1. Maç sayısını hesapla (rezervasyonlardan)
      // Yeni sistemde userId alanı var, eski kayıtlarda olmayabilir
      const reservationsRef = collection(db, 'rezervasyonlar');
      
      // Yöntem 1: userId ile sorgula (yeni rezervasyonlar)
      try {
        const userIdQuery = query(
          reservationsRef,
          where('userId', '==', userId),
          where('status', 'in', ['completed', 'confirmed', 'pending_payment'])
        );
        const userIdSnap = await getDocs(userIdQuery);
        stats.matchCount = userIdSnap.size;

        // Benzersiz oyuncuları topla
        userIdSnap.forEach(doc => {
          const data = doc.data();
          if (data.players && Array.isArray(data.players)) {
            data.players.forEach(player => {
              if (player.id && player.id !== userId) {
                stats.uniquePlayers.add(player.id);
              }
            });
          }
        });
      } catch (queryError) {
        console.log('userId sorgusu başarısız, alternatif yöntem deneniyor:', queryError.message);
      }

      // Yöntem 2: Eğer hiç sonuç yoksa, tüm rezervasyonları çek ve players'dan kontrol et
      // (eski kayıtlar için geriye dönük uyumluluk)
      if (stats.matchCount === 0) {
        try {
          const allReservationsQuery = query(
            reservationsRef,
            where('status', 'in', ['completed', 'confirmed', 'pending_payment'])
          );
          const allReservationsSnap = await getDocs(allReservationsQuery);
          
          allReservationsSnap.forEach(doc => {
            const data = doc.data();
            // Kullanıcının bu rezervasyonda olup olmadığını kontrol et
            const isUserInPlayers = data.players?.some(p => p.id === userId);
            const isUserOwner = data.userId === userId || data.ownerId === userId;
            
            if (isUserInPlayers || isUserOwner) {
              stats.matchCount++;
              
              // Benzersiz oyuncuları topla
              if (data.players && Array.isArray(data.players)) {
                data.players.forEach(player => {
                  if (player.id && player.id !== userId) {
                    stats.uniquePlayers.add(player.id);
                  }
                });
              }
            }
          });
        } catch (altError) {
          console.error('Alternatif rezervasyon sorgusu hatası:', altError);
        }
      }

      // Açık maçlardan da kontrol et
      try {
        const openMatchesRef = collection(db, 'openMatches');
        const openMatchesQuery = query(
          openMatchesRef,
          where('creatorId', '==', userId)
        );
        const openMatchesSnap = await getDocs(openMatchesQuery);
        
        // Katıldığı maçlar
        const participantMatchesQuery = query(
          openMatchesRef,
          where('participantIds', 'array-contains', userId)
        );
        const participantMatchesSnap = await getDocs(participantMatchesQuery);
        
        stats.matchCount += openMatchesSnap.size + participantMatchesSnap.size;
        
        // Benzersiz oyuncuları ekle
        [...openMatchesSnap.docs, ...participantMatchesSnap.docs].forEach(doc => {
          const data = doc.data();
          if (data.participantIds) {
            data.participantIds.forEach(id => {
              if (id !== userId) stats.uniquePlayers.add(id);
            });
          }
          if (data.creatorId && data.creatorId !== userId) {
            stats.uniquePlayers.add(data.creatorId);
          }
        });
      } catch (openMatchError) {
        console.log('Open matches sorgusu hatası:', openMatchError.message);
      }

      // 2. Takım bilgilerini kontrol et
      const teamsRef = collection(db, 'teams');
      const captainQuery = query(teamsRef, where('captainId', '==', userId));
      const captainSnap = await getDocs(captainQuery);
      
      if (captainSnap.size > 0) {
        stats.teamCaptain = true;
        // En büyük takım boyutunu bul
        captainSnap.forEach(doc => {
          const members = doc.data().members || [];
          if (members.length > stats.teamSize) {
            stats.teamSize = members.length;
          }
        });
      }

      // 3. Mesaj sayısını hesapla
      const messagesRef = collection(db, 'messages');
      const messagesQuery = query(messagesRef, where('senderId', '==', userId));
      const messagesSnap = await getDocs(messagesQuery);
      stats.messageCount = messagesSnap.size;

      // 4. Turnuva katılımlarını kontrol et
      const tournamentsRef = collection(db, 'tournaments');
      const tournamentQuery = query(
        tournamentsRef,
        where('participants', 'array-contains', userId)
      );
      const tournamentSnap = await getDocs(tournamentQuery);
      stats.tournamentParticipation = tournamentSnap.size;

      // 5. Profil tamamlama durumu
      stats.profileComplete = !!(
        userData?.displayName &&
        userData?.phone &&
        userData?.city &&
        userData?.position &&
        userData?.photoURL
      );

      // 6. Hesap yaşı
      if (userData?.createdAt) {
        const createdDate = userData.createdAt.toDate ? userData.createdAt.toDate() : new Date(userData.createdAt);
        const now = new Date();
        const monthsDiff = (now.getFullYear() - createdDate.getFullYear()) * 12 + 
                          (now.getMonth() - createdDate.getMonth());
        stats.accountAgeMonths = monthsDiff;
      }

      // 7. Erken üye kontrolü (İlk 100 üye)
      // Bu genellikle backend'de kontrol edilir, userData'dan alınabilir
      stats.earlyMember = userData?.earlyMember || false;

    } catch (error) {
      console.error('İstatistik hesaplama hatası:', error);
    }

    // Set'i sayıya çevir
    stats.uniquePlayersCount = stats.uniquePlayers.size;
    delete stats.uniquePlayers;

    return stats;
  };

  const calculateBadges = (stats, userData) => {
    const earnedBadges = userData?.badges || {};
    
    return BADGE_DEFINITIONS.map(badgeDef => {
      let isEarned = false;
      let progress = 0;
      let currentValue = 0;
      let targetValue = badgeDef.requirement.value;

      switch (badgeDef.requirement.type) {
        case 'match_count':
          currentValue = stats.matchCount;
          progress = Math.min((currentValue / targetValue) * 100, 100);
          isEarned = currentValue >= targetValue;
          break;
          
        case 'unique_players':
          currentValue = stats.uniquePlayersCount;
          progress = Math.min((currentValue / targetValue) * 100, 100);
          isEarned = currentValue >= targetValue;
          break;
          
        case 'team_captain':
          currentValue = stats.teamCaptain ? 1 : 0;
          isEarned = stats.teamCaptain;
          progress = isEarned ? 100 : 0;
          break;
          
        case 'team_size':
          currentValue = stats.teamSize;
          progress = Math.min((currentValue / targetValue) * 100, 100);
          isEarned = currentValue >= targetValue;
          break;
          
        case 'message_count':
          currentValue = stats.messageCount;
          progress = Math.min((currentValue / targetValue) * 100, 100);
          isEarned = currentValue >= targetValue;
          break;
          
        case 'rating':
          currentValue = stats.rating;
          progress = Math.min((currentValue / targetValue) * 100, 100);
          isEarned = currentValue >= targetValue;
          break;
          
        case 'rating_count':
          currentValue = stats.ratingCount;
          progress = Math.min((currentValue / targetValue) * 100, 100);
          isEarned = currentValue >= targetValue;
          break;
          
        case 'mvp_count':
          currentValue = stats.mvpCount;
          progress = Math.min((currentValue / targetValue) * 100, 100);
          isEarned = currentValue >= targetValue;
          break;
          
        case 'tournament_participation':
          currentValue = stats.tournamentParticipation;
          progress = Math.min((currentValue / targetValue) * 100, 100);
          isEarned = currentValue >= targetValue;
          break;
          
        case 'tournament_wins':
          currentValue = stats.tournamentWins;
          progress = Math.min((currentValue / targetValue) * 100, 100);
          isEarned = currentValue >= targetValue;
          break;
          
        case 'profile_complete':
          isEarned = stats.profileComplete;
          progress = isEarned ? 100 : 0;
          currentValue = isEarned ? 1 : 0;
          break;
          
        case 'account_age_months':
          currentValue = stats.accountAgeMonths;
          progress = Math.min((currentValue / targetValue) * 100, 100);
          isEarned = currentValue >= targetValue;
          break;
          
        case 'early_member':
          isEarned = stats.earlyMember;
          progress = isEarned ? 100 : 0;
          break;
          
        default:
          break;
      }

      // Daha önce kazanılmış mı kontrol et
      const previouslyEarned = earnedBadges[badgeDef.id];
      
      return {
        ...badgeDef,
        isLocked: !isEarned,
        progress: Math.round(progress),
        currentValue,
        targetValue: typeof targetValue === 'boolean' ? (targetValue ? 1 : 0) : targetValue,
        earnedAt: previouslyEarned?.earnedAt || (isEarned ? new Date().toISOString() : null),
        isNew: isEarned && !previouslyEarned
      };
    });
  };

  const checkAndSaveNewBadges = async (calculatedBadges) => {
    const newBadges = calculatedBadges.filter(b => b.isNew && !b.isLocked);
    
    if (newBadges.length > 0) {
      setNewBadgesEarned(newBadges);
      
      // Yeni rozetleri Firestore'a kaydet
      try {
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        const currentBadges = userDoc.data()?.badges || {};
        
        const updatedBadges = { ...currentBadges };
        newBadges.forEach(badge => {
          updatedBadges[badge.id] = {
            earnedAt: new Date().toISOString(),
            notified: true
          };
        });
        
        await updateDoc(userRef, { badges: updatedBadges });
        
        // Bildirimi göster
        if (newBadges.length === 1) {
          toast.success(`Yeni rozet kazandınız: ${newBadges[0].name}! 🎉`);
        } else {
          toast.success(`${newBadges.length} yeni rozet kazandınız! 🎉`);
        }
      } catch (error) {
        console.error('Rozet kaydetme hatası:', error);
      }
    }
  };

  const earnedBadges = badges.filter(b => !b.isLocked);
  const lockedBadges = badges.filter(b => b.isLocked);

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <OyuncuSidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-10 h-10 animate-spin text-green-600 mx-auto mb-4" />
            <p className="text-gray-600">Rozetleriniz yükleniyor...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <OyuncuSidebar />
      
      <div className="flex-1 overflow-y-auto p-6 lg:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Rozetlerim</h1>
            <p className="text-sm text-gray-500">Başarılarınızı sergileyin ve yeni rozetler kazanın</p>
          </div>

          {/* Yeni Kazanılan Rozetler Bildirimi */}
          {newBadgesEarned.length > 0 && (
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="text-3xl">🎉</div>
                <div>
                  <h3 className="font-bold text-yellow-800">Tebrikler! Yeni Rozet Kazandınız!</h3>
                  <p className="text-sm text-yellow-700">
                    {newBadgesEarned.map(b => b.name).join(', ')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* İstatistikler */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatsCard title="Kazanılan" value={earnedBadges.length} icon={<Medal />} color="green" />
            <StatsCard title="Kilitli" value={lockedBadges.length} icon={<Lock />} color="gray" />
            <StatsCard title="Toplam" value={badges.length} icon={<Award />} color="blue" />
            <StatsCard title="Tamamlama" value={`%${badges.length > 0 ? Math.round((earnedBadges.length / badges.length) * 100) : 0}`} icon={<Target />} color="purple" />
          </div>

          {/* Aktivite Özeti */}
          {userStats && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-bold text-gray-900 mb-4">Aktivite Özetiniz</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{userStats.matchCount}</div>
                  <div className="text-xs text-blue-600">Maç</div>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{userStats.uniquePlayersCount}</div>
                  <div className="text-xs text-purple-600">Farklı Oyuncu</div>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{userStats.rating?.toFixed(1) || '0.0'}</div>
                  <div className="text-xs text-green-600">Puan</div>
                </div>
                <div className="p-3 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">{userStats.messageCount}</div>
                  <div className="text-xs text-yellow-600">Mesaj</div>
                </div>
              </div>
            </div>
          )}

          {/* İlerleme Çubuğu */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-900">Koleksiyon İlerlemesi</h3>
              <span className="text-sm text-gray-500">{earnedBadges.length}/{badges.length}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all"
                style={{ width: `${badges.length > 0 ? (earnedBadges.length / badges.length) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Kazanılan Rozetler */}
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Medal size={20} className="text-yellow-500" />
              Kazanılan Rozetler ({earnedBadges.length})
            </h2>
            {earnedBadges.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {earnedBadges.map((badge) => (
                  <BadgeCard key={badge.id} badge={badge} />
                ))}
              </div>
            ) : (
              <div className="bg-gray-50 rounded-xl p-8 text-center">
                <Medal size={48} className="text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Henüz kazanılmış rozet yok</p>
                <p className="text-sm text-gray-400 mt-2">Maç yaparak, takım kurarak ve aktif olarak rozetler kazanabilirsiniz!</p>
              </div>
            )}
          </div>

          {/* Kilitli Rozetler */}
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Lock size={20} className="text-gray-400" />
              Kilitli Rozetler ({lockedBadges.length})
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {lockedBadges.map((badge) => (
                <BadgeCard key={badge.id} badge={badge} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatsCard = ({ title, value, icon, color }) => {
  const colorClasses = {
    green: 'bg-green-50 text-green-600',
    gray: 'bg-gray-50 text-gray-600',
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
      <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
        {React.cloneElement(icon, { size: 20 })}
      </div>
      <div>
        <div className="text-xs text-gray-500">{title}</div>
        <div className="text-lg font-bold text-gray-900">{value}</div>
      </div>
    </div>
  );
};

const BadgeCard = ({ badge }) => {
  const CategoryIcon = categoryConfig[badge.category].icon;

  const getRequirementText = () => {
    if (badge.isLocked) {
      if (badge.requirement.type === 'profile_complete') {
        return 'Profili tamamla';
      }
      if (badge.requirement.type === 'team_captain') {
        return 'Takım kur';
      }
      if (badge.requirement.type === 'early_member') {
        return 'Özel rozet';
      }
      return `${badge.currentValue}/${badge.targetValue}`;
    }
    return null;
  };

  return (
    <div className={`bg-white rounded-xl border-2 p-4 text-center transition-all hover:shadow-lg relative ${
      badge.isLocked ? 'border-gray-200 opacity-70' : 'border-yellow-300 shadow-md'
    } ${badge.isNew ? 'ring-2 ring-yellow-400 ring-offset-2' : ''}`}>
      
      {/* Yeni rozet işareti */}
      {badge.isNew && (
        <div className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-0.5 rounded-full">
          YENİ!
        </div>
      )}

      {/* Badge Icon */}
      <div className={`text-5xl mb-3 ${badge.isLocked ? 'grayscale opacity-50' : ''}`}>
        {badge.icon}
      </div>

      {/* Badge Name */}
      <h3 className="font-bold text-gray-900 mb-1 text-sm">{badge.name}</h3>

      {/* Category */}
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold mb-2 ${categoryConfig[badge.category].color}`}>
        <CategoryIcon size={10} />
        {categoryConfig[badge.category].label}
      </span>

      {/* Description */}
      <p className="text-xs text-gray-500 mb-2">{badge.description}</p>

      {/* Progress or Date */}
      {badge.isLocked ? (
        <>
          {badge.progress > 0 && badge.progress < 100 && (
            <div className="mt-2">
              <div className="w-full bg-gray-100 rounded-full h-1.5 mb-1">
                <div
                  className="bg-green-500 h-1.5 rounded-full transition-all"
                  style={{ width: `${badge.progress}%` }}
                />
              </div>
              <span className="text-xs text-gray-400">{getRequirementText()}</span>
            </div>
          )}
          {(badge.progress === 0 || badge.progress === undefined) && (
            <span className="text-xs text-gray-400 flex items-center justify-center gap-1">
              <Lock size={10} />
              {getRequirementText()}
            </span>
          )}
        </>
      ) : (
        <span className="text-xs text-green-600 font-medium">
          ✓ {badge.earnedAt ? new Date(badge.earnedAt).toLocaleDateString('tr-TR') : 'Kazanıldı'}
        </span>
      )}
    </div>
  );
};

export default Rozetlerim;
