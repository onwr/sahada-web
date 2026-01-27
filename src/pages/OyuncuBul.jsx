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

const POSITIONS = [
    { value: 'all', label: 'Tüm Mevkiler' },
    { value: 'Kaleci', label: 'Kaleci' },
    { value: 'Defans', label: 'Defans' },
    { value: 'Ortasaha', label: 'Ortasaha' },
    { value: 'Forvet', label: 'Forvet' },
];

const LEVELS = [
    { value: 'all', label: 'Tüm Seviyeler' },
    { value: 'Amatör', label: 'Amatör' },
    { value: 'Yarı Profesyonel', label: 'Yarı Profesyonel' },
    { value: 'Profesyonel', label: 'Profesyonel' },
];

const TIMES = [
    { value: 'all', label: 'Tüm Saatler' },
    { value: 'morning', label: 'Sabah (06:00 - 12:00)' },
    { value: 'afternoon', label: 'Öğle (12:00 - 17:00)' },
    { value: 'evening', label: 'Akşam (17:00 - 23:00)' },
    { value: 'night', label: 'Gece (23:00 - 06:00)' },
];

const OyuncuBul = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user } = useAuth();
    
    // Core Search State
    const initialSearch = searchParams.get('search') || '';
    const [searchTerm, setSearchTerm] = useState(initialSearch);
    const [searchMode, setSearchMode] = useState('combined'); // 'combined' | 'name' | 'location'
    const [viewMode, setViewMode] = useState('list');
    const [sortOption, setSortOption] = useState('recommended');
    const [showFilters, setShowFilters] = useState(false);
    
    // Helper function for Turkish character normalization
    const normalizeSearchText = (text) => {
        if (!text) return '';
        return text
            .toString()
            .replace(/İ/g, 'i')
            .replace(/I/g, 'i')
            .toLowerCase()
            .replace(/ı/g, 'i')
            .replace(/ğ/g, 'g')
            .replace(/ü/g, 'u')
            .replace(/ş/g, 's')
            .replace(/ö/g, 'o')
            .replace(/ç/g, 'c');
    };
    
    // Match Filters
    const [selectedSport, setSelectedSport] = useState('all');
    const [selectedDateFilter, setSelectedDateFilter] = useState('all');
    const [customDate, setCustomDate] = useState('');
    const [priceRange, setPriceRange] = useState({ min: 0, max: 1000 });
    const [selectedTime, setSelectedTime] = useState('all');
    const [missingCount, setMissingCount] = useState('all'); // 'all', '1', '2', '3+'

    // Player Filters
    const [selectedPosition, setSelectedPosition] = useState('all');
    const [selectedLevel, setSelectedLevel] = useState('all');
    const [selectedAvailability, setSelectedAvailability] = useState('all');
    
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
        if (activeTab !== 'match') return [];
        let result = matches.filter(match => {
            // 1. Search Term (Name & Location combined if mode is combined)
            let matchesSearch = true;
            if (searchTerm) {
                const term = normalizeSearchText(searchTerm);
                const title = normalizeSearchText(match.tesisName || '');
                const city = normalizeSearchText(match.city || 'İstanbul');
                const loc = normalizeSearchText(match.location || '');
                const dist = normalizeSearchText(match.district || '');
                
                if (searchMode === 'name') {
                    matchesSearch = title.includes(term);
                } else if (searchMode === 'location') {
                    matchesSearch = city.includes(term) || loc.includes(term) || dist.includes(term);
                } else {
                    matchesSearch = title.includes(term) || city.includes(term) || loc.includes(term) || dist.includes(term);
                }
            }

            // 2. Sport Filter
            const matchesSport = selectedSport === 'all' || match.format === selectedSport;

            // 3. Date Filter
            let matchesDate = true;
            const matchDate = match.date?.toDate ? match.date.toDate() : new Date(match.date);
            const now = new Date();
            now.setHours(0,0,0,0);
            matchDate.setHours(0,0,0,0); // Normalize match date for comparison

            // Only future matches check (keeping today included)
            if (matchDate < now) return false;

            if (selectedDateFilter !== 'all') {
                const today = new Date();
                today.setHours(0,0,0,0);
                
                if (selectedDateFilter === 'today') {
                   matchesDate = matchDate.getTime() === today.getTime();
                } else if (selectedDateFilter === 'tomorrow') {
                   const tomorrow = new Date(today);
                   tomorrow.setDate(today.getDate() + 1);
                   matchesDate = matchDate.getTime() === tomorrow.getTime();
                } else if (selectedDateFilter === 'weekend') {
                    const day = matchDate.getDay();
                    matchesDate = day === 0 || day === 6; // Sunday or Saturday
                } else if (selectedDateFilter === 'custom' && customDate) {
                   const cDate = new Date(customDate);
                   cDate.setHours(0,0,0,0);
                   matchesDate = matchDate.getTime() === cDate.getTime();
                }
            }

            // 4. Time of Day Filter
            let matchesTime = true;
            if (selectedTime !== 'all') {
                const mHour = (match.date?.toDate ? match.date.toDate() : new Date(match.date)).getHours();
                if (selectedTime === 'morning') matchesTime = mHour >= 6 && mHour < 12;
                else if (selectedTime === 'afternoon') matchesTime = mHour >= 12 && mHour < 17;
                else if (selectedTime === 'evening') matchesTime = mHour >= 17 && mHour < 23;
                else if (selectedTime === 'night') matchesTime = mHour >= 23 || mHour < 6;
            }

            // 5. Price Filter
            const price = parseFloat(match.pricePerPlayer || 0);
            const matchesPrice = price >= priceRange.min && (priceRange.max >= 1000 ? true : price <= priceRange.max);

            // 6. Missing Players Filter
            let matchesMissing = true;
            if (missingCount !== 'all') {
                const missing = (match.maxPlayers || 0) - (match.currentPlayers || 0);
                if (missingCount === '1') matchesMissing = missing === 1;
                else if (missingCount === '2') matchesMissing = missing === 2;
                else if (missingCount === '3+') matchesMissing = missing >= 3;
            }

            return matchesSearch && matchesSport && matchesDate && matchesTime && matchesPrice && matchesMissing;
        });

        // Sorting
        if (sortOption === 'price_asc') {
            result.sort((a, b) => (parseFloat(a.pricePerPlayer) || 0) - (parseFloat(b.pricePerPlayer) || 0));
        } else if (sortOption === 'price_desc') {
            result.sort((a, b) => (parseFloat(b.pricePerPlayer) || 0) - (parseFloat(a.pricePerPlayer) || 0));
        } else if (sortOption === 'date_asc') {
            result.sort((a, b) => {
                const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
                const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
                return dateA - dateB;
            });
        }
        
        return result;
    }, [searchTerm, searchMode, selectedSport, selectedDateFilter, customDate, sortOption, matches, selectedTime, priceRange, missingCount, activeTab]);

    const filteredPlayers = useMemo(() => {
        if (activeTab !== 'player') return [];
        return players.filter(player => {
            // 1. Search Term
            let matchesSearch = true;
            if (searchTerm) {
                const term = normalizeSearchText(searchTerm);
                
                // Get fields with UI fallback logic applied
                // UI shows: player.district || player.city || 'İstanbul'
                // Search should index all available location info + default city
                const name = normalizeSearchText(player.fullName || player.displayName || '');
                const rawCity = player.city || 'İstanbul'; // Default to Istanbul for search relevance
                const city = normalizeSearchText(rawCity);
                const district = normalizeSearchText(player.district || '');
                const uiLocation = normalizeSearchText(player.district || rawCity); // What is actually shown

                if (searchMode === 'name') {
                    matchesSearch = name.includes(term);
                } else if (searchMode === 'location') {
                    // Check displayed location OR city explicitly
                    matchesSearch = city.includes(term) || district.includes(term) || uiLocation.includes(term);
                } else {
                    // Combined
                    matchesSearch = name.includes(term) || city.includes(term) || district.includes(term);
                }
            }

            // 2. Position Filter
            const matchesPosition = selectedPosition === 'all' || 
                (player.position === selectedPosition) || 
                (player.sportPreferences && player.sportPreferences.some(sp => sp.position === selectedPosition));

            // 3. Level Filter
            const matchesLevel = selectedLevel === 'all' || (player.level || '') === selectedLevel;

            // 4. Availability Filter
            const matchesAvailability = selectedAvailability === 'all' || (player.availability || '').toLowerCase().includes(selectedAvailability.toLowerCase());

            return matchesSearch && matchesPosition && matchesLevel && matchesAvailability;
        });
    }, [players, searchTerm, searchMode, activeTab, selectedPosition, selectedLevel, selectedAvailability]);

    const activeFiltersCount = [
        selectedSport !== 'all',
        selectedDateFilter !== 'all',
        selectedTime !== 'all',
        missingCount !== 'all',
        selectedPosition !== 'all',
        selectedLevel !== 'all',
        selectedAvailability !== 'all',
        priceRange.min > 0,
        priceRange.max < 1000
    ].filter(Boolean).length;

    const clearFilters = () => {
        setSearchTerm('');
        setSearchMode('combined');
        setSelectedSport('all');
        setSelectedDateFilter('all');
        setCustomDate('');
        setPriceRange({ min: 0, max: 1000 });
        setSelectedTime('all');
        setMissingCount('all');
        setSelectedPosition('all');
        setSelectedLevel('all');
        setSelectedAvailability('all');
    };

    const handleMatchClick = (match) => {
        if (match.type === 'profile_click') {
            navigate(`/oyuncu-detay/${match.organizerSlug || match.organizerId}`);
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
                        <div className="flex-1 relative flex items-center bg-white border border-gray-200 rounded-xl focus-within:ring-2 focus-within:ring-green-500/20 overflow-hidden shadow-sm">
                            <div className="relative border-r border-gray-100 hidden sm:block">
                                <select
                                    value={searchMode}
                                    onChange={(e) => setSearchMode(e.target.value)}
                                    className="appearance-none bg-gray-50 text-gray-700 font-medium py-3 pl-4 pr-8 focus:outline-none cursor-pointer hover:bg-gray-100 transition-colors h-full text-sm"
                                >
                                    <option value="combined">Tümü</option>
                                    <option value="name">İsimle</option>
                                    <option value="location">Konumla</option>
                                </select>
                                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
                            </div>
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                <input
                                    type="text"
                                    placeholder={activeTab === 'match' 
                                        ? "Maç adı, konum veya tesis ara..."
                                        : "Oyuncu adı, şehir veya ilçe ara..."
                                    }
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 focus:outline-none text-gray-900 placeholder:text-gray-400"
                                />
                            </div>
                        </div>

                        {/* Quick Filters */}
                        <div className="flex gap-3 flex-wrap lg:flex-nowrap">
                             <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-sm ${showFilters || activeFiltersCount > 0
                                    ? 'bg-green-600 text-white shadow-green-200'
                                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                                    }`}
                            >
                                <SlidersHorizontal size={18} />
                                <span>Filtreler</span>
                                {activeFiltersCount > 0 && (
                                    <span className="ml-1 bg-white text-green-600 px-1.5 py-0.5 rounded-full text-xs font-black">
                                        {activeFiltersCount}
                                    </span>
                                )}
                            </button>
                            {activeFiltersCount > 0 && (
                                <button 
                                    onClick={clearFilters} 
                                    className="text-red-500 font-bold text-sm bg-red-50 hover:bg-red-100 px-4 py-3 rounded-xl transition-colors"
                                >
                                    Temizle
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Expanded Filters */}
                    {showFilters && (
                        <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-4 duration-200">
                            
                            {activeTab === 'match' ? (
                                <>
                                    {/* Match Specific Filters */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Spor</label>
                                        <div className="relative">
                                            <select
                                                value={selectedSport}
                                                onChange={(e) => setSelectedSport(e.target.value)}
                                                className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                                            >
                                                {SPORTS.map(sport => (
                                                    <option key={sport.value} value={sport.value}>{sport.label}</option>
                                                ))}
                                            </select>
                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Tarih</label>
                                        <div className="relative flex items-center gap-2">
                                            <div className="relative flex-1">
                                                <select
                                                    value={selectedDateFilter}
                                                    onChange={(e) => setSelectedDateFilter(e.target.value)}
                                                    className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                                                >
                                                    {DATE_OPTIONS.map(opt => (
                                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                    ))}
                                                </select>
                                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                                            </div>
                                        </div>
                                        {selectedDateFilter === 'custom' && (
                                            <input
                                                type="date"
                                                value={customDate}
                                                onChange={(e) => setCustomDate(e.target.value)}
                                                className="w-full mt-2 bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20"
                                            />
                                        )}
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Saat Aralığı</label>
                                        <div className="relative">
                                            <select
                                                value={selectedTime}
                                                onChange={(e) => setSelectedTime(e.target.value)}
                                                className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                                            >
                                                {TIMES.map(time => (
                                                    <option key={time.value} value={time.value}>{time.label}</option>
                                                ))}
                                            </select>
                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Eksik Oyuncu</label>
                                        <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-200">
                                            {['all', '1', '2', '3+'].map((cnt) => (
                                                <button
                                                    key={cnt}
                                                    onClick={() => setMissingCount(cnt)}
                                                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                                        missingCount === cnt ? 'bg-white shadow text-green-600' : 'text-gray-500 hover:text-gray-700'
                                                    }`}
                                                >
                                                    {cnt === 'all' ? 'Tümü' : cnt}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-1.5 md:col-span-2 lg:col-span-4">
                                         <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">
                                            Fiyat Aralığı: {priceRange.min}₺ - {priceRange.max >= 1000 ? '1000₺+' : priceRange.max + '₺'}
                                         </label>
                                         <div className="flex items-center gap-4 px-2">
                                            <input 
                                                type="range" 
                                                min="0" max="1000" step="50"
                                                value={priceRange.max}
                                                onChange={(e) => setPriceRange(prev => ({ ...prev, max: parseInt(e.target.value) }))}
                                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
                                            />
                                         </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    {/* Player Specific Filters */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Mevki</label>
                                        <div className="relative">
                                            <select
                                                value={selectedPosition}
                                                onChange={(e) => setSelectedPosition(e.target.value)}
                                                className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                                            >
                                                {POSITIONS.map(pos => (
                                                    <option key={pos.value} value={pos.value}>{pos.label}</option>
                                                ))}
                                            </select>
                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Seviye</label>
                                        <div className="relative">
                                            <select
                                                value={selectedLevel}
                                                onChange={(e) => setSelectedLevel(e.target.value)}
                                                className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                                            >
                                                {LEVELS.map(lvl => (
                                                    <option key={lvl.value} value={lvl.value}>{lvl.label}</option>
                                                ))}
                                            </select>
                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5 md:col-span-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Müsaitlik Durumu</label>
                                        <input
                                            type="text"
                                            placeholder="Örn: Hafta içi akşam, Pazar..."
                                            value={selectedAvailability === 'all' ? '' : selectedAvailability}
                                            onChange={(e) => setSelectedAvailability(e.target.value || 'all')}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500/20 placeholder:text-gray-400"
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                    )}
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
                                        <div className="text-xs font-bold text-gray-900">
                                            {selectedPosition !== 'all' && (player.position === selectedPosition || player.sportPreferences?.some(sp => sp.position === selectedPosition)) 
                                                ? selectedPosition 
                                                : (player.position || 'Belirtilmemiş')}
                                        </div>
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

