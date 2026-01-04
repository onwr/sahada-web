import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { getUnreadCount } from '../services/firestoreService';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { 
  BarChart3,
  Calendar,
  MapPin,
  User,
  Users,
  Trophy,
  Bell,
  Settings,
  LogOut,
  FileText,
  Search,
  Plus,
  Menu,
  X,
  MessageSquare,
  Star,
  Medal
} from 'lucide-react';

import toast from '../utils/toast';

const OyuncuSidebar = () => {
  const { userData, user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [hasNewMessage, setHasNewMessage] = useState(false);

  useEffect(() => {
    if (!user) return;

    const conversationsRef = collection(db, 'conversations');
    const q = query(
      conversationsRef,
      where('participants', 'array-contains', user.uid)
    );

    let previousCount = -1; // Initial state
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let totalUnread = 0;
      snapshot.forEach((doc) => {
        const data = doc.data();
        const unread = data.unreadCount?.[user.uid] || 0;
        totalUnread += unread;
      });
      
      // Yeni mesaj geldiğinde bildirim göster (mesajlar sayfasında değilken)
      if (previousCount !== -1 && totalUnread > previousCount && location.pathname !== '/oyuncu/mesajlar') {
        setHasNewMessage(true);
        toast.success('Yeni mesajınız var', { icon: '📩' });
        // 5 saniye sonra animasyonu kaldır
        setTimeout(() => setHasNewMessage(false), 5000);
      }
      
      // Mesajlar sayfasındayken animasyonu kaldır
      if (location.pathname === '/oyuncu/mesajlar') {
        setHasNewMessage(false);
      }
      
      previousCount = totalUnread;
      setUnreadMessageCount(totalUnread);
    }, (error) => {
      console.error('Okunmamış mesaj sayısı listener hatası:', error);
    });

    return () => unsubscribe();
  }, [user, location.pathname]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'notifications'), where('userId', '==', user.uid), where('read', '==', false));
    
    let previousNotifCount = -1;
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const count = snapshot.size;
        
        if (previousNotifCount !== -1 && count > previousNotifCount && location.pathname !== '/oyuncu/bildirimler') {
            toast.success('Yeni bildiriminiz var', { icon: 'bell' });
        }
        
        previousNotifCount = count;
        setUnreadNotificationCount(count);
    }, (error) => { console.error('Bildirim listener hatası:', error); });
    return () => unsubscribe();
  }, [user, location.pathname]);

  const navigationItems = [
    {
      name: 'Dashboard',
      href: '/oyuncu/dashboard',
      icon: BarChart3,
      current: location.pathname === '/oyuncu/dashboard'
    },
    {
      name: 'Rezervasyonlar',
      href: '/oyuncu/rezervasyonlar',
      icon: Calendar,
      current: location.pathname === '/oyuncu/rezervasyonlar'
    },
    {
      name: 'Sahalar',
      href: '/oyuncu/sahalar',
      icon: MapPin,
      current: location.pathname === '/oyuncu/sahalar' || location.pathname.includes('/oyuncu/saha-detay')
    },
    {
      name: 'Oyuncu Bul',
      href: '/oyuncu/oyuncu-bul',
      icon: Search,
      current: location.pathname === '/oyuncu/oyuncu-bul'
    },
    {
      name: 'Maç Oluştur',
      href: '/oyuncu/mac-olustur',
      icon: Plus,
      current: location.pathname === '/oyuncu/mac-olustur'
    },
    {
      name: 'Profil',
      href: '/oyuncu/profil',
      icon: User,
      current: location.pathname === '/oyuncu/profil'
    },
    {
      name: 'Ekip',
      href: '/oyuncu/ekip',
      icon: Users,
      current: location.pathname === '/oyuncu/ekip'
    },
    {
      name: 'Turnuvalar',
      href: '/oyuncu/turnuvalar',
      icon: Trophy,
      current: location.pathname === '/oyuncu/turnuvalar'
    },
    {
      name: 'Rozetlerim',
      href: '/oyuncu/rozetlerim',
      icon: Medal,
      current: location.pathname === '/oyuncu/rozetlerim'
    },
    {
      name: 'Puanlarım',
      href: '/oyuncu/puanlarim',
      icon: Star,
      current: location.pathname === '/oyuncu/puanlarim'
    },
    {
      name: 'Mesajlar',
      href: '/oyuncu/mesajlar',
      icon: MessageSquare,
      current: location.pathname === '/oyuncu/mesajlar',
      badge: unreadMessageCount > 0 ? unreadMessageCount : null
    },
    {
      name: 'Bildirimler',
      href: '/oyuncu/bildirimler',
      icon: Bell,
      current: location.pathname === '/oyuncu/bildirimler',
      badge: unreadNotificationCount > 0 ? unreadNotificationCount : null
    },
    {
      name: 'Faturalar',
      href: '/oyuncu/faturalar',
      icon: FileText,
      current: location.pathname === '/oyuncu/faturalar'
    },
    {
      name: 'Oyuncular',
      href: '/oyuncu/oyuncular',
      icon: Users,
      current: location.pathname === '/oyuncu/oyuncular'
    },
    {
      name: 'Destek',
      href: '/oyuncu/destek',
      icon: MessageSquare,
      current: location.pathname === '/oyuncu/destek'
    }
  ];

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Çıkış hatası:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleNavigation = (href) => {
    navigate(href);
    setIsMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Hamburger Button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg text-gray-600 hover:bg-gray-50 transition-colors"
        aria-label="Menu"
      >
        {isMobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed lg:sticky lg:top-0 w-64 h-screen bg-white shadow-lg flex flex-col z-50 transition-transform duration-300 ease-in-out overflow-hidden ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* User Profile Card */}
        <div className="p-4 border-b border-gray-100">
            <div className="p-4 bg-gradient-to-br from-green-600 to-green-700 rounded-2xl shadow-lg relative overflow-hidden group">
               {/* Background Effects */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-150 duration-700"></div>
              <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/10 rounded-full -ml-8 -mb-8 transition-transform group-hover:scale-150 duration-700"></div>
              
              <div className="relative z-10 flex flex-col items-center text-center">
                 <div className="w-16 h-16 rounded-full border-2 border-white/20 p-1 mb-3 bg-white/10 backdrop-blur-sm shadow-inner group-hover:border-white/40 transition-colors">
                     {userData?.photoURL ? (
                         <img src={userData.photoURL} alt={userData.displayName} className="w-full h-full rounded-full object-cover" />
                     ) : (
                         <div className="w-full h-full bg-green-500 rounded-full flex items-center justify-center">
                             <User className="w-8 h-8 text-white" />
                         </div>
                     )}
                 </div>
                 
                 <h2 className="text-white font-bold text-base mb-0.5 max-w-full truncate px-2">
                     {userData?.fullName || userData?.displayName || 'Oyuncu'}
                 </h2>
                 <div className="flex items-center gap-1.5 text-green-100 text-xs bg-white/10 px-2 py-1 rounded-full backdrop-blur-sm mt-1">
                    <MapPin size={10} />
                    <span className="truncate max-w-[120px]">{userData?.city || 'İstanbul'}</span>
                 </div>
                 
                 <div className="mt-4 w-full flex items-center justify-between border-t border-white/10 pt-3">
                    <div className="flex flex-col items-center flex-1 border-r border-white/10">
                        <span className="text-white font-bold text-sm block">{userData?.totalMatches || 0}</span>
                        <span className="text-green-100/80 text-[10px] uppercase tracking-wider">Maç</span>
                    </div>
                     <div className="flex flex-col items-center flex-1">
                        <span className="text-white font-bold text-sm flex items-center gap-1">
                            {userData?.rating || '5.0'} <Star size={10} className="fill-white" />
                        </span>
                        <span className="text-green-100/80 text-[10px] uppercase tracking-wider">Puan</span>
                    </div>
                 </div>
              </div>
            </div>
            
            <div className="mt-4 flex items-center justify-between px-1">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Menu</span>
                <button 
                  onClick={() => setIsMobileOpen(false)}
                  className="lg:hidden p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={16} />
                </button>
            </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.name}
                onClick={() => handleNavigation(item.href)}
                className={`w-full flex items-center space-x-3 px-3 py-1.5 rounded-lg transition-colors text-left text-sm ${
                  item.current
                    ? 'bg-green-50 text-green-700 border-l-4 border-green-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className={item.current ? 'font-medium' : ''}>{item.name}</span>
                {item.badge && item.badge > 0 && (
                  <span className={`ml-auto bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-5 px-1 flex items-center justify-center relative flex-shrink-0 ${
                    item.name === 'Mesajlar' && hasNewMessage && !item.current ? 'animate-pulse' : ''
                  }`}>
                    {item.badge}
                    {item.name === 'Mesajlar' && hasNewMessage && !item.current && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-ping"></span>
                    )}
                  </span>
                )}
                {item.name === 'Mesajlar' && unreadMessageCount > 0 && !item.badge && (
                  <span className={`ml-auto w-2.5 h-2.5 bg-red-500 rounded-full flex-shrink-0 ${
                    hasNewMessage && !item.current ? 'animate-pulse' : ''
                  }`}></span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Çıkış Butonu */}
        <div className="border-t border-gray-200 p-4">
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full flex items-center space-x-3 px-3 py-1.5 rounded-lg text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {isLoggingOut ? (
              <>
                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                <span>Çıkış yapılıyor...</span>
              </>
            ) : (
              <>
                <LogOut className="w-4 h-4" />
                <span>Çıkış Yap</span>
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
};

export default OyuncuSidebar;

