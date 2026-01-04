import React, { useState, useEffect } from 'react';
import { Trophy, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { db } from '../../config/firebase';

const TournamentStandings = ({ standings: initialStandings = [], loading: initialLoading = false, tournamentId = null, realtime = false }) => {
  const [standings, setStandings] = useState(initialStandings);
  const [loading, setLoading] = useState(initialLoading);

  useEffect(() => {
    if (realtime && tournamentId) {
      // Index hatası nedeniyle orderBy kaldırıldı, client-side sorting yapılıyor
      const standingsQuery = query(
        collection(db, 'tournamentStandings'),
        where('tournamentId', '==', tournamentId)
      );

      const unsubscribe = onSnapshot(standingsQuery, (snapshot) => {
        const standingsData = [];
        snapshot.forEach((doc) => {
          standingsData.push({ id: doc.id, ...doc.data() });
        });
        // Client-side sort by rank (orderBy kaldırıldı index hatası nedeniyle)
        standingsData.sort((a, b) => (a.rank || 0) - (b.rank || 0));
        setStandings(standingsData);
        setLoading(false);
      }, (error) => {
        console.error('Standings listener hatası:', error);
        // Index hatası durumunda sessizce devam et
        setLoading(false);
      });

      return () => unsubscribe();
    } else {
      setStandings(initialStandings);
      setLoading(initialLoading);
    }
  }, [realtime, tournamentId, initialStandings, initialLoading]);
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!standings || standings.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 text-center">
        <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">Henüz puan durumu bulunmuyor</p>
      </div>
    );
  }

  const sortedStandings = [...standings].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    return b.goalsFor - a.goalsFor;
  });

  const getRankIcon = (rank) => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-500" />;
    if (rank === 2) return <Trophy className="w-5 h-5 text-gray-400" />;
    if (rank === 3) return <Trophy className="w-5 h-5 text-orange-600" />;
    return <span className="text-gray-400 font-bold">{rank}</span>;
  };

  const getRankChange = (currentRank, previousRank) => {
    if (!previousRank) return null;
    if (currentRank < previousRank) {
      return <TrendingUp className="w-4 h-4 text-green-500" />;
    } else if (currentRank > previousRank) {
      return <TrendingDown className="w-4 h-4 text-red-500" />;
    }
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Puan Durumu</h3>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Sıra
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Katılımcı
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                O
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                G
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                B
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                M
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                A
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Y
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                AV
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Puan
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedStandings.map((standing, index) => {
              const isTopThree = standing.rank <= 3;
              const bgColor = standing.rank === 1 
                ? 'bg-yellow-50' 
                : standing.rank === 2 
                ? 'bg-gray-50' 
                : standing.rank === 3 
                ? 'bg-orange-50' 
                : '';
              
              return (
                <tr 
                  key={standing.id || standing.participantId || index}
                  className={`hover:bg-gray-50 ${bgColor}`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {getRankIcon(standing.rank)}
                      {getRankChange(standing.rank, standing.previousRank)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {standing.participantName || 'Bilinmeyen'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                    {standing.matchesPlayed || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                    {standing.wins || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                    {standing.draws || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                    {standing.losses || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                    {standing.goalsFor || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                    {standing.goalsAgainst || 0}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-center text-sm font-medium ${
                    (standing.goalDifference || 0) > 0 ? 'text-green-600' :
                    (standing.goalDifference || 0) < 0 ? 'text-red-600' :
                    'text-gray-900'
                  }`}>
                    {(standing.goalDifference || 0) > 0 ? '+' : ''}{standing.goalDifference || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-bold text-gray-900">
                    {standing.points || 0}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TournamentStandings;

