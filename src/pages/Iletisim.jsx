import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, Send, MessageCircle, Instagram, Facebook, Twitter } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import toast from '../utils/toast';

const Iletisim = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: ''
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        
        // Simulating API call
        setTimeout(() => {
            toast.success('Mesajınız başarıyla iletildi!');
            setFormData({ name: '', email: '', subject: '', message: '' });
            setLoading(false);
        }, 1500);
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <Header />
            
            <main className="flex-grow pt-24 pb-16">
                <div className="container mx-auto px-4 max-w-6xl">
                    <div className="text-center mb-16">
                        <motion.h1 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4"
                        >
                            Bizimle <span className="text-green-600">İletişime</span> Geçin
                        </motion.h1>
                        <motion.p 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="text-gray-600 text-lg max-w-2xl mx-auto"
                        >
                            Sorularınız, önerileriniz veya iş birliği talepleriniz için bize her zaman ulaşabilirsiniz. Ekibimiz en kısa sürede size dönüş yapacaktır.
                        </motion.p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Contact Info */}
                        <motion.div 
                            initial={{ opacity: 0, x: -30 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="lg:col-span-1 space-y-6"
                        >
                            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                                <h3 className="text-xl font-bold text-gray-900 mb-6">İletişim Bilgileri</h3>
                                
                                <div className="space-y-6">
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center text-green-600 shrink-0">
                                            <MapPin size={24} />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900">Adres</p>
                                            <p className="text-gray-600 text-sm">Levent, Büyükdere Cd. No:123, 34394 Şişli/İstanbul</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 shrink-0">
                                            <Phone size={24} />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900">Telefon</p>
                                            <p className="text-gray-600 text-sm">+90 (212) 555 0123</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 shrink-0">
                                            <Mail size={24} />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900">E-Posta</p>
                                            <p className="text-gray-600 text-sm">destek@sahada.com</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-10">
                                    <p className="font-semibold text-gray-900 mb-4">Sosyal Medya</p>
                                    <div className="flex gap-3">
                                        {[
                                            { icon: Instagram, color: 'bg-pink-50 text-pink-600' },
                                            { icon: Facebook, color: 'bg-blue-50 text-blue-700' },
                                            { icon: Twitter, color: 'bg-sky-50 text-sky-500' },
                                            { icon: MessageCircle, color: 'bg-green-50 text-green-500' }
                                        ].map((item, i) => (
                                            <motion.a
                                                key={i}
                                                href="#"
                                                whileHover={{ y: -3, scale: 1.1 }}
                                                className={`w-10 h-10 ${item.color} rounded-xl flex items-center justify-center transition-colors`}
                                            >
                                                <item.icon size={20} />
                                            </motion.a>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Contact Form */}
                        <motion.div 
                            initial={{ opacity: 0, x: 30 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="lg:col-span-2"
                        >
                            <div className="bg-white p-8 md:p-10 rounded-3xl shadow-sm border border-gray-100">
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-gray-700 ml-1">Ad Soyad</label>
                                            <input 
                                                required
                                                type="text"
                                                value={formData.name}
                                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                                className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                                                placeholder="İsminizi girin"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-gray-700 ml-1">E-Posta</label>
                                            <input 
                                                required
                                                type="email"
                                                value={formData.email}
                                                onChange={(e) => setFormData({...formData, email: e.target.value})}
                                                className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                                                placeholder="Email adresinizi girin"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-gray-700 ml-1">Konu</label>
                                        <input 
                                            required
                                            type="text"
                                            value={formData.subject}
                                            onChange={(e) => setFormData({...formData, subject: e.target.value})}
                                            className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                                            placeholder="Mesaj konusu"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-gray-700 ml-1">Mesajınız</label>
                                        <textarea 
                                            required
                                            rows="5"
                                            value={formData.message}
                                            onChange={(e) => setFormData({...formData, message: e.target.value})}
                                            className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all resize-none"
                                            placeholder="Size nasıl yardımcı olabiliriz?"
                                        ></textarea>
                                    </div>

                                    <button 
                                        disabled={loading}
                                        type="submit"
                                        className="w-full md:w-auto px-10 py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-2xl shadow-lg shadow-green-600/20 hover:shadow-green-600/30 transition-all flex items-center justify-center gap-2 group"
                                    >
                                        {loading ? (
                                            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        ) : (
                                            <>
                                                Gönder
                                                <Send size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                            </>
                                        )}
                                    </button>
                                </form>
                            </div>
                        </motion.div>
                    </div>

                    {/* FAQ Mini Section */}
                    <div className="mt-24 bg-green-600 rounded-[3rem] p-10 md:p-16 text-center text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-green-400/20 rounded-full -ml-32 -mb-32 blur-3xl"></div>
                        
                        <div className="relative z-10">
                            <h2 className="text-3xl font-bold mb-4">Yardıma mı ihtiyacınız var?</h2>
                            <p className="text-green-50 mb-8 max-w-xl mx-auto">
                                Sıkça sorulan sorular sayfamıza göz atarak merak ettiklerinize hızlıca cevap bulabilirsiniz.
                            </p>
                            <Link to="/yardim" className="inline-block px-8 py-4 bg-white text-green-600 font-bold rounded-2xl hover:bg-green-50 transition-colors">
                                Yardım Merkezine Git
                            </Link>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default Iletisim;
