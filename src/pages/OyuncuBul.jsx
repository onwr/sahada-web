import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getOpenMatches, joinOpenMatch, getAllUsers } from '../services/firestoreService';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import Header from '../components/Header';
import Footer from '../components/Footer';
import MatchAdCard from '../components/MatchAdCard';
import MatchesMap from '../components/MatchesMap';
import { 
  Search, MapPin, Filter, Star, MessageSquare, UserPlus, Users,
  ChevronDown, X, SlidersHorizontal, Trophy, Calendar, Zap, ArrowRight,
  LayoutList, Map
} from 'lucide-react';
import toast from '../utils/toast';

const SPORTS = [
    { value: 'all', label: 'Tüm Sporlar' },
    { value: 'football', label: 'Futbol' },
    { value: 'basketball', label: 'Basketbol' },
    { value: 'tennis', label: 'Tenis' },
    { value: 'volleyball', label: 'Voleybol' },
];

const DATE_OPTIONS = [
    { value: 'all', label: 'Tüm Tarihler' },
    { value: 'today', label: 'Bugün' },
    { value: 'tomorrow', label: 'Yarın' },
    { value: 'weekend', label: 'Bu Hafta Sonu' },
    { value: 'custom', label: 'Tarih Seç...' }
];

const OyuncuBul = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user } = useAuth();
    
    // State from FindPlayer logic
    const initialSearch = searchParams.get('search') || '';
    const [searchTerm, setSearchTerm] = useState(initialSearch);
    const [searchMode, setSearchMode] = useState('name'); 
    const [viewMode, setViewMode] = useState('list');
    const [sortOption, setSortOption] = useState('recommended');
    const [selectedSport, setSelectedSport] = useState('all');
    const [selectedDateFilter, setSelectedDateFilter] = useState('all');
    const [customDate, setCustomDate] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    
    // Data state
    const [matches, setMatches] = useState([]);
    const [players, setPlayers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'match'); // 'match' or 'player'
    
    // Modal state removed as we navigate to detail page now

    useEffect(() => {
        if (activeTab === 'match') {
            setupRealtimeListener();
        } else {
            loadPlayers();
        }
    }, [activeTab]);

    const loadPlayers = async () => {
        setLoading(true);
        try {
            const result = await getAllUsers({ userType: 'player' });
            if (result.success) {
                setPlayers(result.data);
            }
        } catch (error) {
            console.error('Oyuncu yükleme hatası:', error);
        } finally {
            setLoading(false);
        }
    };

    const setupRealtimeListener = () => {
        const matchesRef = collection(db, 'openMatches');
        const q = query(matchesRef, where('status', '==', 'open'));
    
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const matchesData = [];
            snapshot.forEach((doc) => {
                matchesData.push({ id: doc.id, ...doc.data() });
            });
            setMatches(matchesData);
            setLoading(false);
        }, (error) => {
            console.error('Real-time listener hatası:', error);
            setLoading(false);
        });

        return () => unsubscribe();
    };

    const filteredMatches = useMemo(() => {
        let result = matches.filter(match => {
            let matchesSearch = true;
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                if (searchMode === 'name') {
                    // Search in title/tesisName
                    const title = match.tesisName || match.location || '';
                    matchesSearch = title.toLowerCase().includes(term);
                } else {
                    // Search in location
                    const loc = match.location || '';
                    matchesSearch = loc.toLowerCase().includes(term);
                }
            }

            const matchesSport = selectedSport === 'all' || match.format === selectedSport;

            // Date Filter Logic
            let matchesDate = true;
            if (selectedDateFilter !== 'all') {
                const matchDate = match.date?.toDate ? match.date.toDate() : new Date(match.date);
                const today = new Date();
                today.setHours(0,0,0,0);
                
                matchDate.setHours(0,0,0,0);

                if (selectedDateFilter === 'today') {
                   matchesDate = matchDate.getTime() === today.getTime();
                } else if (selectedDateFilter === 'tomorrow') {
                   const tomorrow = new Date(today);
                   tomorrow.setDate(today.getDate() + 1);
                   matchesDate = matchDate.getTime() === tomorrow.getTime();
                } else if (selectedDateFilter === 'custom' && customDate) {
                   const cDate = new Date(customDate);
                   cDate.setHours(0,0,0,0);
                   matchesDate = matchDate.getTime() === cDate.getTime();
                }
                // 'weekend' logic left simple for now or ignored (requires day checking)
            }
            
            // Only future matches
            const mDate = match.date?.toDate ? match.date.toDate() : new Date(match.date);
            const now = new Date();
            now.setHours(0,0,0,0);
            if (mDate < now) return false;

            return matchesSearch && matchesSport && matchesDate;
        });

        // Sorting
        if (sortOption === 'price_asc') {
            result.sort((a, b) => (a.pricePerPlayer || 0) - (b.pricePerPlayer || 0));
        } else if (sortOption === 'price_desc') {
            result.sort((a, b) => (b.pricePerPlayer || 0) - (a.pricePerPlayer || 0));
        } else if (sortOption === 'rating_desc') {
             // Mock rating or sort by something else 
             // result.sort((a, b) => b.rating - a.rating);
        }
        
        return result;
    }, [searchTerm, searchMode, selectedSport, selectedDateFilter, customDate, sortOption, matches]);

    const filteredPlayers = useMemo(() => {
        if (activeTab !== 'player') return [];
        return players.filter(player => {
            let matchesSearch = true;
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                if (searchMode === 'name') {
                    matchesSearch = (player.fullName || '').toLowerCase().includes(term);
                } else {
                    matchesSearch = (player.city || '').toLowerCase().includes(term) || (player.district || '').toLowerCase().includes(term);
                }
            }
            return matchesSearch;
        });
    }, [players, searchTerm, searchMode, activeTab]);

    const activeFiltersCount = [
        selectedSport !== 'all',
        selectedDateFilter !== 'all',
    ].filter(Boolean).length;

    const clearFilters = () => {
        setSearchTerm('');
        setSearchMode('name');
        setSelectedSport('all');
        setSelectedDateFilter('all');
        setCustomDate('');
    };

    const handleMatchClick = (match) => {
        if (match.type === 'profile_click') {
            navigate(`/oyuncu-detay/${match.organizerId}`);
        } else {
            navigate(`/mac-detay/${match.id}`);
        }
    };
    
    const formatDate = (date) => {
        if (!date) return '';
        const d = date?.toDate ? date.toDate() : new Date(date);
        return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
    };

    const getMissingPlayers = (match) => {
        return (match.maxPlayers || 0) - (match.currentPlayers || 0);
    };

    return (
        <div className="bg-gray-50 min-h-screen">
            <Header />

            {/* Banner Section */}
            <div className="bg-gradient-to-r from-green-600 to-green-700 text-white py-12">
                <div className="container mx-auto px-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <h1 className="text-3xl font-black mb-2">
                                {activeTab === 'match' ? 'Oyuncu Arayan İlanlar' : 'Oyuncu Havuzu'}
                            </h1>
                            <p className="text-green-100">
                                {activeTab === 'match' ? 'Maçlar için eksik oyuncu arayanların ilanları' : 'Takımına yetenekli oyuncular transfer et veya keşfet'}
                            </p>
                        </div>
                        
                        {/* Tab Switcher */}
                        <div className="flex bg-white/10 backdrop-blur-md p-1 rounded-2xl border border-white/20">
                            <button
                                onClick={() => setActiveTab('match')}
                                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'match' ? 'bg-white text-green-700 shadow-lg' : 'text-white hover:bg-white/10'}`}
                            >
                                <div className="flex items-center gap-2">
                                    <Zap size={16} />
                                    <span>Maç İlanları</span>
                                </div>
                            </button>
                            <button
                                onClick={() => setActiveTab('player')}
                                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'player' ? 'bg-white text-green-700 shadow-lg' : 'text-white hover:bg-white/10'}`}
                            >
                                <div className="flex items-center gap-2">
                                    <UserPlus size={16} />
                                    <span>Oyuncu Havuzu</span>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8">
                {/* Search and Filter Bar */}
                <div className="bg-white rounded-2xl shadow-lg p-4 mb-8 -mt-16 relative z-10">
                    <div className="flex flex-col lg:flex-row gap-4">
                        {/* Search Input with Mode */}
                        <div className="flex-1 relative flex items-center bg-white border border-gray-200 rounded-xl focus-within:ring-2 focus-within:ring-green-500/20 overflow-hidden">
                            <div className="relative border-r border-gray-100">
                                <select
                                    value={searchMode}
                                    onChange={(e) => setSearchMode(e.target.value)}
                                    className="appearance-none bg-gray-50 text-gray-700 font-medium py-3 pl-4 pr-8 focus:outline-none cursor-pointer hover:bg-gray-100 transition-colors h-full"
                                >
                                    <option value="name">Maç Adı</option>
                                    <option value="location">Konum</option>
                                </select>
                                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
                            </div>
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                <input
                                    type="text"
                                    placeholder={activeTab === 'match' 
                                        ? (searchMode === 'name' ? "Maç adı ara..." : "İlçe veya şehir ara...")
                                        : (searchMode === 'name' ? "Oyuncu ismi ara..." : "İlçe veya şehir ara...")
                                    }
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 focus:outline-none text-gray-900 placeholder:text-gray-400"
                                />
                            </div>
                        </div>

                        {/* Quick Filters */}
                        {activeTab === 'match' ? (
                            <div className="flex gap-3 flex-wrap lg:flex-nowrap">
                                {/* Sport */}
                                <div className="relative">
                                    <select
                                        value={selectedSport}
                                        onChange={(e) => setSelectedSport(e.target.value)}
                                        className="appearance-none bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 pr-10 text-sm font-medium text-gray-700 focus:outline-none cursor-pointer"
                                    >
                                        {SPORTS.map(sport => (
                                            <option key={sport.value} value={sport.value}>{sport.label}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                                </div>

                                {/* Date Filter */}
                                <div className="relative flex items-center gap-2">
                                    <div className="relative">
                                        <select
                                            value={selectedDateFilter}
                                            onChange={(e) => setSelectedDateFilter(e.target.value)}
                                            className="appearance-none bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 pr-10 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500/20 cursor-pointer"
                                        >
                                            {DATE_OPTIONS.map(opt => (
                                                <option key={opt.value} value={opt.value}>📅 {opt.label}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                                    </div>
                                    {selectedDateFilter === 'custom' && (
                                        <input
                                            type="date"
                                            value={customDate}
                                            onChange={(e) => setCustomDate(e.target.value)}
                                            className="bg-white border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20"
                                        />
                                    )}
                                </div>

                                {/* More Filters */}
                                <button
                                    onClick={() => setShowFilters(!showFilters)}
                                    className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-colors ${showFilters || activeFiltersCount > 0
                                        ? 'bg-green-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    <SlidersHorizontal size={18} />
                                    Filtreler
                                </button>
                                {activeFiltersCount > 0 && (
                                    <button onClick={clearFilters} className="text-red-500 font-medium text-sm">Temizle</button>
                                )}
                            </div>
                        ) : (
                            <div className="flex gap-3">
                                <button
                                    className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-200 transition-colors"
                                >
                                    <Filter size={18} />
                                    <span>Gelişmiş Filtreler</span>
                                </button>
                                {searchTerm && (
                                    <button onClick={() => setSearchTerm('')} className="text-red-500 font-medium text-sm">Temizle</button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Results Count & View Toggles */}
                <div className="flex justify-between items-center mb-6">
                    <p className="text-gray-600">
                        <span className="font-bold text-gray-900">
                            {activeTab === 'match' ? filteredMatches.length : filteredPlayers.length}
                        </span> {activeTab === 'match' ? 'ilan' : 'oyuncu'} bulundu
                    </p>
                    <div className="flex gap-2">
                        {activeTab === 'match' && (
                            <div className="bg-gray-100 p-1 rounded-lg flex items-center mr-2">
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow text-green-600' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    <LayoutList size={18} />
                                </button>
                                <button
                                    onClick={() => setViewMode('map')}
                                    className={`p-1.5 rounded-md transition-all ${viewMode === 'map' ? 'bg-white shadow text-green-600' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    <Map size={18} />
                                </button>
                            </div>
                        )}
                        <button
                            onClick={() => setSortOption('recommended')}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${sortOption === 'recommended' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        >
                            Önerilen
                        </button>
                        {activeTab === 'match' && (
                            <button
                                onClick={() => setSortOption(sortOption === 'price_asc' ? 'price_desc' : 'price_asc')}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${sortOption.includes('price') ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                            >
                                Fiyat {sortOption === 'price_asc' ? '↑' : sortOption === 'price_desc' ? '↓' : '↕'}
                            </button>
                        )}
                    </div>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-gray-500 font-medium">Veriler yükleniyor...</p>
                    </div>
                ) : activeTab === 'match' ? (
                    viewMode === 'map' ? (
                        <MatchesMap matches={filteredMatches} onJoin={handleMatchClick} />
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredMatches.length > 0 ? filteredMatches.map((match) => (
                                <MatchAdCard key={match.id} match={match} onJoin={handleMatchClick} />
                            )) : (
                                <div className="col-span-full text-center py-16">
                                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Search size={40} className="text-gray-300" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-2">İlan bulunamadı</h3>
                                    <p className="text-gray-500 mb-4">Filtrelerinizi değiştirin</p>
                                    <button onClick={clearFilters} className="px-6 py-2 bg-green-600 text-white rounded-lg font-bold">
                                        Filtreleri Temizle
                                    </button>
                                </div>
                            )}
                        </div>
                    )
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredPlayers.length > 0 ? filteredPlayers.map((player) => (
                            <div 
                                key={player.id} 
                                className="group bg-white rounded-3xl border border-gray-100 overflow-hidden hover:border-green-500/30 hover:shadow-2xl transition-all duration-300 p-6 flex flex-col items-center text-center relative"
                            >
                                <div className="absolute top-4 right-4 bg-green-50 text-green-600 text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-wider">
                                    {player.level || 'Amatör'}
                                </div>
                                
                                <div 
                                    className="relative mb-4 cursor-pointer pt-4"
                                    onClick={() => navigate(`/oyuncu-detay/${player.slug || player.id}`)}
                                >
                                    <div className="w-24 h-24 rounded-full border-4 border-white shadow-xl overflow-hidden bg-gray-100 group-hover:scale-105 transition-transform duration-300">
                                        <img 
                                            src={player.photoURL || player.profilePhoto?.url || `https://ui-avatars.com/api/?name=${player.fullName || 'User'}&background=random`} 
                                            alt={player.fullName} 
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div className="absolute bottom-1 right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-md">
                                        <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse border-2 border-white"></div>
                                    </div>
                                </div>

                                <h3 
                                    className="text-lg font-bold text-gray-900 mb-1 cursor-pointer hover:text-green-600 transition-colors"
                                    onClick={() => navigate(`/oyuncu-detay/${player.slug || player.id}`)}
                                >
                                    {player.fullName || 'İsimsiz Oyuncu'}
                                </h3>
                                
                                <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-4">
                                    <MapPin size={12} className="text-gray-400" />
                                    <span>{player.district || player.city || 'İstanbul'}</span>
                                </div>

                                <div className="grid grid-cols-2 gap-2 w-full mb-6">
                                    <div className="bg-gray-50 rounded-2xl p-2.5">
                                        <div className="text-[10px] text-gray-400 uppercase font-black tracking-tighter mb-0.5">Pozisyon</div>
                                        <div className="text-xs font-bold text-gray-900">{player.position || 'Ortasaha'}</div>
                                    </div>
                                    <div className="bg-gray-50 rounded-2xl p-2.5">
                                        <div className="text-[10px] text-gray-400 uppercase font-black tracking-tighter mb-0.5">Müsaitlik</div>
                                        <div className="text-xs font-bold text-green-600">{player.availability || 'Hafta içi'}</div>
                                    </div>
                                </div>

                                <div className="flex gap-2 w-full">
                                    <button 
                                        onClick={() => navigate(`/oyuncu-detay/${player.slug || player.id}`)}
                                        className="flex-1 px-4 py-2.5 bg-gray-900 text-white rounded-xl text-xs font-black hover:bg-black transition-all transform active:scale-95"
                                    >
                                        Profil
                                    </button>
                                    <button 
                                        onClick={() => {
                                            if(!user) {
                                                toast.error('Mesaj göndermek için giriş yapmalısınız');
                                                navigate('/login', { state: { from: `/oyuncu/mesajlar?userId=${player.id}` } });
                                            } else {
                                                const basePath = user.userType === 'owner' ? '/saha-sahibi' : '/oyuncu';
                                                navigate(`${basePath}/mesajlar?userId=${player.id}`);
                                            }
                                        }}
                                        className="p-2.5 bg-green-50 text-green-600 rounded-xl hover:bg-green-600 hover:text-white transition-all transform active:scale-95"
                                    >
                                        <MessageSquare size={20} />
                                    </button>
                                </div>
                            </div>
                        )) : (
                            <div className="col-span-full text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                                <Users size={40} className="mx-auto text-gray-300 mb-4" />
                                <h3 className="text-lg font-bold text-gray-900">Oyuncu bulunamadı</h3>
                                <p className="text-gray-500 text-sm">Farklı bir isim veya konum deneyin</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <Footer />
        </div>
    );
};

export default OyuncuBul;

