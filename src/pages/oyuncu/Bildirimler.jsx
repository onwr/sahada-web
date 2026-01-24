import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getPlayerNotifications, markNotificationAsRead, respondToTeamInvitation, respondToMatchJoinRequest, respondToMessageRequest, respondToContactRequest } from '../../services/firestoreService';
import { collection, query, onSnapshot, where, limit, updateDoc, doc, serverTimestamp, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '../../config/firebase';
import OyuncuSidebar from '../../components/OyuncuSidebar';
import { 
  Bell, Calendar, Trophy, Users, Star, MessageSquare, Crown,
  Check, Trash2, Settings, Filter, CheckCheck, X, Loader2, AlertCircle, UserPlus, UserX, Phone
} from 'lucide-react';
import toast from '../../utils/toast';

const typeConfig = {
  reservation: { icon: Calendar, bg: 'bg-blue-100', text: 'text-blue-600' },
  team: { icon: Users, bg: 'bg-purple-100', text: 'text-purple-600' },
  team_invitation: { icon: Users, bg: 'bg-purple-100', text: 'text-purple-600' },
  team_join: { icon: Users, bg: 'bg-indigo-100', text: 'text-indigo-600' },
  team_reject: { icon: Users, bg: 'bg-red-100', text: 'text-red-600' },
  match_join_request: { icon: UserPlus, bg: 'bg-green-100', text: 'text-green-600' },
  match_kick: { icon: UserX, bg: 'bg-red-100', text: 'text-red-600' },
  rating: { icon: Star, bg: 'bg-yellow-100', text: 'text-yellow-600' },
  message: { icon: MessageSquare, bg: 'bg-green-100', text: 'text-green-600' },
  tournament: { icon: Trophy, bg: 'bg-orange-100', text: 'text-orange-600' },
  system: { icon: Crown, bg: 'bg-gray-100', text: 'text-gray-600' },
  message_request: { icon: MessageSquare, bg: 'bg-blue-100', text: 'text-blue-600' },
  contact_request: { icon: Phone, bg: 'bg-green-100', text: 'text-green-600' },
  default: { icon: Bell, bg: 'bg-gray-100', text: 'text-gray-600' }
};

const Bildirimler = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [inviteLoading, setInviteLoading] = useState(null);

  useEffect(() => {
    if (!user) return;
    
    loadNotifications();
    const cleanup = setupRealtimeListener();
    
    return () => {
      if (cleanup) cleanup();
    };
  }, [user]);

  const setupRealtimeListener = () => {
    if (!user) return;

    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      limit(100)
    );

    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      const notificationsData = [];
      snapshot.forEach((doc) => {
        notificationsData.push({ id: doc.id, ...doc.data() });
      });
      
      notificationsData.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return dateB - dateA;
      });
      
      setNotifications(notificationsData);
      setLoading(false);
    }, (error) => {
      console.error('Bildirim listener hatası:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  };

  const loadNotifications = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const result = await getPlayerNotifications(user.uid);
      if (result.success) setNotifications(result.data);
    } catch (err) {
      setError('Veriler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.read);
    if (unread.length === 0) return;
    
    try {
      const batch = writeBatch(db);
      unread.forEach(n => {
        batch.update(doc(db, 'notifications', n.id), {
          read: true,
          readAt: serverTimestamp()
        });
      });
      await batch.commit();
      toast.success('Tüm bildirimler okundu işaretlendi');
    } catch (err) {
      toast.error('Hata oluştu');
    }
  };

  const clearAll = async () => {
    if (!window.confirm('Tüm bildirimleri silmek istediğinize emin misiniz?')) return;
    try {
      const batch = writeBatch(db);
      notifications.forEach(n => {
        batch.delete(doc(db, 'notifications', n.id));
      });
      await batch.commit();
      toast.success('Tüm bildirimler silindi');
    } catch (err) {
      toast.error('Hata oluştu');
    }
  };

  const handleDeleteNotification = async (id) => {
    try {
      await deleteDoc(doc(db, 'notifications', id));
      toast.success('Bildirim silindi');
    } catch (err) {
      toast.error('Hata oluştu');
    }
  };

  const markAsRead = async (id) => {
    try {
      await markNotificationAsRead(id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleInvitation = async (notificationId, action) => {
    setInviteLoading(notificationId);
    try {
      const result = await respondToTeamInvitation(notificationId, action, user.uid);
      if (result.success) {
        toast.success(action === 'accept' ? 'Davet kabul edildi! 🎉' : 'Davet reddedildi.');
      } else {
        toast.error(result.error);
      }
    } catch (err) {
      toast.error('Bir hata oluştu');
    } finally {
      setInviteLoading(null);
    }
  };

  const handleMatchJoinRequest = async (notification, action) => {
    setInviteLoading(notification.id);
    try {
      const result = await respondToMatchJoinRequest(
          notification.id, 
          action, 
          notification.relatedId, 
          notification.relatedUserId,
          user.uid
      );
      
      if (result.success) {
        toast.success(action === 'accept' ? 'İstek kabul edildi!' : 'İstek reddedildi.');
      } else {
        toast.error(result.error || 'İşlem başarısız');
      }
    } catch (err) {
      toast.error('Bir hata oluştu');
    } finally {
      setInviteLoading(null);
    }
  };

  const handleMessageRequest = async (notification, action) => {
    setInviteLoading(notification.id);
    try {
      const result = await respondToMessageRequest(notification.id, action);
      if (result.success) {
        toast.success(action === 'accept' ? 'Mesajlaşma isteği kabul edildi!' : 'İstek reddedildi.');
        
        if (action === 'accept' && notification.relatedId) {
             navigate(`/oyuncu/mesajlar?conversationId=${notification.relatedId}`);
        }
      } else {
        toast.error(result.error || 'İşlem başarısız');
      }
    } catch (err) {
      toast.error('Bir hata oluştu');
    } finally {
      setInviteLoading(null);
    }
  };

  const handleContactRequest = async (notification, action) => {
    setInviteLoading(notification.id);
    try {
      const result = await respondToContactRequest(notification.id, action);
      if (result.success) {
        toast.success(action === 'accept' ? 'İletişim isteği kabul edildi!' : 'İstek reddedildi.');
      } else {
        toast.error(result.error || 'İşlem başarısız');
      }
    } catch (err) {
      toast.error('Bir hata oluştu');
    } finally {
      setInviteLoading(null);
    }
  };

  const formatTimestamp = (createdAt) => {
    if (!createdAt) return '';
    const date = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / 60000);

    if (diffInMinutes < 1) return 'Az önce';
    if (diffInMinutes < 60) return `${diffInMinutes} dakika önce`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} saat önce`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return 'Dün';
    if (diffInDays < 7) return `${diffInDays} gün önce`;
    
    return date.toLocaleDateString('tr-TR');
  };

  const cleanMessage = (msg) => {
    if (!msg || typeof msg !== 'string') return '';
    
    // Fix UTF-8 encoding issues (Mojibake)
    let cleaned = msg
      .replace(/Ã¶/g, 'ö')
      .replace(/Ã§/g, 'ç')
      .replace(/ÅŸ/g, 'ş')
      .replace(/ÄŸ/g, 'ğ')
      .replace(/Ã¼/g, 'ü')
      .replace(/Ä±/g, 'ı')
      .replace(/Ä°/g, 'İ')
      .replace(/Ã–/g, 'Ö')
      .replace(/Ã‡/g, 'Ç')
      .replace(/Åž/g, 'Ş')
      .replace(/Äž/g, 'Ğ')
      .replace(/Ãœ/g, 'Ü');

    // Regex to match Firestore Timestamp string representation
    return cleaned.replace(/Timestamp\(seconds=(\d+),\s*nanoseconds=(\d+)\)/g, (match, seconds) => {
      try {
        const date = new Date(parseInt(seconds) * 1000);
        return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
      } catch (e) {
        return match;
      }
    });
  };

  const messageRequests = notifications.filter(n => n.type === 'message_request');
  const contactRequests = notifications.filter(n => n.type === 'contact_request' && n.status === 'pending');
  const matchJoinRequests = notifications.filter(n => n.type === 'match_join_request');
  const teamInvites = notifications.filter(n => n.type === 'team_invitation' && n.status === 'pending');
  const generalNotifications = notifications.filter(n => filter === 'all' ? true : !n.read);
  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <Loader2 className="w-10 h-10 text-green-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <OyuncuSidebar />

      <div className="flex-1 p-4 md:p-8 overflow-y-auto max-h-screen">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                Bildirimler
                {unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-sm font-bold px-3 py-1 rounded-full animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </h1>
              <p className="text-gray-500 mt-1 italic">Sizin için en son güncellemeler ve aktiviteler</p>
            </div>
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all text-sm font-semibold shadow-sm"
                >
                  <CheckCheck size={18} className="text-green-600" />
                  Hepsini Oku
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all text-sm font-semibold"
                >
                  <Trash2 size={18} />
                  Temizle
                </button>
              )}
            </div>
          </div>

          {/* Message Requests Section */}
          {messageRequests.length > 0 && (
            <div className="bg-gradient-to-br from-blue-600 via-sky-600 to-cyan-500 rounded-3xl p-[1px] shadow-xl mb-6">
              <div className="bg-white rounded-[23px] p-6">
                <div className="flex items-center gap-2 mb-6">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <MessageSquare size={24} className="text-blue-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">Mesaj İstekleri</h2>
                  <span className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-lg ml-2">
                    {messageRequests.length} YENİ
                  </span>
                </div>
                <div className="grid gap-4">
                  {messageRequests.map((req) => (
                    <div key={req.id} className="bg-gray-50/50 rounded-2xl p-5 border border-gray-100 hover:border-blue-100 transition-all">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                          <div 
                             className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center border border-gray-100 cursor-pointer hover:bg-gray-50"
                             onClick={() => navigate(`/oyuncu-detay/${req.senderId || req.relatedUserId}`)}
                          >
                            <Users size={28} className="text-blue-500" />
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-900 text-lg hover:text-blue-600 cursor-pointer" onClick={() => navigate(`/oyuncu-detay/${req.senderId || req.relatedUserId}`)}>
                                {cleanMessage(req.senderName || 'Kullanıcı')}
                            </h3>
                            <p className="text-sm text-gray-500">{cleanMessage(req.message)}</p>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={() => handleMessageRequest(req, 'reject')}
                            disabled={inviteLoading === req.id}
                            className="flex-1 sm:flex-none px-6 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-100 transition-all disabled:opacity-50"
                          >
                            Reddet
                          </button>
                          <button
                            onClick={() => handleMessageRequest(req, 'accept')}
                            disabled={inviteLoading === req.id}
                            className="flex-1 sm:flex-none px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-100 disabled:opacity-50"
                          >
                             {inviteLoading === req.id ? <Loader2 size={16} className="animate-spin" /> : <Check size={18} />}
                            Kabul Et
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Contact Requests Section */}
          {contactRequests.length > 0 && (
            <div className="bg-gradient-to-br from-green-500 via-emerald-600 to-teal-500 rounded-3xl p-[1px] shadow-xl mb-6">
              <div className="bg-white rounded-[23px] p-6">
                <div className="flex items-center gap-2 mb-6">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Phone size={24} className="text-green-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">İletişim Talepleri</h2>
                  <span className="bg-green-600 text-white text-xs font-bold px-2 py-1 rounded-lg ml-2">
                    {contactRequests.length} YENİ
                  </span>
                </div>
                <div className="grid gap-4">
                  {contactRequests.map((req) => (
                    <div key={req.id} className="bg-gray-50/50 rounded-2xl p-5 border border-gray-100 hover:border-green-100 transition-all">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                          <div 
                             className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center border border-gray-100 cursor-pointer hover:bg-gray-50"
                             onClick={() => navigate(`/oyuncu-detay/${req.senderId}`)}
                          >
                            <Users size={28} className="text-green-500" />
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-900 text-lg hover:text-green-600 cursor-pointer" onClick={() => navigate(`/oyuncu-detay/${req.senderId}`)}>
                                {cleanMessage(req.senderName || 'Kullanıcı')}
                            </h3>
                            <p className="text-sm text-gray-500">İletişim bilgilerinizi görmek istiyor.</p>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={() => handleContactRequest(req, 'reject')}
                            disabled={inviteLoading === req.id}
                            className="flex-1 sm:flex-none px-6 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-100 transition-all disabled:opacity-50"
                          >
                            Reddet
                          </button>
                          <button
                            onClick={() => handleContactRequest(req, 'accept')}
                            disabled={inviteLoading === req.id}
                            className="flex-1 sm:flex-none px-6 py-2.5 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-100 disabled:opacity-50"
                          >
                             {inviteLoading === req.id ? <Loader2 size={16} className="animate-spin" /> : <Check size={18} />}
                            Kabul Et
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          {matchJoinRequests.length > 0 && (
            <div className="bg-gradient-to-br from-green-600 via-teal-600 to-emerald-500 rounded-3xl p-[1px] shadow-xl mb-6">
              <div className="bg-white rounded-[23px] p-6">
                <div className="flex items-center gap-2 mb-6">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <UserPlus size={24} className="text-green-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">Maç İstekleri</h2>
                  <span className="bg-green-600 text-white text-xs font-bold px-2 py-1 rounded-lg ml-2">
                    {matchJoinRequests.length} YENİ
                  </span>
                </div>
                <div className="grid gap-4">
                  {matchJoinRequests.map((req) => (
                    <div key={req.id} className="bg-gray-50/50 rounded-2xl p-5 border border-gray-100 hover:border-green-100 transition-all">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                          <div 
                             className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center border border-gray-100 cursor-pointer hover:bg-gray-50"
                             onClick={() => navigate(`/oyuncu-detay/${req.relatedUserId}`)}
                          >
                            <Users size={28} className="text-green-500" />
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-900 text-lg hover:text-green-600 cursor-pointer" onClick={() => navigate(`/oyuncu-detay/${req.relatedUserId}`)}>
                                İsteği Gönderen Profili
                            </h3>
                            <p className="text-sm text-gray-500">{cleanMessage(req.message)}</p>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={() => handleMatchJoinRequest(req, 'reject')}
                            disabled={inviteLoading === req.id}
                            className="flex-1 sm:flex-none px-6 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-100 transition-all disabled:opacity-50"
                          >
                            Reddet
                          </button>
                          <button
                            onClick={() => handleMatchJoinRequest(req, 'accept')}
                            disabled={inviteLoading === req.id}
                            className="flex-1 sm:flex-none px-6 py-2.5 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-100 disabled:opacity-50"
                          >
                             {inviteLoading === req.id ? <Loader2 size={16} className="animate-spin" /> : <Check size={18} />}
                            Kabul Et
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Team Invites Section */}
          {teamInvites.length > 0 && (
            <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 rounded-3xl p-[1px] shadow-xl">
              <div className="bg-white rounded-[23px] p-6">
                <div className="flex items-center gap-2 mb-6">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <Users size={24} className="text-indigo-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">Takım Davetleri</h2>
                  <span className="bg-indigo-600 text-white text-xs font-bold px-2 py-1 rounded-lg ml-2">
                    {teamInvites.length} YENİ
                  </span>
                </div>
                <div className="grid gap-4">
                  {teamInvites.map((invite) => (
                    <div key={invite.id} className="bg-gray-50/50 rounded-2xl p-5 border border-gray-100 hover:border-indigo-100 transition-all">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center border border-gray-100">
                            <Users size={28} className="text-indigo-500" />
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-900 text-lg">{cleanMessage(invite.teamName)}</h3>
                            <p className="text-sm text-gray-500">Takımına davet edildiniz</p>
                            {invite.message && (
                                <p className="text-sm text-indigo-600 mt-2 bg-indigo-50 px-3 py-1 rounded-lg inline-block italic">
                                  "{cleanMessage(invite.message)}"
                                </p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={() => handleInvitation(invite.id, 'reject')}
                            disabled={inviteLoading === invite.id}
                            className="flex-1 sm:flex-none px-6 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-100 transition-all disabled:opacity-50"
                          >
                            Reddet
                          </button>
                          <button
                            onClick={() => handleInvitation(invite.id, 'accept')}
                            disabled={inviteLoading === invite.id}
                            className="flex-1 sm:flex-none px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 disabled:opacity-50"
                          >
                            {inviteLoading === invite.id ? <Loader2 size={16} className="animate-spin" /> : <Check size={18} />}
                            Kabul Et
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Filter Tabs */}
          <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-gray-100 w-fit">
            <button
              onClick={() => setFilter('all')}
              className={`px-6 py-2 text-sm font-bold rounded-xl transition-all ${
                filter === 'all' ? 'bg-green-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              Hepsi ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-6 py-2 text-sm font-bold rounded-xl transition-all ${
                filter === 'unread' ? 'bg-green-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              Okunmamış ({unreadCount})
            </button>
          </div>

          {/* List */}
          <div className="space-y-4">
            {generalNotifications.length > 0 ? (
              generalNotifications.map((n) => {
                const config = typeConfig[n.type] || typeConfig.default;
                const Icon = config.icon;
                return (
                  <div
                    key={n.id}
                    className={`group relative bg-white rounded-2xl border-2 p-5 transition-all hover:shadow-lg ${
                      n.read ? 'border-gray-50 opacity-80' : 'border-green-100 bg-white shadow-sm'
                    }`}
                  >
                    <div className="flex items-start gap-5">
                      {/* Icon */}
                      <div className={`p-4 rounded-2xl shadow-sm bg-opacity-10 ${config.bg} ${config.text}`}>
                        <Icon size={24} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div 
                            className="cursor-pointer"
                            onClick={() => {
                              markAsRead(n.id);
                              if (n.type === 'system' && n.relatedId) {
                                navigate(`/mac-detay/${n.relatedId}`);
                              } else if (n.type === 'contact_request' || n.type === 'system') {
                                if (n.relatedId) navigate(`/oyuncu-detay/${n.relatedId}`);
                                else if (n.senderId) navigate(`/oyuncu-detay/${n.senderId}`);
                              } else if (n.type === 'message') {
                                navigate(`/oyuncu/mesajlar`);
                              } else if (n.type === 'reservation') {
                                navigate(`/oyuncu/rezervasyonlar`);
                              }
                            }}
                          >
                            <h3 className={`font-bold text-lg ${n.read ? 'text-gray-600' : 'text-gray-900'}`}>
                              {cleanMessage(n.title)}
                            </h3>
                            <p className="text-gray-500 mt-1 leading-relaxed">
                              {cleanMessage(n.message)}
                            </p>
                            <span className="text-xs font-semibold text-gray-400 mt-3 block uppercase tracking-wider">
                              {formatTimestamp(n.createdAt)}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                            {!n.read && (
                              <button
                                onClick={() => markAsRead(n.id)}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                                title="Okundu işaretle"
                              >
                                <Check size={20} />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteNotification(n.id)}
                              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                              title="Sil"
                            >
                              <Trash2 size={20} />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Dot Indicator */}
                      {!n.read && (
                        <div className="w-3 h-3 bg-green-500 rounded-full shrink-0 shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-100">
                <div className="bg-gray-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Bell size={48} className="text-gray-200" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Tertemiz!</h3>
                <p className="text-gray-500 mt-2">Şu an için yeni bir bildiriminiz bulunmuyor.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Bildirimler;
