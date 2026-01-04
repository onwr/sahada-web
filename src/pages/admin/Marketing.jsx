import React, { useState, useEffect } from 'react';
import { updateSystemSettings, getSystemSettings } from '../../services/firestoreService';
import AdminSidebar from '../../components/AdminSidebar';
import { 
    BarChart3, Globe, Facebook, Video, Save,
    CheckCircle, XCircle, Eye, ExternalLink, RefreshCw, AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';

const Marketing = () => {
    // States
    const [settings, setSettings] = useState({
        googleAnalytics: { enabled: false, id: '' },
        metaPixel: { enabled: false, id: '' },
        tiktokPixel: { enabled: false, id: '' },
    });
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [error, setError] = useState(null);

    // Load Settings
    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            setLoading(true);
            const result = await getSystemSettings('marketing');
            if (result.success && result.data) {
                // Merge with defaults to ensure structure
                setSettings(prev => ({
                    ...prev,
                    ...result.data
                }));
            }
        } catch (err) {
            console.error("Marketing ayarları yükleme hatası:", err);
            setError("Ayarlar yüklenirken bir hata oluştu.");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        setError(null);
        try {
            const result = await updateSystemSettings('marketing', settings);
            if (result.success) {
                setSaveSuccess(true);
                toast.success("Marketing ayarları kaydedildi");
                setTimeout(() => setSaveSuccess(false), 3000);
            } else {
                setError(result.error);
                toast.error("Kaydedilirken hata oluştu");
            }
        } catch (err) {
            console.error("Marketing kaydetme hatası:", err);
            setError("Kaydedilirken beklenmedik bir hata oluştu.");
            toast.error("Beklenmedik bir hata oluştu");
        } finally {
            setIsSaving(false);
        }
    };

    const updateSetting = (provider, field, value) => {
        setSettings(prev => ({
            ...prev,
            [provider]: {
                ...prev[provider],
                [field]: value
            }
        }));
    };

    if (loading) {
        return (
            <div className="flex h-screen bg-gray-50 items-center justify-center">
                <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-gray-50">
            <AdminSidebar />
            
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                <main className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
                    <div className="space-y-6 max-w-4xl mx-auto">
                        
                        {/* Header */}
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <div>
                                <h1 className="text-2xl font-black text-gray-900">Marketing & Analytics</h1>
                                <p className="text-sm text-gray-500 mt-1">Pixel ve analitik entegrasyonlarını yönetin</p>
                            </div>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="px-6 py-2.5 bg-green-600 text-white rounded-xl font-bold text-sm hover:bg-green-700 transition-all flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-green-200"
                            >
                                {isSaving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                                {isSaving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                            </button>
                        </div>

                        {saveSuccess && (
                            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3 animate-fade-in-down">
                                <CheckCircle size={20} className="text-green-600" />
                                <p className="text-sm font-bold text-green-800">Ayarlar başarıyla kaydedildi! Değişiklikler tüm ziyaretçilerde geçerli olacaktır.</p>
                            </div>
                        )}

                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 animate-fade-in-down">
                                <AlertTriangle size={20} className="text-red-600" />
                                <p className="text-sm font-bold text-red-800">{error}</p>
                            </div>
                        )}

                        {/* Google Analytics */}
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                            <div className="p-6 border-b border-gray-100">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-orange-50 rounded-xl">
                                        <BarChart3 size={24} className="text-orange-600" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-gray-900 text-lg">Google Analytics 4</h3>
                                        <p className="text-sm text-gray-500">Web sitesi trafiğini ve kullanıcı davranışlarını izleyin</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={settings.googleAnalytics.enabled}
                                            onChange={(e) => updateSetting('googleAnalytics', 'enabled', e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                                    </label>
                                </div>
                            </div>
                            {settings.googleAnalytics.enabled && (
                                <div className="p-6 bg-gray-50/50 animate-in slide-in-from-top-2 duration-200">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                                Measurement ID (G-XXXXXXXXXX)
                                            </label>
                                            <input
                                                type="text"
                                                value={settings.googleAnalytics.id}
                                                onChange={(e) => updateSetting('googleAnalytics', 'id', e.target.value)}
                                                placeholder="G-XXXXXXXXXX"
                                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20 font-medium"
                                            />
                                        </div>
                                        <div className="flex items-end">
                                            <a
                                                href="https://analytics.google.com/"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="px-4 py-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2 bg-white w-full md:w-auto justify-center"
                                            >
                                                <ExternalLink size={16} />
                                                Google Analytics'i Aç
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Meta Pixel */}
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                            <div className="p-6 border-b border-gray-100">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-blue-50 rounded-xl">
                                        <Facebook size={24} className="text-blue-600" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-gray-900 text-lg">Meta Pixel (Facebook)</h3>
                                        <p className="text-sm text-gray-500">Facebook ve Instagram reklamlarınızın performansını ölçün</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={settings.metaPixel.enabled}
                                            onChange={(e) => updateSetting('metaPixel', 'enabled', e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                    </label>
                                </div>
                            </div>
                            {settings.metaPixel.enabled && (
                                <div className="p-6 bg-gray-50/50 animate-in slide-in-from-top-2 duration-200">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                                Pixel ID
                                            </label>
                                            <input
                                                type="text"
                                                value={settings.metaPixel.id}
                                                onChange={(e) => updateSetting('metaPixel', 'id', e.target.value)}
                                                placeholder="123456789012345"
                                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
                                            />
                                        </div>
                                        <div className="flex items-end gap-2">
                                            <a
                                                href="https://business.facebook.com/events_manager"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="px-4 py-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2 bg-white w-full md:w-auto justify-center"
                                            >
                                                <ExternalLink size={16} />
                                                Events Manager
                                            </a>
                                        </div>
                                    </div>
                             
                                </div>
                            )}
                        </div>

                        {/* TikTok Pixel */}
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                            <div className="p-6 border-b border-gray-100">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-gray-900 rounded-xl">
                                        <Video size={24} className="text-white" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-gray-900 text-lg">TikTok Pixel</h3>
                                        <p className="text-sm text-gray-500">TikTok reklamlarınızın dönüşümlerini takip edin</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={settings.tiktokPixel.enabled}
                                            onChange={(e) => updateSetting('tiktokPixel', 'enabled', e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gray-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-900"></div>
                                    </label>
                                </div>
                            </div>
                            {settings.tiktokPixel.enabled && (
                                <div className="p-6 bg-gray-50/50 animate-in slide-in-from-top-2 duration-200">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                                Pixel ID
                                            </label>
                                            <input
                                                type="text"
                                                value={settings.tiktokPixel.id}
                                                onChange={(e) => updateSetting('tiktokPixel', 'id', e.target.value)}
                                                placeholder="XXXXXXXXXXXXXXXXXX"
                                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-500/20 font-medium"
                                            />
                                        </div>
                                        <div className="flex items-end">
                                            <a
                                                href="https://ads.tiktok.com/marketing_api/apps"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="px-4 py-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2 bg-white w-full md:w-auto justify-center"
                                            >
                                                <ExternalLink size={16} />
                                                TikTok Ads Manager
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Info Card */}
                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-100">
                            <h4 className="font-bold text-green-900 mb-4 flex items-center gap-2">
                                <Globe size={18} />
                                Entegrasyon Durumu
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="flex items-center gap-2 bg-white/60 p-3 rounded-lg border border-green-100">
                                    {settings.googleAnalytics.enabled && settings.googleAnalytics.id ? (
                                        <CheckCircle size={18} className="text-green-600" />
                                    ) : (
                                        <XCircle size={18} className="text-gray-400" />
                                    )}
                                    <span className={`text-sm font-medium ${settings.googleAnalytics.enabled ? 'text-green-800' : 'text-gray-500'}`}>Google Analytics</span>
                                </div>
                                <div className="flex items-center gap-2 bg-white/60 p-3 rounded-lg border border-green-100">
                                    {settings.metaPixel.enabled && settings.metaPixel.id ? (
                                        <CheckCircle size={18} className="text-green-600" />
                                    ) : (
                                        <XCircle size={18} className="text-gray-400" />
                                    )}
                                    <span className={`text-sm font-medium ${settings.metaPixel.enabled ? 'text-green-800' : 'text-gray-500'}`}>Meta Pixel</span>
                                </div>
                                <div className="flex items-center gap-2 bg-white/60 p-3 rounded-lg border border-green-100">
                                    {settings.tiktokPixel.enabled && settings.tiktokPixel.id ? (
                                        <CheckCircle size={18} className="text-green-600" />
                                    ) : (
                                        <XCircle size={18} className="text-gray-400" />
                                    )}
                                    <span className={`text-sm font-medium ${settings.tiktokPixel.enabled ? 'text-green-800' : 'text-gray-500'}`}>TikTok Pixel</span>
                                </div>
                            </div>
                        </div>

                    </div>
                </main>
            </div>
        </div>
    );
};

export default Marketing;
