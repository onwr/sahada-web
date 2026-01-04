import React, { useState, useEffect, useRef } from 'react';
import { X, User, MessageSquare, Send, Calendar, Clock, MapPin, Trash2, Shield } from 'lucide-react';
import { getUsersByIds, sendMatchMessage, kickPlayerFromMatch } from '../services/firestoreService';
import { db } from '../config/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import toast from '../utils/toast';

const MatchDetailModal = ({ isOpen, onClose, match, currentUser }) => {
  const [activeTab, setActiveTab] = useState('players'); // 'players', 'chat'
  const [players, setPlayers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen && match) {
      loadPlayers();
      
      // Sohbet listener - orderBy 'createdAt' bazen indeks hatası verebilir, client-side sıralama daha güvenli
      const messagesRef = collection(db, 'openMatches', match.id, 'messages');
      const q = query(messagesRef);
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const msgs = [];
        snapshot.forEach(doc => {
          msgs.push({ id: doc.id, ...doc.data() });
        });
        
        // Client side sort
        msgs.sort((a, b) => {
            const dateA = a.createdAt?.seconds || 0;
            const dateB = b.createdAt?.seconds || 0;
            if (dateA === 0 && dateB === 0) return 0; // Both pending
            if (dateA === 0) return 1; // Put pending at end
            if (dateB === 0) return -1;
            return dateA - dateB;
        });

        setMessages(msgs);
        scrollToBottom();
      }, (error) => {
         console.error("Chat listener error:", error);
         toast.error("Sohbet yüklenirken hata oluştu");
      });

      return () => unsubscribe();
    }
  }, [isOpen, match]);

  const loadPlayers = async () => {
    if (!match?.players || match.players.length === 0) {
        setPlayers([]);
        return;
    }
    
    setLoadingPlayers(true);
    try {
      const result = await getUsersByIds(match.players);
      if (result.success) {
        setPlayers(result.data);
      }
    } catch (error) {
      console.error('Oyuncular yüklenemedi', error);
      toast.error('Oyuncu listesi yüklenemedi');
    } finally {
      setLoadingPlayers(false);
    }
  };

  const activePlayers = match?.players ? players.filter(p => match.players.includes(p.uid)) : [];

  const handleKickPlayer = async (playerId) => {
    if (!confirm('Bu oyuncuyu maçtan atmak istediğinize emin misiniz?')) return;
    
    try {
      const result = await kickPlayerFromMatch(match.id, playerId);
      if (result.success) {
        toast.success('Oyuncu maçtan çıkarıldı');
        loadPlayers(); // Listeyi yenile
      } else {
        toast.error('Oyuncu atılamadı: ' + result.error);
      }
    } catch (error) {
        toast.error('Bir hata oluştu');
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      const result = await sendMatchMessage(
        match.id, 
        currentUser.uid, 
        currentUser.displayName || currentUser.email, 
        newMessage
      );
      
      if (result.success) {
        setNewMessage('');
        scrollToBottom();
      }
    } catch (error) {
      console.error('Mesaj gönderilemedi', error);
      toast.error('Mesaj gönderilemedi');
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  if (!isOpen || !match) return null;

  const isOrganizer = currentUser?.uid === match.organizerId;
  const isJoined = match.players?.includes(currentUser?.uid);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl h-[600px] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
          <div>
            <h3 className="text-xl font-bold text-gray-900">{match.tesisName || match.location}</h3>
            <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
              <span className="flex items-center gap-1"><Calendar size={14}/> {match.date instanceof Object ? new Date(match.date.seconds * 1000).toLocaleDateString('tr-TR') : match.date}</span>
              <span className="flex items-center gap-1"><Clock size={14}/> {match.timeSlot}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('players')}
            className={`flex-1 py-3 font-medium text-sm transition-colors ${
              activeTab === 'players' ? 'border-b-2 border-green-600 text-green-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <User size={18} />
              Oyuncular ({activePlayers.length}/{match.maxPlayers})
            </div>
          </button>
          {isJoined && (
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex-1 py-3 font-medium text-sm transition-colors ${
                activeTab === 'chat' ? 'border-b-2 border-green-600 text-green-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <MessageSquare size={18} />
                Maç Sohbeti
              </div>
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
          {activeTab === 'players' ? (
            <div className="space-y-3">
              {loadingPlayers ? (
                <div className="text-center py-4">Oyuncular yükleniyor...</div>
              ) : (
                activePlayers.map(player => (
                  <div key={player.uid} className="bg-white p-3 rounded-lg shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 font-bold">
                        {player.photoURL ? (
                          <img src={player.photoURL} alt={player.displayName} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          (player.displayName || player.email || '?')[0].toUpperCase()
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 flex items-center gap-2">
                          {player.displayName || player.email}
                          {player.uid === match.organizerId && (
                            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                              <Shield size={10} /> Organizatör
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500">{player.position || 'Mevki belirtilmemiş'}</p>
                      </div>
                    </div>
                    {isOrganizer && player.uid !== currentUser.uid && (
                      <button 
                        onClick={() => handleKickPlayer(player.uid)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Maçtan At"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                ))
              )}
              {activePlayers.length === 0 && (
                <div className="text-center text-gray-500 py-4">Henüz oyuncu yok</div>
              )}
            </div>
          ) : (
            <div className="flex flex-col h-full">
               <div className="flex-1 space-y-4 mb-4">
                {messages.length === 0 && <div className="text-center text-gray-400 mt-10">Henüz mesaj yok. İlk mesajı sen yaz!</div>}
                {messages.map(msg => {
                    const isMe = msg.senderId === currentUser.uid;
                    return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[75%] rounded-lg p-3 ${isMe ? 'bg-green-600 text-white' : 'bg-white shadow-sm text-gray-800'}`}>
                                {!isMe && <p className="text-xs font-bold mb-1 text-green-700">{msg.senderName}</p>}
                                <p className="text-sm">{msg.text}</p>
                                <p className={`text-[10px] mt-1 text-right ${isMe ? 'text-green-100' : 'text-gray-400'}`}>
                                    {msg.createdAt ? new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                                </p>
                            </div>
                        </div>
                    )
                })}
                <div ref={messagesEndRef} />
               </div>
               
            </div>
          )}
        </div>
        
        {/* Footer for Chat Input */}
        {activeTab === 'chat' && (
             <div className="p-3 bg-white border-t">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Mesaj yaz..."
                        className="flex-1 px-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <button 
                        type="submit"
                        disabled={!newMessage.trim()}
                        className="bg-green-600 text-white p-2 rounded-full hover:bg-green-700 disabled:opacity-50"
                    >
                        <Send size={20} />
                    </button>
                </form>
             </div>
        )}
      </div>
    </div>
  );
};

export default MatchDetailModal;
