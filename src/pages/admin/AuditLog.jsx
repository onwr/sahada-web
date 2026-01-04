import React, { useState, useEffect } from 'react';
import { getAuditLogs } from '../../services/firestoreService';
import AdminSidebar from '../../components/AdminSidebar';
import { FileText, Search, Filter, Download } from 'lucide-react';
import { exportToCSV, exportToExcel, exportToPDF } from '../../utils/exportUtils';
import Pagination from '../../components/Pagination';

const AuditLog = () => {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadLogs();
  }, [filter]);

  const loadLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const filters = filter !== 'all' ? { action: filter } : {};
      const result = await getAuditLogs(filters);
      if (result.success) {
        setLogs(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Audit log yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = (format) => {
    const filteredLogs = logs.filter(log => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        log.action?.toLowerCase().includes(query) ||
        log.details?.toLowerCase().includes(query) ||
        log.adminId?.toLowerCase().includes(query)
      );
    });

    const headers = ['Tarih', 'Admin ID', 'İşlem', 'Detaylar'];
    const rows = filteredLogs.map(log => [
      log.timestamp?.toDate?.()?.toLocaleString('tr-TR') || log.createdAt?.toLocaleString('tr-TR') || 'Tarih yok',
      log.adminId || '',
      log.action || '',
      typeof log.details === 'object' ? JSON.stringify(log.details) : log.details || ''
    ]);

    if (format === 'csv') {
      exportToCSV(rows, headers, 'audit_log');
    } else if (format === 'excel') {
      exportToExcel(rows, headers, 'audit_log');
    } else if (format === 'pdf') {
      exportToPDF(rows, headers, 'Audit Log', 'audit_log');
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

  const filteredLogs = logs.filter(log => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      log.action?.toLowerCase().includes(query) ||
      log.details?.toLowerCase().includes(query) ||
      log.adminId?.toLowerCase().includes(query)
    );
  });

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar />
      <div className="flex-1 flex flex-col">
        <header className="bg-white shadow-sm border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
              <p className="text-gray-600 mt-1">Admin işlem geçmişi</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="İşlem, detay ara..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 w-64"
                />
              </div>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              >
                <option value="all">Tümü</option>
                <option value="tesis_approved">Tesis Onaylama</option>
                <option value="tesis_rejected">Tesis Reddetme</option>
                <option value="user_banned">Kullanıcı Yasaklama</option>
                <option value="user_activated">Kullanıcı Aktif Etme</option>
                <option value="complaint_resolved">Şikayet Çözme</option>
                <option value="ticket_closed">Ticket Kapatma</option>
                <option value="settings_updated">Ayarlar Güncelleme</option>
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
          </div>
        </header>
        <div className="flex-1 p-6 overflow-y-auto">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tarih</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Admin ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">İşlem</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Detaylar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedLogs.length > 0 ? (
                    paginatedLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {log.timestamp?.toDate?.()?.toLocaleString('tr-TR') || log.createdAt?.toLocaleString('tr-TR') || 'Tarih yok'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {log.adminId || 'Bilinmiyor'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            {log.action || 'İşlem'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {typeof log.details === 'object' ? JSON.stringify(log.details) : log.details || '-'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                        <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p>Audit log kaydı bulunamadı</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {filteredLogs.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil(filteredLogs.length / itemsPerPage)}
                onPageChange={setCurrentPage}
                itemsPerPage={itemsPerPage}
                onItemsPerPageChange={(value) => {
                  setItemsPerPage(value);
                  setCurrentPage(1);
                }}
                totalItems={filteredLogs.length}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditLog;

