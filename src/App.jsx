import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import AppRoutes from './routes';
import { getPlatformSettings } from './services/firestoreService';
import AnalyticsLoader from './components/AnalyticsLoader';

import TopBar from './components/TopBar';

import ScrollToTop from './components/ScrollToTop';

const App = () => {
  useEffect(() => {
    const applyPlatformSettings = async () => {
      try {
        const result = await getPlatformSettings();
        if (result.success && result.data) {
          const { faviconUrl, siteTitle } = result.data;
          
          if (faviconUrl) {
            const link = document.querySelector("link[rel*='icon']") || document.createElement('link');
            link.type = 'image/x-icon';
            link.rel = 'shortcut icon';
            link.href = faviconUrl;
            document.getElementsByTagName('head')[0].appendChild(link);
          }

          if (siteTitle) {
            document.title = siteTitle;
          }
        }
      } catch (error) {
        console.error('Platform settings apply error:', error);
      }
    };
    
    applyPlatformSettings();
  }, []);

  return (
    <BrowserRouter>
      <ScrollToTop />
      <AuthProvider>
        <AnalyticsLoader />
        <TopBar />
        <AppRoutes />
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#22c55e',
                secondary: '#fff',
              },
            },
            error: {
              duration: 4000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
