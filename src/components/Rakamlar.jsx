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
    <div className='bg-green-600 py-12 lg:py-20'>
      <div className='container mx-auto max-w-screen-xl px-4'>
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center'>
          {/* Left Content */}
          <div className='text-white'>
            <h2 className='text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 leading-tight'>
              Spor Tesisinizi Binlerce{' '}
              <br className='hidden lg:block' />
              Sporcuyla Buluşturun
            </h2>

            <p className='text-lg lg:text-xl text-white/90 mb-8'>
              Doluluk oranınızı %40 artırın, ödemelerinizi kolaylaştırın
            </p>

            {/* Features */}
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8'>
              {features.map((feature, index) => (
                <div
                  key={index}
                  className='flex items-center gap-3'
                >
                  <div className='flex-shrink-0 w-6 h-6 bg-white/20 rounded-full flex items-center justify-center'>
                    <Check size={14} className='text-white' />
                  </div>
                  <span className='text-white/90 font-medium'>{feature}</span>
                </div>
              ))}
            </div>

            {/* CTA Button */}
            <button
              className='bg-gradient-to-r from-orange-500 to-orange-600 text-white px-8 py-4 rounded-full font-bold text-lg hover:from-orange-600 hover:to-orange-700 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 flex items-center gap-3'
            >
              Hemen Başla
              <ArrowRight size={20} />
            </button>
          </div>

          {/* Right Stats Grid */}
          <div className='grid grid-cols-2 gap-4'>
            {stats.map((stat, index) => (
              <div
                key={index}
                className={`${stat.color} rounded-2xl p-6 text-center text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2`}
              >
                <div className='text-3xl lg:text-4xl font-bold mb-2'>
                  {stat.number}
                </div>
                <div className='text-sm lg:text-base font-medium text-white/90'>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Rakamlar;