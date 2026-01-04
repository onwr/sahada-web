// Türkiye şehir koordinatları (büyük şehirler)
const cityCoordinates = {
  'İstanbul': { lat: 41.0082, lng: 28.9784 },
  'Ankara': { lat: 39.9334, lng: 32.8597 },
  'İzmir': { lat: 38.4237, lng: 27.1428 },
  'Bursa': { lat: 40.1826, lng: 29.0665 },
  'Antalya': { lat: 36.8969, lng: 30.7133 },
  'Adana': { lat: 37.0000, lng: 35.3213 },
  'Konya': { lat: 37.8746, lng: 32.4932 },
  'Gaziantep': { lat: 37.0662, lng: 37.3833 },
  'Şanlıurfa': { lat: 37.1674, lng: 38.7955 },
  'Kocaeli': { lat: 40.8533, lng: 29.8815 },
  'Mersin': { lat: 36.8000, lng: 34.6333 },
  'Diyarbakır': { lat: 37.9144, lng: 40.2306 },
  'Hatay': { lat: 36.4018, lng: 36.3498 },
  'Manisa': { lat: 38.6191, lng: 27.4289 },
  'Kayseri': { lat: 38.7312, lng: 35.4787 },
  'Samsun': { lat: 41.2867, lng: 36.3300 },
  'Balıkesir': { lat: 39.6484, lng: 27.8826 },
  'Kahramanmaraş': { lat: 37.5858, lng: 36.9371 },
  'Van': { lat: 38.4891, lng: 43.4089 },
  'Aydın': { lat: 37.8444, lng: 27.8458 },
  'Tekirdağ': { lat: 40.9833, lng: 27.5167 },
  'Sakarya': { lat: 40.7569, lng: 30.3781 },
  'Denizli': { lat: 37.7765, lng: 29.0864 },
  'Muğla': { lat: 37.2153, lng: 28.3636 },
  'Eskişehir': { lat: 39.7767, lng: 30.5206 },
  'Malatya': { lat: 38.3552, lng: 38.3095 },
  'Erzurum': { lat: 39.9043, lng: 41.2678 },
  'Trabzon': { lat: 41.0015, lng: 39.7178 },
  'Ordu': { lat: 40.9839, lng: 37.8764 },
  'Afyonkarahisar': { lat: 38.7638, lng: 30.5403 },
  'Giresun': { lat: 40.9128, lng: 38.3895 },
  'Zonguldak': { lat: 41.4564, lng: 31.7987 },
  'Rize': { lat: 41.0201, lng: 40.5234 },
  'Artvin': { lat: 41.1828, lng: 41.8183 },
  'Kastamonu': { lat: 41.3767, lng: 33.7765 },
  'Sinop': { lat: 42.0269, lng: 35.1550 },
  'Sivas': { lat: 39.7477, lng: 37.0179 },
  'Kırıkkale': { lat: 39.8468, lng: 33.5153 },
  'Çorum': { lat: 40.5506, lng: 34.9556 },
  'Amasya': { lat: 40.6539, lng: 35.8330 },
  'Tokat': { lat: 40.3236, lng: 36.5522 },
  'Nevşehir': { lat: 38.6244, lng: 34.7239 },
  'Kırşehir': { lat: 39.1425, lng: 34.1709 },
  'Yozgat': { lat: 39.8208, lng: 34.8083 },
  'Aksaray': { lat: 38.3686, lng: 34.0369 },
  'Niğde': { lat: 37.9667, lng: 34.6833 },
  'Karabük': { lat: 41.2061, lng: 32.6204 },
  'Bartın': { lat: 41.6356, lng: 32.3375 },
  'Düzce': { lat: 40.8439, lng: 31.1569 },
  'Bolu': { lat: 40.7396, lng: 31.6080 },
  'Bilecik': { lat: 40.1429, lng: 29.9793 },
  'Kütahya': { lat: 39.4167, lng: 29.9833 },
  'Uşak': { lat: 38.6823, lng: 29.4082 },
  'Isparta': { lat: 37.7648, lng: 30.5566 },
  'Burdur': { lat: 37.7206, lng: 30.2908 },
  'Antakya': { lat: 36.4018, lng: 36.3498 },
  'Mardin': { lat: 37.3131, lng: 40.7350 },
  'Batman': { lat: 37.8812, lng: 41.1351 },
  'Siirt': { lat: 37.9333, lng: 41.9500 },
  'Şırnak': { lat: 37.5164, lng: 42.4611 },
  'Hakkari': { lat: 37.5744, lng: 43.7408 },
  'Bitlis': { lat: 38.4000, lng: 42.1167 },
  'Muş': { lat: 38.7333, lng: 41.4833 },
  'Bingöl': { lat: 38.8847, lng: 40.4981 },
  'Elazığ': { lat: 38.6747, lng: 39.2228 },
  'Tunceli': { lat: 39.1079, lng: 39.5401 },
  'Erzincan': { lat: 39.7500, lng: 39.5000 },
  'Bayburt': { lat: 40.2552, lng: 40.2249 },
  'Gümüşhane': { lat: 40.4603, lng: 39.4814 },
  'Ardahan': { lat: 41.1100, lng: 42.7022 },
  'Kars': { lat: 40.6010, lng: 43.0975 },
  'Ağrı': { lat: 39.7217, lng: 43.0567 },
  'Iğdır': { lat: 39.9167, lng: 44.0333 },
  'Yalova': { lat: 40.6500, lng: 29.2667 },
  'Kırklareli': { lat: 41.7333, lng: 27.2167 },
  'Edirne': { lat: 41.6667, lng: 26.5667 },
  'Çanakkale': { lat: 40.1553, lng: 26.4142 },
  'Bursa': { lat: 40.1826, lng: 29.0665 }
};

// IP-based konum alma
export const getLocationByIP = async () => {
  try {
    // ip-api.com servisi (ücretsiz, rate limit: 45 req/min)
    const response = await fetch('http://ip-api.com/json/?fields=status,message,lat,lon,city,regionName,country');
    const data = await response.json();
    
    if (data.status === 'success' && data.lat && data.lon) {
      return {
        success: true,
        lat: data.lat,
        lng: data.lon,
        city: data.city,
        region: data.regionName,
        country: data.country
      };
    }
    
    return { success: false, error: data.message || 'Konum alınamadı' };
  } catch (error) {
    console.error('IP-based konum alma hatası:', error);
    
    // Alternatif servis: ipapi.co
    try {
      const altResponse = await fetch('https://ipapi.co/json/');
      const altData = await altResponse.json();
      
      if (altData.latitude && altData.longitude) {
        return {
          success: true,
          lat: altData.latitude,
          lng: altData.longitude,
          city: altData.city,
          region: altData.region,
          country: altData.country_name
        };
      }
    } catch (altError) {
      console.error('Alternatif IP servisi hatası:', altError);
    }
    
    return { success: false, error: error.message || 'Konum servisleri çalışmıyor' };
  }
};

// İl/ilçe ismine göre koordinat döndürme
export const getCityCoordinates = (city, district = null) => {
  // Şehir ismini normalize et (büyük/küçük harf, Türkçe karakter)
  const normalizedCity = city
    .trim()
    .replace(/İ/g, 'I')
    .replace(/ı/g, 'i')
    .replace(/Ş/g, 'S')
    .replace(/ş/g, 's')
    .replace(/Ğ/g, 'G')
    .replace(/ğ/g, 'g')
    .replace(/Ü/g, 'U')
    .replace(/ü/g, 'u')
    .replace(/Ö/g, 'O')
    .replace(/ö/g, 'o')
    .replace(/Ç/g, 'C')
    .replace(/ç/g, 'c');
  
  // Mapping'de ara (normalize edilmiş isimle)
  for (const [cityName, coords] of Object.entries(cityCoordinates)) {
    const normalizedMappingCity = cityName
      .replace(/İ/g, 'I')
      .replace(/ı/g, 'i')
      .replace(/Ş/g, 'S')
      .replace(/ş/g, 's')
      .replace(/Ğ/g, 'G')
      .replace(/ğ/g, 'g')
      .replace(/Ü/g, 'U')
      .replace(/ü/g, 'u')
      .replace(/Ö/g, 'O')
      .replace(/ö/g, 'o')
      .replace(/Ç/g, 'C')
      .replace(/ç/g, 'c');
    
    if (normalizedMappingCity.toLowerCase() === normalizedCity.toLowerCase()) {
      return {
        success: true,
        lat: coords.lat,
        lng: coords.lng,
        city: cityName
      };
    }
  }
  
  // Bulunamazsa İstanbul varsayılan
  return {
    success: false,
    lat: cityCoordinates['İstanbul'].lat,
    lng: cityCoordinates['İstanbul'].lng,
    city: 'İstanbul',
    error: 'Şehir bulunamadı, varsayılan konum kullanılıyor'
  };
};

// Tüm şehir listesini döndür
export const getAllCities = () => {
  return Object.keys(cityCoordinates).sort();
};

