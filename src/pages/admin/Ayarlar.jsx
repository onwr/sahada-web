import React, { useState, useEffect } from 'react';
import { getPlatformSettings, updatePlatformSettings, logAdminAction } from '../../services/firestoreService';
import { useAuth } from '../../contexts/AuthContext';
import AdminSidebar from '../../components/AdminSidebar';
import { 
  Settings, Save, AlertCircle, CheckCircle, Globe, Percent, 
  Share2, Users, Shield, Plus, Trash2, Layout, Lock, Code, Image 
} from 'lucide-react';

const Ayarlar = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  
  // Initial Empty State to be merged with Firestore data
  const [settings, setSettings] = useState({
    // General
    siteTitle: 'Sahada.com',
    siteDescription: 'Türkiye\'nin en büyük halı saha kiralama platformu.',
    metaKeywords: 'halı saha, maç, futbol, kiralama',
    logoUrl: '',
    faviconUrl: '',
    
    // Social Media
    socialMedia: {
      facebook: '',
      instagram: '',
      twitter: '',
      linkedin: '',
      youtube: ''
    },

    // Integrations
    integrations: {
      googleAnalyticsId: '',
      googleAdsId: '',
      tiktokPixelId: '',
      searchConsoleCode: '',
      facebookPixelId: ''
    },

    // Commission System (Advanced)
    commission: {
      baseRate: 5, // Default %
      rules: [
        // Example: { minFields: 3, minMonths: 12, rate: 3 }
      ]
    },

    // Admins (Mock User Management for now)
    admins: [
      { id: 1, name: 'Admin User', email: 'admin@sahada.com', role: 'super_admin', addedAt: new Date().toISOString() }
    ]
  });

  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const result = await getPlatformSettings();
      if (result.success && result.data) {
        // Merge fetched data with default structure to prevent spreading nulls
        setSettings(prev => ({
          ...prev,
          ...result.data,
          socialMedia: { ...prev.socialMedia, ...result.data.socialMedia },
          integrations: { ...prev.integrations, ...result.data.integrations },
          commission: { ...prev.commission, ...result.data.commission },
          admins: result.data.admins || prev.admins
        }));
      }
    } catch (err) {
      setError('Ayarlar yüklenirken hata oluştu: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await updatePlatformSettings(settings);
      if (result.success) {
        await logAdminAction(user?.uid || 'admin', 'settings_update', { timestamp: new Date() });
        setSuccess('Tüm ayarlar başarıyla kaydedildi.');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        throw new Error(result.error || 'Kaydetme başarısız');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // --- Sub-Component Helpers ---

  // Commission Rule Handlers
  const addCommissionRule = () => {
    setSettings({
      ...settings,
      commission: {
        ...settings.commission,
        rules: [...(settings.commission.rules || []), { minFields: 1, minMonths: 0, rate: 5 }]
      }
    });
  };

  const removeCommissionRule = (index) => {
    const newRules = [...settings.commission.rules];
    newRules.splice(index, 1);
    setSettings({
      ...settings,
      commission: { ...settings.commission, rules: newRules }
    });
  };

  const updateCommissionRule = (index, field, value) => {
    const newRules = [...settings.commission.rules];
    newRules[index] = { ...newRules[index], [field]: parseFloat(value) };
    setSettings({
      ...settings,
      commission: { ...settings.commission, rules: newRules }
    });
  };

  // Admin Handlers
  const [newAdmin, setNewAdmin] = useState({ name: '', email: '', role: 'editor' });
  
  const handleAddAdmin = () => {
    if (!newAdmin.email || !newAdmin.name) return;
    const adminToAdd = {
      id: Date.now(),
      ...newAdmin,
      addedAt: new Date().toISOString()
    };
    setSettings({
      ...settings,
      admins: [...(settings.admins || []), adminToAdd]
    });
    setNewAdmin({ name: '', email: '', role: 'editor' });
  };

  const removeAdmin = (id) => {
    setSettings({
      ...settings,
      admins: settings.admins.filter(a => a.id !== id)
    });
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  const tabs = [
    { id: 'general', label: 'Genel Ayarlar', icon: Globe },
    { id: 'commission', label: 'Komisyon Sistemi', icon: Percent },
    { id: 'integrations', label: 'Entegrasyonlar & SEO', icon: Code },
    { id: 'admins', label: 'Yöneticiler', icon: Shield },
  ];

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <AdminSidebar />
      
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white border-b px-8 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Settings className="text-gray-400" />
              Sistem Ayarları
            </h1>
            <p className="text-gray-500 text-sm mt-1">Platformun tüm yapılandırmasını buradan yönetebilirsiniz.</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors shadow-sm disabled:opacity-50"
          >
            <Save size={18} />
            {saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
          </button>
        </header>

        {/* Tab Navigation */}
        <div className="bg-white border-b px-8">
          <div className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-4 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-green-600 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
              <AlertCircle className="w-5 h-5 mr-2" />
              {error}
            </div>
          )}
          {success && (
            <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center">
              <CheckCircle className="w-5 h-5 mr-2" />
              {success}
            </div>
          )}

          <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            
            {/* --- GENERAL TAB --- */}
            {activeTab === 'general' && (
              <>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <Layout size={20} className="text-blue-500" />
                    Site Kimliği & SEO
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Site Başlığı (Title)</label>
                      <input 
                        type="text" 
                        className="w-full border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500 p-2.5 border"
                        value={settings.siteTitle}
                        onChange={(e) => setSettings({...settings, siteTitle: e.target.value})}
                      />
                    </div>
                    <div className="col-span-2">
                       <label className="block text-sm font-medium text-gray-700 mb-1">Meta Açıklama (Description)</label>
                       <textarea 
                        rows={3}
                        className="w-full border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500 p-2.5 border"
                        value={settings.siteDescription}
                        onChange={(e) => setSettings({...settings, siteDescription: e.target.value})}
                       />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Anahtar Kelimeler (Keywords)</label>
                      <input 
                        type="text" 
                        className="w-full border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500 p-2.5 border"
                        placeholder="Virgül ile ayırın"
                        value={settings.metaKeywords}
                        onChange={(e) => setSettings({...settings, metaKeywords: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                   <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <Image size={20} className="text-purple-500" />
                    Görseller ve Medya
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
                      <input 
                        type="text" 
                        className="w-full border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500 p-2.5 border"
                        placeholder="https://..."
                        value={settings.logoUrl}
                        onChange={(e) => setSettings({...settings, logoUrl: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Favicon URL</label>
                      <input 
                        type="text" 
                        className="w-full border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500 p-2.5 border"
                        placeholder="https://..."
                        value={settings.faviconUrl}
                        onChange={(e) => setSettings({...settings, faviconUrl: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                   <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <Share2 size={20} className="text-pink-500" />
                    Sosyal Medya Hesapları
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {['facebook', 'instagram', 'twitter', 'linkedin', 'youtube'].map((platform) => (
                      <div key={platform}>
                        <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">{platform}</label>
                        <input 
                          type="text" 
                          className="w-full border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500 p-2.5 border"
                          placeholder={`${platform}.com/...`}
                          value={settings.socialMedia?.[platform] || ''}
                          onChange={(e) => setSettings({
                            ...settings, 
                            socialMedia: { ...settings.socialMedia, [platform]: e.target.value }
                          })}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* --- COMMISSION TAB --- */}
            {activeTab === 'commission' && (
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <Percent size={20} className="text-green-600" />
                      Komisyon Yapılandırması
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">Saha sayısı ve üyelik süresine göre dinamik komisyon oranları belirleyin.</p>
                  </div>
                  <div className="flex items-center gap-4 bg-gray-50 p-3 rounded-lg border border-gray-200">
                     <span className="text-sm font-bold text-gray-700">Standart Oran:</span>
                     <div className="relative w-24">
                        <input 
                          type="number" 
                          className="w-full border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500 p-1.5 pr-6 border text-right font-bold"
                          value={settings.commission.baseRate}
                          onChange={(e) => setSettings({...settings, commission: {...settings.commission, baseRate: parseFloat(e.target.value)}})}
                        />
                        <span className="absolute right-2 top-1.5 text-gray-500 font-bold">%</span>
                     </div>
                  </div>
                </div>

                <div className="border rounded-xl theme-border overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Min. Saha Sayısı</th>
                        <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Min. Üyelik (Ay)</th>
                        <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Uygulanacak Komisyon</th>
                        <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase text-right">İşlem</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(settings.commission.rules || []).map((rule, idx) => (
                        <tr key={idx} className="group hover:bg-gray-50">
                          <td className="px-6 py-3">
                             <input 
                                type="number" 
                                className="w-24 border-gray-200 bg-transparent rounded focus:ring-green-500 focus:border-green-500 p-1"
                                value={rule.minFields}
                                onChange={(e) => updateCommissionRule(idx, 'minFields', e.target.value)}
                              />
                              <span className="text-gray-400 text-sm ml-2">ve üzeri</span>
                          </td>
                          <td className="px-6 py-3">
                              <input 
                                type="number" 
                                className="w-24 border-gray-200 bg-transparent rounded focus:ring-green-500 focus:border-green-500 p-1"
                                value={rule.minMonths}
                                onChange={(e) => updateCommissionRule(idx, 'minMonths', e.target.value)}
                              />
                              <span className="text-gray-400 text-sm ml-2">ay ve üzeri</span>
                          </td>
                          <td className="px-6 py-3">
                             <div className="flex items-center gap-2">
                                <span className="font-bold text-green-600">%</span>
                                <input 
                                  type="number" 
                                  className="w-20 border-green-200 bg-green-50 text-green-700 font-bold rounded focus:ring-green-500 focus:border-green-500 p-1"
                                  value={rule.rate}
                                  onChange={(e) => updateCommissionRule(idx, 'rate', e.target.value)}
                                />
                             </div>
                          </td>
                          <td className="px-6 py-3 text-right">
                            <button 
                              onClick={() => removeCommissionRule(idx)}
                              className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-full transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {(!settings.commission.rules || settings.commission.rules.length === 0) && (
                        <tr>
                          <td colSpan="4" className="text-center py-8 text-gray-400 italic">
                            Henüz özel bir kural eklenmedi. Standart oran (%{settings.commission.baseRate}) geçerlidir.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  <div className="bg-gray-50 px-6 py-4 border-t flex justify-center">
                    <button 
                      onClick={addCommissionRule}
                      className="flex items-center gap-2 text-green-600 font-bold hover:text-green-800 transition-colors"
                    >
                      <Plus size={18} />
                      Yeni Kural Ekle
                    </button>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mt-6">
                  <p className="text-sm text-blue-800">
                    <strong>Bilgi:</strong> Sistem, bir işletme için komisyon oranını belirlerken yukarıdaki kuralları sırasıyla kontrol eder. 
                    Hem saha sayısı hem de üyelik süresi koşulunu sağlayan en avantajlı (düşük) oran otomatik olarak uygulanır.
                  </p>
                </div>
              </div>
            )}

            {/* --- INTEGRATIONS TAB --- */}
            {activeTab === 'integrations' && (
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6">
                 <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <Code size={20} className="text-indigo-500" />
                    Kod Entegrasyonları
                  </h3>
                  
                  <div className="grid grid-cols-1 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        Google Analytics ID <span className="text-xs text-gray-400 font-normal">(G-XXXXXXXXXX)</span>
                      </label>
                      <input 
                        type="text" 
                        className="w-full border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500 p-2.5 border"
                        value={settings.integrations.googleAnalyticsId}
                        onChange={(e) => setSettings({...settings, integrations: {...settings.integrations, googleAnalyticsId: e.target.value}})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        Google Ads ID <span className="text-xs text-gray-400 font-normal">(AW-XXXXXXXXXX)</span>
                      </label>
                      <input 
                        type="text" 
                        className="w-full border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500 p-2.5 border"
                        value={settings.integrations.googleAdsId}
                        onChange={(e) => setSettings({...settings, integrations: {...settings.integrations, googleAdsId: e.target.value}})}
                      />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Google Search Console (Meta Tag Doğrulama Kodu)</label>
                        <input 
                          type="text" 
                          className="w-full border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500 p-2.5 border"
                          placeholder='<meta name="google-site-verification" content="..." />'
                          value={settings.integrations.searchConsoleCode}
                          onChange={(e) => setSettings({...settings, integrations: {...settings.integrations, searchConsoleCode: e.target.value}})}
                        />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">TikTok Pixel ID</label>
                      <input 
                        type="text" 
                        className="w-full border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500 p-2.5 border"
                        value={settings.integrations.tiktokPixelId}
                        onChange={(e) => setSettings({...settings, integrations: {...settings.integrations, tiktokPixelId: e.target.value}})}
                      />
                    </div>
                     <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Facebook Pixel ID</label>
                      <input 
                        type="text" 
                        className="w-full border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500 p-2.5 border"
                        value={settings.integrations.facebookPixelId}
                        onChange={(e) => setSettings({...settings, integrations: {...settings.integrations, facebookPixelId: e.target.value}})}
                      />
                    </div>
                  </div>
              </div>
            )}

            {/* --- ADMINS TAB --- */}
            {activeTab === 'admins' && (
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-6">
                   <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Shield size={20} className="text-red-500" />
                    Yönetici Yetkilendirme
                  </h3>
                </div>

                {/* Add New Admin Form */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-8">
                  <h4 className="text-sm font-bold text-gray-800 mb-3">Yeni Yönetici Ekle</h4>
                  <div className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 w-full">
                      <label className="text-xs text-gray-500 mb-1 block">Ad Soyad</label>
                      <input 
                        type="text" 
                        className="w-full border border-gray-300 rounded-lg p-2"
                        value={newAdmin.name}
                        onChange={(e) => setNewAdmin({...newAdmin, name: e.target.value})}
                      />
                    </div>
                    <div className="flex-1 w-full">
                      <label className="text-xs text-gray-500 mb-1 block">E-Posta Adresi</label>
                       <input 
                        type="email" 
                        className="w-full border border-gray-300 rounded-lg p-2"
                        value={newAdmin.email}
                        onChange={(e) => setNewAdmin({...newAdmin, email: e.target.value})}
                      />
                    </div>
                    <div className="w-full md:w-48">
                      <label className="text-xs text-gray-500 mb-1 block">Rol / Yetki</label>
                      <select 
                        className="w-full border border-gray-300 rounded-lg p-2"
                        value={newAdmin.role}
                        onChange={(e) => setNewAdmin({...newAdmin, role: e.target.value})}
                      >
                        <option value="super_admin">Süper Admin</option>
                        <option value="editor">Editör</option>
                        <option value="support">Destek Uzmanı</option>
                        <option value="viewer">Görüntüleyici</option>
                      </select>
                    </div>
                    <button 
                      onClick={handleAddAdmin}
                      className="bg-gray-900 text-white px-4 py-2 rounded-lg font-medium hover:bg-black transition-colors min-w-[100px]"
                    >
                      Ekle
                    </button>
                  </div>
                </div>

                {/* Admins List */}
                <div className="border rounded-xl overflow-hidden">
                   <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Yönetici</th>
                        <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">E-Posta</th>
                        <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Yetki</th>
                        <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase text-right">İşlem</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(settings.admins || []).map((admin) => (
                        <tr key={admin.id} className="group hover:bg-gray-50">
                           <td className="px-6 py-4 font-medium text-gray-900">{admin.name}</td>
                           <td className="px-6 py-4 text-gray-600">{admin.email}</td>
                           <td className="px-6 py-4">
                             <span className={`px-2 py-1 rounded text-xs font-bold uppercase
                              ${admin.role === 'super_admin' ? 'bg-red-100 text-red-700' : 
                                admin.role === 'editor' ? 'bg-blue-100 text-blue-700' : 
                                'bg-gray-100 text-gray-700'}
                             `}>
                               {admin.role.replace('_', ' ')}
                             </span>
                           </td>
                           <td className="px-6 py-4 text-right">
                              {admin.role !== 'super_admin' && (
                                <button 
                                  onClick={() => removeAdmin(admin.id)}
                                  className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-full transition-colors"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                           </td>
                        </tr>
                      ))}
                    </tbody>
                   </table>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default Ayarlar;
