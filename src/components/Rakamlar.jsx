import React from 'react';
import { motion } from 'framer-motion';
import { Check, ArrowRight } from 'lucide-react';

const Rakamlar = () => {
  const features = [
    'İlk 6 ay %0 komisyon',
    'Anında ödeme garantisi',
    'Ücretsiz dijital pazarlama',
    '7/24 destek'
  ];

  const stats = [
    {
      number: '%40',
      label: 'Doluluk Artışı',
      color: 'bg-green-500'
    },
    {
      number: '₺50K+',
      label: 'Aylık Ek Gelir',
      color: 'bg-green-600'
    },
    {
      number: '15K+',
      label: 'Aktif Tesis',
      color: 'bg-green-700'
    },
    {
      number: '%95',
      label: 'Memnuniyet',
      color: 'bg-green-800'
    }
  ];

  return (
    <div className='bg-gradient-to-br from-[#00a651] to-[#04c956] py-12 lg:py-20'>
      <div className='container mx-auto max-w-screen-xl px-4'>
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center'>
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className='text-white'
          >
            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className='text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 leading-tight'
            >
              Spor Tesisinizi Binlerce{' '}
              <br className='hidden lg:block' />
              Sporcuyla Buluşturun
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className='text-lg lg:text-xl text-white/90 mb-8'
            >
              Doluluk oranınızı %40 artırın, ödemelerinizi kolaylaştırın
            </motion.p>

            {/* Features */}
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8'>
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.6 + (index * 0.1) }}
                  className='flex items-center gap-3'
                >
                  <div className='flex-shrink-0 w-6 h-6 bg-white/20 rounded-full flex items-center justify-center'>
                    <Check size={14} className='text-white' />
                  </div>
                  <span className='text-white/90 font-medium'>{feature}</span>
                </motion.div>
              ))}
            </div>

            {/* CTA Button */}
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 1.0 }}
              whileHover={{ 
                scale: 1.05,
                boxShadow: "0 10px 25px rgba(234, 88, 12, 0.3)"
              }}
              whileTap={{ scale: 0.95 }}
              className='bg-gradient-to-r from-orange-500 to-orange-600 text-white px-8 py-4 rounded-full font-bold text-lg hover:from-orange-600 hover:to-orange-700 transition-all duration-200 shadow-lg flex items-center gap-3'
            >
              Hemen Başla
              <ArrowRight size={20} />
            </motion.button>
          </motion.div>

          {/* Right Stats Grid */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className='grid grid-cols-2 gap-4'
          >
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30, scale: 0.9 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true }}
                transition={{ 
                  duration: 0.6, 
                  delay: 0.5 + (index * 0.1),
                  type: "spring",
                  bounce: 0.3
                }}
                whileHover={{ 
                  y: -8,
                  transition: { duration: 0.2 }
                }}
                className={`${stat.color} rounded-2xl p-6 text-center text-white shadow-xl hover:shadow-2xl transition-all duration-300`}
              >
                <motion.div
                  initial={{ scale: 0.5 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ 
                    duration: 0.8, 
                    delay: 0.7 + (index * 0.1),
                    type: "spring",
                    bounce: 0.4
                  }}
                  className='text-3xl lg:text-4xl font-bold mb-2'
                >
                  {stat.number}
                </motion.div>
                <motion.div
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.9 + (index * 0.1) }}
                  className='text-sm lg:text-base font-medium text-white/90'
                >
                  {stat.label}
                </motion.div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Rakamlar;