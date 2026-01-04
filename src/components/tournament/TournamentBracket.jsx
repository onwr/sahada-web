import React from 'react';
import { Trophy, Award, Medal } from 'lucide-react';

const TournamentBracket = ({ matches = [], standings = [], format = 'round_robin' }) => {
  if (format === 'round_robin') {
    // Round Robin için puan durumu görünümü göster
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Round Robin Puan Durumu</h3>
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <span>Toplam Maç: {matches.length}</span>
            <span>Tamamlanan: {matches.filter(m => m.status === 'completed').length}</span>
          </div>
        </div>

        {standings && standings.length > 0 ? (
          <div className="space-y-4">
            {standings.slice(0, 3).map((standing, idx) => (
              <div
                key={standing.id || standing.participantId || idx}
                className={`flex items-center justify-between p-4 rounded-lg ${
                  idx === 0 ? 'bg-yellow-50 border-2 border-yellow-300' :
                  idx === 1 ? 'bg-gray-50 border-2 border-gray-300' :
                  idx === 2 ? 'bg-orange-50 border-2 border-orange-300' :
                  'bg-white border border-gray-200'
                }`}
              >
                <div className="flex items-center space-x-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                    idx === 0 ? 'bg-yellow-400 text-white' :
                    idx === 1 ? 'bg-gray-400 text-white' :
                    idx === 2 ? 'bg-orange-400 text-white' :
                    'bg-gray-200 text-gray-700'
                  }`}>
                    {idx === 0 ? <Trophy className="w-6 h-6" /> :
                     idx === 1 ? <Medal className="w-6 h-6" /> :
                     idx === 2 ? <Award className="w-6 h-6" /> :
                     standing.rank}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">
                      {standing.participantName || 'Bilinmeyen'}
                    </p>
                    <p className="text-sm text-gray-600">
                      {standing.matchesPlayed || 0} Maç • {standing.wins || 0}G {standing.draws || 0}B {standing.losses || 0}M
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">{standing.points || 0}</p>
                  <p className="text-sm text-gray-600">Puan</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Henüz puan durumu yok</p>
          </div>
        )}

        {/* Maçlar Listesi */}
        {matches.length > 0 && (
          <div className="mt-8">
            <h4 className="font-semibold text-gray-900 mb-4">Maçlar</h4>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {matches.map((match) => (
                <div
                  key={match.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    match.status === 'completed' ? 'bg-green-50 border-green-200' :
                    match.status === 'ongoing' ? 'bg-blue-50 border-blue-200' :
                    'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex-1 flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                      <span className="font-medium text-gray-900 w-32 truncate">
                        {match.participant1Name}
                      </span>
                      <span className="text-gray-400">vs</span>
                      <span className="font-medium text-gray-900 w-32 truncate">
                        {match.participant2Name}
                      </span>
                    </div>
                    {match.status === 'completed' && match.score1 !== null && (
                      <div className="flex items-center space-x-2 ml-4">
                        <span className="text-lg font-bold text-gray-900">
                          {match.score1} - {match.score2}
                        </span>
                      </div>
                    )}
                    {match.status !== 'completed' && (
                      <span className="text-sm text-gray-500 ml-4">
                        {match.scheduledDate ? new Date(match.scheduledDate.toDate ? match.scheduledDate.toDate() : match.scheduledDate).toLocaleDateString('tr-TR') : 'Tarih belirlenmedi'}
                      </span>
                    )}
                  </div>
                  <span className={`ml-4 px-2 py-1 rounded-full text-xs font-semibold ${
                    match.status === 'completed' ? 'bg-green-100 text-green-800' :
                    match.status === 'ongoing' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {match.status === 'completed' ? 'Tamamlandı' :
                     match.status === 'ongoing' ? 'Devam Ediyor' :
                     'Planlandı'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Diğer formatlar için (elimination bracket vb.) gelecekte eklenebilir
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 text-center">
      <p className="text-gray-500">Bu turnuva formatı için bracket görünümü henüz desteklenmiyor</p>
    </div>
  );
};

export default TournamentBracket;

