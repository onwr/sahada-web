import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getOpenMatch, joinOpenMatch } from '../services/firestoreService';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';
import Footer from '../components/Footer';
import toast from '../utils/toast';
import { 
    Clock, Calendar, MapPin, Users, DollarSign, Trophy, ArrowLeft, 
    Share2, AlertCircle, CheckCircle, UserPlus, Shield
} from 'lucide-react';

const MacDetay = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [match, setMatch] = useState(null);
    const [loading, setLoading] = useState(true);
    const [joining, setJoining] = useState(false);
    const [showShareMenu, setShowShareMenu] = useState(false);

    useEffect(() => {
        loadMatch();
    }, [id]);

    const loadMatch = async () => {
        setLoading(true);
        const result = await getOpenMatch(id);
        if (result.success) {
            setMatch(result.data);
        } else {
            toast.error(result.error);
            navigate('/oyuncu-bul');
        }
        setLoading(false);
    };

    const handleJoinRequest = async () => {
        if (!user) {
            toast.error('Maça katılmak için giriş yapmalısınız');
            navigate('/login', { state: { from: { pathname: `/mac-detay/${id}` } } });
            return;
        }

        if (match.players && match.players.includes(user.uid)) {
            toast.error('Zaten bu maça katıldınız');
            return;
        }

        setJoining(true);
        try {
            const result = await joinOpenMatch(match.id, user.uid);
            if (result.success) {
                toast.success('Maça katılım isteğiniz gönderildi!'); // Text changed to reflect "request"
                // Refresh match data or update local state
                setMatch(prev => ({
                    ...prev,
                    players: [...prev.players, user.uid],
                    currentPlayers: (prev.currentPlayers || 0) + 1
                }));
            } else {
                toast.error(result.error || 'Maça katılamadınız');
            }
        } catch (error) {
            console.error('Katılma hatası:', error);
            toast.error('Bir hata oluştu');
        } finally {
            setJoining(false);
        }
    };

    const formatDate = (d) => {
        if (!d) return '';
        const dateObj = d.toDate ? d.toDate() : new Date(d);
        return dateObj.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col">
                <Header />
                <div className="flex-grow flex items-center justify-center">
                    <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <Footer />
            </div>
        );
    }

    if (!match) return null;

    const missingPlayers = (match.maxPlayers || 0) - (match.currentPlayers || 0);
    const isJoined = user && match.players && match.players.includes(user.uid);
    const organizer = {
        name: match.organizerName || 'İlan Sahibi',
        avatar: match.organizerAvatar || `https://ui-avatars.com/api/?name=${match.organizerName || 'User'}&background=random`
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <Header />
            
            <main className="flex-grow container mx-auto px-4 py-8">
                {/* Back Link */}
                <button 
                    onClick={() => navigate(-1)} 
                    className="flex items-center text-gray-500 hover:text-gray-900 mb-6 transition-colors"
                >
                    <ArrowLeft size={20} className="mr-2" />
                    Listeye Dön
                </button>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Match Info */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Header Card */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                {match.format === 'football' && <span className="text-9xl">⚽</span>}
                                {match.format === 'basketball' && <span className="text-9xl">🏀</span>}
                                {match.format === 'volleyball' && <span className="text-9xl">🏐</span>}
                                {match.format === 'tennis' && <span className="text-9xl">🎾</span>}
                            </div>
                            
                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-bold">
                                        {match.format === 'football' ? 'Halı Saha' : match.format}
                                    </span>
                                    {missingPlayers > 0 ? (
                                        <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                                            <AlertCircle size={14} />
                                            {missingPlayers} Kişi Aranıyor
                                        </span>
                                    ) : (
                                        <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                                            <CheckCircle size={14} />
                                            Kadro Dolu
                                        </span>
                                    )}
                                </div>

                                <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4 leading-tight">
                                    {match.tesisName || match.location || 'Maç Detayı'}
                                </h1>

                                <div className="flex flex-wrap gap-4 text-gray-600">
                                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                                        <Calendar size={18} className="text-green-600" />
                                        <span className="font-medium">{formatDate(match.date)}</span>
                                    </div>
                                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                                        <Clock size={18} className="text-green-600" />
                                        <span className="font-medium">{match.timeSlot}</span>
                                    </div>
                                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                                        <MapPin size={18} className="text-green-600" />
                                        <span className="font-medium">{match.location || 'Konum'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <DollarSign className="text-green-600" /> Ücret Bilgisi
                                </h3>
                                <p className="text-3xl font-bold text-gray-900 mb-1">
                                    {match.pricePerPlayer === 0 ? 'Ücretsiz' : `₺${match.pricePerPlayer}`}
                                    <span className="text-sm font-normal text-gray-500 ml-1">/kişi başı</span>
                                </p>
                                <p className="text-sm text-gray-500 mt-2">
                                    Ödeme saha girişinde veya organizatöre yapılacaktır.
                                </p>
                            </div>

                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <Trophy className="text-green-600" /> Seviye
                                </h3>
                                <div className="flex items-center gap-2">
                                    <span className="text-lg font-medium capitalize text-gray-800">
                                        {match.level === 'mixed' ? 'Karışık' : 
                                         match.level === 'beginner' ? 'Başlangıç' : 
                                         match.level === 'intermediate' ? 'Orta' : 
                                         match.level === 'advanced' ? 'İleri' : match.level}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-500 mt-2">
                                    Maç seviyesine uygun oyuncular aranmaktadır.
                                </p>
                            </div>
                        </div>

                        {/* Description */}
                        {match.description && (
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                <h3 className="font-bold text-gray-900 mb-3">Açıklama</h3>
                                <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                                    {match.description}
                                </p>
                            </div>
                        )}

                        {/* Organizer */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <img 
                                    src={organizer.avatar} 
                                    className="w-16 h-16 rounded-full border-2 border-green-100 object-cover"
                                    alt={organizer.name}
                                />
                                <div>
                                    <p className="font-bold text-gray-900 text-lg">{organizer.name}</p>
                                    <p className="text-sm text-gray-500 flex items-center gap-1">
                                        <Shield size={14} className="text-green-600" />
                                        İlan Sahibi
                                    </p>
                                </div>
                            </div>
                            <button 
                                onClick={() => navigate(`/oyuncu-detay/${match.organizerId}`)}
                                className="text-green-600 font-semibold hover:bg-green-50 px-4 py-2 rounded-lg transition-colors"
                            >
                                Profili Gör
                            </button>
                        </div>
                    </div>

                    {/* Right Column: Actions */}
                    <div className="lg:col-span-1">
                        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 sticky top-24">
                            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <Users size={20} className="text-green-600" />
                                Kadro Durumu
                            </h3>

                            <div className="mb-6">
                                <div className="flex justify-between text-sm mb-2 font-medium">
                                    <span className="text-gray-600">Doluluk</span>
                                    <span className="text-green-600">{match.currentPlayers} / {match.maxPlayers}</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                                    <div 
                                        className="bg-green-500 h-full rounded-full transition-all duration-500" 
                                        style={{ width: `${(match.currentPlayers / match.maxPlayers) * 100}%` }}
                                    ></div>
                                </div>
                            </div>

                            <div className="space-y-3 mb-6">
                                {/* Player Slots Visualization */}
                                <div className="grid grid-cols-5 gap-2">
                                    {Array.from({ length: match.maxPlayers || 10 }).map((_, i) => (
                                        <div 
                                            key={i}
                                            className={`aspect-square rounded-lg flex items-center justify-center border-2 ${
                                                i < match.currentPlayers 
                                                ? 'bg-green-50 border-green-200 text-green-600' 
                                                : 'bg-gray-50 border-gray-100 text-gray-300'
                                            }`}
                                        >
                                            <Users size={16} />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {isJoined ? (
                                <div className="w-full bg-green-50 border border-green-200 text-green-700 py-4 rounded-xl flex flex-col items-center justify-center gap-2 mb-4">
                                    <CheckCircle size={32} />
                                    <span className="font-bold">Katılım Talebi Gönderildi</span>
                                    <span className="text-xs text-center">Organizatör onayı bekleniyor. <br/> Onaylandığında bildirim alacaksınız.</span>
                                </div>
                            ) : (
                                <button
                                    onClick={handleJoinRequest}
                                    disabled={joining || missingPlayers === 0}
                                    className={`w-full py-4 rounded-xl font-bold text-white shadow-lg shadow-green-200 flex items-center justify-center gap-2 transition-all transform active:scale-95 ${
                                        missingPlayers === 0 
                                            ? 'bg-gray-300 cursor-not-allowed shadow-none' 
                                            : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800'
                                    }`}
                                >
                                    {joining ? (
                                        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <>
                                            <UserPlus size={20} />
                                            {match.pricePerPlayer === 0 ? 'Ücretsiz Katıl' : 'Katılma İsteği Gönder'}
                                        </>
                                    )}
                                </button>
                            )}

                            <div className="relative">
                                <button 
                                    onClick={() => setShowShareMenu(!showShareMenu)}
                                    className="w-full py-3 mt-3 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Share2 size={18} />
                                    Arkadaşlarınla Paylaş
                                </button>
                                
                                {showShareMenu && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 p-3 z-50 animate-in fade-in slide-in-from-top-2">
                                        <div className="space-y-2">
                                            <button 
                                                onClick={() => {
                                                    const url = window.location.href;
                                                    window.open(`https://wa.me/?text=${encodeURIComponent('Bu maça gelmelisin! ⚽ ' + url)}`, '_blank');
                                                }}
                                                className="w-full flex items-center gap-3 p-2 hover:bg-green-50 rounded-lg text-left text-sm font-medium text-gray-700 hover:text-green-700 transition-colors"
                                            >
                                                <div className="w-8 h-8 rounded-full bg-[#25D366] text-white flex items-center justify-center">
                                                    <Share2 size={16} /> {/* WhatsApp color placeholder */}
                                                </div>
                                                WhatsApp ile Paylaş
                                            </button>

                                            <button 
                                                onClick={() => {
                                                    const url = window.location.href;
                                                    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
                                                }}
                                                className="w-full flex items-center gap-3 p-2 hover:bg-blue-50 rounded-lg text-left text-sm font-medium text-gray-700 hover:text-blue-700 transition-colors"
                                            >
                                                <div className="w-8 h-8 rounded-full bg-[#1877F2] text-white flex items-center justify-center">
                                                    <Share2 size={16} /> {/* Facebook color placeholder */}
                                                </div>
                                                Facebook'ta Paylaş
                                            </button>

                                            <button 
                                                onClick={() => {
                                                    const url = window.location.href;
                                                    window.open(`mailto:?subject=${encodeURIComponent('Maça Davet: ' + (match.tesisName || 'Saha Maçı'))}&body=${encodeURIComponent('Selam, bu maça katılmak isteyebilirsin: ' + url)}`);
                                                }}
                                                className="w-full flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg text-left text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                                            >
                                                <div className="w-8 h-8 rounded-full bg-gray-500 text-white flex items-center justify-center">
                                                    <Share2 size={16} />
                                                </div>
                                                E-posta Gönder
                                            </button>

                                            <button 
                                                onClick={() => {
                                                    navigator.clipboard.writeText(window.location.href);
                                                    toast.success('Link kopyalandı!');
                                                    setShowShareMenu(false);
                                                }}
                                                className="w-full flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg text-left text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors border-t border-gray-100 mt-1 pt-3"
                                            >
                                                <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center">
                                                    <Share2 size={16} />
                                                </div>
                                                Linki Kopyala
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            
            <Footer />
        </div>
    );
};

export default MacDetay;
