import React, { useState, useEffect } from 'react';
import { 
  Menu, X, User, LogOut, Settings, ChevronDown, MapPin,
  LayoutDashboard, Building2, Search, BookOpen, Shield, Users
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const { user, userData, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

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
        { name: 'Yakındaki Sahalar', href: '/yakin-sahalar', icon: MapPin },
        { name: 'Oyuncu Bul', href: '/oyuncu-bul', icon: Search },
        { name: 'Meydan', href: '/community', icon: Users },
        { name: 'Blog', href: '/blog', icon: BookOpen },
      ];
    }

    // Giriş yapmış kullanıcılar için public sayfalarda gösterilecek linkler
    return [
      { name: 'Yakındaki Sahalar', href: '/yakin-sahalar', icon: MapPin },
      { name: 'Oyuncu Bul', href: '/oyuncu-bul', icon: Search },
      { name: 'Meydan', href: '/community', icon: Users },
      { name: 'Blog', href: '/blog', icon: BookOpen },
    ];
  };

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
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isUserDropdownOpen]);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div 
            className="flex items-center cursor-pointer"
            onClick={() => navigate('/')}
          >
            <img 
              src="/images/logo.png" 
              className="h-12 sm:h-14 w-auto" 
              alt="Sahada Logo" 
            />
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {getNavigationItems().map((item) => (
              <button
                key={item.name}
                onClick={() => {
                  navigate(item.href);
                  setIsMobileMenuOpen(false);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(item.href)
                    ? 'bg-green-50 text-green-600'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <item.icon size={18} />
                <span>{item.name}</span>
              </button>
            ))}
          </nav>

          {/* Right Side - Auth Buttons or User Menu */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="relative user-dropdown">
                <button
                  onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center overflow-hidden">
                    {userData?.photoURL || userData?.profilePhoto?.url ? (
                      <img 
                        src={userData.photoURL || userData.profilePhoto.url} 
                        alt="Profil" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User size={18} className="text-green-600" />
                    )}
                  </div>
                  <span className="hidden sm:inline-block text-sm font-medium text-gray-700">
                    {userData?.fullName || userData?.displayName || 'Kullanıcı'}
                  </span>
                  <ChevronDown 
                    size={16} 
                    className={`text-gray-500 transition-transform ${isUserDropdownOpen ? 'rotate-180' : ''}`} 
                  />
                </button>

                {/* Dropdown Menu */}
                {isUserDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">
                        {userData?.fullName || userData?.displayName || 'Kullanıcı'}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{userData?.email}</p>
                    </div>
                    <button
                      onClick={() => {
                        navigate(getDashboardUrl());
                        setIsUserDropdownOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <LayoutDashboard size={16} />
                      Panel
                    </button>
                    <button
                      onClick={() => {
                        navigate(getSettingsUrl());
                        setIsUserDropdownOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Settings size={16} />
                      Ayarlar
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <LogOut size={16} />
                      Çıkış Yap
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
        
                <button
                  onClick={() => navigate('/login')}
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                >
                  Giriş Yap
                </button>
              </>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200">
            <nav className="flex flex-col space-y-1">
              {getNavigationItems().map((item) => (
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
                  <item.icon size={20} />
                  <span>{item.name}</span>
                </button>
              ))}
              
              {!user && (
                <>
                  <div className="border-t border-gray-200 my-2"></div>

                  <button
                    onClick={() => {
                      navigate('/login');
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
