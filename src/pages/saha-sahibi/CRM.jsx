import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { usePremium } from '../../hooks/usePremium';
import PremiumUpgrade from '../../components/PremiumUpgrade';
import { getCustomers, getTesisler } from '../../services/firestoreService';
import { collection, query, onSnapshot, where, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import SahaSahibiSidebar from '../../components/SahaSahibiSidebar';
import { Users, AlertCircle, Plus, Edit, Trash2, Mail, Phone, Calendar, DollarSign, Target, TrendingUp, X, Save, Award } from 'lucide-react';
import toast from '../../utils/toast';

const CRM = () => {
  const { user } = useAuth();
  const { isPremium, isLoading: premiumLoading } = usePremium();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [selectedSegment, setSelectedSegment] = useState('all');
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [campaignForm, setCampaignForm] = useState({
    name: '',
    description: '',
    targetSegment: 'all',
    discount: '',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    if (user && !premiumLoading && isPremium) {
      loadCRM();
      setupRealtimeListeners();
    }
  }, [user, premiumLoading, isPremium]);

  const loadCRM = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    try {
      const [customersResult, campaignsResult] = await Promise.all([
        getCustomers(user.uid),
        loadCampaigns()
      ]);

      if (customersResult.success) {
        setCustomers(customersResult.data);
      }
    } catch (err) {
      console.error('CRM yükleme hatası:', err);
      setError('CRM verileri yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const loadCampaigns = async () => {
    if (!user) return [];

    try {
      const campaignsRef = collection(db, 'campaigns');
      const campaignsQuery = query(
        campaignsRef,
        where('ownerId', '==', user.uid)
      );
      const snapshot = await getDocs(campaignsQuery);
      
      const campaignsData = [];
      snapshot.forEach((doc) => {
        campaignsData.push({ id: doc.id, ...doc.data() });
      });
      
      setCampaigns(campaignsData);
      return campaignsData;
    } catch (err) {
      console.error('Kampanyalar yükleme hatası:', err);
      return [];
    }
  };

  const setupRealtimeListeners = () => {
    if (!user) return;

    // Müşteriler için listener
    const tesislerQuery = query(
      collection(db, 'tesisler'),
      where('ownerId', '==', user.uid)
    );

    const unsubscribeTesisler = onSnapshot(tesislerQuery, async (snapshot) => {
      const tesisIds = [];
      snapshot.forEach((doc) => {
        tesisIds.push(doc.id);
      });

      if (tesisIds.length > 0) {
        const rezervasyonlarQuery = query(
          collection(db, 'rezervasyonlar'),
          where('tesisId', 'in', tesisIds)
        );

        const unsubscribeRezervasyonlar = onSnapshot(rezervasyonlarQuery, () => {
          loadCRM();
        });

        return () => unsubscribeRezervasyonlar();
      }
    });

    // Kampanyalar için listener
    const campaignsQuery = query(
      collection(db, 'campaigns'),
      where('ownerId', '==', user.uid)
    );

    const unsubscribeCampaigns = onSnapshot(campaignsQuery, (snapshot) => {
      const campaignsData = [];
      snapshot.forEach((doc) => {
        campaignsData.push({ id: doc.id, ...doc.data() });
      });
      setCampaigns(campaignsData);
    });

    return () => {
      unsubscribeTesisler();
      unsubscribeCampaigns();
    };
  };

  const segmentCustomers = () => {
    const vip = customers.filter(c => c.totalSpent >= 5000 || c.totalReservations >= 10);
    const regular = customers.filter(c => c.totalSpent >= 1000 && c.totalSpent < 5000);
    const newCustomers = customers.filter(c => c.totalReservations <= 2);

    return { vip, regular, new: newCustomers };
  };

  const handleCreateCampaign = async () => {
    if (!campaignForm.name || !campaignForm.startDate || !campaignForm.endDate) {
      toast.error('Lütfen tüm alanları doldurun');
      return;
    }

    try {
      const campaignData = {
        ...campaignForm,
        ownerId: user.uid,
        discount: parseFloat(campaignForm.discount),
        startDate: Timestamp.fromDate(new Date(campaignForm.startDate)),
        endDate: Timestamp.fromDate(new Date(campaignForm.endDate)),
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await addDoc(collection(db, 'campaigns'), campaignData);
      toast.success('Kampanya başarıyla oluşturuldu');
      setShowCampaignModal(false);
      setCampaignForm({
        name: '',
        description: '',
        targetSegment: 'all',
        discount: '',
        startDate: '',
        endDate: ''
      });
    } catch (err) {
      console.error('Kampanya oluşturma hatası:', err);
      toast.error('Kampanya oluşturulurken hata oluştu');
    }
  };

  const handleDeleteCampaign = async (campaignId) => {
    if (!confirm('Bu kampanyayı silmek istediğinize emin misiniz?')) return;

    try {
      await deleteDoc(doc(db, 'campaigns', campaignId));
      toast.success('Kampanya başarıyla silindi');
    } catch (err) {
      console.error('Kampanya silme hatası:', err);
      toast.error('Kampanya silinirken hata oluştu');
    }
  };

  if (premiumLoading || loading) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!isPremium) {
    return (
      <div className="flex h-screen bg-gray-50">
        <SahaSahibiSidebar />
        <div className="flex-1 flex flex-col">
          <header className="bg-white shadow-sm border-b px-6 py-4">
            <h1 className="text-2xl font-bold text-gray-900">CRM Suite</h1>
          </header>
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="mb-6">
              <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 text-center mb-2">Premium Özellik</h2>
              <p className="text-gray-600 text-center mb-6">
                Bu özelliğe erişmek için Premium üyelik gereklidir
              </p>
            </div>
            <PremiumUpgrade userType="owner" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <SahaSahibiSidebar />
      <div className="flex-1 flex flex-col">
        <header className="bg-white shadow-sm border-b px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900">CRM Suite</h1>
        </header>
        <div className="flex-1 p-6 overflow-y-auto">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
              <AlertCircle className="w-5 h-5 mr-2" />
              {error}
            </div>
          )}
          {/* Müşteri Segmentasyonu */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Müşteri Segmentasyonu</h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => setSelectedSegment('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedSegment === 'all'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Tümü ({customers.length})
                </button>
                <button
                  onClick={() => setSelectedSegment('vip')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedSegment === 'vip'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  VIP ({segmentCustomers().vip.length})
                </button>
                <button
                  onClick={() => setSelectedSegment('regular')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedSegment === 'regular'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Düzenli ({segmentCustomers().regular.length})
                </button>
                <button
                  onClick={() => setSelectedSegment('new')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedSegment === 'new'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Yeni ({segmentCustomers().new.length})
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(() => {
                const segments = segmentCustomers();
                const filteredCustomers = selectedSegment === 'all' 
                  ? customers 
                  : segments[selectedSegment] || [];
                
                return filteredCustomers.slice(0, 6).map((customer) => (
                  <div key={customer.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-semibold">
                          {customer.fullName?.charAt(0) || 'M'}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{customer.fullName || 'Müşteri'}</p>
                          <p className="text-xs text-gray-500">{customer.email || 'N/A'}</p>
                        </div>
                      </div>
                      {segmentCustomers().vip.includes(customer) && (
                        <Award className="w-5 h-5 text-yellow-500" />
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                      <div>
                        <p className="text-gray-500">Toplam Harcama</p>
                        <p className="font-semibold text-gray-900">₺{customer.totalSpent?.toLocaleString('tr-TR') || 0}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Rezervasyon</p>
                        <p className="font-semibold text-gray-900">{customer.totalReservations || 0}</p>
                      </div>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>

          {/* Kampanya Yönetimi */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Kampanya Yönetimi</h3>
              <button
                onClick={() => {
                  setEditingCampaign(null);
                  setCampaignForm({
                    name: '',
                    description: '',
                    targetSegment: 'all',
                    discount: '',
                    startDate: '',
                    endDate: ''
                  });
                  setShowCampaignModal(true);
                }}
                className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Yeni Kampanya</span>
              </button>
            </div>
            <div className="space-y-3">
              {campaigns.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Henüz kampanya oluşturulmamış</p>
              ) : (
                campaigns.map((campaign) => (
                  <div key={campaign.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-900">{campaign.name}</h4>
                      <p className="text-sm text-gray-600 mt-1">{campaign.description}</p>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        <span>Hedef: {campaign.targetSegment === 'all' ? 'Tümü' : campaign.targetSegment === 'vip' ? 'VIP' : campaign.targetSegment === 'regular' ? 'Düzenli' : 'Yeni'}</span>
                        <span>İndirim: %{campaign.discount}</span>
                        <span>
                          {campaign.startDate?.toDate ? new Date(campaign.startDate.toDate()).toLocaleDateString('tr-TR') : 'N/A'} - 
                          {campaign.endDate?.toDate ? new Date(campaign.endDate.toDate()).toLocaleDateString('tr-TR') : 'N/A'}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteCampaign(campaign.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Kampanya Modal */}
          {showCampaignModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">Yeni Kampanya</h2>
                  <button
                    onClick={() => setShowCampaignModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Kampanya Adı</label>
                    <input
                      type="text"
                      value={campaignForm.name}
                      onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Örn: VIP Müşteriler Özel İndirimi"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Açıklama</label>
                    <textarea
                      value={campaignForm.description}
                      onChange={(e) => setCampaignForm({ ...campaignForm, description: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      rows="3"
                      placeholder="Kampanya açıklaması"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Hedef Segment</label>
                      <select
                        value={campaignForm.targetSegment}
                        onChange={(e) => setCampaignForm({ ...campaignForm, targetSegment: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value="all">Tümü</option>
                        <option value="vip">VIP</option>
                        <option value="regular">Düzenli</option>
                        <option value="new">Yeni</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">İndirim (%)</label>
                      <input
                        type="number"
                        value={campaignForm.discount}
                        onChange={(e) => setCampaignForm({ ...campaignForm, discount: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="10"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Başlangıç Tarihi</label>
                      <input
                        type="date"
                        value={campaignForm.startDate}
                        onChange={(e) => setCampaignForm({ ...campaignForm, startDate: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Bitiş Tarihi</label>
                      <input
                        type="date"
                        value={campaignForm.endDate}
                        onChange={(e) => setCampaignForm({ ...campaignForm, endDate: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setShowCampaignModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    İptal
                  </button>
                  <button
                    onClick={handleCreateCampaign}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>Kaydet</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CRM;

