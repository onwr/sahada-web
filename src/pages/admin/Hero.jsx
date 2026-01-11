import React, { useState, useEffect } from 'react';
import { getHeroContent, updateHeroContent, logAdminAction } from '../../services/firestoreService';
import { useAuth } from '../../contexts/AuthContext';
import AdminSidebar from '../../components/AdminSidebar';
import { Save, AlertCircle, CheckCircle, Plus, Trash2, Edit2, Image as ImageIcon, ArrowUp, ArrowDown, GripVertical, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

const INITIAL_SLIDES = [
  {
    id: '1',
    title: 'Maç Eksik Olmasın.',
    subtitle: "İster saha kirala, ister eksik oyuncunu bul. Türkiye'nin en büyük sporcu topluluğu ile sahaya çıkmaya hazırsın.",
    buttonText: 'Hemen Başla',
    buttonLink: '/yakin-sahalar',
    imageUrl: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?q=80&w=2070&auto=format&fit=crop',
    isActive: true,
    order: 1
  },
  {
    id: '2',
    title: 'Rakip Bul, Maç Yap',
    subtitle: "Kendi seviyende rakiplerle karşılaşmak için hemen ilan oluştur veya mevcut maçlara katıl.",
    buttonText: 'Maç Bul',
    buttonLink: '/oyuncu-bul',
    imageUrl: 'https://images.unsplash.com/photo-1543351611-58f69d7c1781?q=80&w=2540&auto=format&fit=crop',
    isActive: true,
    order: 2
  }
];

const Hero = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [slides, setSlides] = useState([]);
  const [editingSlide, setEditingSlide] = useState(null); // The slide currently being edited or added
  const [isEditing, setIsEditing] = useState(false); // Mode flag

  useEffect(() => {
    loadHeroContent();
  }, []);

  const loadHeroContent = async () => {
    setLoading(true);
    try {
      const result = await getHeroContent();
      if (result.success && result.data && result.data.slides && Array.isArray(result.data.slides)) {
        setSlides(result.data.slides.sort((a, b) => a.order - b.order));
      } else {
        // Fallback to initial mock data if no slides found or legacy data
        setSlides(INITIAL_SLIDES);
      }
    } catch (err) {
      console.error(err);
      toast.error('Hero içeriği yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const result = await updateHeroContent({ slides });
      if (result.success) {
        await logAdminAction(user?.uid || 'admin', 'hero_slides_updated', { count: slides.length });
        toast.success('Hero slaytları başarıyla güncellendi');
      } else {
        toast.error('Güncelleme başarısız oldu');
      }
    } catch (err) {
      console.error(err);
      toast.error('Bir hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const handleAddNewResult = () => {
    setEditingSlide({
      id: Date.now().toString(),
      title: '',
      subtitle: '',
      buttonText: '',
      buttonLink: '',
      imageUrl: '',
      isActive: true,
      order: slides.length + 1
    });
    setIsEditing(true);
  };

  const handleEditSlide = (slide) => {
    setEditingSlide({ ...slide });
    setIsEditing(true);
  };

  const handleDeleteSlide = (id) => {
    if (window.confirm('Bu slaytı silmek istediğinizden emin misiniz?')) {
      setSlides(prev => prev.filter(s => s.id !== id));
    }
  };

  const handleSaveSlide = () => {
    if (!editingSlide.title || !editingSlide.imageUrl) {
        toast.error("Başlık ve Görsel URL zorunludur.");
        return;
    }

    setSlides(prev => {
      const existingIndex = prev.findIndex(s => s.id === editingSlide.id);
      if (existingIndex >= 0) {
        const newSlides = [...prev];
        newSlides[existingIndex] = editingSlide;
        return newSlides.sort((a, b) => a.order - b.order);
      } else {
        return [...prev, editingSlide].sort((a, b) => a.order - b.order);
      }
    });
    setIsEditing(false);
    setEditingSlide(null);
  };

  const handleMoveSlide = (index, direction) => {
    const newSlides = [...slides];
    if (direction === 'up' && index > 0) {
      [newSlides[index], newSlides[index - 1]] = [newSlides[index - 1], newSlides[index]];
    } else if (direction === 'down' && index < newSlides.length - 1) {
      [newSlides[index], newSlides[index + 1]] = [newSlides[index + 1], newSlides[index]];
    }
    // Re-assign order numbers
    const reordered = newSlides.map((s, i) => ({ ...s, order: i + 1 }));
    setSlides(reordered);
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
              <h1 className="text-2xl font-bold text-gray-900">Hero Yönetimi</h1>
              <p className="text-gray-600 mt-1">Ana sayfa kayan görselleri (slider) yönetin.</p>
            </div>
            {!isEditing && (
                <button
                onClick={handleSaveAll}
                disabled={saving}
                className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2 hover:bg-green-700 disabled:opacity-50"
                >
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                Yayına Al (Kaydet)
                </button>
            )}
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto">
            {isEditing && editingSlide ? (
                /* Edit Form */
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-4xl mx-auto">
                     <div className="flex items-center justify-between mb-6 border-b pb-4">
                        <h2 className="text-xl font-bold text-gray-800">
                             {slides.find(s => s.id === editingSlide.id) ? 'Slaytı Düzenle' : 'Yeni Slayt Ekle'}
                        </h2>
                        <button onClick={() => setIsEditing(false)} className="text-gray-500 hover:text-gray-700">İptal</button>
                     </div>
                     
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Başlık <span className="text-red-500">*</span></label>
                                <input 
                                    type="text" 
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                                    value={editingSlide.title}
                                    onChange={e => setEditingSlide({...editingSlide, title: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Alt Başlık</label>
                                <textarea 
                                    rows={3}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                                    value={editingSlide.subtitle}
                                    onChange={e => setEditingSlide({...editingSlide, subtitle: e.target.value})}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Buton Metni</label>
                                    <input 
                                        type="text" 
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                                        value={editingSlide.buttonText}
                                        onChange={e => setEditingSlide({...editingSlide, buttonText: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Buton Linki</label>
                                    <input 
                                        type="text" 
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                                        value={editingSlide.buttonLink}
                                        onChange={e => setEditingSlide({...editingSlide, buttonLink: e.target.value})}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="flex items-center gap-2 cursor-pointer mt-2">
                                    <input 
                                        type="checkbox"
                                        className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                                        checked={editingSlide.isActive}
                                        onChange={e => setEditingSlide({...editingSlide, isActive: e.target.checked})} 
                                    />
                                    <span className="text-gray-700 font-medium">Bu slayt aktif olsun</span>
                                </label>
                            </div>
                        </div>

                        <div className="space-y-4">
                             <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Görsel URL <span className="text-red-500">*</span></label>
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                                        value={editingSlide.imageUrl}
                                        onChange={e => setEditingSlide({...editingSlide, imageUrl: e.target.value})}
                                        placeholder="https://..."
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Unsplash veya başka bir kaynaktan doğrudan görsel linki.</p>
                            </div>
                            
                            <div className="border-2 border-dashed border-gray-200 rounded-xl p-2 bg-gray-50 flex items-center justify-center min-h-[200px]">
                                {editingSlide.imageUrl ? (
                                    <img src={editingSlide.imageUrl} alt="Preview" className="max-h-[250px] w-full object-cover rounded-lg shadow-sm" onError={(e) => e.target.src = 'https://via.placeholder.com/400x200?text=Gorsel+Hatasi'} />
                                ) : (
                                    <div className="text-center text-gray-400">
                                        <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                        <p>Görsel önizlemesi burada görünecek</p>
                                    </div>
                                )}
                            </div>
                        </div>
                     </div>

                     <div className="flex justify-end gap-3 mt-8 pt-4 border-t">
                        <button 
                            onClick={() => setIsEditing(false)} 
                            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                        >
                            İptal
                        </button>
                        <button 
                            onClick={handleSaveSlide} 
                            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                        >
                            <Save size={18} />
                            Listeye Ekle / Güncelle
                        </button>
                     </div>
                </div>
            ) : (
                /* List View */
                <div className="max-w-5xl mx-auto space-y-6">
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3 text-blue-800 text-sm">
                        <AlertCircle className="shrink-0 w-5 h-5" />
                        <p>Burada yaptığınız değişiklikler "Yayına Al" butonuna basana kadar kaydedilmez. Sıralamayı değiştirmek için okları kullanın.</p>
                    </div>

                    <div className="grid gap-4">
                        {slides.map((slide, index) => (
                            <div key={slide.id} className={`bg-white rounded-xl p-4 shadow-sm border ${slide.isActive ? 'border-gray-200' : 'border-red-200 bg-red-50/30'} flex flex-col md:flex-row gap-4 items-center`}>
                                {/* Drag/Order Controls */}
                                <div className="flex flex-row md:flex-col gap-1">
                                    <button 
                                        onClick={() => handleMoveSlide(index, 'up')} 
                                        disabled={index === 0}
                                        className="p-1 text-gray-400 hover:text-green-600 disabled:opacity-30"
                                    >
                                        <ArrowUp size={20} />
                                    </button>
                                    <span className="text-center font-mono text-xs text-gray-400 font-bold">{index + 1}</span>
                                    <button 
                                        onClick={() => handleMoveSlide(index, 'down')} 
                                        disabled={index === slides.length - 1}
                                        className="p-1 text-gray-400 hover:text-green-600 disabled:opacity-30"
                                    >
                                        <ArrowDown size={20} />
                                    </button>
                                </div>

                                {/* Thumbnail */}
                                <div className="w-full md:w-48 h-32 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                                    <img src={slide.imageUrl} alt={slide.title} className="w-full h-full object-cover" />
                                </div>

                                {/* Details */}
                                <div className="flex-1 min-w-0 text-center md:text-left">
                                    <h3 className="font-bold text-lg text-gray-900 truncate">{slide.title}</h3>
                                    <p className="text-gray-500 text-sm line-clamp-2 mb-2">{slide.subtitle}</p>
                                    <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                                        <span className={`text-xs px-2 py-1 rounded-full border ${slide.isActive ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                            {slide.isActive ? 'Aktif' : 'Pasif'}
                                        </span>
                                        {slide.buttonText && (
                                            <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                                                BTN: {slide.buttonText}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => handleEditSlide(slide)}
                                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                        title="Düzenle"
                                    >
                                        <Edit2 size={20} />
                                    </button>
                                    <button 
                                        onClick={() => handleDeleteSlide(slide.id)}
                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Sil"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            </div>
                        ))}

                        {slides.length === 0 && (
                            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                                <p className="text-gray-500">Henüz hiç slayt yok.</p>
                            </div>
                        )}
                    </div>
                    
                    <button 
                        onClick={handleAddNewResult}
                        className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-green-500 hover:text-green-600 hover:bg-green-50 transition-all flex items-center justify-center gap-2 font-medium"
                    >
                        <Plus size={20} />
                        Yeni Slayt Ekle
                    </button>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default Hero;

