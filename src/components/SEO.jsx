import React, { useEffect } from 'react';

const SEO = ({ 
  title, 
  description, 
  keywords, 
  ogTitle, 
  ogDescription, 
  ogImage, 
  url 
}) => {
  useEffect(() => {
    // Update Document Title
    const siteName = 'Saha Merkezi';
    document.title = title ? `${title} | ${siteName}` : siteName;

    // Helper function to update or create meta tags
    const updateMetaTag = (property, value, isProperty = true) => {
      if (!value) return;
      
      const attr = isProperty ? 'property' : 'name';
      let tag = document.querySelector(`meta[${attr}="${property}"]`);
      
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute(attr, property);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', value);
    };

    // Update Meta Tags
    updateMetaTag('description', description || "Saha Merkezi: En yakın halı sahaları bulun, rezervasyon yapın ve oyuncu havuzuna katılarak maçlara dahil olun.", false);
    updateMetaTag('keywords', keywords || "halı saha, oyuncu bul, maç yap, saha kiralama", false);
    
    // Open Graph
    updateMetaTag('og:title', ogTitle || title || siteName);
    updateMetaTag('og:description', ogDescription || description);
    updateMetaTag('og:image', ogImage || 'https://sahamerkezi.com/images/logo.png');
    updateMetaTag('og:url', url || window.location.href);
    
    // Twitter
    updateMetaTag('twitter:title', ogTitle || title || siteName);
    updateMetaTag('twitter:description', ogDescription || description);
    updateMetaTag('twitter:image', ogImage || 'https://sahamerkezi.com/images/logo.png');

  }, [title, description, keywords, ogTitle, ogDescription, ogImage, url]);

  return null;
};

export default SEO;
