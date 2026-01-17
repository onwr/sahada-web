import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Star, MapPin, Users, Heart, ArrowRight, Loader2, Filter, Clock, ChevronRight, UserPlus, Zap, ShoppingBag, MessageSquare } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { getYakinTesisler, getUserOpenMatchesList, getOpenMatches, requestJoinMatch, getAllUsers } from '../services/firestoreService';
import MatchAdCard from './MatchAdCard';
import MatchDetailModal from './MatchDetailModal';
import { useAuth } from '../contexts/AuthContext';






// Mock Data for Player Ads
const MOCK_PLAYER_ADS = [
    {
        id: 1,
        player: { name: 'Emre B.', avatar: 'https://ui-avatars.com/api/?name=Emre+Belozoglu&background=random' },
        position: 'Orta Saha',
        level: 'Profesyonel',
        location: 'Kadıköy',
        availability: 'Hafta içi akşam'
    },
    {
        id: 2,
        player: { name: 'Volkan D.', avatar: 'https://ui-avatars.com/api/?name=Volkan+Demirel&background=random' },
        position: 'Kaleci',
        level: 'Amatör',
        location: 'Kartal',
        availability: 'Hafta sonu'
    }
];

// Mock Data for Forum
const MOCK_FORUM_POSTS = [
    {
        id: 1,
        authorName: 'Mehmet T.',
        authorAvatar: null,
        category: 'Taktik',
        title: 'Halı sahada kondisyon arttırma teknikleri nelerdir?'
    },
    {
        id: 2,
        authorName: 'Ali K.',
        authorAvatar: null,
        category: 'Ekipman',
        title: 'Hangi kramponu tercih etmeliyim? Nike mı Adidas mı?'
    }
];

const YakinTesisler = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  
  // States
  const [facilities, setFacilities] = useState([]);
  const [urgentMatches, setUrgentMatches] = useState([]);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [loadingFacilities, setLoadingFacilities] = useState(true);
  const [playerAds, setPlayerAds] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);

  // Load Data
  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    // 1. Load Facilities
    try {
      setLoadingFacilities(true);
      const facResult = await getYakinTesisler();
      if (facResult.success) {
        setFacilities(facResult.data.slice(0, 4));
      } else {
        setFacilities([]); 
      }
    } catch (err) {
      console.error('Tesis yükleme hatası:', err);
    } finally {
      setLoadingFacilities(false);
    }

    // 2. Load Urgent Matches (Dynamic)
    try {
      setLoadingMatches(true);
      const matchResult = await getOpenMatches();

      if (matchResult.success) {
        // Map Firestore data to component props
        const dynamicMatches = matchResult.data
          .map(m => {
             // Calculate missing players if not exists
             const missing = m.missingPlayers !== undefined 
                ? m.missingPlayers 
                : (m.maxPlayers || 0) - (m.currentPlayers || 0);
             
             return { ...m, calculatedMissing: missing };
          })
          .filter(m => m.calculatedMissing > 0 && m.status === 'open')
          .slice(0, 6);
          
        setUrgentMatches(dynamicMatches.length > 0 ? dynamicMatches : []);
      } else {
        setUrgentMatches([]);
      }
    } catch (err) {
      console.error('Maç yükleme hatası:', err);
      setUrgentMatches([]);
    } finally {
      setLoadingMatches(false);
    }



    // 4. Load Players (Dynamic - using Users for now as Ads)
    try {
        const usersResult = await getAllUsers();
        if (usersResult.success) {
            const ads = usersResult.data
                .filter(u => u.role === 'player' || u.userType === 'player' || !u.role) // Sadece oyuncular
                .slice(0, 5) // Son 5 oyuncu
                .map(u => ({
                    id: u.id,
                    player: { 
                        name: u.fullName || 'İsimsiz Oyuncu', 
                        avatar: u.photoURL || `https://ui-avatars.com/api/?name=${u.fullName || 'User'}&background=random` 
                    },
                    position: u.position || 'Belirtilmedi',
                    level: u.level || 'Amatör',
                    location: u.district || u.city || 'İstanbul',
                    availability: u.availability || 'Müsait'
                }));
            setPlayerAds(ads);
        }
    } catch (err) {
        console.error("Oyuncu yükleme hatası:", err);
    }
  };

  const handleFacilityClick = (facilityId) => {
    navigate(`/saha-detay/${facilityId}`);
  };

  const handleJoinMatch = (match) => {
     navigate(`/mac-detay/${match.id}`);
  };

  const handleCreateAdClick = () => {
      if(currentUser) navigate('/oyuncu/dashboard'); else navigate('/login');
  };

  return (
    <>
      {/* 1. SECTION: QUICK CATEGORIES */}
      <section className="border-y border-gray-100 bg-gray-50/50 py-6 overflow-x-auto hide-scrollbar">
          <div className="container mx-auto px-4">
              <div className="flex md:justify-center gap-4 min-w-max">
                  {[
                      { icon: '⚽', name: 'Futbol', count: '320 Saha' },
                      { icon: '🏀', name: 'Basketbol', count: '145 Saha' },
                      { icon: '🎾', name: 'Tenis', count: '80 Kort' },
                      { icon: '🏐', name: 'Voleybol', count: '45 Salon' },
                      { icon: '🏊', name: 'Yüzme', count: '20 Havuz' },
                  ].map((cat, i) => (
                      <button key={i} className="flex items-center gap-3 bg-white px-6 py-3.5 rounded-2xl border border-gray-200 hover:border-green-500 hover:shadow-lg hover:-translate-y-0.5 transition-all group min-w-[160px]">
                          <span className="text-3xl group-hover:scale-110 transition-transform filter drop-shadow-sm">{cat.icon}</span>
                          <div className="text-left">
                              <div className="text-sm font-bold text-gray-900 leading-tight">{cat.name}</div>
                              <div className="text-[10px] text-gray-400 font-medium mt-0.5">{cat.count}</div>
                          </div>
                      </button>
                  ))}
              </div>
          </div>
      </section>

      {/* 2. SECTION: URGENT MATCHES (LIVE) */}
      <section className="py-16 bg-gradient-to-b from-gray-50 to-white relative overflow-hidden">
        {/* Background blobs */}
        <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-green-50/50 to-transparent skew-x-12 opacity-50 pointer-events-none"></div>
        <div className="container mx-auto px-4 relative z-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-10 gap-4">
                <div>
                    <div className="inline-flex items-center gap-2 mb-3 bg-white px-3 py-1 rounded-full shadow-sm border border-gray-100">
                        <div className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                        </div>
                        <span className="text-xs font-bold text-red-500 uppercase tracking-wider">CANLI AKIŞ</span>
                        <div className="w-px h-3 bg-gray-200 mx-1"></div>
                        <span className="text-xs text-gray-500 font-medium">{urgentMatches.length} aktif ilan</span>
                    </div>
                    <h2 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">Acil Oyuncu Aranıyor</h2>
                    <p className="text-gray-500 mt-2 text-base max-w-2xl">Oyuncular tarafından oluşturulan aktif maç ilanları. Eksik kadroları tamamla, maça dahil ol.</p>
                </div>
                <Link
                    to="/oyuncu-bul"
                    className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:border-green-500 hover:text-green-600 transition-all shadow-sm hover:shadow-md group"
                >
                    Tüm İlanları Gör
                    <ChevronRight size={16} className="text-gray-400 group-hover:text-green-500 transition-colors" />
                </Link>
            </div>

            {/* Match Cards Grid */}
            {loadingMatches ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 size={40} className="animate-spin text-green-500" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {urgentMatches.map((match) => (
                        <div className="h-full" key={match.id}>
                            <MatchAdCard match={match} onJoin={handleJoinMatch} />
                        </div>
                    ))}
                </div>
            )}

            {/* CTA - Create Match Ad */}
            <div className="mt-8 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
                <div className="flex items-center gap-5">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm border border-green-100">
                        <UserPlus size={24} className="text-green-600" />
                    </div>
                    <div className="text-center md:text-left">
                        <h3 className="text-base font-bold text-gray-900 leading-tight mb-1">
                            Sen de Oyuncu mu Arıyorsun?
                        </h3>
                        <p className="text-sm text-gray-600">
                            Ücretsiz maç ilanı oluştur, eksik oyuncuları hemen bul. Binlerce oyuncuya anında ulaş.
                        </p>
                    </div>
                </div>
                <Link
                    to={currentUser ? "/oyuncu/mac-olustur" : "/login"}
                    className="flex-shrink-0 inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-green-200 hover:shadow-green-300 transform hover:-translate-y-0.5"
                >
                    <Zap size={16} className="fill-current" />
                    Hemen İlan Oluştur
                </Link>
            </div>
        </div>
      </section>

      {/* 3. SECTION: FEATURED FACILITIES */}
      <section className="py-20 bg-white">
          <div className="container mx-auto px-4">
              <div className="flex justify-between items-end mb-10">
                  <div>
                      <h2 className="text-3xl font-black text-gray-900 mb-2">Popüler Sahalar</h2>
                      <p className="text-gray-500">Kullanıcı puanlarına göre şehrin en iyi tesisleri.</p>
                  </div>
                  <div className="hidden md:flex gap-2">
                      <button className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-900 hover:bg-gray-50 flex items-center gap-2"><Filter size={14} /> Filtrele</button>
                      <button onClick={() => navigate('/yakin-sahalar')} className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-bold hover:bg-black flex items-center gap-2">Tümü <ArrowRight size={14} /></button>
                  </div>
              </div>

              {loadingFacilities ? (
                <div className="flex items-center justify-center py-12">
                   <Loader2 size={32} className="animate-spin text-gray-400" />
                </div>
              ) : facilities.length > 0 ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    {facilities.map((facility, index) => (
                      <div 
                         key={facility.id} 
                         onClick={() => handleFacilityClick(facility.id)}
                         className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden relative cursor-pointer"
                      >
                          {/* Image Section */}
                          <div className="relative h-56 w-full overflow-hidden bg-gray-100">
                             {facility.images && facility.images.length > 0 ? (
                                <img
                                    src={facility.images[0].url || facility.images[0]}
                                    alt={facility.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                             ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-300 bg-gray-200">
                                   <MapPin size={48} />
                                </div>
                             )}
                              
                              {/* Badges Top Left */}
                              <div className="absolute top-4 left-4 flex gap-2">
                                  <span className="bg-blue-500 text-white text-[10px] font-bold px-3 py-1 rounded-full border border-white/20 shadow-sm">
                                      {facility.type}
                                  </span>
                              </div>
                              {/* Heart Icon Top Right */}
                              <button className="absolute top-4 right-4 p-2 rounded-full bg-white/90 text-gray-400 hover:text-red-500 hover:bg-white transition-all shadow-sm backdrop-blur-sm">
                                  <Heart size={18} />
                              </button>
                          </div>

                          {/* Content Section */}
                          <div className="p-5 flex-grow flex flex-col">
                              {/* Title & Rating */}
                              <div className="flex justify-between items-start mb-3">
                                  <h2 className="text-lg font-bold text-gray-900 leading-tight line-clamp-1 group-hover:text-green-600 transition-colors">{facility.name}</h2>
                                  <div className="bg-yellow-400 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1 shrink-0 shadow-sm">
                                      <Star size={12} fill="currentColor" /> {facility.rating}
                                  </div>
                              </div>

                              {/* Location */}
                              <div className="flex items-center gap-2 mb-4">
                                  <MapPin size={14} className="text-gray-400" />
                                  <span className="text-sm text-gray-500 truncate">{facility.district || facility.location}, {facility.city || 'İstanbul'}</span>
                              </div>

                              {/* Quick Info */}
                              <div className="flex gap-4 mb-4 text-xs text-gray-500">
                                  <span className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded">
                                      <Users size={12} className="text-gray-400" />
                                      {facility.capacity || '14'} Kişilik
                                  </span>
                                  <span className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded">
                                      <Clock size={12} className="text-gray-400" />
                                      09:00 - 02:00
                                  </span>
                              </div>

                              {/* Tags */}
                              <div className="flex flex-wrap gap-1.5 mb-4">
                                  {(facility.facilities || ['Duş', 'Otopark', 'Kafe']).slice(0, 3).map((tag, i) => (
                                      <span key={i} className="text-[10px] font-medium bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                          {tag}
                                      </span>
                                  ))}
                              </div>

                              {/* Footer: Price & Button */}
                              <div className="mt-auto flex items-center justify-between pt-4 border-t border-gray-100">
                                  <div>
                                      <span className="text-xl font-black text-green-600">₺{facility.price}</span>
                                      <span className="text-xs text-gray-400 ml-1">/ saat</span>
                                  </div>
                                  <button
                                      className="bg-gray-900 hover:bg-green-600 text-white w-9 h-9 rounded-lg flex items-center justify-center transition-all shadow-sm hover:shadow-green-200"
                                  >
                                      <ArrowRight size={16} />
                                  </button>
                              </div>

                          </div>
                      </div>
                    ))}
                 </div>
              ) : (
                  <div className="text-center py-12 text-gray-500 bg-white rounded-2xl border border-gray-100">
                      Kayıtlı tesis bulunamadı.
                  </div>
              )}
          </div>
      </section>





      {/* 6. SECTION: PLAYER & TEAM FINDER (Including Community) */}
      <section className="py-20 bg-white">
          <div className="container mx-auto px-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">

                  {/* Player Ads (Col 1) */}
                  <div>
                      <div className="flex flex-col mb-6">
                          <div className="flex items-center justify-between mb-2">
                              <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                  <UserPlus className="text-green-600" /> Oyuncu Havuzu
                              </h3>
                              <Link to="/oyuncu-bul" className="text-sm font-bold text-green-600 hover:underline">Tümünü Gör</Link>
                          </div>
                          <p className="text-gray-500 text-sm">Takımına yetenekli oyuncular transfer et veya kendi ilanını oluştur.</p>
                      </div>

                      <div className="space-y-4">
                          {playerAds.length > 0 ? (
                              playerAds.map(ad => (
                                  <div key={ad.id} className="flex items-center gap-4 p-4 rounded-2xl border border-gray-100 hover:border-green-500/30 hover:bg-blue-50/30 transition-colors bg-white shadow-sm">
                                      <div className="relative">
                                          <img src={ad.player.avatar} className="w-14 h-14 rounded-full border-2 border-white shadow-sm" alt="avatar" />
                                          <div className="absolute -bottom-1 -right-1 bg-white text-[10px] font-bold px-1.5 py-0.5 rounded border border-gray-200 shadow-sm">{ad.level}</div>
                                      </div>
                                      <div className="flex-1">
                                          <div className="flex justify-between">
                                              <h4 className="font-bold text-gray-900">{ad.player.name}</h4>
                                              <span className="text-xs font-bold text-green-600 bg-blue-50 px-2 py-0.5 rounded">{ad.position}</span>
                                          </div>
                                          <p className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                                              <MapPin size={12} /> {ad.location}
                                              <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                              <Clock size={12} /> {ad.availability}
                                          </p>
                                      </div>
                                      <button className="p-2 bg-gray-50 rounded-lg text-gray-400 hover:text-green-600 hover:bg-white transition-colors">
                                          <MessageSquare size={18} />
                                      </button>
                                  </div>
                              ))
                          ) : (
                              <div className="text-center py-8 text-gray-400 text-sm">
                                  Henüz oyuncu ilanı yok.
                              </div>
                          )}
                          <div
                              onClick={handleCreateAdClick}
                              className="p-6 rounded-2xl border-2 border-dashed border-gray-200 text-center hover:border-green-500 hover:bg-green-50/50 transition-colors cursor-pointer group"
                          >
                              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2 group-hover:bg-white text-gray-400 group-hover:text-green-600 transition-colors">
                                  <UserPlus size={20} />
                              </div>
                              <span className="font-bold text-gray-400 text-sm group-hover:text-green-600 transition-colors">Sen de İlan Ver</span>
                              <p className="text-[10px] text-gray-300 mt-1">Takımlar seni keşfetsin</p>
                          </div>
                      </div>
                  </div>

                  {/* Community (Col 2) */}
                  <div className="bg-gray-900 rounded-[2rem] p-8 text-white relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-green-500 rounded-full blur-[80px] opacity-20 -mr-10 -mt-10"></div>

                      <div className="relative z-10">
                          <div className="inline-block bg-yellow-500 text-white text-[10px] font-bold px-2 py-1 rounded mb-4">GÜNDEM</div>
                          <h3 className="text-3xl font-black mb-6 leading-tight">Meydan'da Neler<br />Konuşuluyor?</h3>

                          <div className="space-y-4 mb-8">
                              {MOCK_FORUM_POSTS.length > 0 ? (
                                  MOCK_FORUM_POSTS.map(post => (
                                      <div key={post.id} className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                                          <div className="flex items-center gap-3 mb-2">
                                              <img src={post.authorAvatar || `https://ui-avatars.com/api/?name=${post.authorName || 'U'}`} className="w-6 h-6 rounded-full" alt="u" />
                                              <span className="text-xs font-bold text-gray-300">{post.authorName} • {post.category || 'Genel'}</span>
                                          </div>
                                          <p className="font-bold text-sm mb-3 line-clamp-2">{post.title}</p>
                                      </div>
                                  ))
                              ) : (
                                  <div className="text-center text-gray-400 text-xs">Henüz konu yok.</div>
                              )}
                          </div>
                          <Link to="/meydan" className="inline-flex items-center gap-2 bg-white text-gray-900 px-6 py-3 rounded-xl font-bold text-sm hover:bg-gray-100 transition-colors">
                              Tartışmaya Katıl <ArrowRight size={16} />
                          </Link>
                      </div>
                  </div>
              </div>
          </div>
      </section>

      {/* 7. SECTION: INFO / SEO TEXT */}
      <section className="py-20 bg-gray-50 border-t border-gray-200">
          <div className="container mx-auto px-4 text-center max-w-3xl">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Saha Merkezi Nedir?</h2>
              <p className="text-gray-500 leading-relaxed mb-8">
                  Saha Merkezi, spor tutkunlarını, tesis sahiplerini ve organizatörleri tek bir platformda buluşturan Türkiye'nin en kapsamlı spor ekosistemidir.
                  Sadece saha kiralamakla kalmaz, eksik oyuncularınızı tamamlayabilir, rakip takımlar bulabilir veya düzenlenen turnuvalara katılarak şampiyonluk mücadelesi verebilirsiniz.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                  {['Kolay Rezervasyon', 'Oyuncu Eşleştirme', 'Turnuva Yönetimi', 'Takım Profilleri', 'Online Ödeme'].map((tag, i) => (
                      <span key={i} className="text-xs font-bold text-gray-400 border border-gray-200 px-3 py-1.5 rounded-full bg-white">
                          {tag}
                      </span>
                  ))}
              </div>
          </div>
      </section>
      <MatchDetailModal 
        isOpen={!!selectedMatch} 
        onClose={() => setSelectedMatch(null)} 
        match={selectedMatch} 
        currentUser={currentUser} 
      />
    </>
  );
};

export default YakinTesisler;