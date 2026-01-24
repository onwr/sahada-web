import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Icon, DivIcon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '../styles/map.css';
import Header from '../components/Header';

import LocationSelectorModal from '../components/LocationSelectorModal';
import { getAllTesisler } from '../services/firestoreService';
import { getLocationByIP, getCityCoordinates } from '../utils/locationService';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  MapPin, Search, Star, Clock, DollarSign, Users, Filter,
  Navigation, Car, Droplet, Lightbulb, ChevronRight, X, User
} from 'lucide-react';
import toast from '../utils/toast';

// Leaflet default icon sorununu düzelt
import L from 'leaflet';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Marker ikonları oluştur (DivIcon kullanarak emoji desteği)
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
  'Yüzme': createCustomIcon('#0ea5e9', '🏊'),
  'default': createCustomIcon('#6b7280', '📍'),
};

// ... (lines 66-583 remain unchanged)

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

// Oyuncu marker ikonu
const playerIcon = new DivIcon({
  html: `
    <div style="
      width: 32px;
      height: 32px;
      background-color: #8b5cf6;
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
    ">👤</div>
  `,
  className: 'player-marker',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

// Harita merkezini güncelleme component'i
const MapUpdater = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
};

const YakinSahalar = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [userLocation, setUserLocation] = useState({ lat: 41.0082, lng: 28.9784 }); // İstanbul default
  const [mapCenter, setMapCenter] = useState({ lat: 41.0082, lng: 28.9784 });
  const [mapZoom, setMapZoom] = useState(12);
  const [mapLayer, setMapLayer] = useState('satellite'); // 'standard' veya 'satellite' - varsayılan uydu
  const [viewMode, setViewMode] = useState('both'); // 'facilities', 'players', 'both'
  const [tesisler, setTesisler] = useState([]);
  const [filteredTesisler, setFilteredTesisler] = useState([]);
  const [oyuncular, setOyuncular] = useState([]);
  const [filteredOyuncular, setFilteredOyuncular] = useState([]);
  const [selectedTesis, setSelectedTesis] = useState(null);
  const [selectedOyuncu, setSelectedOyuncu] = useState(null);
  const [loading, setLoading] = useState(true);
  const [locationLoading, setLocationLoading] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  
  // Filtreler
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [sportFilter, setSportFilter] = useState('Tümü');
  const [featureFilters, setFeatureFilters] = useState({
    nightLighting: false,
    parking: false,
    shower: false,
  });
  const [sortBy, setSortBy] = useState('distance'); // distance, rating, price-low, price-high


  useEffect(() => {
    getUserLocation();
    loadTesisler();
    setupRealtimeListener();
    setupPlayersListener();
  }, []);

  // Sync with URL params
  useEffect(() => {
    const s = searchParams.get('search');
    if (s !== null) {
      setSearchQuery(s);
    }
    const v = searchParams.get('view');
    if (v === 'facilities' || v === 'players' || v === 'both') {
      setViewMode(v);
    }
    const sp = searchParams.get('sport');
    if (sp) {
      setSportFilter(sp);
    }
  }, [searchParams]);

  useEffect(() => {
    applyFilters();
    applyPlayerFilters();
  }, [tesisler, oyuncular, searchQuery, sportFilter, featureFilters, sortBy, userLocation, viewMode]);

  // Center map on search results or city name
  useEffect(() => {
    if (searchQuery && !loading) {
      if (viewMode === 'players' && filteredOyuncular.length > 0) {
        setMapCenter({ 
          lat: filteredOyuncular[0].latitude, 
          lng: filteredOyuncular[0].longitude 
        });
        setMapZoom(13);
      } else if (filteredTesisler.length > 0) {
        setMapCenter({ 
          lat: filteredTesisler[0].latitude, 
          lng: filteredTesisler[0].longitude 
        });
        setMapZoom(13);
      } else {
        // If no direct results found, check if it's a known city name
        const cityData = getCityCoordinates(searchQuery);
        if (cityData.success) {
          setMapCenter({ lat: cityData.lat, lng: cityData.lng });
          setMapZoom(11);
        }
      }
    }
  }, [searchQuery, filteredTesisler.length, filteredOyuncular.length, loading]);

  const getUserLocation = async () => {
    setLocationLoading(true);
    
    // Önce GPS ile dene
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          // Konum doğruluğunu kontrol et
          const accuracy = position.coords.accuracy; // metre cinsinden
          if (accuracy > 1000) {
            toast('Konum doğruluğu düşük. Alternatif yöntem deneniyor...', { icon: '⚠️', duration: 3000 });
            // IP servisi dene
            tryIPLocation();
          } else if (accuracy > 100) {
            toast('Konum doğruluğu orta seviyede.', { icon: '⚠️', duration: 3000 });
          }
          setUserLocation({ lat: latitude, lng: longitude });
          setMapCenter({ lat: latitude, lng: longitude });
          setLocationLoading(false);
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
        setLocationLoading(false);
      } else {
        // IP servisi de başarısız, modal aç
        setLocationLoading(false);
        setShowLocationModal(true);
      }
    } catch (error) {
      console.error('IP konum hatası:', error);
      setLocationLoading(false);
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
      toast.error('Tesisler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeListener = () => {
    const tesislerRef = collection(db, 'tesisler');
    const q = query(tesislerRef, where('status', '==', 'active'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tesislerData = [];
      snapshot.forEach((doc) => {
        tesislerData.push({
          id: doc.id,
          ...doc.data()
        });
      });

      const tesislerWithDistance = tesislerData.map(tesis => ({
        ...tesis,
        distance: calculateDistance(
          userLocation.lat,
          userLocation.lng,
          tesis.latitude || 0,
          tesis.longitude || 0
        )
      }));

      setTesisler(tesislerWithDistance);
      setLoading(false);
    }, (error) => {
      console.error('Real-time listener hatası:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  };

  const setupPlayersListener = () => {
    const usersRef = collection(db, 'users');
    // onboardingCompleted filtresini kaldırdık, sadece userType kontrolü yapıyoruz
    const q = query(
      usersRef, 
      where('userType', '==', 'player')
    );

    console.log('🔍 Oyuncu listener kuruluyor...');

    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log(`📊 Toplam ${snapshot.size} oyuncu bulundu`);
      
      const oyuncularData = [];
      let skippedCount = 0;
      let withLocationCount = 0;
      let withCityCount = 0;
      let withoutLocationCount = 0;
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        let lat = data.latitude;
        let lng = data.longitude;
        let hasLocation = false;
        
        // Önce GPS koordinatlarını kontrol et
        if (lat && lng && typeof lat === 'number' && typeof lng === 'number') {
          withLocationCount++;
          hasLocation = true;
        } else {
          // GPS yoksa şehir bilgisini kontrol et
          const city = data.city || data.district || '';
          if (city) {
            const cityCoords = getCityCoordinates(city, data.district);
            if (cityCoords.lat && cityCoords.lng) {
              lat = cityCoords.lat;
              lng = cityCoords.lng;
              withCityCount++;
              hasLocation = true;
            }
          }
        }

        // Konum bilgisi yoksa varsayılan konum kullan (kullanıcının konumuna yakın)
        if (!hasLocation) {
          // Kullanıcının konumunu kullan veya İstanbul varsayılan
          lat = userLocation.lat || 41.0082;
          lng = userLocation.lng || 28.9784;
          withoutLocationCount++;
          console.log(`⚠️ Konum bilgisi yok, varsayılan kullanılıyor: ${data.fullName || data.displayName || doc.id}`);
        }

        // Mesafe hesaplama (konum varsa)
        const distance = hasLocation 
          ? calculateDistance(userLocation.lat, userLocation.lng, lat, lng)
          : null; // Konum yoksa mesafe null

        oyuncularData.push({
          id: doc.id,
          ...data,
          latitude: lat,
          longitude: lng,
          distance: distance,
          hasLocation: hasLocation // Konum bilgisi var mı flag'i
        });
      });

      console.log(`✅ İşlenen oyuncular: ${oyuncularData.length}`);
      console.log(`   - GPS konumlu: ${withLocationCount}`);
      console.log(`   - Şehir bazlı konum: ${withCityCount}`);
      console.log(`   - Konum bilgisi olmayan (varsayılan): ${withoutLocationCount}`);
      
      setOyuncular(oyuncularData);
    }, (error) => {
      console.error('❌ Oyuncu listener hatası:', error);
    });

    return () => {
      console.log('🔌 Oyuncu listener kapatılıyor...');
      unsubscribe();
    };
  };

  // Haversine formülü ile mesafe hesaplama (km)
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

  const applyFilters = () => {
    let filtered = [...tesisler];

    // Arama filtresi
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(tesis =>
        tesis.name?.toLowerCase().includes(query) ||
        tesis.location?.toLowerCase().includes(query) ||
        tesis.address?.toLowerCase().includes(query)
      );
    }

    // Spor türü filtresi
    if (sportFilter !== 'Tümü') {
      filtered = filtered.filter(tesis => tesis.type === sportFilter);
    }

    // Özellik filtreleri
    if (featureFilters.nightLighting) {
      filtered = filtered.filter(tesis => tesis.facilities?.includes('Gece Aydınlatma'));
    }
    if (featureFilters.parking) {
      filtered = filtered.filter(tesis => tesis.facilities?.includes('Otopark'));
    }
    if (featureFilters.shower) {
      filtered = filtered.filter(tesis => tesis.facilities?.includes('Duş'));
    }

    // Mesafe hesaplama
    filtered = filtered.map(tesis => ({
      ...tesis,
      distance: calculateDistance(
        userLocation.lat,
        userLocation.lng,
        tesis.latitude || 0,
        tesis.longitude || 0
      )
    }));

    // Sıralama
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'distance':
          return a.distance - b.distance;
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        case 'price-low':
          return (a.price || 0) - (b.price || 0);
        case 'price-high':
          return (b.price || 0) - (a.price || 0);
        default:
          return 0;
      }
    });

    setFilteredTesisler(filtered);
  };

  const applyPlayerFilters = () => {
    let filtered = [...oyuncular];

    // Arama filtresi
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(oyuncu =>
        oyuncu.fullName?.toLowerCase().includes(query) ||
        oyuncu.displayName?.toLowerCase().includes(query) ||
        oyuncu.city?.toLowerCase().includes(query) ||
        oyuncu.district?.toLowerCase().includes(query)
      );
    }

    // Spor türü filtresi
    if (sportFilter !== 'Tümü') {
      filtered = filtered.filter(oyuncu => {
        const favoriteSports = oyuncu.favoriteSports || [];
        const sportMap = {
          'Futbol': 'football',
          'Basketbol': 'basketball',
          'Tenis': 'tennis',
          'Voleybol': 'volleyball',
          'Yüzme': 'swimming'
        };
        return favoriteSports.includes(sportMap[sportFilter]);
      });
    }

// ... (lines 471-765)

            {/* Spor türü filtreleri */}
            <div className="flex flex-wrap gap-2">
              {['Tümü', 'Futbol', 'Basketbol', 'Tenis', 'Voleybol', 'Yüzme'].map((sport) => (
                <button
                  key={sport}
                  onClick={() => setSportFilter(sport)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    sportFilter === sport
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {sport === 'Futbol' && '⚽ '}
                  {sport === 'Basketbol' && '🏀 '}
                  {sport === 'Tenis' && '🎾 '}
                  {sport === 'Voleybol' && '🏐 '}
                  {sport === 'Yüzme' && '🏊 '}
                  {sport}
                </button>
              ))}
            </div>

    // Mesafe hesaplama
    filtered = filtered.map(oyuncu => ({
      ...oyuncu,
      distance: calculateDistance(
        userLocation.lat,
        userLocation.lng,
        oyuncu.latitude || 0,
        oyuncu.longitude || 0
      )
    }));

    // Sıralama
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'distance':
          return a.distance - b.distance;
        default:
          return 0;
      }
    });

    setFilteredOyuncular(filtered);
  };

  const handleTesisClick = (tesis) => {
    setSelectedTesis(tesis);
    if (tesis.latitude && tesis.longitude) {
      setMapCenter({ lat: tesis.latitude, lng: tesis.longitude });
      setMapZoom(15);
    }
  };

  const handleMarkerClick = (tesis) => {
    handleTesisClick(tesis);
    // Scroll to tesis in list
    const element = document.getElementById(`tesis-${tesis.id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleOyuncuClick = (oyuncu) => {
    setSelectedOyuncu(oyuncu);
    if (oyuncu.latitude && oyuncu.longitude) {
      setMapCenter({ lat: oyuncu.latitude, lng: oyuncu.longitude });
      setMapZoom(15);
    }
  };

  const handlePlayerMarkerClick = (oyuncu) => {
    handleOyuncuClick(oyuncu);
    // Scroll to player in list
    const element = document.getElementById(`oyuncu-${oyuncu.id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const getSportIcon = (type) => {
    return sportIcons[type] || sportIcons.default;
  };

  const toggleFeatureFilter = (feature) => {
    setFeatureFilters(prev => ({
      ...prev,
      [feature]: !prev[feature]
    }));
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSportFilter('Tümü');
    setFeatureFilters({
      nightLighting: false,
      parking: false,
      shower: false,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="flex flex-col lg:flex-row h-[calc(100vh-80px)]">
        {/* Sol Taraf - Harita */}
        <div className="flex-1 relative h-96 lg:h-full">
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
            zoomControl={false}
          >
            {mapLayer === 'standard' ? (
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
            ) : (
              <TileLayer
                attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                maxZoom={19}
              />
            )}
            
            <MapUpdater center={mapCenter} zoom={mapZoom} />
            
            {/* Kullanıcı konumu */}
            <Marker position={userLocation} icon={userLocationIcon}>
              <Popup>Konumunuz</Popup>
            </Marker>
            
            {/* Tesis marker'ları */}
            {(viewMode === 'facilities' || viewMode === 'both') && filteredTesisler.map((tesis) => {
              if (!tesis.latitude || !tesis.longitude) return null;
              
              return (
                <Marker
                  key={`tesis-${tesis.id}`}
                  position={[tesis.latitude, tesis.longitude]}
                  icon={getSportIcon(tesis.type)}
                  eventHandlers={{
                    click: () => handleMarkerClick(tesis),
                  }}
                >
                  <Popup className="custom-popup-clean" maxWidth={280} minWidth={260} closeButton={false}>
                    <div className="flex flex-col overflow-hidden rounded-lg bg-white shadow-md font-sans">
                      {/* Kapak Resmi Alanı */}
                      <div className="relative h-24 bg-gray-100 flex-shrink-0">
                        {tesis.images && tesis.images.length > 0 ? (
                          <img 
                            src={tesis.images[0]} 
                            alt={tesis.name} 
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        {/* Fallback pattern / icon */}
                        <div className={`w-full h-full absolute inset-0 flex items-center justify-center bg-gray-50 ${tesis.images && tesis.images.length > 0 ? 'hidden' : 'flex'}`}>
                           <span className="text-3xl filter grayscale opacity-40">
                              {tesis.type === 'Futbol' && '⚽'}
                              {tesis.type === 'Basketbol' && '🏀'}
                              {tesis.type === 'Tenis' && '🎾'}
                              {tesis.type === 'Voleybol' && '🏐'}
                              {tesis.type === 'Yüzme' && '🏊'}
                           </span>
                        </div>
                        
                        <div className="absolute top-2 right-2 flex gap-1">
                          <span className="bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-bold shadow-sm text-gray-800 border border-gray-100 uppercase tracking-wide">
                            {tesis.type}
                          </span>
                        </div>
                      </div>

                      <div className="p-3">
                        {/* Başlık */}
                        <div className="flex justify-between items-start mb-1 gap-2">
                           <h3 className="font-bold text-gray-900 text-sm leading-snug line-clamp-2">{tesis.name}</h3>
                           <div className="flex items-center gap-0.5 bg-yellow-50 px-1.5 py-0.5 rounded border border-yellow-100 shrink-0">
                              <Star size={10} className="text-yellow-500" fill="currentColor" />
                              <span className="text-yellow-700 text-[10px] font-bold">
                                {tesis.rating ? Number(tesis.rating).toFixed(1) : 'Yeni'}
                              </span>
                           </div>
                        </div>

                        {/* Konum ve Navigasyon */}
                        <div className="flex items-center justify-between gap-2 mb-2.5">
                          <div className="flex items-center gap-1 text-gray-500 overflow-hidden">
                            <MapPin size={12} className="shrink-0" />
                            <span className="text-[11px] truncate">
                              {tesis.location || tesis.address || 'Konum bilgisi yok'}
                            </span>
                          </div>
                          <a 
                            href={`https://www.google.com/maps/dir/?api=1&destination=${tesis.latitude},${tesis.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 px-2 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors text-[10px] font-bold flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Navigation size={10} fill="currentColor" />
                            Yol Tarifi
                          </a>
                        </div>

                        {/* Fiyat & Uzaklık Row */}
                        <div className="flex items-center justify-between text-xs mb-3 pt-2 border-t border-gray-50">
                          <div className="flex items-center gap-1.5 font-bold text-green-700 bg-green-50 px-2 py-1 rounded">
                             <DollarSign size={12} />
                             {tesis.price}₺
                             <span className="text-green-600/70 font-normal">/saat</span>
                          </div>
                          <div className="flex items-center gap-1 text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded">
                             <Navigation size={10} />
                             {tesis.distance.toFixed(1)} km
                          </div>
                        </div>

                        {/* Buton */}
                        <button 
                          onClick={() => {
                            handleTesisClick(tesis);
                            navigate(`/saha-detay/${tesis.id}`);
                          }}
                          className="w-full py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-md text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1 group"
                        >
                          İncele
                          <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
            
            {/* Oyuncu marker'ları */}
            {(viewMode === 'players' || viewMode === 'both') && filteredOyuncular.map((oyuncu) => {
              if (!oyuncu.latitude || !oyuncu.longitude) return null;
              
              return (
                <Marker
                  key={`oyuncu-${oyuncu.id}`}
                  position={[oyuncu.latitude, oyuncu.longitude]}
                  icon={playerIcon}
                  eventHandlers={{
                    click: () => handlePlayerMarkerClick(oyuncu),
                  }}
                >
                  <Popup className="custom-popup-clean" maxWidth={260} minWidth={240} closeButton={false}>
                    <div className="flex flex-col overflow-hidden rounded-lg bg-white shadow-md font-sans">
                      <div className="p-3">
                        <div className="flex items-center gap-3 mb-3 pb-3 border-b border-gray-50">
                          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-lg shadow-sm border border-purple-200 shrink-0">
                            👤
                          </div>
                          <div className="overflow-hidden">
                            <h3 className="font-bold text-gray-900 text-sm truncate">
                              {oyuncu.fullName || oyuncu.displayName || 'İsimsiz Oyuncu'}
                            </h3>
                            <div className="flex items-center gap-1 text-gray-500 mt-0.5">
                              <MapPin size={10} className="shrink-0" />
                              <span className="text-[10px] truncate">
                                {[oyuncu.district, oyuncu.city].filter(Boolean).join(', ') || 'Konum belirtilmedi'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="mb-3">
                          <div className="flex flex-wrap gap-1.5">
                            {oyuncu.favoriteSports && oyuncu.favoriteSports.length > 0 ? (
                              oyuncu.favoriteSports.slice(0, 3).map((sport, idx) => {
                                const sportDetails = {
                                  'football': { label: 'Futbol', emoji: '⚽', class: 'bg-green-50 text-green-700 border-green-100' },
                                  'basketball': { label: 'Basketbol', emoji: '🏀', class: 'bg-orange-50 text-orange-700 border-orange-100' },
                                  'tennis': { label: 'Tenis', emoji: '🎾', class: 'bg-blue-50 text-blue-700 border-blue-100' },
                                  'volleyball': { label: 'Voleybol', emoji: '🏐', class: 'bg-purple-50 text-purple-700 border-purple-100' },
                                  'swimming': { label: 'Yüzme', emoji: '🏊', class: 'bg-cyan-50 text-cyan-700 border-cyan-100' },
                                };
                                const d = sportDetails[sport] || { label: sport, emoji: '', class: 'bg-gray-50 text-gray-600 border-gray-100' };
                                
                                return (
                                  <span key={idx} className={`px-1.5 py-0.5 rounded border text-[10px] font-medium flex items-center gap-1 ${d.class}`}>
                                    {d.label}
                                  </span>
                                );
                              })
                            ) : (
                              <span className="text-[10px] text-gray-400 italic">Spor belirtilmedi</span>
                            )}
                            {oyuncu.favoriteSports && oyuncu.favoriteSports.length > 3 && (
                               <span className="px-1.5 py-0.5 rounded border border-gray-100 bg-gray-50 text-[10px] text-gray-500">+{oyuncu.favoriteSports.length - 3}</span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-center pt-2 border-t border-gray-50">
                          <div className="flex items-center gap-1 text-blue-600 font-bold text-[11px]">
                             <Navigation size={10} />
                             {oyuncu.distance.toFixed(1)} km
                          </div>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/oyuncu-detay/${oyuncu.id}`);
                            }}
                            className="text-xs text-purple-600 font-bold hover:text-purple-700 hover:underline transition-all flex items-center gap-0.5"
                          >
                            Profili Gör &rarr;
                          </button>
                        </div>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>

          {/* Harita kontrolleri */}
          <div className="absolute top-20 left-4 z-[1000] flex flex-col gap-2">
            <button
              onClick={getUserLocation}
              disabled={locationLoading}
              className="p-2.5 bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700 transition-all hover:scale-110 active:scale-95 disabled:opacity-50"
              title="Konumum"
            >
              <Navigation size={22} fill="currentColor" />
            </button>
            <div className="flex flex-col bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
              <button
                onClick={() => setMapZoom(mapZoom + 1)}
                className="p-2.5 hover:bg-gray-50 transition-colors border-b border-gray-100 font-bold text-lg text-gray-600"
                title="Yakınlaştır"
              >
                +
              </button>
              <button
                onClick={() => setMapZoom(mapZoom - 1)}
                className="p-2.5 hover:bg-gray-50 transition-colors font-bold text-lg text-gray-600"
                title="Uzaklaştır"
              >
                −
              </button>
            </div>
          </div>

          {/* Harita Katmanı Değiştirme */}
          <div className="absolute top-4 right-4 z-[1000] bg-white rounded-lg shadow-lg p-2 flex flex-col gap-2">
            <button
              onClick={() => setMapLayer('standard')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                mapLayer === 'standard'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title="Standart Harita"
            >
              Standart
            </button>
            <button
              onClick={() => setMapLayer('satellite')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                mapLayer === 'satellite'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title="Uydu Görünümü"
            >
              Uydu
            </button>
          </div>
        </div>

        {/* Sağ Taraf - Liste */}
        <div className="w-full lg:w-96 bg-white border-t lg:border-t-0 lg:border-l border-gray-200 flex flex-col h-96 lg:h-full">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-900 mb-3">Yakındakiler</h1>
            
            {/* Görünüm Modu Toggle */}
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setViewMode('facilities')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'facilities'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Sahalar ({filteredTesisler.length})
              </button>
              <button
                onClick={() => setViewMode('players')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'players'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Oyuncular ({filteredOyuncular.length})
              </button>
              <button
                onClick={() => setViewMode('both')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'both'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Hepsini
              </button>
            </div>
            
            <p className="text-sm text-gray-600">
              {viewMode === 'facilities' && `${filteredTesisler.length} tesis bulundu`}
              {viewMode === 'players' && `${filteredOyuncular.length} oyuncu bulundu`}
              {viewMode === 'both' && `${filteredTesisler.length} tesis, ${filteredOyuncular.length} oyuncu bulundu`}
            </p>
          </div>

          {/* Arama ve Filtreler */}
          <div className="p-4 border-b border-gray-200 space-y-3">
            {/* Arama */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Saha adı veya konum ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* Spor türü filtreleri */}
            <div className="flex flex-wrap gap-2">
              {['Tümü', 'Futbol', 'Basketbol', 'Tenis', 'Voleybol'].map((sport) => (
                <button
                  key={sport}
                  onClick={() => setSportFilter(sport)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    sportFilter === sport
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {sport === 'Futbol' && '⚽ '}
                  {sport === 'Basketbol' && '🏀 '}
                  {sport === 'Tenis' && '🎾 '}
                  {sport === 'Voleybol' && '🏐 '}
                  {sport}
                </button>
              ))}
            </div>

            {/* Özellik filtreleri */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => toggleFeatureFilter('nightLighting')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                  featureFilters.nightLighting
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Lightbulb size={14} />
                Gece Aydınlatma
              </button>
              <button
                onClick={() => toggleFeatureFilter('parking')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                  featureFilters.parking
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Car size={14} />
                Otopark
              </button>
              <button
                onClick={() => toggleFeatureFilter('shower')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                  featureFilters.shower
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Droplet size={14} />
                Duş
              </button>
            </div>

            {/* Sıralama */}
            <div className="flex items-center gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
              >
                <option value="distance">En Yakın</option>
                <option value="rating">En Yüksek Puan</option>
                <option value="price-low">En Düşük Fiyat</option>
                <option value="price-high">En Yüksek Fiyat</option>
              </select>
              {(searchQuery || sportFilter !== 'Tümü' || Object.values(featureFilters).some(v => v)) && (
                <button
                  onClick={clearFilters}
                  className="p-2 text-gray-600 hover:text-gray-900"
                  title="Filtreleri Temizle"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          </div>

          {/* Liste */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-600">Yükleniyor...</p>
                </div>
              </div>
            ) : (
              <>
                {/* Tesis Listesi */}
                {(viewMode === 'facilities' || viewMode === 'both') && filteredTesisler.length > 0 && (
                  <div className="divide-y divide-gray-200">
                    {filteredTesisler.map((tesis) => (
                  <div
                    key={tesis.id}
                    id={`tesis-${tesis.id}`}
                    onClick={() => handleTesisClick(tesis)}
                    className={`p-4 cursor-pointer transition-all border-b border-gray-100 ${
                      selectedTesis?.id === tesis.id
                        ? 'bg-green-50/50 border-l-4 border-green-600 shadow-sm'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex flex-col">
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-lg shrink-0">
                            {tesis.type === 'Futbol' && '⚽'}
                            {tesis.type === 'Basketbol' && '🏀'}
                            {tesis.type === 'Tenis' && '🎾'}
                            {tesis.type === 'Voleybol' && '🏐'}
                            {tesis.type === 'Yüzme' && '🏊'}
                          </span>
                          <h3 className="font-bold text-gray-900 truncate">{tesis.name}</h3>
                        </div>
                        <div className="flex items-center gap-0.5 bg-yellow-50 px-1.5 py-0.5 rounded border border-yellow-100 shrink-0">
                          <Star size={10} className="text-yellow-500" fill="currentColor" />
                          <span className="text-yellow-700 text-[10px] font-bold">
                            {tesis.rating ? Number(tesis.rating).toFixed(1) : '0'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center text-xs text-gray-500 mb-3 ml-7">
                        <MapPin size={12} className="mr-0.5 shrink-0" />
                        <span className="truncate">{tesis.location || 'Konum bilgisi yok'}</span>
                      </div>

                      <div className="flex items-center justify-between ml-7">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-100">
                            ₺{tesis.price}/sa
                          </span>
                          <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                            {tesis.distance.toFixed(1)} km
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Alt Taraf - Özellikler (Opsiyonel, sadece seçiliyse daha çok şey gösterelim) */}
                    {selectedTesis?.id === tesis.id && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                         {tesis.facilities?.slice(0, 3).map((f, i) => (
                           <span key={i} className="px-2 py-0.5 bg-white border border-gray-200 text-[10px] text-gray-600 rounded">
                             {f}
                           </span>
                         ))}
                      </div>
                    )}

                    {/* Butonlar */}
                    <div className="mt-4 flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/rezervasyon/${tesis.id}`);
                        }}
                        className="flex-1 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-xs font-bold shadow-sm"
                      >
                        Rezerve Et
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/saha-detay/${tesis.id}`);
                        }}
                        className="p-1.5 bg-white border border-gray-200 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                        title="Detaylar"
                      >
                        <ChevronRight size={16} />
                      </button>
                      <a 
                        href={`https://www.google.com/maps/dir/?api=1&destination=${tesis.latitude},${tesis.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-md hover:bg-blue-100 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                        title="Yol Tarifi"
                      >
                        <Navigation size={16} />
                      </a>
                    </div>
                  </div>
                    ))}
                  </div>
                )}

                {/* Oyuncu Listesi */}
                {(viewMode === 'players' || viewMode === 'both') && filteredOyuncular.length > 0 && (
                  <div className={`divide-y divide-gray-200 ${viewMode === 'both' && filteredTesisler.length > 0 ? 'border-t-2 border-purple-200 pt-4 mt-4' : ''}`}>
                    {filteredOyuncular.map((oyuncu) => (
                      <div
                        key={oyuncu.id}
                        id={`oyuncu-${oyuncu.id}`}
                        onClick={() => handleOyuncuClick(oyuncu)}
                        className={`p-4 cursor-pointer transition-all border-b border-gray-100 ${
                          selectedOyuncu?.id === oyuncu.id
                            ? 'bg-purple-50/50 border-l-4 border-purple-600 shadow-sm'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            {oyuncu.photoURL ? (
                              <img
                                src={oyuncu.photoURL}
                                alt={oyuncu.fullName || oyuncu.displayName}
                                className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-sm"
                              />
                            ) : (
                              <div className="w-14 h-14 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 text-xl border-2 border-white shadow-sm">
                                👤
                              </div>
                            )}
                            {oyuncu.rating && (
                              <div className="absolute -bottom-1 -right-1 bg-white px-1.5 py-0.5 rounded-full border border-purple-100 shadow-xs flex items-center gap-0.5 scale-90">
                                <Star size={8} className="text-yellow-500 fill-yellow-500" />
                                <span className="text-[8px] font-bold text-gray-700">{Number(oyuncu.rating).toFixed(1)}</span>
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-gray-900 truncate">
                              {oyuncu.fullName || oyuncu.displayName || 'İsimsiz Oyuncu'}
                            </h3>
                            <div className="flex items-center text-[11px] text-gray-500 mt-0.5 gap-2">
                              <div className="flex items-center gap-0.5 truncate max-w-[120px]">
                                <MapPin size={10} className="shrink-0" />
                                <span className="truncate">{[oyuncu.district, oyuncu.city].filter(Boolean).join(', ') || 'Konum yok'}</span>
                              </div>
                              <div className="flex items-center gap-0.5 text-purple-600 font-bold shrink-0">
                                <Navigation size={10} className="shrink-0" />
                                <span>{oyuncu.distance.toFixed(1)} km</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {oyuncu.favoriteSports && oyuncu.favoriteSports.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {oyuncu.favoriteSports.map((sport, idx) => {
                              const sportNames = { 
                                'football': { emoji: '⚽', name: 'Futbol' }, 
                                'basketball': { emoji: '🏀', name: 'Basketbol' }, 
                                'tennis': { emoji: '🎾', name: 'Tenis' }, 
                                'volleyball': { emoji: '🏐', name: 'Voleybol' },
                                'swimming': { emoji: '🏊', name: 'Yüzme' } 
                              };
                              const sportInfo = sportNames[sport] || { emoji: '🏃', name: sport };
                              return (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full"
                                >
                                  {sportInfo.emoji} {sportInfo.name}
                                </span>
                              );
                            })}
                          </div>
                        )}

                        {oyuncu.sportPreferences && oyuncu.sportPreferences.length > 0 && (
                          <div className="text-xs text-gray-500 mt-2">
                            {oyuncu.sportPreferences.map((pref, idx) => {
                              if (!pref.skillLevel && !pref.position) return null;
                              
                              // Seviye çevirisi
                              const skillLevelTranslations = {
                                'beginner': 'Başlangıç',
                                'amateur': 'Amatör',
                                'intermediate': 'Orta',
                                'advanced': 'İleri',
                                'professional': 'Profesyonel'
                              };
                              const translatedLevel = skillLevelTranslations[pref.skillLevel] || pref.skillLevel;
                              
                              return (
                                <div key={idx} className="mb-1">
                                  {pref.skillLevel && <span>Seviye: {translatedLevel}</span>}
                                  {pref.skillLevel && pref.position && <span className="mx-1">•</span>}
                                  {pref.position && <span>Pozisyon: {pref.position}</span>}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/oyuncu-detay/${oyuncu.id}`);
                          }}
                          className="w-full mt-3 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                        >
                          Profili Görüntüle
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Boş Durum */}
                {((viewMode === 'facilities' && filteredTesisler.length === 0) ||
                  (viewMode === 'players' && filteredOyuncular.length === 0) ||
                  (viewMode === 'both' && filteredTesisler.length === 0 && filteredOyuncular.length === 0)) && (
                  <div className="flex items-center justify-center h-full p-8">
                    <div className="text-center">
                      <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {viewMode === 'facilities' && 'Tesis Bulunamadı'}
                        {viewMode === 'players' && 'Oyuncu Bulunamadı'}
                        {viewMode === 'both' && 'Sonuç Bulunamadı'}
                      </h3>
                      <p className="text-gray-600 mb-4">Filtreleri değiştirerek tekrar deneyin</p>
                      <button
                        onClick={clearFilters}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Filtreleri Temizle
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>


      
      {/* Location Selector Modal */}
      <LocationSelectorModal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        onLocationSelected={handleLocationSelected}
      />
    </div>
  );
};

export default YakinSahalar;

