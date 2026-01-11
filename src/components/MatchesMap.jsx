import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import * as L from 'leaflet';
import { MapPin, Calendar, Clock, Trophy, Maximize2, Minimize2, Navigation, ArrowRight } from 'lucide-react';

// Fix Leaflet icon issue by overriding default paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const createProfileIcon = (avatarUrl) => {
    return L.divIcon({
        className: 'custom-profile-marker',
        html: `
            <div class="relative w-12 h-12 group transition-transform duration-300 hover:scale-110">
                <div class="absolute inset-0 bg-white rounded-full p-0.5 shadow-lg border-2 border-green-500">
                    <img src="${avatarUrl}" class="w-full h-full rounded-full object-cover" onerror="this.src='https://ui-avatars.com/api/?name=User&background=random'"/>
                </div>
                <div class="absolute -bottom-1 left-1/2 transform -translate-x-1/2 translate-y-full">
                     <div class="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-top-[8px] border-t-green-500"></div>
                </div>
            </div>
        `,
        iconSize: [48, 56], 
        iconAnchor: [24, 56],
        popupAnchor: [0, -60]
    });
};

const userLocationIcon = L.divIcon({
    className: 'user-location-marker',
    html: `
        <div class="relative flex items-center justify-center w-6 h-6">
            <div class="absolute w-full h-full bg-blue-500/30 rounded-full animate-ping"></div>
            <div class="relative w-4 h-4 bg-blue-500 border-2 border-white rounded-full shadow-md"></div>
        </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
});

// Map Controller Component
const MapRecenter = ({ center, zoom }) => {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.flyTo(center, zoom, {
                duration: 1.5
            });
        }
    }, [center, zoom, map]);
    return null;
};

const MatchesMap = ({ matches, onJoin }) => {
    // Istanbul Center Default
    const [center, setCenter] = useState([41.0082, 28.9784]);
    const [zoom, setZoom] = useState(12);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [userLocation, setUserLocation] = useState(null);

    const formatDate = (d) => {
        if (!d) return '';
        const dateObj = d.toDate ? d.toDate() : new Date(d);
        return dateObj.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
    };

    const handleLocateMe = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    const newPos = [latitude, longitude];
                    setUserLocation(newPos);
                    setCenter(newPos);
                    setZoom(14);
                },
                (error) => {
                    console.error("Konum alınamadı:", error);
                    alert("Konumunuz alınamadı. Lütfen konum izni verdiğinizden emin olun.");
                }
            );
        } else {
            alert("Facebook konum özelliğini desteklemiyor.");
        }
    };

    return (
        <div className={`transition-all duration-300 ease-in-out ${
            isFullScreen 
                ? 'fixed inset-0 z-[100] bg-white' 
                : 'h-[calc(100vh-250px)] w-full rounded-2xl border border-gray-200 shadow-lg relative z-0'
        }`}>
            {/* Map Controls */}
            <div className="absolute top-4 right-4 z-[400] flex flex-col gap-2">
                <button 
                    onClick={toggleFullScreen => setIsFullScreen(!isFullScreen)}
                    className="bg-white p-2.5 rounded-xl shadow-lg border border-gray-100 hover:bg-gray-50 text-gray-700 transition-colors"
                    title={isFullScreen ? "Küçült" : "Tam Ekran"}
                >
                    {isFullScreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                </button>
                <button 
                    onClick={handleLocateMe}
                    className="bg-white p-2.5 rounded-xl shadow-lg border border-gray-100 hover:bg-gray-50 text-blue-600 transition-colors"
                    title="Konumuma Git"
                >
                    <Navigation size={20} className={userLocation ? "fill-blue-600" : ""} />
                </button>
            </div>

            <MapContainer
                center={center}
                zoom={zoom}
                scrollWheelZoom={true}
                style={{ height: '100%', width: '100%' }}
                className="z-0"
            >
                <MapRecenter center={center} zoom={zoom} />
                
                {/* Satellite View Layer */}
                <TileLayer
                    attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                />
                
                {/* Streets Overlay */}
                <TileLayer
                    attribution='&copy; CARTO'
                    url="https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png"
                />

                {/* Matches Markers */}
                {matches.map((match) => {
                    const position = [
                        match.latitude || 41.0082 + (Math.random() - 0.5) * 0.1,
                        match.longitude || 28.9784 + (Math.random() - 0.5) * 0.2
                    ];
                    
                    const missingPlayers = (match.maxPlayers || 0) - (match.currentPlayers || 0);
                    const avatar = match.organizerAvatar || `https://ui-avatars.com/api/?name=${match.organizerName || 'User'}&background=random`;

                    return (
                        <Marker
                            key={match.id}
                            position={position}
                            icon={createProfileIcon(avatar)}
                        >
                            <Popup className="custom-popup" closeButton={false}>
                                <div className="min-w-[240px] p-2">
                                    {/* Header */}
                                    <div className="flex items-center gap-3 mb-3 pb-3 border-b border-gray-100">
                                        <img 
                                            src={avatar} 
                                            className="w-10 h-10 rounded-full object-cover border border-gray-200"
                                            alt={match.organizerName}
                                        />
                                        <div>
                                            <p className="font-bold text-gray-900 text-sm">{match.organizerName}</p>
                                            <p className="text-xs text-gray-500">İlan Sahibi</p>
                                        </div>
                                    </div>
                                    
                                    {/* Content */}
                                    <h3 className="font-bold text-gray-900 mb-2 text-sm leading-tight">{match.tesisName || match.location || 'Maç'}</h3>

                                    <div className="space-y-2 text-xs text-gray-600 mb-4">
                                        <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-lg">
                                            <MapPin size={14} className="text-green-600" />
                                            <span className="truncate">{match.location || match.tesisName}</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-lg">
                                                <Calendar size={14} className="text-green-600" />
                                                <span>{formatDate(match.date)}</span>
                                            </div>
                                            <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-lg">
                                                <Clock size={14} className="text-green-600" />
                                                <span>{match.timeSlot}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Footer / Actions */}
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-green-600 text-sm">
                                                {match.pricePerPlayer === 0 ? 'Ücretsiz' : `₺${match.pricePerPlayer}`}
                                            </span>
                                            <span className="text-[10px] text-red-500 font-medium">
                                                {missingPlayers} Kişi Eksik
                                            </span>
                                        </div>
                                        
                                        <button
                                            onClick={() => onJoin && onJoin(match)}
                                            className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-2 px-3 rounded-lg transition-colors flex items-center gap-1"
                                        >
                                            Katıl <ArrowRight size={12} />
                                        </button>
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}

                {/* User Location Marker */}
                {userLocation && (
                    <Marker position={userLocation} icon={userLocationIcon}>
                        <Popup>
                            <div className="text-center p-1">
                                <p className="font-bold text-gray-900">Konumum</p>
                            </div>
                        </Popup>
                    </Marker>
                )}
            </MapContainer>

            {/* Close Fullscreen Button (Only visible in fullscreen) */}
            {isFullScreen && (
                <button
                    onClick={() => setIsFullScreen(false)}
                    className="absolute top-4 left-4 z-[400] bg-white text-gray-700 px-4 py-2 rounded-xl shadow-lg font-bold flex items-center gap-2 hover:bg-gray-50"
                >
                    <Minimize2 size={18} />
                    Kapat
                </button>
            )}
        </div>
    );
};

export default MatchesMap;
