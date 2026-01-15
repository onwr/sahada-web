import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getOpenMatches } from '../services/firestoreService';
import { Users, Calendar, MapPin, DollarSign, Star, Clock, Plus, ArrowRight } from 'lucide-react';

const OyuncuBulPreview = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMatches();
  }, []);

  const loadMatches = async () => {
    try {
      const result = await getOpenMatches({});
      if (result.success) {
        // Son 8 maçı al
        setMatches(result.data.slice(0, 8));
      }
    } catch (error) {
      console.error('Maçlar yükleme hatası:', error);
    } finally {
      setLoading(false);
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

  if (loading) {
    return (
      <div className="bg-white py-16">
        <div className="container mx-auto max-w-screen-xl px-4">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white py-16">
      <div className="container mx-auto max-w-screen-xl px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Adam mı Eksik? 🤝
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-6">
            Seviyene uygun oyuncularla eşleş, takımını tamamla, sahada buluş!
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate('/oyuncu-bul')}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center space-x-2"
            >
              <span>Tümünü Gör</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            {user ? (
              <button
                onClick={() => navigate('/oyuncu/mac-olustur')}
                className="px-6 py-3 border-2 border-green-600 text-green-600 rounded-lg hover:bg-green-50 transition-colors font-medium flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Maç Oluştur</span>
              </button>
            ) : (
              <button
                onClick={() => navigate('/login')}
                className="px-6 py-3 border-2 border-green-600 text-green-600 rounded-lg hover:bg-green-50 transition-colors font-medium flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Maç Oluştur</span>
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="bg-gray-50 rounded-xl p-4 mb-8">
          <p className="text-center text-gray-700">
            <span className="font-bold text-green-600">{matches.reduce((sum, m) => sum + getMissingPlayers(m), 0)}</span> eksik oyuncu arayan <span className="font-bold text-green-600">{matches.length}</span> maç bulundu
          </p>
        </div>

        {/* Matches Grid */}
        {matches.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {matches.map((match) => {
              const missingPlayers = getMissingPlayers(match);
              const isUrgent = missingPlayers <= 2;
              const isFree = match.pricePerPlayer === 0;
              const matchHour = parseInt(match.timeSlot?.split(':')[0] || 0);
              const isNight = matchHour >= 22 || matchHour < 6;

              return (
                <div
                  key={match.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => navigate('/oyuncu-bul')}
                >
                  {/* Badges */}
                  <div className="flex items-center gap-2 mb-3">
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
                    {/* <DollarSign className="w-4 h-4 mr-1" /> */}
                    <span className="font-medium">
                      {isFree ? 'Ücretsiz' : `₺${match.pricePerPlayer}/kişi`}
                    </span>
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
                  <div className="flex items-center space-x-1 mb-4">
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
                  <div className="flex items-center justify-between pt-3 border-t border-gray-200">
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
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (user) {
                        navigate('/oyuncu-bul');
                      } else {
                        navigate('/login');
                      }
                    }}
                    className="w-full mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm"
                  >
                    Katıl
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz açık maç yok</h3>
            <p className="text-gray-600 mb-6">İlk maçı sen oluştur!</p>
            <button
              onClick={() => navigate(user ? '/oyuncu/mac-olustur' : '/login')}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center space-x-2 mx-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Maç Oluştur</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default OyuncuBulPreview;

