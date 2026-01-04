import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getAllTesisler } from '../../services/firestoreService';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import OyuncuSidebar from '../../components/OyuncuSidebar';
import { MapPin, Search, Star, Users, DollarSign, AlertCircle } from 'lucide-react';

const Sahalar = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sahalar, setSahalar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [priceFilter, setPriceFilter] = useState('all');

  useEffect(() => {
    loadSahalar();
    const cleanup = setupRealtimeListener();
    
    return () => {
      if (cleanup) cleanup();
    };
  }, [user]);

  const setupRealtimeListener = () => {
    const tesislerQuery = query(collection(db, 'tesisler'), where('status', '==', 'active'));

    const unsubscribe = onSnapshot(tesislerQuery, (snapshot) => {
      const sahalarData = [];
      snapshot.forEach((doc) => {
        sahalarData.push({ id: doc.id, ...doc.data() });
      });
      setSahalar(sahalarData);
      setLoading(false);
      setError(null);
    }, (error) => {
      console.error('Sahalar listener hatası:', error);
      setError('Veriler güncellenirken hata oluştu');
      setLoading(false);
    });

    return () => unsubscribe();
  };

  const loadSahalar = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await getAllTesisler();
      if (result.success) {
        setSahalar(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error('Sahalar yükleme hatası:', err);
      setError('Veriler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const filteredSahalar = sahalar.filter(saha => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const name = saha.name || '';
      const location = saha.location || '';
      if (!name.toLowerCase().includes(searchLower) && !location.toLowerCase().includes(searchLower)) {
        return false;
      }
    }

    if (priceFilter !== 'all') {
      const price = saha.price || 0;
      switch (priceFilter) {
        case 'low':
          if (price > 500) return false;
          break;
        case 'medium':
          if (price <= 500 || price > 1000) return false;
          break;
        case 'high':
          if (price <= 1000) return false;
          break;
      }
    }

    return true;
  });

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Sahalar yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Hata</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadSahalar}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Tekrar Dene
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <OyuncuSidebar />

      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white shadow-sm border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Sahalar</h1>
              <p className="text-gray-600 mt-1">
                {filteredSahalar.length} saha bulundu
              </p>
            </div>
          </div>
        </header>

        {/* Filters */}
        <div className="bg-white border-b px-6 py-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Saha veya lokasyon ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>

            <select
              value={priceFilter}
              onChange={(e) => setPriceFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            >
              <option value="all">Tüm Fiyatlar</option>
              <option value="low">Uygun (₺0-500)</option>
              <option value="medium">Orta (₺500-1000)</option>
              <option value="high">Premium (₺1000+)</option>
            </select>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSahalar.length > 0 ? (
              filteredSahalar.map((saha) => (
                <div key={saha.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                  {saha.images && saha.images.length > 0 ? (
                    <img
                      src={saha.images[0].optimized_url || saha.images[0].url}
                      alt={saha.name}
                      className="w-full h-48 object-cover"
                    />
                  ) : (
                    <div className="w-full h-48 bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                      <MapPin className="w-16 h-16 text-white opacity-50" />
                    </div>
                  )}
                  
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">{saha.name}</h3>
                      <div className="flex items-center">
                        <Star className="w-4 h-4 text-yellow-400 fill-current" />
                        <span className="text-sm text-gray-600 ml-1">{saha.rating || 0}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="w-4 h-4 mr-2" />
                        {saha.location}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Users className="w-4 h-4 mr-2" />
                        {saha.capacity} kişi kapasite
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <DollarSign className="w-4 h-4 mr-2" />
                        ₺{saha.price}/saat
                      </div>
                    </div>

                    <button 
                      className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      onClick={() => navigate(`/oyuncu/rezervasyon/${saha.id}`)}
                    >
                      Rezervasyon Yap
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                  <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Saha Bulunamadı</h3>
                  <p className="text-gray-600">Arama kriterlerinize uygun saha bulunmuyor.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sahalar;
