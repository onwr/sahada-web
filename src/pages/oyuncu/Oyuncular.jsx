import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getPlayerPlayedWith } from '../../services/firestoreService';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import OyuncuSidebar from '../../components/OyuncuSidebar';
import { Users, Search, Trophy, Calendar, User } from 'lucide-react';
import toast from '../../utils/toast';

const Oyuncular = () => {
  const { user } = useAuth();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('matches');
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    loadPlayers();
    const cleanup = setupRealtimeListener();
    
    return () => {
      if (cleanup) cleanup();
    };
  }, [user]);

  const setupRealtimeListener = () => {
    if (!user) return;

    const reservationsQuery = query(
      collection(db, 'rezervasyonlar'),
      where('players', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(reservationsQuery, async () => {
      await loadPlayers();
    }, (error) => {
      console.error('Oyuncu listener hatası:', error);
    });

    return () => unsubscribe();
  };

  const loadPlayers = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await getPlayerPlayedWith(user.uid);
      if (result.success) {
        setPlayers(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error('Oyuncular yükleme hatası:', err);
      setError('Veriler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetail = (player) => {
    setSelectedPlayer(player);
    setShowDetailModal(true);
  };

  const filteredAndSortedPlayers = players
    .filter(player => {
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return player.fullName.toLowerCase().includes(searchLower) ||
               player.email.toLowerCase().includes(searchLower);
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'matches') {
        return b.matchCount - a.matchCount;
      } else if (sortBy === 'recent') {
        if (!a.lastPlayed && !b.lastPlayed) return 0;
        if (!a.lastPlayed) return 1;
        if (!b.lastPlayed) return -1;
        return b.lastPlayed - a.lastPlayed;
      }
      return 0;
    });

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Oyuncular yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <OyuncuSidebar />

      <div className="flex-1 flex flex-col">
        <header className="bg-white shadow-sm border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Oynadığım Oyuncular</h1>
              <p className="text-gray-600 mt-1">
                {filteredAndSortedPlayers.length} oyuncu ile oynadınız
              </p>
            </div>
          </div>
        </header>

        <div className="bg-white border-b px-6 py-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Oyuncu ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            >
              <option value="matches">En Çok Oynadığım</option>
              <option value="recent">Son Oynadığım</option>
            </select>
          </div>
        </div>

        <div className="flex-1 p-6 overflow-y-auto">
          {error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          ) : filteredAndSortedPlayers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAndSortedPlayers.map((player) => (
                <div
                  key={player.playerId}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleViewDetail(player)}
                >
                  <div className="flex items-center space-x-4 mb-4">
                    {player.avatar ? (
                      <img
                        src={player.avatar}
                        alt={player.fullName}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                        <User className="w-8 h-8 text-green-600" />
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900">{player.fullName}</h3>
                      {player.email && (
                        <p className="text-sm text-gray-600">{player.email}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-sm text-gray-600">
                        <Trophy className="w-4 h-4 mr-2" />
                        <span>Birlikte Oynadığımız Maç</span>
                      </div>
                      <span className="font-semibold text-gray-900">{player.matchCount}</span>
                    </div>
                    {player.lastPlayed && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-sm text-gray-600">
                          <Calendar className="w-4 h-4 mr-2" />
                          <span>Son Oynadığımız</span>
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {player.lastPlayed.toLocaleDateString('tr-TR')}
                        </span>
                      </div>
                    )}
                    {player.position && (
                      <div className="flex items-center text-sm text-gray-600">
                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                          {player.position}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Oyuncu Yok</h3>
              <p className="text-gray-600">Henüz birlikte oynadığınız oyuncu bulunmuyor</p>
            </div>
          )}
        </div>

        {/* Detail Modal */}
        {showDetailModal && selectedPlayer && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Oyuncu Detayları</h2>
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    setSelectedPlayer(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-6">
                <div className="flex items-center space-x-4">
                  {selectedPlayer.avatar ? (
                    <img
                      src={selectedPlayer.avatar}
                      alt={selectedPlayer.fullName}
                      className="w-20 h-20 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                      <User className="w-10 h-10 text-green-600" />
                    </div>
                  )}
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{selectedPlayer.fullName}</h3>
                    {selectedPlayer.email && (
                      <p className="text-sm text-gray-600">{selectedPlayer.email}</p>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-gray-600">
                      <Trophy className="w-5 h-5 mr-2" />
                      <span>Birlikte Oynadığımız Maç</span>
                    </div>
                    <span className="font-bold text-gray-900 text-lg">{selectedPlayer.matchCount}</span>
                  </div>
                  {selectedPlayer.lastPlayed && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-gray-600">
                        <Calendar className="w-5 h-5 mr-2" />
                        <span>Son Oynadığımız</span>
                      </div>
                      <span className="font-medium text-gray-900">
                        {selectedPlayer.lastPlayed.toLocaleDateString('tr-TR')}
                      </span>
                    </div>
                  )}
                  {selectedPlayer.position && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Pozisyon</span>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                        {selectedPlayer.position}
                      </span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    setSelectedPlayer(null);
                  }}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Kapat
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Oyuncular;

