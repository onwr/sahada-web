import React, { useEffect } from 'react';
import { getSystemSettings } from '../services/firestoreService';

const AnalyticsLoader = () => {
  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const result = await getSystemSettings('marketing');
        
        // If no settings or failure, stop
        if (!result.success || !result.data) return;
        
        const settings = result.data;

        // --- SEO Settings ---
        if (settings.seo) {
            if (settings.seo.title) document.title = settings.seo.title;
            
            if (settings.seo.description) {
                let metaDesc = document.querySelector('meta[name="description"]');
                if (!metaDesc) {
                    metaDesc = document.createElement('meta');
                    metaDesc.name = 'description';
                    document.head.appendChild(metaDesc);
                }
                metaDesc.content = settings.seo.description;
            }

            if (settings.seo.keywords) {
                let metaKw = document.querySelector('meta[name="keywords"]');
                if (!metaKw) {
                    metaKw = document.createElement('meta');
                    metaKw.name = 'keywords';
                    document.head.appendChild(metaKw);
                }
                metaKw.content = settings.seo.keywords;
            }
        }

        // --- Google Search Console ---
        if (settings.searchConsole?.verificationCode) {
             const verificationContent = settings.searchConsole.verificationCode.includes('content="') 
                ? settings.searchConsole.verificationCode.match(/content="([^"]*)"/)?.[1] 
                : settings.searchConsole.verificationCode;

             if (verificationContent) {
                 let metaVer = document.querySelector('meta[name="google-site-verification"]');
                 if (!metaVer) {
                     metaVer = document.createElement('meta');
                     metaVer.name = 'google-site-verification';
                     document.head.appendChild(metaVer);
                 }
                 metaVer.content = verificationContent;
             }
        }

        // --- Google Analytics 4 ---
        if (settings.googleAnalytics?.enabled && settings.googleAnalytics.id) {
          const gaId = settings.googleAnalytics.id;
          if (!document.getElementById('ga-script')) {
            // Main Script
            const script = document.createElement('script');
            script.id = 'ga-script';
            script.async = true;
            script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
            document.head.appendChild(script);

            // Init Script
            const initScript = document.createElement('script');
            initScript.id = 'ga-init-script';
            initScript.innerHTML = `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${gaId}');
            `;
            document.head.appendChild(initScript);
          }
        }

        // --- Google Ads ---
        if (settings.googleAds?.enabled && settings.googleAds.id) {
            const adsId = settings.googleAds.id;
            if (!document.getElementById('google-ads-script')) {
                // Determine if gtag is already loaded by GA4
                const isGtagLoaded = !!document.getElementById('ga-script');
                
                if (!isGtagLoaded) {
                    // Load gtag if not already loaded
                    const script = document.createElement('script');
                    script.id = 'google-ads-script-main';
                    script.async = true;
                    script.src = `https://www.googletagmanager.com/gtag/js?id=${adsId}`;
                    document.head.appendChild(script);

                    const initScript = document.createElement('script');
                    initScript.id = 'google-ads-init';
                    initScript.innerHTML = `
                      window.dataLayer = window.dataLayer || [];
                      function gtag(){dataLayer.push(arguments);}
                      gtag('js', new Date());
                      gtag('config', '${adsId}');
                    `;
                    document.head.appendChild(initScript);
                } else {
                     // Just config if gtag exists
                    const configScript = document.createElement('script');
                    configScript.id = 'google-ads-config';
                    configScript.innerHTML = `gtag('config', '${adsId}');`;
                    document.head.appendChild(configScript);
                }
            }
        }

        // --- Google Tag Manager ---
        if (settings.googleTagManager?.enabled && settings.googleTagManager.id) {
            const gtmId = settings.googleTagManager.id;
            if (!document.getElementById('gtm-script')) {
                // Head Script
                const script = document.createElement('script');
                script.id = 'gtm-script';
                script.innerHTML = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
                    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
                    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
                    'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
                    })(window,document,'script','dataLayer','${gtmId}');`;
                document.head.appendChild(script);

                // Body NoScript (Optional but good practice)
                const noscript = document.createElement('noscript');
                noscript.innerHTML = `<iframe src="https://www.googletagmanager.com/ns.html?id=${gtmId}"
                    height="0" width="0" style="display:none;visibility:hidden"></iframe>`;
                document.body.prepend(noscript);
            }
        }

        // --- Meta Pixel ---
        if (settings.metaPixel?.enabled && settings.metaPixel.id) {
            const pixelId = settings.metaPixel.id;
            if (!document.getElementById('meta-pixel-script')) {
                const script = document.createElement('script');
                script.id = 'meta-pixel-script';
                script.innerHTML = `
                    !function(f,b,e,v,n,t,s)
                    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                    n.queue=[];t=b.createElement(e);t.async=!0;
                    t.src=v;s=b.getElementsByTagName(e)[0];
                    s.parentNode.insertBefore(t,s)}(window, document,'script',
                    'https://connect.facebook.net/en_US/fbevents.js');
                    fbq('init', '${pixelId}');
                    fbq('track', 'PageView');
                `;
                document.head.appendChild(script);

                const noscript = document.createElement('noscript');
                noscript.innerHTML = `<img height="1" width="1" style="display:none"
                    src="https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1"
                />`;
                document.body.appendChild(noscript);
            }
        }

        // --- TikTok Pixel ---
        if (settings.tiktokPixel?.enabled && settings.tiktokPixel.id) {
            const tiktokId = settings.tiktokPixel.id;
             if (!document.getElementById('tiktok-pixel-script')) {
                const script = document.createElement('script');
                script.id = 'tiktok-pixel-script';
                script.innerHTML = `
                    !function (w, d, t) {
                    w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
                    ttq.load('${tiktokId}');
                    ttq.page();
                    }(window, document, 'ttq');
                `;
                document.head.appendChild(script);
            }
        }

      } catch (error) {
        console.error('Analytics loading error:', error);
      }
    };

    loadAnalytics();
  },[]); // Run once on mount

  return null; // This component renders nothing visually
};

export default AnalyticsLoader;
