import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getOpenMatches, joinOpenMatch, leaveOpenMatch, getUserOpenMatches, updateOpenMatch, deleteOpenMatch, getAllTesisler, getPlayers } from '../../services/firestoreService';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { db } from '../../config/firebase';
import OyuncuSidebar from '../../components/OyuncuSidebar';
import LocationSelectorModal from '../../components/LocationSelectorModal';
import { getLocationByIP } from '../../utils/locationService';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap } from 'react-leaflet';
import { Icon, DivIcon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  Users, Calendar, MapPin, DollarSign, Star, Clock, Plus, Search, 
  Filter, Grid, List, X, CheckCircle, Edit, Trash2, UserPlus, UserMinus, Map, Navigation, MessageCircle, User, Loader2, Check
} from 'lucide-react';
import toast from '../../utils/toast';
import MatchDetailModal from '../../components/MatchDetailModal';
import PlayerDetailModal from '../../components/PlayerDetailModal';

// Leaflet default icon sorununu düzelt
import L from 'leaflet';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Harita merkezini güncelleme component'i
const MapUpdater = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
};

// Marker ikonları oluştur
const createCustomIcon = (color, emoji) => {
  return new DivIcon({
    html: `
      <div style="
        background-color: ${color};
        width: 32px;
        height: 32px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <span style="
          transform: rotate(45deg);
          font-size: 18px;
          display: block;
        ">${emoji}</span>
      </div>
    `,
    className: 'custom-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

const sportIcons = {
  'Futbol': createCustomIcon('#22c55e', '⚽'),
  'Basketbol': createCustomIcon('#f97316', '🏀'),
  'Tenis': createCustomIcon('#3b82f6', '🎾'),
  'Voleybol': createCustomIcon('#a855f7', '🏐'),
  'default': createCustomIcon('#6b7280', '📍'),
};

const userLocationIcon = new DivIcon({
  html: `
    <div style="
      width: 24px;
      height: 24px;
      background-color: #3b82f6;
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      position: relative;
    ">
      <div style="
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 8px;
        height: 8px;
        background-color: white;
        border-radius: 50%;
      "></div>
    </div>
  `,
  className: 'user-location-marker',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const OyuncuBul = () => {
  const { user } = useAuth();
  const [searchType, setSearchType] = useState('match'); // 'match' or 'player'
  const [allPlayers, setAllPlayers] = useState([]); // Master list
  const [players, setPlayers] = useState([]); // Filtered display list
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'organized', 'joined'
  const [matches, setMatches] = useState([]);
  const [userMatches, setUserMatches] = useState({ organized: [], joined: [] });
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid'); // 'grid', 'list', 'map'
  const [mapView, setMapView] = useState(false); // Liste/Harita toggle
  const [mapLayer, setMapLayer] = useState('satellite'); // 'standard' veya 'satellite'
  const [userLocation, setUserLocation] = useState({ lat: 41.0082, lng: 28.9784 }); // İstanbul default
  const [mapCenter, setMapCenter] = useState({ lat: 41.0082, lng: 28.9784 });
  const [mapZoom, setMapZoom] = useState(12);
  const [tesisler, setTesisler] = useState([]);
  const navigate = useNavigate();
  
  // Filters
  const [filters, setFilters] = useState({
    location: '',
    date: '',
    timeRange: 'all',
    level: 'all',
    format: 'all',
    priceFilter: 'all',
    searchTerm: '',
    position: 'all', // For players
    gender: 'all',   // For players
    ageRange: 'all'  // For players
  });

  const [showFilters, setShowFilters] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null); // For player details
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [joining, setJoining] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false); // Detay modali için state
  const [showPlayerDetailModal, setShowPlayerDetailModal] = useState(false); // Player detay modali için state
  const [selectedDetailMatch, setSelectedDetailMatch] = useState(null);
  const [editFormData, setEditFormData] = useState({
    title: '',
    date: '',
    timeSlot: '',
    pricePerPlayer: 0,
    maxPlayers: 14,
    description: '',
    level: 'mixed',
    format: 'football'
  });

  useEffect(() => {
    if (showEditModal && selectedMatch) {
      let d = '';
      if (selectedMatch.date) {
         try {
             const dateObj = selectedMatch.date.toDate ? selectedMatch.date.toDate() : new Date(selectedMatch.date);
             // Adjust for timezone offset to prevent day shift
             const offset = dateObj.getTimezoneOffset();
             const localDate = new Date(dateObj.getTime() - (offset*60*1000));
             d = localDate.toISOString().split('T')[0];
         } catch(e) {
             console.error("Date parse error", e);
         }
      }
      
      setEditFormData({
        title: selectedMatch.title || '',
        date: d,
        timeSlot: selectedMatch.timeSlot || '',
        pricePerPlayer: selectedMatch.pricePerPlayer || 0,
        maxPlayers: selectedMatch.maxPlayers || 14,
        description: selectedMatch.description || '',
        level: selectedMatch.level || 'mixed',
        format: selectedMatch.format || 'football'
      });
    }
  }, [showEditModal, selectedMatch]);

  const handleUpdateMatch = async (e) => {
    e.preventDefault();
    if (!selectedMatch) return;
    
    setEditing(true);
    try {
      const updateData = {
          ...editFormData,
          updatedAt: new Date()
      };
      
      // Ensure date object
      if (editFormData.date) {
          updateData.date = new Date(editFormData.date);
      }
      
      const result = await updateOpenMatch(selectedMatch.id, updateData);
      
      if (result.success) {
        toast.success('Maç güncellendi');
        setShowEditModal(false);
        setSelectedMatch(null);
      } else {
        toast.error(result.error || 'Güncelleme başarısız');
      }
    } catch (error) {
      console.error('Update error:', error);
      toast.error('Bir hata oluştu');
    } finally {
      setEditing(false);
    }
  };

  // Effect 1: Realtime Match Listener
  useEffect(() => {
    if (!user || searchType !== 'match') return;
    
    const cleanup = setupRealtimeListener();
    return cleanup;
  }, [user, searchType]);

  // Effect 2: Player Loading
  useEffect(() => {
     if (user && searchType === 'player' && allPlayers.length === 0) {
        loadPlayers();
     }
  }, [user, searchType, allPlayers.length]);

  // Effect 3: Map & Tesisler
  useEffect(() => {
    if (mapView) {
      getUserLocation();
      loadTesisler();
    }
  }, [mapView]);

  // Separate effect for local filtering of players
  useEffect(() => {
    if (searchType === 'player') {
      const filtered = applyPlayerFilters(allPlayers);
      setPlayers(filtered);
    }
  }, [filters, allPlayers, searchType]);

  // Mesafe hesaplama fonksiyonu
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
    const R = 6371; // Dünya yarıçapı (km)
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const getUserLocation = async () => {
    // Önce GPS ile dene
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          setMapCenter({ lat: latitude, lng: longitude });
        },
        async (error) => {
          console.error('GPS konum hatası:', error);
          // GPS başarısız, IP servisi dene
          await tryIPLocation();
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } else {
      // Geolocation desteklenmiyor, direkt IP servisi dene
      await tryIPLocation();
    }
  };

  const tryIPLocation = async () => {
    try {
      const result = await getLocationByIP();
      if (result.success) {
        setUserLocation({ lat: result.lat, lng: result.lng });
        setMapCenter({ lat: result.lat, lng: result.lng });
        toast.success(`Konum IP adresinize göre belirlendi: ${result.city || result.region || 'Bilinmeyen'}`);
      } else {
        // IP servisi de başarısız, modal aç
        setShowLocationModal(true);
      }
    } catch (error) {
      console.error('IP konum hatası:', error);
      setShowLocationModal(true);
    }
  };

  const handleLocationSelected = (location) => {
    setUserLocation({ lat: location.lat, lng: location.lng });
    setMapCenter({ lat: location.lat, lng: location.lng });
    toast.success(`Konum seçildi: ${location.city}${location.district ? ` - ${location.district}` : ''}`);
  };

  const loadTesisler = async () => {
    try {
      const result = await getAllTesisler();
      if (result.success) {
        const tesislerWithDistance = result.data.map(tesis => ({
          ...tesis,
          distance: calculateDistance(
            userLocation.lat,
            userLocation.lng,
            tesis.latitude || 0,
            tesis.longitude || 0
          )
        }));
        setTesisler(tesislerWithDistance);
      }
    } catch (error) {
      console.error('Tesisler yükleme hatası:', error);
    }
  };

  const setupRealtimeListener = () => {
    const matchesRef = collection(db, 'openMatches');
    // Sadece status filtresi (composite index gerektirmemesi için)
    // Tarih filtresini client-side yapacağız
    const q = query(matchesRef, where('status', '==', 'open'));
    
    console.log('🔍 Real-time listener kuruluyor...');
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const matchesData = [];
      snapshot.forEach((doc) => {
        matchesData.push({ id: doc.id, ...doc.data() });
      });
      
      console.log(`📊 Toplam ${matchesData.length} açık maç bulundu`);
      
      // Tarih filtresini client-side yap (gelecek maçlar)
      const now = new Date();
      now.setHours(0, 0, 0, 0); // Saat detayını sıfırla - Bugünü de kapsasın
      
      const futureMatches = matchesData.filter(m => {
        if (!m.date) return false;
        const matchDate = m.date?.toDate ? m.date.toDate() : new Date(m.date);
        const mDate = new Date(matchDate);
        mDate.setHours(0, 0, 0, 0);
        
        return mDate >= now;
      });
      
      console.log(`📅 Gelecek maçlar: ${futureMatches.length}`);
      
      
      // Store raw future matches (filtering applied in render)
      setMatches(futureMatches);
      
      // User matches (sadece user varsa)
      if (user) {
        const organized = futureMatches.filter(m => m.organizerId === user.uid);
        const joined = futureMatches.filter(m => 
          m.players && m.players.includes(user.uid) && m.organizerId !== user.uid
        );
        setUserMatches({ organized, joined });
        console.log(`👤 Kullanıcı maçları - Oluşturduğum: ${organized.length}, Katıldığım: ${joined.length}`);
      }
      
      setLoading(false);
    }, (error) => {
      console.error('❌ Real-time listener hatası:', error);
      setLoading(false);
      
      // Fallback: getOpenMatches servis fonksiyonunu çağır
      console.log('🔄 Fallback mekanizması devreye giriyor...');
      loadMatches();
    });

    return () => {
      console.log('🔌 Real-time listener kapatılıyor...');
      unsubscribe();
    };
  };

  const loadMatches = async () => {
    try {
      setLoading(true);
      setLoading(true);
      // Pass filters only if getOpenMatches supports server-side filtering
      // Current implementation seems to rely on client-side filtering partially for dates in realtime listener
      // but getOpenMatches might do basic filtering.
      // For now, keep as is, match logic is different.
      const result = await getOpenMatches(filters);
      if (result.success) {
        setMatches(result.data);
      }
    } catch (error) {
      console.error('Maçlar yükleme hatası:', error);
      toast.error('Maçlar yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const loadUserMatches = async () => {
    if (!user) return;
    
    try {
      const result = await getUserOpenMatches(user.uid);
      if (result.success) {
        setUserMatches(result.data);
      }
    } catch (error) {
      console.error('Kullanıcı maçları yükleme hatası:', error);
    }
  };

  const loadPlayers = async () => {
    try {
      setLoading(true);
      const result = await getPlayers();
      if (result.success) {
        let playersData = result.data.filter(p => p.uid !== user?.uid && p.displayName && p.displayName.trim() !== ''); // Kendisi hariç ve ismi olanlar
        
        // Mock coordinates for demo (if missing) - In real app, rely on p.latitude/p.longitude
        // Sadece demo amacıyla, İstanbul etrafında rastgele dağıtıyoruz eğer konumu yoksa
        playersData = playersData.map(p => {
          if (!p.latitude || !p.longitude) {
            // İstanbul merkez etrafında +/- 0.1 derece (yaklaşık 10km) rastgele
            const lat = 41.0082 + (Math.random() - 0.5) * 0.1;
            const lng = 28.9784 + (Math.random() - 0.5) * 0.1;
            return { ...p, latitude: lat, longitude: lng, isLocationMock: true };
          }
          return p;
        });

        // Harita açıksa ve oyuncu bul modundaysak, mesafeye göre filtrele (opsiyonel)
        if (mapView) {
            playersData = playersData.map(p => ({
                ...p,
                distance: calculateDistance(userLocation.lat, userLocation.lng, p.latitude, p.longitude)
            }));
            // Yakındakiler (örneğin 50km altı)
            // playersData = playersData.filter(p => p.distance < 50); 
        }

        // Initial filter application
        const filtered = applyPlayerFilters(playersData);
        setAllPlayers(playersData); // Store all
        // setPlayers(filtered); // This will handled by the useEffect above
      }
    } catch (error) {
      console.error('Oyuncular yükleme hatası:', error);
      toast.error('Oyuncular yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const applyPlayerFilters = (playersData) => {
    let filtered = [...playersData];

    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        p.displayName?.toLowerCase().includes(searchLower) ||
        p.fullName?.toLowerCase().includes(searchLower) ||
        p.bio?.toLowerCase().includes(searchLower)
      );
    }

    if (filters.position && filters.position !== 'all') {
      filtered = filtered.filter(p => p.position === filters.position || (p.sportPreferences && p.sportPreferences.some(sp => sp.position === filters.position)));
    }

    if (filters.level && filters.level !== 'all') {
      filtered = filtered.filter(p => p.skillLevel === filters.level || (p.sportPreferences && p.sportPreferences.some(sp => sp.skillLevel === filters.level)));
    }

    if (filters.gender && filters.gender !== 'all') {
        filtered = filtered.filter(p => p.gender === filters.gender);
    }

    if (filters.location) {
        const locLower = filters.location.toLowerCase();
        filtered = filtered.filter(p => 
            p.city?.toLowerCase().includes(locLower) ||
            p.district?.toLowerCase().includes(locLower)
        );
    }

    return filtered;
  };

  const applyFilters = (matchesData) => {
    let filtered = [...matchesData];

    // Tarih filtresi (belirli bir tarih seçilmişse)
    if (filters.date) {
      const dateStart = new Date(filters.date);
      dateStart.setHours(0, 0, 0, 0);
      const dateEnd = new Date(filters.date);
      dateEnd.setHours(23, 59, 59, 999);
      
      filtered = filtered.filter(m => {
        const matchDate = m.date?.toDate ? m.date.toDate() : new Date(m.date);
        return matchDate >= dateStart && matchDate <= dateEnd;
      });
    }

    if (filters.location) {
      filtered = filtered.filter(m => 
        m.location?.toLowerCase().includes(filters.location.toLowerCase()) ||
        m.tesisName?.toLowerCase().includes(filters.location.toLowerCase())
      );
    }

    if (filters.format && filters.format !== 'all') {
      filtered = filtered.filter(m => m.format === filters.format);
    }

    if (filters.level && filters.level !== 'all') {
      filtered = filtered.filter(m => m.level === filters.level);
    }

    if (filters.priceFilter === 'free') {
      filtered = filtered.filter(m => m.pricePerPlayer === 0);
    }

    if (filters.timeRange && filters.timeRange !== 'all') {
      const [startHour, endHour] = filters.timeRange.split('-').map(h => parseInt(h));
      filtered = filtered.filter(m => {
        const matchHour = parseInt(m.timeSlot?.split(':')[0] || 0);
        return matchHour >= startHour && matchHour < endHour;
      });
    }

    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(m =>
        m.tesisName?.toLowerCase().includes(searchLower) ||
        m.location?.toLowerCase().includes(searchLower) ||
        m.organizerName?.toLowerCase().includes(searchLower) ||
        m.description?.toLowerCase().includes(searchLower)
      );
    }

    filtered.sort((a, b) => {
      const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
      const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
      return dateA - dateB;
    });

    return filtered;
  };

  const getDisplayMatches = () => {
    if (activeTab === 'organized') {
      return userMatches.organized;
    } else if (activeTab === 'joined') {
      return userMatches.joined;
    }
    return applyFilters(matches);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleJoinMatch = async () => {
    if (!selectedMatch) return;

    setJoining(true);
    try {
      const result = await joinOpenMatch(selectedMatch.id, user.uid);
      if (result.success) {
        toast.success('Maça başarıyla katıldınız!');
        setShowJoinModal(false);
        setSelectedMatch(null);
      } else {
        toast.error(result.error || 'Maça katılamadınız');
      }
    } catch (error) {
      console.error('Maça katılma hatası:', error);
      toast.error('Bir hata oluştu');
    } finally {
      setJoining(false);
    }
  };

  const handleLeaveMatch = async (matchId) => {
    if (!confirm('Maçtan ayrılmak istediğinize emin misiniz?')) return;

    try {
      const result = await leaveOpenMatch(matchId, user.uid);
      if (result.success) {
        toast.success('Maçtan ayrıldınız');
      } else {
        toast.error(result.error || 'Maçtan ayrılamadınız');
      }
    } catch (error) {
      console.error('Maçtan ayrılma hatası:', error);
      toast.error('Bir hata oluştu');
    }
  };

  const handleDeleteMatch = async () => {
    if (!selectedMatch) return;

    setDeleting(true);
    try {
      const result = await deleteOpenMatch(selectedMatch.id, user.uid);
      if (result.success) {
        toast.success('Maç silindi');
        setShowDeleteModal(false);
        setSelectedMatch(null);
      } else {
        toast.error(result.error || 'Maç silinemedi');
      }
    } catch (error) {
      console.error('Maç silme hatası:', error);
      toast.error('Bir hata oluştu');
    } finally {
      setDeleting(false);
    }
  };

  const getFormatIcon = (format) => {
    switch (format) {
      case 'football': return '⚽';
      case 'basketball': return '🏀';
      case 'tennis': return '🎾';
      case 'volleyball': return '🏐';
      default: return '⚽';
    }
  };

  const getFormatText = (format) => {
    switch (format) {
      case 'football': return 'Halı Saha';
      case 'basketball': return 'Basketbol';
      case 'tennis': return 'Tenis';
      case 'volleyball': return 'Voleybol';
      default: return format;
    }
  };

  const getLevelText = (level) => {
    switch (level) {
      case 'beginner': return 'Başlangıç';
      case 'intermediate': return 'Orta';
      case 'good': return 'İyi';
      case 'advanced': return 'İleri';
      case 'mixed': return 'Karışık';
      default: return level;
    }
  };

  const getMissingPlayers = (match) => {
    return match.maxPlayers - match.currentPlayers;
  };

  const formatDate = (date) => {
    if (!date) return '';
    const d = date?.toDate ? date.toDate() : new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const matchDate = new Date(d);
    matchDate.setHours(0, 0, 0, 0);
    
    const diffTime = matchDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Bugün';
    if (diffDays === 1) return 'Yarın';
    if (diffDays === 2) return 'Öbür Gün';
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
  };

  const clearFilters = () => {
    setFilters({
      location: '',
      date: '',
      timeRange: 'all',
      level: 'all',
      format: 'all',
      priceFilter: 'all',
      searchTerm: ''
    });
  };

  const displayMatches = getDisplayMatches();

  return (
    <div className="flex min-h-screen bg-gray-50">
      <OyuncuSidebar />
      
      <div className="flex-1 p-6 md:p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                {searchType === 'match' ? 'Maç Bul' : 'Oyuncu Bul'}
              </h1>
              <p className="text-lg text-gray-600">
                {searchType === 'match' 
                  ? 'Eksik oyuncu arayan maçları bul ve takımını tamamla' 
                  : 'Takımına uygun yetenekli oyuncuları keşfet'}
              </p>
            </div>
            
            <div className="flex bg-gray-200 p-1 rounded-xl">
              <button
                onClick={() => { setSearchType('match'); setActiveTab('all'); }}
                className={`px-6 py-2 rounded-lg font-medium transition-all ${
                  searchType === 'match'
                    ? 'bg-white text-green-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Maç Ara
              </button>
              <button
                onClick={() => { setSearchType('player'); setActiveTab('all'); loadPlayers(); }}
                className={`px-6 py-2 rounded-lg font-medium transition-all ${
                  searchType === 'player'
                    ? 'bg-white text-green-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Oyuncu Ara
              </button>
            </div>
          </div>
        </div>

        {/* Tabs (Only for Matches) */}
        {searchType === 'match' && (
          <div className="bg-white rounded-xl shadow-sm p-2 mb-6 flex gap-2">
            <button
              onClick={() => setActiveTab('all')}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'all'
                  ? 'bg-green-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Tümü
            </button>
            <button
              onClick={() => setActiveTab('organized')}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'organized'
                  ? 'bg-green-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Oluşturduğum ({userMatches.organized.length})
            </button>
            <button
              onClick={() => setActiveTab('joined')}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'joined'
                  ? 'bg-green-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Katıldığım ({userMatches.joined.length})
            </button>
          </div>
        )}

        {/* Search and Filters Bar */}
        {(activeTab === 'all' || searchType === 'player') && (
          <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder={searchType === 'match' ? "Maç, konum veya organizatör ara..." : "İsim, pozisyon veya bio ara..."}
                  value={filters.searchTerm}
                  onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              {/* Quick Filters */}
              <div className="flex items-center gap-2 flex-wrap">
                {searchType === 'match' ? (
                  <>
                    <select
                      value={filters.format}
                      onChange={(e) => handleFilterChange('format', e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="all">Tüm Formatlar</option>
                      <option value="football">⚽ Halı Saha</option>
                      <option value="basketball">🏀 Basketbol</option>
                      <option value="tennis">🎾 Tenis</option>
                      <option value="volleyball">🏐 Voleybol</option>
                    </select>

                    <select
                      value={filters.level}
                      onChange={(e) => handleFilterChange('level', e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="all">Tüm Seviyeler</option>
                      <option value="beginner">Başlangıç</option>
                      <option value="intermediate">Orta</option>
                      <option value="good">İyi</option>
                      <option value="advanced">İleri</option>
                      <option value="mixed">Karışık</option>
                    </select>
                  </>
                ) : (
                  <>
                    <select
                      value={filters.position}
                      onChange={(e) => handleFilterChange('position', e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="all">Tüm Mevkiler</option>
                      <option value="Kaleci">🧤 Kaleci</option>
                      <option value="Defans">🛡️ Defans</option>
                      <option value="Orta Saha">⚡ Orta Saha</option>
                      <option value="Forvet">⚽ Forvet</option>
                    </select>
                    
                     <select
                      value={filters.level}
                      onChange={(e) => handleFilterChange('level', e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="all">Tüm Seviyeler</option>
                      <option value="beginner">Başlangıç</option>
                      <option value="intermediate">Orta</option>
                      <option value="good">İyi</option>
                      <option value="advanced">İleri</option>
                      <option value="pro">Profesyonel</option>
                    </select>
                  </>
                )}

                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center space-x-2"
                >
                  <Filter size={18} />
                  <span>Filtreler</span>
                </button>


                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setViewMode('grid');
                      setMapView(false);
                    }}
                    className={`p-2 rounded-lg ${viewMode === 'grid' && !mapView ? 'bg-green-100 text-green-600' : 'text-gray-600 hover:bg-gray-100'}`}
                    title="Grid Görünümü"
                  >
                    <Grid size={20} />
                  </button>
                  <button
                    onClick={() => {
                      setViewMode('list');
                      setMapView(false);
                    }}
                    className={`p-2 rounded-lg ${viewMode === 'list' && !mapView ? 'bg-green-100 text-green-600' : 'text-gray-600 hover:bg-gray-100'}`}
                    title="Liste Görünümü"
                  >
                    <List size={20} />
                  </button>
                  <button
                    onClick={() => {
                      setMapView(!mapView);
                      if (!mapView) {
                        getUserLocation();
                        loadTesisler();
                      }
                    }}
                    className={`p-2 rounded-lg ${mapView ? 'bg-green-100 text-green-600' : 'text-gray-600 hover:bg-gray-100'}`}
                    title="Harita Görünümü"
                  >
                    <Map size={20} />
                  </button>
                </div>
              </div>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Konum</label>
                  <input
                    type="text"
                    placeholder="İl, ilçe..."
                    value={filters.location}
                    onChange={(e) => handleFilterChange('location', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                {searchType === 'match' ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tarih</label>
                      <input
                        type="date"
                        value={filters.date}
                        onChange={(e) => handleFilterChange('date', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Saat Aralığı</label>
                      <select
                        value={filters.timeRange}
                        onChange={(e) => handleFilterChange('timeRange', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        <option value="all">Tüm Gün</option>
                        <option value="6-12">Sabah (06:00-12:00)</option>
                        <option value="12-18">Öğle (12:00-18:00)</option>
                        <option value="18-22">Akşam (18:00-22:00)</option>
                        <option value="22-6">Gece (22:00-06:00)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Ücret</label>
                      <select
                        value={filters.priceFilter}
                        onChange={(e) => handleFilterChange('priceFilter', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        <option value="all">Hepsi</option>
                        <option value="free">💰 Ücretsiz</option>
                        <option value="paid">💳 Ücretli</option>
                      </select>
                    </div>
                  </>
                ) : (
                  <>
                     <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cinsiyet</label>
                      <select
                        value={filters.gender}
                        onChange={(e) => handleFilterChange('gender', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        <option value="all">Hepsi</option>
                        <option value="Erkek">Erkek</option>
                        <option value="Kadın">Kadın</option>
                      </select>
                    </div>
                  </>
                )}

                <div className="flex items-end">
                  <button
                    onClick={clearFilters}
                    className="px-4 py-2 text-gray-600 hover:text-gray-900 flex items-center space-x-2"
                  >
                    <X size={18} />
                    <span>Filtreleri Temizle</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Stats */}
        {(activeTab === 'all' || searchType === 'player') && !mapView && (
          <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
            <p className="text-center text-gray-700">
              {searchType === 'match' ? (
                <>
                  <span className="font-bold text-green-600">{displayMatches.reduce((sum, m) => sum + getMissingPlayers(m), 0)}</span> eksik oyuncu arayan <span className="font-bold text-green-600">{displayMatches.length}</span> maç bulundu
                </>
              ) : (
                <>
                   Takım arayan <span className="font-bold text-green-600">{players.length}</span> oyuncu bulundu
                </>
              )}
            </p>
          </div>
        )}

        {/* Harita Görünümü */}
        {mapView && (activeTab === 'all' || searchType === 'player') ? (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6" style={{ height: '600px' }}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {searchType === 'match' ? 'Yakındaki Maçlar' : 'Yakındaki Oyuncular'}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={getUserLocation}
                  className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
                  title="Konumumu Bul"
                >
                  <Navigation size={18} />
                </button>
              </div>
            </div>
            <MapContainer
              center={[mapCenter.lat, mapCenter.lng]}
              zoom={mapZoom}
              style={{ height: 'calc(100% - 60px)', width: '100%' }}
              scrollWheelZoom={true}
            >
              <MapUpdater center={[mapCenter.lat, mapCenter.lng]} zoom={mapZoom} />
              
                <TileLayer
                  attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  maxZoom={19}
                />
              
              {/* Kullanıcı konumu */}
              <Marker position={[userLocation.lat, userLocation.lng]} icon={userLocationIcon}>
                <Popup>Konumunuz</Popup>
              </Marker>
              
              {/* Markers based on searchType */}
              {searchType === 'match' ? (
                   // Tesis marker'ları veya Maç marker'ları
                   tesisler.filter(t => t.latitude && t.longitude).map((tesis) => (
                    <Marker
                      key={tesis.id}
                      position={[tesis.latitude, tesis.longitude]}
                      icon={sportIcons['default']} // Tesis ikonunu özelleştirebiliriz
                    >
                      <Popup>
                        <div className="p-2 min-w-[200px]">
                          <h3 className="font-bold text-gray-900 mb-1">{tesis.name}</h3>
                          <p className="text-sm text-gray-600 mb-2">{tesis.district}, {tesis.city}</p>
                          <div className="flex items-center gap-1 text-xs font-medium text-yellow-600 mb-3">
                            <Star size={12} fill="currentColor" />
                            <span>{tesis.rating} ({tesis.ratingCount})</span>
                          </div>
                          
                          {/* Bu tesisteki maçları listele */}
                          {matches.filter(m => m.tesisId === tesis.id).length > 0 ? (
                            <div className="space-y-2">
                               <p className="text-xs font-bold text-green-600 uppercase mb-1">Açık Maçlar</p>
                               {matches.filter(m => m.tesisId === tesis.id).slice(0,3).map(m => (
                                   <div key={m.id} className="text-xs bg-gray-50 p-2 rounded border border-gray-100">
                                       <div className="font-medium">{formatDate(m.date)} - {m.timeSlot}</div>
                                       <div>{m.currentPlayers}/{m.maxPlayers} Oyuncu</div>
                                       <button 
                                          onClick={() => { setSelectedMatch(m); setShowJoinModal(true); }}
                                          className="mt-1 w-full bg-green-600 text-white py-1 rounded text-[10px]"
                                       >
                                           İncele
                                       </button>
                                   </div>
                               ))}
                            </div>
                          ) : (
                              <p className="text-xs text-gray-500 italic">Bu sahada açık maç yok.</p>
                          )}
                        </div>
                      </Popup>
                    </Marker>
                  ))
              ) : (
                  // Oyuncu Marker'ları
                  players.filter(p => p.latitude && p.longitude).map((player) => (
                    <Marker
                        key={player.uid || player.id}
                        position={[player.latitude, player.longitude]}
                        icon={createCustomIcon('#3b82f6', '👤')}
                        eventHandlers={{
                          click: () => {
                            // Tıklayınca direkt mesaj atma veya profil açma
                            // setSelectedPlayer(player);
                            // setShowPlayerDetailModal(true);
                            // Popup açılır zaten default
                          }
                        }}
                    >
                        <Tooltip 
                          direction="bottom" 
                          offset={[0, 20]} 
                          opacity={1} 
                          permanent
                          className="custom-tooltip font-bold text-sm bg-black/80 text-white border-0 px-2 py-1 rounded"
                        >
                          {player.displayName}
                        </Tooltip>
                        <Popup className="custom-popup">
                             <div className="p-3 min-w-[220px]">
                                <div className="flex flex-col items-center gap-2 mb-3 text-center">
                                    <div className="w-14 h-14 rounded-full bg-gray-200 overflow-hidden ring-2 ring-green-500 ring-offset-2">
                                        {player.profilePhoto?.url ? (
                                            <img src={player.profilePhoto.url} alt={player.displayName} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-500 font-bold text-xl">
                                                {player.displayName?.charAt(0)}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 text-lg">{player.displayName}</h3>
                                        <div className="flex items-center justify-center gap-2 text-xs text-gray-600 mt-1">
                                            <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-medium">{player.position || 'Mevki Yok'}</span>
                                            <div className="flex items-center gap-1">
                                                <Star size={10} className="text-yellow-500 fill-yellow-500" />
                                                <span>{player.skillLevel || '-'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 mt-4">
                                    <button
                                        className="bg-blue-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
                                        onClick={() => {
                                            navigate('/oyuncu/mesajlar', { state: { recipient: player } });
                                        }}
                                    >
                                        <MessageCircle size={14} />
                                        Mesaj
                                    </button>
                                    <button
                                        className="bg-gray-100 text-gray-800 py-2 rounded-lg text-xs font-bold hover:bg-gray-200 transition-colors"
                                        onClick={() => {
                                            setSelectedPlayer(player);
                                            setShowPlayerDetailModal(true);
                                        }}
                                    >
                                        Profil
                                    </button>
                                </div>
                             </div>
                        </Popup>
                    </Marker>
                  ))
              )}
            </MapContainer>
          </div>
        ) : (
          <>
            {/* Matches */}
            {loading ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              </div>
            ) : searchType === 'match' ? (
              displayMatches.length > 0 ? (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
            {displayMatches.map((match) => {
              const missingPlayers = getMissingPlayers(match);
              const isUrgent = missingPlayers <= 2;
              const isFree = match.pricePerPlayer === 0;
              const matchHour = parseInt(match.timeSlot?.split(':')[0] || 0);
              const isNight = matchHour >= 22 || matchHour < 6;
              const isJoined = user && match.players.includes(user.uid);
              const isOrganizer = user && match.organizerId === user.uid;

              return (
                <div
                  key={match.id}
                  className={`bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow ${viewMode === 'list' ? 'flex items-center gap-6' : ''}`}
                >
                  {viewMode === 'grid' ? (
                    <>
                      {/* Badges */}
                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        {isUrgent && (
                          <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded-full">
                            🔥 Acil - {missingPlayers} Kişi
                          </span>
                        )}
                        {isFree && (
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                            💰 Ücretsiz
                          </span>
                        )}
                        {isNight && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                            🌙 Gece Maçı
                          </span>
                        )}
                      </div>

                      {/* Format */}
                      <div className="flex items-center space-x-2 mb-3">
                        <span className="text-2xl">{getFormatIcon(match.format)}</span>
                        <span className="font-semibold text-gray-900">{getFormatText(match.format)}</span>
                      </div>

                      {/* Title */}
                      <h3 className="font-bold text-gray-900 mb-2 line-clamp-1">
                        {match.tesisName || match.location || 'Maç'}
                      </h3>

                      {/* Location */}
                      <div className="flex items-center text-sm text-gray-600 mb-2">
                        <MapPin className="w-4 h-4 mr-1" />
                        <span className="truncate">{match.location || match.tesisName || 'Konum belirtilmemiş'}</span>
                      </div>

                      {/* Date & Time */}
                      <div className="flex items-center text-sm text-gray-600 mb-2">
                        <Calendar className="w-4 h-4 mr-1" />
                        <span>{formatDate(match.date)}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600 mb-3">
                        <Clock className="w-4 h-4 mr-1" />
                        <span>{match.timeSlot}</span>
                      </div>

                      {/* Price */}
                      <div className="flex items-center text-sm text-gray-600 mb-3">
                        <DollarSign className="w-4 h-4 mr-1" />
                        <span>{isFree ? 'Ücretsiz' : `₺${match.pricePerPlayer}/kişi`}</span>
                      </div>

                      {/* Level */}
                      <div className="mb-3">
                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                          🎯 {getLevelText(match.level)}
                        </span>
                      </div>

                      {/* Players */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center text-sm text-gray-600">
                          <Users className="w-4 h-4 mr-1" />
                          <span>Oyuncular ({match.currentPlayers}/{match.maxPlayers})</span>
                        </div>
                      </div>

                      {/* Player Avatars */}
                      <div className="flex items-center space-x-1 mb-4 flex-wrap">
                        {match.players.slice(0, 8).map((playerId, idx) => (
                          <div
                            key={idx}
                            className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-xs font-medium text-green-800"
                          >
                            {playerId === match.organizerId ? 'OY' : 'O'}
                          </div>
                        ))}
                        {match.players.length > 8 && (
                          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-xs font-medium text-gray-600">
                            +{match.players.length - 8}
                          </div>
                        )}
                        {Array.from({ length: Math.min(missingPlayers, 4) }).map((_, idx) => (
                          <div
                            key={`empty-${idx}`}
                            className="w-8 h-8 border-2 border-dashed border-gray-300 rounded-full flex items-center justify-center"
                          >
                            <Plus className="w-4 h-4 text-gray-400" />
                          </div>
                        ))}
                      </div>

                      {/* Organizer */}
                      <div className="flex items-center justify-between pt-3 border-t border-gray-200 mb-4">
                        <div className="flex items-center space-x-2">
                          {match.organizerAvatar ? (
                            <img
                              src={match.organizerAvatar}
                              alt={match.organizerName}
                              className="w-6 h-6 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                              <span className="text-xs font-medium text-green-800">
                                {match.organizerName?.charAt(0) || 'O'}
                              </span>
                            </div>
                          )}
                          <div>
                            <p className="text-xs font-medium text-gray-900">{match.organizerName}</p>
                            <div className="flex items-center space-x-1">
                              <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                              <span className="text-xs text-gray-600">
                                {match.organizerRating?.toFixed(1) || '4.0'} • {match.organizerMatchCount || 0} maç
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <button
                        onClick={() => {
                          setSelectedDetailMatch(match);
                          setShowDetailModal(true);
                        }}
                        className="w-full mb-2 px-4 py-2 border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-50 transition-colors font-medium text-sm flex items-center justify-center space-x-2"
                      >
                        <Users size={16} />
                        <span>Detay / Oyuncular</span>
                      </button>

                      {isOrganizer ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedMatch(match);
                              setShowEditModal(true);
                            }}
                            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm flex items-center justify-center space-x-2"
                          >
                            <Edit size={16} />
                            <span>Düzenle</span>
                          </button>
                          <button
                            onClick={() => {
                              setSelectedMatch(match);
                              setShowDeleteModal(true);
                            }}
                            className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors font-medium text-sm"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ) : isJoined ? (
                        <button
                          onClick={() => handleLeaveMatch(match.id)}
                          className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm flex items-center justify-center space-x-2"
                        >
                          <UserMinus size={16} />
                          <span>Ayrıl</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedMatch(match);
                            setShowJoinModal(true);
                          }}
                          className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm"
                        >
                          Katıl
                        </button>
                      )}
                    </>
                  ) : (
                    // List view - similar structure but horizontal
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">{getFormatIcon(match.format)}</span>
                        <h3 className="font-bold text-gray-900">{match.tesisName || match.location || 'Maç'}</h3>
                        {isUrgent && (
                          <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded-full">
                            🔥 Acil
                          </span>
                        )}
                        {isFree && (
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                            💰 Ücretsiz
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center">
                          <MapPin className="w-4 h-4 mr-1" />
                          <span>{match.location || match.tesisName}</span>
                        </div>
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          <span>{formatDate(match.date)}</span>
                        </div>
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          <span>{match.timeSlot}</span>
                        </div>
                        <div className="flex items-center">
                          <Users className="w-4 h-4 mr-1" />
                          <span>{match.currentPlayers}/{match.maxPlayers} ({missingPlayers} eksik)</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {viewMode === 'list' && (
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">
                          {isFree ? 'Ücretsiz' : `₺${match.pricePerPlayer}/kişi`}
                        </p>
                        <p className="text-xs text-gray-600">
                          🎯 {getLevelText(match.level)}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedDetailMatch(match);
                          setShowDetailModal(true);
                        }}
                        className="px-3 py-2 border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-50 transition-colors font-medium text-sm"
                      >
                        Detay
                      </button>
                      {isOrganizer ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedMatch(match);
                              setShowEditModal(true);
                            }}
                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedMatch(match);
                              setShowDeleteModal(true);
                            }}
                            className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors font-medium text-sm"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ) : isJoined ? (
                        <button
                          onClick={() => handleLeaveMatch(match.id)}
                          className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm"
                        >
                          Ayrıl
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedMatch(match);
                            setShowJoinModal(true);
                          }}
                          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm"
                        >
                          Katıl
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-xl">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {activeTab === 'organized' ? 'Henüz maç oluşturmadınız' : 
               activeTab === 'joined' ? 'Henüz maça katılmadınız' : 
               'Maç bulunamadı'}
            </h3>
            <p className="text-gray-600 mb-6">
              {activeTab === 'all' && 'Filtreleri değiştirerek tekrar deneyin'}
            </p>
            {activeTab === 'all' && (
              <button
                onClick={clearFilters}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                Filtreleri Temizle
              </button>
            )}
          </div>
              )) : (
                players.length > 0 ? (
                  <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
                     {players.map(player => (
                        <div key={player.uid || player.id} className={`bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow ${viewMode === 'list' ? 'flex items-center gap-6' : ''}`}>
                             <div className={`flex items-center gap-4 ${viewMode === 'grid' ? 'flex-col text-center' : ''}`}>
                                <div 
                                    className="w-20 h-20 rounded-full bg-gray-200 overflow-hidden flex-shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
                                    onClick={() => { setSelectedPlayer(player); setShowPlayerDetailModal(true); }}
                                >
                                    {player.profilePhoto?.url ? (
                                        <img src={player.profilePhoto.url} alt={player.displayName} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                                            <div className="w-10 h-10"><User size={40} /></div>
                                        </div>
                                    )}
                                </div>
                                <div className={viewMode === 'grid' ? 'w-full' : 'flex-1'}>
                                    <h3 
                                        className="font-bold text-gray-900 text-lg cursor-pointer hover:text-green-600 transition-colors"
                                        onClick={() => { setSelectedPlayer(player); setShowPlayerDetailModal(true); }}
                                    >
                                        {player.displayName}
                                    </h3>
                                    <p className="text-green-600 font-medium">{player.position || 'Mevki Yok'}</p>
                                    
                                    <div className={`flex items-center gap-2 mt-2 text-sm text-gray-600 ${viewMode === 'grid' ? 'justify-center' : ''}`}>
                                        <Star size={14} className="text-yellow-500 fill-yellow-500" />
                                        <span>
                                          {player.skillLevel === 'beginner' ? 'Başlangıç' : 
                                           player.skillLevel === 'intermediate' ? 'Orta' : 
                                           player.skillLevel === 'good' ? 'İyi' : 
                                           player.skillLevel === 'advanced' ? 'İleri' : 
                                           player.skillLevel === 'pro' ? 'Profesyonel' : 
                                           (player.skillLevel || 'Seviye Yok')}
                                        </span>
                                    </div>
                                    
                                    {player.distance && (
                                        <div className={`flex items-center gap-1 mt-1 text-xs text-gray-500 ${viewMode === 'grid' ? 'justify-center' : ''}`}>
                                            <MapPin size={12} />
                                            <span>{Math.round(player.distance)} km uzakta</span>
                                        </div>
                                    )}

                                    {viewMode === 'grid' && (
                                        <div className="mt-4">
                                            <button 
                                                className="w-full py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                                                onClick={() => navigate('/oyuncu/mesajlar', { state: { recipient: player } })}
                                            >
                                                Mesaj
                                            </button>
                                        </div>
                                    )}
                                </div>
                                {viewMode === 'list' && (
                                     <div className="flex gap-2">
                                     <div className="flex gap-2">
                                         <button 
                                            className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                                            onClick={() => navigate('/oyuncu/mesajlar', { state: { recipient: player } })}
                                        >
                                            Mesaj Gönder
                                        </button>
                                    </div>
                                    </div>
                                )}
                             </div>
                        </div>
                     ))}
                  </div>
                ) : (
                    <div className="text-center py-12 bg-white rounded-xl">
                        <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Oyuncu bulunamadı</h3>
                        <p className="text-gray-600 mb-6">Filtreleri değiştirerek tekrar deneyin</p>
                        <button onClick={clearFilters} className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium">
                        Filtreleri Temizle
                        </button>
                    </div>
                )
            )}
          </>
        )}
      </div>

      {/* Join Modal */}
      {showJoinModal && selectedMatch && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Maça Katıl</h3>
            <div className="space-y-3 mb-6">
              <div>
                <p className="text-sm text-gray-600">Maç</p>
                <p className="font-medium text-gray-900">{selectedMatch.tesisName || selectedMatch.location}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Tarih ve Saat</p>
                <p className="font-medium text-gray-900">
                  {formatDate(selectedMatch.date)} • {selectedMatch.timeSlot}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Ücret</p>
                <p className="font-medium text-gray-900">
                  {selectedMatch.pricePerPlayer === 0 ? 'Ücretsiz' : `₺${selectedMatch.pricePerPlayer}/kişi`}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Eksik Oyuncu</p>
                <p className="font-medium text-gray-900">
                  {getMissingPlayers(selectedMatch)} kişi
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setShowJoinModal(false);
                  setSelectedMatch(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                İptal
              </button>
              <button
                onClick={handleJoinMatch}
                disabled={joining}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {joining ? 'Katılıyor...' : 'Katıl'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && selectedMatch && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Maçı Sil</h3>
            <p className="text-gray-600 mb-6">
              Bu maçı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedMatch(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                İptal
              </button>
              <button
                onClick={handleDeleteMatch}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? 'Siliniyor...' : 'Sil'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Match Detail Modal */}
      <MatchDetailModal
        isOpen={showDetailModal}
        onClose={() => {
            setShowDetailModal(false);
            setSelectedDetailMatch(null);
        }}
        match={selectedDetailMatch}
        currentUser={user}
      />

      {/* Player Detail Modal */}
      <PlayerDetailModal
        isOpen={showPlayerDetailModal}
        onClose={() => {
            setShowPlayerDetailModal(false);
            setSelectedPlayer(null);
        }}
        player={selectedPlayer}
        currentUser={user}
      />

      {/* Edit Match Modal */}
      {showEditModal && selectedMatch && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
                 <h3 className="text-xl font-bold text-gray-900">Maçı Düzenle</h3>
                 <button onClick={() => setShowEditModal(false)} className="text-gray-500 hover:text-gray-700">
                    <X size={24} />
                 </button>
            </div>
            
            <form onSubmit={handleUpdateMatch} className="space-y-4">
               <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Maç Başlığı</label>
                  <input 
                    type="text" 
                    value={editFormData.title}
                    onChange={(e) => setEditFormData({...editFormData, title: e.target.value})}
                    placeholder="Opsiyonel (Örn: Haftasonu Maçı)"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-green-500 focus:border-green-500"
                  />
               </div>

               <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Yer (Düzenlenemez)</label>
                  <div className="text-gray-900 font-bold p-2 bg-gray-50 rounded border border-gray-200">
                     {selectedMatch.tesisName || selectedMatch.location}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Yeri değiştirmek için maçı silip yeniden oluşturmalısınız.</p>
               </div>

               <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tarih</label>
                      <input 
                        type="date" 
                        required 
                        value={editFormData.date}
                        onChange={(e) => setEditFormData({...editFormData, date: e.target.value})}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-green-500 focus:border-green-500"
                      />
                   </div>
                   <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Saat</label>
                      <input 
                        type="time" 
                        required 
                        value={editFormData.timeSlot}
                        onChange={(e) => setEditFormData({...editFormData, timeSlot: e.target.value})}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-green-500 focus:border-green-500"
                      />
                   </div>
               </div>

               <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Ücret (Kişi Başı)</label>
                      <input 
                        type="number" 
                        min="0"
                        value={editFormData.pricePerPlayer}
                        onChange={(e) => setEditFormData({...editFormData, pricePerPlayer: parseInt(e.target.value) || 0})}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-green-500 focus:border-green-500"
                      />
                   </div>
                   <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Max Oyuncu</label>
                      <input 
                        type="number" 
                        min="2"
                        max="30"
                        value={editFormData.maxPlayers}
                        onChange={(e) => setEditFormData({...editFormData, maxPlayers: parseInt(e.target.value) || 14})}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-green-500 focus:border-green-500"
                      />
                   </div>
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Seviye</label>
                      <select 
                        value={editFormData.level}
                        onChange={(e) => setEditFormData({...editFormData, level: e.target.value})}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-green-500 focus:border-green-500"
                      >
                          <option value="beginner">Başlangıç</option>
                          <option value="intermediate">Orta</option>
                          <option value="good">İyi</option>
                          <option value="advanced">İleri</option>
                          <option value="mixed">Karışık</option>
                      </select>
                  </div>
                  <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
                      <select 
                        value={editFormData.format}
                        onChange={(e) => setEditFormData({...editFormData, format: e.target.value})}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-green-500 focus:border-green-500"
                      >
                          <option value="football">Halı Saha</option>
                          <option value="basketball">Basketbol</option>
                          <option value="tennis">Tenis</option>
                          <option value="volleyball">Voleybol</option>
                      </select>
                  </div>
               </div>

               <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
                  <textarea 
                    rows="3"
                    value={editFormData.description}
                    onChange={(e) => setEditFormData({...editFormData, description: e.target.value})}
                    placeholder="Maç hakkında notlar..."
                    className="w-full px-3 py-2 border rounded-lg focus:ring-green-500 focus:border-green-500"
                  ></textarea>
               </div>

               <div className="flex gap-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    disabled={editing}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {editing ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                    Güncelle
                  </button>
               </div>
            </form>
          </div>
        </div>
      )}

      {/* Location Selector Modal */}
      <LocationSelectorModal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        onLocationSelected={handleLocationSelected}
      />
    </div>
  );
};

export default OyuncuBul;

