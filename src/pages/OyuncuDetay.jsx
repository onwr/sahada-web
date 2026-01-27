import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { getUserData, getPlayerStats, getPlayerReservations, getPlayerPlayedWith, sendContactRequest, checkContactRequestStatus } from '../services/firestoreService';
import { 
  Trophy,
  Users,
  TrendingUp,
  Award,
  Activity,
  Mail,
  Phone,
  Globe,
  Clock,
  Target,
  Zap,
  ArrowLeft, 
  Star, 
  MapPin, 
  Calendar, 
  Share2,
  MessageCircle,
  Eye,
  EyeOff,
  Lock as LockIcon
} from 'lucide-react';
import toast from '../utils/toast';

const OyuncuDetay = () => {
  const { idOrSlug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userData } = useAuth();
  const [playerData, setPlayerData] = useState(null);
  const [stats, setStats] = useState(null);
  const [recentMatches, setRecentMatches] = useState([]);
  const [playedWith, setPlayedWith] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'matches', 'tournaments', 'achievements'
  const [contactRequestStatus, setContactRequestStatus] = useState('none'); // 'none', 'pending', 'accepted'
  const [requestingContact, setRequestingContact] = useState(false);

  const handleMessageClick = () => {
    const playerId = playerData?.id || idOrSlug;
    
    if (!user) {
      toast.error('Mesaj göndermek için giriş yapmalısınız');
      // Giriş yaptıktan sonra doğrudan mesajlaşma ekranına dönmesi için targetPath belirleyelim
      const targetPath = playerId ? `/oyuncu/mesajlar?userId=${playerId}` : '/oyuncu/mesajlar';
      navigate('/login', { state: { from: targetPath } });
      return;
    }

    if (playerId) {
      // Kullanıcı tipine göre uygun mesajlaşma paneline yönlendir
      const basePath = userData?.userType === 'owner' ? '/saha-sahibi' : '/oyuncu';
      navigate(`${basePath}/mesajlar?userId=${playerId}`);
    } else {
      const basePath = userData?.userType === 'owner' ? '/saha-sahibi' : '/oyuncu';
      navigate(`${basePath}/mesajlar`);
    }
  };

  const handleShareClick = async () => {
    const name = playerData?.fullName || playerData?.displayName || 'Oyuncu';
    const slug = playerData?.slug || playerData?.id || idOrSlug;
    const shareUrl = `${window.location.origin}/oyuncu-detay/${slug}`;
    const shareTitle = `${name} | Saha Merkezi Oyuncu Profili`;
    const shareText = `⚽ ${name} profilini incele! Saha Merkezi üzerinden birlikte maç yapabilir veya takıma davet edebilirsin.`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
      } else {
        // Fallback: URL'yi kopyala
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Profil linki kopyalandı!');
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Paylaşım hatası:', error);
        try {
          await navigator.clipboard.writeText(shareUrl);
          toast.success('Profil linki kopyalandı!');
        } catch (clipboardError) {
          toast.error('Link kopyalanamadı');
        }
      }
    }
  };

  useEffect(() => {
    if (playerData) {
      const name = playerData.fullName || playerData.displayName || 'Oyuncu';
      const title = `${name} Profili | Saha Merkezi`;
      document.title = title;

      // Update Meta Tags
      const updateMeta = (selector, attr, content) => {
        const el = document.querySelector(selector);
        if (el) el.setAttribute(attr, content);
      };

      updateMeta('meta[name="description"]', 'content', `${name} oyuncu profilini ve istatistiklerini görüntüle. Saha Merkezi ile hemen maç bul!`);
      updateMeta('meta[property="og:title"]', 'content', title);
      updateMeta('meta[property="og:description"]', 'content', `${name} oyuncu profilini görüntüle.`);
      if (playerData.photoURL) {
        updateMeta('meta[property="og:image"]', 'content', playerData.photoURL);
        updateMeta('meta[property="twitter:image"]', 'content', playerData.photoURL);
      }
    }
  }, [playerData]);

  // Handle URL cleanup - if accessed by ID, redirect to slug
  useEffect(() => {
    if (playerData?.slug && idOrSlug === playerData.id) {
      navigate(`/oyuncu-detay/${playerData.slug}`, { replace: true });
    }
  }, [playerData, idOrSlug, navigate]);

  useEffect(() => {
    if (idOrSlug) {
      loadPlayerData();
    }
  }, [idOrSlug]);

  useEffect(() => {
    if (playerData?.id && user && user.uid !== playerData.id) {
      checkRequestStatus();
    }
  }, [playerData?.id, user]);

  const checkRequestStatus = async () => {
    const result = await checkContactRequestStatus(user.uid, playerData.id);
    if (result.success) {
      setContactRequestStatus(result.status);
    }
  };

  const handleRequestContact = async () => {
    if (!user) {
      toast.error('İletişim bilgilerini görmek için giriş yapmalısınız');
      navigate('/login', { state: { from: location.pathname } });
      return;
    }

    const playerId = playerData?.id || idOrSlug;
    if (!playerId) return;

    setRequestingContact(true);
    const result = await sendContactRequest(user.uid, playerId, userData?.fullName || user.displayName || 'Bir oyuncu');
    if (result.success) {
      toast.success('İletişim talebi gönderildi');
      setContactRequestStatus('pending');
    } else {
      toast.error(result.error || 'İstek gönderilemedi');
    }
    setRequestingContact(false);
  };

  const loadPlayerData = async () => {
    if (!idOrSlug) return;
    
    setLoading(true);
    try {
      // Kullanıcı verilerini getir
      const userResult = await getUserData(idOrSlug);
      if (!userResult.success) {
        toast.error('Oyuncu bulunamadı');
        navigate('/oyuncu-bul');
        return;
      }

      const player = userResult.data;
      setPlayerData(player);
      const playerId = player.id;

      // İstatistikleri getir
      const statsResult = await getPlayerStats(playerId);
      if (statsResult.success) {
        setStats(statsResult.data);
      }

      // Son maçları getir
      const matchesResult = await getPlayerReservations(playerId, 10);
      if (matchesResult.success) {
        setRecentMatches(matchesResult.data);
      }

      // Birlikte oynadığı oyuncuları getir
      const playedWithResult = await getPlayerPlayedWith(playerId);
      if (playedWithResult.success) {
        setPlayedWith(playedWithResult.data);
      }

    } catch (error) {
      console.error('Oyuncu detay yükleme hatası:', error);
      toast.error('Profil yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const getInitials = () => {
    if (playerData?.fullName) {
      const names = playerData.fullName.split(' ');
      if (names.length >= 2) {
        return (names[0][0] + names[names.length - 1][0]).toUpperCase();
      }
      return playerData.fullName.slice(0, 2).toUpperCase();
    }
    if (playerData?.displayName) {
      return playerData.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return 'OY';
  };

  const getSportName = (sportId) => {
    const sports = {
      'football': { name: 'Futbol', emoji: '⚽' },
      'basketball': { name: 'Basketbol', emoji: '🏀' },
      'tennis': { name: 'Tenis', emoji: '🎾' },
      'volleyball': { name: 'Voleybol', emoji: '🏐' },
      'badminton': { name: 'Badminton', emoji: '🏸' },
      'swimming': { name: 'Yüzme', emoji: '🏊' }
    };
    return sports[sportId] || { name: sportId, emoji: '🏃' };
  };

  const getSkillLevelName = (level) => {
    const levels = {
      'beginner': 'Başlangıç',
      'amateur': 'Amatör',
      'intermediate': 'Orta',
      'advanced': 'İleri',
      'professional': 'Profesyonel'
    };
    return levels[level] || level;
  };

  const formatDate = (date) => {
    if (!date) return '';
    const d = date?.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('tr-TR', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Profil yükleniyor...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!playerData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <p className="text-gray-600 mb-4">Oyuncu bulunamadı</p>
            <button
              onClick={() => navigate('/yakin-sahalar')}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Geri Dön
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-green-600 via-green-700 to-green-800 text-white">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          <button
            onClick={() => navigate(-1)}
            className="mb-6 flex items-center gap-2 text-white/90 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Geri</span>
          </button>

          <div className="flex flex-col md:flex-row items-start md:items-center gap-8">
            {/* Profile Photo */}
            <div className="relative">
              {playerData.photoURL ? (
                <img
                  src={playerData.photoURL}
                  alt={playerData.fullName || playerData.displayName}
                  className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-xl"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-white/20 backdrop-blur-sm border-4 border-white shadow-xl flex items-center justify-center">
                  <span className="text-4xl font-bold text-white">{getInitials()}</span>
                </div>
              )}
              <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-green-500 rounded-full border-4 border-white flex items-center justify-center">
                <Activity className="w-5 h-5 text-white" />
              </div>
            </div>

            {/* Profile Info */}
            <div className="flex-1">
              <h1 className="text-4xl font-bold mb-2">
                {playerData.fullName || playerData.displayName || 'Oyuncu'}
              </h1>
              <p className="text-white/90 text-lg mb-4">{playerData.bio || 'Spor sever oyuncu'}</p>
              
              <div className="flex flex-wrap items-center gap-6 text-sm">
                {playerData.city && (
                  <div className="flex items-center gap-2">
                    <MapPin size={18} />
                    <span>{playerData.district ? `${playerData.district}, ` : ''}{playerData.city}</span>
                  </div>
                )}
                {stats && (
                  <>
                    <div className="flex items-center gap-2">
                      <Trophy size={18} />
                      <span>{stats.totalMatches || 0} Maç</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar size={18} />
                      <span>{stats.upcomingMatches || 0} Yaklaşan</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleShareClick}
                className="p-3 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors"
                title="Paylaş"
              >
                <Share2 size={20} />
              </button>
              <button
                onClick={handleMessageClick}
                className="px-6 py-3 bg-white text-green-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors flex items-center gap-2"
              >
                <MessageCircle size={18} />
                <span>Mesaj Gönder</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 -mt-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="p-3 bg-green-100 rounded-lg">
                  <Trophy className="w-6 h-6 text-green-600" />
                </div>
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.totalMatches || 0}</p>
              <p className="text-sm text-gray-600">Toplam Maç</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.upcomingMatches || 0}</p>
              <p className="text-sm text-gray-600">Yaklaşan Maç</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Award className="w-6 h-6 text-purple-600" />
                </div>
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.completedMatches || 0}</p>
              <p className="text-sm text-gray-600">Tamamlanan</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="p-3 bg-orange-100 rounded-lg">
                  <Users className="w-6 h-6 text-orange-600" />
                </div>
                <TrendingUp className="w-5 h-5 text-orange-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{playedWith.length}</p>
              <p className="text-sm text-gray-600">Oyun Arkadaşı</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm p-2 mb-6">
          <div className="flex space-x-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-3 rounded-lg font-medium transition-colors whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'bg-green-600 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Genel Bakış
            </button>
            <button
              onClick={() => setActiveTab('matches')}
              className={`px-6 py-3 rounded-lg font-medium transition-colors whitespace-nowrap ${
                activeTab === 'matches'
                  ? 'bg-green-600 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Maçlar ({recentMatches.length})
            </button>
            <button
              onClick={() => setActiveTab('tournaments')}
              className={`px-6 py-3 rounded-lg font-medium transition-colors whitespace-nowrap ${
                activeTab === 'tournaments'
                  ? 'bg-green-600 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Turnuvalar
            </button>
            <button
              onClick={() => setActiveTab('achievements')}
              className={`px-6 py-3 rounded-lg font-medium transition-colors whitespace-nowrap ${
                activeTab === 'achievements'
                  ? 'bg-green-600 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Başarılar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* About */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Hakkında</h2>
                  <p className="text-gray-600 leading-relaxed">
                    {playerData.bio || 'Bu oyuncu hakkında henüz bilgi eklenmemiş.'}
                  </p>
                </div>

                {/* Sport Preferences */}
                {playerData.sportPreferences && playerData.sportPreferences.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Spor Tercihleri</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {playerData.sportPreferences.map((pref, idx) => {
                        const sport = getSportName(pref.sportId);
                        return (
                          <div key={idx} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center gap-3 mb-3">
                              <span className="text-2xl">{sport.emoji}</span>
                              <div>
                                <h3 className="font-semibold text-gray-900">{sport.name}</h3>
                                {pref.skillLevel && (
                                  <p className="text-sm text-gray-600">
                                    Seviye: {getSkillLevelName(pref.skillLevel)}
                                  </p>
                                )}
                              </div>
                            </div>
                            {pref.position && (
                              <p className="text-sm text-gray-600">
                                <Target className="w-4 h-4 inline mr-1" />
                                Pozisyon: {pref.position}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Recent Matches */}
                {recentMatches.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Son Maçlar</h2>
                    <div className="space-y-3">
                      {recentMatches.slice(0, 5).map((match, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                          <div className="flex items-center gap-4">
                            <div className="p-2 bg-green-100 rounded-lg">
                              <Calendar className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                {match.tesisName || match.location || 'Maç'}
                              </p>
                              <p className="text-sm text-gray-600">
                                {formatDate(match.date)} • {match.timeSlot || ''}
                              </p>
                            </div>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            match.status === 'completed' ? 'bg-green-100 text-green-800' :
                            match.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {match.status === 'completed' ? 'Tamamlandı' :
                             match.status === 'confirmed' ? 'Onaylandı' :
                             match.status || 'Bilinmiyor'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Matches Tab */}
            {activeTab === 'matches' && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Tüm Maçlar</h2>
                {recentMatches.length > 0 ? (
                  <div className="space-y-3">
                    {recentMatches.map((match, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-green-100 rounded-lg">
                            <Calendar className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {match.tesisName || match.location || 'Maç'}
                            </p>
                            <p className="text-sm text-gray-600">
                              {formatDate(match.date)} • {match.timeSlot || ''}
                            </p>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          match.status === 'completed' ? 'bg-green-100 text-green-800' :
                          match.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {match.status === 'completed' ? 'Tamamlandı' :
                           match.status === 'confirmed' ? 'Onaylandı' :
                           match.status || 'Bilinmiyor'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600">Henüz maç kaydı bulunmuyor</p>
                  </div>
                )}
              </div>
            )}

            {/* Tournaments Tab */}
            {activeTab === 'tournaments' && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Turnuvalar</h2>
                <div className="text-center py-12">
                  <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">Henüz turnuva kaydı bulunmuyor</p>
                </div>
              </div>
            )}

            {/* Achievements Tab */}
            {activeTab === 'achievements' && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Başarılar</h2>
                <div className="text-center py-12">
                  <Award className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">Henüz başarı kaydı bulunmuyor</p>
                </div>
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Contact Info */}
            <div className="bg-white rounded-xl shadow-sm p-6 relative overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">İletişim</h2>
                {(user?.uid === playerData?.id || contactRequestStatus === 'accepted') ? (
                  <Eye className="w-5 h-5 text-green-500" />
                ) : (
                  <EyeOff className="w-5 h-5 text-gray-400" />
                )}
              </div>

              {(user?.uid === playerData?.id || contactRequestStatus === 'accepted') ? (
                <div className="space-y-3">
                  {playerData.email && (
                    <div className="flex items-center gap-3 text-gray-600">
                      <Mail className="w-5 h-5" />
                      <span className="text-sm">{playerData.email}</span>
                    </div>
                  )}
                  {playerData.phone && (
                    <div className="flex items-center gap-3 text-gray-600">
                      <Phone className="w-5 h-5" />
                      <span className="text-sm">{playerData.phone}</span>
                    </div>
                  )}
                  {playerData.city && (
                    <div className="flex items-center gap-3 text-gray-600">
                      <MapPin className="w-5 h-5" />
                      <span className="text-sm">
                        {playerData.district ? `${playerData.district}, ` : ''}{playerData.city}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Masked Info UI */}
                  <div className="space-y-2 opacity-50 blur-[2px] pointer-events-none select-none">
                    <div className="flex items-center gap-3 text-gray-400">
                      <Mail className="w-5 h-5" />
                      <span className="text-sm text-gray-300">••••••••@••••.com</span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-400">
                      <Phone className="w-5 h-5" />
                      <span className="text-sm text-gray-300">05•• ••• •• ••</span>
                    </div>
                  </div>

                  <div className="pt-2">
                    {contactRequestStatus === 'pending' ? (
                      <div className="flex flex-col items-center gap-2 p-4 bg-yellow-50 rounded-xl border border-yellow-100">
                        <Clock className="w-8 h-8 text-yellow-500 animate-pulse" />
                        <p className="text-xs text-yellow-700 font-medium text-center">
                          İletişim talebiniz beklemede. Kabul edildiğinde bilgiler açılacaktır.
                        </p>
                      </div>
                    ) : (
                      <button
                        onClick={handleRequestContact}
                        disabled={requestingContact}
                        className="w-full py-3 bg-gray-900 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-black transition-all shadow-lg active:scale-95 disabled:opacity-70"
                      >
                        {requestingContact ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <>
                            <LockIcon size={16} className="text-green-500" />
                            İletişim Bilgilerini Gör
                          </>
                        )}
                      </button>
                    )}
                    <p className="text-[10px] text-gray-400 text-center mt-3">
                      KVKK gereği iletişim bilgileri gizlenmiştir. Görmek için talep göndermelisiniz.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Played With */}
            {playedWith.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Oyun Arkadaşları</h2>
                <div className="space-y-3">
                  {playedWith.slice(0, 5).map((player, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {player.avatar ? (
                          <img
                            src={player.avatar}
                            alt={player.fullName}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                            <span className="text-sm font-medium text-green-600">
                              {player.fullName?.charAt(0) || 'O'}
                            </span>
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{player.fullName}</p>
                          <p className="text-xs text-gray-600">{player.matchCount} maç</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Favorite Sports */}
            {playerData.favoriteSports && playerData.favoriteSports.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Favori Sporlar</h2>
                <div className="flex flex-wrap gap-2">
                  {playerData.favoriteSports.map((sport, idx) => {
                    const sportInfo = getSportName(sport);
                    return (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium"
                      >
                        {sportInfo.emoji} {sportInfo.name}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default OyuncuDetay;

