import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePremium } from '../hooks/usePremium';
import { useLocation, useNavigate } from 'react-router-dom';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { 
  BarChart3,
  Calendar,
  Building2,
  Users,
  CreditCard,
  Megaphone,
  Trophy,
  FileText,
  Settings,
  Star,
  LogOut,
  Crown,
  Lock,
  MessageSquare,
  MapPin,
  Menu,
  X,
  Home,
  Globe
} from 'lucide-react';

const SahaSahibiSidebar = () => {
  const { userData, user, logout } = useAuth();
  const { isPremium, isLoading: premiumLoading } = usePremium();
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [fieldCount, setFieldCount] = useState(0);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const navigationItems = [
    {
      name: 'Anasayfa',
      href: '/',
      icon: Home,
      current: false
    },
    {
      name: 'Meydan',
      href: '/meydan',
      icon: Globe,
      current: location.pathname === '/meydan'
    },
    {
      name: 'Dashboard',
      href: '/saha-sahibi/dashboard',
      icon: BarChart3,
      current: location.pathname === '/saha-sahibi/dashboard'
    },
    {
      name: 'Rezervasyonlar',
      href: '/saha-sahibi/rezervasyonlar',
      icon: Calendar,
      current: location.pathname === '/saha-sahibi/rezervasyonlar'
    },
    {
      name: 'Saha Yönetimi',
      href: '/saha-sahibi/saha-yonetimi',
      icon: Building2,
      current: location.pathname.includes('/saha-sahibi/saha-yonetimi') || location.pathname.includes('/saha-sahibi/saha-detay')
    },
    {
      name: 'Finansal',
      href: '/saha-sahibi/finansal',
      icon: CreditCard,
      current: location.pathname === '/saha-sahibi/finansal'
    },
    {
      name: 'Marketing',
      href: '/saha-sahibi/marketing',
      icon: Megaphone,
      current: location.pathname === '/saha-sahibi/marketing'
    },
    {
      name: 'Turnuvalar',
      href: '/saha-sahibi/turnuvalar',
      icon: Trophy,
      current: location.pathname === '/saha-sahibi/turnuvalar'
    },
    {
      name: 'Raporlar',
      href: '/saha-sahibi/raporlar',
      icon: FileText,
      current: location.pathname === '/saha-sahibi/raporlar'
    },
    // {
    //   name: 'CRM',
    //   href: '/saha-sahibi/crm',
    //   icon: Users,
    //   current: location.pathname === '/saha-sahibi/crm',
    //   premium: true
    // },
    // {
    //   name: 'Premium',
    //   href: '/saha-sahibi/premium',
    //   icon: Star,
    //   current: location.pathname === '/saha-sahibi/premium'
    // },
    {
      name: 'Mesajlar',
      href: '/saha-sahibi/mesajlar',
      icon: MessageSquare,
      current: location.pathname === '/saha-sahibi/mesajlar',
      badge: unreadMessageCount > 0 ? unreadMessageCount : null
    },
    {
      name: 'Destek',
      href: '/saha-sahibi/destek',
      icon: MessageSquare,
      current: location.pathname === '/saha-sahibi/destek'
    },
    {
      name: 'Ayarlar',
      href: '/saha-sahibi/ayarlar',
      icon: Settings,
      current: location.pathname === '/saha-sahibi/ayarlar'
    }
  ];

  // Saha sayısını getir
  useEffect(() => {
    if (!user) return;

    const sahalarRef = collection(db, 'tesisler');
    const q = query(sahalarRef, where('ownerId', '==', user.uid));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setFieldCount(snapshot.size);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const conversationsRef = collection(db, 'conversations');
    const q = query(
      conversationsRef,
      where('participants', 'array-contains', user.uid)
    );

    let previousCount = 0;
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let totalUnread = 0;
      snapshot.forEach((doc) => {
        const data = doc.data();
        const unread = data.unreadCount?.[user.uid] || 0;
        totalUnread += unread;
      });
      
      if (totalUnread > previousCount && previousCount >= 0 && location.pathname !== '/saha-sahibi/mesajlar') {
        setHasNewMessage(true);
        setTimeout(() => setHasNewMessage(false), 5000);
      }
      
      if (location.pathname === '/saha-sahibi/mesajlar') {
        setHasNewMessage(false);
      }
      
      previousCount = totalUnread;
      setUnreadMessageCount(totalUnread);
    }, (error) => {
      console.error('Okunmamış mesaj sayısı listener hatası:', error);
    });

    return () => unsubscribe();
  }, [user, location.pathname]);

  // Sayfa değiştiğinde mobili kapat
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location]);

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

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="md:hidden fixed top-3 left-3 z-[60] p-2.5 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg text-gray-700 hover:bg-gray-50 transition-all border border-gray-200"
      >
        {isMobileOpen ? <X size={24} className="text-red-500" /> : <Menu size={24} className="text-gray-700" />}
      </button>

      {/* Overlay for mobile */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <div className={`
        flex flex-col bg-white shadow-xl transition-transform duration-300 ease-in-out
        md:w-64 md:h-screen md:relative md:shadow-lg md:translate-x-0
        fixed inset-y-0 left-0 z-50 w-64 h-full
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* User Profile Card */}
        <div className="p-4 border-b border-gray-100 mt-16 md:mt-0">
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
                            <Building2 className="w-8 h-8 text-white" />
                        </div>
                    )}
                </div>
                
                <h2 className="text-white font-bold text-base mb-0.5 max-w-full truncate px-2">
                    {userData?.businessName || userData?.displayName || 'Saha Sahibi'}
                </h2>
                
                <div className="flex flex-wrap items-center justify-center gap-1.5 mt-1">
                    <span className="text-[10px] font-bold bg-white/20 text-white px-2 py-0.5 rounded-full uppercase tracking-wider border border-white/10 shadow-sm">
                      SAHA SAHİBİ
                    </span>
                    {userData?.city && (
                      <div className="flex items-center gap-1 text-green-100 text-xs bg-white/10 px-2 py-0.5 rounded-full backdrop-blur-sm border border-white/5">
                          <MapPin size={10} />
                          <span className="truncate max-w-[80px]">{userData.city}</span>
                      </div>
                    )}
                </div>
                
                <div className="mt-4 w-full flex items-center justify-between border-t border-white/10 pt-3">
                    <div className="flex flex-col items-center flex-1 border-r border-white/10">
                        <span className="text-white font-bold text-sm block">{fieldCount}</span>
                        <span className="text-green-100/80 text-[10px] uppercase tracking-wider">Saha</span>
                    </div>
                    <div className="flex flex-col items-center flex-1">
                        {isPremium ? (
                          <>
                              <Crown className="w-4 h-4 text-yellow-400 fill-yellow-400 mb-0.5" />
                              <span className="text-green-100/80 text-[10px] uppercase tracking-wider">Premium</span>
                          </>
                        ) : (
                            <>
                              <span className="text-white font-bold text-sm block">Free</span>
                              <span className="text-green-100/80 text-[10px] uppercase tracking-wider">Üyelik</span>
                            </>
                        )}
                    </div>
                </div>
              </div>
            </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1 flex-1 overflow-y-auto no-scrollbar">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isPremiumFeature = item.premium && !isPremium;
            
            return (
              <div key={item.name} className="relative">
                <a
                  href={item.href}
                  onClick={(e) => {
                    e.preventDefault();
                    if (isPremiumFeature) {
                      navigate('/saha-sahibi/premium');
                    } else {
                      navigate(item.href);
                    }
                  }}
                  className={`flex items-center justify-between px-3 py-3 rounded-xl transition-all text-sm group ${
                    item.current
                      ? 'bg-green-50 text-green-700 border-l-4 border-green-600 shadow-sm'
                      : isPremiumFeature
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-gray-600 hover:bg-gray-50 hover:pl-4'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    {isPremiumFeature ? (
                      <Lock className="w-5 h-5" />
                    ) : (
                      <Icon className={`w-5 h-5 ${item.current ? 'text-green-600' : 'text-gray-400 group-hover:text-green-500'}`} />
                    )}
                    <span className={`font-medium ${item.current ? 'text-green-800' : ''}`}>{item.name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {item.badge && item.badge > 0 && (
                      <span className={`bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center relative ${
                        item.name === 'Mesajlar' && hasNewMessage && !item.current ? 'animate-pulse' : ''
                      }`}>
                        {item.badge}
                        {item.name === 'Mesajlar' && hasNewMessage && !item.current && (
                          <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-ping"></span>
                        )}
                      </span>
                    )}
                    {item.name === 'Mesajlar' && unreadMessageCount > 0 && !item.badge && (
                      <span className={`w-2.5 h-2.5 bg-red-500 rounded-full ${
                        hasNewMessage && !item.current ? 'animate-pulse' : ''
                      }`}></span>
                    )}
                    {item.premium && (
                      <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-lg ${
                        isPremium
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {isPremium ? 'PRO' : 'PRO'}
                      </span>
                    )}
                  </div>
                </a>
              </div>
            );
          })}
        </nav>

        {/* Çıkış Butonu */}
        <div className="border-t border-gray-200 p-3 bg-gray-50/50 mt-auto">
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-xl text-gray-600 hover:bg-red-50 hover:text-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium border border-transparent hover:border-red-100 hover:shadow-sm"
          >
            {isLoggingOut ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                <span>Çıkış...</span>
              </>
            ) : (
              <>
                <LogOut className="w-4 h-4" />
                <span>Çıkış</span>
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
};

export default SahaSahibiSidebar;
