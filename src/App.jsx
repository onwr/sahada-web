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
          const { faviconUrl, logoUrl, siteTitle, siteDescription } = result.data;
          const dynamicFavicon = faviconUrl || logoUrl;
          
          if (dynamicFavicon) {
            const link = document.querySelector("link[rel*='icon']") || document.createElement('link');
            link.rel = 'shortcut icon';
            link.href = dynamicFavicon;
            document.getElementsByTagName('head')[0].appendChild(link);

            // Update Open Graph and Twitter images
            const ogImage = document.querySelector('meta[property="og:image"]');
            if (ogImage) ogImage.content = dynamicFavicon;
            const twitterImage = document.querySelector('meta[property="twitter:image"]');
            if (twitterImage) twitterImage.content = dynamicFavicon;
          }

          if (siteTitle) {
            document.title = siteTitle;
            const ogTitle = document.querySelector('meta[property="og:title"]');
            if (ogTitle) ogTitle.content = siteTitle;
            const twitterTitle = document.querySelector('meta[property="twitter:title"]');
            if (twitterTitle) twitterTitle.content = siteTitle;
          }

          if (siteDescription) {
            const descriptionMeta = document.querySelector('meta[name="description"]');
            if (descriptionMeta) descriptionMeta.content = siteDescription;
            const ogDesc = document.querySelector('meta[property="og:description"]');
            if (ogDesc) ogDesc.content = siteDescription;
            const twitterDesc = document.querySelector('meta[property="twitter:description"]');
            if (twitterDesc) twitterDesc.content = siteDescription;
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
