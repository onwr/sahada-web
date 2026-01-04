import React from 'react';
import OyuncuSidebar from '../../components/OyuncuSidebar';
import { Settings } from 'lucide-react';

const Ayarlar = () => {
  return (
    <div className="flex h-screen bg-gray-50">
      <OyuncuSidebar />
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
            <Settings className="w-8 h-8 text-gray-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Ayarlar Yapım Aşamasında</h2>
          <p className="text-gray-600">
            Ayarlar sayfası şu anda geliştirme aşamasındadır. Çok yakında hizmetinizde olacaktır.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Ayarlar;
