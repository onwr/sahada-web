import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  ChevronDown,
  LogOut,
  User,
  Info,
  Check
} from 'lucide-react';
import { collection, query, onSnapshot, where, orderBy, limit, updateDoc, doc, writeBatch, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getPlatformSettings, markNotificationAsRead, markAllNotificationsAsRead } from '../services/firestoreService';


const DashboardHeader = ({ title, showMenuButton, onMenuClick, children, variant = 'default' }) => {
  const { userData, user, logout } = useAuth();
  const navigate = useNavigate();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notificationRef = useRef(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);
  const [logoUrl, setLogoUrl] = useState('/images/logo-svg.png');
  const [loadingLogo, setLoadingLogo] = useState(true);

  const isHero = variant === 'hero';

  // Logo'yu yükle
  useEffect(() => {
    const fetchLogo = async () => {
      try {
        const result = await getPlatformSettings();
        if (result.success && result.data?.logoUrl) {
          setLogoUrl(result.data.logoUrl);
        }
      } catch (error) {
        console.error('Logo yüklenirken hata:', error);
      } finally {
        setLoadingLogo(false);
      }
    };
    fetchLogo();
  }, []);
  
  const headerClasses = isHero 
    ? "bg-transparent absolute top-0 left-0 w-full z-30 px-4 py-3 sm:px-6"
    : "bg-white/80 backdrop-blur-md sticky top-0 z-[1001] border-b border-gray-100 px-4 py-3 sm:px-6";

  const iconClasses = isHero
    ? "text-white hover:bg-white/10"
    : "text-gray-600 hover:bg-gray-100";

  const titleClasses = isHero
    ? "text-white"
    : "text-gray-900";

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setIsNotificationsOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Notifications Listener
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Client-side sorting to avoid Firestore Index requirements
      notifs.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return dateB - dateA;
      });

      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.read).length);
    }, (error) => {
      console.error("Bildirimler yüklenirken hata:", error);
    });

    return () => unsubscribe();
  }, [user]);

  const markAsRead = async (notificationId) => {
    await markNotificationAsRead(notificationId);
  };

  const markAllAsRead = async () => {
    if (!user) return;
    await markAllNotificationsAsRead(user.uid);
  };

  const handleNotificationClick = async (notification) => {
      if (!notification.read) {
          markAsRead(notification.id);
      }
      if (notification.link) {
          navigate(notification.link);
          setIsNotificationsOpen(false);
      }
  };

  const formatNotificationDate = (timestamp) => {
      if (!timestamp) return '';
      // Firestore timestamp to Date
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const cleanMessage = (msg) => {
    if (!msg || typeof msg !== 'string') return '';
    
    // Fix UTF-8 encoding issues (Mojibake)
    return msg
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
  };

  return (
    <header className={headerClasses}>
      <div className="flex items-center justify-between">
        
        {/* Left Section: Logo & Title */}
        <div className="flex items-center gap-3 pl-12 lg:pl-0">
            {/* Logo - Mobilde görünür (Sidebar hamburger butonu için space bırak) */}
            <div 
                className="flex items-center cursor-pointer lg:hidden"
                onClick={() => navigate('/')}
            >
                {loadingLogo ? (
                    <div className={`h-8 w-24 ${isHero ? 'bg-white/20' : 'bg-gray-200'} animate-pulse rounded-md`} />
                ) : (
                    <img 
                        src={logoUrl} 
                        className="h-8 bg-white/50 rounded-2xl px-2 py-0.5 mt-1 w-auto object-contain"
                        alt="Sahada Logo" 
                    />
                )}
            </div>
            
            {/* Title - Desktop'ta görünür */}
            {title && (
                <h1 className={`text-lg font-bold truncate hidden lg:block ${titleClasses}`}>
                    {title}
                </h1>
            )}
        </div>

        {/* Right Section: Notifications & Actions */}
        <div className="flex items-center gap-2 sm:gap-4">
          
          {children}
          
          {/* Notifications */}
          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className={`relative transition-colors focus:outline-none focus:ring-2 focus:ring-green-500/20 ${
                isHero 
                  ? 'flex items-center gap-2 px-3 py-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30' 
                  : `p-2 rounded-full ${iconClasses}`
              }`}
            >
              <Bell className={`${isHero ? 'w-5 h-5' : 'w-6 h-6'}`} />
              {isHero && <span className="text-sm font-medium mr-1 md:hidden">Bildirimler</span>}
              
              {unreadCount > 0 && (
                <span className={`absolute ${isHero ? 'top-1 right-1' : 'top-1.5 right-1.5'} w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full animate-pulse`}></span>
              )}
            </button>

            {isNotificationsOpen && (
              <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 transform origin-top-right transition-all animate-in fade-in zoom-in-95">
                <div className="px-4 py-3 border-b border-gray-50 flex justify-between items-center">
                  <h3 className="font-semibold text-gray-900">Bildirimler</h3>
                  {unreadCount > 0 && (
                      <button 
                        onClick={markAllAsRead}
                        className="text-xs text-green-600 hover:text-green-700 font-medium"
                      >
                        Tümünü Okundu İşaretle
                      </button>
                  )}
                </div>
                
                <div className="max-h-[28rem] overflow-y-auto custom-scrollbar">
                  {notifications.length > 0 ? (
                    notifications.map((notification) => (
                      <div
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className={`px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0 transition-colors ${
                          !notification.read ? 'bg-green-50/30' : ''
                        }`}
                      >
                        <div className="flex gap-3">
                          <div className={`mt-0.5 p-2 rounded-full flex-shrink-0 ${
                              !notification.read ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'
                          }`}>
                              <Info size={16} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm ${!notification.read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                                {cleanMessage(notification.title)}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                                {cleanMessage(notification.message)}
                            </p>
                            <p className="text-[10px] text-gray-400 mt-1.5">
                                {formatNotificationDate(notification.createdAt)}
                            </p>
                          </div>
                          {!notification.read && (
                              <div className="flex flex-col items-center gap-2 self-center">
                                  <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        markAsRead(notification.id);
                                    }}
                                    className="p-1.5 hover:bg-green-100 text-green-600 rounded-full transition-colors tooltip"
                                    title="Okundu olarak işaretle"
                                  >
                                      <Check size={14} strokeWidth={3} />
                                  </button>
                                  <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0 animate-pulse"></div>
                              </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-12 text-center text-gray-500">
                      <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Bell className="w-6 h-6 text-gray-300" />
                      </div>
                      <p className="text-sm">Bildiriminiz bulunmuyor</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Menu */}
          <div className="relative ml-1 sm:ml-2" ref={userMenuRef}>
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className={`flex items-center gap-2 lg:gap-3 pl-2 sm:pl-4 transition-colors focus:outline-none ${isHero ? 'text-white' : 'text-gray-700'}`}
            >
              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 flex items-center justify-center overflow-hidden ${isHero ? 'border-white/30' : 'border-green-100'}`}>
                {userData?.photoURL || user?.photoURL ? (
                  <img src={userData.photoURL || user.photoURL} alt={userData?.fullName || userData?.displayName || 'Oyuncu'} className="w-full h-full object-cover" />
                ) : (
                   <User className={`w-5 h-5 ${isHero ? 'text-white' : 'text-gray-400'}`} />
                )}
              </div>
              <div className="hidden md:block text-left">
                  <p className={`text-sm font-bold leading-none ${isHero ? 'text-white' : 'text-gray-900'}`}>
                      {userData?.fullName || userData?.displayName || 'Oyuncu'}
                  </p>
                  <p className={`text-xs mt-1 ${isHero ? 'text-green-100' : 'text-gray-500'}`}>
                      {(userData?.role === 'owner' || userData?.userType === 'owner') ? 'Saha Sahibi' : (userData?.role === 'admin' || userData?.userType === 'admin') ? 'Yönetici' : 'Oyuncu'}
                  </p>
              </div>
              <ChevronDown className={`w-4 h-4 hidden md:block transition-transform duration-200 ${isHero ? 'text-white' : 'text-gray-400'} ${isUserMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isUserMenuOpen && (
              <div className="absolute right-0 mt-3 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 transform origin-top-right transition-all animate-in fade-in zoom-in-95">
                <div className="px-4 py-3 border-b border-gray-50 md:hidden">
                  <p className="text-sm font-bold text-gray-900">
                      {userData?.fullName || userData?.displayName || 'Kullanıcı'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {userData?.role === 'owner' ? 'Saha Sahibi' : userData?.role === 'admin' ? 'Yönetici' : 'Oyuncu'}
                  </p>
                </div>
                
                <div className="py-1">
                  <button onClick={() => navigate((userData?.role === 'owner' || userData?.userType === 'owner') ? '/saha-sahibi/ayarlar' : '/oyuncu/profil')} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-green-600 flex items-center gap-2">
                    <User size={16} />
                    Profilim & Ayarlar
                  </button>
                </div>
                
                <div className="border-t border-gray-50 mt-1 py-1">
                   <button onClick={() => { logout(); navigate('/'); }} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                    <LogOut size={16} />
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

export default DashboardHeader;
