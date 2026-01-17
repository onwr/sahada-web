import React from 'react';
import { Calendar, MapPin, Zap, ArrowRight } from 'lucide-react';

const MatchAdCard = ({ match, onJoin }) => {
    // Normalizing data to match UI needs
    const sport = match.format;
    const organizer = {
        name: match.organizerName || 'Bilinmiyor',
        avatar: match.organizerAvatar || `https://ui-avatars.com/api/?name=${match.organizerName || 'User'}&background=random`
    };
    const title = match.tesisName || match.location || 'Maç İlanı';
    const missingPlayers = (match.maxPlayers || 0) - (match.currentPlayers || 0);
    
    // Formatting date
    const formatDate = (d) => {
        if (!d) return '';
        const dateObj = d.toDate ? d.toDate() : new Date(d);
        return dateObj.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
    };

    const displayDate = formatDate(match.date);
    const time = match.timeSlot;
    const location = match.location || match.tesisName;
    const price = match.pricePerPlayer;

    const getSportIcon = (s) => {
        switch(s) {
            case 'football': return '⚽';
            case 'basketball': return '🏀';
            case 'volleyball': return '🏐';
            case 'tennis': return '🎾';
            default: return '⚽';
        }
    };

    return (
        <div className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:border-green-500/40 hover:shadow-xl transition-all duration-300 relative h-full flex flex-col">
            {/* Sport Badge - Top Right */}
            <div className="absolute top-4 right-4 w-9 h-9 bg-gray-50 rounded-lg flex items-center justify-center text-lg border border-gray-100 group-hover:bg-green-50 transition-colors">
                {getSportIcon(sport)}
            </div>

            {/* Card Content */}
            <div className="p-5 flex-grow flex flex-col">
                {/* Player Info (İlan Sahibi) */}
                <div 
                    className="flex items-center gap-3 mb-4 cursor-pointer group/organizer"
                    onClick={() => onJoin && onJoin({ ...match, type: 'profile_click', organizerId: match.organizerId })}
                >
                    <div className="relative">
                        <img
                            src={organizer.avatar}
                            alt="player"
                            className="w-11 h-11 rounded-full border-2 border-white shadow-sm object-cover group-hover/organizer:border-green-400 transition-all"
                        />
                        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                    </div>
                    <div>
                        <div className="font-semibold text-gray-900 group-hover/organizer:text-green-600 transition-colors">{organizer.name}</div>
                        <div className="text-xs text-gray-400">İlan Sahibi</div>
                    </div>
                </div>

                {/* Match Title */}
                <h3 className="text-lg font-bold text-gray-900 mb-3 pr-10 group-hover:text-green-600 transition-colors leading-tight line-clamp-2">
                    {title}
                </h3>

                {/* Missing Players - Prominent */}
                <div className="flex items-center gap-2 mb-4 p-2.5 bg-red-50 border border-red-100 rounded-xl">
                    <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-black text-sm">{missingPlayers > 0 ? missingPlayers : 0}</span>
                    </div>
                    <div>
                        <div className="text-sm font-semibold text-red-700">Oyuncu Eksik</div>
                        <div className="text-xs text-red-500">Acil katılımcı aranıyor</div>
                    </div>
                </div>

                {/* Info List */}
                <div className="space-y-2 mb-4 text-sm flex-grow">
                    <div className="flex items-center gap-2 text-gray-600">
                        <Calendar size={14} className="text-gray-400 flex-shrink-0" />
                        <span className="font-medium text-gray-900">{displayDate}</span>
                        <span className="text-gray-400">•</span>
                        <span>{time}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                        <MapPin size={14} className="text-gray-400 flex-shrink-0" />
                        <span className="truncate">{location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Zap size={14} className="text-yellow-500 flex-shrink-0" />
                        {price === 0 ? (
                            <span className="text-green-600 font-semibold">Ücretsiz Katılım</span>
                        ) : (
                            <span className="text-gray-600">Kişi Başı: <span className="font-semibold text-gray-900">{price} ₺</span></span>
                        )}
                    </div>
                </div>

                {/* Join Button */}
                <button
                    onClick={() => onJoin(match)}
                    className="w-full bg-green-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-green-700 transition-colors flex items-center justify-center gap-2 shadow-sm shadow-green-200 mt-auto"
                >
                    Katılmak İstiyorum <ArrowRight size={16} />
                </button>
            </div>
        </div>
    );
};

export default MatchAdCard;
