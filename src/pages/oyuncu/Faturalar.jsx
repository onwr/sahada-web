import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import { useAuth } from '../../contexts/AuthContext';
import { getPlayerInvoices, getInvoice, getPlatformSettings } from '../../services/firestoreService';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import OyuncuSidebar from '../../components/OyuncuSidebar';
import { FileText, Download, Search, Calendar, DollarSign, Filter, Eye } from 'lucide-react';
import toast from '../../utils/toast';

const Faturalar = () => {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    loadInvoices();
    const cleanup = setupRealtimeListener();
    
    return () => {
      if (cleanup) cleanup();
    };
  }, [user]);

  const setupRealtimeListener = () => {
    if (!user) return;

    const reservationsQuery = query(
      collection(db, 'rezervasyonlar'),
      where('playerIds', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(reservationsQuery, async () => {
      await loadInvoices();
    }, (error) => {
      console.error('Fatura listener hatası:', error);
    });

    return () => unsubscribe();
  };

  const loadInvoices = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await getPlayerInvoices(user.uid);
      if (result.success) {
        setInvoices(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error('Faturalar yükleme hatası:', err);
      setError('Veriler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetail = async (invoice) => {
    setSelectedInvoice(invoice);
    setShowDetailModal(true);
  };

  const handleDownloadInvoice = async (invoice) => {
    const toastId = toast.loading('Fatura hazırlanıyor...');
    
    try {
      const doc = new jsPDF();
      
      // 1. Yazı Tipi Yükle (UTF-8 / Türkçe karakter desteği için)
      // Google Fonts veya CDN'den Roboto fontunu çekiyoruz
      try {
        const fontResponse = await fetch('https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Regular.ttf');
        const fontBlob = await fontResponse.blob();
        const reader = new FileReader();
        
        await new Promise((resolve) => {
          reader.onloadend = () => {
            const fontBase64 = reader.result.split(',')[1];
            doc.addFileToVFS('Roboto-Regular.ttf', fontBase64);
            doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
            doc.setFont('Roboto');
            resolve();
          };
          reader.readAsDataURL(fontBlob);
        });
      } catch (fontError) {
        console.error('Font yükleme hatası:', fontError);
        // Fallback: Standart font
        doc.setFont('helvetica'); 
      }

      // 2. Logo Yükle
      let logoDataUrl = null;
      let logoWidth = 40;
      let logoHeight = 40; // Aspect ratio'ya göre ayarlanacak

      try {
        // Logoyu bul: Settings > LocalStorage > Default
        let logoUrl = localStorage.getItem('platform_logo');
        if (!logoUrl) {
           const settings = await getPlatformSettings();
           if (settings.success && settings.data?.logoUrl) {
             logoUrl = settings.data.logoUrl;
           }
        }
        logoUrl = logoUrl || '/images/logo.png';

        // Resmi base64'e çevir
        const imgResponse = await fetch(logoUrl);
        const imgBlob = await imgResponse.blob();
        const imgReader = new FileReader();
        
        await new Promise((resolve) => {
          imgReader.onloadend = () => {
            logoDataUrl = imgReader.result;
            // Basit aspect ratio kontrolü (opsiyonel, şimdilik kare varsayalım veya sabit genişlik)
            resolve();
          };
          imgReader.readAsDataURL(imgBlob);
        });

      } catch (imgError) {
        console.error('Logo yükleme hatası:', imgError);
      }

      // 3. PDF İçeriği Oluşturma
      
      // Header Arka Planı
      doc.setFillColor(245, 245, 245); // Açık gri header arka planı
      doc.rect(0, 0, 210, 50, 'F');

      // Logo çizimi
      if (logoDataUrl) {
        try {
           // Uzantı tahmini
           const format = logoDataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
           // Logoyu oranlı sığdır (Max W: 50, Max H: 30)
           doc.addImage(logoDataUrl, format, 15, 10, 40, 0); // Height 0 yapılırsa orantılı ölçekler (jspdf)
        } catch (e) {
           doc.setFontSize(20);
           doc.setTextColor(22, 163, 74);
           doc.text('SAHADA', 20, 25);
        }
      } else {
         doc.setFontSize(20);
         doc.setTextColor(22, 163, 74);
         doc.text('SAHADA', 20, 25);
      }

      // Başlık (Logo'nun sağına veya altına)
      // Eğer logo sol üstteyse, başlığı biraz sağa veya header'ın sağına alabiliriz
      // Ancak orijinal tasarımda başlık sol taraftaydı.
      // Logo varsa başlığı biraz aşağı öteleyelim veya sağ tarafta "Makbuz" yazalım.
      
      // Sağ üst köşe bilgiler
      doc.setTextColor(80, 80, 80);
      doc.setFontSize(20);
      doc.setFont(undefined, 'bold');
      doc.text('REZERVASYON FİŞİ', 200, 20, { align: 'right' });
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(`Tarih: ${invoice.date.toLocaleDateString('tr-TR')}`, 200, 30, { align: 'right' });
      doc.text(`No: ${invoice.reservationNumber}`, 200, 35, { align: 'right' });

      // İçerik Başlangıcı
      doc.setTextColor(0, 0, 0);
      let yPos = 70;

      // Müşteri ve Saha Bilgileri
      doc.setFontSize(11);
      doc.setTextColor(100, 100, 100);
      doc.setFont(undefined, 'bold');
      doc.text('MÜŞTERİ BİLGİLERİ', 20, yPos);
      doc.text('TESİS BİLGİLERİ', 110, yPos); // Aralığı açtık
      
      yPos += 8;
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.1);
      doc.line(20, yPos - 5, 90, yPos - 5); // Alt çizgi
      doc.line(110, yPos - 5, 190, yPos - 5);

      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, 'normal');
      
      // Müşteri (Şu anki kullanıcı)
      const customerName = user?.displayName || user?.email || 'Sayın Müşteri';
      doc.text(customerName, 20, yPos);
      // doc.text(user?.email || '', 20, yPos + 5);

      // Saha Adı ve Adresi
      // Adres uzun olabilir, splitTextToSize kullanalım
      const tesisAdi = invoice.tesisName;
      doc.text(tesisAdi, 110, yPos);
      
      if (invoice.tesisAddress) {
          const addressLines = doc.splitTextToSize(invoice.tesisAddress, 80); // 80 birim genişlik
          doc.setFontSize(9);
          doc.setTextColor(80, 80, 80);
          doc.text(addressLines, 110, yPos + 5);
      }

      yPos += 40;

      // Tablo Başlıkları
      doc.setFillColor(240, 240, 240);
      doc.rect(20, yPos - 6, 175, 10, 'F'); // Genişliği artırdık
      doc.setFont(undefined, 'bold');
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      
      // Sütun X koordinatları
      const col1 = 25;  // Hizmet
      const col2 = 95;  // Tarih / Saat (80 -> 95)
      const col3 = 145; // Kişi (130 -> 145)
      const col4 = 175; // Tutar (170 -> 175)

      doc.text('Hizmet', col1, yPos);
      doc.text('Tarih / Saat', col2, yPos);
      doc.text('Kişi', col3, yPos);
      doc.text('Tutar', col4, yPos);

      yPos += 15;
      
      // Tablo İçeriği
      doc.setFont(undefined, 'normal');
      doc.setFontSize(10);

      // Hizmet Metni (Uzun olabilir, saralım)
      const serviceText = `Saha Kullanım Bedeli (${invoice.paymentMethod})`;
      const serviceLines = doc.splitTextToSize(serviceText, 65); // 65 birim genişlik
      doc.text(serviceLines, col1, yPos);

      // Diğer sütunlar (Hizmet satır sayısına göre ortalamayalım, üstten hizalayalım)
      doc.text(`${invoice.date.toLocaleDateString('tr-TR')} ${invoice.timeSlot}`, col2, yPos);
      doc.text(`${invoice.playerCount} Kişi`, col3, yPos);
      doc.text(`${invoice.totalAmount.toLocaleString('tr-TR')} TL`, col4, yPos);

      // Çizgi (Satır yüksekliğine göre ayarla)
      const rowHeight = Math.max(serviceLines.length * 5, 10);
      yPos += rowHeight + 5;
      
      doc.setDrawColor(220, 220, 220);
      doc.line(20, yPos, 195, yPos);

      // Toplam
      yPos += 15;
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('GENEL TOPLAM:', 145, yPos, { align: 'right' }); // Hizalamayı sağa yasla veya kooordinatla
      doc.setTextColor(22, 163, 74);
      doc.text(`₺${invoice.totalAmount.toLocaleString('tr-TR')}`, 175, yPos);

      // Alt Bilgi
      yPos = 270;
      doc.setTextColor(150, 150, 150);
      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      doc.text('Bu belge resmi fatura yerine geçmez, bilgi fişidir.', 105, yPos, { align: 'center' });
      doc.text('Sahada Rezervasyon Sistemleri', 105, yPos + 5, { align: 'center' });

      // Kaydet
      doc.save(`Fatura-${invoice.reservationNumber}.pdf`);
      toast.success('Fatura PDF olarak indirildi', { id: toastId });
      
    } catch (err) {
      console.error('PDF oluşturma hatası:', err);
      toast.error('PDF oluşturulurken bir hata meydana geldi', { id: toastId });
    }
  };

  const filteredInvoices = invoices.filter(invoice => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      if (!invoice.tesisName.toLowerCase().includes(searchLower) &&
          !invoice.reservationNumber.toLowerCase().includes(searchLower)) {
        return false;
      }
    }

    if (dateFilter !== 'all') {
      const invoiceDate = invoice.date;
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      if (dateFilter === 'today') {
        const invoiceDateOnly = new Date(invoiceDate.getFullYear(), invoiceDate.getMonth(), invoiceDate.getDate());
        if (invoiceDateOnly.getTime() !== today.getTime()) return false;
      } else if (dateFilter === 'week') {
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        if (invoiceDate < weekAgo) return false;
      } else if (dateFilter === 'month') {
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        if (invoiceDate < monthAgo) return false;
      }
    }

    return true;
  });

  const totalSpent = filteredInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Faturalar yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <OyuncuSidebar />

      <div className="flex-1 flex flex-col">
        <header className="bg-white shadow-sm border-b px-6 py-4 mt-12 md:mt-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Fatura Geçmişi</h1>
              <p className="text-gray-600 mt-1">
                {filteredInvoices.length} fatura • Toplam: ₺{totalSpent.toLocaleString('tr-TR')}
              </p>
            </div>
          </div>
        </header>

        <div className="bg-white border-b px-6 py-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Saha veya fatura no ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>

            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            >
              <option value="all">Tüm Tarihler</option>
              <option value="today">Bugün</option>
              <option value="week">Son 7 Gün</option>
              <option value="month">Son 30 Gün</option>
            </select>
          </div>
        </div>

        <div className="flex-1 p-6 overflow-y-auto">
          {error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          ) : filteredInvoices.length > 0 ? (
            <div className="space-y-4">
              {filteredInvoices.map((invoice) => (
                <div
                  key={invoice.reservationId}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4 mb-3">
                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                          <FileText className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{invoice.tesisName}</h3>
                          <p className="text-sm text-gray-600">
                            Fatura No: {invoice.reservationNumber}
                          </p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Tarih</p>
                          <p className="font-medium text-gray-900">
                            {invoice.date.toLocaleDateString('tr-TR')}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Saat</p>
                          <p className="font-medium text-gray-900">{invoice.timeSlot}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Oyuncu</p>
                          <p className="font-medium text-gray-900">{invoice.playerCount} kişi</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Toplam</p>
                          <p className="font-medium text-gray-900">
                            ₺{invoice.totalAmount.toLocaleString('tr-TR')}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => handleViewDetail(invoice)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Detayları Gör"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDownloadInvoice(invoice)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="İndir"
                      >
                        <Download className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Fatura Yok</h3>
              <p className="text-gray-600">Henüz fatura bulunmuyor</p>
            </div>
          )}
        </div>

        {/* Detail Modal */}
        {showDetailModal && selectedInvoice && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Fatura Detayları</h2>
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    setSelectedInvoice(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Fatura Bilgileri</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Rezervasyon No:</span>
                      <span className="font-medium">{selectedInvoice.reservationNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tarih:</span>
                      <span className="font-medium">{selectedInvoice.date.toLocaleDateString('tr-TR')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Saat:</span>
                      <span className="font-medium">{selectedInvoice.timeSlot}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Saha Bilgileri</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <p className="font-medium text-gray-900">{selectedInvoice.tesisName}</p>
                    {selectedInvoice.tesisAddress && (
                      <p className="text-sm text-gray-600">{selectedInvoice.tesisAddress}</p>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Ödeme Detayları</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Oyuncu Sayısı:</span>
                      <span className="font-medium">{selectedInvoice.playerCount} kişi</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Kişi Başı:</span>
                      <span className="font-medium">₺{selectedInvoice.amountPerPlayer.toLocaleString('tr-TR')}</span>
                    </div>
                    <div className="flex justify-between border-t border-gray-200 pt-3">
                      <span className="text-gray-900 font-semibold">Toplam Tutar:</span>
                      <span className="text-gray-900 font-bold text-lg">₺{selectedInvoice.totalAmount.toLocaleString('tr-TR')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Ödeme Yöntemi:</span>
                      <span className="font-medium">{selectedInvoice.paymentMethod}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Durum:</span>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        selectedInvoice.status === 'completed' ? 'bg-green-100 text-green-800' :
                        selectedInvoice.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {selectedInvoice.status === 'completed' ? 'Tamamlandı' :
                         selectedInvoice.status === 'confirmed' ? 'Onaylandı' : 'Beklemede'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => handleDownloadInvoice(selectedInvoice)}
                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <Download className="w-4 h-4" />
                    <span>Fatura İndir</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      setSelectedInvoice(null);
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Kapat
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Faturalar;

