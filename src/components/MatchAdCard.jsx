import React from 'react';
import { Calendar, MapPin, Zap, ArrowRight, UserPlus, Clock } from 'lucide-react';

const MatchAdCard = ({ match, onJoin }) => {
    // Determine sport icon
    const getSportIcon = (sport) => {
        if (!sport) return '⚽';
        switch (sport.toLowerCase()) {
            case 'football': case 'futbol': return '⚽';
            case 'basketball': case 'basketbol': return '🏀';
            case 'volleyball': case 'voleybol': return '🏐';
            case 'tennis': case 'tenis': return '🎾';
            default: return '⚽';
        }
    };

    return (
        <div className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:border-green-500/40 hover:shadow-xl transition-all duration-300 relative h-full flex flex-col transform hover:-translate-y-1">
            {/* Sport Badge - Top Right */}
            <div className="absolute top-4 right-4 w-9 h-9 bg-gray-50 rounded-lg flex items-center justify-center text-lg border border-gray-100 group-hover:bg-green-50 transition-colors">
                {getSportIcon(match.sport)}
            </div>

            {/* Card Content */}
            <div className="p-5 flex-grow flex flex-col">
                {/* Player Info (İlan Sahibi) */}
                <div className="flex items-center gap-3 mb-4">
                    <div className="relative">
                        <img
                            src={match.organizer?.avatar || `https://ui-avatars.com/api/?name=${match.organizer?.name || 'A'}&background=random`}
                            alt="player"
                            className="w-11 h-11 rounded-full border-2 border-white shadow-sm object-cover"
                        />
                        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                    </div>
                    <div>
                        <div className="font-semibold text-gray-900 leading-tight">{match.organizer?.name || 'Kullanıcı'}</div>
                        <div className="text-xs text-gray-400">İlan Sahibi</div>
                    </div>
                </div>

                {/* Match Title */}
                <h3 className="text-lg font-bold text-gray-900 mb-3 pr-10 group-hover:text-green-600 transition-colors leading-tight line-clamp-2">
                    {match.title}
                </h3>

                {/* Missing Players - Prominent */}
                <div className="flex items-center gap-2 mb-4 p-2.5 bg-red-50 border border-red-100 rounded-xl">
                    <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm shadow-red-200">
                        <span className="text-white font-black text-sm">{match.missingPlayers}</span>
                    </div>
                    <div>
                        <div className="text-sm font-semibold text-red-700 leading-none">Oyuncu Eksik</div>
                        <div className="text-[10px] text-red-500 uppercase font-bold tracking-wide mt-0.5">Acil katılımcı aranıyor</div>
                    </div>
                </div>

                {/* Info List */}
                <div className="space-y-2.5 mb-5 text-sm flex-grow border-t border-dashed border-gray-100 pt-4">
                    <div className="flex items-center gap-2.5 text-gray-600">
                        <Calendar size={15} className="text-gray-400 flex-shrink-0" />
                        <span className="font-semibold text-gray-900">{match.date}</span>
                        <span className="text-gray-300">•</span>
                        <span>{match.time}</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-gray-600">
                        <MapPin size={15} className="text-gray-400 flex-shrink-0" />
                        <span className="truncate">{match.location}</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                        <Zap size={15} className="text-yellow-500 flex-shrink-0 fill-yellow-500" />
                        {(match.pricePerPerson === 0 || match.pricePerPerson === '0') ? (
                            <span className="text-green-600 font-bold">Ücretsiz Katılım</span>
                        ) : (
                            <span className="text-gray-600">Kişi Başı: <span className="font-bold text-gray-900">{match.pricePerPerson} ₺</span></span>
                        )}
                    </div>
                </div>

                {/* Join Button */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        if (onJoin) onJoin(match);
                    }}
                    className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg mt-auto ${
                        match.userStatus === 'joined' 
                        ? 'bg-green-600 text-white hover:bg-green-700 shadow-green-200'
                        : match.userStatus === 'requested'
                        ? 'bg-yellow-500 text-white hover:bg-yellow-600 shadow-yellow-200'
                        : 'bg-gray-900 text-white hover:bg-green-600 shadow-gray-200 hover:shadow-green-200'
                    }`}
                >
                    {match.userStatus === 'joined' ? (
                        <>Maç Detayına Git <ArrowRight size={16} /></>
                    ) : match.userStatus === 'requested' ? (
                        <>İstek Gönderildi <Clock size={16} /></>
                    ) : (
                        <>Katılmak İstiyorum <ArrowRight size={16} /></>
                    )}
                </button>
            </div>
        </div>
    );
};

export default MatchAdCard;
