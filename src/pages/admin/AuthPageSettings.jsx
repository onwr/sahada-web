import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, Plus, Trash2, Loader2, CheckCircle2 } from 'lucide-react';
import { getAuthPageContent, saveAuthPageContent } from '../../services/firestoreService';
import { uploadImage } from '../../services/cdnService';
import { toast } from 'react-hot-toast';
import { Image, Upload, X } from 'lucide-react';
import AdminSidebar from '../../components/AdminSidebar';

const ImageUploadField = ({ label, type, value, onRemove, onUpload }) => (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <div className="flex items-start gap-4">
        {value ? (
          <div className="relative group">
            <img 
              src={value} 
              alt={label} 
              className="w-32 h-32 object-cover rounded-lg border border-gray-200"
            />
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onRemove(type);
              }}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-600"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <div className="w-32 h-32 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400">
            <Image size={24} />
            <span className="text-xs mt-1">Görsel Yok</span>
          </div>
        )}
        
        <div className="flex-1">
          <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            <Upload size={16} />
            {value ? 'Görseli Değiştir' : 'Görsel Yükle'}
            <input
              type="file"
              className="hidden"
              accept="image/*"
              onChange={(e) => onUpload(e, type)}
            />
          </label>
          <p className="text-xs text-gray-500 mt-2">
            PNG, JPG veya WEBP formatında, maksimum 5MB.
          </p>
        </div>
      </div>
    </div>
  );

const AuthPageSettings = () => {
  const [activeTab, setActiveTab] = useState('player'); // 'player' or 'owner'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [playerContent, setPlayerContent] = useState({
    title: 'Sahada Buluşalım!',
    description: "Türkiye'nin en büyük spor platformuna katıl, takımını kur, sahada yerini al!",
    features: [
      '15.000+ aktif saha',
      '100.000+ sporcu', 
      'Anında oyuncu bulma',
      'Güvenli ödeme sistemi'
    ]
  });

  const [ownerContent, setOwnerContent] = useState({
    prefixTitle: 'Saha Sahibi Paneli',
    title: 'İşletmenizi',
    highlightedTitle: 'Dijitale Taşıyın',
    description: 'Tesisinizi binlerce sporcuyla buluşturun, rezervasyonları otomatikleştirin ve gelirinizi artırın.',
    features: [
      { title: 'Tesis Yönetimi', desc: 'Sahalarınızı kolayca yönetin, özelliklerini güncelleyin.' },
      { title: 'Müşteri Ağı', desc: 'Binlerce sporcuya doğrudan ulaşın ve doluluk oranınızı artırın.' },
      { title: 'Gelir Takibi', desc: 'Detaylı finansal raporlarla gelirinizi anlık takip edin.' }
    ]
  });

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    setLoading(true);
    try {
      const playerRes = await getAuthPageContent('player');
      const ownerRes = await getAuthPageContent('owner');

      if (playerRes.success && playerRes.data) {
        setPlayerContent(prev => ({ ...prev, ...playerRes.data }));
      }
      if (ownerRes.success && ownerRes.data) {
        setOwnerContent(prev => ({ ...prev, ...ownerRes.data }));
      }
    } catch (error) {
      console.error('Error loading content:', error);
      toast.error('İçerik yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const contentToSave = activeTab === 'player' ? playerContent : ownerContent;
      const result = await saveAuthPageContent(activeTab, contentToSave);
      
      if (result.success) {
        toast.success('Değişiklikler kaydedildi');
      } else {
        toast.error('Kaydedilirken hata oluştu');
      }
    } catch (error) {
      console.error('Error saving content:', error);
      toast.error('Beklenmedik bir hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const addFeature = () => {
    if (activeTab === 'player') {
      setPlayerContent(prev => ({
        ...prev,
        features: [...prev.features, 'Yeni Özellik']
      }));
    } else {
      setOwnerContent(prev => ({
        ...prev,
        features: [...prev.features, { title: 'Yeni Başlık', desc: 'Yeni Açıklama' }]
      }));
    }
  };

  const removeFeature = (index) => {
    if (activeTab === 'player') {
      setPlayerContent(prev => ({
        ...prev,
        features: prev.features.filter((_, i) => i !== index)
      }));
    } else {
      setOwnerContent(prev => ({
        ...prev,
        features: prev.features.filter((_, i) => i !== index)
      }));
    }
  };

  const updateFeature = (index, field, value) => {
    if (activeTab === 'player') {
      const newFeatures = [...playerContent.features];
      newFeatures[index] = value;
      setPlayerContent(prev => ({ ...prev, features: newFeatures }));
    } else {
      const newFeatures = [...ownerContent.features];
      newFeatures[index] = { ...newFeatures[index], [field]: value };
      setOwnerContent(prev => ({ ...prev, features: newFeatures }));
    }
  };

  const handleImageUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    const loadingId = toast.loading('Resim yükleniyor...');
    try {
      const result = await uploadImage(file, 'auth_assets', 'admin');
      
      if (result.success) {
        const url = result.data.url;
        
        if (activeTab === 'player') {
          setPlayerContent(prev => ({ ...prev, [type]: url }));
        } else {
          setOwnerContent(prev => ({ ...prev, [type]: url }));
        }
        toast.success('Resim yüklendi', { id: loadingId });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Resim yüklenemedi', { id: loadingId });
    }
  };

  const removeImage = (type) => {
    if (activeTab === 'player') {
      setPlayerContent(prev => ({ ...prev, [type]: '' }));
    } else {
      setOwnerContent(prev => ({ ...prev, [type]: '' }));
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar />
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white shadow-sm border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Giriş Sayfası Yönetimi</h1>
              <p className="text-gray-600 mt-1">Giriş ve kayıt sayfalarındaki tanıtım metinlerini düzenleyin.</p>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2 hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              Kaydet
            </button>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setActiveTab('player')}
                className={`flex-1 py-4 text-center font-medium transition-colors ${
                  activeTab === 'player' 
                    ? 'text-green-600 border-b-2 border-green-600 bg-green-50/50' 
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                Oyuncu Giriş Sayfası
              </button>
              <button
                onClick={() => setActiveTab('owner')}
                className={`flex-1 py-4 text-center font-medium transition-colors ${
                  activeTab === 'owner' 
                    ? 'text-green-600 border-b-2 border-green-600 bg-green-50/50' 
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                Saha Sahibi Giriş Sayfası
              </button>
            </div>

            <div className="p-6">
              <AnimatePresence mode="wait">
                {activeTab === 'player' ? (
                  <motion.div
                    key="player"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6"
                  >
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6">
                      <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                        <Image size={18} />
                        Görseller
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <ImageUploadField 
                          label="Arkaplan Görseli" 
                          type="backgroundImage" 
                          value={playerContent.backgroundImage} 
                          onRemove={removeImage}
                          onUpload={handleImageUpload}
                        />
                        <ImageUploadField 
                          label="Side Görseli (Opsiyonel)" 
                          type="sideImage" 
                          value={playerContent.sideImage} 
                          onRemove={removeImage}
                          onUpload={handleImageUpload}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Başlık</label>
                      <input
                        type="text"
                        value={playerContent.title}
                        onChange={(e) => setPlayerContent(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Açıklama</label>
                      <textarea
                        rows={3}
                        value={playerContent.description}
                        onChange={(e) => setPlayerContent(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700">Özellikler Listesi</label>
                        <button onClick={addFeature} className="text-sm text-green-600 flex items-center gap-1 hover:underline">
                          <Plus size={16} /> Ekle
                        </button>
                      </div>
                      <div className="space-y-3">
                        {playerContent.features.map((feature, index) => (
                          <div key={index} className="flex gap-2">
                            <input
                              type="text"
                              value={feature}
                              onChange={(e) => updateFeature(index, null, e.target.value)}
                              className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            />
                            <button 
                              onClick={() => removeFeature(index)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="owner"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6"
                  >
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6">
                      <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                        <Image size={18} />
                        Görseller
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <ImageUploadField 
                          label="Arkaplan Görseli" 
                          type="backgroundImage" 
                          value={ownerContent.backgroundImage} 
                          onRemove={removeImage}
                          onUpload={handleImageUpload}
                        />
                        <ImageUploadField 
                          label="Side Görseli (Opsiyonel)" 
                          type="sideImage" 
                          value={ownerContent.sideImage} 
                          onRemove={removeImage}
                          onUpload={handleImageUpload}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Üst Başlık (Küçük)</label>
                        <input
                          type="text"
                          value={ownerContent.prefixTitle}
                          onChange={(e) => setOwnerContent(prev => ({ ...prev, prefixTitle: e.target.value }))}
                          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Ana Başlık (İlk Satır)</label>
                        <input
                          type="text"
                          value={ownerContent.title}
                          onChange={(e) => setOwnerContent(prev => ({ ...prev, title: e.target.value }))}
                          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Vurgulu Başlık (Renkli)</label>
                        <input
                          type="text"
                          value={ownerContent.highlightedTitle}
                          onChange={(e) => setOwnerContent(prev => ({ ...prev, highlightedTitle: e.target.value }))}
                          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Açıklama</label>
                      <textarea
                        rows={3}
                        value={ownerContent.description}
                        onChange={(e) => setOwnerContent(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700">Özellikler (Kutucuklar)</label>
                        <button onClick={addFeature} className="text-sm text-green-600 flex items-center gap-1 hover:underline">
                          <Plus size={16} /> Ekle
                        </button>
                      </div>
                      <div className="space-y-4">
                        {ownerContent.features.map((feature, index) => (
                          <div key={index} className="flex gap-4 p-4 border rounded-xl bg-gray-50">
                            <div className="flex-1 space-y-3">
                              <input
                                type="text"
                                placeholder="Özellik Başlığı"
                                value={feature.title}
                                onChange={(e) => updateFeature(index, 'title', e.target.value)}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                              />
                              <input
                                type="text"
                                placeholder="Özellik Açıklaması"
                                value={feature.desc}
                                onChange={(e) => updateFeature(index, 'desc', e.target.value)}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                              />
                            </div>
                            <button 
                              onClick={() => removeFeature(index)}
                              className="self-center p-2 text-red-500 hover:bg-red-100 rounded-lg"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPageSettings;
