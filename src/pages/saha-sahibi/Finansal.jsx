import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getFinancialData, getExpenses, addExpense, updateExpense, deleteExpense, getRevenues, addRevenue, updateRevenue, deleteRevenue, getOwnerBalance, getWalletTransactions, createWithdrawalRequest, getWithdrawalRequestsByOwner, updateUserData } from '../../services/firestoreService';
import { collection, query, onSnapshot, orderBy, where, limit } from 'firebase/firestore';
import { db } from '../../config/firebase';
import SahaSahibiSidebar from '../../components/SahaSahibiSidebar';
import { 
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
  Plus,
  Edit,
  Trash2,
  Eye,
  AlertCircle,
  BarChart3,
  PieChart,
  Target,
  Receipt,
  Users,
  X,
  CreditCard,
  Wallet,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import toast from '../../utils/toast';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import jsPDF from 'jspdf';

// Chart.js kaydet
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const Finansal = () => {
  const { user, userData } = useAuth();
  const [financialData, setFinancialData] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [revenues, setRevenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);


  const [period, setPeriod] = useState('month'); // week, month, year
  const [activeTab, setActiveTab] = useState('overview'); // overview, revenue, expenses, balance
  const [balance, setBalance] = useState(0);
  const [walletTransactions, setWalletTransactions] = useState([]);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showRevenueModal, setShowRevenueModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [editingRevenue, setEditingRevenue] = useState(null);
  
  // Detay ve silme modal state'leri
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailItem, setDetailItem] = useState(null);
  const [detailType, setDetailType] = useState(null); // 'revenue' veya 'expense'
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleteType, setDeleteType] = useState(null); // 'revenue' veya 'expense'
  
  // Çekim talebi state'leri
  const [withdrawalRequests, setWithdrawalRequests] = useState([]);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [withdrawalForm, setWithdrawalForm] = useState({
    amount: '',
    iban: userData?.iban || '',
    fullName: userData?.authorizedPerson || userData?.fullName || ''
  });
  const [withdrawalLoading, setWithdrawalLoading] = useState(false);
  const [ibanEditMode, setIbanEditMode] = useState(false);
  
  // Gider formu
  const [expenseForm, setExpenseForm] = useState({
    title: '',
    amount: '',
    category: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Gelir formu
  const [revenueForm, setRevenueForm] = useState({
    title: '',
    amount: '',
    category: '',
    source: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  const expenseCategories = [
    { id: 'utilities', name: 'Faturalar', icon: '⚡', color: 'text-blue-600 bg-blue-100' },
    { id: 'maintenance', name: 'Bakım', icon: '🔧', color: 'text-orange-600 bg-orange-100' },
    { id: 'staff', name: 'Personel', icon: '👥', color: 'text-green-600 bg-green-100' },
    { id: 'equipment', name: 'Ekipman', icon: '🏃', color: 'text-purple-600 bg-purple-100' },
    { id: 'marketing', name: 'Pazarlama', icon: '📢', color: 'text-pink-600 bg-pink-100' },
    { id: 'insurance', name: 'Sigorta', icon: '🛡️', color: 'text-indigo-600 bg-indigo-100' },
    { id: 'rent', name: 'Kira', icon: '🏠', color: 'text-yellow-600 bg-yellow-100' },
    { id: 'other', name: 'Diğer', icon: '📋', color: 'text-gray-600 bg-gray-100' }
  ];

  const revenueCategories = [
    { id: 'reservations', name: 'Rezervasyonlar', icon: '📅', color: 'text-green-600 bg-green-100' },
    { id: 'events', name: 'Etkinlikler', icon: '🎉', color: 'text-purple-600 bg-purple-100' },
    { id: 'rentals', name: 'Kiralama', icon: '🏢', color: 'text-blue-600 bg-blue-100' },
    { id: 'training', name: 'Eğitim', icon: '📚', color: 'text-orange-600 bg-orange-100' },
    { id: 'sponsorship', name: 'Sponsorluk', icon: '🤝', color: 'text-pink-600 bg-pink-100' },
    { id: 'sales', name: 'Satış', icon: '🛒', color: 'text-yellow-600 bg-yellow-100' },
    { id: 'services', name: 'Hizmet', icon: '🛠️', color: 'text-indigo-600 bg-indigo-100' },
    { id: 'other', name: 'Diğer', icon: '💰', color: 'text-gray-600 bg-gray-100' }
  ];

  useEffect(() => {
    if (!user) return;
    
    loadFinancialData();
    
    let unsubscribeFunctions = [];
    
    if (activeTab === 'balance') {
      loadBalanceData();
      loadWithdrawalRequests();
      const unsubscribe = setupWithdrawalListener();
      if (unsubscribe) unsubscribeFunctions.push(unsubscribe);
    }
    
    // Expenses için real-time listener
    if (activeTab === 'expenses' || activeTab === 'overview') {
      const expensesQuery = query(
        collection(db, 'expenses'),
        where('ownerId', '==', user.uid)
      );
      
      const unsubscribeExpenses = onSnapshot(expensesQuery, (snapshot) => {
        const expensesData = [];
        snapshot.forEach((doc) => {
          expensesData.push({ id: doc.id, ...doc.data() });
        });
        // Client-side sort
        expensesData.sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
          return dateB - dateA;
        });
        setExpenses(expensesData);
      });
      unsubscribeFunctions.push(unsubscribeExpenses);
    }
    
    // Revenues için real-time listener
    if (activeTab === 'revenue' || activeTab === 'overview') {
      const revenuesQuery = query(
        collection(db, 'revenues'),
        where('ownerId', '==', user.uid)
      );
      
      const unsubscribeRevenues = onSnapshot(revenuesQuery, (snapshot) => {
        const revenuesData = [];
        snapshot.forEach((doc) => {
          revenuesData.push({ id: doc.id, ...doc.data() });
        });
        // Client-side sort
        revenuesData.sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
          return dateB - dateA;
        });
        setRevenues(revenuesData);
      });
      unsubscribeFunctions.push(unsubscribeRevenues);
    }
    
    // Balance ve wallet transactions için real-time listener
    if (activeTab === 'balance') {
      try {
        const balanceQuery = query(
          collection(db, 'users'),
          where('uid', '==', user.uid),
          limit(1)
        );
        
        const unsubscribeBalance = onSnapshot(
          balanceQuery, 
          (snapshot) => {
            snapshot.forEach((doc) => {
              const userData = doc.data();
              setBalance(userData.balance || 0);
            });
          },
          (error) => {
            console.error('Bakiye yükleme hatası:', error);
          }
        );
        unsubscribeFunctions.push(unsubscribeBalance);
        
        const walletTransactionsQuery = query(
          collection(db, 'walletTransactions'),
          where('ownerId', '==', user.uid)
        );
        
        const unsubscribeTransactions = onSnapshot(
          walletTransactionsQuery, 
          (snapshot) => {
            const transactions = [];
            snapshot.forEach((doc) => {
              transactions.push({ id: doc.id, ...doc.data() });
            });
            // Client-side sorting by timestamp (descending)
            transactions.sort((a, b) => {
              const aTime = a.timestamp?.toMillis?.() || a.timestamp?.seconds * 1000 || 0;
              const bTime = b.timestamp?.toMillis?.() || b.timestamp?.seconds * 1000 || 0;
              return bTime - aTime;
            });
            // Limit to 50 most recent
            setWalletTransactions(transactions.slice(0, 50));
          },
          (error) => {
            console.error('Wallet transaction yükleme hatası:', error);
          }
        );
        unsubscribeFunctions.push(unsubscribeTransactions);
      } catch (error) {
        console.error('Bakiye sayfası listener kurulum hatası:', error);
      }
    }
    
    return () => {
      unsubscribeFunctions.forEach(unsub => unsub());
    };
  }, [user, period, activeTab]);

  useEffect(() => {
    if (userData) {
      setWithdrawalForm(prev => ({
        ...prev,
        iban: userData.iban ? formatIban(userData.iban) : prev.iban,
        fullName: userData.authorizedPerson || userData.fullName || prev.fullName
      }));
    }
  }, [userData]);

  const loadFinancialData = async () => {
    if (!user) {

      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const [financialResult, expensesResult, revenuesResult] = await Promise.all([
        getFinancialData(user.uid, period),
        getExpenses(user.uid),
        getRevenues(user.uid)
      ]);

      if (financialResult.success) {
        setFinancialData(financialResult.data);
      } else {
        console.error('Finansal veri hatası:', financialResult.error);
        setError(financialResult.error);
      }

      if (expensesResult.success) {
        setExpenses(expensesResult.data);
      } else {
        console.error('Gider veri hatası:', expensesResult.error);
      }

      if (revenuesResult.success) {
        setRevenues(revenuesResult.data);
      } else {
        console.error('Gelir veri hatası:', revenuesResult.error);
      }
    } catch (err) {
      console.error('Finansal veri yükleme hatası:', err);
      setError('Veriler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const loadBalanceData = async () => {
    if (!user) return;
    
    setBalanceLoading(true);
    try {
      const [balanceResult, transactionsResult] = await Promise.all([
        getOwnerBalance(user.uid),
        getWalletTransactions(user.uid, { limit: 50 })
      ]);

      if (balanceResult.success) {
        setBalance(balanceResult.data.balance || 0);
      }

      if (transactionsResult.success) {
        setWalletTransactions(transactionsResult.data);
      }
    } catch (err) {
      console.error('Bakiye veri yükleme hatası:', err);
    } finally {
      setBalanceLoading(false);
    }
  };

  const loadWithdrawalRequests = async () => {
    if (!user) return;
    
    try {
      const result = await getWithdrawalRequestsByOwner(user.uid);
      if (result.success) {
        setWithdrawalRequests(result.data);
      }
    } catch (err) {
      console.error('Çekim talepleri yükleme hatası:', err);
    }
  };

  const setupWithdrawalListener = () => {
    if (!user) return;

    const q = query(
      collection(db, 'withdrawalRequests'),
      where('ownerId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const requests = [];
      snapshot.forEach((doc) => {
        requests.push({ id: doc.id, ...doc.data() });
      });
      // Client-side sorting by createdAt (descending)
      requests.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || a.createdAt?.seconds * 1000 || 0;
        const bTime = b.createdAt?.toMillis?.() || b.createdAt?.seconds * 1000 || 0;
        return bTime - aTime;
      });
      setWithdrawalRequests(requests);
    });

    return unsubscribe;
  };

  const handleCreateWithdrawal = async (e) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Kullanıcı bilgisi bulunamadı');
      return;
    }

    const amount = parseFloat(withdrawalForm.amount);
    
    if (!amount || amount <= 0) {
      toast.error('Geçerli bir tutar girin');
      return;
    }

    if (amount > balance) {
      toast.error('Yetersiz bakiye');
      return;
    }

    if (!withdrawalForm.iban || withdrawalForm.iban.trim() === '') {
      toast.error('IBAN bilgisi gereklidir');
      return;
    }

    if (!withdrawalForm.fullName || withdrawalForm.fullName.trim() === '') {
      toast.error('Ad soyad bilgisi gereklidir');
      return;
    }

    setWithdrawalLoading(true);
    
    try {
      // IBAN'ı temizle (boşlukları kaldır) ve kaydet
      const cleanedIban = withdrawalForm.iban.replace(/\s/g, '');
      
      const result = await createWithdrawalRequest({
        ownerId: user.uid,
        amount: amount,
        iban: cleanedIban,
        fullName: withdrawalForm.fullName.trim()
      });

      if (result.success) {
        toast.success('Çekim talebi başarıyla oluşturuldu');
        
        // IBAN'ı temizle (boşlukları kaldır) ve kaydet
        const cleanedIban = withdrawalForm.iban.replace(/\s/g, '');
        if (ibanEditMode && cleanedIban !== (userData?.iban || '').replace(/\s/g, '')) {
          await updateUserData(user.uid, { iban: cleanedIban });
          toast.success('IBAN bilgisi kaydedildi');
          setIbanEditMode(false);
        }
        
        setWithdrawalForm({
          amount: '',
          iban: userData?.iban ? formatIban(userData.iban) : '',
          fullName: userData?.authorizedPerson || userData?.fullName || ''
        });
        setShowWithdrawalModal(false);
      } else {
        toast.error(result.error || 'Çekim talebi oluşturulamadı');
      }
    } catch (err) {
      console.error('Çekim talebi oluşturma hatası:', err);
      toast.error('İşlem sırasında hata oluştu');
    } finally {
      setWithdrawalLoading(false);
    }
  };

  const handleSaveIban = async () => {
    if (!user || !withdrawalForm.iban || withdrawalForm.iban.trim() === '') {
      toast.error('Geçerli bir IBAN girin');
      return;
    }

    // IBAN'ı temizle (boşlukları kaldır) ve kaydet
    const cleanedIban = withdrawalForm.iban.replace(/\s/g, '');
    
    if (cleanedIban.length < 15 || cleanedIban.length > 34) {
      toast.error('IBAN uzunluğu geçersiz (15-34 karakter arası olmalı)');
      return;
    }

    try {
      await updateUserData(user.uid, { iban: cleanedIban });
      toast.success('IBAN bilgisi kaydedildi');
      setIbanEditMode(false);
      // Formatlanmış halini göster
      setWithdrawalForm(prev => ({ ...prev, iban: formatIban(cleanedIban) }));
    } catch (err) {
      console.error('IBAN kaydetme hatası:', err);
      toast.error('IBAN kaydedilemedi');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'approved':
        return 'Onaylandı';
      case 'rejected':
        return 'Reddedildi';
      case 'pending':
        return 'Beklemede';
      default:
        return 'Bilinmiyor';
    }
  };

  const handleViewDetail = (item, type) => {
    setDetailItem(item);
    setDetailType(type);
    setShowDetailModal(true);
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    
    try {
      const expenseData = {
        ...expenseForm,
        ownerId: user.uid,
        amount: parseFloat(expenseForm.amount)
      };
      
      if (editingExpense) {
        // Güncelleme
        const result = await updateExpense(editingExpense.id, expenseData);
        if (result.success) {
          toast.success('Gider başarıyla güncellendi');
          setExpenseForm({
            title: '',
            amount: '',
            category: '',
            description: '',
            date: new Date().toISOString().split('T')[0]
          });
          setEditingExpense(null);
          setShowExpenseModal(false);
          loadFinancialData();
        } else {
          toast.error(result.error || 'Gider güncellenirken hata oluştu');
        }
      } else {
        // Yeni ekleme
        const result = await addExpense(expenseData);
        if (result.success) {
          toast.success('Gider başarıyla eklendi');
          setExpenseForm({
            title: '',
            amount: '',
            category: '',
            description: '',
            date: new Date().toISOString().split('T')[0]
          });
          setShowExpenseModal(false);
          loadFinancialData();
        } else {
          toast.error(result.error || 'Gider eklenirken hata oluştu');
        }
      }
    } catch (error) {
      console.error('Gider işlemi hatası:', error);
      toast.error('İşlem sırasında hata oluştu');
    }
  };

  const handleAddRevenue = async (e) => {
    e.preventDefault();
    
    try {
      const revenueData = {
        ...revenueForm,
        ownerId: user.uid,
        amount: parseFloat(revenueForm.amount)
      };
      
      if (editingRevenue) {
        // Güncelleme
        const result = await updateRevenue(editingRevenue.id, revenueData);
        if (result.success) {
          toast.success('Gelir başarıyla güncellendi');
          setRevenueForm({
            title: '',
            amount: '',
            category: '',
            source: '',
            description: '',
            date: new Date().toISOString().split('T')[0]
          });
          setEditingRevenue(null);
          setShowRevenueModal(false);
          loadFinancialData();
        } else {
          toast.error(result.error || 'Gelir güncellenirken hata oluştu');
        }
      } else {
        // Yeni ekleme
        const result = await addRevenue(revenueData);
        if (result.success) {
          toast.success('Gelir başarıyla eklendi');
          setRevenueForm({
            title: '',
            amount: '',
            category: '',
            source: '',
            description: '',
            date: new Date().toISOString().split('T')[0]
          });
          setShowRevenueModal(false);
          loadFinancialData();
        } else {
          toast.error(result.error || 'Gelir eklenirken hata oluştu');
        }
      }
    } catch (error) {
      console.error('Gelir işlemi hatası:', error);
      toast.error('İşlem sırasında hata oluştu');
    }
  };

  const handleEditRevenue = (revenue) => {
    setEditingRevenue(revenue);
    setRevenueForm({
      title: revenue.title || '',
      amount: revenue.amount?.toString() || '',
      category: revenue.category || '',
      source: revenue.source || '',
      description: revenue.description || '',
      date: revenue.date || new Date().toISOString().split('T')[0]
    });
    setShowRevenueModal(true);
  };

  const handleEditExpense = (expense) => {
    setEditingExpense(expense);
    setExpenseForm({
      title: expense.title || '',
      amount: expense.amount?.toString() || '',
      category: expense.category || '',
      description: expense.description || '',
      date: expense.date || new Date().toISOString().split('T')[0]
    });
    setShowExpenseModal(true);
  };

  const handleDeleteClick = (item, type) => {
    setItemToDelete(item);
    setDeleteType(type);
    setShowDeleteConfirmModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete || !deleteType) return;

    try {
      let result;
      if (deleteType === 'revenue') {
        result = await deleteRevenue(itemToDelete.id);
      } else {
        result = await deleteExpense(itemToDelete.id);
      }

      if (result.success) {
        toast.success(deleteType === 'revenue' ? 'Gelir başarıyla silindi' : 'Gider başarıyla silindi');
        setShowDeleteConfirmModal(false);
        setItemToDelete(null);
        setDeleteType(null);
        loadFinancialData();
      } else {
        toast.error(result.error || 'Silme işlemi başarısız');
      }
    } catch (error) {
      console.error('Silme hatası:', error);
      toast.error('Silme işlemi sırasında hata oluştu');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Tarih Yok';
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatIban = (iban) => {
    if (!iban) return '';
    // Sadece harf ve rakamları al
    const cleaned = iban.replace(/\s/g, '').toUpperCase();
    // Türk IBAN'ları 26 karakterdir, maksimum 34 karakter (uluslararası standart)
    if (cleaned.length > 34) return cleaned.substring(0, 34);
    
    // Her 4 karakterden sonra boşluk ekle
    const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
    return formatted;
  };

  const handleIbanChange = (value) => {
    // Sadece harf, rakam ve boşluk karakterlerine izin ver
    const cleaned = value.replace(/[^A-Za-z0-9\s]/g, '').toUpperCase();
    const formatted = formatIban(cleaned);
    setWithdrawalForm(prev => ({ ...prev, iban: formatted }));
  };

  const getCategoryInfo = (categoryId) => {
    return expenseCategories.find(cat => cat.id === categoryId) || {
      name: 'Bilinmeyen',
      icon: '❓',
      color: 'text-gray-600 bg-gray-100'
    };
  };

  const getRevenueCategoryInfo = (categoryId) => {
    return revenueCategories.find(cat => cat.id === categoryId) || {
      name: 'Bilinmeyen',
      icon: '❓',
      color: 'text-gray-600 bg-gray-100'
    };
  };

  const getPeriodLabel = () => {
    switch (period) {
      case 'week': return 'Bu Hafta';
      case 'month': return 'Bu Ay';
      case 'year': return 'Bu Yıl';
      default: return 'Bu Ay';
    }
  };

  const handleDownloadReport = () => {
    if (!financialData) return;
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Başlık
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Finansal Rapor', pageWidth / 2, 20, { align: 'center' });
    
    // Periyot bilgisi
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Periyot: ${getPeriodLabel()}`, pageWidth / 2, 30, { align: 'center' });
    
    // Tarih
    doc.text(`Tarih: ${new Date().toLocaleDateString('tr-TR')}`, pageWidth / 2, 35, { align: 'center' });
    
    let yPosition = 50;
    
    // Finansal özet
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Finansal Özet', 20, yPosition);
    yPosition += 10;
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Toplam Gelir: ${formatCurrency(financialData.revenue)}`, 20, yPosition);
    yPosition += 8;
    doc.text(`Toplam Gider: ${formatCurrency(financialData.expenses)}`, 20, yPosition);
    yPosition += 8;
    doc.text(`Net Kar: ${formatCurrency(financialData.profit)}`, 20, yPosition);
    yPosition += 8;
    doc.text(`Kar Marjı: %${financialData.revenue > 0 ? ((financialData.profit / financialData.revenue) * 100).toFixed(1) : '0.0'}`, 20, yPosition);
    yPosition += 8;
    doc.text(`Toplam Rezervasyon: ${financialData.totalReservations}`, 20, yPosition);
    yPosition += 8;
    doc.text(`Ortalama Gelir: ${formatCurrency(financialData.averageRevenue || 0)}`, 20, yPosition);
    yPosition += 15;
    
    // Gider kategorileri
    if (expenses.length > 0) {
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Gider Kategorileri', 20, yPosition);
      yPosition += 10;
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      
      expenseCategories.forEach((category) => {
        const categoryExpenses = expenses.filter(exp => exp.category === category.id);
        const totalAmount = categoryExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
        
        if (totalAmount > 0) {
          doc.text(`${category.name}: ${formatCurrency(totalAmount)} (${categoryExpenses.length} gider)`, 20, yPosition);
          yPosition += 8;
          
          if (yPosition > pageHeight - 30) {
            doc.addPage();
            yPosition = 20;
          }
        }
      });
    }
    
    // Dosyayı indir
    doc.save(`finansal-rapor-${period}-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Finansal veriler yükleniyor...</p>
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
            onClick={loadFinancialData}
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
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Finansal Yönetim</h1>
              <p className="text-gray-500 text-sm mt-0.5">{getPeriodLabel()}</p>
            </div>
            <div className="flex items-center space-x-3">
              {/* Period Selector */}
              {activeTab === 'overview' && (
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className="px-4 py-2 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white shadow-sm font-medium text-gray-700 transition-all duration-150"
                >
                  <option value="week">Bu Hafta</option>
                  <option value="month">Bu Ay</option>
                  <option value="year">Bu Yıl</option>
                </select>
              )}
              
              {activeTab === 'overview' && (
                <button 
                  onClick={handleDownloadReport}
                  className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-xl transition-all duration-150 font-medium"
                >
                  <Download className="w-4 h-4" />
                  <span>Rapor İndir</span>
                </button>
              )}
              
              {(activeTab === 'overview' || activeTab === 'revenue') && (
                <button 
                  onClick={() => setShowRevenueModal(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold shadow-sm transition-all duration-150"
                >
                  <Plus className="w-4 h-4" />
                  <span>Gelir Ekle</span>
                </button>
              )}
              
              {(activeTab === 'overview' || activeTab === 'expenses') && (
                <button 
                  onClick={() => setShowExpenseModal(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 font-semibold shadow-sm transition-all duration-150"
                >
                  <Plus className="w-4 h-4" />
                  <span>Gider Ekle</span>
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Tabs */}
        <div className="bg-white pt-5 border-b border-gray-200 px-6">
          <nav className="flex space-x-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-3 px-4 rounded-t-lg font-semibold text-sm transition-all duration-200 ${
                activeTab === 'overview'
                  ? 'bg-white border-t-2 border-l-2 border-r-2 border-green-600 text-green-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Genel Bakış
            </button>
            <button
              onClick={() => setActiveTab('revenue')}
              className={`py-3 px-4 rounded-t-lg font-semibold text-sm transition-all duration-200 ${
                activeTab === 'revenue'
                  ? 'bg-white border-t-2 border-l-2 border-r-2 border-green-600 text-green-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Gelir Yönetimi
            </button>
            <button
              onClick={() => setActiveTab('expenses')}
              className={`py-3 px-4 rounded-t-lg font-semibold text-sm transition-all duration-200 ${
                activeTab === 'expenses'
                  ? 'bg-white border-t-2 border-l-2 border-r-2 border-green-600 text-green-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Gider Yönetimi
            </button>
            <button
              onClick={() => setActiveTab('balance')}
              className={`py-3 px-4 rounded-t-lg font-semibold text-sm transition-all duration-200 relative ${
                activeTab === 'balance'
                  ? 'bg-white border-t-2 border-l-2 border-r-2 border-green-600 text-green-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Bakiye
              {withdrawalRequests.filter(r => r.status === 'pending').length > 0 && (
                <span className="absolute top-1 right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {withdrawalRequests.filter(r => r.status === 'pending').length}
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 p-6 overflow-y-auto">
          {activeTab === 'overview' && financialData && (
            <div className="space-y-6">
              {/* Financial Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">TOPLAM GELİR</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">
                        {formatCurrency(financialData.revenue)}
                      </p>

                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <DollarSign className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">TOPLAM GİDER</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">
                        {formatCurrency(financialData.expenses)}
                      </p>

                    </div>
                    <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                      <Receipt className="w-6 h-6 text-red-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">NET KAR</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">
                        {formatCurrency(financialData.profit)}
                      </p>
                      <div className="flex items-center mt-2">
                        <Target className="w-4 h-4 text-blue-500" />
                        <span className="text-sm text-blue-600 ml-1">%{financialData.revenue > 0 ? ((financialData.profit / financialData.revenue) * 100).toFixed(1) : '0.0'} kar marjı</span>
                      </div>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <BarChart3 className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">REZERVASYONLAR</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">
                        {financialData.totalReservations}
                      </p>
                      <div className="flex items-center mt-2">
                        <Users className="w-4 h-4 text-purple-500" />
                        <span className="text-sm text-purple-600 ml-1">Ortalama {formatCurrency(financialData.averageRevenue || 0)}</span>
                      </div>
                    </div>
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue Chart */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Gelir Trendi</h3>
                  <div className="h-64">
                    {financialData.dailyData && financialData.dailyData.length > 0 ? (
                      <Line
                        data={{
                          labels: financialData.dailyData.map(item => 
                            new Date(item.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
                          ),
                          datasets: [
                            {
                              label: 'Rezervasyon Geliri',
                              data: financialData.dailyData.map(item => item.reservationRevenue || 0),
                              borderColor: 'rgb(34, 197, 94)',
                              backgroundColor: 'rgba(34, 197, 94, 0.1)',
                              tension: 0.4,
                              fill: false,
                            },
                            {
                              label: 'Manuel Gelir',
                              data: financialData.dailyData.map(item => item.manualRevenue || 0),
                              borderColor: 'rgb(59, 130, 246)',
                              backgroundColor: 'rgba(59, 130, 246, 0.1)',
                              tension: 0.4,
                              fill: false,
                            },
                            {
                              label: 'Toplam Gelir',
                              data: financialData.dailyData.map(item => item.revenue || 0),
                              borderColor: 'rgb(147, 51, 234)',
                              backgroundColor: 'rgba(147, 51, 234, 0.1)',
                              tension: 0.4,
                              fill: true,
                            },
                          ],
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              position: 'top',
                              labels: {
                                usePointStyle: true,
                                padding: 20,
                              },
                            },
                          },
                          scales: {
                            y: {
                              beginAtZero: true,
                              ticks: {
                                callback: function(value) {
                                  return formatCurrency(value);
                                },
                              },
                            },
                          },
                        }}
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg">
                        <div className="text-center">
                          <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                          <p className="text-gray-500">Veri bulunamadı</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Expense Categories Chart */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Gider Dağılımı</h3>
                  <div className="h-64">
                    {expenses.length > 0 ? (
                      <Doughnut
                        data={{
                          labels: expenseCategories.map(cat => cat.name),
                          datasets: [
                            {
                              data: expenseCategories.map(category => {
                                const categoryExpenses = expenses.filter(exp => exp.category === category.id);
                                return categoryExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
                              }),
                              backgroundColor: [
                                'rgba(59, 130, 246, 0.8)',
                                'rgba(249, 115, 22, 0.8)',
                                'rgba(34, 197, 94, 0.8)',
                                'rgba(147, 51, 234, 0.8)',
                                'rgba(236, 72, 153, 0.8)',
                                'rgba(99, 102, 241, 0.8)',
                                'rgba(234, 179, 8, 0.8)',
                                'rgba(107, 114, 128, 0.8)',
                              ],
                              borderColor: [
                                'rgb(59, 130, 246)',
                                'rgb(249, 115, 22)',
                                'rgb(34, 197, 94)',
                                'rgb(147, 51, 234)',
                                'rgb(236, 72, 153)',
                                'rgb(99, 102, 241)',
                                'rgb(234, 179, 8)',
                                'rgb(107, 114, 128)',
                              ],
                              borderWidth: 2,
                            },
                          ],
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              position: 'bottom',
                              labels: {
                                padding: 20,
                                usePointStyle: true,
                              },
                            },
                            tooltip: {
                              callbacks: {
                                label: function(context) {
                                  const label = context.label || '';
                                  const value = context.parsed;
                                  const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                  const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
                                  return `${label}: ${formatCurrency(value)} (${percentage}%)`;
                                },
                              },
                            },
                          },
                        }}
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg">
                        <div className="text-center">
                          <PieChart className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                          <p className="text-gray-500">Gider verisi bulunamadı</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Monthly Revenue Chart */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Aylık Gelir Analizi</h3>
                <div className="h-80">
                  {financialData.monthlyData && financialData.monthlyData.length > 0 ? (
                    <Bar
                      data={{
                        labels: financialData.monthlyData.map(item => {
                          const [year, month] = item.month.split('-');
                          const date = new Date(year, month - 1);
                          return date.toLocaleDateString('tr-TR', { month: 'short', year: 'numeric' });
                        }),
                        datasets: [
                          {
                            label: 'Rezervasyon Geliri',
                            data: financialData.monthlyData.map(item => item.reservationRevenue || 0),
                            backgroundColor: 'rgba(34, 197, 94, 0.8)',
                            borderColor: 'rgb(34, 197, 94)',
                            borderWidth: 1,
                          },
                          {
                            label: 'Manuel Gelir',
                            data: financialData.monthlyData.map(item => item.manualRevenue || 0),
                            backgroundColor: 'rgba(59, 130, 246, 0.8)',
                            borderColor: 'rgb(59, 130, 246)',
                            borderWidth: 1,
                          },
                          {
                            label: 'Rezervasyon Sayısı',
                            data: financialData.monthlyData.map(item => item.reservations || 0),
                            backgroundColor: 'rgba(99, 102, 241, 0.8)',
                            borderColor: 'rgb(99, 102, 241)',
                            borderWidth: 1,
                            yAxisID: 'y1',
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'top',
                          },
                        },
                        scales: {
                          y: {
                            type: 'linear',
                            display: true,
                            position: 'left',
                            beginAtZero: true,
                            ticks: {
                              callback: function(value) {
                                return formatCurrency(value);
                              },
                            },
                          },
                          y1: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            beginAtZero: true,
                            grid: {
                              drawOnChartArea: false,
                            },
                            ticks: {
                              callback: function(value) {
                                return value + ' rezervasyon';
                              },
                            },
                          },
                        },
                      }}
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg">
                      <div className="text-center">
                        <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-500">Aylık veri bulunamadı</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'revenue' && (
            <div className="space-y-6">
              {/* Revenue List */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                  <h3 className="text-lg font-bold text-gray-900">Gelir Listesi</h3>
                  <p className="text-sm text-gray-500 mt-1">Tüm gelir kayıtlarınız</p>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Tarih</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Açıklama</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Kategori</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Kaynak</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Tutar</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {revenues.length > 0 ? (
                        revenues.map((revenue, index) => {
                          const categoryInfo = getRevenueCategoryInfo(revenue.category);
                          
                          return (
                            <tr key={revenue.id} className={`transition-all duration-150 hover:bg-gradient-to-r hover:from-gray-50 hover:to-white ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                              <td className="px-6 py-5 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">
                                  {formatDate(revenue.date)}
                                </div>
                              </td>
                              <td className="px-6 py-5">
                                <div>
                                  <p className="text-sm font-semibold text-gray-900">{revenue.title}</p>
                                  {revenue.description && (
                                    <p className="text-xs text-gray-500 mt-0.5">{revenue.description}</p>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-5 whitespace-nowrap">
                                <span className={`inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-full shadow-sm ${categoryInfo.color}`}>
                                  <span className="mr-1">{categoryInfo.icon}</span>
                                  {categoryInfo.name}
                                </span>
                              </td>
                              <td className="px-6 py-5 whitespace-nowrap">
                                <div className="text-sm text-gray-700">
                                  {revenue.source || '-'}
                                </div>
                              </td>
                              <td className="px-6 py-5 whitespace-nowrap">
                                <div className="text-sm font-bold text-green-600">
                                  {formatCurrency(revenue.amount)}
                                </div>
                              </td>
                              <td className="px-6 py-5 whitespace-nowrap">
                                <div className="flex items-center space-x-2">
                                  <button 
                                    onClick={() => handleViewDetail(revenue, 'revenue')}
                                    className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all duration-150" 
                                    title="Detay"
                                  >
                                    <Eye className="w-5 h-5" />
                                  </button>
                                  <button 
                                    onClick={() => handleEditRevenue(revenue)}
                                    className="p-2 text-gray-600 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-all duration-150" 
                                    title="Düzenle"
                                  >
                                    <Edit className="w-5 h-5" />
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteClick(revenue, 'revenue')}
                                    className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-150" 
                                    title="Sil"
                                  >
                                    <Trash2 className="w-5 h-5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="6" className="px-6 py-16 text-center">
                            <div className="flex flex-col items-center">
                              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                <DollarSign className="w-10 h-10 text-gray-400" />
                              </div>
                              <p className="text-gray-600 font-semibold text-lg mb-1">Gelir bulunamadı</p>
                              <p className="text-gray-400 text-sm">Henüz gelir kaydı bulunmuyor</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'expenses' && (
            <div className="space-y-6">
              {/* Expenses List */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                  <h3 className="text-lg font-bold text-gray-900">Gider Listesi</h3>
                  <p className="text-sm text-gray-500 mt-1">Tüm gider kayıtlarınız</p>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Tarih</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Açıklama</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Kategori</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Tutar</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {expenses.length > 0 ? (
                        expenses.map((expense, index) => {
                          const categoryInfo = getCategoryInfo(expense.category);
                          
                          return (
                            <tr key={expense.id} className={`transition-all duration-150 hover:bg-gradient-to-r hover:from-gray-50 hover:to-white ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                              <td className="px-6 py-5 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">
                                  {formatDate(expense.date)}
                                </div>
                              </td>
                              <td className="px-6 py-5">
                                <div>
                                  <p className="text-sm font-semibold text-gray-900">{expense.title}</p>
                                  {expense.description && (
                                    <p className="text-xs text-gray-500 mt-0.5">{expense.description}</p>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-5 whitespace-nowrap">
                                <span className={`inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-full shadow-sm ${categoryInfo.color}`}>
                                  <span className="mr-1">{categoryInfo.icon}</span>
                                  {categoryInfo.name}
                                </span>
                              </td>
                              <td className="px-6 py-5 whitespace-nowrap">
                                <div className="text-sm font-bold text-red-600">
                                  {formatCurrency(expense.amount)}
                                </div>
                              </td>
                              <td className="px-6 py-5 whitespace-nowrap">
                                <div className="flex items-center space-x-2">
                                  <button 
                                    onClick={() => handleViewDetail(expense, 'expense')}
                                    className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all duration-150" 
                                    title="Detay"
                                  >
                                    <Eye className="w-5 h-5" />
                                  </button>
                                  <button 
                                    onClick={() => handleEditExpense(expense)}
                                    className="p-2 text-gray-600 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-all duration-150" 
                                    title="Düzenle"
                                  >
                                    <Edit className="w-5 h-5" />
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteClick(expense, 'expense')}
                                    className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-150" 
                                    title="Sil"
                                  >
                                    <Trash2 className="w-5 h-5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="5" className="px-6 py-16 text-center">
                            <div className="flex flex-col items-center">
                              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                <Receipt className="w-10 h-10 text-gray-400" />
                              </div>
                              <p className="text-gray-600 font-semibold text-lg mb-1">Gider bulunamadı</p>
                              <p className="text-gray-400 text-sm">Henüz gider kaydı bulunmuyor</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'balance' && (
            <div className="space-y-6">
              {/* Bakiye Özeti */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Mevcut Bakiye</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">
                        {formatCurrency(balance)}
                      </p>
                      <div className="flex items-center mt-2">
                        <CreditCard className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-green-600 ml-1 font-medium">Çekilebilir</span>
                      </div>
                    </div>
                    <div className="w-14 h-14 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl flex items-center justify-center border border-green-100">
                      <Wallet className="w-7 h-7 text-green-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Bu Ay Kazanç</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">
                        {formatCurrency(
                          walletTransactions
                            .filter(t => {
                              const date = t.timestamp?.toDate?.() || new Date(t.createdAt);
                              const now = new Date();
                              return date.getMonth() === now.getMonth() && 
                                     date.getFullYear() === now.getFullYear() &&
                                     t.type === 'reservation_income' &&
                                     t.status === 'completed';
                            })
                            .reduce((sum, t) => sum + (t.amount || 0), 0)
                        )}
                      </p>
                    </div>
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl flex items-center justify-center border border-blue-100">
                      <TrendingUp className="w-7 h-7 text-blue-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Toplam İşlem</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">
                        {walletTransactions.length}
                      </p>
                    </div>
                    <div className="w-14 h-14 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl flex items-center justify-center border border-purple-100">
                      <Receipt className="w-7 h-7 text-purple-600" />
                    </div>
                  </div>
                </div>
              </div>

              {/* IBAN ve Çekim Talebi Bölümü */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Çekim İşlemleri</h3>
                    <p className="text-sm text-gray-500 mt-1">Bakiyenizi IBAN'ınıza çekebilirsiniz</p>
                  </div>
                  <button
                    onClick={() => setShowWithdrawalModal(true)}
                    disabled={balance <= 0}
                    className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-5 h-5" />
                    <span>Çekim Talebi Oluştur</span>
                  </button>
                </div>

                {/* IBAN Girişi */}
                <div className="mb-6 p-5 bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-semibold text-gray-700">
                      IBAN Bilgisi
                    </label>
                    {!ibanEditMode && userData?.iban && (
                      <button
                        onClick={() => setIbanEditMode(true)}
                        className="text-sm text-green-600 hover:text-green-700 font-medium flex items-center space-x-1"
                      >
                        <Edit className="w-4 h-4" />
                        <span>Düzenle</span>
                      </button>
                    )}
                  </div>
                  <div className="flex items-center space-x-3">
                    <input
                      type="text"
                      value={withdrawalForm.iban}
                      onChange={(e) => handleIbanChange(e.target.value)}
                      disabled={!ibanEditMode && userData?.iban}
                      maxLength={34}
                      placeholder="TR00 0000 0000 0000 0000 0000 00"
                      className={`flex-1 px-4 py-3 border-2 rounded-xl font-mono text-sm tracking-wider transition-all duration-150 ${
                        ibanEditMode || !userData?.iban
                          ? 'border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white'
                          : 'border-gray-200 bg-gray-50 text-gray-600'
                      }`}
                    />
                    {ibanEditMode && (
                      <div className="flex space-x-2">
                        <button
                          onClick={handleSaveIban}
                          className="px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 font-semibold transition-all duration-150"
                        >
                          Kaydet
                        </button>
                        <button
                          onClick={() => {
                            setIbanEditMode(false);
                            setWithdrawalForm(prev => ({ ...prev, iban: userData?.iban || '' }));
                          }}
                          className="px-4 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 font-semibold transition-all duration-150"
                        >
                          İptal
                        </button>
                      </div>
                    )}
                  </div>
                  {!userData?.iban && !ibanEditMode && (
                    <p className="text-xs text-gray-500 mt-2">Çekim talebi oluşturmak için IBAN bilginizi girin</p>
                  )}
                </div>

                {/* Çekim Talepleri Listesi */}
                {withdrawalRequests.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-md font-semibold text-gray-900 mb-4">Çekim Talepleri</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                          <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Tarih</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Miktar</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">IBAN</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Durum</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                          {withdrawalRequests.map((request, index) => (
                            <tr key={request.id} className={`transition-all duration-150 hover:bg-gradient-to-r hover:from-gray-50 hover:to-white ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                              <td className="px-6 py-5 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {request.createdAt?.toDate?.()?.toLocaleDateString('tr-TR') || '-'}
                                </div>
                                <div className="text-xs text-gray-500 mt-0.5">
                                  {request.createdAt?.toDate?.()?.toLocaleTimeString('tr-TR') || ''}
                                </div>
                              </td>
                              <td className="px-6 py-5 whitespace-nowrap">
                                <div className="text-sm font-bold text-gray-900">₺{request.amount?.toLocaleString() || 0}</div>
                              </td>
                              <td className="px-6 py-5 whitespace-nowrap">
                                <div className="text-sm font-mono text-gray-700">{request.iban || '-'}</div>
                              </td>
                              <td className="px-6 py-5 whitespace-nowrap">
                                <span className={`inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-full shadow-sm ${getStatusColor(request.status)}`}>
                                  {request.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                                  {request.status === 'approved' && <CheckCircle className="w-3 h-3 mr-1" />}
                                  {request.status === 'rejected' && <XCircle className="w-3 h-3 mr-1" />}
                                  {getStatusText(request.status)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Bakiye Geçmişi */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                  <h3 className="text-lg font-bold text-gray-900">Bakiye Geçmişi</h3>
                  <p className="text-sm text-gray-500 mt-1">Tüm bakiye işlemlerinizin geçmişi</p>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Tarih</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">İşlem Türü</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Tutar</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Açıklama</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Durum</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {balanceLoading ? (
                        <tr>
                          <td colSpan="5" className="px-6 py-16 text-center text-gray-500">
                            <div className="flex flex-col items-center">
                              <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                              <p className="font-medium">Yükleniyor...</p>
                            </div>
                          </td>
                        </tr>
                      ) : walletTransactions.length > 0 ? (
                        walletTransactions.map((transaction, index) => {
                          const transactionDate = transaction.timestamp?.toDate?.() || new Date(transaction.createdAt);
                          const transactionTypeLabels = {
                            'reservation_income': 'Rezervasyon Geliri',
                            'withdrawal': 'Çekim',
                            'refund': 'İade',
                            'adjustment': 'Düzeltme'
                          };
                          
                          return (
                            <tr key={transaction.id} className={`transition-all duration-150 hover:bg-gradient-to-r hover:from-gray-50 hover:to-white ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                              <td className="px-6 py-5 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">
                                  {formatDate(transactionDate.toISOString())}
                                </div>
                                <div className="text-xs text-gray-500 mt-0.5">
                                  {transactionDate.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </td>
                              <td className="px-6 py-5 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">
                                  {transactionTypeLabels[transaction.type] || transaction.type}
                                </div>
                              </td>
                              <td className={`px-6 py-5 whitespace-nowrap text-sm font-bold ${
                                transaction.type === 'reservation_income' ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {transaction.type === 'reservation_income' ? '+' : '-'}
                                {formatCurrency(Math.abs(transaction.amount || 0))}
                              </td>
                              <td className="px-6 py-5">
                                <div className="text-sm text-gray-700 max-w-xs truncate">
                                  {transaction.description || '-'}
                                </div>
                              </td>
                              <td className="px-6 py-5 whitespace-nowrap">
                                <span className={`inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-full shadow-sm ${
                                  transaction.status === 'completed' 
                                    ? 'bg-green-100 text-green-800'
                                    : transaction.status === 'pending'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {transaction.status === 'completed' ? 'Tamamlandı' : 
                                   transaction.status === 'pending' ? 'Beklemede' : 'İptal'}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="5" className="px-6 py-16 text-center">
                            <div className="flex flex-col items-center">
                              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                <CreditCard className="w-10 h-10 text-gray-400" />
                              </div>
                              <p className="text-gray-600 font-semibold text-lg mb-1">İşlem bulunamadı</p>
                              <p className="text-gray-400 text-sm">Henüz bakiye işlemi bulunmuyor</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Revenue Modal */}
      {showRevenueModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingRevenue ? 'Gelir Düzenle' : 'Gelir Ekle'}
                </h2>
                <button
                  onClick={() => {
                    setShowRevenueModal(false);
                    setEditingRevenue(null);
                    setRevenueForm({
                      title: '',
                      amount: '',
                      category: '',
                      source: '',
                      description: '',
                      date: new Date().toISOString().split('T')[0]
                    });
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleAddRevenue} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Açıklama
                  </label>
                  <input
                    type="text"
                    value={revenueForm.title}
                    onChange={(e) => setRevenueForm(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Gelir açıklaması"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tutar
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={revenueForm.amount}
                    onChange={(e) => setRevenueForm(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kategori
                  </label>
                  <select
                    value={revenueForm.category}
                    onChange={(e) => setRevenueForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  >
                    <option value="">Kategori seçin</option>
                    {revenueCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.icon} {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kaynak
                  </label>
                  <input
                    type="text"
                    value={revenueForm.source}
                    onChange={(e) => setRevenueForm(prev => ({ ...prev, source: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Gelir kaynağı"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tarih
                  </label>
                  <input
                    type="date"
                    value={revenueForm.date}
                    onChange={(e) => setRevenueForm(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notlar (Opsiyonel)
                  </label>
                  <textarea
                    value={revenueForm.description}
                    onChange={(e) => setRevenueForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    rows="3"
                    placeholder="Ek notlar..."
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowRevenueModal(false);
                      setEditingRevenue(null);
                      setRevenueForm({
                        title: '',
                        amount: '',
                        category: '',
                        source: '',
                        description: '',
                        date: new Date().toISOString().split('T')[0]
                      });
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {editingRevenue ? 'Güncelle' : 'Kaydet'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingExpense ? 'Gider Düzenle' : 'Gider Ekle'}
                </h2>
                <button
                  onClick={() => {
                    setShowExpenseModal(false);
                    setEditingExpense(null);
                    setExpenseForm({
                      title: '',
                      amount: '',
                      category: '',
                      description: '',
                      date: new Date().toISOString().split('T')[0]
                    });
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleAddExpense} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Açıklama
                  </label>
                  <input
                    type="text"
                    value={expenseForm.title}
                    onChange={(e) => setExpenseForm(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Gider açıklaması"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tutar
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kategori
                  </label>
                  <select
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  >
                    <option value="">Kategori seçin</option>
                    {expenseCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.icon} {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tarih
                  </label>
                  <input
                    type="date"
                    value={expenseForm.date}
                    onChange={(e) => setExpenseForm(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notlar (Opsiyonel)
                  </label>
                  <textarea
                    value={expenseForm.description}
                    onChange={(e) => setExpenseForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    rows="3"
                    placeholder="Ek notlar..."
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowExpenseModal(false);
                      setEditingExpense(null);
                      setExpenseForm({
                        title: '',
                        amount: '',
                        category: '',
                        description: '',
                        date: new Date().toISOString().split('T')[0]
                      });
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    {editingExpense ? 'Güncelle' : 'Kaydet'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Çekim Talebi Modal */}
      {showWithdrawalModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden transform transition-all duration-300">
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                    <Wallet className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white">Çekim Talebi Oluştur</h3>
                </div>
                <button
                  onClick={() => {
                    setShowWithdrawalModal(false);
                    setWithdrawalForm({
                      amount: '',
                      iban: userData?.iban || '',
                      fullName: userData?.authorizedPerson || userData?.fullName || ''
                    });
                  }}
                  className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-colors duration-150"
                >
                  <X className="w-6 h-6 text-white" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-5 border border-gray-200">
                <div className="mb-4">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Mevcut Bakiye</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(balance)}</p>
                </div>
              </div>

              <form onSubmit={handleCreateWithdrawal} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Çekim Miktarı *
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={balance}
                      value={withdrawalForm.amount}
                      onChange={(e) => setWithdrawalForm(prev => ({ ...prev, amount: e.target.value }))}
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-150 bg-white font-semibold"
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Maksimum: {formatCurrency(balance)}</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    IBAN *
                  </label>
                  <input
                    type="text"
                    value={withdrawalForm.iban}
                    onChange={(e) => handleIbanChange(e.target.value)}
                    maxLength={34}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-150 bg-white font-mono text-sm tracking-wider"
                    placeholder="TR00 0000 0000 0000 0000 0000 00"
                    required
                  />
                  {!userData?.iban && (
                    <p className="text-xs text-gray-500 mt-1">IBAN bilginiz kaydedilecektir</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Ad Soyad *
                  </label>
                  <input
                    type="text"
                    value={withdrawalForm.fullName}
                    onChange={(e) => setWithdrawalForm(prev => ({ ...prev, fullName: e.target.value }))}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-150 bg-white"
                    placeholder="Adınız Soyadınız"
                    required
                  />
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div className="text-sm text-yellow-800">
                      <p className="font-semibold mb-1">Önemli Bilgiler</p>
                      <ul className="list-disc list-inside space-y-1 text-xs">
                        <li>Çekim talebiniz admin onayından sonra işleme alınacaktır</li>
                        <li>İşlem süresi 1-3 iş günü arasında değişebilir</li>
                        <li>IBAN bilginizin doğru olduğundan emin olun</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowWithdrawalModal(false);
                      setWithdrawalForm({
                        amount: '',
                        iban: userData?.iban || '',
                        fullName: userData?.authorizedPerson || userData?.fullName || ''
                      });
                    }}
                    className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 font-semibold transition-all duration-150"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    disabled={withdrawalLoading || balance <= 0}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {withdrawalLoading ? 'İşleniyor...' : 'Talep Oluştur'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Detay Modal */}
      {showDetailModal && detailItem && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className={`p-6 ${detailType === 'revenue' ? 'bg-gradient-to-r from-blue-600 to-blue-800' : 'bg-gradient-to-r from-red-600 to-red-800'}`}>
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-white">
                  {detailType === 'revenue' ? 'Gelir Detayı' : 'Gider Detayı'}
                </h3>
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    setDetailItem(null);
                    setDetailType(null);
                  }}
                  className="text-white/80 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-600 mb-1">Açıklama</p>
                    <p className="text-lg font-semibold text-gray-900">{detailItem.title || '-'}</p>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-600 mb-1">Tutar</p>
                    <p className={`text-lg font-bold ${detailType === 'revenue' ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(detailItem.amount || 0)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-600 mb-1">Tarih</p>
                    <p className="text-base font-semibold text-gray-900">
                      {formatDate(detailItem.date)}
                    </p>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-600 mb-1">Kategori</p>
                    <div className="flex items-center space-x-2">
                      {detailType === 'revenue' ? (
                        <>
                          <span className="text-2xl">
                            {getRevenueCategoryInfo(detailItem.category).icon}
                          </span>
                          <span className="text-base font-semibold text-gray-900">
                            {getRevenueCategoryInfo(detailItem.category).name}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-2xl">
                            {getCategoryInfo(detailItem.category).icon}
                          </span>
                          <span className="text-base font-semibold text-gray-900">
                            {getCategoryInfo(detailItem.category).name}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {detailType === 'revenue' && detailItem.source && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-600 mb-1">Kaynak</p>
                    <p className="text-base font-semibold text-gray-900">{detailItem.source}</p>
                  </div>
                )}

                {detailItem.description && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-600 mb-2">Açıklama</p>
                    <p className="text-base text-gray-700 whitespace-pre-wrap">{detailItem.description}</p>
                  </div>
                )}

                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-600 mb-1">Oluşturulma Tarihi</p>
                  <p className="text-base text-gray-700">
                    {detailItem.createdAt?.toDate?.()?.toLocaleString('tr-TR') || 
                     (detailItem.createdAt ? new Date(detailItem.createdAt).toLocaleString('tr-TR') : '-')}
                  </p>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    setDetailItem(null);
                    setDetailType(null);
                  }}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold transition-all duration-150"
                >
                  Kapat
                </button>
                {detailType === 'revenue' ? (
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      handleEditRevenue(detailItem);
                    }}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-all duration-150"
                  >
                    Düzenle
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      handleEditExpense(detailItem);
                    }}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold transition-all duration-150"
                  >
                    Düzenle
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Silme Onay Modal */}
      {showDeleteConfirmModal && itemToDelete && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-red-600" />
                </div>
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
                {deleteType === 'revenue' ? 'Geliri Sil' : 'Gideri Sil'}
              </h3>
              
              <p className="text-gray-600 text-center mb-6">
                Bu {deleteType === 'revenue' ? 'gelir' : 'gider'} kaydını silmek istediğinize emin misiniz? 
                Bu işlem geri alınamaz.
              </p>

              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <p className="text-sm font-medium text-gray-600 mb-1">Açıklama</p>
                <p className="text-base font-semibold text-gray-900">{itemToDelete.title || '-'}</p>
                <p className="text-sm text-gray-600 mt-2">
                  Tutar: <span className={`font-bold ${deleteType === 'revenue' ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(itemToDelete.amount || 0)}
                  </span>
                </p>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirmModal(false);
                    setItemToDelete(null);
                    setDeleteType(null);
                  }}
                  className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 font-semibold transition-all duration-150"
                >
                  İptal
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 font-semibold transition-all duration-150"
                >
                  Sil
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Finansal;
