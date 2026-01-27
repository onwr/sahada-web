import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Facebook, Twitter, Instagram, Play, Linkedin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getPlatformSettings } from '../services/firestoreService';

const Footer = () => {
  const [socialLinks, setSocialLinks] = useState({
    facebook: '',
    twitter: '',
    instagram: '',
    youtube: '',
    linkedin: ''
  });

  const [footerMenus, setFooterMenus] = useState({
    platform: [],
    sahaSahipleri: [],
    kurumsal: []
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const result = await getPlatformSettings();
        if (result.success && result.data) {
          if (result.data.socialMedia) setSocialLinks(result.data.socialMedia);
          if (result.data.menus?.footer) setFooterMenus(result.data.menus.footer);
        }
      } catch (error) {
        console.error('Footer settings error:', error);
      }
    };
    fetchSettings();
  }, []);

  const defaultPlatformLinks = [
    { label: 'Nasıl Çalışır?', href: '/nasil-calisir' },
    { label: 'Tesisler', href: '/yakin-sahalar' },
    { label: 'Oyuncu Bul', href: '/oyuncu-bul' },
    { label: 'Takım Oluştur', href: '/takim-olustur' }, 
    { label: 'Turnuvalar', href: '/turnuvalar' }, 
    { label: 'Fiyatlandırma', href: '/pricing' }
  ];

  const defaultSahaSahipleriLinks = [
    { label: 'Saha Ekle', href: '/saha-sahibi-login' },
    { label: 'Yönetim Paneli', href: '/saha-sahibi/dashboard' },
    { label: 'Başarı Hikayeleri', href: '/hakkimizda' }, 
    { label: 'Destek Merkezi', href: '/destek' },
    { label: 'API Dokümantasyon', href: '/api-docs' } 
  ];

  const defaultKurumsalLinks = [
    { label: 'Hakkımızda', href: '/hakkimizda' },
    { label: 'Blog', href: '/blog' },
    { label: 'Kariyer', href: '/kariyer' },
    { label: 'Basın Kiti', href: '/basin-kiti' },
    { label: 'İletişim', href: '/iletisim' }
  ];

  const platformLinks = footerMenus.platform && footerMenus.platform.length > 0 ? footerMenus.platform : defaultPlatformLinks;
  const sahaSahipleriLinks = footerMenus.sahaSahipleri && footerMenus.sahaSahipleri.length > 0 ? footerMenus.sahaSahipleri : defaultSahaSahipleriLinks;
  const kurumsalLinks = footerMenus.kurumsal && footerMenus.kurumsal.length > 0 ? footerMenus.kurumsal : defaultKurumsalLinks;

  // Helper to get array of active icons
  const getSocialIcons = () => {
     const icons = [];
     if(socialLinks.facebook) icons.push({ icon: Facebook, href: socialLinks.facebook, label: 'Facebook' });
     if(socialLinks.twitter) icons.push({ icon: Twitter, href: socialLinks.twitter, label: 'Twitter' });
     if(socialLinks.instagram) icons.push({ icon: Instagram, href: socialLinks.instagram, label: 'Instagram' });
     if(socialLinks.youtube) icons.push({ icon: Play, href: socialLinks.youtube, label: 'YouTube' });
     if(socialLinks.linkedin) icons.push({ icon: Linkedin, href: socialLinks.linkedin, label: 'LinkedIn' });
     return icons;
  };
  
  const activeSocialIcons = getSocialIcons();

  return (
    <footer className='bg-gray-50 text-gray-800 py-12 lg:py-16 border-t border-gray-100'>
      <div className='container mx-auto max-w-screen-xl px-4'>
        <div className='grid grid-cols-1 lg:grid-cols-4 gap-8 lg:gap-12'>
          {/* Left Column - Logo & Description */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className='lg:col-span-1'
          >
            {/* Logo */}
            <div className='flex items-center gap-3 mb-6'>
              <div className='w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center'>
                <span className='text-white text-xl font-bold'>⚽</span>
              </div>
              <span className='text-2xl font-bold'>Sahada</span>
            </div>

            {/* Description */}
            <p className='text-gray-600 leading-relaxed mb-6'>
              Türkiye'nin en büyük spor tesisi rezervasyon ve oyuncu bulma platformu. 
              81 ilde, 15.000+ tesisle hizmetimizdeyiz.
            </p>

            {/* Social Icons */}
            <div className='flex gap-3'>
              {activeSocialIcons.length > 0 ? (
                  activeSocialIcons.map((social, index) => (
                    <motion.a
                      key={social.label}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                      whileHover={{ scale: 1.1, y: -2 }}
                      className='w-10 h-10 bg-white shadow-sm border border-gray-100 rounded-full flex items-center justify-center hover:bg-green-500 hover:text-white transition-all duration-200'
                      aria-label={social.label}
                    >
                      <social.icon size={18} />
                    </motion.a>
                  ))
              ) : (
                 <span className="text-gray-500 text-sm">Sosyal medya hesabı bulunamadı.</span>
              )}
            </div>
          </motion.div>

          {/* Platform Column */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <h3 className='text-lg font-bold mb-6'>Platform</h3>
            <ul className='space-y-3'>
              {platformLinks.map((link, index) => (
                <motion.li
                  key={link.label}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.2 + (index * 0.05) }}
                >
                  <Link
                    to={link.href}
                    className='text-gray-600 hover:text-green-600 transition-colors duration-200 block'
                  >
                    {link.label}
                  </Link>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* Saha Sahipleri Column */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h3 className='text-lg font-bold mb-6'>Saha Sahipleri</h3>
            <ul className='space-y-3'>
              {sahaSahipleriLinks.map((link, index) => (
                <motion.li
                  key={link.label}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.3 + (index * 0.05) }}
                >
                  <Link
                    to={link.href}
                    className='text-gray-600 hover:text-green-600 transition-colors duration-200 block'
                  >
                    {link.label}
                  </Link>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* Kurumsal Column */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <h3 className='text-lg font-bold mb-6'>Kurumsal</h3>
            <ul className='space-y-3'>
              {kurumsalLinks.map((link, index) => (
                <motion.li
                  key={link.label}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.4 + (index * 0.05) }}
                >
                  <Link
                    to={link.href}
                    className='text-gray-600 hover:text-green-600 transition-colors duration-200 block'
                  >
                    {link.label}
                  </Link>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </div>

        {/* Bottom Border */}
        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          whileInView={{ opacity: 1, scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className='border-t border-gray-100 mt-12 pt-8'
        >
          <div className='flex flex-col md:flex-row md:items-center md:justify-between text-center md:text-left'>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className='text-gray-500 text-sm mb-4 md:mb-0'
            >
              © 2025 Sahada. Tüm hakları saklıdır.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.7 }}
              className='flex justify-center md:justify-end gap-6 text-sm'
            >
              <Link to="/gizlilik-politikasi" className='text-gray-500 hover:text-green-600 transition-colors duration-200'>
                Gizlilik Politikası
              </Link>
              <Link to="/kullanim-kosullari" className='text-gray-500 hover:text-green-600 transition-colors duration-200'>
                Kullanım Şartları
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </footer>
  );
};

export default Footer;