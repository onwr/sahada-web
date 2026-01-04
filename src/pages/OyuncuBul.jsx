import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getOpenMatches, joinOpenMatch } from '../services/firestoreService';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { 
  Users, Calendar, MapPin, DollarSign, Star, Clock, Plus, Search, 
  Filter, Grid, List, X, CheckCircle, AlertCircle 
} from 'lucide-react';
import toast from '../utils/toast';

const OyuncuBul = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  
  // Filters
  const [filters, setFilters] = useState({
    location: '',
    date: '',
    timeRange: 'all',
    level: 'all',
    format: 'all',
    priceFilter: 'all',
    searchTerm: searchParams.get('search') || ''
  });

  const [showFilters, setShowFilters] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    loadMatches();
    setupRealtimeListener();
    
    return () => {
      // Cleanup will be handled by unsubscribe
    };
  }, [filters]);

  const setupRealtimeListener = () => {
    const matchesRef = collection(db, 'openMatches');
    // Sadece status filtresi kullanıyoruz, tarih filtresini client-side yapıyoruz
    const q = query(matchesRef, where('status', '==', 'open'));
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const matchesData = [];
      snapshot.forEach((doc) => {
        matchesData.push({ id: doc.id, ...doc.data() });
      });
      
      // Client-side filtreleme
      let filtered = applyFilters(matchesData);
      setMatches(filtered);
      setLoading(false);
    }, (error) => {
      console.error('Real-time listener hatası:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  };

  const loadMatches = async () => {
    try {
      setLoading(true);
      const result = await getOpenMatches(filters);
      if (result.success) {
        setMatches(result.data);
      }
    } catch (error) {
      console.error('Maçlar yükleme hatası:', error);
      toast.error('Maçlar yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (matchesData) => {
    let filtered = [...matchesData];
    const now = new Date();
    now.setHours(0,0,0,0);

    // Tarih filtresi
    if (filters.date) {
         const filterDate = new Date(filters.date);
         const nextDay = new Date(filterDate);
         nextDay.setDate(nextDay.getDate() + 1);
         
         filtered = filtered.filter(m => {
            const mDate = m.date?.toDate ? m.date.toDate() : new Date(m.date);
            return mDate >= filterDate && mDate < nextDay;
         });
    } else {
         // Sadece gelecekteki maçları göster
         filtered = filtered.filter(m => {
            const mDate = m.date?.toDate ? m.date.toDate() : new Date(m.date);
            // Bugün ve sonrası
            return mDate >= now;
         });
    }

    if (filters.location) {
      filtered = filtered.filter(m => 
        m.location?.toLowerCase().includes(filters.location.toLowerCase()) ||
        m.tesisName?.toLowerCase().includes(filters.location.toLowerCase())
      );
    }

    if (filters.format && filters.format !== 'all') {
      filtered = filtered.filter(m => m.format === filters.format);
    }

    if (filters.level && filters.level !== 'all') {
      filtered = filtered.filter(m => m.level === filters.level);
    }

    if (filters.priceFilter === 'free') {
      filtered = filtered.filter(m => m.pricePerPlayer === 0);
    }

    if (filters.timeRange && filters.timeRange !== 'all') {
      const [startHour, endHour] = filters.timeRange.split('-').map(h => parseInt(h));
      filtered = filtered.filter(m => {
        const matchHour = parseInt(m.timeSlot?.split(':')[0] || 0);
        return matchHour >= startHour && matchHour < endHour;
      });
    }

    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(m =>
        m.tesisName?.toLowerCase().includes(searchLower) ||
        m.location?.toLowerCase().includes(searchLower) ||
        m.organizerName?.toLowerCase().includes(searchLower) ||
        m.description?.toLowerCase().includes(searchLower)
      );
    }

    // Sıralama: en yakın tarih önce
    filtered.sort((a, b) => {
      const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
      const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
      return dateA - dateB;
    });

    return filtered;
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleJoinMatch = async () => {
    if (!user) {
      toast.error('Maça katılmak için giriş yapmalısınız');
      navigate('/login');
      return;
    }

    if (!selectedMatch) return;

    setJoining(true);
    try {
      const result = await joinOpenMatch(selectedMatch.id, user.uid);
      if (result.success) {
        toast.success('Maça başarıyla katıldınız!');
        setShowJoinModal(false);
        setSelectedMatch(null);
      } else {
        toast.error(result.error || 'Maça katılamadınız');
      }
    } catch (error) {
      console.error('Maça katılma hatası:', error);
      toast.error('Bir hata oluştu');
    } finally {
      setJoining(false);
    }
  };

  const getFormatIcon = (format) => {
    switch (format) {
      case 'football': return '⚽';
      case 'basketball': return '🏀';
      case 'tennis': return '🎾';
      case 'volleyball': return '🏐';
      default: return '⚽';
    }
  };

  const getFormatText = (format) => {
    switch (format) {
      case 'football': return 'Halı Saha';
      case 'basketball': return 'Basketbol';
      case 'tennis': return 'Tenis';
      case 'volleyball': return 'Voleybol';
      default: return format;
    }
  };

  const getLevelText = (level) => {
    switch (level) {
      case 'beginner': return 'Başlangıç';
      case 'intermediate': return 'Orta';
      case 'good': return 'İyi';
      case 'advanced': return 'İleri';
      case 'mixed': return 'Karışık';
      default: return level;
    }
  };

  const getMissingPlayers = (match) => {
    return match.maxPlayers - match.currentPlayers;
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

  const clearFilters = () => {
    setFilters({
      location: '',
      date: '',
      timeRange: 'all',
      level: 'all',
      format: 'all',
      priceFilter: 'all',
      searchTerm: ''
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto max-w-screen-xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Oyuncu Bul
          </h1>
          <p className="text-lg text-gray-600">
            Eksik oyuncu arayan maçları bul ve takımını tamamla
          </p>
        </div>

        {/* Search and Filters Bar */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Maç, konum veya organizatör ara..."
                value={filters.searchTerm}
                onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* Quick Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={filters.format}
                onChange={(e) => handleFilterChange('format', e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="all">Tüm Formatlar</option>
                <option value="football">⚽ Halı Saha</option>
                <option value="basketball">🏀 Basketbol</option>
                <option value="tennis">🎾 Tenis</option>
                <option value="volleyball">🏐 Voleybol</option>
              </select>

              <select
                value={filters.level}
                onChange={(e) => handleFilterChange('level', e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="all">Tüm Seviyeler</option>
                <option value="beginner">Başlangıç</option>
                <option value="intermediate">Orta</option>
                <option value="good">İyi</option>
                <option value="advanced">İleri</option>
                <option value="mixed">Karışık</option>
              </select>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center space-x-2"
              >
                <Filter size={18} />
                <span>Filtreler</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-green-100 text-green-600' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  <Grid size={20} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-green-100 text-green-600' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  <List size={20} />
                </button>
              </div>
            </div>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Konum</label>
                <input
                  type="text"
                  placeholder="İl, ilçe..."
                  value={filters.location}
                  onChange={(e) => handleFilterChange('location', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tarih</label>
                <input
                  type="date"
                  value={filters.date}
                  onChange={(e) => handleFilterChange('date', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Saat Aralığı</label>
                <select
                  value={filters.timeRange}
                  onChange={(e) => handleFilterChange('timeRange', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="all">Tüm Gün</option>
                  <option value="6-12">Sabah (06:00-12:00)</option>
                  <option value="12-18">Öğle (12:00-18:00)</option>
                  <option value="18-22">Akşam (18:00-22:00)</option>
                  <option value="22-6">Gece (22:00-06:00)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ücret</label>
                <select
                  value={filters.priceFilter}
                  onChange={(e) => handleFilterChange('priceFilter', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="all">Hepsi</option>
                  <option value="free">💰 Ücretsiz</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900 flex items-center space-x-2"
                >
                  <X size={18} />
                  <span>Filtreleri Temizle</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <p className="text-center text-gray-700">
            <span className="font-bold text-green-600">{matches.reduce((sum, m) => sum + getMissingPlayers(m), 0)}</span> eksik oyuncu arayan <span className="font-bold text-green-600">{matches.length}</span> maç bulundu
          </p>
        </div>

        {/* Matches */}
        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : matches.length > 0 ? (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
            {matches.map((match) => {
              const missingPlayers = getMissingPlayers(match);
              const isUrgent = missingPlayers <= 2;
              const isFree = match.pricePerPlayer === 0;
              const matchHour = parseInt(match.timeSlot?.split(':')[0] || 0);
              const isNight = matchHour >= 22 || matchHour < 6;
              const isJoined = user && match.players.includes(user.uid);

              return (
                <div
                  key={match.id}
                  className={`bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow ${viewMode === 'list' ? 'flex items-center gap-6' : ''}`}
                >
                  {viewMode === 'grid' ? (
                    <>
                      {/* Badges */}
                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        {isUrgent && (
                          <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded-full">
                            🔥 Acil - {missingPlayers} Kişi
                          </span>
                        )}
                        {isFree && (
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                            💰 Ücretsiz
                          </span>
                        )}
                        {isNight && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                            🌙 Gece Maçı
                          </span>
                        )}
                      </div>

                      {/* Format */}
                      <div className="flex items-center space-x-2 mb-3">
                        <span className="text-2xl">{getFormatIcon(match.format)}</span>
                        <span className="font-semibold text-gray-900">{getFormatText(match.format)}</span>
                      </div>

                      {/* Title */}
                      <h3 className="font-bold text-gray-900 mb-2 line-clamp-1">
                        {match.tesisName || match.location || 'Maç'}
                      </h3>

                      {/* Location */}
                      <div className="flex items-center text-sm text-gray-600 mb-2">
                        <MapPin className="w-4 h-4 mr-1" />
                        <span className="truncate">{match.location || match.tesisName || 'Konum belirtilmemiş'}</span>
                      </div>

                      {/* Date & Time */}
                      <div className="flex items-center text-sm text-gray-600 mb-2">
                        <Calendar className="w-4 h-4 mr-1" />
                        <span>{formatDate(match.date)}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600 mb-3">
                        <Clock className="w-4 h-4 mr-1" />
                        <span>{match.timeSlot}</span>
                      </div>

                      {/* Price */}
                      <div className="flex items-center text-sm text-gray-600 mb-3">
                        <DollarSign className="w-4 h-4 mr-1" />
                        <span>{isFree ? 'Ücretsiz' : `₺${match.pricePerPlayer}/kişi`}</span>
                      </div>

                      {/* Level */}
                      <div className="mb-3">
                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                          🎯 {getLevelText(match.level)}
                        </span>
                      </div>

                      {/* Players */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center text-sm text-gray-600">
                          <Users className="w-4 h-4 mr-1" />
                          <span>Oyuncular ({match.currentPlayers}/{match.maxPlayers})</span>
                        </div>
                      </div>

                      {/* Player Avatars */}
                      <div className="flex items-center space-x-1 mb-4 flex-wrap">
                        {match.players.slice(0, 8).map((playerId, idx) => (
                          <div
                            key={idx}
                            className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-xs font-medium text-green-800"
                          >
                            {playerId === match.organizerId ? 'OY' : 'O'}
                          </div>
                        ))}
                        {match.players.length > 8 && (
                          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-xs font-medium text-gray-600">
                            +{match.players.length - 8}
                          </div>
                        )}
                        {Array.from({ length: Math.min(missingPlayers, 4) }).map((_, idx) => (
                          <div
                            key={`empty-${idx}`}
                            className="w-8 h-8 border-2 border-dashed border-gray-300 rounded-full flex items-center justify-center"
                          >
                            <Plus className="w-4 h-4 text-gray-400" />
                          </div>
                        ))}
                      </div>

                      {/* Organizer */}
                      <div className="flex items-center justify-between pt-3 border-t border-gray-200 mb-4">
                        <div className="flex items-center space-x-2">
                          {match.organizerAvatar ? (
                            <img
                              src={match.organizerAvatar}
                              alt={match.organizerName}
                              className="w-6 h-6 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                              <span className="text-xs font-medium text-green-800">
                                {match.organizerName?.charAt(0) || 'O'}
                              </span>
                            </div>
                          )}
                          <div>
                            <p className="text-xs font-medium text-gray-900">{match.organizerName}</p>
                            <div className="flex items-center space-x-1">
                              <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                              <span className="text-xs text-gray-600">
                                {match.organizerRating?.toFixed(1) || '4.0'} • {match.organizerMatchCount || 0} maç
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Join Button */}
                      {isJoined ? (
                        <button
                          disabled
                          className="w-full px-4 py-2 bg-gray-300 text-gray-600 rounded-lg cursor-not-allowed font-medium text-sm"
                        >
                          <CheckCircle className="w-4 h-4 inline mr-2" />
                          Katıldınız
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            if (!user) {
                              toast.error('Maça katılmak için giriş yapmalısınız');
                              navigate('/login');
                              return;
                            }
                            setSelectedMatch(match);
                            setShowJoinModal(true);
                          }}
                          className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm"
                        >
                          Katıl
                        </button>
                      )}
                    </>
                  ) : (
                    // List view
                    <>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl">{getFormatIcon(match.format)}</span>
                          <h3 className="font-bold text-gray-900">{match.tesisName || match.location || 'Maç'}</h3>
                          {isUrgent && (
                            <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded-full">
                              🔥 Acil
                            </span>
                          )}
                          {isFree && (
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                              💰 Ücretsiz
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center">
                            <MapPin className="w-4 h-4 mr-1" />
                            <span>{match.location || match.tesisName}</span>
                          </div>
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            <span>{formatDate(match.date)}</span>
                          </div>
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            <span>{match.timeSlot}</span>
                          </div>
                          <div className="flex items-center">
                            <Users className="w-4 h-4 mr-1" />
                            <span>{match.currentPlayers}/{match.maxPlayers} ({missingPlayers} eksik)</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">
                            {isFree ? 'Ücretsiz' : `₺${match.pricePerPlayer}/kişi`}
                          </p>
                          <p className="text-xs text-gray-600">
                            🎯 {getLevelText(match.level)}
                          </p>
                        </div>
                        {isJoined ? (
                          <button
                            disabled
                            className="px-6 py-2 bg-gray-300 text-gray-600 rounded-lg cursor-not-allowed font-medium text-sm"
                          >
                            Katıldınız
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              if (!user) {
                                toast.error('Maça katılmak için giriş yapmalısınız');
                                navigate('/login');
                                return;
                              }
                              setSelectedMatch(match);
                              setShowJoinModal(true);
                            }}
                            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm"
                          >
                            Katıl
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-xl">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Maç bulunamadı</h3>
            <p className="text-gray-600 mb-6">Filtreleri değiştirerek tekrar deneyin</p>
            <button
              onClick={clearFilters}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              Filtreleri Temizle
            </button>
          </div>
        )}
      </div>

      {/* Join Modal */}
      {showJoinModal && selectedMatch && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Maça Katıl</h3>
            <div className="space-y-3 mb-6">
              <div>
                <p className="text-sm text-gray-600">Maç</p>
                <p className="font-medium text-gray-900">{selectedMatch.tesisName || selectedMatch.location}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Tarih ve Saat</p>
                <p className="font-medium text-gray-900">
                  {formatDate(selectedMatch.date)} • {selectedMatch.timeSlot}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Ücret</p>
                <p className="font-medium text-gray-900">
                  {selectedMatch.pricePerPlayer === 0 ? 'Ücretsiz' : `₺${selectedMatch.pricePerPlayer}/kişi`}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Eksik Oyuncu</p>
                <p className="font-medium text-gray-900">
                  {getMissingPlayers(selectedMatch)} kişi
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setShowJoinModal(false);
                  setSelectedMatch(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                İptal
              </button>
              <button
                onClick={handleJoinMatch}
                disabled={joining}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {joining ? 'Katılıyor...' : 'Katıl'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default OyuncuBul;

