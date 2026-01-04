import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getReservations, getTesisler, updateReservationStatus, addRezervasyon, updateRezervasyon, deleteRezervasyon } from '../../services/firestoreService';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Timestamp } from 'firebase/firestore';
import SahaSahibiSidebar from '../../components/SahaSahibiSidebar';
import toast from '../../utils/toast';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { tr } from 'date-fns/locale';
import { 
  Calendar, 
  Search,
  Filter,
  Download,
  Plus,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  User,
  Phone,
  MapPin,
  DollarSign,
  Users,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  List,
  Grid3X3,
  X
} from 'lucide-react';

import { useNavigate, useLocation } from 'react-router-dom';

const Rezervasyonlar = () => {
  const { user, userData } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [reservations, setReservations] = useState([]);
  const [sahalar, setSahalar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filtreleme ve arama
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sahaFilter, setSahaFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });
  
  // Görünüm
  const [viewMode, setViewMode] = useState('list'); // list, calendar, grid
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // Sayfalama
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // Seçili rezervasyonlar
  const [selectedReservations, setSelectedReservations] = useState([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  
  // Yeni rezervasyon modal
  const [showNewReservationModal, setShowNewReservationModal] = useState(false);
  const [newReservationForm, setNewReservationForm] = useState({
    tesisId: '',
    customerName: '',
    customerPhone: '',
    date: '',
    timeSlot: '',
    totalPlayers: 1,
    price: 0,
    notes: ''
  });
  const [submittingReservation, setSubmittingReservation] = useState(false);

  // Detay modal
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState(null);

  // Düzenleme modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingReservation, setEditingReservation] = useState(null);
  const [editForm, setEditForm] = useState({
    customerName: '',
    customerPhone: '',
    date: '',
    timeSlot: '',
    totalPlayers: 1,
    price: 0,
    notes: '',
    status: 'confirmed'
  });
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Silme onay modal
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [reservationToDelete, setReservationToDelete] = useState(null);
  const [deletingReservation, setDeletingReservation] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    loadReservations();
    const cleanup = setupRealtimeListener();
    
    return () => {
      if (cleanup) cleanup();
    };
  }, [user]);

  const loadReservations = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const [reservationsResult, tesislerResult] = await Promise.all([
        getReservations(user.uid),
        getTesisler(user.uid)
      ]);

      if (reservationsResult.success) {
        setReservations(reservationsResult.data.sort((a, b) => {
          const aTime = a.createdAt?.toMillis?.() || a.createdAt?.seconds * 1000 || (a.createdAt ? new Date(a.createdAt).getTime() : 0);
          const bTime = b.createdAt?.toMillis?.() || b.createdAt?.seconds * 1000 || (b.createdAt ? new Date(b.createdAt).getTime() : 0);
          return bTime - aTime;
        }));
      }

      if (tesislerResult.success) {
        setSahalar(tesislerResult.data);
      }
    } catch (err) {
      console.error('Rezervasyon veri yükleme hatası:', err);
      setError('Veriler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // Check for navigation state to open new reservation modal
  useEffect(() => {
    if (location.state?.openNewReservation && location.state?.tesisId && sahalar.length > 0) {
      setNewReservationForm(prev => ({
        ...prev,
        tesisId: location.state.tesisId,
        date: location.state.date || prev.date,
        timeSlot: location.state.timeSlot || prev.timeSlot
      }));
      
      const selectedSaha = sahalar.find(s => s.id === location.state.tesisId);
      if (selectedSaha) {
        setNewReservationForm(prev => ({
          ...prev,
          price: selectedSaha.price || 0
        }));
      }
      setShowNewReservationModal(true);
      
      // Clear state to avoid reopening
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, sahalar]);

  const setupRealtimeListener = () => {
    if (!user) return;

    let unsubscribeFunctions = [];

    // Önce tesis ID'lerini al
    const tesislerQuery = query(
      collection(db, 'tesisler'),
      where('ownerId', '==', user.uid)
    );

    const unsubscribeTesisler = onSnapshot(tesislerQuery, (snapshot) => {
      const tesisIds = [];
      const tesisler = [];
      snapshot.forEach((doc) => {
        tesisIds.push(doc.id);
        tesisler.push({ id: doc.id, ...doc.data() });
      });
      setSahalar(tesisler);

      if (tesisIds.length > 0) {
        // Rezervasyonlar için real-time listener
        const reservationsQuery = query(
          collection(db, 'rezervasyonlar'),
          where('tesisId', 'in', tesisIds)
        );

        const unsubscribeReservations = onSnapshot(reservationsQuery, (snapshot) => {
          const reservations = [];
          snapshot.forEach((doc) => {
            reservations.push({ id: doc.id, ...doc.data() });
          });
          // Client-side sorting by createdAt (descending)
          reservations.sort((a, b) => {
            const getCreatedAt = (item) => {
               if (!item.createdAt) return 0;
               if (item.createdAt.toDate) return item.createdAt.toDate().getTime();
               if (item.createdAt.seconds) return item.createdAt.seconds * 1000;
               return new Date(item.createdAt).getTime();
            };
            return getCreatedAt(b) - getCreatedAt(a);
          });
          setReservations(reservations);
        });
        unsubscribeFunctions.push(unsubscribeReservations);
      } else {
        setReservations([]);
      }
    });
    unsubscribeFunctions.push(unsubscribeTesisler);

    return () => {
      unsubscribeFunctions.forEach(unsub => unsub());
    };
  };

  // Filtrelenmiş rezervasyonlar
  const filteredReservations = reservations.filter(reservation => {
    // Arama filtresi
    if (searchTerm) {
      const customerName = reservation.customerName || '';
      const customerPhone = reservation.customerPhone || '';
      const tesisName = reservation.tesisName || '';
      const searchLower = searchTerm.toLowerCase();
      
      if (!customerName.toLowerCase().includes(searchLower) &&
          !customerPhone.includes(searchTerm) &&
          !tesisName.toLowerCase().includes(searchLower)) {
        return false;
      }
    }

    // Durum filtresi
    if (statusFilter !== 'all' && reservation.status !== statusFilter) {
      return false;
    }

    // Saha filtresi
    if (sahaFilter !== 'all' && reservation.tesisId !== sahaFilter) {
      return false;
    }

    // Tarih filtresi
    if (dateFilter !== 'all') {
      const reservationDate = parseDate(reservation.date);
      if (!reservationDate) return false;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      switch (dateFilter) {
        case 'today':
          if (reservationDate.toDateString() !== today.toDateString()) {
            return false;
          }
          break;
        case 'tomorrow':
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          if (reservationDate.toDateString() !== tomorrow.toDateString()) {
            return false;
          }
          break;
        case 'thisWeek':
          const weekStart = new Date(today);
          weekStart.setDate(today.getDate() - today.getDay());
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          if (reservationDate < weekStart || reservationDate > weekEnd) {
            return false;
          }
          break;
        case 'custom':
          if (dateRange.start && reservationDate < new Date(dateRange.start)) {
            return false;
          }
          if (dateRange.end && reservationDate > new Date(dateRange.end)) {
            return false;
          }
          break;
      }
    }

    return true;
  });

  // Sayfalama
  const totalPages = Math.ceil(filteredReservations.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedReservations = filteredReservations.slice(startIndex, startIndex + itemsPerPage);

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'pending_payment': return 'bg-orange-100 text-orange-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'confirmed': return 'Onaylandı';
      case 'pending': return 'Beklemede';
      case 'pending_payment': return 'Ödeme Bekliyor';
      case 'cancelled': return 'İptal';
      case 'completed': return 'Tamamlandı';
      default: return 'Bilinmiyor';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'confirmed': return <CheckCircle className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'pending_payment': return <Clock className="w-4 h-4" />;
      case 'cancelled': return <XCircle className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const handleStatusChange = async (reservationId, newStatus) => {
    try {
      const result = await updateReservationStatus(reservationId, newStatus);
      if (result.success) {
        setReservations(prev => 
          prev.map(r => r.id === reservationId ? { ...r, status: newStatus } : r)
        );
      }
    } catch (error) {
      console.error('Durum güncelleme hatası:', error);
    }
  };

  const handleSelectReservation = (reservationId) => {
    setSelectedReservations(prev => {
      if (prev.includes(reservationId)) {
        return prev.filter(id => id !== reservationId);
      } else {
        return [...prev, reservationId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedReservations.length === paginatedReservations.length) {
      setSelectedReservations([]);
    } else {
      setSelectedReservations(paginatedReservations.map(r => r.id));
    }
  };

  const handleBulkStatusChange = async (newStatus) => {
    try {
      for (const reservationId of selectedReservations) {
        await updateReservationStatus(reservationId, newStatus);
      }
      setReservations(prev => 
        prev.map(r => 
          selectedReservations.includes(r.id) ? { ...r, status: newStatus } : r
        )
      );
      setSelectedReservations([]);
    } catch (error) {
      console.error('Toplu durum güncelleme hatası:', error);
    }
  };

  const handleNewReservation = () => {
    if (sahalar.length === 0) {
      toast.error('Önce bir saha eklemeniz gerekiyor');
      return;
    }
    setNewReservationForm({
      tesisId: sahalar[0]?.id || '',
      customerName: '',
      customerPhone: '',
      date: '',
      timeSlot: '',
      totalPlayers: 1,
      price: sahalar[0]?.price || 0,
      notes: ''
    });
    setShowNewReservationModal(true);
  };

  // Fiyat hesaplama fonksiyonu
  const calculatePrice = (tesisId, timeSlot) => {
    const selectedSaha = sahalar.find(s => s.id === tesisId);
    if (!selectedSaha) return 0;
    
    // Özel fiyatlandırma kuralları yoksa veya saat seçilmediyse standart fiyat
    if (!timeSlot || !selectedSaha.customPrices || selectedSaha.customPrices.length === 0) {
      return selectedSaha.price || 0;
    }
    
    // Saat aralığından başlangıç saatini al (Örn: "14:00 - 15:00" -> 14)
    const startHour = parseInt(timeSlot.split(':')[0]);
    if (isNaN(startHour)) return selectedSaha.price || 0;
    
    // Uygun kuralı bul
    const rule = selectedSaha.customPrices.find(r => startHour >= r.start && startHour < r.end);
    
    // Kural varsa özel fiyatı, yoksa standart fiyatı döndür
    return rule ? rule.price : (selectedSaha.price || 0);
  };

  const handleReservationFormChange = (field, value) => {
    setNewReservationForm(prev => {
      const newState = { ...prev, [field]: value };
      
      // Saha veya saat değiştiğinde fiyatı güncelle
      if (field === 'tesisId' || field === 'timeSlot') {
        const currentTesisId = field === 'tesisId' ? value : prev.tesisId;
        const currentTimeSlot = field === 'timeSlot' ? value : prev.timeSlot;
        
        if (currentTesisId) {
          newState.price = calculatePrice(currentTesisId, currentTimeSlot);
        }
      }
      
      return newState;
    });
  };

  const handleSubmitNewReservation = async (e) => {
    e.preventDefault();
    
    if (!newReservationForm.tesisId || !newReservationForm.customerName || !newReservationForm.date || !newReservationForm.timeSlot) {
      toast.error('Lütfen tüm zorunlu alanları doldurun');
      return;
    }
    
    setSubmittingReservation(true);
    
    try {
      const selectedSaha = sahalar.find(s => s.id === newReservationForm.tesisId);
      const selectedDate = new Date(newReservationForm.date);
      const totalAmount = Number(newReservationForm.price);
      
      const reservationData = {
        tesisId: newReservationForm.tesisId,
        tesisName: selectedSaha?.name || '',
        ownerId: user.uid,
        customerName: newReservationForm.customerName,
        customerPhone: newReservationForm.customerPhone || '',
        date: Timestamp.fromDate(selectedDate),
        timeSlot: newReservationForm.timeSlot,
        totalPlayers: newReservationForm.totalPlayers,
        price: newReservationForm.price,
        totalAmount: totalAmount,
        status: 'confirmed',
        notes: newReservationForm.notes || '',
        createdAt: Timestamp.now()
      };
      
      const result = await addRezervasyon(reservationData);
      
      if (result.success) {
        toast.success('Rezervasyon başarıyla oluşturuldu');
        setShowNewReservationModal(false);
        setNewReservationForm({
          tesisId: '',
          customerName: '',
          customerPhone: '',
          date: '',
          timeSlot: '',
          totalPlayers: 1,
          price: 0,
          notes: ''
        });
      } else {
        toast.error(result.error || 'Rezervasyon oluşturulamadı');
      }
    } catch (error) {
      console.error('Rezervasyon oluşturma hatası:', error);
      toast.error('Rezervasyon oluşturulurken hata oluştu');
    } finally {
      setSubmittingReservation(false);
    }
  };

  // Firestore Timestamp'i Date'e çevir
  const parseDate = (dateValue) => {
    if (!dateValue) return null;
    
    // Firestore Timestamp kontrolü
    if (dateValue && typeof dateValue === 'object') {
      if (dateValue.toDate && typeof dateValue.toDate === 'function') {
        // Firestore Timestamp
        return dateValue.toDate();
      } else if (dateValue.toMillis && typeof dateValue.toMillis === 'function') {
        // Firestore Timestamp (alternatif)
        return new Date(dateValue.toMillis());
      } else if (dateValue.seconds) {
        // Firestore Timestamp (seconds formatı)
        return new Date(dateValue.seconds * 1000);
      }
    }
    
    // Normal Date objesi, string veya number
    const date = new Date(dateValue);
    return isNaN(date.getTime()) ? null : date;
  };

  const formatDate = (dateValue) => {
    const date = parseDate(dateValue);
    if (!date) return 'Tarih Yok';
    
    return date.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'Saat Yok';
    return timeString;
  };

  // Detay görüntüleme
  const handleViewDetail = (reservation) => {
    setSelectedReservation(reservation);
    setShowDetailModal(true);
  };

  // Düzenleme başlatma
  const handleEditReservation = (reservation) => {
    setEditingReservation(reservation);
    
    // Tarih işleme
    const reservationDate = parseDate(reservation.date);
    const dateString = reservationDate ? reservationDate.toISOString().split('T')[0] : '';
    
    // Müşteri bilgileri (Fallback mantığı ile)
    let customerName = reservation.customerName || '';
    let customerPhone = reservation.customerPhone || '';
    
    if ((!customerName || customerName === 'Müşteri') && reservation.players && reservation.players.length > 0) {
      const organizator = reservation.players.find(p => p.status === 'organizator') || reservation.players[0];
      if (organizator) {
         customerName = organizator.name || customerName;
         customerPhone = organizator.phone || customerPhone;
      }
    }
    
    setEditForm({
      customerName: customerName,
      customerPhone: customerPhone,
      date: dateString,
      timeSlot: reservation.timeSlot || reservation.time || reservation.hour || '',
      totalPlayers: reservation.totalPlayers || 1,
      price: reservation.price || reservation.totalAmount || 0,
      notes: reservation.notes || '',
      status: reservation.status || 'confirmed'
    });
    setShowEditModal(true);
  };

  // Düzenleme form değişikliği
  const handleEditFormChange = (field, value) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Düzenleme kaydetme
  const handleUpdateReservation = async (e) => {
    e.preventDefault();
    
    if (!editingReservation) return;
    
    setSubmittingEdit(true);
    
    try {
      const selectedDate = new Date(editForm.date);
      const totalAmount = Number(editForm.price);
      
      const updateData = {
        customerName: editForm.customerName,
        customerPhone: editForm.customerPhone || '',
        date: Timestamp.fromDate(selectedDate),
        timeSlot: editForm.timeSlot,
        totalPlayers: editForm.totalPlayers,
        price: editForm.price,
        totalAmount: totalAmount,
        status: editForm.status,
        notes: editForm.notes || '',
        updatedAt: Timestamp.now()
      };
      
      const result = await updateRezervasyon(editingReservation.id, updateData);
      
      if (result.success) {
        toast.success('Rezervasyon başarıyla güncellendi');
        setShowEditModal(false);
        setEditingReservation(null);
      } else {
        toast.error(result.error || 'Rezervasyon güncellenemedi');
      }
    } catch (error) {
      console.error('Rezervasyon güncelleme hatası:', error);
      toast.error('Rezervasyon güncellenirken hata oluştu');
    } finally {
      setSubmittingEdit(false);
    }
  };

  // Silme başlatma
  const handleDeleteClick = (reservation) => {
    setReservationToDelete(reservation);
    setShowDeleteConfirmModal(true);
  };

  // Silme onaylama
  const handleDeleteConfirm = async () => {
    if (!reservationToDelete) return;
    
    setDeletingReservation(true);
    
    try {
      const result = await deleteRezervasyon(reservationToDelete.id);
      
      if (result.success) {
        toast.success('Rezervasyon başarıyla silindi');
        setShowDeleteConfirmModal(false);
        setReservationToDelete(null);
      } else {
        toast.error(result.error || 'Rezervasyon silinemedi');
      }
    } catch (error) {
      console.error('Rezervasyon silme hatası:', error);
      toast.error('Rezervasyon silinirken hata oluştu');
    } finally {
      setDeletingReservation(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Rezervasyonlar yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Hata</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadReservations}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Tekrar Dene
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <SahaSahibiSidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white shadow-sm border-b pl-16 pr-6 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Rezervasyonlar</h1>
              <p className="text-gray-600 mt-1">
                Toplam {filteredReservations.length} rezervasyon
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg">
                <Download className="w-4 h-4" />
                <span>Dışa Aktar</span>
              </button>
              <button 
                onClick={handleNewReservation}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Plus className="w-4 h-4" />
                <span>Yeni Rezervasyon</span>
              </button>
            </div>
          </div>
        </header>

        {/* Filters and Search */}
        <div className="bg-white border-b px-6 py-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Müşteri adı, telefon veya saha adı ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
            >
              <option value="all">Tüm Durumlar</option>
              <option value="pending">Beklemede</option>
              <option value="pending_payment">Ödeme Bekliyor</option>
              <option value="confirmed">Onaylandı</option>
              <option value="cancelled">İptal</option>
              <option value="completed">Tamamlandı</option>
            </select>

            {/* Saha Filter */}
            <select
              value={sahaFilter}
              onChange={(e) => setSahaFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
            >
              <option value="all">Tüm Sahalar</option>
              {sahalar.map(saha => (
                <option key={saha.id} value={saha.id}>{saha.name}</option>
              ))}
            </select>

            {/* Date Filter */}
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
            >
              <option value="all">Tüm Tarihler</option>
              <option value="today">Bugün</option>
              <option value="tomorrow">Yarın</option>
              <option value="thisWeek">Bu Hafta</option>
              <option value="custom">Özel Tarih</option>
            </select>

            {/* Custom Date Range */}
            {dateFilter === 'custom' && (
              <div className="flex items-center space-x-2">
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                />
                <span className="text-gray-500">-</span>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                />
              </div>
            )}

            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow-sm' : ''}`}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`p-2 rounded ${viewMode === 'calendar' ? 'bg-white shadow-sm' : ''}`}
              >
                <CalendarDays className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm' : ''}`}
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedReservations.length > 0 && (
          <div className="bg-blue-50 border-b px-6 py-3">
            <div className="flex items-center justify-between">
              <span className="text-blue-800 font-medium">
                {selectedReservations.length} rezervasyon seçildi
              </span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleBulkStatusChange('confirmed')}
                  className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                >
                  Onayla
                </button>
                <button
                  onClick={() => handleBulkStatusChange('cancelled')}
                  className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                >
                  İptal Et
                </button>
                <button
                  onClick={() => setSelectedReservations([])}
                  className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
                >
                  Seçimi Temizle
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 p-6 overflow-y-auto">
          {viewMode === 'list' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectedReservations.length === paginatedReservations.length && paginatedReservations.length > 0}
                          onChange={handleSelectAll}
                          className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">MÜŞTERİ</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SAHA</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TARİH & SAAT</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TUTAR</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DURUM</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İŞLEMLER</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedReservations.length > 0 ? (
                      paginatedReservations.map((reservation) => {
                        const saha = sahalar.find(s => s.id === reservation.tesisId);
                        
                        // Müşteri bilgilerini belirle
                        let customerName = reservation.customerName || 'Müşteri';
                        let customerPhone = reservation.customerPhone || '';
                        
                        if ((!reservation.customerName || customerName === 'Müşteri') && reservation.players && reservation.players.length > 0) {
                          const organizator = reservation.players.find(p => p.status === 'organizator') || reservation.players[0];
                          if (organizator) {
                             customerName = organizator.name || customerName;
                             customerPhone = organizator.phone || customerPhone;
                          }
                        }
                        
                        const avatar = customerName.split(' ').map(n => n[0]).join('').toUpperCase();
                        
                        return (
                          <tr key={reservation.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input
                                type="checkbox"
                                checked={selectedReservations.includes(reservation.id)}
                                onChange={() => handleSelectReservation(reservation.id)}
                                className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                  <span className="text-sm font-medium text-green-800">{avatar}</span>
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">{customerName}</div>
                                  <div className="text-sm text-gray-500 flex items-center">
                                    <Phone className="w-3 h-3 mr-1" />
                                    {customerPhone}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <div className="flex items-center">
                                <MapPin className="w-4 h-4 text-gray-400 mr-2" />
                                {saha?.name || reservation.tesisName || 'Bilinmeyen Saha'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <div>{formatDate(reservation.date)}</div>
                              <div className="text-gray-500">{formatTime(reservation.timeSlot)}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              <div className="flex items-center">
                                <DollarSign className="w-4 h-4 text-gray-400 mr-1" />
                                ₺{(reservation.totalAmount || reservation.price || 0).toLocaleString()}
                              </div>
                              {reservation.totalPlayers && (
                                <div className="text-xs text-gray-500 flex items-center">
                                  <Users className="w-3 h-3 mr-1" />
                                  {reservation.totalPlayers} kişi
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                {getStatusIcon(reservation.status)}
                                <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(reservation.status)}`}>
                                  {getStatusText(reservation.status)}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex space-x-2">
                                <button 
                                  onClick={() => handleStatusChange(reservation.id, 'confirmed')}
                                  className="text-green-600 hover:text-green-800"
                                  title="Onayla"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => handleStatusChange(reservation.id, 'cancelled')}
                                  className="text-red-600 hover:text-red-800"
                                  title="İptal Et"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => handleViewDetail(reservation)}
                                  className="text-blue-600 hover:text-blue-800"
                                  title="Detayları Gör"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => handleEditReservation(reservation)}
                                  className="text-green-600 hover:text-green-800"
                                  title="Düzenle"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteClick(reservation)}
                                  className="text-red-600 hover:text-red-800"
                                  title="Sil"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                          <div className="flex flex-col items-center">
                            <Calendar className="w-12 h-12 text-gray-300 mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Rezervasyon Bulunamadı</h3>
                            <p className="text-gray-600">Arama kriterlerinize uygun rezervasyon bulunmuyor.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Önceki
                    </button>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Sonraki
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">{startIndex + 1}</span>
                        {' - '}
                        <span className="font-medium">{Math.min(startIndex + itemsPerPage, filteredReservations.length)}</span>
                        {' / '}
                        <span className="font-medium">{filteredReservations.length}</span>
                        {' rezervasyon gösteriliyor'}
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </button>
                        
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                          if (pageNum > totalPages) return null;
                          
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setCurrentPage(pageNum)}
                              className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                pageNum === currentPage
                                  ? 'z-10 bg-green-50 border-green-500 text-green-600'
                                  : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                        
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronRight className="h-5 w-5" />
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {viewMode === 'calendar' && (() => {
            const startOfWeek = new Date(selectedDate);
            const day = startOfWeek.getDay();
            const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Monday
            startOfWeek.setDate(diff);

            const weekDays = Array.from({length: 7}, (_, i) => {
                const d = new Date(startOfWeek);
                d.setDate(d.getDate() + i);
                return d;
            });

            const hours = Array.from({length: 17}, (_, i) => i + 8); // 08:00 - 24:00

            const isSameDay = (d1, d2) => {
              return d1.getDate() === d2.getDate() &&
                     d1.getMonth() === d2.getMonth() &&
                     d1.getFullYear() === d2.getFullYear();
            };

            const getReservationsForSlot = (day, hour) => {
               return filteredReservations.filter(res => {
                   const resDate = parseDate(res.date);
                   if (!resDate) return false;
                   if (!isSameDay(resDate, day)) return false;
                   
                   const resHour = parseInt(res.timeSlot?.split(':')[0]);
                   return resHour === hour;
               });
            };

            return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
               {/* Calendar Header */}
              <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
                 <div className="flex items-center gap-4">
                    <h3 className="text-xl font-bold text-gray-900 capitalize">
                        {startOfWeek.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}
                    </h3>
                    <div className="flex bg-gray-100 rounded-lg p-1">
                        <button 
                            onClick={() => {
                                const newDate = new Date(selectedDate);
                                newDate.setDate(newDate.getDate() - 7);
                                setSelectedDate(newDate);
                            }} 
                            className="p-1 hover:bg-white rounded shadow-sm text-gray-600"
                        >
                            <ChevronLeft size={20}/>
                        </button>
                        <button 
                            onClick={() => setSelectedDate(new Date())}
                            className="px-3 py-1 text-sm font-medium hover:bg-white rounded shadow-sm text-gray-700"
                        >
                            Bugün
                        </button>
                        <button 
                            onClick={() => {
                                const newDate = new Date(selectedDate);
                                newDate.setDate(newDate.getDate() + 7);
                                setSelectedDate(newDate);
                            }}
                            className="p-1 hover:bg-white rounded shadow-sm text-gray-600"
                        >
                            <ChevronRight size={20}/>
                        </button>
                    </div>
                 </div>
                 
                 <div className="flex items-center gap-2 text-sm text-gray-500">
                    <div className="flex items-center gap-1"><div className="w-3 h-3 bg-green-100 border border-green-500 rounded"></div> Onaylı</div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 bg-yellow-100 border border-yellow-500 rounded"></div> Bekliyor</div>
                 </div>
              </div>

              {/* Weekly Grid */}
              <div className="overflow-x-auto">
                <div className="min-w-[800px] border rounded-xl overflow-hidden">
                    {/* Days Header */}
                    <div className="grid grid-cols-8 bg-gray-50 border-b border-gray-200">
                        <div className="p-3 text-center font-medium text-gray-500 border-r border-gray-200 bg-white sticky left-0 z-10">Saat</div>
                        {weekDays.map((day, i) => (
                            <div key={i} className={`p-3 text-center border-r border-gray-200 last:border-0 ${isSameDay(day, new Date()) ? 'bg-green-50' : 'bg-white'}`}>
                                <div className={`font-bold ${isSameDay(day, new Date()) ? 'text-green-700' : 'text-gray-900'}`}>
                                    {day.toLocaleDateString('tr-TR', { weekday: 'short' })}
                                </div>
                                <div className={`text-sm ${isSameDay(day, new Date()) ? 'text-green-600' : 'text-gray-500'}`}>
                                    {day.getDate()}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Time Slots */}
                    <div className="max-h-[600px] overflow-y-auto">
                    {hours.map(hour => (
                        <div key={hour} className="grid grid-cols-8 border-b border-gray-100 min-h-[80px]">
                            {/* Time Column */}
                            <div className="p-2 text-center text-xs font-medium text-gray-500 border-r border-gray-200 bg-gray-50 flex items-center justify-center sticky left-0 z-10">
                                {`${String(hour).padStart(2, '0')}:00`}
                            </div>
                            
                            {/* Days Columns */}
                            {weekDays.map((day, dayIndex) => {
                                const dayReservations = getReservationsForSlot(day, hour);
                                const isToday = isSameDay(day, new Date());
                                
                                return (
                                    <div 
                                        key={dayIndex} 
                                        className={`relative border-r border-gray-100 last:border-0 p-1 group transition-colors ${
                                            isToday ? 'bg-green-50/30' : 'hover:bg-gray-50'
                                        }`}
                                    >
                                        {/* Click to Add (Empty Slot) */}
                                        {dayReservations.length === 0 && (
                                            <div 
                                                className="absolute inset-0 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer"
                                                onClick={() => {
                                                    const dateStr = day.toISOString().split('T')[0];
                                                    const timeStr = `${String(hour).padStart(2, '0')}:00`;
                                                    // Reset form with these values
                                                    setNewReservationForm({
                                                        ...newReservationForm,
                                                        tesisId: sahalar[0]?.id || '', // Default to first facility
                                                        date: dateStr,
                                                        timeSlot: timeStr
                                                    });
                                                    setShowNewReservationModal(true);
                                                }}
                                            >
                                                <Plus className="w-6 h-6 text-green-400 bg-white rounded-full shadow-sm" />
                                            </div>
                                        )}

                                        {/* Reservations */}
                                        {dayReservations.map((res, idx) => (
                                            <div 
                                                key={res.id || idx}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleViewDetail(res);
                                                }}
                                                className={`mb-1 last:mb-0 rounded p-1.5 text-xs cursor-pointer shadow-sm border-l-2 transition-all hover:scale-[1.02] ${
                                                    res.status === 'confirmed' ? 'bg-green-100 border-green-500 text-green-900' :
                                                    res.status === 'pending' ? 'bg-yellow-100 border-yellow-500 text-yellow-900' :
                                                    res.status === 'cancelled' ? 'bg-red-100 border-red-500 text-red-900 w-full opacity-60 line-through' :
                                                    'bg-gray-100 border-gray-500 text-gray-900'
                                                }`}
                                            >
                                                <div className="font-bold truncate">{res.customerName || 'Müşteri'}</div>
                                                <div className="truncate text-[10px] opacity-80">{res.tesisName}</div>
                                                <div className="mt-1 font-mono">{res.price ? `₺${res.price}` : ''}</div>
                                            </div>
                                        ))}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                    </div>
                </div>
              </div>
            </div>
            );
          })()}

          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedReservations.map((reservation) => {
                const saha = sahalar.find(s => s.id === reservation.tesisId);
                
                // Müşteri bilgilerini belirle
                let customerName = reservation.customerName || 'Müşteri';
                let customerPhone = reservation.customerPhone || '';
                
                if ((!reservation.customerName || customerName === 'Müşteri') && reservation.players && reservation.players.length > 0) {
                  const organizator = reservation.players.find(p => p.status === 'organizator') || reservation.players[0];
                  if (organizator) {
                     customerName = organizator.name || customerName;
                     customerPhone = organizator.phone || customerPhone;
                  }
                }

                const avatar = customerName.split(' ').map(n => n[0]).join('').toUpperCase();
                
                return (
                  <div key={reservation.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-green-800">{avatar}</span>
                        </div>
                        <div className="ml-3">
                          <h3 className="font-semibold text-gray-900">{customerName}</h3>
                          <p className="text-sm text-gray-500 flex items-center">
                            <Phone className="w-3 h-3 mr-1" />
                            {customerPhone}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        {getStatusIcon(reservation.status)}
                        <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(reservation.status)}`}>
                          {getStatusText(reservation.status)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="w-4 h-4 mr-2" />
                        {saha?.name || reservation.tesisName || 'Bilinmeyen Saha'}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="w-4 h-4 mr-2" />
                        {formatDate(reservation.date)} • {formatTime(reservation.timeSlot)}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <DollarSign className="w-4 h-4 mr-2" />
                        ₺{(reservation.totalAmount || reservation.price || 0).toLocaleString()}
                        {reservation.totalPlayers && (
                          <span className="ml-2 flex items-center">
                            <Users className="w-3 h-3 mr-1" />
                            {reservation.totalPlayers} kişi
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex justify-end space-x-2 mt-4">
                      <button 
                        onClick={() => handleStatusChange(reservation.id, 'confirmed')}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                        title="Onayla"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleStatusChange(reservation.id, 'cancelled')}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        title="İptal Et"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleViewDetail(reservation)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="Detayları Gör"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleEditReservation(reservation)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                        title="Düzenle"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteClick(reservation)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        title="Sil"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Yeni Rezervasyon Modal */}
      {showNewReservationModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Yeni Rezervasyon</h2>
                <button
                  onClick={() => setShowNewReservationModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmitNewReservation} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Saha <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newReservationForm.tesisId}
                    onChange={(e) => handleReservationFormChange('tesisId', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                    required
                  >
                    <option value="">Saha Seçin</option>
                    {sahalar.map(saha => (
                      <option key={saha.id} value={saha.id}>{saha.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Müşteri Adı <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newReservationForm.customerName}
                      onChange={(e) => handleReservationFormChange('customerName', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Telefon
                    </label>
                    <input
                      type="tel"
                      value={newReservationForm.customerPhone}
                      onChange={(e) => handleReservationFormChange('customerPhone', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tarih <span className="text-red-500">*</span>
                    </label>
                    <DatePicker
                      selected={newReservationForm.date ? new Date(newReservationForm.date) : null}
                      onChange={(date) => handleReservationFormChange('date', date ? date.toISOString().split('T')[0] : '')}
                      minDate={new Date()}
                      locale={tr}
                      dateFormat="dd/MM/yyyy"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                      placeholderText="Tarih seçin"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Saat <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      value={newReservationForm.timeSlot}
                      onChange={(e) => handleReservationFormChange('timeSlot', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Oyuncu Sayısı
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={newReservationForm.totalPlayers}
                      onChange={(e) => handleReservationFormChange('totalPlayers', parseInt(e.target.value) || 1)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fiyat (₺)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={newReservationForm.price}
                      onChange={(e) => handleReservationFormChange('price', parseFloat(e.target.value) || 0)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notlar
                  </label>
                  <textarea
                    value={newReservationForm.notes}
                    onChange={(e) => handleReservationFormChange('notes', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  />
                </div>

                <div className="flex justify-end space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowNewReservationModal(false)}
                    className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReservation}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submittingReservation ? 'Oluşturuluyor...' : 'Oluştur'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Detay Modal */}
      {showDetailModal && selectedReservation && (() => {
        // Müşteri bilgilerini belirle
        let customerName = selectedReservation.customerName || 'Müşteri';
        let customerPhone = selectedReservation.customerPhone || '-';
        
        if ((!selectedReservation.customerName || customerName === 'Müşteri') && selectedReservation.players && selectedReservation.players.length > 0) {
          const organizator = selectedReservation.players.find(p => p.status === 'organizator') || selectedReservation.players[0];
          if (organizator) {
             customerName = organizator.name || customerName;
             customerPhone = organizator.phone || customerPhone;
          }
        }

        return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Rezervasyon Detayları</h2>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedReservation(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Rezervasyon Bilgileri */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Rezervasyon Bilgileri</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Rezervasyon No</p>
                    <p className="font-medium text-gray-900">{selectedReservation.id.slice(0, 8).toUpperCase()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Durum</p>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedReservation.status)}`}>
                      {getStatusText(selectedReservation.status)}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Müşteri Adı</p>
                    <p className="font-medium text-gray-900">{customerName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Telefon</p>
                    <p className="font-medium text-gray-900">{customerPhone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Tarih</p>
                    <p className="font-medium text-gray-900">{formatDate(selectedReservation.date)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Saat</p>
                    <p className="font-medium text-gray-900">{formatTime(selectedReservation.timeSlot)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Oyuncu Sayısı</p>
                    <p className="font-medium text-gray-900">{selectedReservation.totalPlayers || 0} kişi</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Toplam Tutar</p>
                    <p className="font-medium text-gray-900">₺{(selectedReservation.totalAmount || selectedReservation.price || 0).toLocaleString()}</p>
                  </div>
                </div>
                {selectedReservation.notes && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-600 mb-1">Notlar</p>
                    <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">{selectedReservation.notes}</p>
                  </div>
                )}
              </div>

              {/* Saha Bilgileri */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Saha Bilgileri</h3>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <MapPin className="w-5 h-5 text-gray-400 mr-2" />
                    <span className="font-medium text-gray-900">{selectedReservation.tesisName || 'Bilinmeyen Saha'}</span>
                  </div>
                  {selectedReservation.tesisLocation && (
                    <div className="flex items-center text-sm text-gray-600 ml-7">
                      {selectedReservation.tesisLocation}
                    </div>
                  )}
                </div>
              </div>

              {/* İşlemler */}
              <div className="flex items-center space-x-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    handleEditReservation(selectedReservation);
                  }}
                  className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <Edit className="w-4 h-4" />
                  <span>Düzenle</span>
                </button>
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    handleDeleteClick(selectedReservation);
                  }}
                  className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Sil</span>
                </button>
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    setSelectedReservation(null);
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Kapat
                </button>
              </div>
            </div>
          </div>
        </div>
        );
      })()}

      {/* Düzenleme Modal */}
      {showEditModal && editingReservation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Rezervasyon Düzenle</h2>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingReservation(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleUpdateReservation} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Müşteri Adı <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={editForm.customerName}
                      onChange={(e) => handleEditFormChange('customerName', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Telefon
                    </label>
                    <input
                      type="tel"
                      value={editForm.customerPhone}
                      onChange={(e) => handleEditFormChange('customerPhone', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tarih <span className="text-red-500">*</span>
                    </label>
                    <DatePicker
                      selected={editForm.date ? new Date(editForm.date) : null}
                      onChange={(date) => handleEditFormChange('date', date ? date.toISOString().split('T')[0] : '')}
                      minDate={new Date()}
                      locale={tr}
                      dateFormat="dd/MM/yyyy"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                      placeholderText="Tarih seçin"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Saat <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      value={editForm.timeSlot}
                      onChange={(e) => handleEditFormChange('timeSlot', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Oyuncu Sayısı
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={editForm.totalPlayers}
                      onChange={(e) => handleEditFormChange('totalPlayers', parseInt(e.target.value) || 1)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fiyat (₺)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editForm.price}
                      onChange={(e) => handleEditFormChange('price', parseFloat(e.target.value) || 0)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Durum
                  </label>
                  <select
                    value={editForm.status}
                    onChange={(e) => handleEditFormChange('status', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  >
                    <option value="pending">Beklemede</option>
                    <option value="confirmed">Onaylandı</option>
                    <option value="cancelled">İptal</option>
                    <option value="completed">Tamamlandı</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notlar
                  </label>
                  <textarea
                    value={editForm.notes}
                    onChange={(e) => handleEditFormChange('notes', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  />
                </div>

                <div className="flex justify-end space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingReservation(null);
                    }}
                    className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    disabled={submittingEdit}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submittingEdit ? 'Güncelleniyor...' : 'Güncelle'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Silme Onay Modal */}
      {showDeleteConfirmModal && reservationToDelete && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 text-center mb-2">Rezervasyonu Sil</h3>
              <p className="text-sm text-gray-600 text-center mb-6">
                Bu rezervasyonu silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
              </p>
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <p className="text-sm font-medium text-gray-900 mb-1">Rezervasyon Detayları:</p>
                <p className="text-sm text-gray-600">{reservationToDelete.customerName || 'Müşteri'}</p>
                <p className="text-sm text-gray-600">{formatDate(reservationToDelete.date)} • {formatTime(reservationToDelete.timeSlot)}</p>
                <p className="text-sm text-gray-600">₺{(reservationToDelete.totalAmount || reservationToDelete.price || 0).toLocaleString()}</p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirmModal(false);
                    setReservationToDelete(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  disabled={deletingReservation}
                >
                  İptal
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={deletingReservation}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deletingReservation ? 'Siliniyor...' : 'Sil'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Rezervasyonlar;
