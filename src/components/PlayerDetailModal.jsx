import React from 'react';
import { X, MapPin, Star, Calendar, MessageCircle, UserPlus, Shield, Activity, User } from 'lucide-react';
import toast from '../utils/toast';

const getLevelText = (level) => {
    switch (level) {
      case 'beginner': return 'Başlangıç';
      case 'intermediate': return 'Orta';
      case 'good': return 'İyi';
      case 'advanced': return 'İleri';
      case 'pro': return 'Profesyonel';
      default: return level || '-';
    }
};

const PlayerDetailModal = ({ isOpen, onClose, player, currentUser }) => {
  if (!isOpen || !player) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-white/90 backdrop-blur-sm rounded-full text-gray-600 hover:text-gray-900 z-10 hover:bg-gray-100 transition-colors shadow-sm"
        >
          <X size={20} />
        </button>

        {/* Header / Cover */}
        <div className="h-48 bg-gradient-to-r from-green-600 to-green-800 relative">
          <div className="absolute -bottom-16 left-8 flex items-end">
            <div className="w-32 h-32 rounded-full border-4 border-white bg-gray-200 overflow-hidden shadow-lg">
              {player.profilePhoto?.url ? (
                <img
                  src={player.profilePhoto.url}
                  alt={player.displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                  <User size={64} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="pt-20 px-8 pb-8">
          {/* Main Info */}
          <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{player.displayName}</h2>
              <div className="flex items-center gap-2 text-gray-600 mt-1">
                <MapPin size={16} />
                <span>{player.city}{player.district ? `, ${player.district}` : ''}</span>
                {player.distance && (
                   <span className="text-sm bg-gray-100 px-2 py-0.5 rounded-full">
                     {Math.round(player.distance)} km
                   </span>
                )}
              </div>
            </div>

            <div className="flex gap-2 w-full md:w-auto">
              <button 
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all font-medium shadow-sm hover:shadow-md"
                onClick={() => {
                  if (onClose) onClose();
                  window.location.href = `/oyuncu/mesajlar?userId=${player.uid || player.id}`;
                }}
              >
                <MessageCircle size={18} />
                <span>Mesaj Gönder</span>
              </button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gray-50 p-4 rounded-xl text-center">
              <Shield className="w-6 h-6 text-green-600 mx-auto mb-2" />
              <div className="text-sm text-gray-500 mb-1">Mevki</div>
              <div className="font-semibold text-gray-900">{player.position || '-'}</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl text-center">
              <Star className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
              <div className="text-sm text-gray-500 mb-1">Seviye</div>
              <div className="font-semibold text-gray-900">{getLevelText(player.skillLevel)}</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl text-center">
              <Activity className="w-6 h-6 text-blue-600 mx-auto mb-2" />
              <div className="text-sm text-gray-500 mb-1">Maç Sayısı</div>
              <div className="font-semibold text-gray-900">{player.playedMatches || 0}</div>
            </div>
             <div className="bg-gray-50 p-4 rounded-xl text-center">
              <Calendar className="w-6 h-6 text-purple-600 mx-auto mb-2" />
              <div className="text-sm text-gray-500 mb-1">Yaş</div>
              <div className="font-semibold text-gray-900">{player.age || '-'}</div>
            </div>
          </div>

          {/* Bio */}
          {player.bio && (
            <div className="mb-8">
              <h3 className="font-semibold text-gray-900 mb-3">Hakkında</h3>
              <p className="text-gray-600 leading-relaxed bg-gray-50 p-4 rounded-xl">
                {player.bio}
              </p>
            </div>
          )}

          {/* Sports Preferences */}
          {player.sportPreferences && player.sportPreferences.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Spor Tercihleri</h3>
              <div className="flex flex-wrap gap-2">
                {player.sportPreferences.map((pref, idx) => (
                  <div key={idx} className="bg-white border border-gray-200 px-3 py-1.5 rounded-lg text-sm flex items-center gap-2">
                    <span className="font-medium text-gray-700">{pref.sport}</span>
                    <span className="text-gray-400">•</span>
                    <span className="text-gray-600">{pref.position}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
        </div>
      </div>
    </div>
  );
};

export default PlayerDetailModal;
