import React, { useState } from 'react';
import { Star, X, User, Check, Trophy, Users, Heart, Clock } from 'lucide-react';
import { submitMatchRatings } from '../services/firestoreService';
import toast from '../utils/toast';

const criteriaList = [
  { id: 'skill', label: 'Yetenek', icon: Trophy, color: 'text-blue-500' },
  { id: 'teamwork', label: 'Takım Oyunu', icon: Users, color: 'text-green-500' },
  { id: 'sportsmanship', label: 'Sportmenlik', icon: Heart, color: 'text-red-500' },
  { id: 'punctuality', label: 'Dakiklik', icon: Clock, color: 'text-purple-500' }
];

const RatePlayersModal = ({ isOpen, onClose, match, currentUser }) => {
  const [playerRatings, setPlayerRatings] = useState({}); // { [userId]: { skill: 0, teamwork: 0, ... } }
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !match) return null;

  const handleRatingChange = (userId, criterionId, value) => {
    setPlayerRatings(prev => ({
      ...prev,
      [userId]: {
        ...(prev[userId] || { skill: 0, teamwork: 0, sportsmanship: 0, punctuality: 0 }),
        [criterionId]: value
      }
    }));
  };

  const handleSubmit = async () => {
    const playersToRate = match.participantsDetails?.filter(p => p.uid !== currentUser.uid) || [];
    
    // Check if at least one player has all criteria rated
    const ratingsToSubmit = [];
    for (const player of playersToRate) {
      const pId = player.uid || player.id;
      const pRating = playerRatings[pId];
      
      if (pRating && (pRating.skill > 0 || pRating.teamwork > 0 || pRating.sportsmanship > 0 || pRating.punctuality > 0)) {
        // Calculate an overall for this specific review
        const values = [pRating.skill, pRating.teamwork, pRating.sportsmanship, pRating.punctuality].filter(v => v > 0);
        const overallRating = values.reduce((a, b) => a + b, 0) / values.length;

        ratingsToSubmit.push({
          userId: pId,
          criteria: pRating,
          overallRating: Math.round(overallRating * 10) / 10
        });
      }
    }

    if (ratingsToSubmit.length === 0) {
      toast.error("Lütfen en az bir oyuncuyu değerlendirin.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitMatchRatings(match.id, ratingsToSubmit, currentUser.uid);
      if (result.success) {
        toast.success('Değerlendirmeleriniz kaydedildi!');
        onClose();
      } else {
        toast.error(result.error || 'Değerlendirme gönderilemedi.');
      }
    } catch (error) {
      console.error('Rating submission error:', error);
      toast.error('Bir hata oluştu.');
    } finally {
      setSubmitting(false);
    }
  };

  const playersToRate = match.participantsDetails?.filter(p => p.uid !== currentUser.uid) || [];

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h3 className="text-2xl font-bold text-gray-900">Oyuncuları Değerlendir</h3>
            <p className="text-sm text-gray-500 mt-1">Maç bitti! Takım arkadaşlarını puanlayarak gelişimlerine katkıda bulun.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-8">
          {playersToRate.length === 0 ? (
            <div className="text-center py-12">
              <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users size={32} className="text-gray-300" />
              </div>
              <p className="text-gray-500">Bu maçta değerlendirilecek başka oyuncu bulunamadı.</p>
            </div>
          ) : (
            playersToRate.map(player => {
              const pId = player.uid || player.id;
              const pRating = playerRatings[pId] || { skill: 0, teamwork: 0, sportsmanship: 0, punctuality: 0 };
              
              return (
                <div key={pId} className="bg-gray-50/50 rounded-2xl p-5 border border-gray-100 hover:border-green-100 transition-colors">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 rounded-full bg-white border-2 border-white shadow-sm overflow-hidden shrink-0">
                      {player.photoURL ? (
                        <img src={player.photoURL} alt={player.displayName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-green-50 flex items-center justify-center text-green-600 font-bold text-xl">
                          {player.displayName?.[0] || 'O'}
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-lg">{player.displayName}</h4>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                        <span className="px-2 py-0.5 bg-white rounded-full border border-gray-200">
                          {player.position || 'Oyuncu'}
                        </span>
                        <span>•</span>
                        <span>Maç Arkadaşı</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                    {criteriaList.map((criterion) => {
                      const Icon = criterion.icon;
                      return (
                        <div key={criterion.id} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-gray-600 flex items-center gap-1.5 uppercase tracking-wider">
                              <Icon size={14} className={criterion.color} />
                              {criterion.label}
                            </label>
                            <span className="text-xs font-bold text-gray-400">
                              {pRating[criterion.id] > 0 ? `${pRating[criterion.id]}/5` : '-'}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                onClick={() => handleRatingChange(pId, criterion.id, star)}
                                className={`flex-1 h-8 rounded-lg flex items-center justify-center transition-all ${
                                  pRating[criterion.id] >= star
                                    ? 'bg-yellow-400 text-white shadow-sm'
                                    : 'bg-white text-gray-300 border border-gray-200 hover:border-yellow-200 hover:text-yellow-200'
                                }`}
                              >
                                <Star size={18} fill={pRating[criterion.id] >= star ? 'currentColor' : 'none'} />
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 bg-white">
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="flex-1 py-3.5 px-4 bg-gray-100 text-gray-700 rounded-2xl font-bold hover:bg-gray-200 transition-colors"
            >
              Vazgeç
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || playersToRate.length === 0}
              className="flex-[2] py-3.5 px-4 bg-green-600 text-white rounded-2xl font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-200 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>İşleniyor...</span>
                </>
              ) : (
                <>
                  <Check size={20} />
                  <span>Değerlendirmeyi Tamamla</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RatePlayersModal;
