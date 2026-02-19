import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import SahaSahibiSidebar from '../../components/SahaSahibiSidebar';
import { 
  getMarketingStats,
  getCampaigns,
  addCampaign,
  updateCampaign,
  deleteCampaign,
  getMessageTemplates,
  addMessageTemplate,
  getCustomerSegments,
  addCustomerSegment,
  deleteCustomerSegment,
  sendMarketingMessage,
  getSavedCustomerSegments
} from '../../services/firestoreService';
import { collection, query, onSnapshot, where, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { 
  TrendingUp,
  Users,
  Target,
  Mail,
  MessageSquare,
  Bell,
  Plus,
  Eye,
  Edit,
  Pause,
  BarChart3,
  Send,
  Calendar,
  Smartphone,
  Globe,
  X,
  Save,
  Trash2
} from 'lucide-react';

const Marketing = () => {
  const navigate = useNavigate();
  const { user, userData } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // State'ler
  const [campaignData, setCampaignData] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [customerSegments, setCustomerSegments] = useState([]);
  const [messageTemplates, setMessageTemplates] = useState([]);

  // Modal state'leri
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [showSegmentModal, setShowSegmentModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [selectedTemplateForSend, setSelectedTemplateForSend] = useState(null);
  const [selectedSegmentForSend, setSelectedSegmentForSend] = useState('');

  // Form state'leri
  const [segmentForm, setSegmentForm] = useState({
      name: '',
      description: ''
  });
  const [campaignForm, setCampaignForm] = useState({
    name: '',
    type: '',
    description: '',
    target: '',
    channels: [],
    startDate: '',
    endDate: '',
    discount: '',
    status: 'active'
  });

  const [templateForm, setTemplateForm] = useState({
    name: '',
    type: '',
    content: '',
    category: ''
  });

  const quickCampaigns = [
    { id: 'happy-hour', name: 'Happy Hour', icon: '⏰', description: 'Boş saatlere özel indirim', color: 'bg-orange-100 text-orange-600' },
    { id: 'last-minute', name: 'Last Minute', icon: '🔥', description: 'Son dakika fırsatları', color: 'bg-red-100 text-red-600' },
    { id: 'referral', name: 'Arkadaşını Getir', icon: '👥', description: 'Referans programı', color: 'bg-blue-100 text-blue-600' },
    { id: 'birthday', name: 'Doğum Günü', icon: '🎂', description: 'Özel gün indirimi', color: 'bg-pink-100 text-pink-600' },
    { id: 'win-back', name: 'Geri Kazan', icon: '🔄', description: 'Kayıp müşteri kampanyası', color: 'bg-purple-100 text-purple-600' },
    { id: 'tournament', name: 'Turnuva', icon: '🏆', description: 'Etkinlik duyurusu', color: 'bg-yellow-100 text-yellow-600' }
  ];

  // Verileri yükle
  useEffect(() => {
    if (!user) return;
    
    loadMarketingData();
    const cleanup = setupRealtimeListener();
    
    return () => {
      if (cleanup) cleanup();
    };
  }, [user]);

  const setupRealtimeListener = () => {
    if (!user) return;

    let unsubscribeFunctions = [];

    // Kampanyalar için real-time listener
    const campaignsQuery = query(
      collection(db, 'campaigns'),
      where('ownerId', '==', user.uid)
    );

    const unsubscribeCampaigns = onSnapshot(campaignsQuery, (snapshot) => {
      const campaignsData = [];
      snapshot.forEach((doc) => {
        campaignsData.push({ id: doc.id, ...doc.data() });
      });
      // Client-side sort
      campaignsData.sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
          return dateB - dateA;
      });
      setCampaigns(campaignsData);
    });
    unsubscribeFunctions.push(unsubscribeCampaigns);

    // Mesaj şablonları için real-time listener
    const templatesQuery = query(
      collection(db, 'messageTemplates'),
      where('ownerId', '==', user.uid)
    );

    const unsubscribeTemplates = onSnapshot(templatesQuery, (snapshot) => {
      const templatesData = [];
      snapshot.forEach((doc) => {
        templatesData.push({ id: doc.id, ...doc.data() });
      });
      // Client-side sort
      templatesData.sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
          return dateB - dateA;
      });
      setMessageTemplates(templatesData);
    });
    unsubscribeFunctions.push(unsubscribeTemplates);

    // Müşteri segmentleri için real-time listener (rezervasyonlar üzerinden)
    const tesislerQuery = query(
      collection(db, 'tesisler'),
      where('ownerId', '==', user.uid)
    );

    let innerUnsubscribes = [];

    const unsubscribeTesisler = onSnapshot(tesislerQuery, (snapshot) => {
      // Önceki inner listener'ları temizle
      innerUnsubscribes.forEach(unsub => unsub());
      innerUnsubscribes = [];

      const tesisIds = [];
      snapshot.forEach((doc) => {
        tesisIds.push(doc.id);
      });

      if (tesisIds.length > 0) {
        const reservationsQuery = query(
          collection(db, 'rezervasyonlar'),
          where('tesisId', 'in', tesisIds)
        );

        const unsubscribeReservations = onSnapshot(reservationsQuery, () => {
          // Müşteri segmentlerini yeniden yükle
          loadMarketingData();
        });
        innerUnsubscribes.push(unsubscribeReservations);
      }
    });
    unsubscribeFunctions.push(unsubscribeTesisler);

    return () => {
      innerUnsubscribes.forEach(unsub => unsub());
      unsubscribeFunctions.forEach(unsub => unsub());
    };
  };

  const loadMarketingData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [statsResult, campaignsResult, segmentsResult, templatesResult, savedSegmentsResult] = await Promise.all([
        getMarketingStats(user.uid),
        getCampaigns(user.uid),
        getCustomerSegments(user.uid),
        getMessageTemplates(user.uid),
        getSavedCustomerSegments(user.uid)
      ]);

      if (statsResult.success) {
        setCampaignData(statsResult.data);
        setCampaigns(statsResult.data.campaigns || []);
      }

      let allSegments = [];
      if (segmentsResult.success && Array.isArray(segmentsResult.data)) {
        allSegments = [...segmentsResult.data];
      }
      if (savedSegmentsResult.success && Array.isArray(savedSegmentsResult.data)) {
        allSegments = [...allSegments, ...savedSegmentsResult.data];
      }
      setCustomerSegments(allSegments);

      if (templatesResult.success) {
        setMessageTemplates(templatesResult.data);
      }

      if (campaignsResult.success) {
        setCampaigns(campaignsResult.data);
      }

    } catch (err) {
      console.error('Marketing veri yükleme hatası:', err);
      setError('Veriler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // Kampanya ekleme/düzenleme
  const handleCampaignSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const campaignData = {
        ...campaignForm,
        ownerId: user.uid,
        reached: 0,
        conversion: 0,
        revenue: 0,
        channels: campaignForm.channels
      };

      let result;
      if (editingCampaign) {
        result = await updateCampaign(editingCampaign.id, campaignData);
      } else {
        result = await addCampaign(campaignData);
      }

      if (result.success) {
        setShowCampaignModal(false);
        setCampaignForm({
          name: '',
          type: '',
          description: '',
          target: '',
          channels: [],
          startDate: '',
          endDate: '',
          discount: '',
          status: 'active'
        });
        setEditingCampaign(null);
        loadMarketingData();
      }
    } catch (error) {
      console.error('Kampanya kaydetme hatası:', error);
    }
  };

  // Mesaj şablonu ekleme/düzenleme
  const handleTemplateSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const templateData = {
        ...templateForm,
        ownerId: user.uid,
        stats: { conversion: 0, sent: 0, revenue: 0 }
      };

      const result = await addMessageTemplate(templateData);

      if (result.success) {
        setShowTemplateModal(false);
        setTemplateForm({
          name: '',
          type: '',
          content: '',
          category: ''
        });
        loadMarketingData();
      }
    } catch (error) {
      console.error('Şablon kaydetme hatası:', error);
    }
  };

  const handleSegmentSubmit = async (e) => {
    e.preventDefault();
    try {
        const result = await addCustomerSegment({
            ...segmentForm,
            ownerId: user.uid,
            count: Math.floor(Math.random() * 50) + 10, // Mock count
            action: 'Mesaj Gönder'
        });
        if (result.success) {
            setShowSegmentModal(false);
            setSegmentForm({ name: '', description: '' });
            loadMarketingData();
        }
    } catch (error) {
        console.error('Segment ekleme hatası:', error);
    }
  };

  const handleDeleteSegment = async (id) => {
    if (window.confirm('Bu segmenti silmek istediğinizden emin misiniz?')) {
        await deleteCustomerSegment(id);
        loadMarketingData(); 
    }
  };

  const openSendModal = (template) => {
      setSelectedTemplateForSend(template);
      setShowSendModal(true);
  };

  const handleSendMessageSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTemplateForSend || !selectedSegmentForSend) return;

    try {
        const result = await sendMarketingMessage(
            selectedTemplateForSend.id,
            selectedSegmentForSend,
            selectedTemplateForSend.type
        );
        
        if (result.success) {
            alert('Mesaj başarıyla gönderim sırasına alındı!');
            setShowSendModal(false);
            setSelectedTemplateForSend(null);
            setSelectedSegmentForSend('');
            loadMarketingData();
        }
    } catch (error) {
        console.error('Mesaj gönderme hatası:', error);
        alert('Gönderim başarısız.');
    }
  };

  // Kampanya silme
  const handleDeleteCampaign = async (campaignId) => {
    if (window.confirm('Bu kampanyayı silmek istediğinizden emin misiniz?')) {
      try {
        const result = await deleteCampaign(campaignId);
        if (result.success) {
          loadMarketingData();
        }
      } catch (error) {
        console.error('Kampanya silme hatası:', error);
      }
    }
  };

  // Kampanya düzenleme
  const handleEditCampaign = (campaign) => {
    setEditingCampaign(campaign);
    setCampaignForm({
      name: campaign.name || '',
      type: campaign.type || '',
      description: campaign.description || '',
      target: campaign.target || '',
      channels: campaign.channels || [],
      startDate: campaign.startDate || '',
      endDate: campaign.endDate || '',
      discount: campaign.discount || '',
      status: campaign.status || 'active'
    });
    setShowCampaignModal(true);
  };

  // Hızlı kampanya oluşturma
  const handleQuickCampaign = (campaignType) => {
    const campaignTypes = {
      'happy-hour': 'Happy Hour',
      'last-minute': 'Last Minute',
      'referral': 'Referans',
      'birthday': 'Doğum Günü',
      'win-back': 'Geri Kazan',
      'tournament': 'Turnuva'
    };

    setCampaignForm(prev => ({
      ...prev,
      type: campaignTypes[campaignType],
      name: `${campaignTypes[campaignType]} Kampanyası`
    }));
    setShowCampaignModal(true);
  };

  const formatCurrency = (amount) => {
    if (amount >= 1000000) {
      return `₺${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `₺${(amount / 1000).toFixed(1)}K`;
    }
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(amount);
  };

  const getChannelIcon = (channel) => {
    switch (channel) {
      case 'SMS': return <Smartphone className="w-4 h-4" />;
      case 'Email': return <Mail className="w-4 h-4" />;
      case 'WhatsApp': return <MessageSquare className="w-4 h-4" />;
      case 'Push Notification': return <Bell className="w-4 h-4" />;
      default: return <Globe className="w-4 h-4" />;
    }
  };

  const getChannelColor = (channel) => {
    switch (channel) {
      case 'SMS': return 'text-blue-600 bg-blue-100';
      case 'Email': return 'text-green-600 bg-green-100';
      case 'WhatsApp': return 'text-green-500 bg-green-100';
      case 'Push Notification': return 'text-purple-600 bg-purple-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getCampaignTypeIcon = (type) => {
    switch (type) {
      case 'Happy Hour': return '⏰';
      case 'Last Minute': return '🔥';
      case 'Referans': return '👥';
      case 'Doğum Günü': return '🎂';
      case 'Geri Kazan': return '🔄';
      case 'Turnuva': return '🏆';
      default: return '📢';
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <SahaSahibiSidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white shadow-sm border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Marketing Yönetimi</h1>
              <p className="text-gray-600 mt-1">Kampanyalar, müşteri segmentleri ve mesaj yönetimi</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/saha-sahibi/raporlar')}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg"
              >
                <BarChart3 className="w-4 h-4" />
                <span>📊 Raporları Gör</span>
              </button>
              <button 
                onClick={() => setShowCampaignModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Plus className="w-4 h-4" />
                <span>+ Yeni Kampanya</span>
              </button>
            </div>
          </div>
        </header>

        {/* Tabs */}
        <div className="bg-white border-b px-6">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'dashboard'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('campaigns')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'campaigns'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Kampanyalar
            </button>
            <button
              onClick={() => setActiveTab('segments')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'segments'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Müşteri Segmentleri
            </button>
            <button
              onClick={() => setActiveTab('messages')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'messages'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Mesaj Merkezi
            </button>
          </nav>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 p-6 overflow-y-auto">
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Dashboard Stats */}
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 animate-pulse">
                      <div className="h-20 bg-gray-200 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : campaignData ? (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Aktif Kampanya</p>
                        <p className="text-3xl font-bold text-gray-900 mt-2">
                          {campaignData.activeCampaigns || 0}
                        </p>
                        <div className="flex items-center mt-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                          <span className="text-sm text-green-600">Canlı</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Dinamik veriler</p>
                      </div>
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                        <Target className="w-6 h-6 text-green-600" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Kampanya ROI</p>
                        <p className="text-3xl font-bold text-gray-900 mt-2">
                          %{campaignData.roi || 0}
                        </p>
                        <div className="flex items-center mt-2">
                          <TrendingUp className="w-4 h-4 text-green-500" />
                          <span className="text-sm text-green-600 ml-1">↑ {campaignData.weeklyGrowth || 0}%</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Bu ay ortalama getiri</p>
                      </div>
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <TrendingUp className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Ulaşılan Müşteri</p>
                        <p className="text-3xl font-bold text-gray-900 mt-2">
                          {campaignData.totalReach?.toLocaleString() || 0}
                        </p>
                        <div className="flex items-center mt-2">
                          <Users className="w-4 h-4 text-purple-500" />
                          <span className="text-sm text-purple-600 ml-1">Bu Hafta</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">%{campaignData.openRate || 0} açılma oranı</p>
                      </div>
                      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Users className="w-6 h-6 text-purple-600" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Dönüşüm Oranı</p>
                        <p className="text-3xl font-bold text-gray-900 mt-2">
                          %{campaignData.conversionRate || 0}
                        </p>
                        <div className="flex items-center mt-2">
                          <TrendingUp className="w-4 h-4 text-green-500" />
                          <span className="text-sm text-green-600 ml-1">↑ {campaignData.weeklyGrowth || 0}%</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Kampanyadan rezervasyon</p>
                      </div>
                      <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                        <Target className="w-6 h-6 text-orange-600" />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-center">
                  <p className="text-gray-500">Marketing verileri yükleniyor...</p>
                </div>
              )}

              {/* Quick Campaign Actions */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Hızlı Kampanya Oluştur</h3>
                  <button className="text-sm text-green-600 hover:text-green-700">Gelişmiş Ayarlar</button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {quickCampaigns.map((campaign) => (
                    <button
                      key={campaign.id}
                      onClick={() => handleQuickCampaign(campaign.id)}
                      className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors group"
                    >
                      <div className="text-2xl mb-2">{campaign.icon}</div>
                      <h4 className="font-medium text-gray-900 text-sm mb-1">{campaign.name}</h4>
                      <p className="text-xs text-gray-500 text-center">{campaign.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Active Campaigns */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="p-6 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Aktif Kampanyalar</h3>
                    <button className="text-sm text-green-600 hover:text-green-700">Tümünü Gör</button>
                  </div>
                </div>
                <div className="divide-y divide-gray-200">
                  {campaigns.length > 0 ? (
                    campaigns.map((campaign) => (
                      <div key={campaign.id} className="p-6 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="text-2xl">{getCampaignTypeIcon(campaign.type)}</div>
                            <div>
                              <h4 className="font-semibold text-gray-900">{campaign.name}</h4>
                              <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                                <span className="flex items-center">
                                  <Calendar className="w-4 h-4 mr-1" />
                                  📅 {campaign.startDate ? new Date(campaign.startDate).toLocaleDateString('tr-TR') : 'Süresiz'}
                                </span>
                                <span className="flex items-center">
                                  <Target className="w-4 h-4 mr-1" />
                                  🎯 {campaign.target || 'Tüm müşteriler'}
                                </span>
                                <span className="flex items-center">
                                  📱 {campaign.channels?.join(' + ') || 'SMS'}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-6">
                            <div className="text-right">
                              <div className="text-sm font-medium text-gray-900">{campaign.reached?.toLocaleString() || 0}</div>
                              <div className="text-xs text-gray-500">Ulaşılan</div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium text-gray-900">{campaign.conversion || 0}</div>
                              <div className="text-xs text-gray-500">Dönüşüm</div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium text-gray-900">{formatCurrency(campaign.revenue || 0)}</div>
                              <div className="text-xs text-gray-500">Gelir</div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <button className="text-gray-400 hover:text-gray-600">
                                <BarChart3 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleEditCampaign(campaign)}
                                className="text-gray-400 hover:text-gray-600"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleDeleteCampaign(campaign.id)}
                                className="text-red-400 hover:text-red-600"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-12 text-center">
                      <Target className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <h4 className="text-lg font-medium text-gray-900 mb-2">Henüz kampanya yok</h4>
                      <p className="text-gray-500 mb-4">İlk kampanyanızı oluşturmak için yukarıdaki butona tıklayın.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'campaigns' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Tüm Kampanyalar</h3>
                <div className="text-center py-12">
                  <Target className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Kampanya Yönetimi</h4>
                  <p className="text-gray-500">Detaylı kampanya yönetimi için Dashboard sekmesini kullanın.</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'segments' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Müşteri Segmentleri</h3>
                  <button 
                    onClick={() => setShowSegmentModal(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Segment Oluştur</span>
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {customerSegments.length > 0 ? (
                    customerSegments.map((segment) => (
                      <div key={segment.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors group">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                              <Users className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900">{segment.count || 0}</h4>
                              <p className="text-sm text-gray-600">{segment.name}</p>
                            </div>
                          </div>
                          {segment.id && ( // Only show delete for real segments
                             <button 
                                onClick={() => handleDeleteSegment(segment.id)} 
                                className="text-gray-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Segmenti Sil"
                             >
                                <Trash2 size={16} />
                             </button>
                          )}
                        </div>
                        <button className="w-full text-left text-sm text-green-600 hover:text-green-700 font-medium">
                          {segment.action || 'İşlem Seç'}
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full p-12 text-center">
                      <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <h4 className="text-lg font-medium text-gray-900 mb-2">Müşteri segmentleri hesaplanıyor</h4>
                      <p className="text-gray-500">Rezervasyon verileriniz analiz ediliyor...</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'messages' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Mesaj Merkezi</h3>
                  <div className="flex items-center space-x-4">
                    <button 
                      onClick={() => setShowTemplateModal(true)}
                      className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      <Plus className="w-4 h-4" />
                      <span>+ Yeni Mesaj</span>
                    </button>
                  </div>
                </div>
                
                {/* Message Tabs */}
                <div className="flex space-x-8 mb-6">
                  <button className="py-2 px-1 border-b-2 border-green-500 text-green-600 font-medium text-sm">
                    Şablonlar
                  </button>
                  <button className="py-2 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium text-sm">
                    Zamanlanmış
                  </button>
                  <button className="py-2 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium text-sm">
                    Geçmiş
                  </button>
                </div>

                {/* Message Templates */}
                <div className="space-y-4">
                  {messageTemplates.length > 0 ? (
                    messageTemplates.map((template) => (
                      <div key={template.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-3">
                              <h4 className="font-semibold text-gray-900">{template.name}</h4>
                              <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getChannelColor(template.type)}`}>
                                {getChannelIcon(template.type)}
                                <span className="ml-1">{template.type}</span>
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                              "{template.content}"
                            </p>
                            <div className="flex items-center space-x-6 text-sm">
                              <span className="flex items-center text-blue-600">
                                📊 %{template.stats?.conversion || 0} dönüşüm
                              </span>
                              <span className="flex items-center text-gray-600">
                                👥 {template.stats?.sent?.toLocaleString() || 0} gönderim
                              </span>
                              <span className="flex items-center text-green-600">
                                💰 {formatCurrency(template.stats?.revenue || 0)} gelir
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 ml-4">
                            <button className="text-gray-400 hover:text-gray-600">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button className="text-gray-400 hover:text-gray-600">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => openSendModal(template)}
                              className="text-gray-400 hover:text-green-600"
                              title="Gönder"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-12 text-center">
                      <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <h4 className="text-lg font-medium text-gray-900 mb-2">Henüz mesaj şablonu yok</h4>
                      <p className="text-gray-500 mb-4">İlk mesaj şablonunuzu oluşturmak için yukarıdaki butona tıklayın.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Kampanya Modal */}
      {showCampaignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingCampaign ? 'Kampanya Düzenle' : 'Yeni Kampanya'}
                </h2>
                <button
                  onClick={() => {
                    setShowCampaignModal(false);
                    setEditingCampaign(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleCampaignSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Kampanya Adı
                    </label>
                    <input
                      type="text"
                      value={campaignForm.name}
                      onChange={(e) => setCampaignForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Kampanya adı"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Kampanya Türü
                    </label>
                    <select
                      value={campaignForm.type}
                      onChange={(e) => setCampaignForm(prev => ({ ...prev, type: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      required
                    >
                      <option value="">Tür seçin</option>
                      <option value="Happy Hour">Happy Hour</option>
                      <option value="Last Minute">Last Minute</option>
                      <option value="Referans">Referans</option>
                      <option value="Doğum Günü">Doğum Günü</option>
                      <option value="Geri Kazan">Geri Kazan</option>
                      <option value="Turnuva">Turnuva</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Açıklama
                  </label>
                  <textarea
                    value={campaignForm.description}
                    onChange={(e) => setCampaignForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    rows="3"
                    placeholder="Kampanya açıklaması"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Hedef Kitle
                    </label>
                    <select
                      value={campaignForm.target}
                      onChange={(e) => setCampaignForm(prev => ({ ...prev, target: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="">Hedef seçin</option>
                      <option value="Tüm müşteriler">Tüm müşteriler</option>
                      <option value="VIP müşteriler">VIP müşteriler</option>
                      <option value="Düzenli gelenler">Düzenli gelenler</option>
                      <option value="Kayıp müşteriler">Kayıp müşteriler</option>
                      <option value="Yeni üyeler">Yeni üyeler</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      İndirim Oranı
                    </label>
                    <input
                      type="number"
                      value={campaignForm.discount}
                      onChange={(e) => setCampaignForm(prev => ({ ...prev, discount: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="% indirim"
                      min="0"
                      max="100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    İletişim Kanalları
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['SMS', 'Email', 'WhatsApp', 'Push Notification'].map(channel => (
                      <label key={channel} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={campaignForm.channels.includes(channel)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setCampaignForm(prev => ({
                                ...prev,
                                channels: [...prev.channels, channel]
                              }));
                            } else {
                              setCampaignForm(prev => ({
                                ...prev,
                                channels: prev.channels.filter(c => c !== channel)
                              }));
                            }
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm">{channel}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Başlangıç Tarihi
                    </label>
                    <input
                      type="date"
                      value={campaignForm.startDate}
                      onChange={(e) => setCampaignForm(prev => ({ ...prev, startDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bitiş Tarihi
                    </label>
                    <input
                      type="date"
                      value={campaignForm.endDate}
                      onChange={(e) => setCampaignForm(prev => ({ ...prev, endDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCampaignModal(false);
                      setEditingCampaign(null);
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    {editingCampaign ? 'Güncelle' : 'Kaydet'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Mesaj Şablonu Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Yeni Mesaj Şablonu</h2>
                <button
                  onClick={() => setShowTemplateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleTemplateSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Şablon Adı
                    </label>
                    <input
                      type="text"
                      value={templateForm.name}
                      onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Şablon adı"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      İletişim Kanalı
                    </label>
                    <select
                      value={templateForm.type}
                      onChange={(e) => setTemplateForm(prev => ({ ...prev, type: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      required
                    >
                      <option value="">Kanal seçin</option>
                      <option value="SMS">SMS</option>
                      <option value="Email">Email</option>
                      <option value="WhatsApp">WhatsApp</option>
                      <option value="Push Notification">Push Notification</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mesaj İçeriği
                  </label>
                  <textarea
                    value={templateForm.content}
                    onChange={(e) => setTemplateForm(prev => ({ ...prev, content: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    rows="4"
                    placeholder="Mesaj içeriğinizi buraya yazın..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kategori
                  </label>
                  <select
                    value={templateForm.category}
                    onChange={(e) => setTemplateForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">Kategori seçin</option>
                    <option value="promotion">Promosyon</option>
                    <option value="reminder">Hatırlatma</option>
                    <option value="welcome">Hoşgeldin</option>
                    <option value="event">Etkinlik</option>
                    <option value="other">Diğer</option>
                  </select>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowTemplateModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Kaydet
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Segment Modal */}
      {showSegmentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Yeni Segment Oluştur</h2>
                <button onClick={() => setShowSegmentModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleSegmentSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Segment Adı</label>
                  <input
                    type="text"
                    value={segmentForm.name}
                    onChange={(e) => setSegmentForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="Örn: Hafta Sonu Oyuncuları"
                    required
                  />
                </div>
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-2">Açıklama</label>
                   <textarea
                     value={segmentForm.description}
                     onChange={(e) => setSegmentForm(prev => ({ ...prev, description: e.target.value }))}
                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                     rows="3"
                     placeholder="Segment açıklaması..."
                   />
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button type="button" onClick={() => setShowSegmentModal(false)} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">İptal</button>
                  <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Oluştur</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Mesaj Gönderim Modal */}
      {showSendModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Mesaj Gönder</h2>
                <button onClick={() => setShowSendModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="mb-4 p-4 bg-gray-50 rounded-lg text-sm text-gray-600">
                 <p className="font-bold mb-1">Seçili Şablon:</p>
                 <p>"{selectedTemplateForSend?.name}"</p>
                 <p className="mt-2 text-xs text-gray-500 italic">Kanal: {selectedTemplateForSend?.type}</p>
              </div>

              <form onSubmit={handleSendMessageSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Hedef Segment</label>
                  <select
                    value={selectedSegmentForSend}
                    onChange={(e) => setSelectedSegmentForSend(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    required
                  >
                    <option value="">Segment Seçin...</option>
                    {customerSegments.map(seg => (
                        <option key={seg.id} value={seg.id}>{seg.name} ({seg.count || 0} Kişi)</option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button type="button" onClick={() => setShowSendModal(false)} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">İptal</button>
                  <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2">
                     <Send className="w-4 h-4" /> Gönder
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Marketing;
