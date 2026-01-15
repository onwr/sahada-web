import React, { useState, useEffect } from 'react';
import { updateSystemSettings, getSystemSettings } from '../../services/firestoreService';
import AdminSidebar from '../../components/AdminSidebar';
import { 
    BarChart3, Globe, Facebook, Video, Save, Search, Megaphone,
    CheckCircle, XCircle, Eye, ExternalLink, RefreshCw, AlertTriangle, Tag, Layout
} from 'lucide-react';
import toast from 'react-hot-toast';

const Marketing = () => {
    // States
    const [settings, setSettings] = useState({
        seo: { title: '', description: '', keywords: '' },
        googleAnalytics: { enabled: false, id: '' },
        googleTagManager: { enabled: false, id: '' },
        googleAds: { enabled: false, id: '', conversionLabel: '' },
        searchConsole: { verificationCode: '' },
        metaPixel: { enabled: false, id: '', accessToken: '' },
        tiktokPixel: { enabled: false, id: '', accessToken: '' },
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
                    ...result.data,
                    // Ensure nested objects exist
                    seo: { ...prev.seo, ...result.data.seo },
                    googleTagManager: { ...prev.googleTagManager, ...result.data.googleTagManager },
                    googleAds: { ...prev.googleAds, ...(result.data.googleAds || {}) },
                    searchConsole: { ...prev.searchConsole, ...(result.data.searchConsole || {}) },
                    metaPixel: { ...prev.metaPixel, ...result.data.metaPixel },
                    tiktokPixel: { ...prev.tiktokPixel, ...result.data.tiktokPixel }
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
                                <p className="text-sm text-gray-500 mt-1">SEO, Pixel, Tag Manager ve reklam entegrasyonlarını yönetin</p>
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

                         {/* SEO Settings */}
                         <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                            <div className="p-6 border-b border-gray-100">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-purple-50 rounded-xl">
                                        <Layout size={24} className="text-purple-600" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-gray-900 text-lg">Site Kimliği ve SEO</h3>
                                        <p className="text-sm text-gray-500">Arama motorları için temel site ayarları</p>
                                    </div>
                                </div>
                            </div>
                            <div className="p-6 bg-gray-50/50">
                                <div className="grid grid-cols-1 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Site Başlığı (Title)</label>
                                        <input
                                            type="text"
                                            value={settings.seo?.title || ''}
                                            onChange={(e) => updateSetting('seo', 'title', e.target.value)}
                                            placeholder="Sahada.com - Halı Saha Kiralama"
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 font-medium"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Meta Açıklama (Description)</label>
                                        <textarea
                                            value={settings.seo?.description || ''}
                                            onChange={(e) => updateSetting('seo', 'description', e.target.value)}
                                            placeholder="Türkiye'nin en büyük halı saha kiralama platformu..."
                                            rows={2}
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 font-medium"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Anahtar Kelimeler (Keywords)</label>
                                        <input
                                            type="text"
                                            value={settings.seo?.keywords || ''}
                                            onChange={(e) => updateSetting('seo', 'keywords', e.target.value)}
                                            placeholder="halı saha, maç, futbol, kiralama"
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 font-medium"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Google Tag Manager & Search Console */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* GTM */}
                            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                                <div className="p-6 border-b border-gray-100">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-blue-50 rounded-xl">
                                            <Tag size={24} className="text-blue-600" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-bold text-gray-900 text-lg">Tag Manager</h3>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={settings.googleTagManager.enabled}
                                                onChange={(e) => updateSetting('googleTagManager', 'enabled', e.target.checked)}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                        </label>
                                    </div>
                                </div>
                                {settings.googleTagManager.enabled && (
                                    <div className="p-6 bg-gray-50/50 animate-in slide-in-from-top-2 duration-200">
                                        <label className="block text-sm font-bold text-gray-700 mb-2">
                                            Container ID (GTM-XXXXXXX)
                                        </label>
                                        <input
                                            type="text"
                                            value={settings.googleTagManager.id}
                                            onChange={(e) => updateSetting('googleTagManager', 'id', e.target.value)}
                                            placeholder="GTM-XXXXXXX"
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Search Console */}
                            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                                <div className="p-6 border-b border-gray-100">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-amber-50 rounded-xl">
                                            <Search size={24} className="text-amber-600" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-bold text-gray-900 text-lg">Search Console</h3>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-6 bg-gray-50/50">
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                        HTML Tag Verification Code
                                    </label>
                                    <input
                                        type="text"
                                        value={settings.searchConsole?.verificationCode || ''}
                                        onChange={(e) => updateSetting('searchConsole', 'verificationCode', e.target.value)}
                                        placeholder='<meta name="google-site-verification" ... />'
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-medium text-xs font-mono"
                                    />
                                    <p className="text-xs text-gray-500 mt-2">Düz kod veya sadece content değerini girebilirsiniz.</p>
                                </div>
                            </div>
                        </div>

                         {/* Google Ads */}
                         <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                            <div className="p-6 border-b border-gray-100">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-blue-50 rounded-xl">
                                        <Megaphone size={24} className="text-blue-600" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-gray-900 text-lg">Google Ads</h3>
                                        <p className="text-sm text-gray-500">Google Ads dönüşüm takibi ve remarketing</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={settings.googleAds.enabled}
                                            onChange={(e) => updateSetting('googleAds', 'enabled', e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                    </label>
                                </div>
                            </div>
                            {settings.googleAds.enabled && (
                                <div className="p-6 bg-gray-50/50 animate-in slide-in-from-top-2 duration-200">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                                Ads ID (AW-XXXXXXXXXX)
                                            </label>
                                            <input
                                                type="text"
                                                value={settings.googleAds.id}
                                                onChange={(e) => updateSetting('googleAds', 'id', e.target.value)}
                                                placeholder="AW-XXXXXXXXXX"
                                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                                Default Conversion Label (Optional)
                                            </label>
                                            <input
                                                type="text"
                                                value={settings.googleAds.conversionLabel}
                                                onChange={(e) => updateSetting('googleAds', 'conversionLabel', e.target.value)}
                                                placeholder="AbC_xYz..."
                                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

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
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
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
                                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 font-medium"
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

                        {/* Meta Pixel & CAPI */}
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                            <div className="p-6 border-b border-gray-100">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-blue-50 rounded-xl">
                                        <Facebook size={24} className="text-blue-600" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-gray-900 text-lg">Meta Pixel & CAPI</h3>
                                        <p className="text-sm text-gray-500">Facebook/Instagram Pixel ve Conversions API Entegrasyonu</p>
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
                                    <div className="grid grid-cols-1 gap-4">
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
                                        <div>
                                            <label className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                                Conversions API Access Token
                                                <span className="text-xs font-normal text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Server-Side Tracking</span>
                                            </label>
                                            <textarea
                                                value={settings.metaPixel.accessToken || ''}
                                                onChange={(e) => updateSetting('metaPixel', 'accessToken', e.target.value)}
                                                placeholder="EAAG..."
                                                rows={3}
                                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium font-mono text-xs"
                                            />
                                            <p className="text-xs text-gray-500 mt-1">
                                                Daha doğru veri takibi için Events Manager'dan alacağınız Access Token'ı buraya girin.
                                            </p>
                                        </div>
                                        <div className="flex justify-end pt-2">
                                            <a
                                                href="https://business.facebook.com/events_manager"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2 bg-white"
                                            >
                                                <ExternalLink size={14} />
                                                Events Manager
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* TikTok Pixel & Events API */}
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                            <div className="p-6 border-b border-gray-100">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-gray-900 rounded-xl">
                                        <Video size={24} className="text-white" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-gray-900 text-lg">TikTok Pixel & Events API</h3>
                                        <p className="text-sm text-gray-500">TikTok reklamlarınızın dönüşümlerini hem browser hem server üzerinden takip edin</p>
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
                                    <div className="grid grid-cols-1 gap-4">
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
                                        <div>
                                            <label className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                                Events API Access Token
                                                <span className="text-xs font-normal text-gray-600 bg-gray-200 px-2 py-0.5 rounded-full">Server-Side Tracking</span>
                                            </label>
                                            <textarea
                                                value={settings.tiktokPixel.accessToken || ''}
                                                onChange={(e) => updateSetting('tiktokPixel', 'accessToken', e.target.value)}
                                                placeholder="Access Token..."
                                                rows={3}
                                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-500/20 font-medium font-mono text-xs"
                                            />
                                            <p className="text-xs text-gray-500 mt-1">
                                                TikTok Events Manager'dan oluşturduğunuz Access Token.
                                            </p>
                                        </div>
                                        <div className="flex justify-end pt-2">
                                            <a
                                                href="https://ads.tiktok.com/marketing_api/apps"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2 bg-white"
                                            >
                                                <ExternalLink size={14} />
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
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                {/* GTM */}
                                <div className="flex items-center gap-2 bg-white/60 p-3 rounded-lg border border-green-100">
                                    {settings.googleTagManager.enabled && settings.googleTagManager.id ? (
                                        <CheckCircle size={18} className="text-green-600" />
                                    ) : (
                                        <XCircle size={18} className="text-gray-400" />
                                    )}
                                    <span className={`text-sm font-medium ${settings.googleTagManager.enabled ? 'text-green-800' : 'text-gray-500'}`}>GTM</span>
                                </div>
                                {/* Analytics */}
                                <div className="flex items-center gap-2 bg-white/60 p-3 rounded-lg border border-green-100">
                                    {settings.googleAnalytics.enabled && settings.googleAnalytics.id ? (
                                        <CheckCircle size={18} className="text-green-600" />
                                    ) : (
                                        <XCircle size={18} className="text-gray-400" />
                                    )}
                                    <span className={`text-sm font-medium ${settings.googleAnalytics.enabled ? 'text-green-800' : 'text-gray-500'}`}>Analytics</span>
                                </div>
                                {/* Ads */}
                                <div className="flex items-center gap-2 bg-white/60 p-3 rounded-lg border border-green-100">
                                    {settings.googleAds.enabled && settings.googleAds.id ? (
                                        <CheckCircle size={18} className="text-green-600" />
                                    ) : (
                                        <XCircle size={18} className="text-gray-400" />
                                    )}
                                    <span className={`text-sm font-medium ${settings.googleAds.enabled ? 'text-green-800' : 'text-gray-500'}`}>Ads</span>
                                </div>
                                {/* Search Console */}
                                <div className="flex items-center gap-2 bg-white/60 p-3 rounded-lg border border-green-100">
                                    {settings.searchConsole.verificationCode ? (
                                        <CheckCircle size={18} className="text-green-600" />
                                    ) : (
                                        <XCircle size={18} className="text-gray-400" />
                                    )}
                                    <span className={`text-sm font-medium ${settings.searchConsole.verificationCode ? 'text-green-800' : 'text-gray-500'}`}>Search Console</span>
                                </div>
                                {/* Meta */}
                                <div className="flex items-center gap-2 bg-white/60 p-3 rounded-lg border border-green-100">
                                    {settings.metaPixel.enabled && settings.metaPixel.id ? (
                                        <CheckCircle size={18} className="text-green-600" />
                                    ) : (
                                        <XCircle size={18} className="text-gray-400" />
                                    )}
                                    <div className="flex flex-col">
                                        <span className={`text-sm font-medium ${settings.metaPixel.enabled ? 'text-green-800' : 'text-gray-500'}`}>Meta</span>
                                        {settings.metaPixel.accessToken && <span className="text-[10px] text-green-600 font-bold">+API</span>}
                                    </div>
                                </div>
                                {/* TikTok */}
                                <div className="flex items-center gap-2 bg-white/60 p-3 rounded-lg border border-green-100">
                                    {settings.tiktokPixel.enabled && settings.tiktokPixel.id ? (
                                        <CheckCircle size={18} className="text-green-600" />
                                    ) : (
                                        <XCircle size={18} className="text-gray-400" />
                                    )}
                                     <div className="flex flex-col">
                                        <span className={`text-sm font-medium ${settings.tiktokPixel.enabled ? 'text-green-800' : 'text-gray-500'}`}>TikTok</span>
                                        {settings.tiktokPixel.accessToken && <span className="text-[10px] text-green-600 font-bold">+API</span>}
                                    </div>
                                </div>
                                {/* SEO */}
                                <div className="flex items-center gap-2 bg-white/60 p-3 rounded-lg border border-green-100">
                                    {settings.seo.title && settings.seo.description ? (
                                        <CheckCircle size={18} className="text-green-600" />
                                    ) : (
                                        <XCircle size={18} className="text-gray-400" />
                                    )}
                                     <span className={`text-sm font-medium ${settings.seo.title ? 'text-green-800' : 'text-gray-500'}`}>SEO</span>
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
