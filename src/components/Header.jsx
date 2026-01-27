import React, { useState, useEffect } from 'react';
import { 
  Menu, X, User, LogOut, Settings, ChevronDown, MapPin, LayoutDashboard, Bell, Info, Check 
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { getPlatformSettings, markNotificationAsRead, markAllNotificationsAsRead } from '../services/firestoreService';
import { collection, query, where, onSnapshot, limit, orderBy, updateDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from '../config/firebase';

const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const { user, userData, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [logoUrl, setLogoUrl] = useState(localStorage.getItem('platform_logo') || '/images/logo.png');
  const [siteTitle, setSiteTitle] = useState(localStorage.getItem('platform_title') || 'Sahada');
  const [loadingLogo, setLoadingLogo] = useState(false); // Default to false to show cached logo
  const [dynamicMenu, setDynamicMenu] = useState(() => {
    try {
      const savedMenu = localStorage.getItem('platform_menu');
      return savedMenu ? JSON.parse(savedMenu) : [];
    } catch (e) {
      return [];
    }
  });
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const notificationRef = React.useRef(null);

  // Listen for notifications
  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      setNotifications([]);
      return;
    }

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Client-side sorting
      notifs.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return dateB - dateA;
      });

      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.read).length);
    }, (error) => {
      console.error('Notification listener error in Header:', error);
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

  const cleanMessage = (msg) => {
    if (!msg || typeof msg !== 'string') return '';
    return msg
      .replace(/Ã¶/g, 'ö').replace(/Ã§/g, 'ç').replace(/ÅŸ/g, 'ş').replace(/ÄŸ/g, 'ğ')
      .replace(/Ã¼/g, 'ü').replace(/Ä±/g, 'ı').replace(/Ä°/g, 'İ').replace(/Ã–/g, 'Ö')
      .replace(/Ã‡/g, 'Ç').replace(/Åž/g, 'Ş').replace(/Äž/g, 'Ğ').replace(/Ãœ/g, 'Ü');
  };

  const formatNotificationDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  useEffect(() => {
    const fetchSettings = async () => {
       try {
         const result = await getPlatformSettings();
          if (result.success) {
            if (result.data.logoUrl) {
                setLogoUrl(result.data.logoUrl);
                localStorage.setItem('platform_logo', result.data.logoUrl);
            }
            if (result.data.siteTitle) {
                setSiteTitle(result.data.siteTitle);
                localStorage.setItem('platform_title', result.data.siteTitle);
            }
            if (result.data.menus?.header) {
                setDynamicMenu(result.data.menus.header);
                localStorage.setItem('platform_menu', JSON.stringify(result.data.menus.header));
            }
          }
       } catch (error) {
         console.error('Header logo fetch error:', error);
       } finally {
         setLoadingLogo(false);
       }
    };
    fetchSettings();
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
      setIsUserDropdownOpen(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const getNavigationItems = () => {
    // Panel sayfalarında header'da navigasyon gösterme (sidebar zaten var)
    const isPanelPage = location.pathname.startsWith('/oyuncu/dashboard') || 
                        location.pathname.startsWith('/saha-sahibi/dashboard') || 
                        location.pathname.startsWith('/admin/dashboard');
    
    if (isPanelPage) {
      return []; // Panel sayfalarında navigasyon gösterme
    }

    if (!user) {
      return [
        { name: 'Yakındaki Sahalar', href: '/yakin-sahalar', icon: 'MapPin' },
        { name: 'Oyuncu Bul', href: '/oyuncu-bul', icon: 'Search' },
        { name: 'Meydan', href: '/meydan', icon: 'Users' },
        { name: 'Blog', href: '/blog', icon: 'BookOpen' },
      ];
    }

    // Giriş yapmış kullanıcılar için public sayfalarda gösterilecek linkler
    return [
      { name: 'Yakındaki Sahalar', href: '/yakin-sahalar', icon: 'MapPin' },
      { name: 'Oyuncu Bul', href: '/oyuncu-bul', icon: 'Search' },
      { name: 'Meydan', href: '/meydan', icon: 'Users' },
      { name: 'Blog', href: '/blog', icon: 'BookOpen' },
    ];
  };

  // Helper to get icon component
  const getIcon = (iconName) => {
    // If it's already a component (default static list)
    if (typeof iconName !== 'string') return iconName;
    
    // If it's a string, look it up
    return LucideIcons[iconName] || LucideIcons.Circle;
  };

  const navigationItems = dynamicMenu.length > 0 
    ? dynamicMenu.map(item => ({ name: item.label, href: item.href, icon: item.icon }))
    : getNavigationItems();

  const getSettingsUrl = () => {
    if (userData?.userType === 'admin') return '/admin/ayarlar';
    if (userData?.userType === 'owner') return '/saha-sahibi/ayarlar';
    if (userData?.userType === 'player') return '/oyuncu/profil';
    return '/';
  };

  const getDashboardUrl = () => {
    if (userData?.userType === 'admin') return '/admin/dashboard';
    if (userData?.userType === 'owner') return '/saha-sahibi/dashboard';
    if (userData?.userType === 'player') return '/oyuncu/dashboard';
    return '/';
  };

  const isActive = (href) => {
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isUserDropdownOpen && !event.target.closest('.user-dropdown')) {
        setIsUserDropdownOpen(false);
      }
      if (isNotificationsOpen && notificationRef.current && !notificationRef.current.contains(event.target)) {
        setIsNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isUserDropdownOpen]);

  return (
    <header className="sticky top-0 z-[1001] bg-white border-b border-gray-200 shadow-sm">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center">
          {/* Left: Logo */}
          <div className="flex-1 flex items-center justify-start min-w-0">
            <div 
              className="flex items-center cursor-pointer"
              onClick={() => navigate('/')}
            >
              {loadingLogo ? (
                <div className="h-10 sm:h-12 w-24 sm:w-32 bg-gray-100 animate-pulse rounded-full" />
              ) : (
                <img 
                  src={logoUrl} 
                  className="h-9 sm:h-11 w-auto max-w-[140px] sm:max-w-[200px] object-contain transition-opacity duration-300" 
                  alt={`${siteTitle} Logo`} 
                  onError={(e) => {
                    e.target.src = '/images/logo.png';
                  }}
                />
              )}
            </div>
          </div>

          {/* Center: Navigation (Desktop Only) */}
          <div className="hidden md:flex flex-initial items-center justify-center">
            <nav className="flex items-center space-x-1 lg:space-x-2">
              {navigationItems.map((item) => {
                const Icon = getIcon(item.icon);
                return (
                  <button
                    key={item.name}
                    onClick={() => {
                      navigate(item.href);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-all duration-200 ${
                      isActive(item.href)
                        ? 'bg-green-600 text-white shadow-lg shadow-green-100'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <Icon size={16} />
                    <span>{item.name}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Right: Auth & Mobile Toggle */}
          <div className="flex-1 flex items-center justify-end gap-2 sm:gap-3">
            {user ? (
              <div className="flex items-center gap-2 sm:gap-4">
                {/* Notification Bell */}
                <div className="relative" ref={notificationRef}>
                  <button
                    onClick={() => {
                      setIsNotificationsOpen(!isNotificationsOpen);
                      setIsUserDropdownOpen(false);
                    }}
                    className="relative p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-600 hover:text-green-600 focus:outline-none"
                  >
                    <Bell size={20} />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 min-w-[16px] h-[16px] flex items-center justify-center bg-red-500 text-white text-[9px] font-bold rounded-full border-2 border-white animate-pulse">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Notifications Dropdown */}
                  {isNotificationsOpen && (
                    <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-50 transform origin-top-right animate-scaleIn">
                      <div className="px-4 py-3 border-b border-gray-50 flex justify-between items-center">
                        <h3 className="font-bold text-gray-900 text-sm">Bildirimler</h3>
                        {unreadCount > 0 && (
                          <button onClick={markAllAsRead} className="text-[10px] text-green-600 hover:text-green-700 font-bold uppercase tracking-wider">
                            Tümünü Oku
                          </button>
                        )}
                      </div>
                      <div className="max-h-80 overflow-y-auto custom-scrollbar">
                        {notifications.length > 0 ? (
                          notifications.map((n) => (
                            <div
                              key={n.id}
                              onClick={() => {
                                markAsRead(n.id);
                                if (n.link) navigate(n.link);
                                setIsNotificationsOpen(false);
                              }}
                              className={`px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0 transition-colors ${!n.read ? 'bg-green-50/20' : ''}`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${!n.read ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                                  <Info size={20} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-xs ${!n.read ? 'font-bold text-gray-900' : 'text-gray-600'}`}>
                                    {cleanMessage(n.title)}
                                  </p>
                                  <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">
                                    {cleanMessage(n.message)}
                                  </p>
                                  <p className="text-[9px] text-gray-400 mt-1 uppercase font-medium">
                                    {formatNotificationDate(n.createdAt)}
                                  </p>
                                </div>
                                {!n.read && (
                                  <div className="flex flex-col items-center gap-2 self-center">
                                      <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            markAsRead(n.id);
                                        }}
                                        className="p-1.5 hover:bg-green-100 text-green-600 rounded-full transition-colors"
                                      >
                                          <Check size={14} strokeWidth={3} />
                                      </button>
                                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full flex-shrink-0 animate-pulse" />
                                  </div>
                                )}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="px-4 py-10 text-center text-gray-400">
                            <Bell size={24} className="mx-auto mb-2 opacity-20" />
                            <p className="text-xs">Bildirim bulunmuyor</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* User Dropdown */}
                <div className="relative user-dropdown">
                  <button
                    onClick={() => {
                      setIsUserDropdownOpen(!isUserDropdownOpen);
                      setIsNotificationsOpen(false);
                    }}
                    className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-full border border-gray-100 hover:border-green-200 bg-gray-50/50 hover:bg-white transition-all shadow-sm"
                  >
                    <span className="hidden lg:inline-block text-xs font-bold text-gray-700 ml-2">
                      {userData?.fullName || userData?.displayName || 'Kullanıcı'}
                    </span>
                    <div className="relative">
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center overflow-hidden border-2 border-white shadow-sm">
                        {userData?.photoURL || user?.photoURL || userData?.profilePhoto?.url ? (
                          <img 
                            src={userData?.photoURL || user?.photoURL || userData?.profilePhoto?.url} 
                            alt="Profil" 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User size={18} className="text-green-600" />
                        )}
                      </div>
                    </div>
                    <ChevronDown 
                      size={14} 
                      className={`text-gray-400 mr-1 transition-transform duration-200 hidden sm:block ${isUserDropdownOpen ? 'rotate-180' : ''}`} 
                    />
                  </button>



                {/* Dropdown Menu */}
                {isUserDropdownOpen && (
                  <div className="absolute right-0 top-full mt-3 w-60 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-50 transform origin-top-right animate-scaleIn">
                    <div className="px-5 py-4 border-b border-gray-50">
                      <p className="text-sm font-black text-gray-900 truncate">
                        {userData?.fullName || userData?.displayName || 'Kullanıcı'}
                      </p>
                      <p className="text-[10px] font-bold text-gray-400 mt-0.5 truncate uppercase tracking-wider">{userData?.email}</p>
                    </div>
                    <div className="p-2 space-y-1">
                      <button
                        onClick={() => {
                          navigate(getDashboardUrl());
                          setIsUserDropdownOpen(false);
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm font-bold text-gray-600 hover:bg-gray-50 hover:text-green-600 rounded-xl transition-all flex items-center gap-3"
                      >
                        <LayoutDashboard size={18} />
                        Kontrol Paneli
                      </button>
                      <button
                        onClick={() => {
                          navigate(getSettingsUrl());
                          setIsUserDropdownOpen(false);
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm font-bold text-gray-600 hover:bg-gray-50 hover:text-green-600 rounded-xl transition-all flex items-center gap-3"
                      >
                        <Settings size={18} />
                        Hesap Ayarları
                      </button>
                      <button
                        onClick={handleLogout}
                        className="w-full px-4 py-2.5 text-left text-sm font-bold text-red-500 hover:bg-red-50 rounded-xl transition-all flex items-center gap-3 mt-2 border-t border-gray-50 pt-3"
                      >
                        <LogOut size={18} />
                        Güvenli Çıkış
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            ) : (
              <button
                onClick={() => navigate('/login', { state: { from: location.pathname } })}
                className="inline-flex items-center px-6 py-2.5 bg-green-600 text-white text-sm font-black rounded-xl hover:bg-green-700 transition-all shadow-lg shadow-green-100 hover:shadow-green-200 transform hover:-translate-y-0.5 active:scale-95"
              >
                Giriş Yap
              </button>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-gray-900 bg-gray-50 hover:bg-gray-100 transition-all border border-gray-200 relative"
            >
              {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
              {unreadCount > 0 && !isMobileMenuOpen && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200">
            <nav className="flex flex-col space-y-1">
              {navigationItems.map((item) => {
                const Icon = getIcon(item.icon);
                return (
                  <button
                    key={item.name}
                    onClick={() => {
                      navigate(item.href);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      isActive(item.href)
                        ? 'bg-green-50 text-green-600'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon size={20} />
                    <span>{item.name}</span>
                  </button>
                );
              })}
              
              {!user && (
                <>
                  <div className="border-t border-gray-200 my-2"></div>

                  <button
                    onClick={() => {
                      navigate('/login', { state: { from: location.pathname } });
                      setIsMobileMenuOpen(false);
                    }}
                    className="flex items-center justify-center gap-3 px-4 py-3 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700"
                  >
                    Giriş Yap
                  </button>
                </>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
