import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { collection, query, onSnapshot, where, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../config/firebase';
import toast from '../utils/toast';
import { 
  BarChart3,
  Building2,
  Users,
  Calendar,
  AlertCircle,
  DollarSign,
  TrendingUp,
  Settings,
  MessageSquare,
  LogOut,
  Shield,
  FileText,
  Search,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  Crown,
  BookOpen,
  Layout,
  Lock as LockIcon,
  Home,
  Globe,
  Bell,
  Check
} from 'lucide-react';

const AdminSidebar = () => {
  const { userData, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedGroups, setExpandedGroups] = useState({
    yonetim: true,
    finansal: true,
    sistem: true
  });
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [platformSettings, setPlatformSettings] = useState({
    logoUrl: '/images/logo.png',
    siteTitle: 'Sahada'
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
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

    // Her sorgu için ayrı listener - nested sorgular kaldırıldı
    let complaintsItems = [];
    let ticketsItems = [];
    let tesisItems = [];

    const updateAllData = () => {
      const all = [
        ...complaintsItems.map(i => ({ ...i, type: 'sikayet', title: `Şikayet: ${i.reason || i.title || 'Detay yok'}`, icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-50', link: '/admin/sikayetler' })),
        ...ticketsItems.map(i => ({ ...i, type: 'destek', title: `Destek: ${i.subject || i.title || 'Yardım talebi'}`, icon: MessageSquare, color: 'text-blue-600', bg: 'bg-blue-50', link: '/admin/destek' })),
        ...tesisItems.map(i => ({ ...i, type: 'tesis', title: `Tesis Onayı: ${i.name || 'İsimsiz Tesis'}`, icon: Building2, color: 'text-green-600', bg: 'bg-green-50', link: '/admin/tesisler' }))
      ];
      // Sort by date if available
      all.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return dateB - dateA;
      });
      setNotifications(all);
      setNotificationCount(all.length);
    };

    const unsubscribeComplaints = onSnapshot(complaintsQuery, (snapshot) => {
      complaintsItems = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(i => !i.dismissedByAdmin);
      updateAllData();
    });

    const unsubscribeTickets = onSnapshot(ticketsQuery, (snapshot) => {
      ticketsItems = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(i => !i.dismissedByAdmin);
      updateAllData();
    });

    const unsubscribeTesis = onSnapshot(tesisQuery, (snapshot) => {
      tesisItems = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(i => !i.dismissedByAdmin);
      updateAllData();
    });

    const settingsRef = doc(db, 'platformSettings', 'main');
    const unsubscribeSettings = onSnapshot(settingsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setPlatformSettings({
          logoUrl: data.logoUrl || '/images/logo.png',
          siteTitle: data.siteTitle || 'Sahada'
        });
      }
    });

    return () => {
      unsubscribeComplaints();
      unsubscribeTickets();
      unsubscribeTesis();
      unsubscribeSettings();
    };
  }, []);

  const navigationGroups = [
    {
      id: 'yonetim',
      name: 'Yönetim',
      items: [
        {
          name: 'Anasayfa',
          href: '/',
          icon: Home,
          badge: null
        },
        {
          name: 'Meydan',
          href: '/meydan',
          icon: Globe,
          badge: null
        },
        {
          name: 'Dashboard',
          href: '/admin/dashboard',
          icon: BarChart3,
          badge: null
        },
        {
          name: 'Tesisler',
          href: '/admin/tesisler',
          icon: Building2,
          badge: null
        },
        {
          name: 'Kullanıcılar',
          href: '/admin/kullanicilar',
          icon: Users,
          badge: null
        },
        {
          name: 'Rezervasyonlar',
          href: '/admin/rezervasyonlar',
          icon: Calendar,
          badge: null
        },
        {
          name: 'Şikayetler',
          href: '/admin/sikayetler',
          icon: AlertCircle,
          badge: null
        },
        {
          name: 'Destek',
          href: '/admin/destek',
          icon: MessageSquare,
          badge: null
        },
        {
          name: 'Blog Yönetimi',
          href: '/admin/blog',
          icon: BookOpen,
          badge: null
        },
        {
          name: 'Sayfa Yönetimi',
          href: '/admin/pages',
          icon: FileText,
          badge: null
        },
        {
          name: 'Giriş Ekranı',
          href: '/admin/auth-pages',
          icon: LockIcon,
          badge: null
        },
        {
          name: 'Hero Yönetimi',
          href: '/admin/hero',
          icon: Layout,
          badge: null
        }
      ]
    },
    {
      id: 'finansal',
      name: 'Finansal',
      items: [
        {
          name: 'Finansal',
          href: '/admin/finansal',
          icon: DollarSign,
          badge: null
        },
        {
          name: 'Premium Yönetimi',
          href: '/admin/premium',
          icon: Crown,
          badge: null
        },
        {
          name: 'Raporlar',
          href: '/admin/raporlar',
          icon: FileText,
          badge: null
        },
        {
          name: 'Turnuvalar',
          href: '/admin/turnuvalar',
          icon: Crown,
          badge: null
        },
        {
          name: 'Marketing',
          href: '/admin/marketing',
          icon: TrendingUp,
          badge: null
        }
      ]
    },
    {
      id: 'sistem',
      name: 'Sistem',
      items: [
        {
          name: 'Ayarlar',
          href: '/admin/ayarlar',
          icon: Settings,
          badge: null
        },
        {
          name: 'Audit Log',
          href: '/admin/audit-log',
          icon: FileText,
          badge: null
        }
      ]
    }
  ];

  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  const filteredGroups = navigationGroups.map(group => ({
    ...group,
    items: group.items.filter(item =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(group => group.items.length > 0);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Çıkış yapma hatası:', error);
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
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white shadow-xl flex flex-col h-screen transform transition-transform duration-300 ease-in-out ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo Section */}
        <div className="bg-gradient-to-br from-green-600 via-green-600 to-green-700 p-6 shadow-lg">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg border border-white/30 p-1">
              <img src={platformSettings.logoUrl} alt={platformSettings.siteTitle} className="w-full h-full object-contain" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg leading-tight">{platformSettings.siteTitle}</h2>
              <p className="text-green-100 text-xs font-medium">Admin Panel</p>
            </div>
          </div>
          <div 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-between bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2.5 border border-white/20 cursor-pointer hover:bg-white/20 transition-all group"
          >
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-white text-sm font-semibold leading-tight">
                  {userData?.displayName || 'Admin'}
                </span>
                <span className="text-[10px] text-green-200 font-bold uppercase tracking-wider">
                  ADMIN
                </span>
              </div>
            </div>
            {notificationCount > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center shadow-lg animate-pulse">
                {notificationCount > 9 ? '9+' : notificationCount}
              </span>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-4 pt-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Menüde ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <div className="space-y-2">
            {filteredGroups.map((group) => {
              const isExpanded = expandedGroups[group.id];
              const hasActiveItem = group.items.some(item => location.pathname === item.href);
              
              return (
                <div key={group.id} className="space-y-1">
                  <button
                    onClick={() => toggleGroup(group.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-200 ${
                      hasActiveItem
                        ? 'bg-green-50 text-green-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <span className="text-xs font-semibold uppercase tracking-wider">
                      {group.name}
                    </span>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                  
                  {isExpanded && (
                    <div className="ml-2 space-y-0.5 border-l-2 border-gray-100 pl-2">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.href;
                        
                        return (
                          <a
                            key={item.name}
                            href={item.href}
                            onClick={(e) => {
                              e.preventDefault();
                              handleNavigation(item.href);
                            }}
                            className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200 group ${
                              isActive
                                ? 'bg-gradient-to-r from-green-50 to-green-50/50 text-green-700 font-semibold shadow-sm border-l-4 border-green-600'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 hover:translate-x-1'
                            }`}
                          >
                            <Icon className={`w-5 h-5 ${isActive ? 'text-green-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
                            <span className={`flex-1 text-[14px] ${isActive ? 'font-bold' : 'font-semibold'}`}>{item.name}</span>
                            {item.badge && (
                              <span className="bg-red-500 text-white text-[10px] font-black rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center shadow-sm">
                                {item.badge}
                              </span>
                            )}
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </nav>

        {/* Logout Button */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full flex items-center justify-center space-x-3 px-4 py-2.5 rounded-lg text-gray-700 bg-white border border-gray-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
          >
            {isLoggingOut ? (
              <>
                <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                <span className="font-medium">Çıkış yapılıyor...</span>
              </>
            ) : (
              <>
                <LogOut className="w-5 h-5" />
                <span className="font-medium">Çıkış Yap</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Admin Notification Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setIsModalOpen(false)} />
          
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center text-green-600">
                  <Bell size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Bekleyen İşlemler</h3>
                  <p className="text-xs text-gray-500">{notificationCount} adet aksiyon gerekli</p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Kapat"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
              {notifications.length > 0 ? (
                notifications.map((n) => (
                  <div 
                    key={`${n.type}-${n.id}`}
                    className="bg-white border border-gray-100 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all flex items-start gap-4 relative group/item"
                  >
                    <div className={`p-2.5 rounded-xl ${n.bg} ${n.color} flex-shrink-0`}>
                      <n.icon size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <p className="text-sm font-bold text-gray-900 leading-tight mb-1 truncate pr-6">
                          {n.title}
                        </p>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              const collName = n.type === 'sikayet' || n.type === 'complaint' ? 'complaints' : n.type === 'destek' || n.type === 'ticket' ? 'tickets' : 'tesisler';
                              const docRef = doc(db, collName, n.id);
                              await updateDoc(docRef, { dismissedByAdmin: true });
                              toast.success('Bildirim okundu olarak işaretlendi');
                            } catch (error) {
                              console.error('Error dismissing admin notification:', error);
                              toast.error('Hata oluştu');
                            }
                          }}
                          className="absolute right-4 top-4 p-1.5 text-gray-300 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all"
                          title="Okundu İşaretle"
                        >
                          <Check size={16} strokeWidth={3} />
                        </button>
                      </div>
                      <p className="text-[11px] text-gray-500 font-medium">
                        {n.createdAt?.toDate ? n.createdAt.toDate().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : 'Az önce'}
                      </p>
                      <button 
                        onClick={() => {
                          setIsModalOpen(false);
                          navigate(n.link);
                        }}
                        className="mt-3 text-xs font-bold text-green-600 hover:text-green-700 flex items-center gap-1 group"
                      >
                        İşleme Git <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 flex flex-col items-center justify-center text-center px-6">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 mb-4">
                    <Shield size={32} />
                  </div>
                  <h4 className="text-base font-bold text-gray-900">Harika!</h4>
                  <p className="text-sm text-gray-500 mt-1">Şu an için bekleyen herhangi bir işlem bulunmuyor.</p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-white border-t border-gray-100 sticky bottom-0">
                <button 
                  onClick={async () => {
                     // Bulk dismiss all current items
                     const batch = writeBatch(db);
                     notifications.forEach(n => {
                         const collName = n.type === 'sikayet' || n.type === 'complaint' ? 'complaints' : n.type === 'destek' || n.type === 'ticket' ? 'tickets' : 'tesisler';
                         batch.update(doc(db, collName, n.id), { dismissedByAdmin: true });
                     });
                     await batch.commit();
                     setIsModalOpen(false);
                     toast.success('Tüm bildirimler okundu olarak işaretlendi');
                  }}
                  className="w-full py-2.5 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-black transition-colors"
                >
                  Tümünü Okundu İşaretle
                </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminSidebar;

