import React, { useState } from 'react';
import { X, MapPin, Check } from 'lucide-react';
import { getCityCoordinates, getAllCities } from '../utils/locationService';

// Türkiye illeri (81 il)
const turkiyeIlleri = [
  'Adana', 'Adıyaman', 'Afyonkarahisar', 'Ağrı', 'Amasya', 'Ankara', 'Antalya', 'Artvin',
  'Aydın', 'Balıkesir', 'Bilecik', 'Bingöl', 'Bitlis', 'Bolu', 'Burdur', 'Bursa',
  'Çanakkale', 'Çankırı', 'Çorum', 'Denizli', 'Diyarbakır', 'Edirne', 'Elazığ', 'Erzincan',
  'Erzurum', 'Eskişehir', 'Gaziantep', 'Giresun', 'Gümüşhane', 'Hakkari', 'Hatay', 'Iğdır',
  'Isparta', 'İstanbul', 'İzmir', 'Kars', 'Kastamonu', 'Kayseri', 'Kırklareli', 'Kırşehir',
  'Kocaeli', 'Konya', 'Kütahya', 'Malatya', 'Manisa', 'Kahramanmaraş', 'Mardin', 'Mersin',
  'Muğla', 'Muş', 'Nevşehir', 'Niğde', 'Ordu', 'Osmaniye', 'Rize', 'Sakarya',
  'Samsun', 'Siirt', 'Sinop', 'Sivas', 'Şanlıurfa', 'Şırnak', 'Tekirdağ', 'Tokat',
  'Trabzon', 'Tunceli', 'Uşak', 'Van', 'Yalova', 'Yozgat', 'Zonguldak'
];

const LocationSelectorModal = ({ isOpen, onClose, onLocationSelected }) => {
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = () => {
    if (!selectedCity) {
      return;
    }

    setLoading(true);
    
    // Koordinatları al
    const result = getCityCoordinates(selectedCity, selectedDistrict);
    
    if (result.success || result.lat) {
      onLocationSelected({
        lat: result.lat,
        lng: result.lng,
        city: result.city || selectedCity,
        district: selectedDistrict || null
      });
      onClose();
    } else {
      console.error('Konum bulunamadı:', result.error);
    }
    
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <MapPin className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Konum Seçin</h2>
            <p className="text-sm text-gray-600">Lütfen il ve ilçe seçin</p>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* İl Seçimi */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              İl <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedCity}
              onChange={(e) => {
                setSelectedCity(e.target.value);
                setSelectedDistrict(''); // İl değişince ilçeyi sıfırla
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
            >
              <option value="">İl Seçin</option>
              {turkiyeIlleri.map((il) => (
                <option key={il} value={il}>
                  {il}
                </option>
              ))}
            </select>
          </div>

          {/* İlçe Seçimi (Opsiyonel) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              İlçe <span className="text-gray-500 text-xs">(Opsiyonel)</span>
            </label>
            <input
              type="text"
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              placeholder="İlçe adı girin (opsiyonel)"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
            />
            <p className="text-xs text-gray-500 mt-1">
              İlçe belirtmek daha doğru konum sağlar
            </p>
          </div>

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <strong>Not:</strong> Seçtiğiniz ile göre yaklaşık konum belirlenecektir. 
              Daha doğru sonuçlar için GPS izni verin.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            İptal
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedCity || loading}
            className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Yükleniyor...</span>
              </>
            ) : (
              <>
                <Check size={18} />
                <span>Konumu Kullan</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LocationSelectorModal;

