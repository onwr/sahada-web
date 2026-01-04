import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';

import { 
  createOrGetConversation,
  getUserConversations,
  getConversationMessages,
  sendMessage,
  markMessagesAsRead,
  deleteMessage,
  addMessageReaction,
  removeMessageReaction,
  getUserData,
  searchUsers,
  sendChatInvitation,
  respondToChatInvitation,
  deleteConversation
} from '../../services/firestoreService';
import { collection, query, onSnapshot, where, limit, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { uploadImage } from '../../services/cdnService';
import OyuncuSidebar from '../../components/OyuncuSidebar';
import {
  MessageSquare,
  Send,
  Paperclip,
  Smile,
  X,
  Check,
  CheckCheck,
  Trash2,
  Search,
  Image as ImageIcon,
  File,
  MoreVertical,
  Clock // New icon
} from 'lucide-react';
import { updateDoc, doc, serverTimestamp } from 'firebase/firestore'; // Import direct firestore utils handling accept without notification id
import toast from '../../utils/toast';

const Mesajlar = () => {
  const { user, userData } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [otherUserData, setOtherUserData] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileConversationList, setShowMobileConversationList] = useState(true);
  const [showNewConversationModal, setShowNewConversationModal] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const emojis = ['😀', '😍', '👍', '❤️', '🔥', '🎉', '👏', '🙏'];

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    // 1. Durum: OyuncuBul sayfasından 'Mesaj' butonu ile gelinmişse (State ile)
    if (location.state?.recipient) {
      const recipient = location.state.recipient;
      const recipientId = recipient.uid || recipient.id;
      
      if (recipientId && recipientId !== user.uid) {
          handleStartConversation(recipientId);
          // State temizleme işlemi opsiyonel: 
          // navigate(location.pathname, { replace: true, state: {} });
      }
    }

    // 2. Durum: URL parametresi ile gelinmişse (?userId=...)
    const userIdParam = searchParams.get('userId');
    if (userIdParam && userIdParam !== user.uid) {
      handleStartConversation(userIdParam);
    }

    setupConversationsListener();
  }, [user]);

  useEffect(() => {
    if (selectedConversation) {
      setupMessagesListener(selectedConversation.id);
      markAsRead(selectedConversation.id);
    }
  }, [selectedConversation]);

  useEffect(() => {
    if (showNewConversationModal) {
       // Modal açıldığında listeyi temizle veya önerilenleri getir
       setAvailableUsers([]);
       setUserSearchQuery('');
    }
  }, [showNewConversationModal]);
  
  useEffect(() => {
      if (!userSearchQuery) {
          setAvailableUsers([]);
          return;
      }
      
      const timer = setTimeout(async () => {
          if (userSearchQuery.length >= 2) { // 2 karakter yeterli olabilir
             setLoadingUsers(true);
             const result = await searchUsers(userSearchQuery);
             if (result.success) {
                 setAvailableUsers(result.data.filter(u => u.id !== user.uid));
             }
             setLoadingUsers(false);
          }
      }, 500);

      return () => clearTimeout(timer);
  }, [userSearchQuery]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const setupConversationsListener = () => {
    if (!user) return;

    const conversationsRef = collection(db, 'conversations');
    const q = query(
      conversationsRef,
      where('participants', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const conversationsData = [];
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        const otherUserId = data.participants.find(id => id !== user.uid);
        
        // Status checks
        // If undefined (legacy), treat as accepted
        const status = data.status || 'accepted';
        
        // Diğer kullanıcının bilgilerini getir
        let otherUser = null;
        try {
          const userResult = await getUserData(otherUserId);
          if (userResult.success) {
            otherUser = userResult.data;
          }
        } catch (error) {
          console.error('Kullanıcı bilgisi getirme hatası:', error);
        }

        conversationsData.push({
          id: docSnap.id,
          ...data,
          otherUser,
          otherUserId
        });
        
        // deletedFor kontrolü (Client-side filtering)
        if (conversationsData[conversationsData.length - 1].deletedFor?.[user.uid]) {
             conversationsData.pop();
        }
      }

      // Son mesaja göre sırala
      conversationsData.sort((a, b) => {
        const dateA = a.lastMessageAt?.toDate?.() || new Date(0);
        const dateB = b.lastMessageAt?.toDate?.() || new Date(0);
        return dateB - dateA;
      });

      setConversations(conversationsData);
      setLoading(false);

      // URL'den seçili konuşma varsa onu seç
      const conversationIdParam = searchParams.get('conversationId');
      if (conversationIdParam) {
        const found = conversationsData.find(c => c.id === conversationIdParam);
        if (found) {
          setSelectedConversation(found);
          setShowMobileConversationList(false);
        }
      }
    }, (error) => {
      console.error('Konuşmalar listener hatası:', error);
      toast.error('Konuşmalar yüklenirken hata oluştu');
      setLoading(false);
    });

    return () => unsubscribe();
  };

  const setupMessagesListener = (conversationId) => {
    if (!user) return;

    const messagesRef = collection(db, 'messages');
    const q = query(
      messagesRef,
      where('conversationId', '==', conversationId),
      where('isDeleted', '==', false),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messagesData = [];
      snapshot.forEach((doc) => {
        messagesData.push({
          id: doc.id,
          ...doc.data()
        });
      });

      // Client-side sorting: createdAt'e göre sırala
      messagesData.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
        return dateA - dateB; // En eski mesajdan yeniye
      });

      // Yeni mesaj sesi (Eğer son mesajı ben atmadıysam ve yeni geldiyse)
      // Basit kontrol: Mesaj sayısı arttıysa ve son mesaj benim değilse
      if (messagesData.length > 0) {
          const lastMsg = messagesData[messagesData.length - 1];
          if (lastMsg.senderId !== user.uid && (!messages.length || lastMsg.id !== messages[messages.length - 1]?.id)) {
              // Ses çal (Basit beep)
              try {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                if (AudioContext) {
                    const ctx = new AudioContext();
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.type = 'sine'; // check notification sound
                    osc.frequency.setValueAtTime(800, ctx.currentTime);
                    gain.gain.setValueAtTime(0.1, ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
                    osc.start();
                    osc.stop(ctx.currentTime + 0.1);
                }
              } catch (e) {}
          }
      }

      setMessages(messagesData);
    }, (error) => {
      console.error('Mesajlar listener hatası:', error);
      toast.error('Mesajlar yüklenirken hata oluştu');
    });

    return () => unsubscribe();
  };

  // Eski loadAvailableUsers fonksiyonu kaldırıldı.
  // Arama artık searchUsers servisi üzerinden yapılıyor.

  const handleStartConversation = async (otherUserId) => {
    if (!user) return;

    setLoading(true);
    setShowNewConversationModal(false);
    try {
      // Oyuncu ise 'pending', saha sahibi ise 'accepted' (varsayılan) olabilir. 
      // Ancak prompt "oyuncu davet gönderecek" diyor.
      const initialStatus = 'pending'; // Oyuncular için varsayılan

      const result = await createOrGetConversation(user.uid, otherUserId, initialStatus);
      if (result.success) {
        const conversation = result.data;
        
        // Eğer yeni oluşturulduysa ve pending ise davet gönder
        if (result.isNew && initialStatus === 'pending') {
             await sendChatInvitation(user.uid, otherUserId);
             toast.success('Davet gönderildi');
        } else if (result.isNew) {
             toast.success('Konuşma başlatıldı');
        }

        // Diğer kullanıcının bilgilerini getir
        const userResult = await getUserData(otherUserId);
        if (userResult.success) {
          setOtherUserData(userResult.data);
          setSelectedConversation({
            ...conversation,
            otherUser: userResult.data,
            otherUserId
          });
        } else {
          setSelectedConversation({
            ...conversation,
            otherUserId
          });
        }
        
        setShowMobileConversationList(false);
        setSearchParams({ conversationId: conversation.id });
      } else {
        toast.error(result.error || 'Konuşma oluşturulamadı');
      }
    } catch (error) {
      console.error('Konuşma başlatma hatası:', error);
      toast.error('Konuşma başlatılırken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectConversation = (conversation) => {
    setSelectedConversation(conversation);
    setOtherUserData(conversation.otherUser);
    setShowMobileConversationList(false);
    setSearchParams({ conversationId: conversation.id });
  };

  const handleSendMessage = async () => {
    if ((!messageText.trim() && attachments.length === 0) || !selectedConversation || !user) return;

    setSending(true);
    try {
      const receiverId = selectedConversation.otherUserId;
      const result = await sendMessage(
        selectedConversation.id,
        user.uid,
        receiverId,
        messageText.trim(),
        attachments
      );

      if (result.success) {
        setMessageText('');
        setAttachments([]);
        scrollToBottom();
      } else {
        toast.error(result.error || 'Mesaj gönderilemedi');
      }
    } catch (error) {
      console.error('Mesaj gönderme hatası:', error);
      toast.error('Mesaj gönderilirken hata oluştu');
    } finally {
      setSending(false);
    }
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploadingFile(true);
    try {
      const uploadPromises = files.map(async (file) => {
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} dosyası çok büyük (Max: 10MB)`);
          return null;
        }

        if (file.type.startsWith('image/')) {
          const result = await uploadImage(file, 'messages', user.uid);
          if (result.success) {
            return {
              type: 'image',
              url: result.data.url,
              name: file.name
            };
          }
        } else {
          // Dosya için (şimdilik sadece URL, gerçek upload sistemi eklendiğinde güncellenebilir)
          toast.error('Dosya yükleme şu anda desteklenmiyor');
          return null;
        }
      });

      const uploaded = await Promise.all(uploadPromises);
      const validAttachments = uploaded.filter(a => a !== null);
      setAttachments([...attachments, ...validAttachments]);
    } catch (error) {
      console.error('Dosya yükleme hatası:', error);
      toast.error('Dosya yüklenirken hata oluştu');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleRemoveAttachment = (index) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleAddReaction = async (messageId, emoji) => {
    if (!user) return;

    try {
      const result = await addMessageReaction(messageId, emoji, user.uid);
      if (!result.success) {
        toast.error(result.error || 'Reaksiyon eklenemedi');
      }
    } catch (error) {
      console.error('Reaksiyon ekleme hatası:', error);
      toast.error('Reaksiyon eklenirken hata oluştu');
    }
  };

  const handleRemoveReaction = async (messageId, emoji) => {
    if (!user) return;

    try {
      const result = await removeMessageReaction(messageId, emoji, user.uid);
      if (!result.success) {
        toast.error(result.error || 'Reaksiyon kaldırılamadı');
      }
    } catch (error) {
      console.error('Reaksiyon kaldırma hatası:', error);
      toast.error('Reaksiyon kaldırılırken hata oluştu');
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!user) return;

    if (!window.confirm('Bu mesajı silmek istediğinize emin misiniz?')) return;

    try {
      const result = await deleteMessage(messageId, user.uid);
      if (result.success) {
        toast.success('Mesaj silindi');
      } else {
        toast.error(result.error || 'Mesaj silinemedi');
      }
    } catch (error) {
      console.error('Mesaj silme hatası:', error);
      toast.error('Mesaj silinirken hata oluştu');
    }
  };

  const handleDeleteConversation = async (e, conversationId) => {
    e.stopPropagation(); // Konuşmayı seçmeyi engelle
    if (!user) return;
    
    if (!window.confirm('Bu konuşmayı silmek istediğinize emin misiniz?')) return;

    try {
        const result = await deleteConversation(conversationId, user.uid);
        if (result.success) {
            toast.success('Konuşma silindi');
            if (selectedConversation?.id === conversationId) {
                setSelectedConversation(null);
                setOtherUserData(null);
            }
        } else {
            toast.error('Konuşma silinemedi');
        }
    } catch (error) {
        console.error('Konuşma silme hatası:', error);
    }
  };

  const markAsRead = async (conversationId) => {
    if (!user) return;

    try {
      await markMessagesAsRead(conversationId, user.uid);
    } catch (error) {
      console.error('Okundu işaretleme hatası:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Az önce';
    if (minutes < 60) return `${minutes} dk önce`;
    if (hours < 24) return `${hours} saat önce`;
    if (days < 7) return `${days} gün önce`;
    return date.toLocaleDateString('tr-TR');
  };

  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery) return true;
    const otherUserName = conv.otherUser?.fullName || conv.otherUser?.displayName || '';
    return otherUserName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (loading && conversations.length === 0) {
    return (
      <div className="flex h-screen">
        <OyuncuSidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <OyuncuSidebar />
      
      {/* Konuşma Listesi */}
      <div className={`${showMobileConversationList ? 'flex' : 'hidden'} lg:flex flex-col w-full lg:w-80 border-r border-gray-200 bg-white`}>
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Mesajlar</h2>
            <button
              onClick={() => setShowNewConversationModal(true)}
              className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
              title="Yeni Konuşma Başlat"
            >
              <MessageSquare size={20} />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Konuşma ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8">
              <MessageSquare size={48} className="mb-4 text-gray-300" />
              <p className="text-center">Henüz konuşmanız yok</p>
              <button
                onClick={() => navigate('/oyuncu/oyuncu-bul')}
                className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Yeni Konuşma Başlat
              </button>
            </div>
          ) : (
            filteredConversations.map((conversation) => {
              const unreadCount = conversation.unreadCount?.[user?.uid] || 0;
              const otherUser = conversation.otherUser;
              const displayName = otherUser?.fullName || otherUser?.displayName || 'Kullanıcı';
              const avatar = otherUser?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=10b981&color=fff`;

              return (
                <button
                  key={conversation.id}
                  onClick={() => handleSelectConversation(conversation)}
                  className={`w-full p-4 flex items-center space-x-3 hover:bg-gray-50 border-b border-gray-100 group relative ${
                    selectedConversation?.id === conversation.id ? 'bg-green-50' : ''
                  }`}
                >
                  <div className="relative">
                    <img
                      src={avatar}
                      alt={displayName}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 px-1 flex items-center justify-center">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900 truncate">{displayName}</h3>
                      {conversation.lastMessageAt && (
                        <span className="text-xs text-gray-500 ml-2">
                          {formatTime(conversation.lastMessageAt)}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 truncate">
                      {conversation.lastMessage?.text || 'Henüz mesaj yok'}
                    </p>
                  </div>
                  
                  {/* Delete Button */}
                  <button
                    onClick={(e) => handleDeleteConversation(e, conversation.id)}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full opacity-0 group-hover:opacity-100 transition-all"
                    title="Konuşmayı Sil"
                  >
                    <Trash2 size={18} />
                  </button>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Mesaj Görünümü */}
      <div className={`${showMobileConversationList ? 'hidden' : 'flex'} lg:flex flex-col flex-1`}>
        {selectedConversation ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-gray-200 bg-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowMobileConversationList(true)}
                  className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X size={20} />
                </button>
                {otherUserData && (
                  <>
                    <img
                      src={otherUserData.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUserData.fullName || otherUserData.displayName || 'Kullanıcı')}&background=10b981&color=fff`}
                      alt={otherUserData.fullName || otherUserData.displayName}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {otherUserData.fullName || otherUserData.displayName || 'Kullanıcı'}
                      </h3>
                      {otherUserData.city && (
                        <p className="text-sm text-gray-500">{otherUserData.city}</p>
                      )}
                    </div>
                  </>
                )}
              </div>
              
              {/* Actions */}
               <div className="flex items-center space-x-2">
                   <button
                        onClick={async () => {
                            if (!selectedConversation || sending) return;
                            if (confirm('Maça davet mesajı gönderilsin mi?')) {
                                setSending(true);
                                await sendMessage(selectedConversation.id, user.uid, selectedConversation.otherUserId, '👋 Seni bir maça davet etmek istiyorum! Müsait misin?', []);
                                setSending(false);
                                toast.success('Davet gönderildi');
                            }
                        }}
                        className="p-2 bg-green-100 text-green-700 hover:bg-green-200 rounded-lg text-sm font-medium flex items-center gap-1"
                   >
                       <span className="text-lg">⚽</span>
                       <span className="hidden sm:inline">Maça Davet Et</span>
                   </button>
               </div>
            </div>

            {/* Invitation Status UI */}
            {selectedConversation.status === 'pending' && selectedConversation.initiatorId === user.uid && (
                <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-50 text-center">
                    <div className="bg-white p-6 rounded-xl shadow-sm max-w-md w-full">
                        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Clock className="w-8 h-8 text-yellow-600" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Davet Gönderildi</h3>
                        <p className="text-gray-600 mb-4">
                            {otherUserData?.displayName} davetinizi kabul ettiğinde mesajlaşmaya başlayabilirsiniz.
                        </p>
                    </div>
                </div>
            )}

            {selectedConversation.status === 'pending' && selectedConversation.initiatorId !== user.uid && (
                <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-50 text-center">
                     <div className="bg-white p-6 rounded-xl shadow-sm max-w-md w-full">
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <MessageSquare className="w-8 h-8 text-blue-600" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Mesajlaşma İsteği</h3>
                        <p className="text-gray-600 mb-6">
                            {otherUserData?.displayName} sizinle mesajlaşmak istiyor.
                        </p>
                        <div className="flex gap-3 justify-center">
                            <button 
                                onClick={async () => {
                                    toast.loading('İşleniyor...');
                                    // Notification ID bulmak zor olabilir buradan, ancak respondToChatInvitation notificationId ister.
                                    // Alternatif olarak conversation'ı doğrudan güncellemek daha kolay olabilir (yetki varsa).
                                    // Ama respondToChatInvitation notification'ı da güncelliyor.
                                    // Burada bildirim ID'si elimizde yok. 
                                    // Basitçe conversation'ı update edelim. 
                                    const convRef = doc(db, 'conversations', selectedConversation.id);
                                    await updateDoc(convRef, { status: 'accepted', updatedAt: serverTimestamp() });
                                    toast.dismiss();
                                    toast.success('Davet kabul edildi');
                                }}
                                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                            >
                                Kabul Et
                            </button>
                            <button 
                                onClick={async () => {
                                    if(confirm('Reddetmek istediğinize emin misiniz?')) {
                                        const convRef = doc(db, 'conversations', selectedConversation.id);
                                        await updateDoc(convRef, { status: 'rejected', updatedAt: serverTimestamp() });
                                        toast.success('Davet reddedildi');
                                    }
                                }}
                                className="px-6 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium"
                            >
                                Reddet
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {(selectedConversation.status === 'accepted' || !selectedConversation.status) && (
             <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <p>Henüz mesaj yok. İlk mesajı gönderin!</p>
                </div>
              ) : (
                messages.map((message) => {
                  const isOwn = message.senderId === user?.uid;
                  const senderData = isOwn ? userData : otherUserData;
                  const displayName = senderData?.fullName || senderData?.displayName || 'Kullanıcı';
                  const avatar = senderData?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=10b981&color=fff`;

                  return (
                    <div
                      key={message.id}
                      className={`flex items-start space-x-2 ${isOwn ? 'flex-row-reverse space-x-reverse' : ''}`}
                    >
                      {!isOwn && (
                        <img
                          src={avatar}
                          alt={displayName}
                          className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                        />
                      )}
                      <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[70%]`}>
                        {!isOwn && (
                          <span className="text-xs text-gray-500 mb-1">{displayName}</span>
                        )}
                        <div
                          className={`rounded-lg px-4 py-2 ${
                            isOwn
                              ? 'bg-green-600 text-white'
                              : 'bg-white border border-gray-200 text-gray-900'
                          }`}
                        >
                          {message.text && <p className="whitespace-pre-wrap break-words">{message.text}</p>}
                          {message.attachments && message.attachments.length > 0 && (
                            <div className="mt-2 space-y-2">
                              {message.attachments.map((att, idx) => (
                                <div key={idx}>
                                  {att.type === 'image' ? (
                                    <img
                                      src={att.url}
                                      alt={att.name}
                                      className="max-w-full max-h-64 rounded-lg cursor-pointer"
                                      onClick={() => window.open(att.url, '_blank')}
                                    />
                                  ) : (
                                    <a
                                      href={att.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center space-x-2 p-2 bg-gray-100 rounded hover:bg-gray-200"
                                    >
                                      <File size={16} />
                                      <span className="text-sm">{att.name}</span>
                                    </a>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-xs opacity-70">{formatTime(message.createdAt)}</span>
                            {isOwn && (
                              <span className="ml-2">
                                {message.isRead ? (
                                  <CheckCheck size={14} className="text-blue-400" />
                                ) : (
                                  <Check size={14} />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                        {/* Reactions */}
                        {message.reactions && Object.keys(message.reactions).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {Object.entries(message.reactions).map(([emoji, userIds]) => {
                              const hasReacted = userIds.includes(user?.uid);
                              return (
                                <button
                                  key={emoji}
                                  onClick={() =>
                                    hasReacted
                                      ? handleRemoveReaction(message.id, emoji)
                                      : handleAddReaction(message.id, emoji)
                                  }
                                  className={`px-2 py-1 text-xs rounded-full border ${
                                    hasReacted
                                      ? 'bg-green-100 border-green-300'
                                      : 'bg-white border-gray-200'
                                  }`}
                                >
                                  {emoji} {userIds.length}
                                </button>
                              );
                            })}
                          </div>
                        )}
                        {/* Actions */}
                        <div className="flex items-center space-x-2 mt-1 opacity-0 group-hover:opacity-100">
                          {isOwn && (
                            <button
                              onClick={() => handleDeleteMessage(message.id)}
                              className="text-xs text-red-500 hover:text-red-700"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                          <button
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            className="text-xs text-gray-500 hover:text-gray-700"
                          >
                            <Smile size={12} />
                          </button>
                        </div>
                      </div>
                      {showEmojiPicker && (
                        <div className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg p-2 flex space-x-1">
                          {emojis.map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() => {
                                handleAddReaction(message.id, emoji);
                                setShowEmojiPicker(false);
                              }}
                              className="p-1 hover:bg-gray-100 rounded"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-200 bg-white">
              {attachments.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {attachments.map((att, idx) => (
                    <div key={idx} className="relative">
                      {att.type === 'image' ? (
                        <img
                          src={att.url}
                          alt={att.name}
                          className="w-20 h-20 object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center">
                          <File size={20} />
                        </div>
                      )}
                      <button
                        onClick={() => handleRemoveAttachment(idx)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-end space-x-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingFile}
                  className="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50"
                >
                  {uploadingFile ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-500"></div>
                  ) : (
                    <Paperclip size={20} />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Mesaj yazın... (Enter ile gönder, Shift+Enter ile yeni satır)"
                  rows={1}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={(!messageText.trim() && attachments.length === 0) || sending}
                  className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <Send size={20} />
                  )}
                </button>
              </div>
            </div>
            </>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <MessageSquare size={64} className="mx-auto mb-4 text-gray-300" />
              <p>Bir konuşma seçin veya yeni bir konuşma başlatın</p>
              <button
                onClick={() => setShowNewConversationModal(true)}
                className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Yeni Konuşma Başlat
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Yeni Konuşma Modal */}
      {showNewConversationModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Yeni Konuşma Başlat</h3>
              <button
                onClick={() => {
                  setShowNewConversationModal(false);
                  setUserSearchQuery('');
                }}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Kullanıcı ara..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {loadingUsers ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                </div>
              ) : (
                <>
                  {availableUsers
                    .map((user) => {
                      const displayName = user.fullName || user.displayName || 'Kullanıcı';
                      const avatar = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=10b981&color=fff`;
                      const userTypeLabel = user.userType === 'player' ? 'Oyuncu' : user.userType === 'owner' ? 'Saha Sahibi' : user.userType === 'admin' ? 'Admin' : 'Kullanıcı';

                      return (
                        <button
                          key={user.id}
                          onClick={() => handleStartConversation(user.id)}
                          className="w-full p-3 flex items-center space-x-3 hover:bg-gray-50 rounded-lg transition-colors"
                        >
                          <img
                            src={avatar}
                            alt={displayName}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                          <div className="flex-1 text-left">
                            <h4 className="font-semibold text-gray-900">{displayName}</h4>
                            <div className="flex items-center space-x-2 text-sm text-gray-500">
                              <span>{userTypeLabel}</span>
                              {user.city && <span>• {user.city}</span>}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  {availableUsers.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      {userSearchQuery ? 'Kullanıcı bulunamadı' : 'Kullanıcı bulunamadı'}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Mesajlar;

