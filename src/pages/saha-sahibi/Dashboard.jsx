import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getDashboardStats, getTodaySchedule, getRecentReservations, getTesisler, getOwnerBalance, deleteRezervasyon } from '../../services/firestoreService';
import { collection, query, onSnapshot, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import SahaSahibiSidebar from '../../components/SahaSahibiSidebar';
import DashboardHeader from '../../components/DashboardHeader';
import { 
  Calendar, 
  DollarSign, 
  Users, 
  TrendingUp, 
  TrendingDown,
  Download,
  Plus,
  Bell,
  User,
  BarChart3,
  Building2,
  CreditCard,
  Megaphone,
  Trophy,
  FileText,
  Settings,
  Star,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Eye,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { 
  format, addDays, subDays, addWeeks, subWeeks, 
  addMonths, subMonths, startOfDay, endOfDay, 
  startOfWeek, endOfWeek, startOfMonth, endOfMonth, 
  isSameDay, isSameMonth, eachDayOfInterval 
} from 'date-fns';
import { tr } from 'date-fns/locale';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, userData } = useAuth();
  const [activeView, setActiveView] = useState('day');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [reservations, setReservations] = useState([]); // New state for robust scheduler
  const [selectedResDetail, setSelectedResDetail] = useState(null);
  const [selectedSahaId, setSelectedSahaId] = useState(null); // For week view
  const [stats, setStats] = useState({
    todayReservations: 0,
    weeklyIncome: 0,
    occupancyRate: 0,
    activeCustomers: 0,
    totalReservations: 0,
    totalTesisler: 0,
    previousDayReservations: 0,
    previousWeekIncome: 0,
    previousWeekOccupancyRate: 0,
    previousWeekActiveCustomers: 0
  });
  const [todaySchedule, setTodaySchedule] = useState([]); // Kept for legacy compatibility if needed
  const [recentReservations, setRecentReservations] = useState([]);
  const [sahalar, setSahalar] = useState([]);
  const [balance, setBalance] = useState(0);
  const [error, setError] = useState(null);

  // Dashboard verilerini yükle
  useEffect(() => {
    if (!user) return;
    
    loadDashboardData();
    
    // Real-time listeners
    const cleanup = setupRealtimeListeners();
    
    return () => {
      if (cleanup) cleanup();
    };
  }, [user, selectedDate]);

  const loadDashboardData = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const [statsResult, scheduleResult, reservationsResult, tesislerResult, balanceResult] = await Promise.all([
        getDashboardStats(user.uid),
        getTodaySchedule(user.uid),
        getRecentReservations(user.uid, 10),
        getTesisler(user.uid),
        getOwnerBalance(user.uid)
      ]);

      if (statsResult.success) {
        // Önceki dönem verilerini hesapla
        const previousStats = await calculatePreviousPeriodStats(user.uid);
        setStats({
          ...statsResult.data,
          ...previousStats
        });
      }

      if (scheduleResult.success) {
        setTodaySchedule(scheduleResult.data);
      }

      if (reservationsResult.success) {
        setRecentReservations(reservationsResult.data);
      }

      if (tesislerResult.success) {
        setSahalar(tesislerResult.data);
      }

      if (balanceResult.success) {
        setBalance(balanceResult.data.balance || 0);
      }
    } catch (err) {
      console.error('Dashboard veri yükleme hatası:', err);
      setError('Veriler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const calculatePreviousPeriodStats = async (ownerId) => {
    try {
      // Önceki gün rezervasyonları
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayString = yesterday.toISOString().split('T')[0];

      // Önceki hafta geliri
      const today = new Date();
      const lastWeekStart = new Date(today);
      lastWeekStart.setDate(today.getDate() - today.getDay() - 7);
      const lastWeekEnd = new Date(lastWeekStart);
      lastWeekEnd.setDate(lastWeekStart.getDate() + 7);
      
      const lastWeekStartString = lastWeekStart.toISOString().split('T')[0];
      const lastWeekEndString = lastWeekEnd.toISOString().split('T')[0];

      // Tesis ID'lerini al
      const tesislerRef = collection(db, 'tesisler');
      const tesislerQuery = query(
        tesislerRef,
        where('ownerId', '==', ownerId)
      );
      const tesislerSnapshot = await getDocs(tesislerQuery);
      const tesisIds = [];
      tesislerSnapshot.forEach((doc) => {
        tesisIds.push(doc.id);
      });

      if (tesisIds.length === 0) {
        return {
          previousDayReservations: 0,
          previousWeekIncome: 0,
          previousWeekOccupancyRate: 0,
          previousWeekActiveCustomers: 0
        };
      }

      // Önceki gün rezervasyonları
      const yesterdayQuery = query(
        collection(db, 'rezervasyonlar'),
        where('tesisId', 'in', tesisIds),
        where('date', '==', yesterdayString)
      );
      const yesterdaySnapshot = await getDocs(yesterdayQuery);
      const previousDayReservations = yesterdaySnapshot.size;

      // Önceki hafta rezervasyonları
      const lastWeekQuery = query(
        collection(db, 'rezervasyonlar'),
        where('tesisId', 'in', tesisIds)
      );
      const lastWeekSnapshot = await getDocs(lastWeekQuery);
      
      let previousWeekIncome = 0;
      let previousWeekUsedCapacity = 0;
      const previousWeekCustomers = new Set();
      
      lastWeekSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.date >= lastWeekStartString && data.date < lastWeekEndString) {
          if (data.status === 'confirmed' || data.status === 'active') {
            previousWeekIncome += data.totalAmount || data.price || 0;
            previousWeekUsedCapacity += data.playerCount || data.totalPlayers || 1;
            if (data.customerId) {
              previousWeekCustomers.add(data.customerId);
            }
          }
        }
      });

      // Önceki hafta doluluk oranı
      let totalCapacity = 0;
      tesislerSnapshot.forEach((doc) => {
        const tesis = doc.data();
        totalCapacity += tesis.capacity || 0;
      });
      const previousWeekOccupancyRate = totalCapacity > 0 
        ? Math.round((previousWeekUsedCapacity / totalCapacity) * 100) 
        : 0;

      return {
        previousDayReservations,
        previousWeekIncome,
        previousWeekOccupancyRate,
        previousWeekActiveCustomers: previousWeekCustomers.size
      };
    } catch (error) {
      console.error('Önceki dönem istatistikleri hesaplama hatası:', error);
      return {
        previousDayReservations: 0,
        previousWeekIncome: 0,
        previousWeekOccupancyRate: 0,
        previousWeekActiveCustomers: 0
      };
    }
  };

  const setupRealtimeListeners = () => {
    if (!user) return;

    let unsubscribeFunctions = [];
    let innerUnsubscribes = [];

    // Tesis ID'lerini al ve tesisler için listener
    const tesislerQuery = query(
      collection(db, 'tesisler'),
      where('ownerId', '==', user.uid)
    );

    const unsubscribeTesisler = onSnapshot(tesislerQuery, (snapshot) => {
      // Önceki inner listener'ları temizle
      innerUnsubscribes.forEach(unsub => unsub());
      innerUnsubscribes = [];

      const tesisIds = [];
      const tesisler = [];
      snapshot.forEach((doc) => {
        tesisIds.push(doc.id);
        tesisler.push({ id: doc.id, ...doc.data() });
      });
      setSahalar(tesisler);

      if (tesisIds.length > 0) {
        // Seçili tarih rezervasyonları için real-time listener
        const selectedDayStart = new Date(selectedDate);
        selectedDayStart.setHours(0, 0, 0, 0);
        const selectedDayEnd = new Date(selectedDate);
        selectedDayEnd.setHours(23, 59, 59, 999);
        
        const todayReservationsQuery = query(
          collection(db, 'rezervasyonlar'),
          where('tesisId', 'in', tesisIds)
          // orderBy kaldırıldı - client-side filtreleme yapılacak
        );

        const unsubscribeTodayReservations = onSnapshot(todayReservationsQuery, async (snapshot) => {
          // Date helper function
          const getDateFromField = (dateField) => {
            if (!dateField) return null;
            if (dateField.toDate) return dateField.toDate();
            if (typeof dateField === 'string') return new Date(dateField);
            return new Date(dateField);
          };

          // Debug logs for filtering
          // console.log('Filtering for date:', selectedDate.toLocaleDateString('tr-TR'), selectedDate);
          
          const todaysList = [];
          const allList = [];
          
          snapshot.forEach((doc) => {
            const data = doc.data();
            const reservationDate = getDateFromField(data.date);
            const item = { id: doc.id, ...data, parsedDate: reservationDate };
            
            allList.push(item);
            
            if (reservationDate) {
               // Use date-fns isSameDay for robustness if possible, or string compare
               // Using string compare to match existing logic's consistency
               const resDateStr = reservationDate.toLocaleDateString('tr-TR');
               const selDateStr = selectedDate.toLocaleDateString('tr-TR');
               
               if (resDateStr === selDateStr) {
                 todaysList.push(item);
               }
            }
          });
          
          setReservations(allList); // Update comprehensive list for Week/Month views
          setTodaySchedule(todaysList); // Update selected day list for stats/legacy

          // İstatistikleri yeniden yükle
          const statsResult = await getDashboardStats(user.uid);
          if (statsResult.success) {
            const previousStats = await calculatePreviousPeriodStats(user.uid);
            setStats({
              ...statsResult.data,
              ...previousStats
            });
          }
        });
        innerUnsubscribes.push(unsubscribeTodayReservations);

        // Son rezervasyonlar için real-time listener
        const recentReservationsQuery = query(
          collection(db, 'rezervasyonlar'),
          where('tesisId', 'in', tesisIds)
          // orderBy kaldırıldı - client-side sorting yapılacak
        );

        const unsubscribeRecentReservations = onSnapshot(recentReservationsQuery, (snapshot) => {
          const reservations = [];
          snapshot.forEach((doc) => {
            reservations.push({ id: doc.id, ...doc.data() });
          });
          
          // Client-side sorting (createdAt'a göre azalan)
          reservations.sort((a, b) => {
            const getCreatedAt = (item) => {
              if (!item.createdAt) return new Date(0);
              if (item.createdAt.toDate) return item.createdAt.toDate();
              if (typeof item.createdAt === 'string') return new Date(item.createdAt);
              if (item.createdAt.seconds) return new Date(item.createdAt.seconds * 1000);
              return new Date(item.createdAt);
            };
            
            const dateA = getCreatedAt(a);
            const dateB = getCreatedAt(b);
            return dateB - dateA; // Descending order
          });
          
          // Limit uygula
          setRecentReservations(reservations.slice(0, 10));
        });
        innerUnsubscribes.push(unsubscribeRecentReservations);
      }
    });
    unsubscribeFunctions.push(unsubscribeTesisler);

    // Bakiye için real-time listener (users collection'dan)
    const balanceQuery = query(
      collection(db, 'users'),
      where('uid', '==', user.uid),
      limit(1)
    );

    const unsubscribeBalance = onSnapshot(balanceQuery, (snapshot) => {
      snapshot.forEach((doc) => {
        const userData = doc.data();
        setBalance(userData.balance || 0);
      });
    });
    unsubscribeFunctions.push(unsubscribeBalance);

    return () => {
      innerUnsubscribes.forEach(unsub => unsub());
      unsubscribeFunctions.forEach(unsub => unsub());
    };
  };

  const calculateTrend = (current, previous) => {
    if (!previous || previous === 0) {
      return current > 0 ? { value: 100, isPositive: true } : { value: 0, isPositive: false };
    }
    const change = ((current - previous) / previous) * 100;
    return {
      value: Math.abs(Math.round(change)),
      isPositive: change >= 0
    };
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'active': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'confirmed': return 'Onaylandı';
      case 'pending': return 'Beklemede';
      case 'cancelled': return 'İptal';
      case 'active': return 'Aktif';
      default: return 'Bilinmiyor';
    }
  };

  const getScheduleBlockColor = (type) => {
    switch (type) {
      case 'reserved': return 'bg-green-500 text-white';
      case 'available': return 'bg-white text-gray-600 border border-gray-200';
      case 'maintenance': return 'bg-red-500 text-white';
      case 'pending': return 'bg-yellow-500 text-white';
      case 'tournament': return 'bg-blue-500 text-white';
      case 'event': return 'bg-purple-500 text-white';
      default: return 'bg-gray-200 text-gray-600';
    }
  };

  const handleDeleteReservation = async (reservationId) => {
    try {
      const result = await deleteRezervasyon(reservationId);
      if (result.success) {
        setRecentReservations(prev => prev.filter(r => r.id !== reservationId));
        // İstatistikleri yeniden yükle
        const statsResult = await getDashboardStats(user.uid);
        if (statsResult.success) {
          const previousStats = await calculatePreviousPeriodStats(user.uid);
          setStats({
            ...statsResult.data,
            ...previousStats
          });
        }
      }
    } catch (error) {
      console.error('Rezervasyon silme hatası:', error);
    }
  };

  // --- New Scheduler Logic ---

  // Initialize selectedSahaId if needed
  useEffect(() => {
    if (!selectedSahaId && sahalar.length > 0) {
      setSelectedSahaId(sahalar[0].id);
    }
  }, [sahalar, selectedSahaId]);

  const handlePrevDate = () => {
    if (activeView === 'day') setSelectedDate(subDays(selectedDate, 1));
    else if (activeView === 'week') setSelectedDate(subWeeks(selectedDate, 1));
    else setSelectedDate(subMonths(selectedDate, 1));
  };

  const handleNextDate = () => {
    if (activeView === 'day') setSelectedDate(addDays(selectedDate, 1));
    else if (activeView === 'week') setSelectedDate(addWeeks(selectedDate, 1));
    else setSelectedDate(addMonths(selectedDate, 1));
  };

  const getStartHour = (timeSlot) => {
    if (!timeSlot) return -1;
    const clean = timeSlot.toString().replace('.', ':');
    const parts = clean.split(/[:.-]/);
    return parseInt(parts[0], 10);
  };

  const handleSlotClick = (dateStr, hour, tesisId, existingReservation) => {
    if (existingReservation) {
      setSelectedResDetail(existingReservation);
    } else {
      const formattedTime = `${hour.toString().padStart(2, '0')}:00`;
      navigate('/saha-sahibi/rezervasyonlar', {
        state: {
          openNewReservation: true,
          tesisId: tesisId,
          date: dateStr,
          timeSlot: formattedTime
        }
      });
    }
  };

  const renderDayView = () => {
    const hours = Array.from({ length: 16 }, (_, i) => i + 9);
    
    return (
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          <div className="grid" style={{ gridTemplateColumns: `80px repeat(${sahalar.length}, 1fr)` }}>
            <div className="p-4 bg-gray-50 border-b border-r border-gray-200"></div>
            {sahalar.map(saha => (
              <div key={saha.id} className="p-4 bg-gray-50 border-b border-gray-200 text-center font-semibold text-gray-700">
                {saha.name}
              </div>
            ))}
          </div>

          {hours.map(hour => {
            const timeLabel = `${hour.toString().padStart(2, '0')}:00`;
            return (
              <div key={hour} className="grid" style={{ gridTemplateColumns: `80px repeat(${sahalar.length}, 1fr)` }}>
                <div className="p-4 border-b border-r border-gray-100 text-sm text-gray-500 font-medium flex items-center justify-center">
                  {timeLabel}
                </div>
                {sahalar.map(saha => {
                  const res = reservations.find(r => {
                    if (r.tesisId !== saha.id) return false;
                    // Robust date match
                    if (!r.parsedDate) return false;
                    // Compare day
                    if (!isSameDay(r.parsedDate, selectedDate)) return false;
                    // Compare hour
                    return getStartHour(r.timeSlot) === hour;
                  });

                  let cellClass = "hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-100 p-2 min-h-[80px]";
                  let content = (
                      <div className="h-full flex items-center justify-center">
                        <span className="px-3 py-1 bg-white border border-gray-200 text-gray-400 rounded-full text-xs font-medium group-hover:bg-green-50 group-hover:text-green-600 group-hover:border-green-200 transition-colors">
                          Müsait
                        </span>
                      </div>
                  );

                  if (res) {
                    let customerName = res.customerName || 'Müşteri';
                    if ((!res.customerName || customerName === 'Müşteri') && res.players?.length > 0) {
                       const org = res.players.find(p => p.status === 'organizator') || res.players[0];
                       if (org) customerName = org.name || customerName;
                    }
                    cellClass = `bg-green-100 text-green-800 border-green-200 bg-opacity-50 border-b border-white p-2 min-h-[80px] cursor-pointer hover:opacity-90 transition-opacity rounded-md m-1`;
                    if (res.status === 'pending') cellClass = cellClass.replace('green', 'yellow');
                    
                    content = (
                      <div className="h-full flex flex-col justify-center text-center">
                         <div className="font-bold text-sm truncate">{customerName}</div>
                         <div className="text-xs opacity-75">{getStatusText(res.status)}</div>
                      </div>
                    );
                  } else {
                    cellClass += " group";
                  }

                  return (
                    <div 
                      key={saha.id} 
                      className={cellClass}
                      onClick={() => handleSlotClick(format(selectedDate, 'yyyy-MM-dd'), hour, saha.id, res)}
                    >
                      {content}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(selectedDate, { locale: tr, weekStartsOn: 1 });
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const hours = Array.from({ length: 16 }, (_, i) => i + 9);

    return (
      <div className="overflow-x-auto">
        <div className="mb-4 flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">Saha Seç:</span>
          <select 
            value={selectedSahaId || ''} 
            onChange={(e) => setSelectedSahaId(e.target.value)}
            className="border-gray-300 rounded-md text-sm focus:ring-green-500 focus:border-green-500"
          >
            {sahalar.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        <div className="min-w-[800px]">
           <div className="grid grid-cols-8">
            <div className="p-4 bg-gray-50 border-b border-r border-gray-200"></div>
            {weekDays.map(day => (
              <div key={day.toString()} className={`p-3 bg-gray-50 border-b border-gray-200 text-center ${isSameDay(day, new Date()) ? 'bg-green-50' : ''}`}>
                <div className="text-xs text-gray-500 uppercase">{format(day, 'EEEE', { locale: tr })}</div>
                <div className={`font-bold text-gray-900 ${isSameDay(day, new Date()) ? 'text-green-700' : ''}`}>{format(day, 'd MMM', { locale: tr })}</div>
              </div>
            ))}
          </div>

          {hours.map(hour => {
             const timeLabel = `${hour.toString().padStart(2, '0')}:00`;
             return (
              <div key={hour} className="grid grid-cols-8">
                <div className="p-2 border-b border-r border-gray-100 text-sm text-gray-500 font-medium flex items-center justify-center">
                  {timeLabel}
                </div>
                {weekDays.map(day => {
                   const res = reservations.find(r => {
                      if (r.tesisId !== selectedSahaId) return false;
                      if (!r.parsedDate || !isSameDay(r.parsedDate, day)) return false;
                      return getStartHour(r.timeSlot) === hour;
                   });
                   
                   let cellClass = "hover:bg-gray-50 cursor-pointer transition-colors border-b border-r border-gray-100 p-1 min-h-[60px]";
                   let content = null;
                   
                   if (res) {
                     cellClass = `bg-green-100 text-green-800 border-green-200 border border-white p-1 min-h-[60px] cursor-pointer hover:opacity-90 transition-opacity rounded-sm m-0.5 text-xs`;
                     if (res.status === 'pending') cellClass = cellClass.replace('green', 'yellow');
                     content = (
                       <div className="h-full flex flex-col justify-center text-center overflow-hidden">
                         <div className="font-bold truncate">{res.customerName || 'Müşteri'}</div>
                       </div>
                     );
                   }

                   return (
                    <div 
                      key={day.toString()} 
                      className={cellClass}
                      onClick={() => handleSlotClick(format(day, 'yyyy-MM-dd'), hour, selectedSahaId, res)}
                    >
                      {content}
                    </div>
                  );
                })}
              </div>
             );
          })}
        </div>
      </div>
    );
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { locale: tr, weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { locale: tr, weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const weekDays = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

    return (
      <div>
         <div className="grid grid-cols-7 mb-2">
           {weekDays.map(d => (
             <div key={d} className="text-center text-sm font-semibold text-gray-500 py-2">{d}</div>
           ))}
         </div>
         <div className="grid grid-cols-7 gap-1">
           {days.map(day => {
              const dayReservations = reservations.filter(r => 
                r.parsedDate && isSameDay(r.parsedDate, day)
              );
              const isCurrentMonth = isSameMonth(day, selectedDate);
              const isToday = isSameDay(day, new Date());
              return (
                <div 
                  key={day.toString()}
                  onClick={() => {
                    setSelectedDate(day);
                    setActiveView('day');
                  }}
                  className={`min-h-[100px] p-2 rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors 
                    ${isCurrentMonth ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100 text-gray-400'}
                    ${isToday ? 'ring-2 ring-green-500' : ''}
                  `}
                >
                  <div className="flex justify-between items-start">
                    <span className={`text-sm font-medium ${isToday ? 'text-green-600' : ''}`}>
                      {format(day, 'd')}
                    </span>
                    {dayReservations.length > 0 && (
                      <span className="text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded-full">
                        {dayReservations.length}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 space-y-1">
                    {dayReservations.slice(0, 3).map(r => (
                      <div key={r.id} className="text-[10px] bg-blue-50 text-blue-700 px-1 rounded truncate">
                        {r.timeSlot}
                      </div>
                    ))}
                  </div>
                </div>
              );
           })}
         </div>
      </div>
    );
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Dashboard yükleniyor...</p>
        </div>
      </div>
    );
  }

  // Error state
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
            onClick={loadDashboardData}
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
        {/* Header */}
        <DashboardHeader title="Dashboard" />

        {/* Main Content Area */}
        <div className="flex-1 p-6 overflow-y-auto bg-gray-50">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Bakiye</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">₺{balance.toLocaleString('tr-TR')}</p>
                  <div className="flex items-center mt-2">
                    <CreditCard className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-600 ml-1 font-medium">Çekilebilir</span>
                  </div>
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl flex items-center justify-center border border-green-100">
                  <CreditCard className="w-7 h-7 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Bugünkü Rezervasyon</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.todayReservations}</p>
                  {(() => {
                    const trend = calculateTrend(stats.todayReservations, stats.previousDayReservations);
                    return (
                      <div className="flex items-center mt-2">
                        {trend.isPositive ? (
                          <TrendingUp className="w-4 h-4 text-green-500" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-500" />
                        )}
                        <span className={`text-sm ml-1 font-medium ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                          {trend.isPositive ? '↑' : '↓'} {trend.value}% dün
                        </span>
                      </div>
                    );
                  })()}
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl flex items-center justify-center border border-blue-100">
                  <Calendar className="w-7 h-7 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Haftalık Gelir</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">₺{stats.weeklyIncome.toLocaleString()}</p>
                  {(() => {
                    const trend = calculateTrend(stats.weeklyIncome, stats.previousWeekIncome);
                    return (
                      <div className="flex items-center mt-2">
                        {trend.isPositive ? (
                          <TrendingUp className="w-4 h-4 text-green-500" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-500" />
                        )}
                        <span className={`text-sm ml-1 font-medium ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                          {trend.isPositive ? '↑' : '↓'} {trend.value}% geçen hafta
                        </span>
                      </div>
                    );
                  })()}
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl flex items-center justify-center border border-green-100">
                  <DollarSign className="w-7 h-7 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Doluluk Oranı</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.occupancyRate}%</p>
                  {(() => {
                    const trend = calculateTrend(stats.occupancyRate, stats.previousWeekOccupancyRate);
                    return (
                      <div className="flex items-center mt-2">
                        {trend.isPositive ? (
                          <TrendingUp className="w-4 h-4 text-green-500" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-500" />
                        )}
                        <span className={`text-sm ml-1 font-medium ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                          {trend.isPositive ? '↑' : '↓'} {trend.value}% geçen hafta
                        </span>
                      </div>
                    );
                  })()}
                </div>   
                <div className="w-14 h-14 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl flex items-center justify-center border border-purple-100">
                  <BarChart3 className="w-7 h-7 text-purple-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Aktif Müşteri</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.activeCustomers}</p>
                  {(() => {
                    const newCustomers = stats.activeCustomers - stats.previousWeekActiveCustomers;
                    return (
                      <div className="flex items-center mt-2">
                        {newCustomers >= 0 ? (
                          <TrendingUp className="w-4 h-4 text-green-500" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-500" />
                        )}
                        <span className={`text-sm ml-1 font-medium ${newCustomers >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {newCustomers >= 0 ? '↑' : '↓'} {Math.abs(newCustomers)} {newCustomers >= 0 ? 'yeni' : 'azalma'}
                        </span>
                      </div>
                    );
                  })()}
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl flex items-center justify-center border border-orange-100">
                  <Users className="w-7 h-7 text-orange-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Schedule Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8 overflow-hidden">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <button onClick={handlePrevDate} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span>
                      {selectedDate.toLocaleDateString('tr-TR', { 
                        day: 'numeric', 
                        month: 'long', 
                        year: 'numeric' 
                      })}
                    </span>
                    <button onClick={handleNextDate} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </h2>
                  <p className="text-sm text-gray-500 mt-1 ml-9">
                    Günlük Program
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button 
                    onClick={() => setActiveView('day')}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-150 ${
                      activeView === 'day' 
                        ? 'bg-green-600 text-white shadow-md' 
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Gün
                  </button>
                  <button 
                    onClick={() => setActiveView('week')}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-150 ${
                      activeView === 'week' 
                        ? 'bg-green-600 text-white shadow-md' 
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Hafta
                  </button>
                  <button 
                    onClick={() => setActiveView('month')}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-150 ${
                      activeView === 'month' 
                        ? 'bg-green-600 text-white shadow-md' 
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Ay
                  </button>
                </div>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto p-4">
               {activeView === 'day' && renderDayView()}
               {activeView === 'week' && renderWeekView()}
               {activeView === 'month' && renderMonthView()}
            </div>
          </div>

          {/* Recent Reservations */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Son Rezervasyonlar</h2>
                  <p className="text-sm text-gray-500 mt-1">En son oluşturulan rezervasyonlar</p>
                </div>
                <button className="text-green-600 hover:text-green-700 font-semibold transition-colors duration-150">
                  Tümünü Gör
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Müşteri</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Saha</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Tarih & Saat</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Tutar</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Durum</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {recentReservations.length > 0 ? (
                    recentReservations.map((reservation, index) => {
                      const saha = sahalar.find(s => s.id === reservation.tesisId);
                      
                      // Müşteri bilgilerini belirle
                      let customerName = reservation.customerName || 'Müşteri';
                      let customerPhone = reservation.customerPhone || '';
                      
                      // Eğer top-level bilgi yoksa, players array'inden organizatörü bulmaya çalış (eski kayıtlar için)
                      if ((!reservation.customerName || customerName === 'Müşteri') && reservation.players && reservation.players.length > 0) {
                        const organizator = reservation.players.find(p => p.status === 'organizator') || reservation.players[0];
                        if (organizator) {
                           customerName = organizator.name || customerName;
                           customerPhone = organizator.phone || customerPhone;
                        }
                      }
                      
                      const avatar = customerName.split(' ').map(n => n[0]).join('').toUpperCase();
                      
                      // Tarih formatını düzelt
                      const formatDate = (dateValue) => {
                        if (!dateValue) return 'Tarih Yok';
                        
                        let date;
                        if (dateValue && typeof dateValue === 'object' && dateValue.toDate) {
                          date = dateValue.toDate();
                        } else if (dateValue && typeof dateValue === 'object' && dateValue.seconds) {
                           date = new Date(dateValue.seconds * 1000);
                        } else {
                          date = new Date(dateValue);
                        }
                        
                        if (isNaN(date.getTime())) return 'Geçersiz Tarih';

                        return date.toLocaleDateString('tr-TR', {
                          day: 'numeric',
                          month: 'long'
                        });
                      };
                      
                      return (
                        <tr key={reservation.id} className={`transition-all duration-150 hover:bg-gradient-to-r hover:from-gray-50 hover:to-white ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                          <td className="px-6 py-5 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center border border-green-200">
                                <span className="text-sm font-bold text-green-800">{avatar}</span>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-semibold text-gray-900">{customerName}</div>
                                <div className="text-xs text-gray-500">{customerPhone}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {saha?.name || reservation.tesisName || 'Bilinmeyen Saha'}
                            </div>
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {formatDate(reservation.date)}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {reservation.timeSlot}
                            </div>
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap">
                            <div className="text-sm font-bold text-gray-900">
                              ₺{(reservation.totalAmount || reservation.price || 0).toLocaleString()}
                            </div>
                            {reservation.totalPlayers && (
                              <div className="text-xs text-gray-500 mt-0.5">
                                ({reservation.totalPlayers} kişi)
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap">
                            <span className={`inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-full shadow-sm ${getStatusColor(reservation.status)}`}>
                              {getStatusText(reservation.status)}
                            </span>
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              <button 
                                onClick={() => navigate(`/saha-sahibi/rezervasyonlar?reservation=${reservation.id}`)}
                                className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all duration-150" 
                                title="Detay"
                              >
                                <Eye className="w-5 h-5" />
                              </button>
                              <button 
                                onClick={() => navigate(`/saha-sahibi/rezervasyonlar?reservation=${reservation.id}&edit=true`)}
                                className="p-2 text-gray-600 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-all duration-150" 
                                title="Düzenle"
                              >
                                <Edit className="w-5 h-5" />
                              </button>
                              <button 
                                onClick={() => {
                                  if (window.confirm('Bu rezervasyonu silmek istediğinize emin misiniz?')) {
                                    handleDeleteReservation(reservation.id);
                                  }
                                }}
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
                            <Calendar className="w-10 h-10 text-gray-400" />
                          </div>
                          <p className="text-gray-600 font-semibold text-lg mb-1">Rezervasyon bulunamadı</p>
                          <p className="text-gray-400 text-sm">Henüz rezervasyon bulunmuyor</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      
      {/* Reservation Detail Modal */}
      {selectedResDetail && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setSelectedResDetail(null)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-green-100 sm:mx-0 sm:h-10 sm:w-10">
                    <Calendar className="h-6 w-6 text-green-600" aria-hidden="true" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                      Rezervasyon Detayı
                    </h3>
                    <div className="mt-4 space-y-3">
                      <div className="bg-gray-50 p-3 rounded-lg flex justify-between items-center">
                         <span className="text-sm font-medium text-gray-500">Müşteri</span>
                         <span className="text-sm font-bold text-gray-900">{selectedResDetail.customerName || 'İsimsiz'}</span>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg flex justify-between items-center">
                         <span className="text-sm font-medium text-gray-500">Tarih/Saat</span>
                         <span className="text-sm font-bold text-gray-900">
                            {format(selectedResDetail.parsedDate || new Date(), 'd MMMM yyyy', { locale: tr })} - {selectedResDetail.timeSlot}
                         </span>
                      </div>
                       <div className="bg-gray-50 p-3 rounded-lg flex justify-between items-center">
                         <span className="text-sm font-medium text-gray-500">Tutar</span>
                         <span className="text-sm font-bold text-gray-900">₺{(selectedResDetail.price || selectedResDetail.totalAmount || 0).toLocaleString('tr-TR')}</span>
                      </div>
                       <div className="bg-gray-50 p-3 rounded-lg flex justify-between items-center">
                         <span className="text-sm font-medium text-gray-500">Durum</span>
                         <span className={`px-2 py-1 text-xs font-bold rounded-full ${getStatusColor(selectedResDetail.status)}`}>
                            {getStatusText(selectedResDetail.status)}
                         </span>
                      </div>
                      {selectedResDetail.notes && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                           <span className="text-xs font-medium text-gray-500 block mb-1">Notlar</span>
                           <span className="text-sm text-gray-700">{selectedResDetail.notes}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => navigate(`/saha-sahibi/rezervasyonlar?reservation=${selectedResDetail.id}`)}
                >
                  Detaya Git
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => setSelectedResDetail(null)}
                >
                  Kapat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
