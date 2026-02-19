import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
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
      const todayStr = new Date().toLocaleDateString('tr-TR', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      
      const invoiceDate = invoice.date instanceof Date ? invoice.date : new Date(invoice.date);
      const formattedDate = invoiceDate.toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      // Settings ve Logo
      const settingsResult = await getPlatformSettings();
      const platformSettings = settingsResult.success ? settingsResult.data : null;
      const logoUrl = platformSettings?.logoUrl || localStorage.getItem('platform_logo') || '/images/logo.png';
      const siteTitle = platformSettings?.siteTitle || localStorage.getItem('platform_title') || 'Sahada';

      // Görünmez div oluştur
      const invoiceDiv = document.createElement('div');
      invoiceDiv.style.position = 'absolute';
      invoiceDiv.style.left = '-9999px';
      invoiceDiv.style.width = '794px';
      invoiceDiv.style.fontFamily = 'Arial, Helvetica, sans-serif';
      invoiceDiv.style.color = '#0f172a';
      invoiceDiv.style.backgroundColor = '#ffffff';
      invoiceDiv.style.padding = '0';
      invoiceDiv.style.margin = '0';

      invoiceDiv.innerHTML = `
        <div style="width: 100%; height: 120px; background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); color: #fff; padding: 0 50px; border-radius: 12px 12px 0 0; box-shadow: 0 4px 6px rgba(0,0,0,0.1); display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 20px;">
             <div style="background: white; padding: 10px; border-radius: 12px; display: flex; align-items: center; justify-content: center; width: 80px; height: 80px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); overflow: hidden;">
               <img src="${logoUrl}" style="max-height: 100%; max-width: 100%; object-fit: contain;" crossorigin="anonymous" onerror="this.style.display='none'" />
             </div>
             <div>
               <div style="font-size: 28px; font-weight: 800; letter-spacing: 1px;">${siteTitle.toUpperCase()}</div>
               <div style="font-size: 14px; opacity: 0.9; font-weight: 500;">Spor Tesisleri Rezervasyon Faturası</div>
             </div>
          </div>
          <div style="text-align: right;">
             <div style="font-size: 14px; opacity: 0.9;">Tarih: ${todayStr}</div>
             <div style="font-size: 14px; opacity: 0.9; margin-top: 4px;">Fatura No: ${invoice.reservationNumber}</div>
          </div>
        </div>
        
        <div style="padding: 40px 50px; background: #ffffff;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #e2e8f0;">
            <div>
              <div style="font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">Fatura No</div>
              <div style="font-size: 20px; font-weight: 700; color: #0f172a;">${invoice.reservationNumber}</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">Fatura Tarihi</div>
              <div style="font-size: 20px; font-weight: 700; color: #0f172a;">${todayStr}</div>
            </div>
          </div>

          <div style="display: flex; gap: 20px; margin-bottom: 30px;">
            <div style="flex: 1; background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
              <div style="font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; font-weight: 600;">Tesis Bilgileri</div>
              <div style="font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 8px;">${invoice.tesisName}</div>
              <div style="font-size: 14px; color: #475569; line-height: 1.5;">${invoice.tesisAddress || ''}</div>
            </div>
            <div style="flex: 1; background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
              <div style="font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; font-weight: 600;">Rezervasyon Detayları</div>
              <div style="font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 8px;">${formattedDate}</div>
              <div style="font-size: 16px; color: #475569; margin-bottom: 8px;">${invoice.timeSlot}</div>
              <div style="font-size: 13px; color: #64748b;">Oyuncu Sayısı: ${invoice.playerCount} kişi</div>
            </div>
          </div>

          <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin-bottom: 30px; border-left: 4px solid #16a34a;">
            <div style="font-size: 13px; color: #64748b; margin-bottom: 8px;">Ödeme Durumu</div>
            <div style="font-size: 16px; font-weight: 600; color: #0f172a;">Ödeme Tamamlandı</div>
            <div style="font-size: 12px; color: #64748b; margin-top: 6px;">Yöntem: ${invoice.paymentMethod}</div>
          </div>

          <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 30px;">
            <thead>
              <tr style="background: #f1f5f9;">
                <th style="text-align: left; padding: 16px 20px; border: 1px solid #cbd5e1; font-weight: 600;">Açıklama</th>
                <th style="text-align: right; padding: 16px 20px; border: 1px solid #cbd5e1; font-weight: 600;">Tutar</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding: 16px 20px; border: 1px solid #e2e8f0;">Saha Rezervasyonu - ${invoice.tesisName}</td>
                <td style="text-align: right; padding: 16px 20px; border: 1px solid #e2e8f0; font-weight: 600;">₺${invoice.totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); color: #fff;">
                <td style="padding: 20px; font-weight: 700; font-size: 16px;">TOPLAM</td>
                <td style="text-align: right; padding: 20px; font-weight: 700; font-size: 16px;">₺${invoice.totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
            </tfoot>
          </table>

          <div style="margin-top: 40px; padding-top: 30px; border-top: 2px solid #e2e8f0; text-align: center;">
            <div style="font-size: 11px; color: #64748b; line-height: 1.6;">
              Bu fatura otomatik olarak oluşturulmuştur.<br>
              Herhangi bir sorunuz için <strong style="color: #16a34a;">destek@sahada.com</strong> adresinden bizimle iletişime geçebilirsiniz.
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(invoiceDiv);

      const canvas = await html2canvas(invoiceDiv, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: invoiceDiv.offsetWidth,
        height: invoiceDiv.scrollHeight
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'pt', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 0;

      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      pdf.save(`Sahada-Fatura-${invoice.reservationNumber}.pdf`);

      document.body.removeChild(invoiceDiv);
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

