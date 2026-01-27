import React, { useState, useEffect } from 'react';
import {
  Trophy, Calendar, MapPin, Users, Award, ChevronRight, Timer, ArrowRight, Flag, Activity
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getAllTournaments } from '../services/firestoreService';
import { useAuth } from '../contexts/AuthContext';

const Turnuvalar = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [filter, setFilter] = useState('ALL');
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    try {
      setLoading(true);
      // Fetch all active/relevant tournaments. 
      // Optimization: In a real large app, you'd filter by status in the query itself.
      // For now, fetching all and filtering client-side or fetching 'ongoing'/'registration_open'.
      const result = await getAllTournaments({});
      if (result.success) {
        setTournaments(result.data);
      }
    } catch (error) {
      console.error('Turnuvalar yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'registration_open':
        return <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1"><Timer size={12} /> Kayıtlar Açık</span>;
      case 'ongoing':
        return <span className="bg-orange-100 text-orange-700 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1"><Activity size={12} /> Devam Ediyor</span>;
      case 'completed':
        return <span className="bg-gray-100 text-gray-600 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1"><Award size={12} /> Tamamlandı</span>;
      default:
        return <span className="bg-gray-100 text-gray-600 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1"><Flag size={12} /> {status}</span>;
    }
  };

  const filteredEvents = filter === 'ALL'
    ? tournaments
    : tournaments.filter(t => t.status === filter);

  // Helper to safely format dates
  const formatDate = (dateVal) => {
    if (!dateVal) return '';
    // Handle Firestore Timestamp
    if (dateVal.toDate) return dateVal.toDate().toLocaleDateString('tr-TR');
    // Handle string/date
    return new Date(dateVal).toLocaleDateString('tr-TR');
  };

  return (
    <>
      {/* Hero Header */}
      <div className="bg-white text-gray-900 pt-24 pb-20 relative overflow-hidden border-b border-gray-100">
        <div className="absolute top-0 right-0 w-96 h-96 bg-green-600/20 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-orange-500/20 rounded-full blur-3xl -ml-10 -mb-10"></div>

        <div className="container mx-auto px-4 relative z-10 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">Spor Etkinlikleri & Turnuvalar 🎉</h1>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto mb-8">
            İster profesyonel turnuvalara katıl, ister sosyal etkinliklerde yer al.
          </p>
          <div className="flex justify-center gap-4">
            <button onClick={() => document.getElementById('list')?.scrollIntoView({ behavior: 'smooth' })} className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-green-900/50">
              Etkinlik Bul
            </button>
            <button 
              onClick={() => currentUser ? navigate('/panel/saha-sahibi') : navigate('/saha-sahibi-login')} 
              className="bg-gray-100 hover:bg-gray-200 text-gray-900 px-6 py-3 rounded-xl font-bold transition-all border border-gray-200"
            >
              Etkinlik Oluştur
            </button>
          </div>
        </div>
      </div>

      <div id="list" className="bg-gray-50 min-h-screen py-12">
        <div className="container mx-auto px-4 max-w-screen-xl">

          {/* Filters */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all ${filter === 'ALL' ? 'bg-[#1A1A1A] text-white shadow-lg' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
            >
              Tümü
            </button>
            <button
              onClick={() => setFilter('registration_open')}
              className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all ${filter === 'registration_open' ? 'bg-green-600 text-white shadow-lg shadow-green-200' : 'bg-white text-gray-600 hover:bg-green-50'}`}
            >
              Kayıtlar Açık
            </button>
            <button
              onClick={() => setFilter('ongoing')}
              className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all ${filter === 'ongoing' ? 'bg-orange-500 text-white shadow-lg shadow-orange-200' : 'bg-white text-gray-600 hover:bg-orange-50'}`}
            >
              Devam Edenler
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all ${filter === 'completed' ? 'bg-gray-800 text-white shadow-lg' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
            >
              Tamamlananlar
            </button>
          </div>

          {/* Event Grid */}
          {loading ? (
             <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
             </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
              {filteredEvents.length > 0 ? filteredEvents.map((event) => (
                <article key={event.id} className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden flex flex-col group h-full">
                  {/* Image & Status */}
                  <div className="relative h-48 overflow-hidden bg-gray-200">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10"></div>
                    {event.image ? (
                        <img src={event.image} alt={event.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100">
                            <Trophy className="w-16 h-16 text-gray-300" />
                        </div>
                    )}
                    
                    <div className="absolute top-4 left-4 z-20">
                      {getStatusBadge(event.status)}
                    </div>
                    <div className="absolute top-4 right-4 z-20 bg-white/90 backdrop-blur px-2 py-1 rounded text-xs font-bold text-gray-900 flex items-center gap-1 shadow-sm">
                      {event.sportType || 'Spor'}
                    </div>
                    <div className="absolute bottom-4 left-4 z-20 text-white">
                      <div className="text-xs opacity-90 mb-1">{event.organizerName || 'Organizasyon'}</div>
                      <h3 className="text-xl font-bold leading-tight line-clamp-2">{event.name}</h3>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="p-6 flex-grow flex flex-col">
                    <div className="space-y-3 mb-6">
                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <Calendar size={18} className="text-green-600" />
                        <span className="font-medium">{formatDate(event.startDate)}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <MapPin size={18} className="text-green-600" />
                        <span className="line-clamp-1">{event.location || 'Online / Belirtilmemiş'}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <Trophy size={18} className="text-yellow-500" />
                        <span className="font-bold text-[#1A1A1A]">{event.prizePool ? `${event.prizePool} ₺` : 'Kupa'}</span>
                      </div>
                    </div>

                    {/* Progress Bar for Registration */}
                    {event.status === 'registration_open' && (
                      <div className="mb-6">
                        <div className="flex justify-between text-xs font-bold mb-2">
                          <span className="text-gray-500">Katılımcı</span>
                          <span className="text-green-600">
                              {event.type === 'team' 
                                ? `${event.registeredTeams || 0}/${event.maxTeams || 0}` // Assuming registeredTeams field exists or needs calculation
                                : `${event.registeredParticipants || 0}/${event.maxParticipants || 0}`
                              }
                          </span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-600 rounded-full transition-all duration-1000"
                            style={{ 
                                width: `${Math.min(100, Math.max(5,
                                    event.type === 'team' 
                                    ? ((event.registeredTeams || 0) / (event.maxTeams || 1)) * 100
                                    : ((event.registeredParticipants || 0) / (event.maxParticipants || 1)) * 100
                                ))}%` 
                            }}
                          ></div>
                        </div>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between">
                      <div>
                        <span className="block text-xs text-gray-400">Ücret</span>
                        <span className="font-bold text-[#1A1A1A]">{event.registrationFee ? `${event.registrationFee} ₺` : 'Ücretsiz'}</span>
                      </div>
                      {event.status === 'registration_open' ? (
                        <button 
                            onClick={() => navigate(currentUser ? '/oyuncu/turnuvalar' : '/login')}
                            className="bg-gray-900 hover:bg-black text-white px-5 py-2 rounded-lg text-sm font-bold transition-colors shadow-lg active:scale-95"
                        >
                          Katıl
                        </button>
                      ) : (
                        <button 
                            onClick={() => navigate(currentUser ? '/oyuncu/turnuvalar' : '/login')} // Redirect to panel to see details or archive
                            className="text-gray-500 hover:text-gray-900 font-bold text-sm flex items-center gap-1"
                        >
                          Detaylar <ChevronRight size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              )) : (
                <div className="col-span-full text-center py-12">
                   <p className="text-gray-500 text-lg">Bu kategoride henüz turnuva bulunmuyor.</p>
                </div>
              )}
            </div>
          )}

          {/* CTA Banner */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-8 md:p-12 text-white relative overflow-hidden shadow-xl">
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold mb-2">Etkinlik Düzenle</h2>
                <p className="text-blue-100 max-w-lg">
                  Kendi turnuvanı düzenlemek mi istiyorsun? Tesisini turnuvalara aç veya bağımsız organizasyon yap.
                </p>
              </div>
              <button 
                onClick={() => navigate('/saha-sahibi-login')}
                className="bg-white text-blue-600 px-8 py-3 rounded-xl font-bold hover:bg-gray-50 transition-colors shadow-lg active:scale-95 flex items-center gap-2"
              >
                Organizasyon Başlat <ArrowRight size={18} />
              </button>
            </div>
            {/* Decorative */}
            <div className="absolute -right-10 -bottom-20 opacity-10 transform rotate-12">
              <Trophy size={200} />
            </div>
          </div>

        </div>
      </div>
    </>
  );
};

export default Turnuvalar;
