import React, { useState } from 'react';
import { Check, Star, Zap, Shield, Crown } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';

const Pricing = () => {
    const [type, setType] = useState('PLAYER'); // 'PLAYER' | 'OWNER'

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />
            <div className="py-12 md:py-20">
                <div className="container mx-auto px-4">

                    <div className="text-center max-w-2xl mx-auto mb-12">
                        <span className="text-green-600 font-bold text-sm tracking-widest uppercase">Premium Üyelik</span>
                        <h1 className="text-4xl md:text-5xl font-black text-gray-900 mt-2 mb-6">Saha Deneyimini Zirveye Taşı</h1>
                        <p className="text-gray-500 text-lg">
                            İster oyuncu ol, ister tesis sahibi. İhtiyacına uygun paketle daha fazla görünürlük, daha fazla maç ve daha fazla kazanç sağla.
                        </p>

                        {/* Toggle */}
                        <div className="flex justify-center mt-8">
                            <div className="bg-white p-1 rounded-xl shadow-sm border border-gray-200 inline-flex">
                                <button
                                    onClick={() => setType('PLAYER')}
                                    className={`px-8 py-3 rounded-lg text-sm font-bold transition-all ${type === 'PLAYER' ? 'bg-gray-900 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}
                                >
                                    Oyuncular İçin
                                </button>
                                <button
                                    onClick={() => setType('OWNER')}
                                    className={`px-8 py-3 rounded-lg text-sm font-bold transition-all ${type === 'OWNER' ? 'bg-green-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}
                                >
                                    Tesis Sahipleri İçin
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">

                        {/* Free Plan */}
                        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm hover:shadow-xl transition-all">
                            <div className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Başlangıç</div>
                            <div className="text-4xl font-black text-gray-900 mb-6">Ücretsiz</div>
                            <p className="text-gray-500 text-sm mb-8 min-h-[40px]">Platformu keşfetmek ve standart maçlara katılmak için.</p>
                            <ul className="space-y-4 mb-8">
                                <li className="flex items-center gap-3 text-sm text-gray-600"><Check size={18} className="text-green-500" /> Standart Profil</li>
                                <li className="flex items-center gap-3 text-sm text-gray-600"><Check size={18} className="text-green-500" /> Maçlara Katılım</li>
                                <li className="flex items-center gap-3 text-sm text-gray-600"><Check size={18} className="text-green-500" /> Ayda 1 İlan Verme Hakkı</li>
                                {type === 'OWNER' && <li className="flex items-center gap-3 text-sm text-gray-600"><Check size={18} className="text-green-500" /> Tek Tesis Ekleme</li>}
                            </ul>
                            <button className="w-full py-4 rounded-xl border-2 border-gray-100 font-bold text-gray-900 hover:border-gray-900 hover:bg-gray-50 transition-all">
                                Hemen Başla
                            </button>
                        </div>

                        {/* Pro Plan */}
                        <div className="bg-white text-gray-900 rounded-3xl p-8 border-2 border-green-500 shadow-2xl relative overflow-hidden transform md:-translate-y-4">
                            <div className="absolute top-0 right-0 bg-green-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase">En Popüler</div>
                            <div className="text-sm font-bold text-green-600 uppercase tracking-wider mb-2">{type === 'PLAYER' ? 'Pro Oyuncu' : 'Business'}</div>
                            <div className="flex items-end gap-1 mb-6">
                                <div className="text-4xl font-black text-gray-900">{type === 'PLAYER' ? '99' : '499'} ₺</div>
                                <div className="text-gray-500 text-sm mb-1">/ ay</div>
                            </div>
                            <p className="text-gray-600 text-sm mb-8 min-h-[40px]">
                                {type === 'PLAYER' ? 'İstatistiklerini takip et, MVP ol ve sınırsız ilan ver.' : 'Tesisini öne çıkar, doluluk oranını %100\'e ulaştır.'}
                            </p>
                            <ul className="space-y-4 mb-8">
                                <li className="flex items-center gap-3 text-sm text-gray-700"><Crown size={18} className="text-green-500" /> {type === 'PLAYER' ? 'Gelişmiş İstatistikler' : 'Öne Çıkan Tesis Rozeti'}</li>
                                <li className="flex items-center gap-3 text-sm text-gray-700"><Zap size={18} className="text-green-500" /> {type === 'PLAYER' ? 'Sınırsız Pazar İlanı' : 'Rezervasyon Önceliği'}</li>
                                <li className="flex items-center gap-3 text-sm text-gray-700"><Star size={18} className="text-green-500" /> {type === 'PLAYER' ? 'Öncelikli Maç Bildirimleri' : 'Gelişmiş Gelir Raporları'}</li>
                                <li className="flex items-center gap-3 text-sm text-gray-700"><Shield size={18} className="text-green-500" /> {type === 'PLAYER' ? 'Onaylı Profil Rozeti' : '7/24 Öncelikli Destek'}</li>
                            </ul>
                            <button className="w-full py-4 rounded-xl bg-green-600 hover:bg-green-700 font-bold text-white transition-all shadow-lg shadow-green-200">
                                Paketi Seç
                            </button>
                        </div>

                        {/* Enterprise / Team Plan */}
                        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm hover:shadow-xl transition-all">
                            <div className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">{type === 'PLAYER' ? 'Takım Paketi' : 'Zincir Tesis'}</div>
                            <div className="text-4xl font-black text-gray-900 mb-6">Teklif Al</div>
                            <p className="text-gray-500 text-sm mb-8 min-h-[40px]">{type === 'PLAYER' ? 'Tüm takım arkadaşların için toplu üyelik ve turnuva avantajları.' : 'Birden fazla şubesi olan işletmeler için özel çözümler.'}</p>
                            <ul className="space-y-4 mb-8">
                                <li className="flex items-center gap-3 text-sm text-gray-600"><Check size={18} className="text-green-500" /> {type === 'PLAYER' ? 'Takım Sayfası Yönetimi' : 'Çoklu Şube Yönetimi'}</li>
                                <li className="flex items-center gap-3 text-sm text-gray-600"><Check size={18} className="text-green-500" /> {type === 'PLAYER' ? 'Turnuva Kayıt İndirimi' : 'API Entegrasyonu'}</li>
                                <li className="flex items-center gap-3 text-sm text-gray-600"><Check size={18} className="text-green-500" /> {type === 'PLAYER' ? 'Özel Takım Formaları' : 'Özel Marka Sayfası'}</li>
                            </ul>
                            <button className="w-full py-4 rounded-xl border-2 border-gray-100 font-bold text-gray-900 hover:border-gray-900 hover:bg-gray-50 transition-all">
                                Bizimle İletişime Geç
                            </button>
                        </div>

                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default Pricing;
