import React, { useState, useEffect } from 'react';
import { getAllComplaints, updateComplaintStatus, logAdminAction } from '../../services/firestoreService';
import { useAuth } from '../../contexts/AuthContext';
import AdminSidebar from '../../components/AdminSidebar';
import AdminHeader from '../../components/AdminHeader';
import Pagination from '../../components/Pagination';
import { AlertCircle, CheckCircle, XCircle, Clock, MessageSquare, User, Search, Download } from 'lucide-react';
import { exportToCSV, exportToExcel, exportToPDF } from '../../utils/exportUtils';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { db } from '../../config/firebase';

const Sikayetler = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [complaints, setComplaints] = useState([]);
  const [filter, setFilter] = useState('all');
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadComplaints();
    setCurrentPage(1);

    let q = query(collection(db, 'complaints'));
    
    if (filter !== 'all') {
      q = query(collection(db, 'complaints'), where('status', '==', filter));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const complaintsData = [];
      snapshot.forEach((doc) => {
        complaintsData.push({ id: doc.id, ...doc.data() });
      });
      setComplaints(complaintsData);
    }, (error) => {
      console.error('Real-time listener hatası:', error);
    });

    return () => unsubscribe();
  }, [filter]);

  const loadComplaints = async () => {
    setLoading(true);
    setError(null);
    try {
      const filters = filter !== 'all' ? { status: filter } : {};
      const result = await getAllComplaints(filters);
      if (result.success) {
        setComplaints(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Şikayetler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (complaintId, status) => {
    try {
      const result = await updateComplaintStatus(complaintId, status, adminNotes);
      if (result.success) {
        const complaint = complaints.find(c => c.id === complaintId);
        await logAdminAction(user?.uid || 'admin', status === 'resolved' ? 'complaint_resolved' : 'complaint_rejected', {
          complaintId,
          complaintTitle: complaint?.title || 'Şikayet',
          notes: adminNotes
        });
        setSuccess(`Şikayet ${status === 'resolved' ? 'çözüldü' : 'reddedildi'}`);
        setAdminNotes('');
        setSelectedComplaint(null);
        loadComplaints();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error('Durum güncelleme hatası:', err);
      setError('Durum güncellenirken hata oluştu');
    }
  };

  const handleExport = (format) => {
    const filteredComplaints = complaints.filter(complaint => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        complaint.title?.toLowerCase().includes(query) ||
        complaint.description?.toLowerCase().includes(query)
      );
    });
    
    const headers = ['Başlık', 'Açıklama', 'Durum', 'Oluşturulma Tarihi', 'Kullanıcı ID'];
    const rows = filteredComplaints.map(c => [
      c.title || 'Şikayet',
      c.description || '',
      c.status === 'resolved' ? 'Çözüldü' : c.status === 'rejected' ? 'Reddedildi' : 'Beklemede',
      c.createdAt?.toDate?.()?.toLocaleDateString('tr-TR') || 'Tarih yok',
      c.userId || ''
    ]);
    
    if (format === 'csv') {
      exportToCSV(rows, headers, 'sikayetler');
    } else if (format === 'excel') {
      exportToExcel(rows, headers, 'sikayetler');
    } else if (format === 'pdf') {
      exportToPDF(rows, headers, 'Şikayet Listesi', 'sikayetler');
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar />
      <div className="flex-1 flex flex-col">
        <AdminHeader 
          title="Şikayet Yönetimi" 
          description="Kullanıcı şikayetlerini yönet ve çöz"
          showSearch={true}
          searchQuery={searchQuery}
          onSearch={(e) => {
            setSearchQuery(e.target.value);
            setCurrentPage(1);
          }}
        >
          <div className="flex items-center space-x-3">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              >
                <option value="all">Tümü</option>
                <option value="pending">Bekleyenler</option>
                <option value="resolved">Çözülenler</option>
                <option value="rejected">Reddedilenler</option>
              </select>
              <div className="relative group">
                <button className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                  <Download className="w-4 h-4" />
                  <span>Dışa Aktar</span>
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                  <button
                    onClick={() => handleExport('csv')}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-t-lg"
                  >
                    CSV olarak indir
                  </button>
                  <button
                    onClick={() => handleExport('excel')}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Excel olarak indir
                  </button>
                  <button
                    onClick={() => handleExport('pdf')}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-b-lg"
                  >
                    PDF olarak indir
                  </button>
                </div>
              </div>
          </div>
        </AdminHeader>
        <div className="flex-1 p-6 overflow-y-auto">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
              <AlertCircle className="w-5 h-5 mr-2" />
              {error}
            </div>
          )}
          {success && (
            <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center">
              <CheckCircle className="w-5 h-5 mr-2" />
              {success}
            </div>
          )}
          <div className="space-y-4">
            {(() => {
              const filteredComplaints = complaints.filter(complaint => {
                if (!searchQuery) return true;
                const query = searchQuery.toLowerCase();
                return (
                  complaint.title?.toLowerCase().includes(query) ||
                  complaint.description?.toLowerCase().includes(query)
                );
              });
              const startIndex = (currentPage - 1) * itemsPerPage;
              const endIndex = startIndex + itemsPerPage;
              const paginatedComplaints = filteredComplaints.slice(startIndex, endIndex);
              
              return paginatedComplaints.length > 0 ? (
                paginatedComplaints.map((complaint) => (   
                <div key={complaint.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                          <AlertCircle className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{complaint.title || 'Şikayet'}</h3>
                          <p className="text-sm text-gray-500">
                            {complaint.createdAt?.toDate?.()?.toLocaleDateString('tr-TR') || 'Tarih yok'} • 
                            Kullanıcı ID: {complaint.userId}
                          </p>
                        </div>
                      </div>
                      <p className="text-gray-600 mb-4 ml-13">{complaint.description}</p>
                      {complaint.adminNotes && (
                        <div className="ml-13 mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-sm font-medium text-blue-900 mb-1">Admin Notu:</p>
                          <p className="text-sm text-blue-800">{complaint.adminNotes}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      {complaint.status === 'pending' && (
                        <>
                          <button
                            onClick={() => {
                              setSelectedComplaint(complaint);
                              setAdminNotes('');
                            }}
                            className="text-green-600 hover:text-green-900"
                            title="Çözüldü"
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedComplaint(complaint);
                              setAdminNotes('');
                            }}
                            className="text-red-600 hover:text-red-900"
                            title="Reddet"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        </>
                      )}
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        complaint.status === 'resolved' ? 'bg-green-100 text-green-800' :
                        complaint.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {complaint.status === 'resolved' ? 'Çözüldü' :
                         complaint.status === 'rejected' ? 'Reddedildi' : 'Beklemede'}
                      </span>
                    </div>
                  </div>
                </div>
                ))
              ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-500">
                  <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p>Şikayet bulunamadı</p>
                </div>
              );
            })()}
          </div>
          {(() => {
            const filteredComplaints = complaints.filter(complaint => {
              if (!searchQuery) return true;
              const query = searchQuery.toLowerCase();
              return (
                complaint.title?.toLowerCase().includes(query) ||
                complaint.description?.toLowerCase().includes(query)
              );
            });
            return filteredComplaints.length > 0 && (
              <div className="mt-6">
                <Pagination
                  currentPage={currentPage}
                  totalPages={Math.ceil(filteredComplaints.length / itemsPerPage)}
                  onPageChange={setCurrentPage}
                  itemsPerPage={itemsPerPage}
                  onItemsPerPageChange={(value) => {
                    setItemsPerPage(value);
                    setCurrentPage(1);
                  }}
                  totalItems={filteredComplaints.length}
                />
              </div>
            );
          })()}
        </div>
      </div>

      {/* Şikayet İşlem Modal */}
      {selectedComplaint && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">
                  {selectedComplaint.status === 'pending' ? 'Şikayeti İşle' : 'Şikayet Detayı'}
                </h3>
                <button
                  onClick={() => {
                    setSelectedComplaint(null);
                    setAdminNotes('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">{selectedComplaint.title}</h4>
                <p className="text-sm text-gray-600">{selectedComplaint.description}</p>
              </div>
              {selectedComplaint.status === 'pending' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Admin Notu</label>
                    <textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      rows="3"
                      placeholder="Çözüm notu veya red sebebi"
                    />
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => {
                        setSelectedComplaint(null);
                        setAdminNotes('');
                      }}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      İptal
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(selectedComplaint.id, 'resolved')}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Çözüldü
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(selectedComplaint.id, 'rejected')}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      Reddet
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sikayetler;

