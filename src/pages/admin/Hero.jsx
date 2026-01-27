import React, { useState, useEffect } from 'react';
import { getHeroContent, updateHeroContent, logAdminAction } from '../../services/firestoreService';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import AdminSidebar from '../../components/AdminSidebar';
import { Save, AlertCircle, Plus, Trash2, Edit2, Image as ImageIcon, Loader2, Sparkles, Edit } from 'lucide-react';
import toast from '../../utils/toast';

const CARD_TYPES = [
  { value: 'match', label: 'Maç', icon: '🏀', color: 'orange' },
  { value: 'facility', label: 'Saha', icon: '⚽', color: 'green' },
  { value: 'player', label: 'Oyuncu', icon: '👤', color: 'gray' },
  { value: 'tournament', label: 'Turnuva', icon: '🎾', color: 'blue' }
];

const Hero = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('slides'); // 'slides' or 'cards'
  const [loading, setLoading] = useState(true);
  
  // Slides State
  const [slides, setSlides] = useState([]);
  const [editingSlide, setEditingSlide] = useState(null);
  const [isEditingSlide, setIsEditingSlide] = useState(false);
  const [savingSlides, setSavingSlides] = useState(false);
  
  // Cards State
  const [cards, setCards] = useState([]);
  const [editingCard, setEditingCard] = useState(null);
  const [showCardModal, setShowCardModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load slides
      const slideResult = await getHeroContent();
      if (slideResult.success && slideResult.data?.slides) {
        setSlides(slideResult.data.slides.sort((a, b) => a.order - b.order));
      }
      
      // Load cards
      const cardsRef = collection(db, 'heroCards');
      const q = query(cardsRef, orderBy('order', 'asc'));
      const snapshot = await getDocs(q);
      const cardsData = [];
      snapshot.forEach((doc) => {
        cardsData.push({ id: doc.id, ...doc.data() });
      });
      setCards(cardsData);
    } catch (err) {
      console.error(err);
      toast.error('Veri yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // ===== SLIDES FUNCTIONS =====
  const handleSaveSlides = async () => {
    setSavingSlides(true);
    try {
      const result = await updateHeroContent({ slides });
      if (result.success) {
        await logAdminAction(user?.uid || 'admin', 'hero_slides_updated', { count: slides.length });
        toast.success('Slaytlar güncellendi');
      } else {
        toast.error('Güncelleme başarısız');
      }
    } catch (err) {
      toast.error('Hata oluştu');
    } finally {
      setSavingSlides(false);
    }
  };

  const handleAddSlide = () => {
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
    setIsEditingSlide(true);
  };

  const handleSaveSlide = () => {
    if (!editingSlide.title || !editingSlide.imageUrl) {
      toast.error('Başlık ve görsel zorunlu');
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
    setIsEditingSlide(false);
    setEditingSlide(null);
  };

  const handleDeleteSlide = (id) => {
    if (window.confirm('Slaytı silmek istediğinize emin misiniz?')) {
      setSlides(prev => prev.filter(s => s.id !== id));
    }
  };

  // ===== CARDS FUNCTIONS =====
  const handleSaveCard = async (e) => {
    e.preventDefault();
    const cardData = {
      ...editingCard,
      order: parseInt(editingCard.order),
      rating: editingCard.rating ? parseFloat(editingCard.rating) : null,
      updatedAt: serverTimestamp()
    };

    try {
      if (editingCard.id && cards.find(c => c.id === editingCard.id)) {
        // Update
        const cardRef = doc(db, 'heroCards', editingCard.id);
        await updateDoc(cardRef, cardData);
        toast.success('Kart güncellendi');
      } else {
        // Create
        await addDoc(collection(db, 'heroCards'), {
          ...cardData,
          createdAt: serverTimestamp()
        });
        toast.success('Kart oluşturuldu');
      }
      setShowCardModal(false);
      setEditingCard(null);
      loadData();
    } catch (err) {
      toast.error('Hata: ' + err.message);
    }
  };

  const handleDeleteCard = async (id) => {
    if (!window.confirm('Kartı silmek istediğinize emin misiniz?')) return;
    try {
      await deleteDoc(doc(db, 'heroCards', id));
      toast.success('Kart silindi');
      loadData();
    } catch (err) {
      toast.error('Silme başarısız');
    }
  };

  const handleEditCard = (card) => {
    setEditingCard({
      ...card,
      subtitle: card.subtitle || '',
      badge: card.badge || '',
      badgeColor: card.badgeColor || 'red',
      icon: card.icon || '🏀',
      iconBgColor: card.iconBgColor || 'orange',
      location: card.location || '',
      rating: card.rating || '',
      playerName: card.playerName || '',
      playerRole: card.playerRole || '',
      playerQuote: card.playerQuote || ''
    });
    setShowCardModal(true);
  };

  const handleAddCard = () => {
    setEditingCard({
      type: 'match',
      title: '',
      subtitle: '',
      badge: '',
      badgeColor: 'red',
      icon: '🏀',
      iconBgColor: 'orange',
      location: '',
      rating: '',
      playerName: '',
      playerRole: '',
      playerQuote: '',
      order: cards.length + 1,
      isActive: true
    });
    setShowCardModal(true);
  };

  const handleTypeChange = (type) => {
    const typeConfig = CARD_TYPES.find(t => t.value === type);
    setEditingCard({
      ...editingCard,
      type,
      icon: typeConfig.icon,
      iconBgColor: typeConfig.color
    });
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar />
      
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
          <div className="space-y-6 max-w-[1600px] mx-auto">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Hero Yönetimi</h1>
                <p className="text-gray-500 mt-1">Anasayfa slider ve kartları</p>
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="flex border-b border-gray-100 px-6">
                <button
                  onClick={() => setActiveTab('slides')}
                  className={`px-6 py-4 text-sm font-bold border-b-2 transition-all ${activeTab === 'slides' ? 'border-green-600 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                  Slider Yönetimi
                </button>
                <button
                  onClick={() => setActiveTab('cards')}
                  className={`px-6 py-4 text-sm font-bold border-b-2 transition-all ${activeTab === 'cards' ? 'border-green-600 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                  Kart Yönetimi
                  <span className="ml-2 bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">{cards.length}</span>
                </button>
              </div>

              <div className="p-6">
                {activeTab === 'slides' ? (
                  // SLIDES TAB
                  isEditingSlide && editingSlide ? (
                    <div className="bg-white rounded-xl p-6 max-w-4xl mx-auto">
                      <div className="flex items-center justify-between mb-6 border-b pb-4">
                        <h2 className="text-xl font-bold">{slides.find(s => s.id === editingSlide.id) ? 'Slaytı Düzenle' : 'Yeni Slayt'}</h2>
                        <button onClick={() => setIsEditingSlide(false)} className="text-gray-500 hover:text-gray-700">İptal</button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-bold mb-2">Başlık *</label>
                            <input 
                              type="text" 
                              className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:bg-white outline-none"
                              value={editingSlide.title}
                              onChange={e => setEditingSlide({...editingSlide, title: e.target.value})}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-bold mb-2">Alt Başlık</label>
                            <textarea 
                              rows={3}
                              className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:bg-white outline-none resize-none"
                              value={editingSlide.subtitle}
                              onChange={e => setEditingSlide({...editingSlide, subtitle: e.target.value})}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-bold mb-2">Buton</label>
                              <input 
                                type="text" 
                                className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:bg-white outline-none"
                                value={editingSlide.buttonText}
                                onChange={e => setEditingSlide({...editingSlide, buttonText: e.target.value})}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-bold mb-2">Link</label>
                              <input 
                                type="text" 
                                className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:bg-white outline-none"
                                value={editingSlide.buttonLink}
                                onChange={e => setEditingSlide({...editingSlide, buttonLink: e.target.value})}
                              />
                            </div>
                          </div>
                          <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border-2 border-gray-200 cursor-pointer">
                            <input 
                              type="checkbox"
                              className="w-5 h-5 text-green-600 rounded-lg"
                              checked={editingSlide.isActive}
                              onChange={e => setEditingSlide({...editingSlide, isActive: e.target.checked})} 
                            />
                            <span className="font-bold">Aktif</span>
                          </label>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-bold mb-2">Görsel URL *</label>
                            <input 
                              type="text" 
                              className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:bg-white outline-none"
                              value={editingSlide.imageUrl}
                              onChange={e => setEditingSlide({...editingSlide, imageUrl: e.target.value})}
                            />
                          </div>
                          <div className="border-2 border-dashed border-gray-200 rounded-xl p-2 bg-gray-50 flex items-center justify-center min-h-[200px]">
                            {editingSlide.imageUrl ? (
                              <img src={editingSlide.imageUrl} alt="Preview" className="max-h-[250px] w-full object-cover rounded-lg" />
                            ) : (
                              <div className="text-center text-gray-400">
                                <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                <p>Önizleme</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-end gap-3 mt-8 pt-4 border-t">
                        <button onClick={() => setIsEditingSlide(false)} className="px-6 py-3 bg-gray-100 rounded-xl font-bold">İptal</button>
                        <button onClick={handleSaveSlide} className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-bold flex items-center gap-2">
                          <Save size={18} />
                          Kaydet
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <p className="text-sm text-gray-500">Değişiklikler "Yayına Al" ile kaydedilir</p>
                        <button onClick={handleSaveSlides} disabled={savingSlides} className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2 hover:bg-green-700">
                          {savingSlides ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                          Yayına Al
                        </button>
                      </div>
                      <div className="grid gap-4">
                        {slides.map((slide, idx) => (
                          <div key={slide.id} className="bg-white rounded-xl p-4 shadow-sm border flex gap-4 items-center">
                            <div className="w-48 h-32 bg-gray-100 rounded-lg overflow-hidden">
                              <img src={slide.imageUrl} alt={slide.title} className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-bold text-lg">{slide.title}</h3>
                              <p className="text-sm text-gray-500 line-clamp-2">{slide.subtitle}</p>
                              <span className={`text-xs px-2 py-1 rounded-full mt-2 inline-block ${slide.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                {slide.isActive ? 'Aktif' : 'Pasif'}
                              </span>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => { setEditingSlide(slide); setIsEditingSlide(true); }} className="p-2 hover:bg-gray-100 rounded-lg">
                                <Edit2 size={20} />
                              </button>
                              <button onClick={() => handleDeleteSlide(slide.id)} className="p-2 hover:bg-red-50 text-red-500 rounded-lg">
                                <Trash2 size={20} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <button onClick={handleAddSlide} className="w-full py-4 border-2 border-dashed rounded-xl text-gray-500 hover:border-green-500 hover:text-green-600 flex items-center justify-center gap-2">
                        <Plus size={20} />
                        Yeni Slayt
                      </button>
                    </div>
                  )
                ) : (
                  // CARDS TAB
                  <div className="space-y-4">
                    <button onClick={handleAddCard} className="px-5 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 font-medium flex items-center gap-2">
                      <Plus size={18} />
                      Yeni Kart
                    </button>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      {cards.map((card) => (
                        <div key={card.id} className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-sm border-2 border-gray-100 p-6 relative group hover:shadow-xl hover:border-green-200 transition-all">
                          <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleEditCard(card)} className="p-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 shadow-lg">
                              <Edit size={16} />
                            </button>
                            <button onClick={() => handleDeleteCard(card.id)} className="p-2 bg-red-500 text-white rounded-xl hover:bg-red-600 shadow-lg">
                              <Trash2 size={16} />
                            </button>
                          </div>
                          <div className="flex justify-between items-start mb-4">
                            <div className="w-14 h-14 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl flex items-center justify-center text-3xl shadow-lg">
                              {card.icon}
                            </div>
                            {card.badge && (
                              <span className="bg-gradient-to-r from-green-500 to-green-600 text-white text-[10px] font-black px-3 py-1.5 rounded-full shadow-md">
                                {card.badge}
                              </span>
                            )}
                          </div>
                          <h4 className="font-black text-gray-900 text-lg mb-2">{card.title}</h4>
                          {card.type === 'match' && card.subtitle && <p className="text-sm text-gray-600 font-medium">{card.subtitle}</p>}
                          {card.type === 'facility' && (
                            <>
                              {card.location && <p className="text-sm text-gray-600 font-medium">{card.location}</p>}
                              {card.rating && <div className="flex items-center gap-1.5 text-sm text-green-600 mt-2 font-bold"><Sparkles size={14} className="fill-current" /> {card.rating}</div>}
                            </>
                          )}
                          {card.type === 'player' && <p className="text-xs text-gray-500 font-semibold">{card.playerRole}</p>}
                          {card.type === 'tournament' && card.subtitle && <p className="text-sm text-gray-600 font-medium mt-1">{card.subtitle}</p>}
                          <div className="mt-4 pt-4 border-t-2 border-gray-100 flex justify-between items-center">
                            <span className="text-xs text-gray-500 font-bold bg-gray-100 px-3 py-1 rounded-full">Sıra {card.order}</span>
                            <span className={`text-xs font-black px-3 py-1 rounded-full ${card.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                              {card.isActive ? '✓ Aktif' : '○ Pasif'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Card Modal */}
            {showCardModal && editingCard && (
              <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                  <div className="p-6 border-b-2 border-gray-100 flex justify-between items-center bg-gradient-to-r from-green-50 to-blue-50">
                    <h2 className="text-2xl font-black">{cards.find(c => c.id === editingCard.id) ? '✏️ Kartı Düzenle' : '✨ Yeni Kart'}</h2>
                    <button onClick={() => setShowCardModal(false)} className="p-2.5 hover:bg-white rounded-xl">×</button>
                  </div>
                  <form onSubmit={handleSaveCard} className="p-6 space-y-5">
                    <div>
                      <label className="block text-sm font-black mb-3">Kart Tipi</label>
                      <div className="grid grid-cols-2 gap-3">
                        {CARD_TYPES.map((type) => (
                          <button
                            key={type.value}
                            type="button"
                            onClick={() => handleTypeChange(type.value)}
                            className={`p-4 rounded-2xl border-2 transition-all ${editingCard.type === type.value ? 'border-green-500 bg-gradient-to-br from-green-50 to-green-100 shadow-lg scale-105' : 'border-gray-200 hover:border-gray-300'}`}
                          >
                            <div className="text-3xl mb-2">{type.icon}</div>
                            <div className="text-sm font-black">{type.label}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-black mb-2">Başlık *</label>
                      <input type="text" value={editingCard.title} onChange={(e) => setEditingCard({ ...editingCard, title: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:bg-white outline-none font-semibold" required />
                    </div>
                    {(editingCard.type === 'match' || editingCard.type === 'tournament') && (
                      <div>
                        <label className="block text-sm font-black mb-2">Alt Başlık</label>
                        <input type="text" value={editingCard.subtitle} onChange={(e) => setEditingCard({ ...editingCard, subtitle: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:bg-white outline-none font-semibold" />
                      </div>
                    )}
                    {editingCard.type === 'facility' && (
                      <>
                        <div>
                          <label className="block text-sm font-black mb-2">Konum</label>
                          <input type="text" value={editingCard.location} onChange={(e) => setEditingCard({ ...editingCard, location: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:bg-white outline-none font-semibold" />
                        </div>
                        <div>
                          <label className="block text-sm font-black mb-2">Puan</label>
                          <input type="number" step="0.1" value={editingCard.rating} onChange={(e) => setEditingCard({ ...editingCard, rating: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:bg-white outline-none font-semibold" />
                        </div>
                      </>
                    )}
                    {editingCard.type === 'player' && (
                      <>
                        <div>
                          <label className="block text-sm font-black mb-2">Oyuncu Adı</label>
                          <input type="text" value={editingCard.playerName} onChange={(e) => setEditingCard({ ...editingCard, playerName: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:bg-white outline-none font-semibold" />
                        </div>
                        <div>
                          <label className="block text-sm font-black mb-2">Rol</label>
                          <input type="text" value={editingCard.playerRole} onChange={(e) => setEditingCard({ ...editingCard, playerRole: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:bg-white outline-none font-semibold" />
                        </div>
                        <div>
                          <label className="block text-sm font-black mb-2">Alıntı</label>
                          <textarea value={editingCard.playerQuote} onChange={(e) => setEditingCard({ ...editingCard, playerQuote: e.target.value })} rows={2} className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:bg-white outline-none font-semibold resize-none" />
                        </div>
                      </>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-black mb-2">Rozet</label>
                        <input type="text" value={editingCard.badge} onChange={(e) => setEditingCard({ ...editingCard, badge: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:bg-white outline-none font-semibold" />
                      </div>
                      <div>
                        <label className="block text-sm font-black mb-2">Sıra (1-4)</label>
                        <input type="number" min="1" max="4" value={editingCard.order} onChange={(e) => setEditingCard({ ...editingCard, order: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:bg-white outline-none font-semibold" required />
                      </div>
                    </div>
                    <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border-2 border-gray-200 cursor-pointer">
                      <input type="checkbox" checked={editingCard.isActive} onChange={(e) => setEditingCard({ ...editingCard, isActive: e.target.checked })} className="w-5 h-5 text-green-600 rounded-lg" />
                      <span className="text-sm font-black">Aktif</span>
                    </label>
                    <div className="flex gap-3 pt-4">
                      <button type="button" onClick={() => setShowCardModal(false)} className="flex-1 px-6 py-3.5 bg-gray-100 rounded-xl font-black">İptal</button>
                      <button type="submit" className="flex-1 px-6 py-3.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-black flex items-center justify-center gap-2 shadow-lg">
                        <Save size={20} />
                        {cards.find(c => c.id === editingCard.id) ? 'Güncelle' : 'Kaydet'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
};

export default Hero;
