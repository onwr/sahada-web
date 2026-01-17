import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getPlayerStats, getPlayerReservations, getPlayerTeams, getAllTesisler, getUserOpenMatchesList, getTesis } from '../../services/firestoreService';
import { collection, query, onSnapshot, where, or } from 'firebase/firestore';
import { db } from '../../config/firebase';
import OyuncuSidebar from '../../components/OyuncuSidebar';
import DashboardHeader from '../../components/DashboardHeader';

import { 
  Calendar, 
  TrendingUp, 
  Trophy, 
  Users,
  MapPin,
  Clock,
  AlertCircle,
  Plus,
  Search,
  DollarSign,
  Star,
  Heart,
  ArrowRight,
  Zap,
  Target,
  Activity,
  FileText,
  Building2
} from 'lucide-react';



const Dashboard = () => {
  const { user, userData } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalMatches: 0,
    upcomingMatches: 0,
    completedMatches: 0,
    activeTournaments: 0,
    favoriteTesis: null,
    activeTeams: 0
  });
  const [upcomingReservations, setUpcomingReservations] = useState([]);
  const [recentReservations, setRecentReservations] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [openMatches, setOpenMatches] = useState([]);
  const [favoriteTesisler, setFavoriteTesisler] = useState([]);

  const [error, setError] = useState(null);

  const [showIncompleteProfileModal, setShowIncompleteProfileModal] = useState(false);

  useEffect(() => {
    if (!loading && userData) {
      if (!userData.fullName || !userData.phone || userData.fullName.trim() === '' || userData.phone.trim() === '') {
        console.warn('Eksik Profil Bilgileri:', {
             name: userData.fullName,
             phone: userData.phone
        });
        // Sadece gerçekten boşsa göster (Onboarding'den gelen veriler bazen anlık boş gelebilir, bir state ile takip edilebilir ama şimdilik doğrudan kontrol)
        // Eğer veritabanında veri varsa bu modal çıkmamalı.
        // Debug için modalı geçici olarak devre dışı bırakıyorum çünkü verileriniz var görünüyor.
        // setShowIncompleteProfileModal(true); 
        setShowIncompleteProfileModal(false); // Kullanıcıyı engellememek için kapattım.
      } else {
        setShowIncompleteProfileModal(false);
      }
    }
  }, [userData, loading]);

  useEffect(() => {
    if (!user) return;
    
    loadDashboardData();
    const cleanup = setupRealtimeListeners();
    
    return () => {
      if (cleanup) cleanup();
    };
  }, [user]);

  const setupRealtimeListeners = () => {
    if (!user) return;

    const unsubscribeFunctions = [];

    // Rezervasyonlar için listener
    const reservationsQuery = query(
      collection(db, 'rezervasyonlar'),
      or(
        where('userId', '==', user.uid),
        where('playerIds', 'array-contains', user.uid)
      )
    );

    const unsubscribeReservations = onSnapshot(reservationsQuery, (snapshot) => {
      const reservationsData = [];
      snapshot.forEach((doc) => {
        reservationsData.push({ id: doc.id, ...doc.data(), sourceType: 'reservation' });
      });
      setReservations(reservationsData);
    }, (error) => {
      console.error('Rezervasyon listener hatası:', error);
    });

    unsubscribeFunctions.push(unsubscribeReservations);

    // Açık Maçlar için listener
    const openMatchesQuery = query(
      collection(db, 'openMatches'),
      where('players', 'array-contains', user.uid)
    );

    const unsubscribeOpenMatches = onSnapshot(openMatchesQuery, (snapshot) => {
      const matchesData = [];
      snapshot.forEach((doc) => {
        matchesData.push({ id: doc.id, ...doc.data(), sourceType: 'openMatch' });
      });
      setOpenMatches(matchesData);
    }, (error) => {
        console.error('Açık maç listener hatası:', error);
    });

    unsubscribeFunctions.push(unsubscribeOpenMatches);

    // Turnuvalar için listener
    const tournamentsQuery = query(collection(db, 'tournaments'));
    const unsubscribeTournaments = onSnapshot(tournamentsQuery, (snapshot) => {
      const tournaments = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.participants && data.participants.includes(user.uid)) {
          tournaments.push({ id: doc.id, ...data });
        }
      });
      
      setStats(prev => ({
        ...prev,
        activeTournaments: tournaments.filter(t => t.status === 'ongoing' || t.status === 'registration_open').length
      }));
    }, (error) => {
      console.error('Turnuva listener hatası:', error);
    });

    unsubscribeFunctions.push(unsubscribeTournaments);

    return () => {
      unsubscribeFunctions.forEach(unsub => unsub());
    };
  };

  // Veri değiştiğinde hesaplamaları yap
  useEffect(() => {
    const allMatches = [...reservations, ...openMatches];
    
    updateStats(allMatches);
    updateUpcomingReservations(allMatches);
    updateRecentReservations(allMatches);
    
    // Grafikler için sadece rezervasyonları kullan (şimdilik)

    loadFavoriteTesisler(reservations);
  }, [reservations, openMatches]);


  const updateStats = (reservationsData) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const totalMatches = reservationsData.length;
    const upcomingMatches = reservationsData.filter(r => {
      const resDate = r.date?.toDate ? r.date.toDate() : new Date(r.date);
      // Tarih karşılaştırması için saati sıfırla
      const compareDate = new Date(resDate);
      compareDate.setHours(0, 0, 0, 0);
      
      return compareDate >= today && (r.status === 'confirmed' || r.status === 'pending' || r.status === 'open');
    }).length;
    const completedMatches = reservationsData.filter(r => r.status === 'completed').length;

    setStats(prev => ({
      ...prev,
      totalMatches,
      upcomingMatches,
      completedMatches
    }));
  };

  const updateUpcomingReservations = (reservationsData) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const upcoming = reservationsData
      .filter(res => {
        const resDate = res.date?.toDate ? res.date.toDate() : new Date(res.date);
        // Tarih karşılaştırması için saati sıfırla
        const compareDate = new Date(resDate);
        compareDate.setHours(0, 0, 0, 0);
        
        return compareDate >= today && (res.status === 'confirmed' || res.status === 'pending' || res.status === 'open');
      })
      .sort((a, b) => {
        const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
        const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
        return dateA - dateB;
      })
      .slice(0, 5);
    
    setUpcomingReservations(upcoming);
  };

  const updateRecentReservations = (reservationsData) => {
    const recent = reservationsData
      .filter(res => res.status === 'completed' || res.status === 'confirmed')
      .sort((a, b) => {
        const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
        const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
        return dateB - dateA;
      })
      .slice(0, 5);
    
    setRecentReservations(recent);
  };





  const loadFavoriteTesisler = async (reservationsData) => {
    let targetTesisIds = [];

    // 1. Öncelik: Kullanıcının favorileri
    if (userData?.favorites && Array.isArray(userData.favorites) && userData.favorites.length > 0) {
      targetTesisIds = userData.favorites;
    } else {
      // 2. Öncelik: En çok oynadığı sahalar (Favori yoksa)
      const tesisCounts = {};
      reservationsData.forEach(r => {
        if (r.tesisId) {
          tesisCounts[r.tesisId] = (tesisCounts[r.tesisId] || 0) + 1;
        }
      });
      targetTesisIds = Object.entries(tesisCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([id]) => id);
    }

    if (targetTesisIds.length > 0) {
      try {
        const promises = targetTesisIds.map(id => getTesis(id));
        const results = await Promise.all(promises);
        
        const favorite = results
          .map((res, index) => {
            if (!res.success) return null;
            const t = res.data;
            const tesisId = targetTesisIds[index];
            
            // Oynama sayısını hesapla
            const playCount = reservationsData.filter(r => r.tesisId === tesisId).length;
            
            return {
              ...t,
              id: tesisId,
              playCount: playCount,
              lastPlayed: reservationsData
                .filter(r => r.tesisId === tesisId)
                .sort((a, b) => {
                  const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
                  const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
                  return dateB - dateA;
                })[0]?.date
            };
          })
          .filter(item => item !== null);

        setFavoriteTesisler(favorite);
      } catch (error) {
        console.error('Favori sahalar yükleme hatası:', error);
      }
    } else {
        setFavoriteTesisler([]);
    }
  };

  const loadDashboardData = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const [statsResult, reservationsResult, teamsResult, openMatchesResult] = await Promise.all([
        getPlayerStats(user.uid),
        getPlayerReservations(user.uid),
        getPlayerTeams(user.uid),
        getUserOpenMatchesList(user.uid)
      ]);

      if (reservationsResult.success) {
        // Gelen veriyi state'e al - Listener zaten güncelleyecek ama ilk yükleme için önemli
        setReservations(reservationsResult.data.map(r => ({...r, sourceType: 'reservation'})));
      }
      
      if (openMatchesResult.success) {
        setOpenMatches(openMatchesResult.data.map(m => ({...m, sourceType: 'openMatch'})));
      }

      setStats(prev => ({
          ...prev,
          activeTeams: teamsResult.success ? teamsResult.data.filter(t => t.status === 'active').length : 0
      }));

    } catch (err) {
      console.error('Dashboard veri yükleme hatası:', err);
      // setError('Veriler yüklenirken hata oluştu'); // Silently fail or show error
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'open': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'confirmed': return 'Onaylandı';
      case 'pending': return 'Beklemede';
      case 'open': return 'Açık Maç';
      case 'cancelled': return 'İptal';
      default: return 'Bilinmiyor';
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    const d = date?.toDate ? date.toDate() : new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const matchDate = new Date(d);
    matchDate.setHours(0, 0, 0, 0);
    
    const diffTime = matchDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Bugün';
    if (diffDays === 1) return 'Yarın';
    if (diffDays === 2) return 'Öbür Gün';
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Dashboard yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Hata</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadDashboardData}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Tekrar Dene
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 overflow-hidden">
      <OyuncuSidebar />

      <div className="flex-1 flex flex-col overflow-hidden">


        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative bg-gradient-to-r from-green-600 via-green-500 to-emerald-500 px-4 py-6 sm:px-6 sm:py-8 md:px-8 md:py-12 text-white overflow-hidden"
        >
          {/* Header */}
          <DashboardHeader variant="hero" />
          
          {/* Background Image */}
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: 'url(/images/login-background.jpg)'
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-green-600/90 via-green-500/90 to-emerald-500/90" />
          
          <div className="relative mt-10 md:mt-0  max-w-7xl mx-auto z-10">
            <div className="flex flex-col sm:flex-row  items-start sm:items-center justify-between gap-4 sm:gap-6">
              <div className="flex-1">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">
                  Hoş geldin, {userData?.fullName || userData?.displayName || 'Oyuncu'}! 👋
                </h1>
                <p className="text-green-100 text-sm sm:text-base md:text-lg">
                  Bugün hangi sahada oynayalım?
                </p>
              </div>
            </div>

            {/* Quick Access Grid - Moved to Hero */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mt-8">
              {[
                { icon: Search, label: 'Saha Ara', href: '/oyuncu/sahalar' },
                { icon: Users, label: 'Oyuncu Bul', href: '/oyuncu/oyuncu-bul?tab=player' },
                { icon: Plus, label: 'Maç Oluştur', href: '/oyuncu/mac-olustur' },
                { icon: Users, label: 'Ekip Yönetimi', href: '/oyuncu/ekip' },
                { icon: Trophy, label: 'Turnuvalar', href: '/oyuncu/turnuvalar' },
                { icon: FileText, label: 'Faturalar', href: '/oyuncu/faturalar' }
              ].map((item, index) => (
                <motion.button
                  key={index}
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate(item.href)}
                  className="bg-white/20 backdrop-blur-md border border-white/40 rounded-xl p-3 sm:p-4 text-white hover:bg-white/30 transition-all flex flex-col items-center justify-center gap-2 min-h-[90px] group shadow-sm"
                >
                  <div className="p-2 bg-white/20 rounded-lg group-hover:bg-white/30 transition-colors">
                    <item.icon className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <p className="text-xs sm:text-sm font-medium text-center">{item.label}</p>
                </motion.button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
          <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 md:space-y-8">






            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Upcoming Reservations */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
                className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden"
              >
                <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-3 sm:px-6 sm:py-4 text-white">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                      <Clock className="w-5 h-5" />
                      Yaklaşan Maçlar
                    </h2>
                    <button
                      onClick={() => navigate('/oyuncu/mac-olustur')}
                      className="text-orange-100 hover:text-white transition-colors text-xs sm:text-sm font-medium flex items-center gap-1 min-h-[44px]"
                    >
                      Tümünü Gör
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="divide-y divide-gray-100">
                  {upcomingReservations.length > 0 ? (
                    upcomingReservations.map((reservation, index) => (
                      <motion.div
                        key={reservation.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 1 + index * 0.1 }}
                        className="p-4 sm:p-6 hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => navigate(`/oyuncu/rezervasyonlar`)}
                      >
                        <div className="flex items-start gap-3 sm:gap-4">
                          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center flex-shrink-0">
                            <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1 truncate">
                              {reservation.tesisName || 'Saha'}
                            </h3>
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-600 mb-2">
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                                <span className="font-medium">{formatDate(reservation.date)}</span>
                                <span>•</span>
                                <span>{reservation.timeSlot}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 sm:w-4 sm:h-4" />
                                <span className="truncate max-w-[150px] sm:max-w-none">{reservation.tesisLocation || 'Konum'}</span>
                              </div>
                            </div>
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
                              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                                <span className={`px-2 sm:px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(reservation.status)}`}>
                                  {getStatusText(reservation.status)}
                                </span>
                                <div className="flex items-center gap-1 text-xs sm:text-sm text-gray-600">
                                  <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                                  <span>{reservation.totalPlayers || 0} oyuncu</span>
                                </div>
                              </div>
                              <span className="text-base sm:text-lg font-bold text-gray-900">
                                ₺{reservation.totalAmount || reservation.price || 0}
                              </span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="p-8 sm:p-12 text-center">
                      <Calendar className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">Yaklaşan Maç Yok</h3>
                      <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">Henüz yaklaşan maçınız bulunmuyor.</p>
                      <button
                        onClick={() => navigate('/oyuncu/sahalar')}
                        className="px-4 sm:px-6 py-2.5 sm:py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm sm:text-base min-h-[44px]"
                      >
                        Saha Ara
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Favorite Tesisler */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 }}
                className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden"
              >
                <div className="bg-gradient-to-r from-green-500 to-green-600 px-4 py-3 sm:px-6 sm:py-4 text-white">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                      <Heart className="w-5 h-5" />
                      Favori Sahalar
                    </h2>
                    <button
                      onClick={() => navigate('/oyuncu/sahalar')}
                      className="text-green-100 hover:text-white transition-colors text-xs sm:text-sm font-medium flex items-center gap-1 min-h-[44px]"
                    >
                      Tümünü Gör
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="divide-y divide-gray-100">
                  {favoriteTesisler.length > 0 ? (
                    favoriteTesisler.map((tesis, index) => (
                      <motion.div
                        key={tesis.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 1.1 + index * 0.1 }}
                        className="p-4 sm:p-6 hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => navigate(`/oyuncu/saha-detay/${tesis.id}`)}
                      >
                        <div className="flex items-start gap-3 sm:gap-4">
                          {tesis.images && tesis.images.length > 0 ? (
                            <img
                              src={tesis.images[0].optimized_url || tesis.images[0].url}
                              alt={tesis.name}
                              className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center flex-shrink-0">
                              <Building2 className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1 truncate">
                              {tesis.name}
                            </h3>
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-600 mb-2">
                              <div className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 sm:w-4 sm:h-4" />
                                <span className="truncate max-w-[150px] sm:max-w-none">{tesis.location}</span>
                              </div>
                              {tesis.rating && (
                                <div className="flex items-center gap-1">
                                  <Star className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-500 fill-yellow-500" />
                                  <span>{tesis.rating}</span>
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/oyuncu/saha-detay/${tesis.id}`);
                                }}
                                className="px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs sm:text-sm font-medium min-h-[44px] w-full sm:w-auto"
                              >
                                Rezerve Et
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="p-8 sm:p-12 text-center">
                      <Heart className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">Favori Saha Yok</h3>
                      <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">En çok oynadığınız sahalar burada görünecek.</p>
                      <button
                        onClick={() => navigate('/oyuncu/sahalar')}
                        className="px-4 sm:px-6 py-2.5 sm:py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm sm:text-base min-h-[44px]"
                      >
                        Saha Ara
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>

            {/* Recent Activity */}
            {recentReservations.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2 }}
                className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-100"
              >
                <div className="flex items-center justify-between mb-4 sm:mb-6 flex-wrap gap-2">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-gray-400" />
                    Son Aktiviteler
                  </h2>
                  <button
                    onClick={() => navigate('/oyuncu/rezervasyonlar')}
                    className="text-green-600 hover:text-green-700 transition-colors text-xs sm:text-sm font-medium flex items-center gap-1 min-h-[44px]"
                  >
                    Tümünü Gör
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-2 sm:space-y-3">
                  {recentReservations.map((reservation, index) => (
                    <motion.div
                      key={reservation.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1.3 + index * 0.1 }}
                      className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
                      onClick={() => navigate('/oyuncu/rezervasyonlar')}
                    >
                      <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm sm:text-base text-gray-900 truncate">{reservation.tesisName || 'Saha'}</h3>
                          <p className="text-xs sm:text-sm text-gray-600 truncate">
                            {formatDate(reservation.date)} • {reservation.timeSlot}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto justify-between sm:justify-end">
                        <span className={`px-2 sm:px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(reservation.status)}`}>
                          {getStatusText(reservation.status)}
                        </span>
                        <span className="font-bold text-sm sm:text-base text-gray-900">₺{reservation.totalAmount || reservation.price || 0}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
      {/* Profile Incomplete Modal */}
      {showIncompleteProfileModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-8 text-center shadow-2xl border border-gray-200">
             <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                <AlertCircle className="w-10 h-10 text-red-600" />
             </div>
             
             <h2 className="text-2xl font-bold text-gray-900 mb-2">Profilinizi Tamamlayın</h2>
             <p className="text-gray-600 mb-8 leading-relaxed">
               Devam edebilmek için lütfen ad, soyad ve telefon bilgilerinizi eksiksiz giriniz.
             </p>

             <button 
               onClick={() => navigate('/oyuncu/profil')}
               className="w-full py-3.5 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-green-200 flex items-center justify-center gap-2"
             >
               <Users size={20} />
               Profil Bilgilerini Ekle
             </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
