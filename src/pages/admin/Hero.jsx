import React, { useState, useEffect } from 'react';
import { getHeroContent, updateHeroContent, logAdminAction } from '../../services/firestoreService';
import { useAuth } from '../../contexts/AuthContext';
import AdminSidebar from '../../components/AdminSidebar';
import { Save, AlertCircle, CheckCircle, Plus, Trash2, Palette } from 'lucide-react';

const Hero = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [heroContent, setHeroContent] = useState({
    title: '',
    subtitle: '',
    activeUsersText: 'kişi şu an online',
    backgroundColor: {
      from: '#00a651',
      to: '#04c956'
    },
    tabs: [
      { key: 'saha', label: 'Saha Kirala' },
      { key: 'oyuncu', label: 'Oyuncu Bul' },
      { key: 'takim', label: 'Takım Ara' }
    ],
    searchFields: {
      sportTypes: ['Tümü', 'Futbol', 'Basketbol', 'Tenis'],
      timeSlots: [
        'Tümü',
        'Sabah (06:00-12:00)',
        'Öğle (12:00-18:00)',
        'Akşam (18:00-00:00)',
        'Gece (00:00-06:00)'
      ]
    },
    searchButtonText: 'Ara',
    enabled: true
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    loadHeroContent();
  }, []);

  const loadHeroContent = async () => {
    setLoading(true);
    try {
      const result = await getHeroContent();
      if (result.success && result.data) {
        setHeroContent(result.data);
      }
    } catch (err) {
      setError('Hero içeriği yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await updateHeroContent(heroContent);
      if (result.success) {
        await logAdminAction(user?.uid || 'admin', 'hero_content_updated', {
          heroContent: heroContent
        });
        setSuccess('Hero içeriği başarıyla güncellendi');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError('Hero içeriği güncellenirken hata oluştu');
      }
    } catch (err) {
      setError('Hero içeriği güncellenirken hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const handleAddTab = () => {
    const newKey = `tab_${Date.now()}`;
    setHeroContent({
      ...heroContent,
      tabs: [...heroContent.tabs, { key: newKey, label: 'Yeni Tab' }]
    });
  };

  const handleRemoveTab = (index) => {
    if (heroContent.tabs.length > 1) {
      setHeroContent({
        ...heroContent,
        tabs: heroContent.tabs.filter((_, i) => i !== index)
      });
    }
  };

  const handleUpdateTab = (index, field, value) => {
    const updatedTabs = [...heroContent.tabs];
    updatedTabs[index] = { ...updatedTabs[index], [field]: value };
    setHeroContent({ ...heroContent, tabs: updatedTabs });
  };

  const handleAddSportType = () => {
    setHeroContent({
      ...heroContent,
      searchFields: {
        ...heroContent.searchFields,
        sportTypes: [...heroContent.searchFields.sportTypes, 'Yeni Spor']
      }
    });
  };

  const handleRemoveSportType = (index) => {
    if (heroContent.searchFields.sportTypes.length > 1) {
      setHeroContent({
        ...heroContent,
        searchFields: {
          ...heroContent.searchFields,
          sportTypes: heroContent.searchFields.sportTypes.filter((_, i) => i !== index)
        }
      });
    }
  };

  const handleAddTimeSlot = () => {
    setHeroContent({
      ...heroContent,
      searchFields: {
        ...heroContent.searchFields,
        timeSlots: [...heroContent.searchFields.timeSlots, 'Yeni Saat Dilimi']
      }
    });
  };

  const handleRemoveTimeSlot = (index) => {
    if (heroContent.searchFields.timeSlots.length > 1) {
      setHeroContent({
        ...heroContent,
        searchFields: {
          ...heroContent.searchFields,
          timeSlots: heroContent.searchFields.timeSlots.filter((_, i) => i !== index)
        }
      });
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar />
      <div className="flex-1 flex flex-col">
        <header className="bg-white shadow-sm border-b px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Hero Yönetimi</h1>
            <p className="text-gray-600 mt-1">Ana sayfa hero bölümünü yönet</p>
          </div>
        </header>
        <div className="flex-1 p-6 overflow-y-auto">
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
          
          <div className="space-y-6">
            {/* Genel Ayarlar */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Genel Ayarlar</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Durum
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={heroContent.enabled}
                      onChange={(e) => setHeroContent({ ...heroContent, enabled: e.target.checked })}
                      className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Hero bölümünü göster</span>
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Başlık
                  </label>
                  <input
                    type="text"
                    value={heroContent.title}
                    onChange={(e) => setHeroContent({ ...heroContent, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="Ana başlık metni"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Alt Başlık
                  </label>
                  <textarea
                    value={heroContent.subtitle}
                    onChange={(e) => setHeroContent({ ...heroContent, subtitle: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    rows="3"
                    placeholder="Alt başlık metni"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Aktif Kullanıcı Metni
                  </label>
                  <input
                    type="text"
                    value={heroContent.activeUsersText}
                    onChange={(e) => setHeroContent({ ...heroContent, activeUsersText: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="kişi şu an online"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Arama Butonu Metni
                  </label>
                  <input
                    type="text"
                    value={heroContent.searchButtonText}
                    onChange={(e) => setHeroContent({ ...heroContent, searchButtonText: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="Ara"
                  />
                </div>
              </div>
            </div>

            {/* Arka Plan Renkleri */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center mb-4">
                <Palette className="w-5 h-5 text-gray-600 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900">Arka Plan Renkleri</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Başlangıç Rengi
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={heroContent.backgroundColor.from}
                      onChange={(e) => setHeroContent({
                        ...heroContent,
                        backgroundColor: { ...heroContent.backgroundColor, from: e.target.value }
                      })}
                      className="w-16 h-10 border border-gray-300 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={heroContent.backgroundColor.from}
                      onChange={(e) => setHeroContent({
                        ...heroContent,
                        backgroundColor: { ...heroContent.backgroundColor, from: e.target.value }
                      })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      placeholder="#00a651"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bitiş Rengi
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={heroContent.backgroundColor.to}
                      onChange={(e) => setHeroContent({
                        ...heroContent,
                        backgroundColor: { ...heroContent.backgroundColor, to: e.target.value }
                      })}
                      className="w-16 h-10 border border-gray-300 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={heroContent.backgroundColor.to}
                      onChange={(e) => setHeroContent({
                        ...heroContent,
                        backgroundColor: { ...heroContent.backgroundColor, to: e.target.value }
                      })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      placeholder="#04c956"
                    />
                  </div>
                </div>
              </div>
              <div className="mt-4 p-4 rounded-lg" style={{
                background: `linear-gradient(to bottom right, ${heroContent.backgroundColor.from}, ${heroContent.backgroundColor.to})`
              }}>
                <p className="text-white text-sm font-medium">Önizleme</p>
              </div>
            </div>

            {/* Tab'lar */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Tab'lar</h3>
                <button
                  onClick={handleAddTab}
                  className="flex items-center space-x-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-sm font-medium">Tab Ekle</span>
                </button>
              </div>
              <div className="space-y-3">
                {heroContent.tabs.map((tab, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1 grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Key</label>
                        <input
                          type="text"
                          value={tab.key}
                          onChange={(e) => handleUpdateTab(index, 'key', e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Label</label>
                        <input
                          type="text"
                          value={tab.label}
                          onChange={(e) => handleUpdateTab(index, 'label', e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                    </div>
                    {heroContent.tabs.length > 1 && (
                      <button
                        onClick={() => handleRemoveTab(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Spor Türleri */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Spor Türleri</h3>
                <button
                  onClick={handleAddSportType}
                  className="flex items-center space-x-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-sm font-medium">Ekle</span>
                </button>
              </div>
              <div className="space-y-2">
                {heroContent.searchFields.sportTypes.map((sport, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={sport}
                      onChange={(e) => {
                        const updated = [...heroContent.searchFields.sportTypes];
                        updated[index] = e.target.value;
                        setHeroContent({
                          ...heroContent,
                          searchFields: { ...heroContent.searchFields, sportTypes: updated }
                        });
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                    {heroContent.searchFields.sportTypes.length > 1 && (
                      <button
                        onClick={() => handleRemoveSportType(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Saat Dilimleri */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Saat Dilimleri</h3>
                <button
                  onClick={handleAddTimeSlot}
                  className="flex items-center space-x-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-sm font-medium">Ekle</span>
                </button>
              </div>
              <div className="space-y-2">
                {heroContent.searchFields.timeSlots.map((slot, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={slot}
                      onChange={(e) => {
                        const updated = [...heroContent.searchFields.timeSlots];
                        updated[index] = e.target.value;
                        setHeroContent({
                          ...heroContent,
                          searchFields: { ...heroContent.searchFields, timeSlots: updated }
                        });
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                    {heroContent.searchFields.timeSlots.length > 1 && (
                      <button
                        onClick={() => handleRemoveTimeSlot(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Kaydet Butonu */}
            <div className="flex justify-end pt-6">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center space-x-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Kaydediliyor...' : 'Kaydet'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;

