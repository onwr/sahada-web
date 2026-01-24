import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { createOpenMatch, getAllTesisler, getReservationsByTesisId, getUserOpenMatches, updateOpenMatch, deleteOpenMatch } from '../../services/firestoreService';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import OyuncuSidebar from '../../components/OyuncuSidebar';
import { 
  Calendar, MapPin, DollarSign, Users, Clock, X, Search,
  Building2, AlertCircle, CheckCircle, Plus, ChevronLeft, ArrowRight,
  Edit2, Trash2
} from 'lucide-react';
import toast from '../../utils/toast';

const MacOlustur = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // View State: 'list' (Maçlarım) or 'create' (Maç Oluştur Formu)
  const [view, setView] = useState('list'); 
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' | 'past'
  
  // List State
  const [listLoading, setListLoading] = useState(true);
  const [myMatches, setMyMatches] = useState({ upcoming: [], past: [] });
  const [editingMatchId, setEditingMatchId] = useState(null);

  // Create Form State
  const [loading, setLoading] = useState(false);
  const [tesisler, setTesisler] = useState([]);
  const [tesisSearchQuery, setTesisSearchQuery] = useState('');
  const [showTesisDropdown, setShowTesisDropdown] = useState(false);
  const [selectedTesis, setSelectedTesis] = useState(null);
  const [bookedSlots, setBookedSlots] = useState([]);
  
  const [formData, setFormData] = useState({
    tesisId: '',
    tesisName: '',
    location: '',
    address: '',
    date: '',
    timeSlot: '',
    title: '',
    format: 'football',
    level: 'intermediate',
    maxPlayers: 10,
    pricePerPlayer: 0,
    description: ''
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
  }, [user, navigate]);

  // Load Matches Effect
  useEffect(() => {
    if (user && view === 'list') {
      fetchMyMatches();
    }
  }, [user, view]);

  // Tesisler Listener (Form active)
  useEffect(() => {
    if (view === 'create') {
        const loadTesis = async () => {
            try {
                const result = await getAllTesisler();
                if (result.success) setTesisler(result.data);
            } catch(e) { console.error(e); }
        };
        loadTesis(); // Initial Load

        const tesislerQuery = query(collection(db, 'tesisler'), where('status', '==', 'active'));
        const unsubscribe = onSnapshot(tesislerQuery, (snapshot) => {
          const tesislerData = [];
          snapshot.forEach((doc) => {
            tesislerData.push({ id: doc.id, ...doc.data() });
          });
          setTesisler(tesislerData);
        }, (error) => {});
        return () => unsubscribe();
    }
  }, [view]);

  // Reservation Check
  useEffect(() => {
    const fetchReservations = async () => {
      if (selectedTesis && formData.date && view === 'create') {
        try {
          const result = await getReservationsByTesisId(selectedTesis.id, formData.date);
          if (result.success) {
            const booked = result.data.map(res => res.timeSlot);
            setBookedSlots(booked);
          }
        } catch (error) {
          console.error('Rezervasyonlar yüklenemedi:', error);
        }
      } else {
        setBookedSlots([]);
      }
    };
    fetchReservations();
  }, [selectedTesis, formData.date, view]);

  const fetchMyMatches = async () => {
    setListLoading(true);
    try {
      const result = await getUserOpenMatches(user.uid);
      if (result.success) {
        // Merge organized and joined
        const allMatches = [...(result.data.organized || []), ...(result.data.joined || [])];
        const uniqueMatches = Array.from(new Map(allMatches.map(item => [item.id, item])).values());

        const now = new Date();
        now.setHours(0,0,0,0);

        const upcoming = uniqueMatches.filter(m => {
             const mDate = m.date?.toDate ? m.date.toDate() : new Date(m.date);
             return mDate >= now;
        }).sort((a,b) => {
             const dA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
             const dB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
             return dA - dB;
        });

        const past = uniqueMatches.filter(m => {
             const mDate = m.date?.toDate ? m.date.toDate() : new Date(m.date);
             return mDate < now;
        }).sort((a,b) => {
             const dA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
             const dB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
             return dB - dA;
        });

        setMyMatches({ upcoming, past });
      }
    } catch (err) {
      console.error(err);
      toast.error('Maçlar yüklenemedi');
    } finally {
      setListLoading(false);
    }
  };

  const handleEdit = (match) => {
    setEditingMatchId(match.id);
    setSelectedTesis(match.tesisId ? { id: match.tesisId, name: match.tesisName, location: match.location } : null);
    
    // Date conversion
    let matchDate = '';
    if (match.date) {
        const d = match.date.toDate ? match.date.toDate() : new Date(match.date);
        matchDate = d.toISOString().split('T')[0];
    }

    setFormData({
      tesisId: match.tesisId || '',
      tesisName: match.tesisName || '',
      location: match.location || '',
      address: match.address || '',
      date: matchDate,
      timeSlot: match.timeSlot,
      title: match.title || '',
      format: match.format,
      level: match.level,
      maxPlayers: match.maxPlayers,
      pricePerPlayer: match.pricePerPlayer,
      description: match.description || ''
    });
    setTesisSearchQuery(match.tesisName || '');
    setView('create');
  };

  const handleDelete = async (matchId) => {
    if (window.confirm('Bu maçı silmek istediğinizden emin misiniz?')) {
      try {
        const result = await deleteOpenMatch(matchId, user.uid);
        if (result.success) {
          toast.success('Maç başarıyla silindi');
          fetchMyMatches();
        } else {
          toast.error(result.error || 'Maç silinemedi');
        }
      } catch (error) {
        console.error('Silme hatası:', error);
        toast.error('Bir hata oluştu');
      }
    }
  };

  const filteredTesisler = tesisler.filter(tesis => {
    if (!tesisSearchQuery) return true;
    const query = tesisSearchQuery.toLowerCase();
    return (
      tesis.name?.toLowerCase().includes(query) ||
      tesis.location?.toLowerCase().includes(query) ||
      tesis.address?.toLowerCase().includes(query)
    );
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleTesisSelect = (tesis) => {
    setSelectedTesis(tesis);
    setFormData(prev => ({
      ...prev,
      tesisId: tesis.id,
      tesisName: tesis.name,
      location: tesis.location || '',
      address: tesis.address || ''
    }));
    setTesisSearchQuery(tesis.name);
    setShowTesisDropdown(false);
  };

  const handleRemoveTesis = () => {
    setSelectedTesis(null);
    setFormData(prev => ({
      ...prev,
      tesisId: '',
      tesisName: '',
      location: '',
      address: ''
    }));
    setTesisSearchQuery('');
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.date) newErrors.date = 'Tarih seçmelisiniz';
    else {
      const selectedDate = new Date(formData.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate < today) newErrors.date = 'Geçmiş bir tarih seçemezsiniz';
    }
    if (!formData.timeSlot) newErrors.timeSlot = 'Saat seçmelisiniz';
    if (!formData.location && !formData.tesisId) newErrors.location = 'Konum veya saha seçmelisiniz';
    if (formData.maxPlayers < 2) newErrors.maxPlayers = 'Minimum 2 oyuncu olmalı';
    if (formData.maxPlayers > 50) newErrors.maxPlayers = 'Maksimum 50 oyuncu olabilir';
    if (formData.pricePerPlayer < 0) newErrors.pricePerPlayer = 'Ücret negatif olamaz';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error('Lütfen formu kontrol edin');
      return;
    }
    setLoading(true);
    try {
      let result;
      if (editingMatchId) {
        result = await updateOpenMatch(editingMatchId, {
          title: formData.title || null,
          tesisId: formData.tesisId || null,
          tesisName: formData.tesisName || null,
          location: formData.location || formData.tesisName || 'Konum belirtilmemiş',
          address: formData.address || null,
          date: formData.date,
          timeSlot: formData.timeSlot,
          format: formData.format,
          level: formData.level,
          maxPlayers: parseInt(formData.maxPlayers),
          pricePerPlayer: parseFloat(formData.pricePerPlayer) || 0,
          description: formData.description || ''
        });
      } else {
        result = await createOpenMatch({
          organizerId: user.uid,
          title: formData.title || null,
          tesisId: formData.tesisId || null,
          tesisName: formData.tesisName || null,
          location: formData.location || formData.tesisName || 'Konum belirtilmemiş',
          address: formData.address || null,
          date: formData.date,
          timeSlot: formData.timeSlot,
          format: formData.format,
          level: formData.level,
          maxPlayers: parseInt(formData.maxPlayers),
          currentPlayers: 1,
          pricePerPlayer: parseFloat(formData.pricePerPlayer) || 0,
          description: formData.description || ''
        });
      }

      if (result.success) {
        toast.success(editingMatchId ? 'Maç başarıyla güncellendi!' : 'Maç başarıyla oluşturuldu!');
        setView('list'); // Return to list view
        setEditingMatchId(null);
        fetchMyMatches(); // Refresh list
        // Reset Form
        setFormData({
            tesisId: '', tesisName: '', location: '', address: '', date: '', timeSlot: '',
            title: '', format: 'football', level: 'intermediate', maxPlayers: 10,
            pricePerPlayer: 0, description: ''
        });
        setSelectedTesis(null);
        setTesisSearchQuery('');
      } else {
        toast.error(result.error || 'Maç oluşturulamadı');
      }
    } catch (error) {
      console.error('Maç oluşturma hatası:', error);
      toast.error('Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long',  weekday: 'long' });
  };

  // Time Slots Generation
  const timeSlots = [];
  for (let hour = 6; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      timeSlots.push(timeString);
    }
  }
  const todayDate = new Date().toISOString().split('T')[0];

  return (
    <div className="flex min-h-screen bg-gray-50">
      <OyuncuSidebar />
      
      <div className="flex-1 p-6 mt-10 md:mt-0 md:p-8">
        {view === 'list' ? (
          <div className="space-y-6">
             {/* List Header */}
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                   <h1 className="text-3xl font-bold text-gray-900">Maçlarım</h1>
                   <p className="text-gray-600 mt-1">Katıldığın ve yönettiğin tüm maçlar</p>
                </div>
                <button
                  onClick={() => {
                    setEditingMatchId(null);
                    setFormData({
                        tesisId: '', tesisName: '', location: '', address: '', date: '', timeSlot: '',
                        title: '', format: 'football', level: 'intermediate', maxPlayers: 10,
                        pricePerPlayer: 0, description: ''
                    });
                    setSelectedTesis(null);
                    setTesisSearchQuery('');
                    setView('create');
                  }}
                  className="px-6 py-3 bg-green-600 text-white rounded-xl shadow-lg hover:bg-green-700 transition-all flex items-center gap-2 font-bold"
                >
                   <Plus size={20} />
                   Maç Oluştur
                </button>
             </div>

             {/* Tabs */}
             <div className="flex gap-6 border-b border-gray-200">
                <button
                  onClick={() => setActiveTab('upcoming')}
                  className={`pb-3 px-2 font-semibold transition-all relative text-lg ${
                    activeTab === 'upcoming' ? 'text-green-600' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Gelecek Maçlar ({myMatches.upcoming.length})
                  {activeTab === 'upcoming' && (
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-green-600 rounded-t-full" />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('past')}
                  className={`pb-3 px-2 font-semibold transition-all relative text-lg ${
                    activeTab === 'past' ? 'text-green-600' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Geçmiş Maçlar ({myMatches.past.length})
                  {activeTab === 'past' && (
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-green-600 rounded-t-full" />
                  )}
                </button>
             </div>
             
             {/* Content */}
             {listLoading ? (
               <div className="py-20 flex justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
               </div>
             ) : (
               <div className="space-y-4">
                  {myMatches[activeTab].length > 0 ? (
                    myMatches[activeTab].map(match => (
                      <div key={match.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between group hover:shadow-md transition-all hover:border-green-100">
                         <div className="flex flex-col gap-2">
                            {/* Tags */}
                            <div className="flex gap-2">
                              {activeTab === 'upcoming' ? (
                                <span className="bg-blue-50 text-blue-700 text-xs px-2.5 py-1 rounded-lg font-bold border border-blue-100">Gelecek</span>
                              ) : (
                                <span className="bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded-lg font-bold border border-gray-200">Geçmiş</span>
                              )}
                              {match.organizerId === user.uid && (
                                <span className="bg-purple-50 text-purple-700 text-xs px-2.5 py-1 rounded-lg font-bold border border-purple-100">Organizatör</span>
                              )}
                              {/* TODO: Check if accepted or open */}
                            </div>
                            
                            <h3 className="text-xl font-bold text-gray-900 group-hover:text-green-600 transition-colors">
                              {match.title || match.tesisName || match.location || 'Bilinmeyen Maç'}
                            </h3>
                            
                            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mt-1">
                               <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg">
                                  <Calendar size={16} className="text-gray-400" />
                                  <span className="font-medium text-gray-700">{formatDate(match.date)}</span>
                               </div>
                               <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg">
                                  <Clock size={16} className="text-gray-400" />
                                  <span className="font-medium text-gray-700">{match.timeSlot}</span>
                               </div>
                               <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg">
                                  <MapPin size={16} className="text-gray-400" />
                                  <span className="font-medium text-gray-700 truncate max-w-[200px]">{match.location || match.tesisName}</span>
                               </div>
                            </div>
                         </div>
                         
                          <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                            <button
                              onClick={() => navigate(`/mac-detay/${match.id}`)} 
                              className="w-full md:w-auto px-6 py-3 border border-blue-200 text-blue-600 bg-blue-50/50 rounded-xl hover:bg-blue-600 hover:text-white transition-all font-bold text-sm flex items-center justify-center gap-2"
                            >
                                Detay
                                <ArrowRight size={16} />
                            </button>
                            
                            {match.organizerId === user.uid && activeTab === 'upcoming' && (
                              <>
                                <button
                                  onClick={() => handleEdit(match)}
                                  className="w-full md:w-auto px-4 py-3 border border-amber-200 text-amber-600 bg-amber-50/50 rounded-xl hover:bg-amber-600 hover:text-white transition-all font-bold text-sm flex items-center justify-center gap-2"
                                  title="Düzenle"
                                >
                                  <Edit2 size={16} />
                                  Düzenle
                                </button>
                                <button
                                  onClick={() => handleDelete(match.id)}
                                  className="w-full md:w-auto px-4 py-3 border border-red-200 text-red-600 bg-red-50/50 rounded-xl hover:bg-red-600 hover:text-white transition-all font-bold text-sm flex items-center justify-center gap-2"
                                  title="Sil"
                                >
                                  <Trash2 size={16} />
                                  Sil
                                </button>
                              </>
                            )}
                          </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-100">
                       <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Calendar size={40} className="text-gray-300" />
                       </div>
                       <h3 className="text-lg font-bold text-gray-900">Maç Bulunamadı</h3>
                       <p className="text-gray-500 mt-1">Bu kategoride listelenecek maç yok.</p>
                       {activeTab === 'upcoming' && (
                         <button 
                           onClick={() => setView('create')} 
                           className="mt-6 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
                         >
                            Hemen Maç Oluştur
                         </button>
                       )}
                    </div>
                  )}
               </div>
             )}
          </div>
        ) : (
          <div>
            {/* Create Form Header */}
            <div className="mb-6 flex items-center gap-3">
               <button 
                 onClick={() => setView('list')}
                 className="p-2 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors shadow-sm"
               >
                 <ChevronLeft size={24} className="text-gray-600" />
               </button>
                <div>
                   <h2 className="text-2xl font-bold text-gray-900">{editingMatchId ? 'Maçı Düzenle' : 'Yeni Maç Oluştur'}</h2>
                   <p className="text-sm text-gray-500">{editingMatchId ? 'Maç bilgilerini güncelleyin' : 'Oyuncu aradığın maçın detaylarını gir'}</p>
                </div>
            </div>

            {/* Form */}
            <div className="bg-white rounded-xl shadow-sm p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Same Form Content */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Maç Başlığı <span className="text-gray-400 font-normal">(Opsiyonel)</span>
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="Örn: Haftasonu Maçı, Dostluk Maçı vb."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                {/* Saha Seçimi */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Saha Seçimi (Opsiyonel)
                  </label>
                  <div className="relative z-20">
                    {selectedTesis ? (
                      <div className="flex items-center justify-between p-3 border border-gray-300 rounded-lg bg-gray-50">
                        <div className="flex items-center space-x-3">
                          <Building2 className="w-5 h-5 text-gray-600" />
                          <div>
                            <p className="font-medium text-gray-900">{selectedTesis.name}</p>
                            <p className="text-sm text-gray-600">{selectedTesis.location}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleRemoveTesis}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                          <input
                            type="text"
                            placeholder="Saha ara veya 'Saha olmadan' bırakın..."
                            value={tesisSearchQuery}
                            onChange={(e) => {
                              setTesisSearchQuery(e.target.value);
                              setShowTesisDropdown(true);
                            }}
                            onFocus={() => setShowTesisDropdown(true)}
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                        </div>
                        {showTesisDropdown && filteredTesisler.length > 0 && (
                          <div className="absolute z-30 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                            {filteredTesisler.map((tesis) => (
                              <button
                                key={tesis.id}
                                type="button"
                                onClick={() => handleTesisSelect(tesis)}
                                className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center space-x-3"
                              >
                                <Building2 className="w-5 h-5 text-gray-400" />
                                <div>
                                  <p className="font-medium text-gray-900">{tesis.name}</p>
                                  <p className="text-sm text-gray-600">{tesis.location}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Saha seçmezseniz, manuel olarak konum girebilirsiniz
                  </p>
                </div>

                {!selectedTesis && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Konum <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                      <input
                        type="text"
                        name="location"
                        value={formData.location}
                        onChange={handleInputChange}
                        placeholder="Örn: Kadıköy Spor Kompleksi"
                        className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 ${
                          errors.location ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-green-500'
                        }`}
                      />
                    </div>
                    {errors.location && (
                      <p className="mt-1 text-sm text-red-600 flex items-center space-x-1">
                        <AlertCircle size={14} />
                        <span>{errors.location}</span>
                      </p>
                    )}
                  </div>
                )}

                {!selectedTesis && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Detaylı Adres (Opsiyonel)
                    </label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      placeholder="Örn: Kadıköy, İstanbul"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tarih <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                      <input
                        type="date"
                        name="date"
                        value={formData.date}
                        onChange={handleInputChange}
                        min={todayDate}
                        className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 ${
                          errors.date ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-green-500'
                        }`}
                      />
                    </div>
                    {errors.date && (
                      <p className="mt-1 text-sm text-red-600 flex items-center space-x-1">
                        <AlertCircle size={14} />
                        <span>{errors.date}</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Saat <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                      <select
                        name="timeSlot"
                        value={formData.timeSlot}
                        onChange={handleInputChange}
                        className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 ${
                          errors.timeSlot ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-green-500'
                        }`}
                      >
                        <option value="">Saat seçin</option>
                        {timeSlots.map((time) => {
                          const isBooked = bookedSlots.includes(time);
                          return (
                            <option 
                              key={time} 
                              value={time}
                              disabled={isBooked}
                              className={isBooked ? 'text-gray-400 bg-gray-100' : ''}
                            >
                              {time} {isBooked ? '(Dolu)' : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    {errors.timeSlot && (
                      <p className="mt-1 text-sm text-red-600 flex items-center space-x-1">
                        <AlertCircle size={14} />
                        <span>{errors.timeSlot}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Format <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="format"
                      value={formData.format}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="football">⚽ Halı Saha</option>
                      <option value="basketball">🏀 Basketbol</option>
                      <option value="tennis">🎾 Tenis</option>
                      <option value="volleyball">🏐 Voleybol</option>
                      <option value="swimming">🏊‍♂️ Yüzme</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Seviye <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="level"
                      value={formData.level}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="beginner">Başlangıç</option>
                      <option value="intermediate">Orta</option>
                      <option value="good">İyi</option>
                      <option value="advanced">İleri</option>
                      <option value="mixed">Karışık</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Maksimum Oyuncu Sayısı <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                      <input
                        type="number"
                        name="maxPlayers"
                        value={formData.maxPlayers}
                        onChange={handleInputChange}
                        min="2"
                        max="50"
                        className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 ${
                          errors.maxPlayers ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-green-500'
                        }`}
                      />
                    </div>
                    {errors.maxPlayers && (
                      <p className="mt-1 text-sm text-red-600 flex items-center space-x-1">
                        <AlertCircle size={14} />
                        <span>{errors.maxPlayers}</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Kişi Başı Ücret (₺) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                      <input
                        type="number"
                        name="pricePerPlayer"
                        value={formData.pricePerPlayer}
                        onChange={handleInputChange}
                        min="0"
                        step="0.01"
                        placeholder="0 = Ücretsiz"
                        className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 ${
                          errors.pricePerPlayer ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-green-500'
                        }`}
                      />
                    </div>
                    {errors.pricePerPlayer && (
                      <p className="mt-1 text-sm text-red-600 flex items-center space-x-1">
                        <AlertCircle size={14} />
                        <span>{errors.pricePerPlayer}</span>
                      </p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">
                      Ücretsiz maç için 0 girin
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Açıklama / Notlar (Opsiyonel)
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={4}
                    placeholder="Maç hakkında ek bilgiler, kurallar, vb..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                        setView('list');
                        setEditingMatchId(null);
                    }}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {loading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Oluşturuluyor...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle size={20} />
                        <span>{editingMatchId ? 'Güncelle' : 'Maç Oluştur'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
            {showTesisDropdown && (
                <div
                className="fixed inset-0 z-10"
                onClick={() => setShowTesisDropdown(false)}
                />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MacOlustur;
