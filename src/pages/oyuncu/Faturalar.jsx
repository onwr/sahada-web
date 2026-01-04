import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import { useAuth } from '../../contexts/AuthContext';
import { getPlayerInvoices, getInvoice } from '../../services/firestoreService';
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

  const handleDownloadInvoice = (invoice) => {
    const doc = new jsPDF();
    
    // Font ayarları (Türkçe karakter desteği için varsayılan fontu kullanıyoruz ama
    // tam destek için özel font eklemek gerekebilir. Şimdilik standart ASCII karakterlerle idare edip
    // Türkçe karakterleri normalize edebiliriz veya varsayılan fontun desteklediklerini kullanırız)
    // Not: jsPDF varsayılan fontuyla Türkçe karakter sorunu olabilir.
    
    // Logo / Başlık
    doc.setFillColor(22, 163, 74); // Green-600
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.text('SAHADA', 20, 25);
    doc.setFontSize(12);
    doc.text('Elektronik Rezervasyon Makbuzu', 20, 35);

    // Fatura Bilgileri (Sağ Üst)
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text(`Tarih: ${invoice.date.toLocaleDateString('tr-TR')}`, 150, 25);
    doc.text(`No: ${invoice.reservationNumber}`, 150, 32);

    // İçerik Başlangıcı
    doc.setTextColor(0, 0, 0);
    let yPos = 60;

    // Müşteri ve Saha Bilgileri
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('REZERVASYON BILGILERI', 20, yPos);
    doc.text('SAHA BILGILERI', 120, yPos);
    
    yPos += 10;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    
    // Müşteri (Şu anki kullanıcı)
    const customerName = user?.displayName || user?.email || 'Sayin Musteri';
    doc.text(customerName, 20, yPos);
    // doc.text(user?.email || '', 20, yPos + 5);

    // Saha
    doc.text(invoice.tesisName, 120, yPos);
    if (invoice.tesisAddress) {
        const addressLines = doc.splitTextToSize(invoice.tesisAddress, 80);
        doc.text(addressLines, 120, yPos + 5);
    }

    yPos += 40;

    // Tablo Başlıkları
    doc.setFillColor(240, 240, 240);
    doc.rect(20, yPos - 5, 170, 10, 'F');
    doc.setFont(undefined, 'bold');
    doc.text('Hizmet', 25, yPos);
    doc.text('Tarih / Saat', 80, yPos);
    doc.text('Kisi', 130, yPos);
    doc.text('Tutar', 170, yPos);

    yPos += 15;
    
    // Tablo İçeriği
    doc.setFont(undefined, 'normal');
    doc.text(`Saha Kullanim Bedeli (${invoice.paymentMethod})`, 25, yPos);
    doc.text(`${invoice.date.toLocaleDateString('tr-TR')} ${invoice.timeSlot}`, 80, yPos);
    doc.text(`${invoice.playerCount} Kisi`, 130, yPos);
    doc.text(`${invoice.totalAmount.toLocaleString('tr-TR')} TL`, 170, yPos);

    // Çizgi
    yPos += 10;
    doc.setDrawColor(200, 200, 200);
    doc.line(20, yPos, 190, yPos);

    // Toplam
    yPos += 15;
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('GENEL TOPLAM:', 130, yPos);
    doc.setTextColor(22, 163, 74);
    doc.text(`${invoice.totalAmount.toLocaleString('tr-TR')} TL`, 170, yPos);

    // Alt Bilgi
    yPos = 250;
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.text('Bu belge resmi fatura yerine gecmez, bilgi fisidir.', 105, yPos, { align: 'center' });
    doc.text('Sahada Rezervasyon Sistemleri', 105, yPos + 5, { align: 'center' });

    // Kaydet
    doc.save(`Fatura-${invoice.reservationNumber}.pdf`);
    toast.success('Fatura PDF olarak indirildi');
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
        <header className="bg-white shadow-sm border-b px-6 py-4">
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

