import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  createSupportTicket, 
  getUserTickets, 
  getTicketDetails, 
  replyToTicket,
  closeTicket,
  reopenTicket
} from '../../services/firestoreService';
import { collection, query, onSnapshot, where, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';
import OyuncuSidebar from '../../components/OyuncuSidebar';
import { 
  MessageSquare, 
  Plus, 
  Send, 
  X, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Search,
  Filter,
  FileText,
  User,
  Calendar
} from 'lucide-react';
import toast from '../../utils/toast';

const Destek = () => {
  const { user, userData } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [ticketForm, setTicketForm] = useState({
    title: '',
    description: '',
    category: 'general',
    priority: 'medium'
  });

  useEffect(() => {
    if (!user) return;
    
    loadTickets();
    setupRealtimeListener();
  }, [user, filter]);

  const setupRealtimeListener = () => {
    if (!user) return;

    let q = query(
      collection(db, 'tickets'),
      where('userId', '==', user.uid)
    );

    if (filter !== 'all') {
      q = query(
        collection(db, 'tickets'),
        where('userId', '==', user.uid),
        where('status', '==', filter)
      );
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const ticketsData = [];
        snapshot.forEach((doc) => {
          ticketsData.push({ id: doc.id, ...doc.data() });
        });
        
        // Client-side sorting: en yeni önce
        ticketsData.sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
          return dateB - dateA;
        });
        
        setTickets(ticketsData);
        setLoading(false);
      },
      (error) => {
        console.error('Real-time listener hatası:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  };

  const loadTickets = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const result = await getUserTickets(user.uid, { status: filter });
      if (result.success) {
        setTickets(result.data);
      } else {
        toast.error(result.error || 'Ticketlar yüklenemedi');
      }
    } catch (error) {
      console.error('Ticket yükleme hatası:', error);
      toast.error('Ticketlar yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!user) return;

    if (!ticketForm.title.trim() || !ticketForm.description.trim()) {
      toast.error('Başlık ve açıklama zorunludur');
      return;
    }

    try {
      const result = await createSupportTicket({
        userId: user.uid,
        userName: userData?.fullName || userData?.displayName || user.email,
        userType: userData?.userType || 'player',
        title: ticketForm.title,
        description: ticketForm.description,
        category: ticketForm.category,
        priority: ticketForm.priority,
        status: 'open'
      });

      if (result.success) {
        toast.success('Ticket başarıyla oluşturuldu');
        setShowCreateModal(false);
        setTicketForm({
          title: '',
          description: '',
          category: 'general',
          priority: 'medium'
        });
        loadTickets();
      } else {
        toast.error(result.error || 'Ticket oluşturulamadı');
      }
    } catch (error) {
      console.error('Ticket oluşturma hatası:', error);
      toast.error('Ticket oluşturulurken hata oluştu');
    }
  };

  const handleReply = async (e) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim()) return;

    try {
      const result = await replyToTicket(selectedTicket.id, {
        userId: user.uid,
        userName: userData?.fullName || userData?.displayName || user.email,
        message: replyText,
        isAdmin: false
      });

      if (result.success) {
        toast.success('Yanıt gönderildi');
        setReplyText('');
        const updatedResult = await getTicketDetails(selectedTicket.id);
        if (updatedResult.success) {
          setSelectedTicket(updatedResult.data);
        }
      } else {
        toast.error(result.error || 'Yanıt gönderilemedi');
      }
    } catch (error) {
      console.error('Yanıt gönderme hatası:', error);
      toast.error('Yanıt gönderilirken hata oluştu');
    }
  };

  const handleCloseTicket = async (ticketId) => {
    if (!confirm('Bu ticket\'ı kapatmak istediğinize emin misiniz?')) return;

    try {
      const result = await closeTicket(ticketId);
      if (result.success) {
        toast.success('Ticket kapatıldı');
        loadTickets();
        if (selectedTicket?.id === ticketId) {
          setSelectedTicket({ ...selectedTicket, status: 'closed' });
        }
      } else {
        toast.error(result.error || 'Ticket kapatılamadı');
      }
    } catch (error) {
      console.error('Ticket kapatma hatası:', error);
      toast.error('Ticket kapatılırken hata oluştu');
    }
  };

  const handleReopenTicket = async (ticketId) => {
    try {
      const result = await reopenTicket(ticketId);
      if (result.success) {
        toast.success('Ticket yeniden açıldı');
        loadTickets();
        if (selectedTicket?.id === ticketId) {
          setSelectedTicket({ ...selectedTicket, status: 'open' });
        }
      } else {
        toast.error(result.error || 'Ticket yeniden açılamadı');
      }
    } catch (error) {
      console.error('Ticket yeniden açma hatası:', error);
      toast.error('Ticket yeniden açılırken hata oluştu');
    }
  };

  const openTicketDetail = async (ticketId) => {
    try {
      const result = await getTicketDetails(ticketId);
      if (result.success) {
        setSelectedTicket(result.data);
        setShowDetailModal(true);
      } else {
        toast.error(result.error || 'Ticket detayları yüklenemedi');
      }
    } catch (error) {
      console.error('Ticket detay yükleme hatası:', error);
      toast.error('Ticket detayları yüklenirken hata oluştu');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'resolved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'closed':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'open':
        return 'Açık';
      case 'in_progress':
        return 'Devam Ediyor';
      case 'resolved':
        return 'Çözüldü';
      case 'closed':
        return 'Kapatıldı';
      default:
        return status;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityText = (priority) => {
    switch (priority) {
      case 'high':
        return 'Yüksek';
      case 'medium':
        return 'Orta';
      case 'low':
        return 'Düşük';
      default:
        return priority;
    }
  };

  const getCategoryText = (category) => {
    switch (category) {
      case 'general':
        return 'Genel';
      case 'technical':
        return 'Teknik';
      case 'billing':
        return 'Faturalama';
      case 'account':
        return 'Hesap';
      case 'other':
        return 'Diğer';
      default:
        return category;
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        ticket.title?.toLowerCase().includes(query) ||
        ticket.description?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Tarih yok';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('tr-TR');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <OyuncuSidebar />
        <div className="flex-1 p-4 sm:p-6 md:p-8">
          {/* Header */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6 mt-12 md:mt-0">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Destek Sistemi</h1>
                <p className="text-gray-600">Sorunlarınız için destek ticket'ı oluşturun</p>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Yeni Ticket
              </button>
            </div>
          </div>

          {/* Filtreler ve Arama */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Ticket ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-gray-400" />
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="all">Tümü</option>
                  <option value="open">Açık</option>
                  <option value="in_progress">Devam Ediyor</option>
                  <option value="resolved">Çözüldü</option>
                  <option value="closed">Kapatıldı</option>
                </select>
              </div>
            </div>
          </div>

          {/* Ticket Listesi */}
          {loading ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
              <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Yükleniyor...</p>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
              <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">Henüz ticket bulunmuyor</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                İlk Ticket'ınızı Oluşturun
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => openTicketDetail(ticket.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <MessageSquare className="w-5 h-5 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900">{ticket.title}</h3>
                          <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {formatDate(ticket.createdAt)}
                            </span>
                            <span>{getCategoryText(ticket.category)}</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-gray-600 ml-13 line-clamp-2">{ticket.description}</p>
                      {ticket.replies && ticket.replies.length > 0 && (
                        <div className="mt-3 ml-13 flex items-center gap-2 text-sm text-gray-500">
                          <MessageSquare className="w-4 h-4" />
                          <span>{ticket.replies.length} yanıt</span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 ml-4">
                      <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(ticket.status)}`}>
                        {getStatusText(ticket.status)}
                      </span>
                      <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getPriorityColor(ticket.priority)}`}>
                        {getPriorityText(ticket.priority)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Yeni Ticket Modal */}
          {showCreateModal && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-gray-900">Yeni Destek Ticket'ı</h2>
                    <button
                      onClick={() => {
                        setShowCreateModal(false);
                        setTicketForm({
                          title: '',
                          description: '',
                          category: 'general',
                          priority: 'medium'
                        });
                      }}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                </div>
                <form onSubmit={handleCreateTicket} className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Başlık *
                    </label>
                    <input
                      type="text"
                      value={ticketForm.title}
                      onChange={(e) => setTicketForm({ ...ticketForm, title: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Ticket başlığını girin"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Açıklama *
                    </label>
                    <textarea
                      value={ticketForm.description}
                      onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      rows="6"
                      placeholder="Sorununuzu detaylı olarak açıklayın"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Kategori
                      </label>
                      <select
                        value={ticketForm.category}
                        onChange={(e) => setTicketForm({ ...ticketForm, category: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      >
                        <option value="general">Genel</option>
                        <option value="technical">Teknik</option>
                        <option value="billing">Faturalama</option>
                        <option value="account">Hesap</option>
                        <option value="other">Diğer</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Öncelik
                      </label>
                      <select
                        value={ticketForm.priority}
                        onChange={(e) => setTicketForm({ ...ticketForm, priority: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      >
                        <option value="low">Düşük</option>
                        <option value="medium">Orta</option>
                        <option value="high">Yüksek</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateModal(false);
                        setTicketForm({
                          title: '',
                          description: '',
                          category: 'general',
                          priority: 'medium'
                        });
                      }}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      İptal
                    </button>
                    <button
                      type="submit"
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <Send className="w-4 h-4" />
                      Oluştur
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Ticket Detay Modal */}
          {showDetailModal && selectedTicket && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">{selectedTicket.title}</h2>
                      <div className="flex items-center gap-3 mt-2">
                        <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(selectedTicket.status)}`}>
                          {getStatusText(selectedTicket.status)}
                        </span>
                        <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getPriorityColor(selectedTicket.priority)}`}>
                          {getPriorityText(selectedTicket.priority)}
                        </span>
                        <span className="text-sm text-gray-500">
                          {getCategoryText(selectedTicket.category)}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setShowDetailModal(false);
                        setSelectedTicket(null);
                        setReplyText('');
                      }}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                </div>
                <div className="p-6 space-y-6">
                  {/* Ticket Açıklaması */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Açıklama</h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-gray-700 whitespace-pre-wrap">{selectedTicket.description}</p>
                    </div>
                    <div className="mt-2 text-sm text-gray-500">
                      Oluşturulma: {formatDate(selectedTicket.createdAt)}
                    </div>
                  </div>

                  {/* Yanıtlar */}
                  {selectedTicket.replies && selectedTicket.replies.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Yanıtlar</h3>
                      <div className="space-y-4">
                        {selectedTicket.replies.map((reply, index) => (
                          <div
                            key={index}
                            className={`p-4 rounded-lg border ${
                              reply.isAdmin
                                ? 'bg-green-50 border-green-200'
                                : 'bg-gray-50 border-gray-200'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                {reply.isAdmin ? (
                                  <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                                    <User className="w-4 h-4 text-white" />
                                  </div>
                                ) : (
                                  <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center">
                                    <User className="w-4 h-4 text-white" />
                                  </div>
                                )}
                                <div>
                                  <p className="font-medium text-gray-900">
                                    {reply.isAdmin ? 'Admin' : reply.userName || 'Kullanıcı'}
                                  </p>
                                  <p className="text-xs text-gray-500">{formatDate(reply.createdAt)}</p>
                                </div>
                              </div>
                            </div>
                            <p className="text-gray-700 whitespace-pre-wrap">{reply.message}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Yanıt Formu */}
                  {selectedTicket.status !== 'closed' && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Yanıt Ekle</h3>
                      <form onSubmit={handleReply} className="space-y-4">
                        <textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          rows="4"
                          placeholder="Yanıtınızı yazın..."
                          required
                        />
                        <div className="flex justify-end gap-3">
                          {selectedTicket.status === 'closed' ? (
                            <button
                              type="button"
                              onClick={() => handleReopenTicket(selectedTicket.id)}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              Ticket'ı Yeniden Aç
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => handleCloseTicket(selectedTicket.id)}
                                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                              >
                                Kapat
                              </button>
                              <button
                                type="submit"
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                              >
                                <Send className="w-4 h-4" />
                                Gönder
                              </button>
                            </>
                          )}
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Kapatılmış Ticket Uyarısı */}
                  {selectedTicket.status === 'closed' && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-gray-600">
                        <AlertCircle className="w-5 h-5" />
                        <p>Bu ticket kapatılmış. Yanıt eklemek için ticket'ı yeniden açmanız gerekir.</p>
                      </div>
                      <button
                        onClick={() => handleReopenTicket(selectedTicket.id)}
                        className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Ticket'ı Yeniden Aç
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Destek;

