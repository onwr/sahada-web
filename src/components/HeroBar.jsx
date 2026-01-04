import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getPlatformStats } from '../services/firestoreService';

const HeroBar = () => {
  const [stats, setStats] = useState([
    {
      number: '0',
      label: 'Aktif Tesis'
    },
    {
      number: '0',
      label: 'Kayıtlı Sporcu'
    },
    {
      number: '0',
      label: 'Aylık Rezervasyon'
    },
    {
      number: '81',
      label: 'İl'
    }
  ]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const result = await getPlatformStats();
      if (result.success && result.data) {
        const { totalTesisler, activeUsers, totalReservations } = result.data;
        
        setStats([
          {
            number: totalTesisler?.toLocaleString('tr-TR') || '0',
            label: 'Aktif Tesis'
          },
          {
            number: activeUsers?.players?.toLocaleString('tr-TR') || '0',
            label: 'Kayıtlı Sporcu'
          },
          {
            number: totalReservations?.monthly?.toLocaleString('tr-TR') || '0',
            label: 'Aylık Rezervasyon'
          },
          {
            number: '81',
            label: 'İl'
          }
        ]);
      }
    } catch (error) {
      console.error('İstatistik yükleme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='bg-[#f5f5f5] py-8 lg:py-12'>
      <div className='container mx-auto max-w-screen-xl px-4'>
        <div className='grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12'>
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ 
                duration: 0.6, 
                delay: index * 0.1,
                ease: "easeOut" 
              }}
              className='text-center'
            >
              <motion.div
                initial={{ scale: 0.5 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{ 
                  duration: 0.8, 
                  delay: index * 0.1 + 0.2,
                  type: "spring",
                  bounce: 0.4
                }}
                className='text-3xl font-bold text-[#00a651] mb-2'
              >
                {stat.number}
              </motion.div>
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ 
                  duration: 0.6, 
                  delay: index * 0.1 + 0.4 
                }}
                className='text-sm sm:text-base text-[#75759a] font-medium'
              >
                {stat.label}
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HeroBar;