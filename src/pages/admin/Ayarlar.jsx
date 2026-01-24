import React, { useState, useEffect } from 'react';
import { getPlatformSettings, updatePlatformSettings, logAdminAction, searchUsers, getPages } from '../../services/firestoreService';
import { useAuth } from '../../contexts/AuthContext';
import AdminSidebar from '../../components/AdminSidebar';
import { uploadImage } from '../../services/cdnService';
import { 
  Settings, Save, AlertCircle, CheckCircle, Globe, Percent, 
  Share2, Users, Shield, Plus, Trash2, Layout, Lock, Code, Image,
  CreditCard, Search, UserCheck, Banknote, Upload, Loader2, List, Link as LinkIcon
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

    // Commission System (Advanced)
    commission: {
      baseRate: 5, // Default %
      rules: [
        // Example: { minFields: 3, minMonths: 12, rate: 3 }
      ]
    },

    // Membership & Payments
    membership: {
      mandatoryPayment: false, // Aylık ödeme zorunlu mu?
      monthlyFee: 0, // Aylık ücret
      currency: 'TRY'
    },

    // User Specific Rules (Special Offers / Commissions)
    specialRules: [
      // { userId: '123', userName: 'Ahmet', type: 'commission', value: 2.5, description: 'Özel Anlaşma' }
    ],

    // Admins (Mock User Management for now)
    admins: [

      { id: 1, name: 'Admin User', email: 'admin@sahada.com', role: 'super_admin', addedAt: new Date().toISOString() }
    ],

    // Menu Management
    menus: {
      header: [],
      footer: {
        platform: [],
        sahaSahipleri: [],
        kurumsal: []
      }
    }
  });

  const [ownerData, setOwnerData] = useState(null);
  const [availablePages, setAvailablePages] = useState([]);
  const [loadingPages, setLoadingPages] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // User Search State
  const [userQuery, setUserQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [selectedUserForRule, setSelectedUserForRule] = useState(null);
  
  // Rule Form State
  const [newRuleData, setNewRuleData] = useState({
    commissionRate: '',
    specialMonthlyFee: '',
    note: ''
  });

  useEffect(() => {
    fetchSettings();
    fetchAvailablePages();
  }, []);

  const fetchAvailablePages = async () => {
    setLoadingPages(true);
    try {
      const result = await getPages();
      if (result.success) {
        setAvailablePages(result.data);
      }
    } catch (error) {
      console.error('Error fetching pages:', error);
    } finally {
      setLoadingPages(false);
    }
  };

  const fetchSettings = async () => {
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
          membership: { ...prev.membership, ...result.data.membership },
          specialRules: result.data.specialRules || prev.specialRules,
          admins: result.data.admins || prev.admins,
          menus: {
            header: result.data.menus?.header || [],
            footer: {
              platform: result.data.menus?.footer?.platform || [],
              sahaSahipleri: result.data.menus?.footer?.sahaSahipleri || [],
              kurumsal: result.data.menus?.footer?.kurumsal || []
            }
          }
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

  // Special Rules Handlers
  const handleSearchUsers = async (text) => {
    setUserQuery(text);
    if (text.length < 2) {
      setUserSearchResults([]);
      return;
    }

    setIsSearchingUsers(true);
    try {
      const result = await searchUsers(text);
      if (result.success) {
        setUserSearchResults(result.data);
      }
    } catch (error) {
      console.error('User search error:', error);
    } finally {
      setIsSearchingUsers(false);
    }
  };

  const selectUserForRule = (user) => {
    setSelectedUserForRule(user);
    setUserQuery('');
    setUserSearchResults([]);
    // Reset form or optionally pre-fill if rule exists
    setNewRuleData({ commissionRate: '', specialMonthlyFee: '', note: '' });
  };

  const addSpecialRule = () => {
    if (!selectedUserForRule) return;

    const rule = {
      userId: selectedUserForRule.id,
      userName: selectedUserForRule.fullName || selectedUserForRule.displayName || selectedUserForRule.email,
      userType: selectedUserForRule.role || 'user',
      commissionRate: newRuleData.commissionRate ? parseFloat(newRuleData.commissionRate) : null,
      monthlyFee: newRuleData.specialMonthlyFee ? parseFloat(newRuleData.specialMonthlyFee) : null,
      note: newRuleData.note,
      createdAt: new Date().toISOString()
    };

    // Remove existing rule for this user if any, then add new
    const filteredRules = (settings.specialRules || []).filter(r => r.userId !== selectedUserForRule.id);
    
    setSettings({
      ...settings,
      specialRules: [...filteredRules, rule]
    });

    setSelectedUserForRule(null);
    setNewRuleData({ commissionRate: '', specialMonthlyFee: '', note: '' });
  };

  const removeSpecialRule = (userId) => {
    setSettings({
      ...settings,
      specialRules: settings.specialRules.filter(r => r.userId !== userId)
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

  // Menu Handlers
  const [newHeaderItem, setNewHeaderItem] = useState({ label: '', href: '', icon: 'Circle' });
  const [newFooterItem, setNewFooterItem] = useState({ label: '', href: '', column: 'platform' });

  const addHeaderItem = () => {
    if (!newHeaderItem.label || !newHeaderItem.href) return;
    setSettings({
      ...settings,
      menus: {
        ...settings.menus,
        header: [...settings.menus.header, { ...newHeaderItem, id: Date.now() }]
      }
    });
    setNewHeaderItem({ label: '', href: '', icon: 'Circle' });
  };

  const removeHeaderItem = (id) => {
    setSettings({
      ...settings,
      menus: {
        ...settings.menus,
        header: settings.menus.header.filter(item => item.id !== id)
      }
    });
  };

  const addFooterItem = () => {
    if (!newFooterItem.label || !newFooterItem.href) return;
    const column = newFooterItem.column;
    setSettings({
      ...settings,
      menus: {
        ...settings.menus,
        footer: {
          ...settings.menus.footer,
          [column]: [...settings.menus.footer[column], { 
            label: newFooterItem.label, 
            href: newFooterItem.href,
            id: Date.now() 
          }]
        }
      }
    });
    setNewFooterItem({ label: '', href: '', column });
  };

  const removeFooterItem = (column, id) => {
    setSettings({
      ...settings,
      menus: {
        ...settings.menus,
        footer: {
          ...settings.menus.footer,
          [column]: settings.menus.footer[column].filter(item => item.id !== id)
        }
      }
    });
  };

  const loadDefaultHeader = () => {
    const defaults = [
      { id: 1, label: 'Yakındaki Sahalar', href: '/yakin-sahalar', icon: 'MapPin' },
      { id: 2, label: 'Oyuncu Bul', href: '/oyuncu-bul', icon: 'Search' },
      { id: 3, label: 'Meydan', href: '/meydan', icon: 'Users' },
      { id: 4, label: 'Blog', href: '/blog', icon: 'BookOpen' },
    ];
    setSettings({
      ...settings,
      menus: { ...settings.menus, header: defaults }
    });
  };

  const loadDefaultFooter = () => {
    const defaults = {
      platform: [
        { id: 1, label: 'Nasıl Çalışır?', href: '/nasil-calisir' },
        { id: 2, label: 'Tesisler', href: '/yakin-sahalar' },
        { id: 3, label: 'Oyuncu Bul', href: '/oyuncu-bul' },
        { id: 4, label: 'Turnuvalar', href: '/turnuvalar' }
      ],
      sahaSahipleri: [
        { id: 1, label: 'Saha Ekle', href: '/saha-sahibi-login' },
        { id: 2, label: 'Yönetim Paneli', href: '/saha-sahibi/dashboard' },
        { id: 3, label: 'Destek Merkezi', href: '/destek' }
      ],
      kurumsal: [
        { id: 1, label: 'Hakkımızda', href: '/hakkimizda' },
        { id: 2, label: 'Blog', href: '/blog' },
        { id: 3, label: 'İletişim', href: '/iletisim' }
      ]
    };
    setSettings({
      ...settings,
      menus: { ...settings.menus, footer: defaults }
    });
  };

  // Image Upload Logic
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);

  const handleImageUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    if (type === 'logo') setUploadingLogo(true);
    else setUploadingFavicon(true);

    try {
      // Use 'system' category for site assets
      const result = await uploadImage(file, 'system', user?.uid || 'admin_settings');
      
      if (result.success) {
        // Handle potential different response structures from cdnService
        const url = result.data?.url || result.data || (typeof result.data === 'string' ? result.data : '');
        
        if (url) {
             setSettings(prev => ({
              ...prev,
              [type === 'logo' ? 'logoUrl' : 'faviconUrl']: url
            }));
            setSuccess(`${type === 'logo' ? 'Logo' : 'Favicon'} başarıyla yüklendi.`);
            setTimeout(() => setSuccess(null), 3000);
        } else {
             throw new Error('Upload başarılı ama URL alınamadı');
        }
      } else {
        setError('Resim yüklenirken hata oluştu: ' + (result.error || 'Bilinmeyen hata'));
      }
    } catch (err) {
      console.error('Upload Error:', err);
      setError('Resim yükleme hatası: ' + err.message);
    } finally {
      if (type === 'logo') setUploadingLogo(false);
      else setUploadingFavicon(false);
      
      // Reset input
      e.target.value = '';
    }
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
    { id: 'payment_offers', label: 'Ödemeler & Teklifler', icon: CreditCard },
    { id: 'menus', label: 'Menü Yönetimi', icon: List },
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
                            <Globe size={20} className="text-blue-500" />
                            Platform Bilgileri
                          </h3>
                          <div className="grid grid-cols-1 gap-6">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Site Başlığı</label>
                              <input 
                                type="text" 
                                className="w-full border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500 p-2.5 border"
                                placeholder="Örn: Sahada.com"
                                value={settings.siteTitle}
                                onChange={(e) => setSettings({...settings, siteTitle: e.target.value})}
                              />
                              <p className="text-[11px] text-gray-400 mt-1 uppercase font-bold tracking-wider italic">Bu isim sidebar ve başlıklarda dinamik olarak görünecektir.</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Site Açıklaması (Meta Description)</label>
                                <textarea 
                                  className="w-full border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500 p-2.5 border"
                                  rows="2"
                                  placeholder="Site hakkında kısa açıklama..."
                                  value={settings.siteDescription}
                                  onChange={(e) => setSettings({...settings, siteDescription: e.target.value})}
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Meta Anahtar Kelimeler</label>
                                <textarea 
                                  className="w-full border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500 p-2.5 border"
                                  rows="2"
                                  placeholder="anahtar, kelime, ayırarak, girin"
                                  value={settings.metaKeywords}
                                  onChange={(e) => setSettings({...settings, metaKeywords: e.target.value})}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                        {/* SEO Section Moved to Marketing.jsx */}
        
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                   <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <Image size={20} className="text-purple-500" />
                    Görseller ve Medya
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
                      <div className="flex gap-2">
                          <input 
                            type="text" 
                            className="flex-1 border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500 p-2.5 border"
                            placeholder="https://..."
                            value={settings.logoUrl}
                            onChange={(e) => setSettings({...settings, logoUrl: e.target.value})}
                          />
                          <div className="relative">
                            <input
                                type="file"
                                id="logo-upload"
                                className="hidden"
                                accept="image/*"
                                onChange={(e) => handleImageUpload(e, 'logo')}
                                disabled={uploadingLogo}
                            />
                            <label 
                                htmlFor="logo-upload"
                                className={`flex items-center justify-center w-11 h-11 rounded-lg border border-gray-300 bg-white cursor-pointer hover:bg-gray-50 transition-colors ${uploadingLogo ? 'opacity-50 cursor-not-allowed' : ''}`}
                                title="Bilgisayardan Yükle"
                            >
                                {uploadingLogo ? <Loader2 className="w-5 h-5 animate-spin text-green-600" /> : <Upload className="w-5 h-5 text-gray-600" />}
                            </label>
                           </div>
                      </div>
                      {settings.logoUrl && (
                        <div className="mt-2 p-2 bg-gray-50 rounded border border-gray-100 inline-block">
                           <img src={settings.logoUrl} alt="Logo Preview" className="h-8 object-contain" />
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Favicon URL</label>
                      <div className="flex gap-2">
                          <input 
                            type="text" 
                            className="flex-1 border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500 p-2.5 border"
                            placeholder="https://..."
                            value={settings.faviconUrl}
                            onChange={(e) => setSettings({...settings, faviconUrl: e.target.value})}
                          />
                          <div className="relative">
                            <input
                                type="file"
                                id="favicon-upload"
                                className="hidden"
                                accept="image/*"
                                onChange={(e) => handleImageUpload(e, 'favicon')}
                                disabled={uploadingFavicon}
                            />
                            <label 
                                htmlFor="favicon-upload"
                                className={`flex items-center justify-center w-11 h-11 rounded-lg border border-gray-300 bg-white cursor-pointer hover:bg-gray-50 transition-colors ${uploadingFavicon ? 'opacity-50 cursor-not-allowed' : ''}`}
                                title="Bilgisayardan Yükle"
                            >
                                {uploadingFavicon ? <Loader2 className="w-5 h-5 animate-spin text-green-600" /> : <Upload className="w-5 h-5 text-gray-600" />}
                            </label>
                           </div>
                      </div>
                      {settings.faviconUrl && (
                         <div className="mt-2 p-2 bg-gray-50 rounded border border-gray-100 inline-block">
                             <img src={settings.faviconUrl} alt="Favicon Preview" className="w-8 h-8 object-contain" />
                         </div>
                      )}
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



            {/* --- MENUS TAB --- */}
            {activeTab === 'menus' && (
              <div className="space-y-6">
                {/* Header Menu */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <Layout size={20} className="text-blue-500" />
                      Header Menüsü
                    </h3>
                    <button 
                      onClick={loadDefaultHeader}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 transition-all hover:bg-blue-100"
                    >
                      Varsayılanları Yükle
                    </button>
                  </div>
                  
                  <div className="flex gap-4 mb-4 items-end bg-gray-50 p-4 rounded-lg">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Hazır Sayfalar</label>
                      <select 
                        className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                        onChange={(e) => {
                          const val = e.target.value;
                          if (!val) return;
                          const [label, href] = val.split('|');
                          setNewHeaderItem({...newHeaderItem, label, href});
                        }}
                        defaultValue=""
                      >
                        <option value="" disabled>Sistem Sayfası Seç...</option>
                        <optgroup label="Sistem Sayfaları">
                          <option value="Yakındaki Sahalar|/yakin-sahalar">Yakındaki Sahalar</option>
                          <option value="Oyuncu Bul|/oyuncu-bul">Oyuncu Bul</option>
                          <option value="Meydan|/meydan">Meydan</option>
                          <option value="Blog|/blog">Blog</option>
                          <option value="Turnuvalar|/turnuvalar">Turnuvalar</option>
                        </optgroup>
                        {availablePages.length > 0 && (
                          <optgroup label="Özel Sayfalar">
                            {availablePages.map(p => (
                              <option key={p.id} value={`${p.title}|/${p.slug}`}>{p.title}</option>
                            ))}
                          </optgroup>
                        )}
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Etiket</label>
                      <input 
                        type="text"
                        placeholder="Örn: Hakkımızda"
                        className="w-full border border-gray-300 rounded-lg p-2"
                        value={newHeaderItem.label}
                        onChange={(e) => setNewHeaderItem({...newHeaderItem, label: e.target.value})}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Link (Href)</label>
                      <input 
                        type="text"
                         placeholder="Örn: /hakkimizda"
                        className="w-full border border-gray-300 rounded-lg p-2"
                        value={newHeaderItem.href}
                        onChange={(e) => setNewHeaderItem({...newHeaderItem, href: e.target.value})}
                      />
                    </div>
                    <div className="w-1/4">
                      <label className="block text-xs font-medium text-gray-500 mb-1">İkon (Lucide)</label>
                      <input 
                        type="text"
                        placeholder="Örn: Users"
                        className="w-full border border-gray-300 rounded-lg p-2"
                        value={newHeaderItem.icon}
                        onChange={(e) => setNewHeaderItem({...newHeaderItem, icon: e.target.value})}
                      />
                    </div>
                    <button 
                      onClick={addHeaderItem}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors h-[42px] flex items-center justify-center"
                    >
                      <Plus size={20} />
                    </button>
                  </div>

                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Etiket</th>
                          <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Link</th>
                          <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">İkon</th>
                          <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase text-right">İşlem</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {settings.menus.header.map((item) => (
                          <tr key={item.id} className="group hover:bg-gray-50">
                            <td className="px-6 py-3 font-medium text-gray-900">{item.label}</td>
                            <td className="px-6 py-3 text-blue-600 font-mono text-sm">{item.href}</td>
                            <td className="px-6 py-3 text-gray-500 text-sm">{item.icon}</td>
                            <td className="px-6 py-3 text-right">
                              <button 
                                onClick={() => removeHeaderItem(item.id)}
                                className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-full"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {settings.menus.header.length === 0 && (
                          <tr><td colSpan="4" className="text-center py-4 text-gray-400 italic">Menü öğesi bulunmuyor.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Footer Menus */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <LinkIcon size={20} className="text-purple-500" />
                      Footer Linkleri
                    </h3>
                    <button 
                      onClick={loadDefaultFooter}
                      className="text-xs font-bold text-purple-600 hover:text-purple-800 bg-purple-50 px-3 py-1.5 rounded-lg border border-purple-100 transition-all hover:bg-purple-100"
                    >
                      Varsayılanları Yükle
                    </button>
                  </div>
                  
                  <div className="flex gap-4 mb-4 items-end bg-gray-50 p-4 rounded-lg">
                    <div className="w-1/4">
                       <label className="block text-xs font-medium text-gray-500 mb-1">Kolon</label>
                       <select
                        className="w-full border border-gray-300 rounded-lg p-2"
                        value={newFooterItem.column}
                        onChange={(e) => setNewFooterItem({...newFooterItem, column: e.target.value})}
                       >
                         <option value="platform">Platform</option>
                         <option value="sahaSahipleri">Saha Sahipleri</option>
                         <option value="kurumsal">Kurumsal</option>
                       </select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Hazır Sayfalar</label>
                      <select 
                        className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                        onChange={(e) => {
                          const val = e.target.value;
                          if (!val) return;
                          const [label, href] = val.split('|');
                          setNewFooterItem({...newFooterItem, label, href});
                        }}
                        defaultValue=""
                      >
                        <option value="" disabled>Sayfa Seç...</option>
                        <optgroup label="Sistem Sayfaları">
                           <option value="Nasıl Çalışır?|/nasil-calisir">Nasıl Çalışır?</option>
                           <option value="Hakkımızda|/hakkimizda">Hakkımızda</option>
                           <option value="İletişim|/iletisim">İletişim</option>
                           <option value="Fiyatlandırma|/pricing">Fiyatlandırma</option>
                        </optgroup>
                        {availablePages.length > 0 && (
                          <optgroup label="Özel Sayfalar">
                            {availablePages.map(p => (
                              <option key={p.id} value={`${p.title}|/${p.slug}`}>{p.title}</option>
                            ))}
                          </optgroup>
                        )}
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Etiket</label>
                      <input 
                        type="text"
                        placeholder="Link Adı"
                        className="w-full border border-gray-300 rounded-lg p-2"
                        value={newFooterItem.label}
                        onChange={(e) => setNewFooterItem({...newFooterItem, label: e.target.value})}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Link (Href)</label>
                      <input 
                        type="text"
                        placeholder="/link-adresi"
                        className="w-full border border-gray-300 rounded-lg p-2"
                        value={newFooterItem.href}
                        onChange={(e) => setNewFooterItem({...newFooterItem, href: e.target.value})}
                      />
                    </div>
                    <button 
                      onClick={addFooterItem}
                      className="bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700 transition-colors h-[42px] flex items-center justify-center"
                    >
                      <Plus size={20} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {['platform', 'sahaSahipleri', 'kurumsal'].map((col) => (
                       <div key={col} className="border rounded-lg overflow-hidden">
                          <div className="bg-gray-100 px-4 py-2 border-b font-bold text-gray-700 capitalize">
                            {col === 'sahaSahipleri' ? 'Saha Sahipleri' : col}
                          </div>
                          <div className="divide-y divide-gray-100">
                            {settings.menus.footer[col].map((item) => (
                              <div key={item.id} className="flex justify-between items-center p-3 hover:bg-gray-50 group">
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{item.label}</p>
                                  <p className="text-xs text-blue-500">{item.href}</p>
                                </div>
                                <button 
                                  onClick={() => removeFooterItem(col, item.id)}
                                  className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ))}
                            {settings.menus.footer[col].length === 0 && (
                                <p className="text-center py-4 text-gray-400 text-xs italic">Link yok.</p>
                            )}
                          </div>
                       </div>
                    ))}
                  </div>
                </div>
              </div>
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

            {/* --- PAYMENT & OFFERS TAB --- */}
            {activeTab === 'payment_offers' && (
              <>
                {/* Global Payment Settings */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <Banknote size={20} className="text-emerald-500" />
                    Saha Sahibi Ödeme Ayarları
                  </h3>
                  
                  <div className="flex flex-col md:flex-row gap-8">
                    <div className="flex-1">
                      <div className="flex items-start gap-3">
                        <div className="flex items-center h-5 mt-1">
                          <input
                            id="mandatoryPayment"
                            type="checkbox"
                            className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                            checked={settings.membership?.mandatoryPayment || false}
                            onChange={(e) => setSettings({
                              ...settings,
                              membership: { ...settings.membership, mandatoryPayment: e.target.checked }
                            })}
                          />
                        </div>
                        <div>
                          <label htmlFor="mandatoryPayment" className="font-medium text-gray-900">
                            Aylık Ödeme Zorunlu Olsun
                          </label>
                          <p className="text-sm text-gray-500 mt-1">
                            Bu seçenek işaretlendiğinde, saha sahipleri panel erişimi için aylık ödeme yapmak zorunda kalır.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1">
                       <label className="block text-sm font-medium text-gray-700 mb-1">
                         Standart Aylık Üyelik Bedeli
                       </label>
                       <div className="relative">
                          <input 
                            type="number" 
                            className="w-full border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500 p-2.5 pl-10 border"
                            placeholder="0.00"
                            value={settings.membership?.monthlyFee || 0}
                            onChange={(e) => setSettings({
                              ...settings,
                              membership: { ...settings.membership, monthlyFee: parseFloat(e.target.value) }
                            })}
                          />
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-gray-500 font-bold">₺</span>
                          </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* User Specific Rules */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                       <UserCheck size={20} className="text-purple-500" />
                       Kullanıcıya Özel Ayarlar
                    </h3>
                  </div>

                  {/* Add New User Rule Section */}
                  <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 mb-8">
                    <h4 className="text-sm font-bold text-gray-800 mb-4 border-b border-gray-200 pb-2">
                      Yeni Özel Teklif / Kural Ekle
                    </h4>
                    
                    {!selectedUserForRule ? (
                      <div className="relative">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Kullanıcı Ara (İsim, E-posta veya Telefon)</label>
                        <div className="flex gap-2">
                          <input 
                            type="text"
                            className="flex-1 border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                            placeholder="Kullanıcı adı yazın..."
                            value={userQuery}
                            onChange={(e) => handleSearchUsers(e.target.value)}
                          />
                          <div className="bg-white p-2.5 rounded-lg border border-gray-300 text-gray-400">
                             <Search size={20} />
                          </div>
                        </div>
                        
                        {/* Search Results Dropdown */}
                        {userSearchResults.length > 0 && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-100 max-h-60 overflow-y-auto z-10 p-1">
                            {userSearchResults.map(u => (
                              <button
                                key={u.id}
                                onClick={() => selectUserForRule(u)}
                                className="w-full text-left p-3 hover:bg-purple-50 rounded-lg transition-colors group flex items-center gap-3"
                              >
                                <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold">
                                  {u.fullName ? u.fullName.charAt(0).toUpperCase() : u.email.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900 group-hover:text-purple-700">
                                    {u.fullName || 'İsimsiz Kullanıcı'} 
                                    <span className="text-xs font-normal text-gray-500 ml-2">({u.role || 'user'})</span>
                                  </p>
                                  <p className="text-xs text-gray-500">{u.email} • {u.phone || 'Tel Yok'}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                        {isSearchingUsers && (
                          <div className="absolute top-full left-0 right-0 mt-2 text-center text-sm text-gray-500 py-2">
                            Aranıyor...
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between bg-purple-50 p-3 rounded-lg border border-purple-100">
                           <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-lg">
                                {selectedUserForRule.fullName ? selectedUserForRule.fullName.charAt(0).toUpperCase() : 'U'}
                              </div>
                              <div>
                                <p className="font-bold text-gray-900">{selectedUserForRule.fullName || 'İsimsiz'}</p>
                                <p className="text-xs text-gray-500">{selectedUserForRule.email}</p>
                              </div>
                           </div>
                           <button 
                            onClick={() => setSelectedUserForRule(null)}
                            className="text-xs text-red-500 hover:underline font-medium"
                           >
                            Kullanıcıyı Değiştir
                           </button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">
                              Özel Komisyon Oranı (%)
                            </label>
                            <input 
                              type="number"
                              className="w-full border border-gray-300 rounded-lg p-2"
                              placeholder={`Varsayılan: %${settings.commission?.baseRate || 5}`}
                              value={newRuleData.commissionRate}
                              onChange={(e) => setNewRuleData({...newRuleData, commissionRate: e.target.value})}
                            />
                            <p className="text-[10px] text-gray-400 mt-1">Boş bırakılırsa standart tarife uygulanır.</p>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">
                              Özel Aylık Ücret (TL)
                            </label>
                            <input 
                              type="number"
                              className="w-full border border-gray-300 rounded-lg p-2"
                              placeholder={`Varsayılan: ₺${settings.membership?.monthlyFee || 0}`}
                              value={newRuleData.specialMonthlyFee}
                              onChange={(e) => setNewRuleData({...newRuleData, specialMonthlyFee: e.target.value})}
                            />
                            <p className="text-[10px] text-gray-400 mt-1">Boş bırakılırsa standart ücret uygulanır.</p>
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-gray-500 mb-1">
                               Not / Açıklama
                            </label>
                            <input 
                              type="text"
                              className="w-full border border-gray-300 rounded-lg p-2"
                              placeholder="Örn: X tarihe kadar geçerli promosyon..."
                              value={newRuleData.note}
                              onChange={(e) => setNewRuleData({...newRuleData, note: e.target.value})}
                            />
                          </div>
                        </div>

                        <div className="flex justify-end pt-2">
                          <button 
                            onClick={addSpecialRule}
                            className="bg-purple-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-purple-700 transition-colors shadow-sm flex items-center gap-2"
                          >
                            <Plus size={16} />
                            Listeye Ekle
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Active Rules List */}
                  <div className="border rounded-xl overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Kullanıcı</th>
                          <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Komisyon</th>
                          <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Aylık Ücret</th>
                          <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Not</th>
                          <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase text-right">İşlem</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {(settings.specialRules || []).map((rule, idx) => (
                          <tr key={idx} className="group hover:bg-gray-50">
                             <td className="px-6 py-4">
                                <p className="font-medium text-gray-900">{rule.userName}</p>
                                <p className="text-xs text-gray-500 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> 
                                  Aktif
                                </p>
                             </td>
                             <td className="px-6 py-4">
                               {rule.commissionRate !== null && rule.commissionRate !== '' ? (
                                 <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                   %{rule.commissionRate}
                                 </span>
                               ) : (
                                 <span className="text-gray-400 text-xs">-</span>
                               )}
                             </td>
                             <td className="px-6 py-4">
                               {rule.monthlyFee !== null && rule.monthlyFee !== '' ? (
                                 <span className="font-medium text-gray-900">₺{rule.monthlyFee}</span>
                               ) : (
                                  <span className="text-gray-400 text-xs">-</span>
                               )}
                             </td>
                             <td className="px-6 py-4 text-sm text-gray-600 italic">
                               {rule.note || '-'}
                             </td>
                             <td className="px-6 py-4 text-right">
                                <button 
                                  onClick={() => removeSpecialRule(rule.userId)}
                                  className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-full transition-colors"
                                >
                                  <Trash2 size={16} />
                                </button>
                             </td>
                          </tr>
                        ))}
                        {(!settings.specialRules || settings.specialRules.length === 0) && (
                          <tr>
                            <td colSpan="5" className="text-center py-12 text-gray-400">
                              <div className="flex justify-center mb-2">
                                <UserCheck className="w-8 h-8 opacity-20" />
                              </div>
                              Henüz özel bir kullanıcı kuralı tanımlanmadı.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
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
