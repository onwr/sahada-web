import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, Search, ChevronDown, LogOut, Settings, User, 
  AlertCircle, MessageSquare, Building2, Check, ExternalLink 
} from 'lucide-react';
import { collection, query, onSnapshot, where, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../config/firebase';
import toast from '../utils/toast';

const AdminHeader = ({ title, description, children, showSearch, onSearch, searchQuery }) => {
  const { userData, logout } = useAuth();
  const navigate = useNavigate();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notificationRef = useRef(null);
  const profileRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setIsNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Notification listeners
  useEffect(() => {
    // Queries
    const complaintsQuery = query(
        collection(db, 'complaints'), 
        where('status', '==', 'pending')
    );
    const ticketsQuery = query(
        collection(db, 'tickets'), 
        where('status', '==', 'open')
    );
    const tesisQuery = query(
        collection(db, 'tesisler'), 
        where('status', '==', 'pending')
    );

    // Combine data
    const updateNotifications = (complaints = [], tickets = [], tesis = []) => {
        const all = [
            ...complaints.map(c => ({ ...c, type: 'complaint', date: c.createdAt?.toDate?.() || new Date() })),
            ...tickets.map(t => ({ ...t, type: 'ticket', date: t.createdAt?.toDate?.() || new Date() })),
            ...tesis.map(t => ({ ...t, type: 'tesis', date: t.createdAt?.toDate?.() || new Date() }))
        ]
        .filter(i => !i.dismissedByAdmin) // Sadece admin tarafından kapatılmamış olanları göster
        .sort((a, b) => b.date - a.date);
        
        setNotifications(all);
        setUnreadCount(all.length);
    };

    let complaintsData = [];
    let ticketsData = [];
    let tesisData = [];

    const unsubC = onSnapshot(complaintsQuery, (snap) => {
        complaintsData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        updateNotifications(complaintsData, ticketsData, tesisData);
    });

    const unsubT = onSnapshot(ticketsQuery, (snap) => {
        ticketsData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        updateNotifications(complaintsData, ticketsData, tesisData);
    });

    const unsubTe = onSnapshot(tesisQuery, (snap) => {
        tesisData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        updateNotifications(complaintsData, ticketsData, tesisData);
    });

    return () => {
        unsubC();
        unsubT();
        unsubTe();
    };
  }, []);

  const markAsRead = async (item) => {
    try {
        const collName = item.type === 'complaint' ? 'complaints' : item.type === 'ticket' ? 'tickets' : 'tesisler';
        const docRef = doc(db, collName, item.id);
        await updateDoc(docRef, { dismissedByAdmin: true });
        toast.success('Bildirim okundu olarak işaretlendi');
    } catch (error) {
        console.error('Error marking admin notification as read:', error);
        toast.error('Bildirim güncellenirken hata oluştu');
    }
  };

  const markAllAsRead = async () => {
    if (notifications.length === 0) return;
    try {
        const batch = writeBatch(db);
        notifications.forEach(item => {
            const collName = item.type === 'complaint' ? 'complaints' : item.type === 'ticket' ? 'tickets' : 'tesisler';
            batch.update(doc(db, collName, item.id), { dismissedByAdmin: true });
        });
        await batch.commit();
        setIsNotificationsOpen(false);
        toast.success('Tüm bildirimler okundu olarak işaretlendi');
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        toast.error('İşlem sırasında hata oluştu');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const getNotificationIcon = (type) => {
      switch(type) {
          case 'complaint': return <AlertCircle className="w-5 h-5 text-red-500" />;
          case 'ticket': return <MessageSquare className="w-5 h-5 text-blue-500" />;
          case 'tesis': return <Building2 className="w-5 h-5 text-yellow-500" />;
          default: return <Bell className="w-5 h-5 text-gray-500" />;
      }
  };

  const getNotificationLink = (type) => {
      switch(type) {
          case 'complaint': return '/admin/sikayetler';
          case 'ticket': return '/admin/destek';
          case 'tesis': return '/admin/tesisler';
          default: return '/admin/dashboard';
      }
  };

  const getNotificationText = (item) => {
      const cleanText = (t) => {
        if (!t || typeof t !== 'string') return '';
        return t
          .replace(/Ã¶/g, 'ö').replace(/Ã§/g, 'ç').replace(/ÅŸ/g, 'ş').replace(/ÄŸ/g, 'ğ')
          .replace(/Ã¼/g, 'ü').replace(/Ä±/g, 'ı').replace(/Ä°/g, 'İ').replace(/Ã–/g, 'Ö')
          .replace(/Ã‡/g, 'Ç').replace(/Åž/g, 'Ş').replace(/Äž/g, 'Ğ').replace(/Ãœ/g, 'Ü');
      };

      switch(item.type) {
          case 'complaint': return `Yeni şikayet: ${cleanText(item.title) || 'Şikayet'}`;
          case 'ticket': return `Yeni ticket: ${item.title || 'Ticket'}`;
          case 'tesis': return `Onay bekleyen tesis: ${item.name || 'Tesis'}`;
          default: return 'Yeni bildirim';
      }
  };

  return (
    <header className="bg-white shadow-sm border-b px-6 py-4 sticky top-0 z-[1001]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">{title}</h1>
          {description && <p className="text-gray-500 text-sm mt-0.5">{description}</p>}
        </div>

        <div className="flex items-center space-x-4">
          {/* Search Bar if needed */}
          {showSearch && (
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Ara..."
                  value={searchQuery || ''}
                  onChange={onSearch}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 w-64"
                />
              </div>
          )}

          {children}

          {/* Notifications */}
          <div className="relative" ref={notificationRef}>
            <button 
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Bildirimler"
            >
              <Bell className="w-6 h-6" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></span>
              )}
            </button>

            {isNotificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-50 animate-in fade-in zoom-in-95 duration-200">
                <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-xl">
                  <h3 className="font-semibold text-gray-900">Bildirimler</h3>
                  {unreadCount > 0 && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">{unreadCount} Yeni</span>}
                </div>
                <div className="max-h-96 overflow-y-auto custom-scrollbar">
                    {notifications.length > 0 ? (
                        <>
                            {notifications.map((item, index) => (
                                <div 
                                    key={item.id + index}
                                    className="px-4 py-3 hover:bg-gray-50 border-b border-gray-100 transition-colors group relative"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-gray-50 border border-gray-100">
                                            {getNotificationIcon(item.type)}
                                        </div>
                                        <div className="flex-1 min-w-0 pr-8">
                                            <p className="text-sm text-gray-800 font-medium line-clamp-2">{getNotificationText(item)}</p>
                                            <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider font-bold">
                                                {item.date?.toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                            <div className="flex items-center gap-3 mt-2">
                                                <button 
                                                    onClick={() => {
                                                        navigate(getNotificationLink(item.type));
                                                        setIsNotificationsOpen(false);
                                                    }}
                                                    className="text-[11px] font-bold text-green-600 hover:text-green-700 flex items-center gap-1"
                                                >
                                                    <ExternalLink size={12} /> Detaya Git
                                                </button>
                                            </div>
                                        </div>
                                        
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                markAsRead(item);
                                            }}
                                            className="absolute right-4 top-4 p-1.5 text-gray-300 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all"
                                            title="Okundu İşaretle"
                                        >
                                            <Check size={16} strokeWidth={3} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            <div className="p-2 border-t border-gray-100 bg-white sticky bottom-0">
                                <button 
                                    onClick={markAllAsRead}
                                    className="w-full py-2 text-xs font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all uppercase tracking-widest"
                                >
                                    Tümünü Okundu İşaretle
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="px-4 py-8 text-center text-gray-500 flex flex-col items-center">
                            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                                <Bell className="w-6 h-6 text-gray-300" />
                            </div>
                            <p className="text-sm font-medium">Bütün işler tamam!</p>
                            <p className="text-xs text-gray-400 mt-1">Bekleyen herhangi bir işlem yok.</p>
                        </div>
                    )}
                </div>
              </div>
            )}
          </div>

          {/* Profile Dropdown */}
          <div className="relative" ref={profileRef}>
            <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-2 hover:bg-gray-50 p-1.5 rounded-lg transition-colors border border-transparent hover:border-gray-200/50"
            >
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center overflow-hidden border border-green-200">
                    {userData?.photoURL ? (
                        <img src={userData.photoURL} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                        <User className="w-4 h-4 text-green-600" />
                    )}
                </div>
                <span className="hidden md:block text-sm font-medium text-gray-700">{userData?.displayName || 'Admin'}</span>
                <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
            </button>

            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-50 animate-in fade-in zoom-in-95 duration-200">
                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 rounded-t-xl">
                  <p className="text-sm font-medium text-gray-900">{userData?.displayName || 'Admin'}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{userData?.email}</p>
                </div>
                
                <div className="py-1">
                    <button 
                        onClick={() => navigate('/admin/ayarlar')}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                        <Settings className="w-4 h-4" />
                        Ayarlar
                    </button>
                    <button 
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                        <LogOut className="w-4 h-4" />
                        Çıkış Yap
                    </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
