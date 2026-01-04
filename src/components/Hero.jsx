import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, MapPin, ArrowRight, CheckCircle, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';

// Mock Data for Hero Slides
const MOCK_SLIDES = [
  {
    id: '1',
    title: 'Maç Eksik Olmasın.',
    subtitle: "İster saha kirala, ister eksik oyuncunu bul. Türkiye'nin en büyük sporcu topluluğu ile sahaya çıkmaya hazırsın.",
    buttonText: 'Hemen Başla',
    buttonLink: '/yakin-sahalar',
    imageUrl: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?q=80&w=2070&auto=format&fit=crop', // Football pitch
    isActive: true,
    order: 1
  },
  {
    id: '2',
    title: 'Rakip Bul, Maç Yap',
    subtitle: "Kendi seviyende rakiplerle karşılaşmak için hemen ilan oluştur veya mevcut maçlara katıl.",
    buttonText: 'Maç Bul',
    buttonLink: '/oyuncu-bul',
    imageUrl: 'https://images.unsplash.com/photo-1543351611-58f69d7c1781?q=80&w=2540&auto=format&fit=crop', // Soccer action
    isActive: true,
    order: 2
  }
];

// Card Animation Variants
const cardVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: (custom) => ({
        opacity: 1,
        y: 0,
        transition: { 
            delay: custom * 0.2, 
            duration: 0.8, 
            ease: "easeOut" 
        }
    }),
    hover: { 
        y: -10, 
        transition: { duration: 0.3 } 
    }
};

const Hero = () => {
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const [searchTab, setSearchTab] = useState('RENT'); // 'RENT' or 'PLAYER'
    const [searchLocation, setSearchLocation] = useState('');
    
    // Slider State
    const [heroSlides, setHeroSlides] = useState(MOCK_SLIDES);
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
    const [heroLoading, setHeroLoading] = useState(false);

    // Auto-rotate slider
    useEffect(() => {
        if (heroSlides.length <= 1) return;
        const interval = setInterval(() => {
            setCurrentSlideIndex(prev => (prev + 1) % heroSlides.length);
        }, 5000);
        return () => clearInterval(interval);
    }, [heroSlides.length]);

    const activeSlide = heroSlides.length > 0 ? heroSlides[currentSlideIndex] : null;

    const handleSearch = () => {
        const query = searchLocation ? encodeURIComponent(searchLocation) : '';
        if (searchTab === 'RENT') {
            navigate(`/yakin-sahalar?search=${query}`);
        } else {
            navigate(`/oyuncu-bul?search=${query}`);
        }
    };

    return (
        <section className="relative bg-white pb-12 overflow-hidden min-h-[700px] flex items-center">
            {/* Background Graphic */}
            <div className="absolute inset-0 z-0">
                <AnimatePresence mode='wait'>
                    {activeSlide?.imageUrl && (
                        <motion.div
                            key={activeSlide.id}
                            initial={{ opacity: 0, scale: 1.05 }}
                            animate={{ opacity: 0.15, scale: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 1.5 }}
                            className="absolute inset-0"
                        >
                            <img src={activeSlide.imageUrl} alt="background" className="w-full h-full object-cover" />
                        </motion.div>
                    )}
                </AnimatePresence>
                {/* Gradient Overlays */}
                <div className="absolute inset-0 bg-gradient-to-r from-white via-white/80 to-transparent"></div>
                <div className="absolute top-0 right-0 w-3/4 h-full bg-gradient-to-l from-green-50/50 to-transparent skew-x-12 opacity-50"></div>
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-50/50 rounded-full blur-3xl opacity-60 translate-y-1/2 -translate-x-1/2"></div>
            </div>

            <div className="container mx-auto px-4 relative z-10 pt-20 md:pt-28">
                <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">

                    {/* Left Side: Text Content */}
                    <div className="lg:w-1/2 text-center lg:text-left">
                        {/* Badge */}
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-green-100 rounded-full px-4 py-1.5 mb-8 shadow-sm"
                        >
                            <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                            </span>
                            <span className="text-xs font-bold text-gray-800 tracking-wide uppercase">İstanbul'da 450+ Tesis Aktif</span>
                        </motion.div>

                        {/* Title & Subtitle */}
                        {!heroLoading && activeSlide ? (
                            <div key={activeSlide.id}>
                                <motion.h1 
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2, duration: 0.8 }}
                                    className="text-5xl md:text-6xl lg:text-7xl font-black text-gray-900 tracking-tight mb-6 leading-[1.05]"
                                >
                                    {activeSlide.title.split(' ').map((word, i) => (
                                        word === "Eksik" ? 
                                        <span key={i} className="text-green-600 relative inline-block mx-2">
                                            {word}
                                            <svg className="absolute w-full h-3 -bottom-1 left-0 text-green-600 opacity-30" viewBox="0 0 100 10" preserveAspectRatio="none"><path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="10" fill="none" /></svg>
                                        </span> : word + " "
                                    ))}
                                </motion.h1>
                                <motion.p 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.4, duration: 0.8 }}
                                    className="text-gray-500 text-lg md:text-xl font-medium mb-10 leading-relaxed max-w-xl mx-auto lg:mx-0"
                                >
                                    {activeSlide.subtitle}
                                </motion.p>
                            </div>
                        ) : null}

                        {/* SEARCH BOX (Glassmorphism) */}
                        <motion.div 
                            initial={{ opacity: 0, y: 40 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5, type: 'spring' }}
                            className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl shadow-green-900/5 border border-white/50 p-3 max-w-xl mx-auto lg:mx-0 relative z-20 transform transition-all hover:scale-[1.01]"
                        >
                            <div className="flex gap-1 mb-3 px-1">
                                <button
                                    onClick={() => setSearchTab('RENT')}
                                    className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all duration-300 ${searchTab === 'RENT' ? 'bg-gray-100 text-gray-900 shadow-inner' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-50'}`}
                                >
                                    Saha Kirala
                                </button>
                                <button
                                    onClick={() => setSearchTab('PLAYER')}
                                    className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all duration-300 ${searchTab === 'PLAYER' ? 'bg-blue-50 text-blue-600 shadow-inner' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-50'}`}
                                >
                                    Oyuncu Bul
                                </button>
                            </div>
                            <div className="flex flex-col md:flex-row gap-2">
                                <div className="flex-1 relative group">
                                    <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-green-500 transition-colors" size={20} />
                                    <input
                                        type="text"
                                        placeholder="Semt, İlçe veya Saha Adı..."
                                        value={searchLocation}
                                        onChange={(e) => setSearchLocation(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                        className="w-full h-14 pl-12 bg-gray-50/50 hover:bg-gray-50 focus:bg-white rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-green-500/20 text-gray-900 placeholder:text-gray-400 transition-all border border-transparent focus:border-green-100"
                                    />
                                </div>
                                <button
                                    onClick={handleSearch}
                                    className="h-14 px-8 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-black transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                                >
                                    ARA
                                </button>
                            </div>
                        </motion.div>

                         {/* Slide Indicators */}
                         {heroSlides.length > 1 && (
                            <div className="flex justify-center lg:justify-start gap-3 mt-10">
                                {heroSlides.map((_, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setCurrentSlideIndex(idx)}
                                        className={`h-1.5 rounded-full transition-all duration-300 ${currentSlideIndex === idx ? 'w-8 bg-green-500 shadow-lg shadow-green-200' : 'w-2 bg-gray-300 hover:bg-gray-400'}`}
                                    />
                                ))}
                            </div>
                        )}

                        <div className="mt-8 flex items-center justify-center lg:justify-start gap-8 text-gray-400 text-sm font-medium">
                            <span className="flex items-center gap-2 hover:text-green-600 transition-colors cursor-default"><CheckCircle size={18} className="text-green-500" /> Komisyonsuz</span>
                            <span className="flex items-center gap-2 hover:text-green-600 transition-colors cursor-default"><CheckCircle size={18} className="text-green-500" /> Anında Onay</span>
                            <span className="flex items-center gap-2 hover:text-green-600 transition-colors cursor-default"><CheckCircle size={18} className="text-green-500" /> Güvenli Ödeme</span>
                        </div>
                    </div>

                    {/* Right Side: Visual / Slider Area - Mock Cards (Advanced Animation) */}
                    <div className="lg:w-1/2 w-full relative hidden lg:block h-[500px]">
                        <div className="absolute inset-0 z-0 bg-contain bg-no-repeat bg-center opacity-10 pointer-events-none" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/cubes.png')" }}></div>
                        
                        <div className="relative z-10 grid grid-cols-2 gap-5 items-center h-full">
                            <div className="space-y-5 -mt-12">
                                {/* Card 1: Match - Floating Animation */}
                                <motion.div 
                                    variants={cardVariants}
                                    initial="hidden"
                                    animate="visible"
                                    whileHover="hover"
                                    custom={1}
                                    className="bg-white/80 backdrop-blur-md p-5 rounded-3xl shadow-xl border border-white/60"
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center text-2xl shadow-inner">🏀</div>
                                        <span className="bg-red-50 text-red-600 text-[10px] font-bold px-2 py-1 rounded-full border border-red-100">2 Kişi Eksik</span>
                                    </div>
                                    <h4 className="font-bold text-gray-900 text-base mb-1">Vadi İstanbul Maçı</h4>
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                        <div className="w-2 h-2 rounded-full bg-green-500"></div> Bugün 19:00
                                    </div>
                                </motion.div>

                                {/* Card 2: Facility */}
                                <motion.div 
                                    variants={cardVariants}
                                    initial="hidden"
                                    animate="visible"
                                    whileHover="hover"
                                    custom={3}
                                    className="bg-white/80 backdrop-blur-md p-5 rounded-3xl shadow-xl border border-white/60"
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-2xl shadow-inner">⚽</div>
                                        <span className="bg-green-50 text-green-600 text-[10px] font-bold px-2 py-1 rounded-full border border-green-100 flex items-center gap-1">
                                            <Sparkles size={10} /> 4.8 Puan
                                        </span>
                                    </div>
                                    <h4 className="font-bold text-gray-900 text-base mb-1">Arena Mega</h4>
                                    <p className="text-xs text-gray-500">Şişli, İstanbul</p>
                                </motion.div>
                            </div>

                            <div className="space-y-5 mt-12">
                                {/* Card 3: Player Ad (Dark Theme) */}
                                <motion.div 
                                    variants={cardVariants}
                                    initial="hidden"
                                    animate="visible"
                                    whileHover="hover"
                                    custom={2}
                                    className="bg-gray-900 text-white p-6 rounded-3xl shadow-2xl shadow-gray-900/20 relative overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
                                    
                                    <div className="flex items-center gap-4 mb-4 relative z-10">
                                        <div className="w-10 h-10 rounded-full bg-white/20 p-[2px]">
                                            <div className="w-full h-full rounded-full bg-gray-900 flex items-center justify-center text-xs font-bold">BY</div>
                                        </div>
                                        <div>
                                            <div className="font-bold text-sm">Burak Yılmaz</div>
                                            <div className="text-[10px] text-gray-400">Profesyonel Forvet</div>
                                        </div>
                                    </div>
                                    <div className="text-xs text-gray-300 bg-white/5 p-3 rounded-xl mb-4 italic leading-relaxed border border-white/5 relative z-10">
                                        "Hafta içi akşam maçlarına çağırabilirsiniz. Kondisyonum yerinde."
                                    </div>
                                    <button
                                        onClick={() => currentUser ? alert("Davet gönderildi!") : navigate('/login')}
                                        className="w-full bg-green-500 hover:bg-green-400 text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg hover:shadow-green-500/25 relative z-10"
                                    >Takıma Davet Et</button>
                                </motion.div>

                                {/* Card 4: Tournament */}
                                <motion.div 
                                    variants={cardVariants}
                                    initial="hidden"
                                    animate="visible"
                                    whileHover="hover"
                                    custom={4}
                                    className="bg-white/80 backdrop-blur-md p-5 rounded-3xl shadow-xl border border-white/60"
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-2xl shadow-inner">🎾</div>
                                        <span className="bg-blue-50 text-blue-600 text-[10px] font-bold px-2 py-1 rounded-full border border-blue-100">Turnuva</span>
                                    </div>
                                    <h4 className="font-bold text-gray-900 text-base mb-1">Kış Kupası 2024</h4>
                                    <p className="text-xs text-gray-500 mt-1">Kayıtlar Başladı</p>
                                </motion.div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </section>
    );
};

export default Hero;
