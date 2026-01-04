import React, { useState, useEffect } from 'react';
import { Check, X, AlertCircle, Clock } from 'lucide-react';
import { submitMatchScore, getTournamentMatch } from '../../services/firestoreService';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import toast from '../../utils/toast';

const MatchScoreEntry = ({ match: initialMatch, userId, onScoreSubmitted, canEdit = true, realtime = false }) => {
  const [match, setMatch] = useState(initialMatch);
  const [score1, setScore1] = useState(initialMatch.score1 || 0);
  const [score2, setScore2] = useState(initialMatch.score2 || 0);
  const [submitting, setSubmitting] = useState(false);
  const [userScoreEntry, setUserScoreEntry] = useState(null);

  // Real-time maç güncellemeleri
  useEffect(() => {
    if (realtime && match.id) {
      const matchDocRef = doc(db, 'tournamentMatches', match.id);
      const unsubscribe = onSnapshot(matchDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const updatedMatch = { id: docSnap.id, ...docSnap.data() };
          setMatch(updatedMatch);
          
          // Skorları güncelle
          if (updatedMatch.score1 !== null) setScore1(updatedMatch.score1);
          if (updatedMatch.score2 !== null) setScore2(updatedMatch.score2);
          
          // Kullanıcının skor girişini bul
          if (updatedMatch.scoreEntries && updatedMatch.scoreEntries.length > 0) {
            const entry = updatedMatch.scoreEntries.find(e => e.userId === userId);
            if (entry) {
              setUserScoreEntry(entry);
            }
          }
        }
      }, (error) => {
        console.error('Match listener hatası:', error);
      });

      return () => unsubscribe();
    } else {
      setMatch(initialMatch);
    }
  }, [realtime, match.id, userId, initialMatch]);

  // Kullanıcının daha önce skor gönderip göndermediğini kontrol et
  useEffect(() => {
    if (match.scoreEntries && match.scoreEntries.length > 0) {
      const entry = match.scoreEntries.find(e => e.userId === userId);
      if (entry) {
        setUserScoreEntry(entry);
        setScore1(entry.score1);
        setScore2(entry.score2);
      }
    }
  }, [match.scoreEntries, userId]);

  // Skor çakışması var mı kontrol et
  const hasConflict = match.scoreEntries && match.scoreEntries.length >= 2;
  const scoreEntries = match.scoreEntries || [];
  const conflictingScores = scoreEntries.filter(e => 
    e.score1 !== score1 || e.score2 !== score2
  );

  const handleSubmit = async () => {
    if (!canEdit) {
      toast.error('Bu maç için skor gönderme yetkiniz yok');
      return;
    }

    if (match.status === 'completed') {
      toast.error('Bu maç tamamlanmış');
      return;
    }

    try {
      setSubmitting(true);
      const result = await submitMatchScore(match.id, userId, {
        score1: parseInt(score1),
        score2: parseInt(score2)
      });

      if (result.success) {
        if (result.needsVerification) {
          toast.success('Skor gönderildi. Organizatör onayı bekleniyor.');
        } else if (result.verified) {
          toast.success('Skor onaylandı ve kaydedildi');
        } else {
          toast.success('Skor gönderildi');
        }
        
        if (onScoreSubmitted) {
          onScoreSubmitted();
        }
      } else {
        toast.error(result.error || 'Skor gönderilemedi');
      }
    } catch (error) {
      console.error('Skor gönderme hatası:', error);
      toast.error('Skor gönderilirken hata oluştu');
    } finally {
      setSubmitting(false);
    }
  };

  const isUserParticipant = match.participant1Id === userId || match.participant2Id === userId;

  if (!canEdit && !isUserParticipant) {
    return (
      <div className="text-center text-gray-500 py-4">
        <p>Bu maç için skor gönderme yetkiniz yok</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="mb-4">
        <h4 className="font-semibold text-gray-900 mb-2">
          {match.participant1Name} vs {match.participant2Name}
        </h4>
        {match.status === 'completed' && match.score1 !== null && match.score2 !== null && (
          <div className="text-sm text-gray-600">
            Final Skor: {match.score1} - {match.score2}
          </div>
        )}
      </div>

      {hasConflict && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-800">
                Skor Çakışması Tespit Edildi
              </p>
              <p className="text-xs text-yellow-700 mt-1">
                Farklı skorlar gönderildi. Organizatör onayı bekleniyor.
              </p>
              {conflictingScores.length > 0 && (
                <div className="mt-2 space-y-1">
                  {conflictingScores.map((entry, idx) => (
                    <div key={idx} className="text-xs text-yellow-700">
                      Gönderilen: {entry.score1} - {entry.score2}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {match.status !== 'completed' && (
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {match.participant1Name} Skoru
            </label>
            <input
              type="number"
              value={score1}
              onChange={(e) => setScore1(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              min="0"
              disabled={!canEdit || submitting}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {match.participant2Name} Skoru
            </label>
            <input
              type="number"
              value={score2}
              onChange={(e) => setScore2(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              min="0"
              disabled={!canEdit || submitting}
            />
          </div>
        </div>
      )}

      {match.status !== 'completed' && canEdit && (
        <div className="flex items-center justify-between">
          {userScoreEntry && (
            <div className="text-sm text-gray-600 flex items-center space-x-2">
              <Clock className="w-4 h-4" />
              <span>Daha önce skor gönderdiniz</span>
            </div>
          )}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="ml-auto px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Gönderiliyor...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>{userScoreEntry ? 'Skoru Güncelle' : 'Skor Gönder'}</span>
              </>
            )}
          </button>
        </div>
      )}

      {scoreEntries.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs font-medium text-gray-700 mb-2">Gönderilen Skorlar</p>
          <div className="space-y-1">
            {scoreEntries.map((entry, idx) => (
              <div key={idx} className="text-xs text-gray-600 flex items-center space-x-2">
                {entry.verified ? (
                  <Check className="w-3 h-3 text-green-600" />
                ) : (
                  <Clock className="w-3 h-3 text-yellow-600" />
                )}
                <span>
                  {entry.score1} - {entry.score2}
                  {entry.userId === userId && ' (Sizin)'}
                  {entry.verified && ' ✓ Onaylandı'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchScoreEntry;

