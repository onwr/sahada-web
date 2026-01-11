import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  addDoc,
  serverTimestamp,
  runTransaction,
  Timestamp,
  arrayUnion,
  arrayRemove,
  writeBatch,
  deleteField,
  increment
} from 'firebase/firestore';
import { 
  updatePassword, 
  reauthenticateWithCredential, 
  EmailAuthProvider,
  getAuth,
  deleteUser
} from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../config/firebase';

const auth = getAuth();

// TÃ¼m oyuncularÄ± getir
export const getPlayers = async (filters = {}) => {
  try {  
    const usersRef = collection(db, 'users');
    let q = query(usersRef); 

    // Filtreler uygulanabilir (Ã¶rneÄŸin ÅŸehir, vb.)
    // Not: Firestore'da text search sÄ±nÄ±rlÄ±dÄ±r, basit filtreler eklenebilir
    if (filters.city) {
      q = query(q, where('city', '==', filters.city));
    }

    const querySnapshot = await getDocs(q);
    const players = [];

    querySnapshot.forEach((doc) => {
      const userData = doc.data();
      // Sadece temel kontrol, detaylÄ± filtreleme component tarafÄ±nda
      players.push({
        id: doc.id,
        ...userData
      });
    });

    return {
      success: true,
      data: players
    };
  } catch (error) {
    console.error('Oyuncular getirme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// KullanÄ±cÄ± verilerini getir - getUserData export edilmiÅŸtir
export const getUserData = async (uid) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      return {
        success: true,
        data: userDoc.data()
      };
    } else {
      return {
        success: false,
        error: 'KullanÄ±cÄ± bulunamadÄ±'
      };
    }
  } catch (error) {
    console.error('KullanÄ±cÄ± verisi getirme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// KullanÄ±cÄ± verilerini gÃ¼ncelle
export const updateUserData = async (uid, userData) => {
  try {
    await updateDoc(doc(db, 'users', uid), {
      ...userData,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('KullanÄ±cÄ± gÃ¼ncelleme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};



// Favori ekle/Ã§Ä±kar
export const toggleFavoriteTesis = async (uid, tesisId) => {
  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const userData = userSnap.data();
      const favorites = userData.favorites || [];
      const isFavorite = favorites.includes(tesisId);

      if (isFavorite) {
        await updateDoc(userRef, {
          favorites: arrayRemove(tesisId)
        });
        return { success: true, isFavorite: false };
      } else {
        await updateDoc(userRef, {
          favorites: arrayUnion(tesisId)
        });
        return { success: true, isFavorite: true };
      }
    }
    return { success: false, error: 'KullanÄ±cÄ± bulunamadÄ±' };
  } catch (error) {
    console.error('Favori iÅŸlem hatasÄ±:', error);
    return { success: false, error: error.message };
  }
};

// Saha sahibi tesis verilerini getir
export const getTesisler = async (ownerId) => {
  try {
    const tesislerRef = collection(db, 'tesisler');
    const q = query(
      tesislerRef, 
      where('ownerId', '==', ownerId)
    );
    
    const querySnapshot = await getDocs(q);
    const tesisler = [];
    
    querySnapshot.forEach((doc) => {
      tesisler.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return {
      success: true,
      data: tesisler
    };
  } catch (error) {
    console.error('Tesisler getirme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Tesis ekle
export const addTesis = async (tesisData) => {
  try {
    const docRef = await addDoc(collection(db, 'tesisler'), {
      ...tesisData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return {
      success: true,
      id: docRef.id
    };
  } catch (error) {
    console.error('Tesis ekleme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Tesis gÃ¼ncelle
export const updateTesis = async (tesisId, tesisData) => {
  try {
    await updateDoc(doc(db, 'tesisler', tesisId), {
      ...tesisData,
      updatedAt: serverTimestamp()
    });
    
    return { success: true };
  } catch (error) {
    console.error('Tesis gÃ¼ncelleme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Tesis sil
export const deleteTesis = async (tesisId) => {
  try {
    await deleteDoc(doc(db, 'tesisler', tesisId));
    return { success: true };
  } catch (error) {
    console.error('Tesis silme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Tek tesis getir
export const getTesis = async (tesisId) => {
  try {
    const tesisDoc = await getDoc(doc(db, 'tesisler', tesisId));
    if (tesisDoc.exists()) {
      return {
        success: true,
        data: {
          id: tesisDoc.id,
          ...tesisDoc.data()
        }
      };
    } else {
      return {
        success: false,
        error: 'Tesis bulunamadÄ±'
      };
    }
  } catch (error) {
    console.error('Tesis getirme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// RezervasyonlarÄ± getir
export const getRezervasyonlar = async (ownerId) => {
  try {
    const rezervasyonlarRef = collection(db, 'rezervasyonlar');
    const q = query(
      rezervasyonlarRef, 
      where('ownerId', '==', ownerId)
    );
    
    const querySnapshot = await getDocs(q);
    const rezervasyonlar = [];
    
    querySnapshot.forEach((doc) => {
      rezervasyonlar.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Client-side sorting by createdAt (descending)
    rezervasyonlar.sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() || a.createdAt?.seconds * 1000 || (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const bTime = b.createdAt?.toMillis?.() || b.createdAt?.seconds * 1000 || (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return bTime - aTime;
    });
    
    return {
      success: true,
      data: rezervasyonlar
    };
  } catch (error) {
    console.error('Rezervasyonlar getirme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Rezervasyon ekle (basit versiyon - saha sahibi manuel rezervasyon iÃ§in)
// Not: Bakiye gÃ¼ncellemesi yapmaz, sadece rezervasyon oluÅŸturur
// Online Ã¶deme ile rezervasyon iÃ§in createRezervasyon veya createRezervasyonWithTransaction kullanÄ±n
export const addRezervasyon = async (rezervasyonData) => {
  try {
    const docRef = await addDoc(collection(db, 'rezervasyonlar'), {
      ...rezervasyonData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return {
      success: true,
      id: docRef.id
    };
  } catch (error) {
    console.error('Rezervasyon ekleme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Rezervasyon gÃ¼ncelle
export const updateRezervasyon = async (rezervasyonId, rezervasyonData) => {
  try {
    await updateDoc(doc(db, 'rezervasyonlar', rezervasyonId), {
      ...rezervasyonData,
      updatedAt: serverTimestamp()
    });
    
    return { success: true };
  } catch (error) {
    console.error('Rezervasyon gÃ¼ncelleme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Rezervasyon sil
export const deleteRezervasyon = async (rezervasyonId) => {
  try {
    const reservationRef = doc(db, 'rezervasyonlar', rezervasyonId);
    const reservationDoc = await getDoc(reservationRef);
    
    if (!reservationDoc.exists()) {
      return {
        success: false,
        error: 'Rezervasyon bulunamadÄ±'
      };
    }
    
    const reservationData = reservationDoc.data();
    
    // EÄŸer rezervasyon confirmed ise, bakiyeden dÃ¼ÅŸ
    if (reservationData.status === 'confirmed' && reservationData.ownerAmount && reservationData.ownerId) {
      await updateOwnerBalance(
        reservationData.ownerId,
        -reservationData.ownerAmount,
        {
          type: 'refund',
          reservationId: rezervasyonId,
          description: `Rezervasyon silme: ${reservationData.tesisName || 'Saha'} - ${reservationData.date || ''} ${reservationData.timeSlot || ''}`,
          status: 'completed'
        }
      );
    }
    
    // Rezervasyonu sil
    await deleteDoc(reservationRef);
    
    return { success: true };
  } catch (error) {
    console.error('Rezervasyon silme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Rezervasyon durumu gÃ¼ncelle
export const updateReservationStatus = async (rezervasyonId, status) => {
  try {
    // Ã–nce rezervasyon verisini getir
    const reservationDoc = await getDoc(doc(db, 'rezervasyonlar', rezervasyonId));
    
    if (!reservationDoc.exists()) {
      return {
        success: false,
        error: 'Rezervasyon bulunamadÄ±'
      };
    }
    
    const reservationData = reservationDoc.data();
    const previousStatus = reservationData.status;
    
    // Rezervasyon durumunu gÃ¼ncelle
    await updateDoc(doc(db, 'rezervasyonlar', rezervasyonId), {
      status: status,
      updatedAt: serverTimestamp()
    });

    // KullanÄ±cÄ±ya bildirim gÃ¶nder (userId varsa)
    if (reservationData.userId && reservationData.userId !== 'unknown') {
        try {
            let title = 'Rezervasyon GÃ¼ncellemesi';
            
            // Tarihi formatla
            let formattedDate = '';
            try {
                if (reservationData.date) {
                    const dateObj = reservationData.date.toDate ? reservationData.date.toDate() : new Date(reservationData.date);
                    formattedDate = dateObj.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
                }
            } catch (e) {
                formattedDate = 'Tarih belirtilmedi';
            }

            let message = `${reservationData.tesisName || 'Saha'} rezervasyonunuzun durumu gÃ¼ncellendi: ${status === 'confirmed' ? 'OnaylandÄ±' : status === 'cancelled' ? 'Ä°ptal Edildi' : status}`;
            
            if (status === 'confirmed') {
                title = 'Rezervasyon OnaylandÄ±';
                message = `${reservationData.tesisName} iÃ§in ${formattedDate} ${reservationData.timeSlot} rezervasyonunuz onaylandÄ±.`;
            } else if (status === 'cancelled') {
                title = 'Rezervasyon Ä°ptal Edildi';
                message = `${reservationData.tesisName} iÃ§in ${formattedDate} ${reservationData.timeSlot} rezervasyonunuz iptal edildi.`;
            } else if (status === 'rejected') {
                title = 'Rezervasyon Reddedildi';
                message = `${reservationData.tesisName} iÃ§in ${formattedDate} ${reservationData.timeSlot} rezervasyonunuz reddedildi.`;
            }

            await addDoc(collection(db, 'notifications'), {
                userId: reservationData.userId,
                type: 'reservation',
                title: title,
                message: message,
                read: false,
                createdAt: serverTimestamp()
            });
        } catch (notifError) {
             console.error('Bildirim gÃ¶nderme hatasÄ± (ihmal edilebilir):', notifError);
        }
    }
    
    // EÄŸer rezervasyon iptal edildiyse ve Ã¶nceden confirmed ise, bakiyeden dÃ¼ÅŸ
    if (status === 'cancelled' && previousStatus === 'confirmed' && reservationData.ownerAmount && reservationData.ownerId) {
      await updateOwnerBalance(
        reservationData.ownerId,
        -reservationData.ownerAmount, // Negatif tutar (dÃ¼ÅŸme)
        {
          type: 'refund',
          reservationId: rezervasyonId,
          description: `Rezervasyon iptali: ${reservationData.tesisName || 'Saha'} - ${reservationData.date || ''} ${reservationData.timeSlot || ''}`,
          status: 'completed'
        }
      );
    }
    
    return { success: true };
  } catch (error) {
    console.error('Rezervasyon durumu gÃ¼ncelleme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// RezervasyonlarÄ± getir (alias)
export const getReservations = getRezervasyonlar;

// MÃ¼ÅŸterileri getir (saha sahibi iÃ§in)
export const getCustomers = async (ownerId) => {
  try {
    // Ã–nce tesisleri getir
    const tesislerRef = collection(db, 'tesisler');
    const tesislerQuery = query(
      tesislerRef,
      where('ownerId', '==', ownerId)
    );
    const tesislerSnapshot = await getDocs(tesislerQuery);
    
    // Tesis ID'lerini al
    const tesisIds = [];
    tesislerSnapshot.forEach((doc) => {
      tesisIds.push(doc.id);
    });

    if (tesisIds.length === 0) {
      return {
        success: true,
        data: []
      };
    }

    // Bu tesislerde rezervasyon yapan mÃ¼ÅŸterileri getir
    const rezervasyonlarRef = collection(db, 'rezervasyonlar');
    const q = query(
      rezervasyonlarRef,
      where('tesisId', 'in', tesisIds)
    );
    
    const querySnapshot = await getDocs(q);
    const customerMap = new Map();
    
    querySnapshot.forEach((doc) => {
      const reservation = doc.data();
      
      // MÃ¼ÅŸteri bilgilerini al
      const customerId = reservation.customerId || reservation.customerName || 'unknown';
      const customerName = reservation.customerName || 'MÃ¼ÅŸteri';
      const customerPhone = reservation.customerPhone || '';
      const customerEmail = reservation.customerEmail || '';
      
      if (customerMap.has(customerId)) {
        // Mevcut mÃ¼ÅŸteriyi gÃ¼ncelle
        const existingCustomer = customerMap.get(customerId);
        existingCustomer.totalReservations += 1;
        existingCustomer.totalSpent += reservation.totalAmount || reservation.price || 0;
        existingCustomer.lastReservation = reservation.date;
        
        // RezervasyonlarÄ± ekle
        existingCustomer.reservations.push({
          id: doc.id,
          date: reservation.date,
          timeSlot: reservation.timeSlot,
          tesisId: reservation.tesisId,
          status: reservation.status,
          amount: reservation.totalAmount || reservation.price || 0
        });
      } else {
        // Yeni mÃ¼ÅŸteri oluÅŸtur
        customerMap.set(customerId, {
          id: customerId,
          name: customerName,
          phone: customerPhone,
          email: customerEmail,
          totalReservations: 1,
          totalSpent: reservation.totalAmount || reservation.price || 0,
          firstReservation: reservation.date,
          lastReservation: reservation.date,
          reservations: [{
            id: doc.id,
            date: reservation.date,
            timeSlot: reservation.timeSlot,
            tesisId: reservation.tesisId,
            status: reservation.status,
            amount: reservation.totalAmount || reservation.price || 0
          }]
        });
      }
    });
    
    // Map'i array'e Ã§evir ve sÄ±rala
    const customers = Array.from(customerMap.values());
    
    // Toplam harcamaya gÃ¶re sÄ±rala
    customers.sort((a, b) => b.totalSpent - a.totalSpent);
    
    return {
      success: true,
      data: customers
    };
  } catch (error) {
    console.error('MÃ¼ÅŸteriler getirme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// MÃ¼ÅŸteri detaylarÄ±nÄ± getir
export const getCustomerDetails = async (customerId, ownerId) => {
  try {
    // Ã–nce tesisleri getir
    const tesislerRef = collection(db, 'tesisler');
    const tesislerQuery = query(
      tesislerRef,
      where('ownerId', '==', ownerId)
    );
    const tesislerSnapshot = await getDocs(tesislerQuery);
    
    // Tesis ID'lerini al
    const tesisIds = [];
    tesislerSnapshot.forEach((doc) => {
      tesisIds.push(doc.id);
    });

    if (tesisIds.length === 0) {
      return {
        success: true,
        data: null
      };
    }

    // Bu mÃ¼ÅŸterinin rezervasyonlarÄ±nÄ± getir
    const rezervasyonlarRef = collection(db, 'rezervasyonlar');
    const q = query(
      rezervasyonlarRef,
      where('tesisId', 'in', tesisIds),
      where('customerId', '==', customerId)
    );
    
    const querySnapshot = await getDocs(q);
    const reservations = [];
    
    querySnapshot.forEach((doc) => {
      reservations.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // RezervasyonlarÄ± tarihe gÃ¶re sÄ±rala
    reservations.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // MÃ¼ÅŸteri bilgilerini hesapla
    const totalReservations = reservations.length;
    const totalSpent = reservations.reduce((sum, res) => sum + (res.totalAmount || res.price || 0), 0);
    const firstReservation = reservations.length > 0 ? reservations[reservations.length - 1].date : null;
    const lastReservation = reservations.length > 0 ? reservations[0].date : null;
    
    const customerData = {
      id: customerId,
      reservations,
      totalReservations,
      totalSpent,
      firstReservation,
      lastReservation,
      averageSpent: totalReservations > 0 ? totalSpent / totalReservations : 0
    };
    
    return {
      success: true,
      data: customerData
    };
  } catch (error) {
    console.error('MÃ¼ÅŸteri detaylarÄ± getirme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Finansal verileri getir
export const getFinancialData = async (ownerId, period = 'month') => {
  try {

    
    // Ã–nce tesisleri getir
    const tesislerRef = collection(db, 'tesisler');
    const tesislerQuery = query(
      tesislerRef,
      where('ownerId', '==', ownerId)
    );
    const tesislerSnapshot = await getDocs(tesislerQuery);
    
    // Tesis ID'lerini al
    const tesisIds = [];
    tesislerSnapshot.forEach((doc) => {
      tesisIds.push(doc.id);
    });



    // Tesis yoksa bile manuel gelirleri ve giderleri getirebiliriz

    // Rezervasyonları getir (eğer tesis varsa)
    let reservations = [];
    if (tesisIds.length > 0) {
      const rezervasyonlarRef = collection(db, 'rezervasyonlar');
      const q = query(
        rezervasyonlarRef,
        where('tesisId', 'in', tesisIds)
      );
      
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        reservations.push({
          id: doc.id,
          ...data
        });
      });
    }
    const now = new Date();
    let startDate, endDate;
    
    switch (period) {
      case 'week':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59); // AyÄ±n son gÃ¼nÃ¼
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59); // YÄ±lÄ±n son gÃ¼nÃ¼
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    }


    const revenuesRef = collection(db, 'revenues');
    const revenuesQuery = query(
      revenuesRef,
      where('ownerId', '==', ownerId)
    );
    
    const revenuesSnapshot = await getDocs(revenuesQuery);
    const revenues = [];
    
    revenuesSnapshot.forEach((doc) => {
      revenues.push({
        id: doc.id,
        ...doc.data()
      });
    });

    // Giderleri getir
    const expensesRef = collection(db, 'expenses');
    const expensesQuery = query(
      expensesRef,
      where('ownerId', '==', ownerId)
    );
    
    const expensesSnapshot = await getDocs(expensesQuery);
    const expenses = [];
    
    expensesSnapshot.forEach((doc) => {
      expenses.push({
        id: doc.id,
        ...doc.data()
      });
    });

    // Tarih aralÄ±ÄŸÄ±na gÃ¶re filtrele
    const filteredRevenues = revenues.filter(rev => {
      const revDate = new Date(rev.date);
      return revDate >= startDate && revDate <= endDate;
    });

    const filteredExpenses = expenses.filter(exp => {
      const expDate = new Date(exp.date);
      return expDate >= startDate && expDate <= endDate;
    });

    // Gelir hesapla (onaylanmış rezervasyonlar + manuel gelirler)
    const confirmedReservations = reservations.filter(res => {
      const resDate = new Date(res.date);
      return (res.status === 'confirmed' || res.status === 'completed') && 
             resDate >= startDate && resDate <= endDate;
    });
    
    const reservationRevenue = confirmedReservations.reduce((sum, res) => 
      sum + (res.totalAmount || res.price || 0), 0
    );

    const manualRevenue = filteredRevenues.reduce((sum, rev) => 
      sum + (rev.amount || 0), 0
    );

    const totalRevenue = reservationRevenue + manualRevenue;
    const totalExpenses = filteredExpenses.reduce((sum, exp) => 
      sum + (exp.amount || 0), 0
    );

    // AylÄ±k veri oluÅŸtur
    const monthlyData = [];
    const monthlyMap = new Map();
    
    // Son 12 ay iÃ§in boÅŸ veri oluÅŸtur
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyMap.set(monthKey, {
        month: monthKey,
        revenue: 0,
        reservationRevenue: 0,
        manualRevenue: 0,
        reservations: 0
      });
    }
    
    // Rezervasyon gelirlerini ekle
    confirmedReservations.forEach(res => {
      const date = new Date(res.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (monthlyMap.has(monthKey)) {
        const monthData = monthlyMap.get(monthKey);
        monthData.reservationRevenue += res.totalAmount || res.price || 0;
        monthData.revenue += res.totalAmount || res.price || 0;
        monthData.reservations += 1;
      }
    });

    // Manuel gelirleri ekle
    filteredRevenues.forEach(rev => {
      const date = new Date(rev.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (monthlyMap.has(monthKey)) {
        const monthData = monthlyMap.get(monthKey);
        monthData.manualRevenue += rev.amount || 0;
        monthData.revenue += rev.amount || 0;
      }
    });
    
    monthlyMap.forEach(value => {
      monthlyData.push(value);
    });
    
    monthlyData.sort((a, b) => a.month.localeCompare(b.month));

    // GÃ¼nlÃ¼k veri oluÅŸtur (son 30 gÃ¼n)
    const dailyData = [];
    const dailyMap = new Map();
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayKey = date.toISOString().split('T')[0];
      dailyMap.set(dayKey, {
        date: dayKey,
        revenue: 0,
        reservationRevenue: 0,
        manualRevenue: 0,
        reservations: 0
      });
    }
    
    // Rezervasyon gelirlerini ekle
    confirmedReservations.forEach(res => {
      const date = new Date(res.date);
      const dayKey = date.toISOString().split('T')[0];
      
      if (dailyMap.has(dayKey)) {
        const dayData = dailyMap.get(dayKey);
        dayData.reservationRevenue += res.totalAmount || res.price || 0;
        dayData.revenue += res.totalAmount || res.price || 0;
        dayData.reservations += 1;
      }
    });

    // Manuel gelirleri ekle
    filteredRevenues.forEach(rev => {
      const date = new Date(rev.date);
      const dayKey = date.toISOString().split('T')[0];
      
      if (dailyMap.has(dayKey)) {
        const dayData = dailyMap.get(dayKey);
        dayData.manualRevenue += rev.amount || 0;
        dayData.revenue += rev.amount || 0;
      }
    });
    
    dailyMap.forEach(value => {
      dailyData.push(value);
    });
    
    dailyData.sort((a, b) => a.date.localeCompare(b.date));

    // Net kar hesapla
    const profit = totalRevenue - totalExpenses;

    return {
      success: true,
      data: {
        revenue: totalRevenue,
        reservationRevenue,
        manualRevenue,
        expenses: totalExpenses,
        profit: profit,
        reservations: confirmedReservations,
        monthlyData: monthlyData,
        dailyData: dailyData,
        totalReservations: confirmedReservations.length,
        averageRevenue: confirmedReservations.length > 0 ? totalRevenue / confirmedReservations.length : 0
      }
    };
  } catch (error) {
    console.error('Finansal veri getirme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Gider ekle
export const addExpense = async (expenseData) => {
  try {
    const docRef = await addDoc(collection(db, 'expenses'), {
      ...expenseData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return {
      success: true,
      id: docRef.id
    };
  } catch (error) {
    console.error('Gider ekleme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Giderleri getir
export const getExpenses = async (ownerId) => {
  try {
    const expensesRef = collection(db, 'expenses');
    const q = query(
      expensesRef,
      where('ownerId', '==', ownerId)
    );
    
    const querySnapshot = await getDocs(q);
    const expenses = [];
    
    querySnapshot.forEach((doc) => {
      expenses.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Client-side sÄ±ralama (tarihe gÃ¶re azalan)
    expenses.sort((a, b) => {
      if (a.createdAt && b.createdAt) {
        return b.createdAt.toDate() - a.createdAt.toDate();
      }
      return 0;
    });
    
    return {
      success: true,
      data: expenses
    };
  } catch (error) {
    console.error('Giderler getirme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Gider gÃ¼ncelle
export const updateExpense = async (expenseId, expenseData) => {
  try {
    await updateDoc(doc(db, 'expenses', expenseId), {
      ...expenseData,
      updatedAt: serverTimestamp()
    });
    
    return { success: true };
  } catch (error) {
    console.error('Gider gÃ¼ncelleme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Gider sil
export const deleteExpense = async (expenseId) => {
  try {
    await deleteDoc(doc(db, 'expenses', expenseId));
    return { success: true };
  } catch (error) {
    console.error('Gider silme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Gelir ekle
export const addRevenue = async (revenueData) => {
  try {
    const docRef = await addDoc(collection(db, 'revenues'), {
      ...revenueData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return {
      success: true,
      id: docRef.id
    };
  } catch (error) {
    console.error('Gelir ekleme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Gelirleri getir
export const getRevenues = async (ownerId) => {
  try {
    const revenuesRef = collection(db, 'revenues');
    const q = query(
      revenuesRef,
      where('ownerId', '==', ownerId)
    );
    
    const querySnapshot = await getDocs(q);
    const revenues = [];
    
    querySnapshot.forEach((doc) => {
      revenues.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Client-side sÄ±ralama (tarihe gÃ¶re azalan)
    revenues.sort((a, b) => {
      if (a.createdAt && b.createdAt) {
        return b.createdAt.toDate() - a.createdAt.toDate();
      }
      return 0;
    });
    
    return {
      success: true,
      data: revenues
    };
  } catch (error) {
    console.error('Gelirler getirme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Gelir gÃ¼ncelle
export const updateRevenue = async (revenueId, revenueData) => {
  try {
    await updateDoc(doc(db, 'revenues', revenueId), {
      ...revenueData,
      updatedAt: serverTimestamp()
    });
    
    return { success: true };
  } catch (error) {
    console.error('Gelir gÃ¼ncelleme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Gelir sil
export const deleteRevenue = async (revenueId) => {
  try {
    await deleteDoc(doc(db, 'revenues', revenueId));
    return { success: true };
  } catch (error) {
    console.error('Gelir silme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// MÃ¼saitlik kontrolÃ¼
export const checkAvailability = async (tesisId, date, timeSlot) => {
  try {
    // Tarihi Timestamp'e Ã§evir (eÄŸer string veya Date ise)
    let dateTimestamp;
    if (date instanceof Timestamp) {
      dateTimestamp = date;
    } else if (date instanceof Date) {
      dateTimestamp = Timestamp.fromDate(date);
    } else if (typeof date === 'string') {
      // YYYY-MM-DD format kontrolÃ¼ ve gÃ¼venli parse
      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        const [year, month, day] = date.split('-').map(Number);
        dateTimestamp = Timestamp.fromDate(new Date(year, month - 1, day));
      } else {
        dateTimestamp = Timestamp.fromDate(new Date(date));
      }
    } else {
      return {
        success: false,
        error: 'GeÃ§ersiz tarih formatÄ±',
        available: false
      };
    }

    const rezervasyonlarRef = collection(db, 'rezervasyonlar');
    const q = query(
      rezervasyonlarRef,
      where('tesisId', '==', tesisId),
      where('date', '==', dateTimestamp),
      where('timeSlot', '==', timeSlot),
      where('status', 'in', ['pending', 'confirmed', 'active', 'pending_payment'])
    );
    
    const querySnapshot = await getDocs(q);
    return {
      success: true,
      available: querySnapshot.empty
    };
  } catch (error) {
    console.error('MÃ¼saitlik kontrolÃ¼ hatasÄ±:', error);
    return {
      success: false,
      error: error.message,
      available: false // Hata durumunda mÃ¼sait deÄŸil olarak dÃ¶ndÃ¼r
    };
  }
};

// Komisyon oranını hesapla (Dynamic)
export const calculateCommissionRate = async (ownerId) => {
  try {
    const settingsResult = await getPlatformSettings();
    if (!settingsResult.success) return 5;

    const settings = settingsResult.data;

    // 1. Özel Kural Kontrolü
    if (settings.specialRules && Array.isArray(settings.specialRules)) {
      const userRule = settings.specialRules.find(r => r.userId === ownerId);
      if (userRule && userRule.commissionRate !== null && userRule.commissionRate !== undefined && userRule.commissionRate !== '') {
        return parseFloat(userRule.commissionRate);
      }
    }

    // 2. Global Standart Oran
    return parseFloat(settings.commission?.baseRate || 5);
  } catch (error) {
    console.error('Komisyon hesaplama hatası:', error);
    return 5;
  }
};

// Rezervasyon oluştur (transaction ile - race condition önleme)
export const createRezervasyonWithTransaction = async (rezervasyonData, tesisId, date, timeSlot) => {
  try {
    // Transaction dışında son bir kez müsaitlik kontrolü yap
    const availabilityCheck = await checkAvailability(tesisId, date, timeSlot);
    if (!availabilityCheck.success || !availabilityCheck.available) {
      return {
        success: false,
        error: 'Seçilen saat dilimi artık müsait değil'
      };
    }

    // Dinamik Komisyon Hesaplama
    let calculatedOwnerAmount = rezervasyonData.ownerAmount;
    let appliedCommissionRate = 0;
    
    if (rezervasyonData.ownerId) {
       const commissionRate = await calculateCommissionRate(rezervasyonData.ownerId);
       appliedCommissionRate = commissionRate;
       const total = rezervasyonData.totalAmount || rezervasyonData.price || 0;
       const commissionAmount = (total * commissionRate) / 100;
       calculatedOwnerAmount = total - commissionAmount;
    }

    // Transaction ile rezervasyonu oluştur (atomic yazma garantisi)
    let reservationId = null;
    await runTransaction(db, async (transaction) => {
      const docRef = doc(collection(db, 'rezervasyonlar'));
      reservationId = docRef.id;
      
      transaction.set(docRef, {
        ...rezervasyonData,
        ownerAmount: calculatedOwnerAmount, // Calculated amount overwrite
        appliedCommissionRate: appliedCommissionRate, // Store rate for history
        status: rezervasyonData?.status ?? 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    });
    
    // Rezervasyon başarıyla oluşturulduysa ve confirmed status'ü varsa, saha sahibi bakiyesini güncelle
    if (rezervasyonData.status === 'confirmed' && calculatedOwnerAmount && rezervasyonData.ownerId) {
      try {
        await updateOwnerBalance(
          rezervasyonData.ownerId,
          calculatedOwnerAmount,
          {
            type: 'reservation_income',
            reservationId: reservationId,
            description: `Rezervasyon geliri: ${rezervasyonData.tesisName || 'Saha'} - ${rezervasyonData.date || ''} ${rezervasyonData.timeSlot || ''}`,
            status: 'completed'
          }
        );
      } catch (balanceError) {
        console.error('Bakiye güncelleme hatası:', balanceError);
        // Bakiye güncelleme hatası rezervasyonu iptal etmez, sadece log'lar
      }
    }
    
    // SAHA SAHİBİNE BİLDİRİM GÖNDER
    if (rezervasyonData.ownerId) {
        try {
            await addDoc(collection(db, 'notifications'), {
                userId: rezervasyonData.ownerId,
                type: 'reservation_new',
                title: 'Yeni Rezervasyon!',
                message: `${rezervasyonData.tesisName || 'Sahanız'} için yeni bir rezervasyon oluşturuldu. (${rezervasyonData.date} - ${rezervasyonData.timeSlot})`,
                read: false,
                createdAt: serverTimestamp()
            });
        } catch (notifError) {
            console.error('Bildirim oluşturma hatası:', notifError);
        }
    }

    return {
      success: true,
      id: reservationId
    };
  } catch (error) {
    console.error('Transaction ile rezervasyon oluşturma hatası:', error);
    return {
      success: false,
      error: error.message || 'Rezervasyon oluşturulamadı'
    };
  }
};

// Rezervasyon oluştur (komisyon hesaplama ve bakiye güncelleme ile)
// Not: Online ödeme ile rezervasyon için createRezervasyonWithTransaction kullanın (race condition önleme için)
export const createRezervasyon = async (rezervasyonData) => {
  try {
    // Dinamik Komisyon Hesaplama
    let calculatedOwnerAmount = rezervasyonData.ownerAmount;
    let appliedCommissionRate = 0;
    
    if (rezervasyonData.ownerId) {
       const commissionRate = await calculateCommissionRate(rezervasyonData.ownerId);
       appliedCommissionRate = commissionRate;
       const total = rezervasyonData.totalAmount || rezervasyonData.price || 0;
       const commissionAmount = (total * commissionRate) / 100;
       calculatedOwnerAmount = total - commissionAmount;
    }

    const docRef = await addDoc(collection(db, 'rezervasyonlar'), {
      ...rezervasyonData,
      ownerAmount: calculatedOwnerAmount,
      appliedCommissionRate: appliedCommissionRate,
      status: rezervasyonData?.status ?? 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    // Rezervasyon başarıyla oluşturulduysa ve confirmed status'ü varsa, saha sahibi bakiyesini güncelle
    if (rezervasyonData.status === 'confirmed' && calculatedOwnerAmount && rezervasyonData.ownerId) {
      try {
        await updateOwnerBalance(
          rezervasyonData.ownerId,
          calculatedOwnerAmount,
          {
            type: 'reservation_income',
            reservationId: docRef.id,
            description: `Rezervasyon geliri: ${rezervasyonData.tesisName || 'Saha'} - ${rezervasyonData.date || ''} ${rezervasyonData.timeSlot || ''}`,
            status: 'completed'
          }
        );
      } catch (balanceError) {
        console.error('Bakiye güncelleme hatası:', balanceError);
        // Bakiye güncelleme hatası rezervasyonu iptal etmez, sadece log'lar
      }
    }
    
    // SAHA SAHİBİNE BİLDİRİM GÖNDER
    if (rezervasyonData.ownerId) {
       try {
           await addDoc(collection(db, 'notifications'), {
               userId: rezervasyonData.ownerId,
               type: 'reservation_new',
               title: 'Yeni Rezervasyon!',
               message: `${rezervasyonData.tesisName || 'Sahanız'} için yeni bir rezervasyon oluşturuldu. (${rezervasyonData.date} - ${rezervasyonData.timeSlot})`,
               read: false,
               createdAt: serverTimestamp()
           });
       } catch (notifError) {
           console.error('Bildirim oluşturma hatası:', notifError);
       }
   }

    return {
      success: true,
      id: docRef.id
    };
  } catch (error) {
    console.error('Rezervasyon oluşturma hatası:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// TÃ¼m tesisleri getir
export const getYakinTesisler = async (lat = null, lng = null, radius = null) => {
  try {
    const tesislerRef = collection(db, 'tesisler');
    const q = query(
      tesislerRef,
      where('isActive', '==', true)
    );
    
    const querySnapshot = await getDocs(q);
    const tesisler = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      let distance = null;
      
      // EÄŸer koordinat verilmiÅŸse mesafe hesapla
      if (lat && lng && data.latitude && data.longitude) {
        distance = calculateDistance(lat, lng, data.latitude, data.longitude);
      }
      
      tesisler.push({
        id: doc.id,
        ...data,
        distance
      });
    });
    
    // Client-side sÄ±ralama (tarihe gÃ¶re)
    tesisler.sort((a, b) => {
      if (a.createdAt && b.createdAt) {
        return b.createdAt.toDate() - a.createdAt.toDate();
      }
      return 0;
    });
    
    return {
      success: true,
      data: tesisler
    };
  } catch (error) {
    console.error('Tesisler getirme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// KullanÄ±cÄ±larÄ± ara (sadece player tipindeki kullanÄ±cÄ±lar)
// KullanÄ±cÄ±larÄ± ara (Optimize edilmiÅŸ)
export const searchUsers = async (queryText) => {
  if (!queryText) return { success: true, data: [] };
  
  try {
    const usersRef = collection(db, 'users');
    const results = new Map();
    
    // 1. Email/Phone tam eÅŸleÅŸme
    const emailQuery = query(usersRef, where('email', '==', queryText));
    const phoneQuery = query(usersRef, where('phone', '==', queryText));
    
    const [emailSnap, phoneSnap] = await Promise.all([
        getDocs(emailQuery),
        getDocs(phoneQuery)
    ]);
    
    emailSnap.forEach(doc => results.set(doc.id, { id: doc.id, ...doc.data() }));
    phoneSnap.forEach(doc => results.set(doc.id, { id: doc.id, ...doc.data() }));
    
    // 2. Ä°sim ile arama (en az 3 karakter)
    if (queryText.length >= 3) {
        // BaÅŸ harfi bÃ¼yÃ¼k yaparak arama (Basit Ã§Ã¶zÃ¼m: Ã‡oÄŸu isim BaÅŸ harfi bÃ¼yÃ¼k kayÄ±tlÄ±dÄ±r)
        // Daha geliÅŸmiÅŸ arama iÃ§in lowercase bir 'searchKey' alanÄ± tutulmalÄ±dÄ±r.
        const titleCase = queryText.charAt(0).toUpperCase() + queryText.slice(1).toLowerCase();
        const endTitle = titleCase + '\uf8ff';
        
        // Sadece 'player' tipindeki kullanÄ±cÄ±larÄ± ara (Ä°steÄŸe baÄŸlÄ±, kaldÄ±rÄ±labilir)
        // Performans iÃ§in ÅŸimdilik userType filtresi eklemiyoruz, kompozit index gerektirebilir.
        // EÄŸer index hatasÄ± verirse userType'Ä± kaldÄ±rÄ±n veya index oluÅŸturun.
        
        const nameQuery = query(usersRef, 
            where('fullName', '>=', titleCase), 
            where('fullName', '<=', endTitle), 
            limit(10)
        );
        
        const nameSnap = await getDocs(nameQuery);
        nameSnap.forEach(doc => results.set(doc.id, { id: doc.id, ...doc.data() }));
    }
    
    // SonuÃ§larÄ± array'e Ã§evir
    return {
      success: true,
      data: Array.from(results.values())
    };
    
  } catch (error) {
    console.error('KullanÄ±cÄ± arama hatasÄ±:', error);
    return { success: false, error: error.message };
  }
};

// Dashboard istatistiklerini getir
export const getDashboardStats = async (ownerId) => {
  try {
    // Ã–nce tesisleri getir
    const tesislerRef = collection(db, 'tesisler');
    const tesislerQuery = query(
      tesislerRef,
      where('ownerId', '==', ownerId)
    );
    const tesislerSnapshot = await getDocs(tesislerQuery);
    
    // Tesis ID'lerini al
    const tesisIds = [];
    tesislerSnapshot.forEach((doc) => {
      tesisIds.push(doc.id);
    });

    if (tesisIds.length === 0) {
      return {
        success: true,
        data: {
          todayReservations: 0,
          weeklyIncome: 0,
          occupancyRate: 0,
          activeCustomers: 0,
          totalReservations: 0,
          totalTesisler: 0
        }
      };
    }

    // TÃ¼m rezervasyonlarÄ± getir (tesisId ile) - client-side filtreleme yapacaÄŸÄ±z
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);
    const todayString = today.toISOString().split('T')[0]; // YYYY-MM-DD formatÄ±

    const rezervasyonlarRef = collection(db, 'rezervasyonlar');
    const allQuery = query(
      rezervasyonlarRef,
      where('tesisId', 'in', tesisIds)
    );

    const allSnapshot = await getDocs(allQuery);
    
    // Date helper function - Timestamp veya string'i Date'e Ã§evir
    const getDateFromField = (dateField) => {
      if (!dateField) return null;
      if (dateField.toDate) return dateField.toDate(); // Timestamp
      if (typeof dateField === 'string') return new Date(dateField); // String
      return new Date(dateField); // DiÄŸer formatlar
    };

    // Bu haftaki rezervasyonlarÄ± hesapla
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    weekEnd.setHours(23, 59, 59, 999);

    // BugÃ¼nkÃ¼ rezervasyon sayÄ±sÄ± (client-side filtreleme)
    let todayReservations = 0;
    const weekReservations = [];
    const allReservations = [];

    allSnapshot.forEach((doc) => {
      const data = doc.data();
      const reservationDate = getDateFromField(data.date);
      
      if (reservationDate) {
        allReservations.push(data);
        
        // BugÃ¼nkÃ¼ rezervasyonlarÄ± filtrele
        if (reservationDate >= today && reservationDate <= todayEnd) {
          todayReservations++;
        }
        
        // Bu haftaki rezervasyonlarÄ± filtrele
        if (reservationDate >= weekStart && reservationDate <= weekEnd) {
          weekReservations.push(data);
        }
      }
    });

    // Bu haftaki gelir (client-side filtreleme)
    let weeklyIncome = 0;
    weekReservations.forEach((data) => {
      if (data.status === 'confirmed' || data.status === 'active') {
        weeklyIncome += data.totalAmount || data.price || 0;
      }
    });

    // Toplam rezervasyon sayÄ±sÄ±
    const totalReservations = allReservations.length;

    // Aktif mÃ¼ÅŸteri sayÄ±sÄ± (benzersiz mÃ¼ÅŸteri ID'leri)
    const uniqueCustomers = new Set();
    allReservations.forEach((data) => {
      if (data.customerId) {
        uniqueCustomers.add(data.customerId);
      }
      // players array'inden de customer ID'leri al
      if (data.players && Array.isArray(data.players)) {
        data.players.forEach(player => {
          if (typeof player === 'string') {
            uniqueCustomers.add(player);
          } else if (player.id) {
            uniqueCustomers.add(player.id);
          }
        });
      }
    });
    const activeCustomers = uniqueCustomers.size;

    // Tesis sayÄ±sÄ±
    const totalTesisler = tesislerSnapshot.size;

    // Doluluk oranÄ± hesapla (bu haftaki rezervasyon / toplam kapasite)
    let totalCapacity = 0;
    let usedCapacity = 0;
    
    tesislerSnapshot.forEach((doc) => {
      const tesis = doc.data();
      totalCapacity += tesis.capacity || 0;
    });

    weekReservations.forEach((rezervasyon) => {
      if (rezervasyon.status === 'confirmed' || rezervasyon.status === 'active') {
        usedCapacity += rezervasyon.playerCount || rezervasyon.totalPlayers || 1;
      }
    });

    const occupancyRate = totalCapacity > 0 ? Math.round((usedCapacity / totalCapacity) * 100) : 0;

    return {
      success: true,
      data: {
        todayReservations,
        weeklyIncome,
        occupancyRate,
        activeCustomers,
        totalReservations,
        totalTesisler
      }
    };
  } catch (error) {
    console.error('Dashboard istatistikleri getirme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// BugÃ¼nkÃ¼ rezervasyon programÄ±nÄ± getir
export const getTodaySchedule = async (ownerId) => {
  try {
    // Ã–nce tesisleri getir
    const tesislerRef = collection(db, 'tesisler');
    const tesislerQuery = query(
      tesislerRef,
      where('ownerId', '==', ownerId)
    );
    const tesislerSnapshot = await getDocs(tesislerQuery);
    
    // Tesis ID'lerini al
    const tesisIds = [];
    tesislerSnapshot.forEach((doc) => {
      tesisIds.push(doc.id);
    });

    if (tesisIds.length === 0) {
      return {
        success: true,
        data: []
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const rezervasyonlarRef = collection(db, 'rezervasyonlar');
    const q = query(
      rezervasyonlarRef,
      where('tesisId', 'in', tesisIds)
    );

    const querySnapshot = await getDocs(q);
    const rezervasyonlar = [];

    // Date helper function - Timestamp veya string'i Date'e Ã§evir
    const getDateFromField = (dateField) => {
      if (!dateField) return null;
      if (dateField.toDate) return dateField.toDate(); // Timestamp
      if (typeof dateField === 'string') return new Date(dateField); // String
      return new Date(dateField); // DiÄŸer formatlar
    };

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const reservationDate = getDateFromField(data.date);
      
      // BugÃ¼nkÃ¼ rezervasyonlarÄ± filtrele (client-side)
      if (reservationDate && reservationDate >= today && reservationDate <= todayEnd) {
        rezervasyonlar.push({
          id: doc.id,
          ...data
        });
      }
    });

    // Client-side sÄ±ralama (zaman dilimine gÃ¶re)
    rezervasyonlar.sort((a, b) => {
      if (a.timeSlot && b.timeSlot) {
        return a.timeSlot.localeCompare(b.timeSlot);
      }
      return 0;
    });

    return {
      success: true,
      data: rezervasyonlar
    };
  } catch (error) {
    console.error('BugÃ¼nkÃ¼ program getirme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// HaftalÄ±k rezervasyon programÄ±nÄ± getir
export const getWeekSchedule = async (ownerId) => {
  try {
    // Ã–nce tesisleri getir
    const tesislerRef = collection(db, 'tesisler');
    const tesislerQuery = query(
      tesislerRef,
      where('ownerId', '==', ownerId)
    );
    const tesislerSnapshot = await getDocs(tesislerQuery);
    
    // Tesis ID'lerini al
    const tesisIds = [];
    tesislerSnapshot.forEach((doc) => {
      tesisIds.push(doc.id);
    });

    if (tesisIds.length === 0) {
      return {
        success: true,
        data: []
      };
    }

    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay()); // HaftanÄ±n baÅŸlangÄ±cÄ± (Pazar)
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7); // HaftanÄ±n sonu (Cumartesi)
    weekEnd.setHours(23, 59, 59, 999);

    const rezervasyonlarRef = collection(db, 'rezervasyonlar');
    const q = query(
      rezervasyonlarRef,
      where('tesisId', 'in', tesisIds)
    );

    const querySnapshot = await getDocs(q);
    const rezervasyonlar = [];

    // Date helper function
    const getDateFromField = (dateField) => {
      if (!dateField) return null;
      if (dateField.toDate) return dateField.toDate();
      if (typeof dateField === 'string') return new Date(dateField);
      return new Date(dateField);
    };

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const reservationDate = getDateFromField(data.date);
      
      // Bu haftaki rezervasyonlarÄ± filtrele (client-side)
      if (reservationDate && reservationDate >= weekStart && reservationDate <= weekEnd) {
        rezervasyonlar.push({
          id: doc.id,
          ...data
        });
      }
    });

    // Client-side sÄ±ralama (tarih ve zaman dilimine gÃ¶re)
    rezervasyonlar.sort((a, b) => {
      const dateA = getDateFromField(a.date);
      const dateB = getDateFromField(b.date);
      
      if (dateA && dateB) {
        const dateDiff = dateA - dateB;
        if (dateDiff !== 0) return dateDiff;
        
        // AynÄ± tarihte ise zaman dilimine gÃ¶re sÄ±rala
        if (a.timeSlot && b.timeSlot) {
          return a.timeSlot.localeCompare(b.timeSlot);
        }
      }
      return 0;
    });

    return {
      success: true,
      data: rezervasyonlar
    };
  } catch (error) {
    console.error('HaftalÄ±k program getirme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// AylÄ±k rezervasyon programÄ±nÄ± getir
export const getMonthSchedule = async (ownerId) => {
  try {
    // Ã–nce tesisleri getir
    const tesislerRef = collection(db, 'tesisler');
    const tesislerQuery = query(
      tesislerRef,
      where('ownerId', '==', ownerId)
    );
    const tesislerSnapshot = await getDocs(tesislerQuery);
    
    // Tesis ID'lerini al
    const tesisIds = [];
    tesislerSnapshot.forEach((doc) => {
      tesisIds.push(doc.id);
    });

    if (tesisIds.length === 0) {
      return {
        success: true,
        data: []
      };
    }

    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    monthStart.setHours(0, 0, 0, 0);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0); // AyÄ±n son gÃ¼nÃ¼
    monthEnd.setHours(23, 59, 59, 999);

    const rezervasyonlarRef = collection(db, 'rezervasyonlar');
    const q = query(
      rezervasyonlarRef,
      where('tesisId', 'in', tesisIds)
    );

    const querySnapshot = await getDocs(q);
    const rezervasyonlar = [];

    // Date helper function
    const getDateFromField = (dateField) => {
      if (!dateField) return null;
      if (dateField.toDate) return dateField.toDate();
      if (typeof dateField === 'string') return new Date(dateField);
      return new Date(dateField);
    };

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const reservationDate = getDateFromField(data.date);
      
      // Bu ayki rezervasyonlarÄ± filtrele (client-side)
      if (reservationDate && reservationDate >= monthStart && reservationDate <= monthEnd) {
        rezervasyonlar.push({
          id: doc.id,
          ...data
        });
      }
    });

    // Client-side sÄ±ralama (tarih ve zaman dilimine gÃ¶re)
    rezervasyonlar.sort((a, b) => {
      const dateA = getDateFromField(a.date);
      const dateB = getDateFromField(b.date);
      
      if (dateA && dateB) {
        const dateDiff = dateA - dateB;
        if (dateDiff !== 0) return dateDiff;
        
        // AynÄ± tarihte ise zaman dilimine gÃ¶re sÄ±rala
        if (a.timeSlot && b.timeSlot) {
          return a.timeSlot.localeCompare(b.timeSlot);
        }
      }
      return 0;
    });

    return {
      success: true,
      data: rezervasyonlar
    };
  } catch (error) {
    console.error('AylÄ±k program getirme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Belirli bir tesisin belirli bir tarih iÃ§in rezervasyonlarÄ±nÄ± getir
export const getReservationsByTesisId = async (tesisId, date) => {
  try {
    const rezervasyonlarRef = collection(db, 'rezervasyonlar');
    
    // Tarih formatÄ±nÄ± ayarla (string olarak geliyorsa)
    let dateStart, dateEnd;
    
    // EÄŸer string ise Date objesine Ã§evir
    // Tarihi string olarak 'YYYY-MM-DD' bekliyoruz, ama firestore'da Date/Timestamp veya String olabilir
    // En gÃ¼venlisi tÃ¼mÃ¼nÃ¼ Ã§ekip client-side filtrelemek ya da firestore formatÄ±na uydurmak
    // Åimdilik client-side filter yapalÄ±m daha esnek olsun Ã§Ã¼nkÃ¼ tarih formatlarÄ± karÄ±ÅŸÄ±k olabilir
    
    const q = query(
      rezervasyonlarRef,
      where('tesisId', '==', tesisId),
      where('status', 'in', ['confirmed', 'completed', 'pending', 'pending_payment']) // Ä°ptal edilenleri alma
    );
    
    const querySnapshot = await getDocs(q);
    const reservations = [];
    
    // Hedef tarih
    const targetDateStr = date instanceof Date ? date.toISOString().split('T')[0] : date;

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      
      // Tarih kontrolÃ¼
      let resDateStr = '';
      if (data.date && data.date.toDate) {
        resDateStr = data.date.toDate().toISOString().split('T')[0];
      } else if (typeof data.date === 'string') {
        resDateStr = data.date.split('T')[0];
      }
      
      if (resDateStr === targetDateStr) {
        reservations.push({
          id: doc.id,
          ...data
        });
      }
    });

    return {
      success: true,
      data: reservations
    };
  } catch (error) {
    console.error('Tesis rezervasyonlarÄ± getirme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};



// Son rezervasyonlarÄ± getir
export const getRecentReservations = async (ownerId, limitCount = 10) => {
  try {
    // Ã–nce tesisleri getir
    const tesislerRef = collection(db, 'tesisler');
    const tesislerQuery = query(
      tesislerRef,
      where('ownerId', '==', ownerId)
    );
    const tesislerSnapshot = await getDocs(tesislerQuery);
    
    // Tesis ID'lerini al
    const tesisIds = [];
    tesislerSnapshot.forEach((doc) => {
      tesisIds.push(doc.id);
    });

    if (tesisIds.length === 0) {
      return {
        success: true,
        data: []
      };
    }

    const rezervasyonlarRef = collection(db, 'rezervasyonlar');
    const q = query(
      rezervasyonlarRef,
      where('tesisId', 'in', tesisIds)
    );

    const querySnapshot = await getDocs(q);
    const rezervasyonlar = [];

    querySnapshot.forEach((doc) => {
      rezervasyonlar.push({
        id: doc.id,
        ...doc.data()
      });
    });

    // Client-side sÄ±ralama (tarihe gÃ¶re azalan)
    rezervasyonlar.sort((a, b) => {
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
    const limitedRezervasyonlar = rezervasyonlar.slice(0, limitCount);

    return {
      success: true,
      data: limitedRezervasyonlar
    };
  } catch (error) {
    console.error('Son rezervasyonlar getirme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Rapor verilerini getir
export const getReportData = async (ownerId, startDate, endDate) => {
  try {
    // Ã–nce tesisleri getir
    const tesislerRef = collection(db, 'tesisler');
    const tesislerQuery = query(
      tesislerRef,
      where('ownerId', '==', ownerId)
    );
    const tesislerSnapshot = await getDocs(tesislerQuery);
    
    // Tesis ID'lerini al
    const tesisIds = [];
    const tesisler = [];
    tesislerSnapshot.forEach((doc) => {
      tesisIds.push(doc.id);
      tesisler.push({
        id: doc.id,
        ...doc.data()
      });
    });

    if (tesisIds.length === 0) {
      return {
        success: true,
        data: getEmptyReportData()
      };
    }

    // RezervasyonlarÄ± getir
    const rezervasyonlarRef = collection(db, 'rezervasyonlar');
    const q = query(
      rezervasyonlarRef,
      where('tesisId', 'in', tesisIds)
    );
    
    const querySnapshot = await getDocs(q);
    const reservations = [];
    
    querySnapshot.forEach((doc) => {
      reservations.push({
        id: doc.id,
        ...doc.data()
      });
    });

    // Tarih aralığına göre filtrele (Mevcut Dönem)
    const start = new Date(startDate);
    const end = new Date(endDate);
    // Saat ayarı yap
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const filteredReservations = reservations.filter(res => {
      const resDate = new Date(res.date);
      return resDate >= start && resDate <= end;
    });

    // Önceki dönem tarih aralığını hesapla
    const duration = end.getTime() - start.getTime();
    const previousStart = new Date(start.getTime() - duration - 1); 
    const previousEnd = new Date(start.getTime() - 1);

    // Tarih aralığına göre filtrele (Önceki Dönem)
    const previousReservations = reservations.filter(res => {
      const resDate = new Date(res.date);
      return resDate >= previousStart && resDate <= previousEnd;
    });

    // Rapor verilerini hesapla
    const reportData = calculateReportMetrics(filteredReservations, previousReservations, tesisler, startDate, endDate);

    return {
      success: true,
      data: reportData
    };
  } catch (error) {
    console.error('Rapor veri getirme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// BoÅŸ rapor verisi
function getEmptyReportData() {
  return {
    totalRevenue: 0,
    totalReservations: 0,
    occupancyRate: 0,
    averagePrice: 0,
    activeCustomers: 0,
    cancellationRate: 0,
    weeklyRevenue: [],
    hourlyOccupancy: [],
    customerSegments: [],
    paymentMethods: [],
    sahaPerformance: [],
    topCustomers: [],
    revenueGrowth: 0,
    reservationGrowth: 0,
    occupancyGrowth: 0,
    priceGrowth: 0,
    customerGrowth: 0,
    cancellationGrowth: 0
  };
}

// Rapor metriklerini hesapla
function calculateReportMetrics(currentReservations, previousReservations, tesisler, startDate, endDate) {
  const reservations = currentReservations;
  // Temel metrikler
  const confirmedReservations = reservations.filter(res => 
    res.status === 'confirmed' || res.status === 'completed'
  );
  
  const totalRevenue = confirmedReservations.reduce((sum, res) => 
    sum + (res.totalAmount || res.price || 0), 0
  );
  
  const totalReservations = confirmedReservations.length;
  const cancelledReservations = reservations.filter(res => res.status === 'cancelled').length;
  
  // MÃ¼ÅŸteri analizi
  const customerMap = new Map();
  confirmedReservations.forEach(res => {
    const customerId = res.customerId || res.customerName || 'unknown';
    if (customerMap.has(customerId)) {
      const customer = customerMap.get(customerId);
      customer.reservations += 1;
      customer.totalSpent += res.totalAmount || res.price || 0;
      customer.lastVisit = res.date;
    } else {
      customerMap.set(customerId, {
        id: customerId,
        name: res.customerName || 'MÃ¼ÅŸteri',
        phone: res.customerPhone || '',
        reservations: 1,
        totalSpent: res.totalAmount || res.price || 0,
        firstVisit: res.date,
        lastVisit: res.date
      });
    }
  });

  const activeCustomers = customerMap.size;
  const topCustomers = Array.from(customerMap.values())
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 10)
    .map((customer, index) => ({
      ...customer,
      rank: index + 1,
      segment: getCustomerSegment(customer.totalSpent, customer.reservations)
    }));

  // HaftalÄ±k gelir analizi
  const weeklyRevenue = [];
  const days = ['Pzt', 'Sal', 'Ã‡ar', 'Per', 'Cum', 'Cmt', 'Paz'];
  
  for (let i = 0; i < 7; i++) {
    const dayReservations = confirmedReservations.filter(res => {
      const date = new Date(res.date);
      // Pzt (i=0) -> 1, Sal (i=1) -> 2, ..., Cmt (i=5) -> 6, Paz (i=6) -> 0
      const expectedDay = i === 6 ? 0 : i + 1;
      return date.getDay() === expectedDay;
    });
    
    const dayRevenue = dayReservations.reduce((sum, res) => 
      sum + (res.totalAmount || res.price || 0), 0
    );
    
    weeklyRevenue.push({
      day: days[i],
      revenue: dayRevenue,
      count: dayReservations.length
    });
  }

  // Saatlere gÃ¶re doluluk
  const hourlyOccupancy = [];
  const hours = ['09:00', '11:00', '13:00', '15:00', '17:00', '19:00', '21:00'];
  
  for (let i = 0; i < hours.length; i++) {
    const hourReservations = confirmedReservations.filter(res => 
      res.timeSlot && res.timeSlot.includes(hours[i])
    );
    
    const totalCapacity = tesisler.reduce((sum, tesis) => sum + (tesis.capacity || 0), 0);
    const usedCapacity = hourReservations.reduce((sum, res) => 
      sum + (res.playerCount || res.totalPlayers || 1), 0
    );
    
    const occupancy = totalCapacity > 0 ? Math.round((usedCapacity / totalCapacity) * 100) : 0;
    
    hourlyOccupancy.push({
      hour: hours[i],
      occupancy: occupancy,
      reservations: hourReservations.length
    });
  }

  // MÃ¼ÅŸteri segmentleri
  const customerSegments = [
    { name: 'VIP', count: 0, percentage: 0 },
    { name: 'DÃ¼zenli', count: 0, percentage: 0 },
    { name: 'HaftalÄ±k', count: 0, percentage: 0 },
    { name: 'Tek Seferlik', count: 0, percentage: 0 }
  ];

  customerMap.forEach(customer => {
    const segment = getCustomerSegment(customer.totalSpent, customer.reservations);
    const segmentIndex = customerSegments.findIndex(s => s.name === segment);
    if (segmentIndex !== -1) {
      customerSegments[segmentIndex].count++;
    }
  });

  // YÃ¼zdelik hesapla
  customerSegments.forEach(segment => {
    segment.percentage = activeCustomers > 0 ? Math.round((segment.count / activeCustomers) * 100) : 0;
  });

  // Ã–deme yÃ¶ntemleri (varsayÄ±lan veriler)
  const paymentMethods = [
    { name: 'Nakit', percentage: 60 },
    { name: 'Kredi KartÄ±', percentage: 25 },
    { name: 'Havale', percentage: 10 },
    { name: 'DiÄŸer', percentage: 5 }
  ];

  // Saha bazlÄ± performans
  const sahaPerformance = tesisler.map(tesis => {
    const tesisReservations = confirmedReservations.filter(res => res.tesisId === tesis.id);
    const tesisRevenue = tesisReservations.reduce((sum, res) => 
      sum + (res.totalAmount || res.price || 0), 0
    );
    const tesisCancelled = reservations.filter(res => 
      res.tesisId === tesis.id && res.status === 'cancelled'
    ).length;
    
    const totalCapacity = (tesis.capacity || 0) * Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24));
    const usedCapacity = tesisReservations.reduce((sum, res) => 
      sum + (res.playerCount || res.totalPlayers || 1), 0
    );
    
    const occupancy = totalCapacity > 0 ? Math.round((usedCapacity / totalCapacity) * 100) : 0;
    const cancellationRate = tesisReservations.length > 0 ? 
      Math.round((tesisCancelled / (tesisReservations.length + tesisCancelled)) * 100 * 10) / 10 : 0;
    
    return {
      id: tesis.id,
      name: tesis.name || 'Saha',
      reservations: tesisReservations.length,
      revenue: tesisRevenue,
      occupancy: occupancy,
      averagePrice: tesisReservations.length > 0 ? Math.round(tesisRevenue / tesisReservations.length) : 0,
      cancellationRate: cancellationRate,
      performance: getPerformanceLevel(occupancy, cancellationRate)
    };
  }).sort((a, b) => b.revenue - a.revenue);

  // DiÄŸer metrikler
  const averagePrice = totalReservations > 0 ? Math.round(totalRevenue / totalReservations) : 0;
  const cancellationRate = reservations.length > 0 ? 
    Math.round((cancelledReservations / reservations.length) * 100 * 10) / 10 : 0;

  // Doluluk oranı hesapla
  const dayCount = Math.max(1, Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)));
  const totalCapacity = tesisler.reduce((sum, tesis) => sum + (tesis.capacity || 0), 0) * dayCount;
  const usedCapacity = confirmedReservations.reduce((sum, res) => 
    sum + (res.playerCount || res.totalPlayers || 1), 0
  );
  const occupancyRate = totalCapacity > 0 ? Math.round((usedCapacity / totalCapacity) * 100) : 0;

  // --- Önceki Dönem Metrikleri ve Büyüme Hesaplama ---
  const prevConfirmed = previousReservations.filter(res => res.status === 'confirmed' || res.status === 'completed');
  const prevRevenue = prevConfirmed.reduce((sum, res) => sum + (res.totalAmount || res.price || 0), 0);
  const prevReservations = prevConfirmed.length;
  
  const prevUsedCapacity = prevConfirmed.reduce((sum, res) => sum + (res.playerCount || res.totalPlayers || 1), 0);
  const prevOccupancyRate = totalCapacity > 0 ? Math.round((prevUsedCapacity / totalCapacity) * 100) : 0; // Kapasite aynı varsayıyoruz (tarih aralığı aynı süre çünkü)
  
  const prevPrice = prevReservations > 0 ? Math.round(prevRevenue / prevReservations) : 0;
  
  const prevUniqueCustomers = new Set(prevConfirmed.map(res => res.customerId || res.customerName || 'unknown')).size;
  const prevCancelled = previousReservations.filter(res => res.status === 'cancelled').length;
  const prevCancelRate = previousReservations.length > 0 ? Math.round((prevCancelled / previousReservations.length) * 100 * 10)/10 : 0;

  const calculateGrowth = (curr, prev) => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 100 * 10) / 10;
  };

  return {
    totalRevenue,
    totalReservations,
    occupancyRate,
    averagePrice,
    activeCustomers,
    cancellationRate,
    weeklyRevenue,
    hourlyOccupancy,
    customerSegments,
    paymentMethods,
    sahaPerformance,
    topCustomers,
    
    revenueGrowth: calculateGrowth(totalRevenue, prevRevenue),
    reservationGrowth: calculateGrowth(totalReservations, prevReservations),
    occupancyGrowth: Number((occupancyRate - prevOccupancyRate).toFixed(1)),
    priceGrowth: calculateGrowth(averagePrice, prevPrice),
    customerGrowth: calculateGrowth(activeCustomers, prevUniqueCustomers),
    cancellationGrowth: Number((cancellationRate - prevCancelRate).toFixed(1))
  };
};

// MÃ¼ÅŸteri segmentini belirle
function getCustomerSegment(totalSpent, reservations) {
  if (totalSpent >= 5000 || reservations >= 20) return 'VIP';
  if (totalSpent >= 2000 || reservations >= 10) return 'DÃ¼zenli';
  if (reservations >= 5) return 'HaftalÄ±k';
  return 'Tek Seferlik';
}

// Performans seviyesini belirle
function getPerformanceLevel(occupancy, cancellationRate) {
  if (occupancy >= 75 && cancellationRate <= 5) return 'YÃ¼ksek';
  if (occupancy >= 50 && cancellationRate <= 10) return 'Orta';
  return 'DÃ¼ÅŸÃ¼k';
}

// Marketing Servisleri

// Kampanya ekle
export const addCampaign = async (campaignData) => {
  try {
    const docRef = await addDoc(collection(db, 'campaigns'), {
      ...campaignData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return {
      success: true,
      id: docRef.id
    };
  } catch (error) {
    console.error('Kampanya ekleme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// KampanyalarÄ± getir
export const getCampaigns = async (ownerId) => {
  try {
    const campaignsRef = collection(db, 'campaigns');
    const q = query(
      campaignsRef,
      where('ownerId', '==', ownerId)
    );
    
    const querySnapshot = await getDocs(q);
    const campaigns = [];
    
    querySnapshot.forEach((doc) => {
      campaigns.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Client-side sÄ±ralama (tarihe gÃ¶re azalan)
    campaigns.sort((a, b) => {
      if (a.createdAt && b.createdAt) {
        return b.createdAt.toDate() - a.createdAt.toDate();
      }
      return 0;
    });
    
    return {
      success: true,
      data: campaigns
    };
  } catch (error) {
    console.error('Kampanyalar getirme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Kampanya gÃ¼ncelle
export const updateCampaign = async (campaignId, campaignData) => {
  try {
    await updateDoc(doc(db, 'campaigns', campaignId), {
      ...campaignData,
      updatedAt: serverTimestamp()
    });
    
    return { success: true };
  } catch (error) {
    console.error('Kampanya gÃ¼ncelleme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Kampanya sil
export const deleteCampaign = async (campaignId) => {
  try {
    await deleteDoc(doc(db, 'campaigns', campaignId));
    return { success: true };
  } catch (error) {
    console.error('Kampanya silme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Mesaj ÅŸablonu ekle
export const addMessageTemplate = async (templateData) => {
  try {
    const docRef = await addDoc(collection(db, 'messageTemplates'), {
      ...templateData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return {
      success: true,
      id: docRef.id
    };
  } catch (error) {
    console.error('Mesaj ÅŸablonu ekleme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Mesaj ÅŸablonlarÄ±nÄ± getir
export const getMessageTemplates = async (ownerId) => {
  try {
    const templatesRef = collection(db, 'messageTemplates');
    const q = query(
      templatesRef,
      where('ownerId', '==', ownerId)
    );
    
    const querySnapshot = await getDocs(q);
    const templates = [];
    
    querySnapshot.forEach((doc) => {
      templates.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Client-side sÄ±ralama
    templates.sort((a, b) => {
      if (a.createdAt && b.createdAt) {
        return b.createdAt.toDate() - a.createdAt.toDate();
      }
      return 0;
    });
    
    return {
      success: true,
      data: templates
    };
  } catch (error) {
    console.error('Mesaj ÅŸablonlarÄ± getirme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// MÃ¼ÅŸteri segmentlerini getir
export const getCustomerSegments = async (ownerId) => {
  try {
    // Ã–nce tesisleri getir
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
        success: true,
        data: []
      };
    }

    // RezervasyonlarÄ± getir
    const rezervasyonlarRef = collection(db, 'rezervasyonlar');
    const q = query(
      rezervasyonlarRef,
      where('tesisId', 'in', tesisIds)
    );
    
    const querySnapshot = await getDocs(q);
    const reservations = [];
    
    querySnapshot.forEach((doc) => {
      reservations.push({
        id: doc.id,
        ...doc.data()
      });
    });

    // MÃ¼ÅŸteri segmentlerini hesapla
    const segments = calculateCustomerSegments(reservations);

    return {
      success: true,
      data: segments
    };
  } catch (error) {
    console.error('MÃ¼ÅŸteri segmentleri getirme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// MÃ¼ÅŸteri segmentlerini hesapla
const calculateCustomerSegments = (reservations) => {
  const customerMap = new Map();
  
  // RezervasyonlarÄ± mÃ¼ÅŸteri bazÄ±nda grupla
  reservations.forEach(res => {
    if (res.status === 'confirmed' || res.status === 'completed') {
      const customerId = res.customerId || res.customerName || 'unknown';
      if (customerMap.has(customerId)) {
        const customer = customerMap.get(customerId);
        customer.reservations += 1;
        customer.totalSpent += res.totalAmount || res.price || 0;
        customer.lastVisit = res.date;
      } else {
        customerMap.set(customerId, {
          id: customerId,
          name: res.customerName || 'MÃ¼ÅŸteri',
          phone: res.customerPhone || '',
          reservations: 1,
          totalSpent: res.totalAmount || res.price || 0,
          firstVisit: res.date,
          lastVisit: res.date
        });
      }
    }
  });

  // Segmentleri hesapla
  const segments = [
    { name: 'VIP MÃ¼ÅŸteriler', count: 0, criteria: 'totalSpent >= 5000 || reservations >= 20' },
    { name: 'DÃ¼zenli Gelenler', count: 0, criteria: 'totalSpent >= 2000 || reservations >= 10' },
    { name: 'KayÄ±p MÃ¼ÅŸteriler', count: 0, criteria: 'lastVisit < 30 days ago' },
    { name: 'Yeni Ãœyeler', count: 0, criteria: 'firstVisit < 7 days ago' },
    { name: 'Hafta Sonu', count: 0, criteria: 'weekend reservations' },
    { name: 'Kurumsal', count: 0, criteria: 'corporate customers' }
  ];

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
  const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));

  customerMap.forEach(customer => {
    const lastVisitDate = new Date(customer.lastVisit);
    const firstVisitDate = new Date(customer.firstVisit);

    // VIP MÃ¼ÅŸteriler
    if (customer.totalSpent >= 5000 || customer.reservations >= 20) {
      segments[0].count++;
    }
    // DÃ¼zenli Gelenler
    else if (customer.totalSpent >= 2000 || customer.reservations >= 10) {
      segments[1].count++;
    }
    
    // KayÄ±p MÃ¼ÅŸteriler
    if (lastVisitDate < thirtyDaysAgo) {
      segments[2].count++;
    }
    
    // Yeni Ãœyeler
    if (firstVisitDate > sevenDaysAgo) {
      segments[3].count++;
    }
    
    // Hafta Sonu (basit hesaplama)
    if (customer.reservations >= 5) {
      segments[4].count++;
    }
    
    // Kurumsal (basit hesaplama)
    if (customer.totalSpent >= 1000 && customer.reservations >= 3) {
      segments[5].count++;
    }
  });

  return segments.map(segment => ({
    name: segment.name,
    count: segment.count,
    action: segment.name === 'KayÄ±p MÃ¼ÅŸteriler' ? 'Geri Kazan â†’' :
            segment.name === 'Yeni Ãœyeler' ? 'HoÅŸgeldin MesajÄ± â†’' :
            segment.name === 'Kurumsal' ? 'Ã–zel Teklif â†’' :
            'Kampanya GÃ¶nder â†’'
  }));
};

// Marketing istatistiklerini getir
export const getMarketingStats = async (ownerId) => {
  try {
    const [campaignsResult, templatesResult] = await Promise.all([
      getCampaigns(ownerId),
      getMessageTemplates(ownerId)
    ]);

    const campaigns = campaignsResult.success ? campaignsResult.data : [];
    const templates = templatesResult.success ? templatesResult.data : [];

    // Ä°statistikleri hesapla
    const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
    const totalReach = campaigns.reduce((sum, c) => sum + (c.reached || 0), 0);
    const totalConversion = campaigns.reduce((sum, c) => sum + (c.conversion || 0), 0);
    const totalRevenue = campaigns.reduce((sum, c) => sum + (c.revenue || 0), 0);
    
    const openRate = totalReach > 0 ? Math.round((totalConversion / totalReach) * 100) : 0;
    const conversionRate = totalReach > 0 ? Math.round((totalConversion / totalReach) * 100) : 0;
    const roi = totalRevenue > 0 ? Math.round((totalRevenue / campaigns.length) * 100) : 0;

    return {
      success: true,
      data: {
        activeCampaigns,
        totalReach,
        openRate,
        conversionRate,
        roi,
        weeklyGrowth: 12, // Mock data
        campaigns,
        templates
      }
    };
  } catch (error) {
    console.error('Marketing istatistikleri getirme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Ayarlar Servisleri

// KullanÄ±cÄ± ayarlarÄ±nÄ± gÃ¼ncelle (updateUserData'ya ek olarak)
export const updateUserSettings = async (userId, settingsData) => {
  try {
    await updateDoc(doc(db, 'users', userId), {
      ...settingsData,
      updatedAt: serverTimestamp()
    });
    
    return { success: true };
  } catch (error) {
    console.error('KullanÄ±cÄ± ayarlarÄ± gÃ¼ncelleme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Åifre gÃ¼ncelleme (Firebase Auth kullanarak)
export const updateUserPassword = async (currentPassword, newPassword) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      return {
        success: false,
        error: 'KullanÄ±cÄ± oturum aÃ§mamÄ±ÅŸ'
      };
    }

    // Mevcut ÅŸifreyi doÄŸrula (email/password ile giriÅŸ yapmÄ±ÅŸ kullanÄ±cÄ±lar iÃ§in)
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);

    // Yeni ÅŸifreyi ayarla
    await updatePassword(user, newPassword);

    return { success: true };
  } catch (error) {
    console.error('Åifre gÃ¼ncelleme hatasÄ±:', error);
    let errorMessage = 'Åifre gÃ¼ncellenirken hata oluÅŸtu';
    
    switch (error.code) {
      case 'auth/wrong-password':
        errorMessage = 'Mevcut ÅŸifre yanlÄ±ÅŸ';
        break;
      case 'auth/weak-password':
        errorMessage = 'Yeni ÅŸifre Ã§ok zayÄ±f';
        break;
      case 'auth/requires-recent-login':
        errorMessage = 'Bu iÅŸlem iÃ§in tekrar giriÅŸ yapmanÄ±z gerekiyor';
        break;
      default:
        errorMessage = error.message;
    }

    return {
      success: false,
      error: errorMessage
    };
  }
};

// Turnuva Servisleri

// Turnuva oluÅŸtur (admin ve saha sahibi)
export const createTournament = async (tournamentData) => {
  try {
    const tournamentDoc = {
      name: tournamentData.name,
      description: tournamentData.description || '',
      format: tournamentData.format || 'round_robin',
      type: tournamentData.type, // 'individual' | 'team'
      sportType: tournamentData.sportType || 'football',
      ownerId: tournamentData.ownerId,
      ownerType: tournamentData.ownerType || 'owner', // 'owner' | 'admin'
      tesisId: tournamentData.tesisId || null,
      startDate: tournamentData.startDate ? Timestamp.fromDate(new Date(tournamentData.startDate)) : null,
      endDate: tournamentData.endDate ? Timestamp.fromDate(new Date(tournamentData.endDate)) : null,
      registrationDeadline: tournamentData.registrationDeadline ? Timestamp.fromDate(new Date(tournamentData.registrationDeadline)) : null,
      maxParticipants: tournamentData.maxParticipants || tournamentData.maxTeams || 16,
      maxTeams: tournamentData.maxTeams || tournamentData.maxParticipants || 16,
      minTeamSize: tournamentData.minTeamSize || 1,
      maxTeamSize: tournamentData.maxTeamSize || 11,
      registrationFee: tournamentData.registrationFee || 0,
      prizePool: tournamentData.prizePool || 0,
      prizeDistribution: tournamentData.prizeDistribution || [
        { rank: 1, percentage: 50 },
        { rank: 2, percentage: 30 },
        { rank: 3, percentage: 20 }
      ],
      status: tournamentData.status || 'draft', // 'draft' | 'registration_open' | 'registration_closed' | 'ongoing' | 'completed' | 'cancelled'
      rules: tournamentData.rules || '',
      settings: {
        allowDraw: tournamentData.settings?.allowDraw !== false,
        pointsWin: tournamentData.settings?.pointsWin || 3,
        pointsDraw: tournamentData.settings?.pointsDraw || 1,
        pointsLoss: tournamentData.settings?.pointsLoss || 0,
        autoAdvance: tournamentData.settings?.autoAdvance || false
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const docRef = await addDoc(collection(db, 'tournaments'), tournamentDoc);
    
    return {
      success: true,
      id: docRef.id
    };
  } catch (error) {
    console.error('Turnuva oluÅŸturma hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Eski addTournament fonksiyonu iÃ§in geriye dÃ¶nÃ¼k uyumluluk
export const addTournament = createTournament;

// Turnuva detaylarÄ±nÄ± getir
export const getTournament = async (tournamentId) => {
  try {
    const tournamentDoc = await getDoc(doc(db, 'tournaments', tournamentId));
    if (tournamentDoc.exists()) {
      return {
        success: true,
        data: { id: tournamentDoc.id, ...tournamentDoc.data() }
      };
    } else {
      return {
        success: false,
        error: 'Turnuva bulunamadÄ±'
      };
    }
  } catch (error) {
    console.error('Turnuva getirme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Saha sahibi/admin turnuvalarÄ±nÄ± getir
export const getTournamentsByOwner = async (ownerId) => {
  try {
    const tournamentsRef = collection(db, 'tournaments');
    const q = query(
      tournamentsRef,
      where('ownerId', '==', ownerId)
    );
    
    const querySnapshot = await getDocs(q);
    const tournaments = [];
    
    querySnapshot.forEach((doc) => {
      tournaments.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Client-side sÄ±ralama (tarihe gÃ¶re azalan)
    tournaments.sort((a, b) => {
      if (a.createdAt && b.createdAt) {
        const dateA = a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
        const dateB = b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
        return dateB - dateA;
      }
      return 0;
    });
    
    return {
      success: true,
      data: tournaments
    };
  } catch (error) {
    console.error('Turnuvalar getirme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// TÃ¼m turnuvalarÄ± getir (filtreleme ile)
export const getAllTournaments = async (filters = {}) => {
  try {
    const tournamentsRef = collection(db, 'tournaments');
    let q = query(tournamentsRef);
    
    // Filtreler
    if (filters.status) {
      q = query(q, where('status', '==', filters.status));
    }
    if (filters.type) {
      q = query(q, where('type', '==', filters.type));
    }
    if (filters.sportType) {
      q = query(q, where('sportType', '==', filters.sportType));
    }
    
    const querySnapshot = await getDocs(q);
    const tournaments = [];
    
    querySnapshot.forEach((doc) => {
      tournaments.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Client-side sÄ±ralama
    tournaments.sort((a, b) => {
      if (a.createdAt && b.createdAt) {
        const dateA = a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
        const dateB = b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
        return dateB - dateA;
      }
      return 0;
    });
    
    return {
      success: true,
      data: tournaments
    };
  } catch (error) {
    console.error('Turnuvalar getirme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Eski getTournaments fonksiyonu iÃ§in geriye dÃ¶nÃ¼k uyumluluk
export const getTournaments = getTournamentsByOwner;

// Turnuva gÃ¼ncelle
export const updateTournament = async (tournamentId, tournamentData) => {
  try {
    await updateDoc(doc(db, 'tournaments', tournamentId), {
      ...tournamentData,
      updatedAt: serverTimestamp()
    });
    
    return { success: true };
  } catch (error) {
    console.error('Turnuva gÃ¼ncelleme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Turnuva sil
export const deleteTournament = async (tournamentId) => {
  try {
    await deleteDoc(doc(db, 'tournaments', tournamentId));
    return { success: true };
  } catch (error) {
    console.error('Turnuva silme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Turnuva takÄ±mÄ± ekle
export const addTournamentTeam = async (tournamentId, teamData) => {
  try {
    const docRef = await addDoc(collection(db, 'tournamentTeams'), {
      ...teamData,
      tournamentId,
      createdAt: serverTimestamp(),
      status: 'registered' // registered, qualified, eliminated
    });
    
    return {
      success: true,
      id: docRef.id
    };
  } catch (error) {
    console.error('Turnuva takÄ±mÄ± ekleme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Turnuva takÄ±mlarÄ±nÄ± getir
export const getTournamentTeams = async (tournamentId) => {
  try {
    const teamsRef = collection(db, 'tournamentTeams');
    const q = query(
      teamsRef,
      where('tournamentId', '==', tournamentId)
    );
    
    const querySnapshot = await getDocs(q);
    const teams = [];
    
    querySnapshot.forEach((doc) => {
      teams.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return {
      success: true,
      data: teams
    };
  } catch (error) {
    console.error('Turnuva takÄ±mlarÄ± getirme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Turnuva katÄ±lÄ±mcÄ±larÄ±nÄ± getir (bireysel veya takÄ±m)
export const getTournamentParticipants = async (tournamentId) => {
  try {
    const participantsRef = collection(db, 'tournamentParticipants');
    const q = query(
      participantsRef,
      where('tournamentId', '==', tournamentId)
    );
    
    const querySnapshot = await getDocs(q);
    const participants = [];
    
    querySnapshot.forEach((doc) => {
      participants.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return {
      success: true,
      data: participants
    };
  } catch (error) {
    console.error('Turnuva katÄ±lÄ±mcÄ±larÄ± getirme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Bireysel oyuncuyu turnuvaya kaydet
export const registerToTournament = async (tournamentId, participantData) => {
  try {
    const tournamentDoc = await getDoc(doc(db, 'tournaments', tournamentId));
    if (!tournamentDoc.exists()) {
      return { success: false, error: 'Turnuva bulunamadÄ±' };
    }
    
    const tournament = tournamentDoc.data();
    
    // KayÄ±t durumunu kontrol et
    if (tournament.status !== 'registration_open') {
      return { success: false, error: 'Turnuva kayÄ±tlarÄ± aÃ§Ä±k deÄŸil' };
    }
    
    // KayÄ±t son tarihi kontrolÃ¼ (deadline gÃ¼n sonuna kadar geÃ§erli)
    if (tournament.registrationDeadline) {
      const deadlineDate = tournament.registrationDeadline.toDate ? 
        tournament.registrationDeadline.toDate() : 
        new Date(tournament.registrationDeadline);
      
      // Deadline'Ä± gÃ¼n sonuna ayarla (23:59:59.999)
      const deadline = new Date(deadlineDate);
      deadline.setHours(23, 59, 59, 999);
      
      if (new Date() > deadline) {
        return { success: false, error: 'KayÄ±t sÃ¼resi dolmuÅŸ' };
      }
    }
    
    // Mevcut katÄ±lÄ±mcÄ± sayÄ±sÄ±nÄ± kontrol et
    const participantsResult = await getTournamentParticipants(tournamentId);
    const participants = participantsResult.success ? participantsResult.data : [];
    const confirmedParticipants = participants.filter(p => p.status === 'confirmed');
    
    if (confirmedParticipants.length >= (tournament.maxParticipants || 0)) {
      return { success: false, error: 'Turnuva dolu' };
    }
    
    // Zaten kayÄ±tlÄ± mÄ± kontrol et
    const existingParticipant = participants.find(p => p.participantId === participantData.participantId);
    if (existingParticipant) {
      return { success: false, error: 'Zaten bu turnuvaya kayÄ±tlÄ±sÄ±nÄ±z' };
    }
    
    // KatÄ±lÄ±mcÄ±yÄ± ekle
    const participantDoc = {
      tournamentId,
      participantId: participantData.participantId,
      participantName: participantData.participantName || '',
      participantType: 'individual', // 'individual' | 'team'
      status: tournament.registrationFee > 0 ? 'pending_payment' : 'confirmed',
      paymentStatus: tournament.registrationFee > 0 ? 'pending' : 'free',
      registrationFee: tournament.registrationFee || 0,
      registeredAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const docRef = await addDoc(collection(db, 'tournamentParticipants'), participantDoc);
    
    return {
      success: true,
      id: docRef.id,
      requiresPayment: tournament.registrationFee > 0
    };
  } catch (error) {
    console.error('Turnuva kayÄ±t hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Turnuva kaydÄ±nÄ± iptal et
export const cancelTournamentRegistration = async (tournamentId, participantId) => {
  try {
    const participantsResult = await getTournamentParticipants(tournamentId);
    const participants = participantsResult.success ? participantsResult.data : [];
    
    const participant = participants.find(p => p.participantId === participantId);
    if (!participant) {
      return { success: false, error: 'KayÄ±t bulunamadÄ±' };
    }
    
    await deleteDoc(doc(db, 'tournamentParticipants', participant.id));
    
    return { success: true };
  } catch (error) {
    console.error('Turnuva kayÄ±t iptal hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Turnuva kaydÄ±nÄ± onayla
export const confirmTournamentRegistration = async (tournamentId, participantId) => {
  try {
    const participantsResult = await getTournamentParticipants(tournamentId);
    const participants = participantsResult.success ? participantsResult.data : [];
    
    const participant = participants.find(p => p.participantId === participantId);
    if (!participant) {
      return { success: false, error: 'KayÄ±t bulunamadÄ±' };
    }
    
    await updateDoc(doc(db, 'tournamentParticipants', participant.id), {
      status: 'confirmed',
      updatedAt: serverTimestamp()
    });
    
    return { success: true };
  } catch (error) {
    console.error('Turnuva kayÄ±t onay hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Turnuva maÃ§Ä± oluÅŸtur
export const addTournamentMatch = async (tournamentId, matchData) => {
  try {
    const matchDoc = {
      tournamentId,
      round: matchData.round || 1,
      matchNumber: matchData.matchNumber || 1,
      participant1Id: matchData.participant1Id,
      participant2Id: matchData.participant2Id,
      participant1Name: matchData.participant1Name || '',
      participant2Name: matchData.participant2Name || '',
      scheduledDate: matchData.scheduledDate ? Timestamp.fromDate(new Date(matchData.scheduledDate)) : null,
      scheduledTime: matchData.scheduledTime || '',
      fieldId: matchData.fieldId || null,
      status: 'scheduled', // 'scheduled' | 'ongoing' | 'completed' | 'cancelled'
      score1: null,
      score2: null,
      scoreEntries: [],
      winnerId: null,
      points1: 0,
      points2: 0,
      statistics: {
        goals1: 0,
        goals2: 0,
        assists1: 0,
        assists2: 0
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const docRef = await addDoc(collection(db, 'tournamentMatches'), matchDoc);
    
    return {
      success: true,
      id: docRef.id
    };
  } catch (error) {
    console.error('Turnuva maÃ§Ä± ekleme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Birden fazla maÃ§ oluÅŸtur
export const createTournamentMatches = async (tournamentId, matchesData) => {
  try {
    const batch = [];
    const createdMatches = [];
    
    for (const matchData of matchesData) {
      const matchDoc = {
        tournamentId,
        round: matchData.round || 1,
        matchNumber: matchData.matchNumber || 1,
        participant1Id: matchData.participant1Id,
        participant2Id: matchData.participant2Id,
        participant1Name: matchData.participant1Name || '',
        participant2Name: matchData.participant2Name || '',
        scheduledDate: matchData.scheduledDate ? Timestamp.fromDate(new Date(matchData.scheduledDate)) : null,
        scheduledTime: matchData.scheduledTime || '',
        fieldId: matchData.fieldId || null,
        status: 'scheduled',
        score1: null,
        score2: null,
        scoreEntries: [],
        winnerId: null,
        points1: 0,
        points2: 0,
        statistics: {
          goals1: 0,
          goals2: 0,
          assists1: 0,
          assists2: 0
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      batch.push({ data: matchDoc });
    }
    
    // Firestore batch write limit (500) - eÄŸer daha fazlaysa bÃ¶l
    const batchSize = 500;
    for (let i = 0; i < batch.length; i += batchSize) {
      const chunk = batch.slice(i, i + batchSize);
      const batchPromises = chunk.map(match => 
        addDoc(collection(db, 'tournamentMatches'), match.data)
      );
      const results = await Promise.all(batchPromises);
      createdMatches.push(...results.map(r => r.id));
    }
    
    return {
      success: true,
      ids: createdMatches
    };
  } catch (error) {
    console.error('MaÃ§lar oluÅŸturma hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Turnuva maÃ§larÄ±nÄ± getir
export const getTournamentMatches = async (tournamentId) => {
  try {
    const matchesRef = collection(db, 'tournamentMatches');
    const q = query(
      matchesRef,
      where('tournamentId', '==', tournamentId)
    );
    
    const querySnapshot = await getDocs(q);
    const matches = [];
    
    querySnapshot.forEach((doc) => {
      matches.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Round ve matchNumber'a gÃ¶re sÄ±rala
    matches.sort((a, b) => {
      if (a.round !== b.round) {
        return a.round - b.round;
      }
      return (a.matchNumber || 0) - (b.matchNumber || 0);
    });
    
    return {
      success: true,
      data: matches
    };
  } catch (error) {
    console.error('Turnuva maÃ§larÄ± getirme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Turnuva maÃ§Ä±nÄ± getir
export const getTournamentMatch = async (matchId) => {
  try {
    const matchDoc = await getDoc(doc(db, 'tournamentMatches', matchId));
    if (matchDoc.exists()) {
      return {
        success: true,
        data: { id: matchDoc.id, ...matchDoc.data() }
      };
    } else {
      return {
        success: false,
        error: 'MaÃ§ bulunamadÄ±'
      };
    }
  } catch (error) {
    console.error('Turnuva maÃ§Ä± getirme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Turnuva maÃ§Ä±nÄ± gÃ¼ncelle
export const updateTournamentMatch = async (matchId, updates) => {
  try {
    await updateDoc(doc(db, 'tournamentMatches', matchId), {
      ...updates,
      updatedAt: serverTimestamp()
    });
    
    return { success: true };
  } catch (error) {
    console.error('Turnuva maÃ§Ä± gÃ¼ncelleme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// TakÄ±m Ã¼yesi kontrolÃ¼ yardÄ±mcÄ± fonksiyonu
const checkIfTeamMember = async (userId, teamId) => {
  try {
    const teamDoc = await getDoc(doc(db, 'teams', teamId));
    if (teamDoc.exists()) {
      const team = teamDoc.data();
      return team.members?.includes(userId) || false;
    }
    return false;
  } catch (error) {
    return false;
  }
};

// Skor gÃ¶nder (iki taraf da gÃ¶nderebilir)
export const submitMatchScore = async (matchId, userId, scoreData) => {
  try {
    const matchDoc = await getDoc(doc(db, 'tournamentMatches', matchId));
    if (!matchDoc.exists()) {
      return { success: false, error: 'MaÃ§ bulunamadÄ±' };
    }
    
    const match = matchDoc.data();
    
    // KullanÄ±cÄ±nÄ±n bu maÃ§ta yer alÄ±p almadÄ±ÄŸÄ±nÄ± kontrol et
    const isParticipant1 = match.participant1Id === userId;
    const isParticipant2 = match.participant2Id === userId;
    
    if (!isParticipant1 && !isParticipant2) {
      // EÄŸer takÄ±m ise, takÄ±m Ã¼yelerini kontrol et
      const isTeamMember1 = await checkIfTeamMember(userId, match.participant1Id);
      const isTeamMember2 = await checkIfTeamMember(userId, match.participant2Id);
      
      if (!isTeamMember1 && !isTeamMember2) {
        return { success: false, error: 'Bu maÃ§ iÃ§in skor gÃ¶nderme yetkiniz yok' };
      }
    }
    
    // Skor giriÅŸi ekle
    const scoreEntry = {
      userId,
      score1: scoreData.score1,
      score2: scoreData.score2,
      submittedAt: serverTimestamp(),
      verified: false
    };
    
    const currentScoreEntries = match.scoreEntries || [];
    
    // EÄŸer bu kullanÄ±cÄ± daha Ã¶nce skor gÃ¶ndermiÅŸse gÃ¼ncelle, yoksa ekle
    const existingEntryIndex = currentScoreEntries.findIndex(entry => entry.userId === userId);
    let updatedScoreEntries;
    
    if (existingEntryIndex >= 0) {
      updatedScoreEntries = [...currentScoreEntries];
      updatedScoreEntries[existingEntryIndex] = scoreEntry;
    } else {
      updatedScoreEntries = [...currentScoreEntries, scoreEntry];
    }
    
    // SkorlarÄ±n uyuÅŸup uyuÅŸmadÄ±ÄŸÄ±nÄ± kontrol et
    let finalScore1 = null;
    let finalScore2 = null;
    let needsVerification = false;
    
    if (updatedScoreEntries.length >= 2) {
      const scores = updatedScoreEntries.map(e => ({ score1: e.score1, score2: e.score2 }));
      const allMatch = scores.every(s => s.score1 === scores[0].score1 && s.score2 === scores[0].score2);
      
      if (allMatch) {
        finalScore1 = scores[0].score1;
        finalScore2 = scores[0].score2;
      } else {
        needsVerification = true;
      }
    } else {
      needsVerification = true;
    }
    
    // MaÃ§Ä± gÃ¼ncelle
    const updateData = {
      scoreEntries: updatedScoreEntries,
      updatedAt: serverTimestamp()
    };
    
    if (finalScore1 !== null && finalScore2 !== null) {
      updateData.score1 = finalScore1;
      updateData.score2 = finalScore2;
      
      // PuanlarÄ± hesapla
      const tournamentDoc = await getDoc(doc(db, 'tournaments', match.tournamentId));
      const tournament = tournamentDoc.data();
      const settings = tournament.settings || {};
      
      let points1 = settings.pointsLoss || 0;
      let points2 = settings.pointsLoss || 0;
      let winnerId = null;
      
      if (finalScore1 > finalScore2) {
        points1 = settings.pointsWin || 3;
        winnerId = match.participant1Id;
      } else if (finalScore2 > finalScore1) {
        points2 = settings.pointsWin || 3;
        winnerId = match.participant2Id;
      } else if (settings.allowDraw) {
        points1 = settings.pointsDraw || 1;
        points2 = settings.pointsDraw || 1;
      }
      
      updateData.points1 = points1;
      updateData.points2 = points2;
      updateData.winnerId = winnerId;
      updateData.status = 'completed';
    }
    
    await updateDoc(doc(db, 'tournamentMatches', matchId), updateData);
    
    // EÄŸer skor onaylandÄ±ysa puan durumunu gÃ¼ncelle
    if (finalScore1 !== null && finalScore2 !== null) {
      await updateTournamentStandings(match.tournamentId);
    }
    
    return {
      success: true,
      needsVerification,
      verified: finalScore1 !== null && finalScore2 !== null
    };
  } catch (error) {
    console.error('Skor gÃ¶nderme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// OrganizatÃ¶r skor doÄŸrulama
export const verifyMatchScore = async (matchId, verifiedScore) => {
  try {
    const matchDoc = await getDoc(doc(db, 'tournamentMatches', matchId));
    if (!matchDoc.exists()) {
      return { success: false, error: 'MaÃ§ bulunamadÄ±' };
    }
    
    const match = matchDoc.data();
    const tournamentDoc = await getDoc(doc(db, 'tournaments', match.tournamentId));
    const tournament = tournamentDoc.data();
    const settings = tournament.settings || {};
    
    // PuanlarÄ± hesapla
    let points1 = settings.pointsLoss || 0;
    let points2 = settings.pointsLoss || 0;
    let winnerId = null;
    
    if (verifiedScore.score1 > verifiedScore.score2) {
      points1 = settings.pointsWin || 3;
      winnerId = match.participant1Id;
    } else if (verifiedScore.score2 > verifiedScore.score1) {
      points2 = settings.pointsWin || 3;
      winnerId = match.participant2Id;
    } else if (settings.allowDraw) {
      points1 = settings.pointsDraw || 1;
      points2 = settings.pointsDraw || 1;
    }
    
    // Skor giriÅŸlerini verified olarak iÅŸaretle
    const updatedScoreEntries = (match.scoreEntries || []).map(entry => ({
      ...entry,
      verified: true
    }));
    
    await updateDoc(doc(db, 'tournamentMatches', matchId), {
      score1: verifiedScore.score1,
      score2: verifiedScore.score2,
      points1,
      points2,
      winnerId,
      status: 'completed',
      scoreEntries: updatedScoreEntries,
      updatedAt: serverTimestamp()
    });
    
    // Puan durumunu gÃ¼ncelle
    await updateTournamentStandings(match.tournamentId);
    
    return { success: true };
  } catch (error) {
    console.error('Skor doÄŸrulama hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Turnuva istatistiklerini getir
export const getTournamentStats = async (ownerId) => {
  try {
    const tournamentsResult = await getTournamentsByOwner(ownerId);
    const tournaments = tournamentsResult.success ? tournamentsResult.data : [];

    // Ä°statistikleri hesapla
    const activeTournaments = tournaments.filter(t => t.status === 'ongoing' || t.status === 'registration_open').length;
    const totalTeams = tournaments.reduce((sum, t) => sum + (t.registeredTeams || 0), 0);
    const totalMatches = tournaments.reduce((sum, t) => sum + (t.totalMatches || 0), 0);
    const totalRevenue = tournaments.reduce((sum, t) => {
      const registrationFee = t.registrationFee || 0;
      const teamCount = t.registeredTeams || 0;
      return sum + (registrationFee * teamCount);
    }, 0);

    return {
      success: true,
      data: {
        activeTournaments,
        totalTeams,
        totalMatches,
        totalRevenue,
        tournaments
      }
    };
  } catch (error) {
    console.error('Turnuva istatistikleri getirme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// ==========================================
// Puan Durumu ve Ä°statistikler
// ==========================================

// Puan durumunu hesapla
export const calculateTournamentStandings = async (tournamentId) => {
  try {
    const tournamentDoc = await getDoc(doc(db, 'tournaments', tournamentId));
    if (!tournamentDoc.exists()) {
      return { success: false, error: 'Turnuva bulunamadÄ±' };
    }
    
    const tournament = tournamentDoc.data();
    const settings = tournament.settings || {};
    
    // KatÄ±lÄ±mcÄ±larÄ± getir
    const participantsResult = await getTournamentParticipants(tournamentId);
    const participants = participantsResult.success ? participantsResult.data : [];
    
    // MaÃ§larÄ± getir
    const matchesResult = await getTournamentMatches(tournamentId);
    const matches = matchesResult.success ? matchesResult.data : [];
    
    // Puan durumu map'i oluÅŸtur
    const standingsMap = new Map();
    
    participants.forEach(participant => {
      standingsMap.set(participant.participantId, {
        tournamentId,
        participantId: participant.participantId,
        participantName: participant.participantName || '',
        matchesPlayed: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0
      });
    });
    
    // TamamlanmÄ±ÅŸ maÃ§larÄ± iÅŸle
    matches.forEach(match => {
      if (match.status === 'completed' && match.score1 !== null && match.score2 !== null) {
        const participant1 = standingsMap.get(match.participant1Id);
        const participant2 = standingsMap.get(match.participant2Id);
        
        if (participant1 && participant2) {
          // Participant 1 istatistikleri
          participant1.matchesPlayed++;
          participant1.goalsFor += match.score1 || 0;
          participant1.goalsAgainst += match.score2 || 0;
          participant1.points += match.points1 || 0;
          
          if (match.score1 > match.score2) {
            participant1.wins++;
          } else if (match.score1 < match.score2) {
            participant1.losses++;
          } else if (settings.allowDraw) {
            participant1.draws++;
          }
          
          // Participant 2 istatistikleri
          participant2.matchesPlayed++;
          participant2.goalsFor += match.score2 || 0;
          participant2.goalsAgainst += match.score1 || 0;
          participant2.points += match.points2 || 0;
          
          if (match.score2 > match.score1) {
            participant2.wins++;
          } else if (match.score2 < match.score1) {
            participant2.losses++;
          } else if (settings.allowDraw) {
            participant2.draws++;
          }
        }
      }
    });
    
    // Goal difference hesapla
    standingsMap.forEach(standing => {
      standing.goalDifference = standing.goalsFor - standing.goalsAgainst;
    });
    
    // SÄ±ralamaya gÃ¶re sÄ±rala (points, goalDifference, goalsFor)
    const standingsArray = Array.from(standingsMap.values());
    standingsArray.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      return b.goalsFor - a.goalsFor;
    });
    
    // Rank ekle
    standingsArray.forEach((standing, index) => {
      standing.rank = index + 1;
    });
    
    return {
      success: true,
      data: standingsArray
    };
  } catch (error) {
    console.error('Puan durumu hesaplama hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Puan durumunu gÃ¼ncelle (Firestore'a kaydet)
export const updateTournamentStandings = async (tournamentId) => {
  try {
    const standingsResult = await calculateTournamentStandings(tournamentId);
    if (!standingsResult.success) {
      return standingsResult;
    }
    
    const standings = standingsResult.data;
    
    // Mevcut standings'leri sil
    const existingStandingsRef = collection(db, 'tournamentStandings');
    const q = query(existingStandingsRef, where('tournamentId', '==', tournamentId));
    const existingSnapshot = await getDocs(q);
    
    const deletePromises = existingSnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
    
    // Yeni standings'leri ekle
    const addPromises = standings.map(standing => 
      addDoc(collection(db, 'tournamentStandings'), {
        ...standing,
        updatedAt: serverTimestamp()
      })
    );
    
    await Promise.all(addPromises);
    
    return { success: true };
  } catch (error) {
    console.error('Puan durumu gÃ¼ncelleme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Puan durumunu getir
export const getTournamentStandings = async (tournamentId) => {
  try {
    const standingsRef = collection(db, 'tournamentStandings');
    // Index hatasÄ± nedeniyle orderBy kaldÄ±rÄ±ldÄ±, client-side sorting yapÄ±lacak
    const q = query(
      standingsRef,
      where('tournamentId', '==', tournamentId)
    );
    
    const querySnapshot = await getDocs(q);
    const standings = [];
    
    querySnapshot.forEach((doc) => {
      standings.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Client-side sorting (rank'e gÃ¶re)
    standings.sort((a, b) => (a.rank || 0) - (b.rank || 0));
    
    // EÄŸer standings yoksa hesapla
    if (standings.length === 0) {
      const calculated = await calculateTournamentStandings(tournamentId);
      if (calculated.success) {
        await updateTournamentStandings(tournamentId);
        return calculated;
      }
    }
    
    return {
      success: true,
      data: standings
    };
  } catch (error) {
    console.error('Puan durumu getirme hatasÄ±:', error);
    // Index hatasÄ± durumunda standings hesaplanmaya Ã§alÄ±ÅŸÄ±lÄ±r
    if (error.code === 'failed-precondition' && error.message.includes('index')) {
      try {
        const calculated = await calculateTournamentStandings(tournamentId);
        if (calculated.success) {
          return calculated;
        }
      } catch (calcError) {
        console.error('Standings hesaplama hatasÄ±:', calcError);
      }
    }
    return {
      success: false,
      error: error.message
    };
  }
};

// Turnuva istatistikleri
export const getTournamentStatistics = async (tournamentId) => {
  try {
    const tournamentDoc = await getDoc(doc(db, 'tournaments', tournamentId));
    if (!tournamentDoc.exists()) {
      return { success: false, error: 'Turnuva bulunamadÄ±' };
    }
    
    const matchesResult = await getTournamentMatches(tournamentId);
    const matches = matchesResult.success ? matchesResult.data : [];
    
    const completedMatches = matches.filter(m => m.status === 'completed');
    const totalGoals = completedMatches.reduce((sum, m) => sum + (m.score1 || 0) + (m.score2 || 0), 0);
    const averageGoals = completedMatches.length > 0 ? totalGoals / completedMatches.length : 0;
    
    return {
      success: true,
      data: {
        totalMatches: matches.length,
        completedMatches: completedMatches.length,
        totalGoals,
        averageGoals: Math.round(averageGoals * 10) / 10
      }
    };
  } catch (error) {
    console.error('Turnuva istatistikleri getirme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Round Robin maÃ§larÄ±nÄ± otomatik oluÅŸtur
export const generateRoundRobinMatches = async (tournamentId) => {
  try {
    const tournamentDoc = await getDoc(doc(db, 'tournaments', tournamentId));
    if (!tournamentDoc.exists()) {
      return { success: false, error: 'Turnuva bulunamadÄ±' };
    }
    
    const tournament = tournamentDoc.data();
    
    // KatÄ±lÄ±mcÄ±larÄ± getir
    const participantsResult = await getTournamentParticipants(tournamentId);
    const participants = participantsResult.success ? participantsResult.data.filter(p => p.status === 'confirmed') : [];
    
    if (participants.length < 2) {
      return { success: false, error: 'En az 2 katÄ±lÄ±mcÄ± olmalÄ±dÄ±r' };
    }
    
    // Round Robin: Her katÄ±lÄ±mcÄ± diÄŸerleriyle bir kez oynar
    // N katÄ±lÄ±mcÄ± iÃ§in N*(N-1)/2 maÃ§ oluÅŸturulur
    const matches = [];
    let matchNumber = 1;
    
    for (let i = 0; i < participants.length; i++) {
      for (let j = i + 1; j < participants.length; j++) {
        matches.push({
          round: 1,
          matchNumber: matchNumber++,
          participant1Id: participants[i].participantId,
          participant2Id: participants[j].participantId,
          participant1Name: participants[i].participantName || '',
          participant2Name: participants[j].participantName || '',
          scheduledDate: null,
          scheduledTime: '',
          fieldId: null
        });
      }
    }
    
    // MaÃ§larÄ± oluÅŸtur
    const createResult = await createTournamentMatches(tournamentId, matches);
    
    // Turnuva durumunu gÃ¼ncelle
    await updateDoc(doc(db, 'tournaments', tournamentId), {
      status: 'ongoing',
      updatedAt: serverTimestamp()
    });
    
    return {
      success: true,
      matchCount: matches.length,
      matchIds: createResult.ids
    };
  } catch (error) {
    console.error('Round Robin maÃ§ oluÅŸturma hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// ==========================================
// Ã–deme Ä°ÅŸlemleri
// ==========================================

// Turnuva kayÄ±t Ã¼creti Ã¶deme iÅŸlemi
export const processTournamentPayment = async (tournamentId, participantId, paymentData) => {
  try {
    const participantResult = await getTournamentParticipants(tournamentId);
    const participants = participantResult.success ? participantResult.data : [];
    
    const participant = participants.find(p => p.participantId === participantId);
    if (!participant) {
      return { success: false, error: 'KayÄ±t bulunamadÄ±' };
    }
    
    // Payment data'yÄ± Firestore'a kaydet
    await updateDoc(doc(db, 'tournamentParticipants', participant.id), {
      paymentStatus: 'paid',
      paymentId: paymentData.paymentId || null,
      paymentMethod: paymentData.paymentMethod || 'card',
      paidAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    // Participant durumunu confirmed yap
    await updateDoc(doc(db, 'tournamentParticipants', participant.id), {
      status: 'confirmed',
      updatedAt: serverTimestamp()
    });
    
    return { success: true };
  } catch (error) {
    console.error('Turnuva Ã¶deme iÅŸlemi hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Turnuva Ã¶dÃ¼l daÄŸÄ±tÄ±mÄ±
export const distributeTournamentPrizes = async (tournamentId) => {
  try {
    const tournamentDoc = await getDoc(doc(db, 'tournaments', tournamentId));
    if (!tournamentDoc.exists()) {
      return { success: false, error: 'Turnuva bulunamadÄ±' };
    }
    
    const tournament = tournamentDoc.data();
    
    if (tournament.status !== 'completed') {
      return { success: false, error: 'Turnuva henÃ¼z tamamlanmadÄ±' };
    }
    
    if (tournament.prizePool <= 0) {
      return { success: false, error: 'Ã–dÃ¼l havuzu bulunmuyor' };
    }
    
    // Puan durumunu getir
    const standingsResult = await getTournamentStandings(tournamentId);
    if (!standingsResult.success) {
      return standingsResult;
    }
    
    const standings = standingsResult.data;
    const prizeDistribution = tournament.prizeDistribution || [];
    
    const prizeResults = [];
    
    for (const prizeRule of prizeDistribution) {
      const standing = standings.find(s => s.rank === prizeRule.rank);
      if (standing) {
        const prizeAmount = (tournament.prizePool * prizeRule.percentage) / 100;
        
        // Ã–dÃ¼lÃ¼ participant'a kaydet (Ã¶deme iÅŸlemi iÃ§in)
        prizeResults.push({
          participantId: standing.participantId,
          participantName: standing.participantName,
          rank: prizeRule.rank,
          prizeAmount,
          percentage: prizeRule.percentage
        });
      }
    }
    
    // Tournament'a prize distribution kaydÄ±nÄ± ekle
    await updateDoc(doc(db, 'tournaments', tournamentId), {
      prizeDistributed: true,
      prizeDistributionResults: prizeResults,
      prizeDistributedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return {
      success: true,
      data: prizeResults
    };
  } catch (error) {
    console.error('Ã–dÃ¼l daÄŸÄ±tÄ±m hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Turnuva kayÄ±t iadesi
export const refundTournamentRegistration = async (tournamentId, participantId) => {
  try {
    const participantResult = await getTournamentParticipants(tournamentId);
    const participants = participantResult.success ? participantResult.data : [];
    
    const participant = participants.find(p => p.participantId === participantId);
    if (!participant) {
      return { success: false, error: 'KayÄ±t bulunamadÄ±' };
    }
    
    if (participant.paymentStatus !== 'paid') {
      return { success: false, error: 'Ã–deme yapÄ±lmamÄ±ÅŸ' };
    }
    
    // Participant'Ä± refunded olarak iÅŸaretle
    await updateDoc(doc(db, 'tournamentParticipants', participant.id), {
      paymentStatus: 'refunded',
      refundedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return { success: true };
  } catch (error) {
    console.error('Ä°ade iÅŸlemi hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Ä°ki nokta arasÄ±ndaki mesafeyi hesapla (km)
const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // DÃ¼nya'nÄ±n yarÄ±Ã§apÄ± (km)
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// ========== OYUNCU FONKSÄ°YONLARI ==========

// Oyuncu rezervasyonlarÄ±nÄ± getir
export const getPlayerReservations = async (playerId) => {
  try {
    const rezervasyonlarRef = collection(db, 'rezervasyonlar');
    // orderBy'Ä± kaldÄ±rÄ±p client-side sÄ±ralama yapacaÄŸÄ±z (index hatasÄ± Ã¶nlemek iÃ§in)
    // Sadece userId (oluÅŸturan) deÄŸil, tÃ¼m katÄ±lÄ±mcÄ±lar (playerIds) gÃ¶rebilmeli
    const q = query(
      rezervasyonlarRef, 
      where('playerIds', 'array-contains', playerId)
    );
    
    const querySnapshot = await getDocs(q);
    const rezervasyonlar = [];
    
    querySnapshot.forEach((doc) => {
      rezervasyonlar.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Client-side sÄ±ralama - en yeni tarih Ã¶nce
    rezervasyonlar.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateB - dateA; // Descending order
    });
    
    return {
      success: true,
      data: rezervasyonlar
    };
  } catch (error) {
    console.error('Oyuncu rezervasyonlarÄ± getirme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Oyuncu istatistiklerini getir
export const getPlayerStats = async (playerId) => {
  try {
    const reservationsResult = await getPlayerReservations(playerId);
    const reservations = reservationsResult.success ? reservationsResult.data : [];
    
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    
    const stats = {
      totalMatches: reservations.length,
      upcomingMatches: reservations.filter(r => {
        const resDate = new Date(r.date);
        return resDate >= today && (r.status === 'confirmed' || r.status === 'pending');
      }).length,
      completedMatches: reservations.filter(r => r.status === 'completed').length,
      activeTournaments: 0 // TODO: Turnuva verisi eklendiÄŸinde gÃ¼ncellenecek
    };
    
    return {
      success: true,
      data: stats
    };
  } catch (error) {
    console.error('Oyuncu istatistikleri getirme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// TÃ¼m tesisleri getir (oyuncu iÃ§in)
export const getAllTesisler = async () => {
  try {
    const tesislerRef = collection(db, 'tesisler');
    const q = query(tesislerRef, where('status', '==', 'active'));
    
    const querySnapshot = await getDocs(q);
    const tesisler = [];
    
    querySnapshot.forEach((doc) => {
      tesisler.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return {
      success: true,
      data: tesisler
    };
  } catch (error) {
    console.error('Tesisler getirme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Ekip oluÅŸtur
export const createTeam = async (teamData) => {
  try {
    const docRef = await addDoc(collection(db, 'teams'), {
      ...teamData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return {
      success: true,
      id: docRef.id
    };
  } catch (error) {
    console.error('Ekip oluÅŸturma hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Oyuncunun ekiplerini getir
export const getPlayerTeams = async (playerId) => {
  try {
    const teamsRef = collection(db, 'teams');
    const q = query(
      teamsRef, 
      where('members', 'array-contains', playerId)
    );
    
    const querySnapshot = await getDocs(q);
    const teams = [];
    
    querySnapshot.forEach((doc) => {
      teams.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return {
      success: true,
      data: teams
    };
  } catch (error) {
    console.error('Ekipler getirme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Ekipe Ã¼ye ekle
export const addTeamMember = async (teamId, memberId) => {
  try {
    const teamDoc = doc(db, 'teams', teamId);
    const teamData = await getDoc(teamDoc);
    
    if (!teamData.exists()) {
      return {
        success: false,
        error: 'Ekip bulunamadÄ±'
      };
    }
    
    const currentMembers = teamData.data().members || [];
    
    if (currentMembers.includes(memberId)) {
      return {
        success: false,
        error: 'KullanÄ±cÄ± zaten ekibe dahil'
      };
    }
    
    const maxMembers = teamData.data().maxMembers || 22;
    if (currentMembers.length >= maxMembers) {
      return {
        success: false,
        error: 'Ekip kapasitesi dolmuÅŸ'
      };
    }
    
    await updateDoc(teamDoc, {
      members: [...currentMembers, memberId],
      updatedAt: serverTimestamp()
    });
    
    return {
      success: true
    };
  } catch (error) {
    console.error('Ãœye ekleme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// TakÄ±m daveti gÃ¶nder
export const sendTeamInvitation = async (teamId, inviterId, invitedUserId) => {
  try {
    // 1. TakÄ±m bilgilerini al
    const teamDoc = await getDoc(doc(db, 'teams', teamId));
    if (!teamDoc.exists()) {
      return { success: false, error: 'TakÄ±m bulunamadÄ±' };
    }
    const teamData = teamDoc.data();

    // 2. KullanÄ±cÄ±nÄ±n zaten takÄ±mda olup olmadÄ±ÄŸÄ±nÄ± kontrol et
    if (teamData.members && teamData.members.includes(invitedUserId)) {
      return { success: false, error: 'KullanÄ±cÄ± zaten bu takÄ±mda.' };
    }

    // 3. Davet oluÅŸtur (Bildirim olarak)
    const notificationData = {
      userId: invitedUserId,
      type: 'team_invitation',
      link: '/oyuncu/ekip',
      title: 'TakÄ±m Daveti',
      message: `${teamData.name} takÄ±mÄ±na katÄ±lmaya davet edildiniz.`,
      relatedId: teamId, // TakÄ±m ID'si
      senderId: inviterId,
      status: 'pending', // pending, accepted, rejected
      read: false,
      createdAt: serverTimestamp()
    };
    
    await addDoc(collection(db, 'notifications'), notificationData);
    
    return { success: true };
  } catch (error) {
    console.error('TakÄ±m daveti gÃ¶nderme hatasÄ±:', error);
    return { success: false, error: error.message };
  }
};

// TakÄ±m davetine yanÄ±t ver
export const respondToTeamInvitation = async (notificationId, action, userId) => {
  try {
    const notifRef = doc(db, 'notifications', notificationId);
    const notifDoc = await getDoc(notifRef);

    if (!notifDoc.exists()) {
      return { success: false, error: 'Bildirim bulunamadÄ±' };
    }

    const notifData = notifDoc.data();
    
    // GÃ¼venlik kontrolÃ¼ kaldÄ±rÄ±ldÄ± veya hafifletildi.
    // notifData.userId === userId kontrolÃ¼ client side'da da yapÄ±labilir.
    
    if (action === 'accept') {
      // TakÄ±ma ekle
      const result = await addTeamMember(notifData.relatedId, userId);
      if (!result.success && result.error !== 'KullanÄ±cÄ± zaten ekibe dahil') return result;

      // Bildirimi gÃ¼ncelle
      await updateDoc(notifRef, {
        status: 'accepted',
        read: true,
        updatedAt: serverTimestamp()
      });

      // GÃ¶nderene (Kaptana) bildirim gÃ¶nder
      if (notifData.senderId) {
        await addDoc(collection(db, 'notifications'), {
            userId: notifData.senderId,
            type: 'team_join',
            title: 'Davet Kabul Edildi',
            message: 'GÃ¶nderdiÄŸiniz takÄ±m daveti kabul edildi.',
            relatedId: notifData.relatedId,
            read: false,
            createdAt: serverTimestamp()
        });
      }

    } else if (action === 'reject') {
      // Bildirimi gÃ¼ncelle
      await updateDoc(notifRef, {
        status: 'rejected',
        read: true,
        updatedAt: serverTimestamp()
      });

       // GÃ¶nderene bildirim
       if (notifData.senderId) {
         await addDoc(collection(db, 'notifications'), {
            userId: notifData.senderId,
            type: 'team_reject',
            title: 'Davet Reddedildi',
            message: 'GÃ¶nderdiÄŸiniz takÄ±m daveti reddedildi.',
            relatedId: notifData.relatedId,
            read: false,
            createdAt: serverTimestamp()
        });
       }
    }

    return { success: true };
  } catch (error) {
    console.error('Davet yanÄ±tlama hatasÄ±:', error);
    return { success: false, error: error.message };
  }
};

// KullanÄ±cÄ±yÄ± telefon numarasÄ± ile bul
export const getUserByPhone = async (phone) => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('phone', '==', phone.trim()));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return { success: false, error: 'KullanÄ±cÄ± bulunamadÄ±' };
    }

    const userDoc = querySnapshot.docs[0];
    return { success: true, data: { id: userDoc.id, ...userDoc.data() } };
  } catch (error) {
    console.error('KullanÄ±cÄ± arama hatasÄ±:', error);
    return { success: false, error: error.message };
  }
};

// Ä°simden kullanÄ±cÄ± bul (Basit displayName aramasÄ±)
export const searchUserByName = async (name) => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('displayName', '==', name.trim()));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
         const q2 = query(usersRef, where('fullName', '==', name.trim()));
         const querySnapshot2 = await getDocs(q2);
         if (querySnapshot2.empty) {
             return { success: false, error: 'KullanÄ±cÄ± bulunamadÄ±' };
         }
         const userDoc = querySnapshot2.docs[0];
         const userData = { id: userDoc.id, ...userDoc.data() };
         delete userData.password;
         return { success: true, data: userData };
    }
    
    const userDoc = querySnapshot.docs[0];
    const userData = { id: userDoc.id, ...userDoc.data() };
    delete userData.password;
    
    return { success: true, data: userData };
  } catch (error) {
    console.error('KullanÄ±cÄ± bulma (isim) hatasÄ±:', error);
    return { success: false, error: error.message };
  }
};



// Ekipten Ã¼ye Ã§Ä±kar
export const removeTeamMember = async (teamId, memberId) => {
  try {
    const teamDoc = doc(db, 'teams', teamId);
    const teamData = await getDoc(teamDoc);
    
    if (!teamData.exists()) {
      return {
        success: false,
        error: 'Ekip bulunamadÄ±'
      };
    }
    
    const currentMembers = teamData.data().members || [];
    const updatedMembers = currentMembers.filter(id => id !== memberId);
    
    // KaptanÄ± Ã§Ä±karamÄ±yoruz
    if (teamData.data().captainId === memberId) {
      return {
        success: false,
        error: 'Kaptan ekipten Ã§Ä±karÄ±lamaz'
      };
    }
    
    await updateDoc(teamDoc, {
      members: updatedMembers,
      updatedAt: serverTimestamp()
    });
    
    return {
      success: true
    };
  } catch (error) {
    console.error('Ãœye Ã§Ä±karma hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Ekip sil
export const deleteTeam = async (teamId) => {
  try {
    await deleteDoc(doc(db, 'teams', teamId));
    return {
      success: true
    };
  } catch (error) {
    console.error('Ekip silme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Ekip gÃ¼ncelle
export const updateTeam = async (teamId, teamData) => {
  try {
    await updateDoc(doc(db, 'teams', teamId), {
      ...teamData,
      updatedAt: serverTimestamp()
    });
    return {
      success: true
    };
  } catch (error) {
    console.error('Ekip gÃ¼ncelleme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Oyuncunun turnuvalarÄ±nÄ± getir
export const getPlayerTournaments = async (playerId) => {
  try {
    const tournamentsRef = collection(db, 'tournaments');
    const q = query(tournamentsRef);
    
    const querySnapshot = await getDocs(q);
    const tournaments = [];
    
    querySnapshot.forEach((doc) => {
      tournaments.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Oyuncunun Ã¼ye olduÄŸu turnuvalarÄ± filtrele
    const playerTournaments = tournaments.filter(tournament => {
      const participants = tournament.participants || [];
      return participants.includes(playerId);
    });
    
    return {
      success: true,
      data: playerTournaments
    };
  } catch (error) {
    console.error('Oyuncu turnuvalarÄ± getirme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Oyuncunun bildirimlerini getir
export const getPlayerNotifications = async (playerId) => {
  try {
    const notificationsRef = collection(db, 'notifications');
    // orderBy'Ä± kaldÄ±rÄ±p client-side sÄ±ralama yapacaÄŸÄ±z (index hatasÄ± Ã¶nlemek iÃ§in)
    const q = query(
      notificationsRef,
      where('userId', '==', playerId),
      limit(100)
    );
    
    const querySnapshot = await getDocs(q);
    const notifications = [];
    
    querySnapshot.forEach((doc) => {
      notifications.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Client-side sÄ±ralama - en yeni Ã¶nce
    notifications.sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() || new Date(0);
      const dateB = b.createdAt?.toDate?.() || new Date(0);
      return dateB - dateA; // Descending order
    });
    
    return {
      success: true,
      data: notifications
    };
  } catch (error) {
    console.error('Bildirimler getirme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Bildirimi okundu olarak iÅŸaretle
export const markNotificationAsRead = async (notificationId) => {
  try {
    await updateDoc(doc(db, 'notifications', notificationId), {
      read: true,
      readAt: serverTimestamp()
    });
    return {
      success: true
    };
  } catch (error) {
    console.error('Bildirim okundu iÅŸaretleme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// ==================== ADMIN SERVÄ°SLERÄ° ====================

// Platform istatistiklerini getir
export const getPlatformStats = async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    const [usersSnapshot, tesislerSnapshot, allReservationsSnapshot] = await Promise.all([
      getDocs(collection(db, 'users')),
      getDocs(collection(db, 'tesisler')),
      getDocs(collection(db, 'rezervasyonlar'))
    ]);

    const users = [];
    usersSnapshot.forEach((doc) => users.push({ id: doc.id, ...doc.data() }));

    const tesisler = [];
    tesislerSnapshot.forEach((doc) => tesisler.push({ id: doc.id, ...doc.data() }));

    const allReservations = [];
    allReservationsSnapshot.forEach((doc) => allReservations.push({ id: doc.id, ...doc.data() }));

    const todayReservations = allReservations.filter(r => {
      const resDate = new Date(r.date);
      return resDate.toDateString() === today.toDateString() && (r.status === 'confirmed' || r.status === 'completed');
    });

    const activeUsers = users.filter(u => u.onboardingCompleted && (u.userType === 'player' || u.userType === 'owner'));
    const activePlayers = users.filter(u => u.userType === 'player' && u.onboardingCompleted);
    const activeOwners = users.filter(u => u.userType === 'owner' && u.onboardingCompleted);
    const activeTesisler = tesisler.filter(t => t.status === 'active' || t.status === 'approved');

    const weeklyReservations = allReservations.filter(r => {
      const resDate = new Date(r.date);
      return resDate >= weekAgo && (r.status === 'confirmed' || r.status === 'completed');
    });

    const monthlyReservations = allReservations.filter(r => {
      const resDate = new Date(r.date);
      return resDate >= monthAgo && (r.status === 'confirmed' || r.status === 'completed');
    });

    const totalGMV = allReservations
      .filter(r => r.status === 'confirmed' || r.status === 'completed')
      .reduce((sum, r) => sum + (r.totalAmount || r.price || 0), 0);

    const weeklyGMV = weeklyReservations.reduce((sum, r) => sum + (r.totalAmount || r.price || 0), 0);
    const monthlyGMV = monthlyReservations.reduce((sum, r) => sum + (r.totalAmount || r.price || 0), 0);

    const avgBasketValue = allReservations.filter(r => r.status === 'confirmed' || r.status === 'completed').length > 0 
      ? totalGMV / allReservations.filter(r => r.status === 'confirmed' || r.status === 'completed').length 
      : 0;

    const cancelledReservations = allReservations.filter(r => r.status === 'cancelled');
    const cancellationRate = allReservations.length > 0 
      ? (cancelledReservations.length / allReservations.length) * 100 
      : 0;

    const conversionRate = activeUsers.length > 0 
      ? (allReservations.filter(r => r.status === 'confirmed' || r.status === 'completed').length / activeUsers.length) * 100 
      : 0;

    return {
      success: true,
      data: {
        totalReservations: {
          today: todayReservations.length,
          weekly: weeklyReservations.length,
          monthly: monthlyReservations.length,
          all: allReservations.filter(r => r.status === 'confirmed' || r.status === 'completed').length
        },
        activeUsers: {
          total: activeUsers.length,
          players: activePlayers.length,
          owners: activeOwners.length
        },
        gmv: {
          total: totalGMV,
          weekly: weeklyGMV,
          monthly: monthlyGMV
        },
        conversionRate: conversionRate,
        avgBasketValue: avgBasketValue,
        cancellationRate: cancellationRate,
        totalTesisler: activeTesisler.length,
        pendingTesisler: tesisler.filter(t => t.status === 'pending').length
      }
    };
  } catch (error) {
    console.error('Platform istatistikleri getirme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// TÃ¼m tesisleri getir (admin)
export const getAllTesislerAdmin = async (filters = {}) => {
  try {
    let q = query(collection(db, 'tesisler'));

    if (filters.status) {
      q = query(q, where('status', '==', filters.status));
    }

    const querySnapshot = await getDocs(q);
    const tesisler = [];

    querySnapshot.forEach((doc) => {
      tesisler.push({
        id: doc.id,
        ...doc.data()
      });
    });

    if (filters.sortBy === 'createdAt') {
      tesisler.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateB - dateA;
      });
    }

    return {
      success: true,
      data: tesisler
    };
  } catch (error) {
    console.error('Tesisler getirme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Tesis onayla/reddet
export const updateTesisStatus = async (tesisId, status, adminNotes = '') => {
  try {
    await updateDoc(doc(db, 'tesisler', tesisId), {
      status,
      adminNotes,
      statusUpdatedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('Tesis durumu gÃ¼ncelleme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Tesis istatistiklerini getir
export const getTesisStats = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'tesisler'));
    const tesisler = [];
    
    querySnapshot.forEach((doc) => {
      tesisler.push({
        id: doc.id,
        ...doc.data()
      });
    });

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const stats = {
      total: tesisler.length,
      pending: tesisler.filter(t => t.status === 'pending').length,
      approved: tesisler.filter(t => t.status === 'approved' || t.status === 'active').length,
      rejected: tesisler.filter(t => t.status === 'rejected').length,
      thisMonth: tesisler.filter(t => {
        const createdAt = t.createdAt?.toDate ? t.createdAt.toDate() : new Date(t.createdAt || 0);
        return createdAt >= thisMonthStart;
      }).length,
      byCity: {},
      byType: {}
    };

    tesisler.forEach(tesis => {
      const city = tesis.city || 'Bilinmiyor';
      const type = tesis.type || 'HalÄ± Saha';
      
      stats.byCity[city] = (stats.byCity[city] || 0) + 1;
      stats.byType[type] = (stats.byType[type] || 0) + 1;
    });

    return { success: true, data: stats };
  } catch (error) {
    console.error('Tesis istatistikleri getirme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Tesis rezervasyonlarÄ±nÄ± getir
export const getTesisReservations = async (tesisId, limitCount = 10) => {
  try {
    const q = query(
      collection(db, 'rezervasyonlar'),
      where('tesisId', '==', tesisId)
    );
    
    const querySnapshot = await getDocs(q);
    const reservations = [];
    
    querySnapshot.forEach((doc) => {
      reservations.push({
        id: doc.id,
        ...doc.data()
      });
    });

    reservations.sort((a, b) => {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
      return dateB - dateA;
    });

    const stats = {
      total: reservations.length,
      confirmed: reservations.filter(r => r.status === 'confirmed' || r.status === 'completed').length,
      pending: reservations.filter(r => r.status === 'pending').length,
      cancelled: reservations.filter(r => r.status === 'cancelled').length,
      totalRevenue: reservations
        .filter(r => r.status === 'confirmed' || r.status === 'completed')
        .reduce((sum, r) => sum + (r.totalAmount || r.price || 0), 0)
    };

    return {
      success: true,
      data: reservations.slice(0, limitCount),
      stats
    };
  } catch (error) {
    console.error('Tesis rezervasyonlarÄ± getirme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Tesis gelir bilgilerini getir
export const getTesisRevenue = async (tesisId, period = 'month') => {
  try {
    const q = query(
      collection(db, 'rezervasyonlar'),
      where('tesisId', '==', tesisId)
    );
    
    const querySnapshot = await getDocs(q);
    const reservations = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.status === 'confirmed' || data.status === 'completed') {
        reservations.push({
          id: doc.id,
          ...data
        });
      }
    });

    const now = new Date();
    let startDate, endDate;
    
    switch (period) {
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(0);
    }
    endDate = new Date(now);

    const filteredReservations = reservations.filter(res => {
      const resDate = res.date?.toDate ? res.date.toDate() : new Date(res.date || 0);
      return resDate >= startDate && resDate <= endDate;
    });

    const revenue = {
      total: filteredReservations.reduce((sum, r) => sum + (r.totalAmount || r.price || 0), 0),
      count: filteredReservations.length,
      allTime: reservations.reduce((sum, r) => sum + (r.totalAmount || r.price || 0), 0),
      allTimeCount: reservations.length
    };

    return { success: true, data: revenue };
  } catch (error) {
    console.error('Tesis gelir bilgileri getirme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Tesis aktivite loglarÄ±nÄ± getir
export const getTesisActivityLogs = async (tesisId) => {
  try {
    const q = query(
      collection(db, 'adminActions'),
      where('tesisId', '==', tesisId)
    );
    
    const querySnapshot = await getDocs(q);
    const logs = [];
    
    querySnapshot.forEach((doc) => {
      logs.push({
        id: doc.id,
        ...doc.data()
      });
    });

    logs.sort((a, b) => {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
      return dateB - dateA;
    });

    return { success: true, data: logs };
  } catch (error) {
    console.error('Tesis aktivite loglarÄ± getirme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Toplu tesis silme
export const bulkDeleteTesis = async (tesisIds) => {
  try {
    const promises = tesisIds.map(id => deleteDoc(doc(db, 'tesisler', id)));
    await Promise.all(promises);
    return { success: true };
  } catch (error) {
    console.error('Toplu tesis silme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Toplu tesis gÃ¼ncelleme
export const bulkUpdateTesis = async (tesisIds, updates) => {
  try {
    const promises = tesisIds.map(id => 
      updateDoc(doc(db, 'tesisler', id), {
        ...updates,
        updatedAt: serverTimestamp()
      })
    );
    await Promise.all(promises);
    return { success: true };
  } catch (error) {
    console.error('Toplu tesis gÃ¼ncelleme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// TÃ¼m kullanÄ±cÄ±larÄ± getir (admin)
export const getAllUsers = async (filters = {}) => {
  try {
    let q = query(collection(db, 'users'));

    if (filters.userType) {
      q = query(q, where('userType', '==', filters.userType));
    }

    const querySnapshot = await getDocs(q);
    const users = [];

    querySnapshot.forEach((doc) => {
      users.push({
        id: doc.id,
        ...doc.data()
      });
    });

    return {
      success: true,
      data: users
    };
  } catch (error) {
    console.error('KullanÄ±cÄ±lar getirme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// KullanÄ±cÄ± durumunu gÃ¼ncelle (ban/suspend)
export const updateUserStatus = async (userId, status, reason = '') => {
  try {
    await updateDoc(doc(db, 'users', userId), {
      accountStatus: status,
      accountStatusReason: reason,
      accountStatusUpdatedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('KullanÄ±cÄ± durumu gÃ¼ncelleme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// KullanÄ±cÄ± istatistiklerini getir
export const getUserStats = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'users'));
    const users = [];
    
    querySnapshot.forEach((doc) => {
      users.push({
        id: doc.id,
        ...doc.data()
      });
    });

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const stats = {
      total: users.length,
      active: users.filter(u => u.accountStatus === 'active' || !u.accountStatus).length,
      banned: users.filter(u => u.accountStatus === 'banned').length,
      suspended: users.filter(u => u.accountStatus === 'suspended').length,
      thisMonth: users.filter(u => {
        const createdAt = u.createdAt?.toDate ? u.createdAt.toDate() : new Date(u.createdAt || 0);
        return createdAt >= thisMonthStart;
      }).length,
      byType: {
        player: users.filter(u => u.userType === 'player').length,
        owner: users.filter(u => u.userType === 'owner').length,
        admin: users.filter(u => u.userType === 'admin').length
      },
      onboardingCompleted: users.filter(u => u.onboardingCompleted).length
    };

    return { success: true, data: stats };
  } catch (error) {
    console.error('KullanÄ±cÄ± istatistikleri getirme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// KullanÄ±cÄ± rezervasyonlarÄ±nÄ± getir
export const getUserReservations = async (userId, limitCount = 10) => {
  try {
    const q = query(
      collection(db, 'rezervasyonlar'),
      where('userId', '==', userId)
    );
    
    const querySnapshot = await getDocs(q);
    const reservations = [];
    
    querySnapshot.forEach((doc) => {
      reservations.push({
        id: doc.id,
        ...doc.data()
      });
    });

    reservations.sort((a, b) => {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
      return dateB - dateA;
    });

    const stats = {
      total: reservations.length,
      confirmed: reservations.filter(r => r.status === 'confirmed' || r.status === 'completed').length,
      pending: reservations.filter(r => r.status === 'pending').length,
      cancelled: reservations.filter(r => r.status === 'cancelled').length,
      totalSpent: reservations
        .filter(r => r.status === 'confirmed' || r.status === 'completed')
        .reduce((sum, r) => sum + (r.totalAmount || r.price || 0), 0)
    };

    return {
      success: true,
      data: reservations.slice(0, limitCount),
      stats
    };
  } catch (error) {
    console.error('KullanÄ±cÄ± rezervasyonlarÄ± getirme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// KullanÄ±cÄ± aktivite loglarÄ±nÄ± getir
export const getUserActivityLogs = async (userId) => {
  try {
    const q = query(
      collection(db, 'adminActions'),
      where('userId', '==', userId)
    );
    
    const querySnapshot = await getDocs(q);
    const logs = [];
    
    querySnapshot.forEach((doc) => {
      logs.push({
        id: doc.id,
        ...doc.data()
      });
    });

    logs.sort((a, b) => {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
      return dateB - dateA;
    });

    return { success: true, data: logs };
  } catch (error) {
    console.error('KullanÄ±cÄ± aktivite loglarÄ± getirme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Saha sahibi tesislerini getir
export const getUserTesis = async (userId) => {
  try {
    const q = query(
      collection(db, 'tesisler'),
      where('ownerId', '==', userId)
    );
    
    const querySnapshot = await getDocs(q);
    const tesisler = [];
    
    querySnapshot.forEach((doc) => {
      tesisler.push({
        id: doc.id,
        ...doc.data()
      });
    });

    return { success: true, data: tesisler };
  } catch (error) {
    console.error('KullanÄ±cÄ± tesisleri getirme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Toplu kullanÄ±cÄ± durum gÃ¼ncelleme
export const bulkUpdateUserStatus = async (userIds, status, reason = '') => {
  try {
    const promises = userIds.map(id => 
      updateDoc(doc(db, 'users', id), {
        accountStatus: status,
        accountStatusReason: reason,
        accountStatusUpdatedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
    );
    await Promise.all(promises);
    return { success: true };
  } catch (error) {
    console.error('Toplu kullanÄ±cÄ± durum gÃ¼ncelleme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Admin tarafÄ±ndan kullanÄ±cÄ± dÃ¼zenleme
export const updateUserDataAdmin = async (userId, userData) => {
  try {
    await updateDoc(doc(db, 'users', userId), {
      ...userData,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('KullanÄ±cÄ± dÃ¼zenleme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Admin tarafÄ±ndan kullanÄ±cÄ± silme
export const deleteUserAdmin = async (userId) => {
  try {
    // Firestore'dan kullanÄ±cÄ± verilerini sil
    const userRef = doc(db, 'users', userId);
    await deleteDoc(userRef);

    // Ä°liÅŸkili rezervasyonlardan kullanÄ±cÄ±yÄ± kaldÄ±r (userId alanÄ± varsa)
    const reservationsQuery = query(
      collection(db, 'rezervasyonlar'),
      where('userId', '==', userId)
    );
    const reservationsSnapshot = await getDocs(reservationsQuery);
    const batch = [];
    reservationsSnapshot.forEach((docSnap) => {
      batch.push(updateDoc(doc(db, 'rezervasyonlar', docSnap.id), {
        userId: null,
        customerName: 'SilinmiÅŸ KullanÄ±cÄ±',
        updatedAt: serverTimestamp()
      }));
    });
    if (batch.length > 0) {
      await Promise.all(batch);
    }

    // Saha sahibi ise tesislerini kontrol et (opsiyonel - tesisleri silmek yerine ownerId'yi null yapabiliriz)
    const tesisQuery = query(
      collection(db, 'tesisler'),
      where('ownerId', '==', userId)
    );
    const tesisSnapshot = await getDocs(tesisQuery);
    const tesisBatch = [];
    tesisSnapshot.forEach((docSnap) => {
      tesisBatch.push(updateDoc(doc(db, 'tesisler', docSnap.id), {
        ownerId: null,
        ownerName: 'SilinmiÅŸ KullanÄ±cÄ±',
        updatedAt: serverTimestamp()
      }));
    });
    if (tesisBatch.length > 0) {
      await Promise.all(tesisBatch);
    }

    return { success: true };
  } catch (error) {
    console.error('KullanÄ±cÄ± silme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Toplu kullanÄ±cÄ± silme
export const bulkDeleteUsers = async (userIds) => {
  try {
    const promises = userIds.map(id => deleteUserAdmin(id));
    await Promise.all(promises);
    return { success: true };
  } catch (error) {
    console.error('Toplu kullanÄ±cÄ± silme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Rezervasyon istatistiklerini getir
export const getReservationStats = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'rezervasyonlar'));
    const reservations = [];
    
    querySnapshot.forEach((doc) => {
      reservations.push({
        id: doc.id,
        ...doc.data()
      });
    });

    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const stats = {
      total: reservations.length,
      confirmed: reservations.filter(r => r.status === 'confirmed' || r.status === 'completed').length,
      pending: reservations.filter(r => r.status === 'pending' || r.status === 'pending_payment').length,
      cancelled: reservations.filter(r => r.status === 'cancelled').length,
      today: reservations.filter(r => {
        const resDate = r.date?.toDate ? r.date.toDate() : new Date(r.date || 0);
        resDate.setHours(0, 0, 0, 0);
        return resDate.getTime() === today.getTime();
      }).length,
      thisMonth: reservations.filter(r => {
        const resDate = r.date?.toDate ? r.date.toDate() : new Date(r.date || 0);
        return resDate >= thisMonthStart;
      }).length,
      totalRevenue: reservations
        .filter(r => r.status === 'confirmed' || r.status === 'completed')
        .reduce((sum, r) => sum + (r.totalAmount || r.price || 0), 0),
      byTesis: {}
    };

    reservations.forEach(res => {
      const tesisName = res.tesisName || 'Bilinmiyor';
      stats.byTesis[tesisName] = (stats.byTesis[tesisName] || 0) + 1;
    });

    return { success: true, data: stats };
  } catch (error) {
    console.error('Rezervasyon istatistikleri getirme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Rezervasyon detaylarÄ±nÄ± getir
export const getReservationDetails = async (reservationId) => {
  try {
    const reservationDoc = await getDoc(doc(db, 'rezervasyonlar', reservationId));
    if (reservationDoc.exists()) {
      return {
        success: true,
        data: {
          id: reservationDoc.id,
          ...reservationDoc.data()
        }
      };
    } else {
      return {
        success: false,
        error: 'Rezervasyon bulunamadÄ±'
      };
    }
  } catch (error) {
    console.error('Rezervasyon detaylarÄ± getirme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Rezervasyon aktivite loglarÄ±nÄ± getir
export const getReservationActivityLogs = async (reservationId) => {
  try {
    const q = query(
      collection(db, 'adminActions'),
      where('reservationId', '==', reservationId)
    );
    
    const querySnapshot = await getDocs(q);
    const logs = [];
    
    querySnapshot.forEach((doc) => {
      logs.push({
        id: doc.id,
        ...doc.data()
      });
    });

    logs.sort((a, b) => {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
      return dateB - dateA;
    });

    return { success: true, data: logs };
  } catch (error) {
    console.error('Rezervasyon aktivite loglarÄ± getirme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Toplu rezervasyon durum gÃ¼ncelleme
export const bulkUpdateReservationStatus = async (reservationIds, status) => {
  try {
    const promises = reservationIds.map(id => 
      updateReservationStatus(id, status)
    );
    await Promise.all(promises);
    return { success: true };
  } catch (error) {
    console.error('Toplu rezervasyon durum gÃ¼ncelleme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Toplu rezervasyon silme
export const bulkDeleteReservations = async (reservationIds) => {
  try {
    const promises = reservationIds.map(id => deleteRezervasyon(id));
    await Promise.all(promises);
    return { success: true };
  } catch (error) {
    console.error('Toplu rezervasyon silme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Admin tarafÄ±ndan rezervasyon dÃ¼zenleme
export const updateReservationAdmin = async (reservationId, reservationData) => {
  try {
    // Undefined deÄŸerleri filtrele
    const cleanData = {};
    Object.keys(reservationData).forEach(key => {
      if (reservationData[key] !== undefined && reservationData[key] !== null) {
        cleanData[key] = reservationData[key];
      }
    });

    await updateDoc(doc(db, 'rezervasyonlar', reservationId), {
      ...cleanData,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('Rezervasyon dÃ¼zenleme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// KullanÄ±cÄ± tipini gÃ¼ncelle (admin iÃ§in)
export const updateUserType = async (userId, userType) => {
  try {
    await updateDoc(doc(db, 'users', userId), {
      userType,
      onboardingCompleted: true,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('KullanÄ±cÄ± tipi gÃ¼ncelleme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// TÃ¼m rezervasyonlarÄ± getir (admin)
export const getAllReservations = async (filters = {}) => {
  try {
    let q = query(collection(db, 'rezervasyonlar'));

    if (filters.status) {
      q = query(q, where('status', '==', filters.status));
    }

    const querySnapshot = await getDocs(q);
    const reservations = [];

    querySnapshot.forEach((doc) => {
      reservations.push({
        id: doc.id,
        ...doc.data()
      });
    });

    reservations.sort((a, b) => {
      const dateA = new Date(a.createdAt?.toDate?.() || a.date || 0);
      const dateB = new Date(b.createdAt?.toDate?.() || b.date || 0);
      return dateB - dateA;
    });

    return {
      success: true,
      data: reservations
    };
  } catch (error) {
    console.error('Rezervasyonlar getirme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Åikayet ekle
export const createComplaint = async (complaintData) => {
  try {
    const docRef = await addDoc(collection(db, 'complaints'), {
      ...complaintData,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return {
      success: true,
      id: docRef.id
    };
  } catch (error) {
    console.error('Åikayet oluÅŸturma hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// TÃ¼m ÅŸikayetleri getir
export const getAllComplaints = async (filters = {}) => {
  try {
    let q = query(collection(db, 'complaints'));

    if (filters.status) {
      q = query(q, where('status', '==', filters.status));
    }

    const querySnapshot = await getDocs(q);
    const complaints = [];

    querySnapshot.forEach((doc) => {
      complaints.push({
        id: doc.id,
        ...doc.data()
      });
    });

    complaints.sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() || new Date(0);
      const dateB = b.createdAt?.toDate?.() || new Date(0);
      return dateB - dateA;
    });

    return {
      success: true,
      data: complaints
    };
  } catch (error) {
    console.error('Åikayetler getirme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Åikayet durumunu gÃ¼ncelle
export const updateComplaintStatus = async (complaintId, status, adminNotes = '') => {
  try {
    await updateDoc(doc(db, 'complaints', complaintId), {
      status,
      adminNotes,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('Åikayet durumu gÃ¼ncelleme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Platform ayarlarÄ±nÄ± getir
export const getPlatformSettings = async () => {
  try {
    const settingsDoc = await getDoc(doc(db, 'platformSettings', 'main'));
    if (settingsDoc.exists()) {
      return {
        success: true,
        data: settingsDoc.data()
      };
    } else {
      const defaultSettings = {
        userCommissionRate: 5,
        ownerCommissionRate: 5,
        minCommission: 0,
        currency: 'TRY',
        paymentGateway: 'iyzico',
        supportEmail: 'destek@sahada.com',
        supportPhone: '+90 555 123 45 67'
      };
      await setDoc(doc(db, 'platformSettings', 'main'), defaultSettings);
      return {
        success: true,
        data: defaultSettings
      };
    }
  } catch (error) {
    console.error('Platform ayarlarÄ± getirme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Hero iÃ§eriÄŸini getir
export const getHeroContent = async () => {
  try {
    const heroDoc = await getDoc(doc(db, 'heroContent', 'main'));
    if (heroDoc.exists()) {
      return {
        success: true,
        data: heroDoc.data()
      };
    } else {
      const defaultHeroContent = {
        title: 'Adam Eksik Mi? Saha MÄ± ArÄ±yorsun?',
        subtitle: 'TÃ¼rkiye\'nin en bÃ¼yÃ¼k spor platformunda 15.000+ tesisten seÃ§, anÄ±nda oyuncu bul, online rezervasyon yap!',
        activeUsersText: 'kiÅŸi ÅŸu an online',
        backgroundColor: {
          from: '#00a651',
          to: '#04c956'
        },
        tabs: [
          { key: 'saha', label: 'Saha Kirala' },
          { key: 'oyuncu', label: 'Oyuncu Bul' },
          { key: 'takim', label: 'TakÄ±m Ara' }
        ],
        searchFields: {
          sportTypes: ['TÃ¼mÃ¼', 'Futbol', 'Basketbol', 'Tenis'],
          timeSlots: [
            'TÃ¼mÃ¼',
            'Sabah (06:00-12:00)',
            'Ã–ÄŸle (12:00-18:00)',
            'AkÅŸam (18:00-00:00)',
            'Gece (00:00-06:00)'
          ]
        },
        searchButtonText: 'Ara',
        enabled: true
      };
      await setDoc(doc(db, 'heroContent', 'main'), defaultHeroContent);
      return {
        success: true,
        data: defaultHeroContent
      };
    }
  } catch (error) {
    console.error('Hero iÃ§eriÄŸi getirme hatasÄ±:', error);
    return {
      success: false,
      error: error.message,
      data: {
        title: 'Adam Eksik Mi? Saha MÄ± ArÄ±yorsun?',
        subtitle: 'TÃ¼rkiye\'nin en bÃ¼yÃ¼k spor platformunda 15.000+ tesisten seÃ§, anÄ±nda oyuncu bul, online rezervasyon yap!',
        activeUsersText: 'kiÅŸi ÅŸu an online',
        backgroundColor: {
          from: '#00a651',
          to: '#04c956'
        },
        tabs: [
          { key: 'saha', label: 'Saha Kirala' },
          { key: 'oyuncu', label: 'Oyuncu Bul' },
          { key: 'takim', label: 'TakÄ±m Ara' }
        ],
        searchFields: {
          sportTypes: ['TÃ¼mÃ¼', 'Futbol', 'Basketbol', 'Tenis'],
          timeSlots: [
            'TÃ¼mÃ¼',
            'Sabah (06:00-12:00)',
            'Ã–ÄŸle (12:00-18:00)',
            'AkÅŸam (18:00-00:00)',
            'Gece (00:00-06:00)'
          ]
        },
        searchButtonText: 'Ara',
        enabled: true
      }
    };
  }
};

// Hero iÃ§eriÄŸini gÃ¼ncelle
export const updateHeroContent = async (heroData) => {
  try {
    await setDoc(doc(db, 'heroContent', 'main'), {
      ...heroData,
      updatedAt: serverTimestamp()
    }, { merge: true });
    return { success: true };
  } catch (error) {
    console.error('Hero iÃ§eriÄŸi gÃ¼ncelleme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Platform ayarlarÄ±nÄ± gÃ¼ncelle
export const updatePlatformSettings = async (settings) => {
  try {
    await setDoc(doc(db, 'platformSettings', 'main'), {
      ...settings,
      updatedAt: serverTimestamp()
    }, { merge: true });
    return { success: true };
  } catch (error) {
    console.error('Platform ayarlarÄ± gÃ¼ncelleme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// ==================== MARKETING SERVÄ°SLERÄ° ====================

// Promosyon kodu oluÅŸtur
export const createPromotion = async (promotionData) => {
  try {
    const docRef = await addDoc(collection(db, 'promotions'), {
      ...promotionData,
      isActive: true,
      usageCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return {
      success: true,
      id: docRef.id
    };
  } catch (error) {
    console.error('Promosyon oluÅŸturma hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// TÃ¼m promosyon kodlarÄ±nÄ± getir
export const getAllPromotions = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'promotions'));
    const promotions = [];

    querySnapshot.forEach((doc) => {
      promotions.push({
        id: doc.id,
        ...doc.data()
      });
    });

    promotions.sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() || new Date(0);
      const dateB = b.createdAt?.toDate?.() || new Date(0);
      return dateB - dateA;
    });

    return {
      success: true,
      data: promotions
    };
  } catch (error) {
    console.error('Promosyonlar getirme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Promosyon kodu gÃ¼ncelle
export const updatePromotion = async (promotionId, promotionData) => {
  try {
    await updateDoc(doc(db, 'promotions', promotionId), {
      ...promotionData,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('Promosyon gÃ¼ncelleme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Promosyon kodu sil
export const deletePromotion = async (promotionId) => {
  try {
    await deleteDoc(doc(db, 'promotions', promotionId));
    return { success: true };
  } catch (error) {
    console.error('Promosyon silme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// ==================== DESTEK SERVÄ°SLERÄ° ====================

// Ticket oluÅŸtur
export const createTicket = async (ticketData) => {
  try {
    const docRef = await addDoc(collection(db, 'tickets'), {
      ...ticketData,
      status: 'open',
      priority: ticketData.priority || 'medium',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return {
      success: true,
      id: docRef.id
    };
  } catch (error) {
    console.error('Ticket oluÅŸturma hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// TÃ¼m ticketlarÄ± getir
export const getAllTickets = async (filters = {}) => {
  try {
    let q = query(collection(db, 'tickets'));

    if (filters.status) {
      q = query(q, where('status', '==', filters.status));
    }

    if (filters.userId) {
      q = query(q, where('userId', '==', filters.userId));
    }

    const querySnapshot = await getDocs(q);
    const tickets = [];

    querySnapshot.forEach((doc) => {
      tickets.push({
        id: doc.id,
        ...doc.data()
      });
    });

    tickets.sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() || new Date(0);
      const dateB = b.createdAt?.toDate?.() || new Date(0);
      return dateB - dateA;
    });

    return {
      success: true,
      data: tickets
    };
  } catch (error) {
    console.error('Ticketlar getirme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Ticket gÃ¼ncelle
export const updateTicket = async (ticketId, ticketData) => {
  try {
    await updateDoc(doc(db, 'tickets', ticketId), {
      ...ticketData,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('Ticket gÃ¼ncelleme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// KullanÄ±cÄ±nÄ±n ticket'larÄ±nÄ± getir
export const getUserTickets = async (userId, filters = {}) => {
  try {
    let q = query(
      collection(db, 'tickets'),
      where('userId', '==', userId)
    );
    
    if (filters.status && filters.status !== 'all') {
      q = query(
        collection(db, 'tickets'),
        where('userId', '==', userId),
        where('status', '==', filters.status)
      );
    }
    
    const querySnapshot = await getDocs(q);
    const tickets = [];
    
    querySnapshot.forEach((doc) => {
      tickets.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Client-side sorting: en yeni Ã¶nce
    tickets.sort((a, b) => {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
      return dateB - dateA;
    });
    
    return {
      success: true,
      data: tickets
    };
  } catch (error) {
    console.error('KullanÄ±cÄ± ticketlarÄ± getirme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Ticket detaylarÄ±nÄ± getir
export const getTicketDetails = async (ticketId) => {
  try {
    const ticketDoc = await getDoc(doc(db, 'tickets', ticketId));
    
    if (!ticketDoc.exists()) {
      return {
        success: false,
        error: 'Ticket bulunamadÄ±'
      };
    }
    
    return {
      success: true,
      data: {
        id: ticketDoc.id,
        ...ticketDoc.data()
      }
    };
  } catch (error) {
    console.error('Ticket detay getirme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Ticket durumunu gÃ¼ncelle
export const updateTicketStatus = async (ticketId, status) => {
  try {
    await updateDoc(doc(db, 'tickets', ticketId), {
      status,
      updatedAt: serverTimestamp()
    });
    
    return {
      success: true
    };
  } catch (error) {
    console.error('Ticket durum gÃ¼ncelleme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Ticket'Ä± kapat
export const closeTicket = async (ticketId) => {
  try {
    await updateDoc(doc(db, 'tickets', ticketId), {
      status: 'closed',
      closedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return {
      success: true
    };
  } catch (error) {
    console.error('Ticket kapatma hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Ticket'Ä± yeniden aÃ§
export const reopenTicket = async (ticketId) => {
  try {
    await updateDoc(doc(db, 'tickets', ticketId), {
      status: 'open',
      updatedAt: serverTimestamp()
    });
    
    return {
      success: true
    };
  } catch (error) {
    console.error('Ticket yeniden aÃ§ma hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Ticket oluÅŸtur (createSupportTicket alias)
export const createSupportTicket = async (ticketData) => {
  return await createTicket(ticketData);
};

// Ticket yanÄ±tÄ± ekle (replyToTicket alias)
export const replyToTicket = async (ticketId, replyData) => {
  return await addTicketReply(ticketId, replyData);
};

// Ticket istatistiklerini getir
export const getTicketStats = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'tickets'));
    const tickets = [];
    
    querySnapshot.forEach((doc) => {
      tickets.push({
        id: doc.id,
        ...doc.data()
      });
    });

    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const stats = {
      total: tickets.length,
      open: tickets.filter(t => t.status === 'open').length,
      inProgress: tickets.filter(t => t.status === 'in_progress').length,
      resolved: tickets.filter(t => t.status === 'resolved').length,
      closed: tickets.filter(t => t.status === 'closed').length,
      today: tickets.filter(t => {
        const createdDate = t.createdAt?.toDate ? t.createdAt.toDate() : new Date(t.createdAt || 0);
        createdDate.setHours(0, 0, 0, 0);
        return createdDate.getTime() === today.getTime();
      }).length,
      thisMonth: tickets.filter(t => {
        const createdDate = t.createdAt?.toDate ? t.createdAt.toDate() : new Date(t.createdAt || 0);
        return createdDate >= thisMonthStart;
      }).length,
      byCategory: {},
      byPriority: {},
      averageResolutionTime: 0
    };

    // Ortalama Ã§Ã¶zÃ¼m sÃ¼resi hesapla (resolved/closed ticketlar iÃ§in)
    const resolvedTickets = tickets.filter(t => t.status === 'resolved' || t.status === 'closed');
    if (resolvedTickets.length > 0) {
      const totalTime = resolvedTickets.reduce((sum, ticket) => {
        const createdAt = ticket.createdAt?.toDate ? ticket.createdAt.toDate() : new Date(ticket.createdAt || 0);
        const resolvedAt = ticket.resolvedAt?.toDate ? ticket.resolvedAt.toDate() : 
                          ticket.closedAt?.toDate ? ticket.closedAt.toDate() : 
                          ticket.updatedAt?.toDate ? ticket.updatedAt.toDate() : new Date();
        const diff = resolvedAt - createdAt;
        return sum + (diff > 0 ? diff : 0);
      }, 0);
      stats.averageResolutionTime = Math.round(totalTime / resolvedTickets.length / (1000 * 60 * 60)); // Saat cinsinden
    }

    tickets.forEach(ticket => {
      const category = ticket.category || 'Bilinmiyor';
      const priority = ticket.priority || 'low';
      stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
      stats.byPriority[priority] = (stats.byPriority[priority] || 0) + 1;
    });

    return { success: true, data: stats };
  } catch (error) {
    console.error('Ticket istatistikleri getirme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Ticket aktivite loglarÄ±nÄ± getir
export const getTicketActivityLogs = async (ticketId) => {
  try {
    const q = query(
      collection(db, 'auditLogs'),
      where('ticketId', '==', ticketId)
    );
    
    const querySnapshot = await getDocs(q);
    const logs = [];
    
    querySnapshot.forEach((doc) => {
      logs.push({
        id: doc.id,
        ...doc.data()
      });
    });

    logs.sort((a, b) => {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || a.timestamp?.toDate?.() || 0);
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || b.timestamp?.toDate?.() || 0);
      return dateB - dateA;
    });

    return { success: true, data: logs };
  } catch (error) {
    console.error('Ticket aktivite loglarÄ± getirme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Toplu ticket durum gÃ¼ncelleme
export const bulkUpdateTicketStatus = async (ticketIds, status) => {
  try {
    const promises = ticketIds.map(id => updateTicketStatus(id, status));
    await Promise.all(promises);
    return { success: true };
  } catch (error) {
    console.error('Toplu ticket durum gÃ¼ncelleme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Toplu ticket silme
export const bulkDeleteTickets = async (ticketIds) => {
  try {
    const promises = ticketIds.map(id => deleteTicketAdmin(id));
    await Promise.all(promises);
    return { success: true };
  } catch (error) {
    console.error('Toplu ticket silme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Admin tarafÄ±ndan ticket dÃ¼zenleme
export const updateTicketAdmin = async (ticketId, ticketData) => {
  try {
    // Undefined deÄŸerleri filtrele
    const cleanData = {};
    Object.keys(ticketData).forEach(key => {
      if (ticketData[key] !== undefined && ticketData[key] !== null) {
        cleanData[key] = ticketData[key];
      }
    });

    await updateDoc(doc(db, 'tickets', ticketId), {
      ...cleanData,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('Ticket dÃ¼zenleme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Admin tarafÄ±ndan ticket silme
export const deleteTicketAdmin = async (ticketId) => {
  try {
    await deleteDoc(doc(db, 'tickets', ticketId));
    return { success: true };
  } catch (error) {
    console.error('Ticket silme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export const addTicketReply = async (ticketId, replyData) => {
  try {
    const ticketDoc = await getDoc(doc(db, 'tickets', ticketId));
    if (ticketDoc.exists()) {
      const ticket = ticketDoc.data();
      const replies = ticket.replies || [];
      
      replies.push({
        ...replyData,
        createdAt: new Date()
      });
      
      await updateDoc(doc(db, 'tickets', ticketId), {
        replies,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    }
    return {
      success: false,
      error: 'Ticket bulunamadÄ±'
    };
  } catch (error) {
    console.error('Ticket yanÄ±tÄ± ekleme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// ==================== Ã–DEME YÃ–NTEMLERÄ° SERVÄ°SLERÄ° ====================

// KullanÄ±cÄ±nÄ±n Ã¶deme yÃ¶ntemlerini getir
export const getPlayerPaymentMethods = async (userId) => {
  try {
    const paymentMethodsRef = collection(db, 'users', userId, 'paymentMethods');
    const querySnapshot = await getDocs(paymentMethodsRef);
    
    const paymentMethods = [];
    querySnapshot.forEach((doc) => {
      paymentMethods.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // VarsayÄ±lan Ã¶deme yÃ¶ntemini Ã¶nce gÃ¶ster
    paymentMethods.sort((a, b) => {
      if (a.isDefault && !b.isDefault) return -1;
      if (!a.isDefault && b.isDefault) return 1;
      return 0;
    });
    
    return {
      success: true,
      data: paymentMethods
    };
  } catch (error) {
    console.error('Ã–deme yÃ¶ntemleri getirme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Yeni Ã¶deme yÃ¶ntemi ekle
export const addPaymentMethod = async (userId, paymentMethodData) => {
  try {
    const paymentMethodsRef = collection(db, 'users', userId, 'paymentMethods');
    
    // EÄŸer varsayÄ±lan olarak iÅŸaretlenmiÅŸse, diÄŸerlerini varsayÄ±lan olmaktan Ã§Ä±kar
    if (paymentMethodData.isDefault) {
      const existingMethods = await getPlayerPaymentMethods(userId);
      if (existingMethods.success) {
        for (const method of existingMethods.data) {
          if (method.isDefault) {
            await updateDoc(doc(db, 'users', userId, 'paymentMethods', method.id), {
              isDefault: false,
              updatedAt: serverTimestamp()
            });
          }
        }
      }
    }
    
    const docRef = await addDoc(paymentMethodsRef, {
      ...paymentMethodData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return {
      success: true,
      id: docRef.id
    };
  } catch (error) {
    console.error('Ã–deme yÃ¶ntemi ekleme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Ã–deme yÃ¶ntemi gÃ¼ncelle
export const updatePaymentMethod = async (userId, paymentMethodId, paymentMethodData) => {
  try {
    const paymentMethodRef = doc(db, 'users', userId, 'paymentMethods', paymentMethodId);
    
    // EÄŸer varsayÄ±lan olarak iÅŸaretlenmiÅŸse, diÄŸerlerini varsayÄ±lan olmaktan Ã§Ä±kar
    if (paymentMethodData.isDefault) {
      const existingMethods = await getPlayerPaymentMethods(userId);
      if (existingMethods.success) {
        for (const method of existingMethods.data) {
          if (method.id !== paymentMethodId && method.isDefault) {
            await updateDoc(doc(db, 'users', userId, 'paymentMethods', method.id), {
              isDefault: false,
              updatedAt: serverTimestamp()
            });
          }
        }
      }
    }
    
    await updateDoc(paymentMethodRef, {
      ...paymentMethodData,
      updatedAt: serverTimestamp()
    });
    
    return {
      success: true
    };
  } catch (error) {
    console.error('Ã–deme yÃ¶ntemi gÃ¼ncelleme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Ã–deme yÃ¶ntemi sil
export const deletePaymentMethod = async (userId, paymentMethodId) => {
  try {
    const paymentMethodRef = doc(db, 'users', userId, 'paymentMethods', paymentMethodId);
    await deleteDoc(paymentMethodRef);
    
    return {
      success: true
    };
  } catch (error) {
    console.error('Ã–deme yÃ¶ntemi silme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// VarsayÄ±lan Ã¶deme yÃ¶ntemi ayarla
export const setDefaultPaymentMethod = async (userId, paymentMethodId) => {
  try {
    // Ã–nce tÃ¼m Ã¶deme yÃ¶ntemlerini varsayÄ±lan olmaktan Ã§Ä±kar
    const existingMethods = await getPlayerPaymentMethods(userId);
    if (existingMethods.success) {
      for (const method of existingMethods.data) {
        if (method.isDefault) {
          await updateDoc(doc(db, 'users', userId, 'paymentMethods', method.id), {
            isDefault: false,
            updatedAt: serverTimestamp()
          });
        }
      }
    }
    
    // SeÃ§ilen Ã¶deme yÃ¶ntemini varsayÄ±lan yap
    const paymentMethodRef = doc(db, 'users', userId, 'paymentMethods', paymentMethodId);
    await updateDoc(paymentMethodRef, {
      isDefault: true,
      updatedAt: serverTimestamp()
    });
    
    return {
      success: true
    };
  } catch (error) {
    console.error('VarsayÄ±lan Ã¶deme yÃ¶ntemi ayarlama hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// FAQ oluÅŸtur
export const createFAQ = async (faqData) => {
  try {
    const docRef = await addDoc(collection(db, 'faqs'), {
      ...faqData,
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return {
      success: true,
      id: docRef.id
    };
  } catch (error) {
    console.error('FAQ oluÅŸturma hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// TÃ¼m FAQ'larÄ± getir
export const getAllFAQs = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'faqs'));
    const faqs = [];

    querySnapshot.forEach((doc) => {
      faqs.push({
        id: doc.id,
        ...doc.data()
      });
    });

    faqs.sort((a, b) => {
      const orderA = a.order || 0;
      const orderB = b.order || 0;
      return orderA - orderB;
    });

    return {
      success: true,
      data: faqs
    };
  } catch (error) {
    console.error('FAQ\'lar getirme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// FAQ gÃ¼ncelle
export const updateFAQ = async (faqId, faqData) => {
  try {
    await updateDoc(doc(db, 'faqs', faqId), {
      ...faqData,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('FAQ gÃ¼ncelleme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// FAQ sil
export const deleteFAQ = async (faqId) => {
  try {
    await deleteDoc(doc(db, 'faqs', faqId));
    return { success: true };
  } catch (error) {
    console.error('FAQ silme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// ==================== PREMIUM ÃœYELÄ°K SERVÄ°SLERÄ° ====================

// Premium Ã¼yelik oluÅŸtur veya gÃ¼ncelle
export const createOrUpdateMembership = async (userId, membershipData) => {
  try {
    const membershipRef = doc(db, 'memberships', userId);
    await setDoc(membershipRef, {
      ...membershipData,
      updatedAt: serverTimestamp()
    }, { merge: true });

    await updateDoc(doc(db, 'users', userId), {
      membershipType: membershipData.type,
      membershipStartDate: membershipData.startDate,
      membershipEndDate: membershipData.endDate,
      updatedAt: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Premium Ã¼yelik oluÅŸturma hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Premium Ã¼yelik bilgisini getir
export const getMembership = async (userId) => {
  try {
    const membershipDoc = await getDoc(doc(db, 'memberships', userId));
    if (membershipDoc.exists()) {
      return {
        success: true,
        data: membershipDoc.data()
      };
    }
    return {
      success: true,
      data: null
    };
  } catch (error) {
    console.error('Premium Ã¼yelik getirme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Premium Ã¼yelik iptal et
export const cancelMembership = async (userId) => {
  try {
    await updateDoc(doc(db, 'memberships', userId), {
      status: 'cancelled',
      cancelledAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    await updateDoc(doc(db, 'users', userId), {
      membershipType: 'free',
      updatedAt: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Premium Ã¼yelik iptal hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// KullanÄ±cÄ±nÄ±n premium durumunu kontrol et
export const checkPremiumStatus = async (userId) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      const membershipType = userData.membershipType || 'free';
      const membershipEndDate = userData.membershipEndDate?.toDate?.() || null;

      if (membershipType === 'premium' && membershipEndDate) {
        const now = new Date();
        if (membershipEndDate > now) {
          return {
            success: true,
            isPremium: true,
            expiresAt: membershipEndDate
          };
        } else {
          return {
            success: true,
            isPremium: false,
            expired: true
          };
        }
      }
      return {
        success: true,
        isPremium: false
      };
    }
    return {
      success: true,
      isPremium: false
    };
  } catch (error) {
    console.error('Premium durum kontrol hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export const logAdminAction = async (adminId, action, details) => {
  try {
    // Undefined deÄŸerleri filtrele
    const cleanDetails = {};
    if (details && typeof details === 'object') {
      Object.keys(details).forEach(key => {
        if (details[key] !== undefined && details[key] !== null) {
          cleanDetails[key] = details[key];
        }
      });
    }

    await addDoc(collection(db, 'auditLogs'), {
      adminId,
      action,
      details: cleanDetails,
      timestamp: serverTimestamp(),
      createdAt: new Date()
    });
    return { success: true };
  } catch (error) {
    console.error('Audit log kayÄ±t hatasÄ±:', error);
    return { success: false, error: error.message };
  }
};

export const getAuditLogs = async (filters = {}) => {
  try {
    let q = query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc'));

    if (filters.adminId) {
      q = query(q, where('adminId', '==', filters.adminId));
    }
    if (filters.action) {
      q = query(q, where('action', '==', filters.action));
    }
    if (filters.limit) {
      q = query(q, limit(filters.limit));
    }

    const snapshot = await getDocs(q);
    const logs = [];
    snapshot.forEach((doc) => {
      logs.push({ id: doc.id, ...doc.data() });
    });

    return { success: true, data: logs };
  } catch (error) {
    console.error('Audit log yÃ¼kleme hatasÄ±:', error);
    return { success: false, error: error.message };
  }
};

// ==================== BAKÄ°YE VE CÃœZDAN SERVÄ°SLERÄ° ====================

// Saha sahibi bakiyesini gÃ¼ncelle
export const updateOwnerBalance = async (ownerId, amount, transactionData) => {
  try {
    await runTransaction(db, async (transaction) => {
      const userRef = doc(db, 'users', ownerId);
      const userDoc = await transaction.get(userRef);
      
      if (!userDoc.exists()) {
        throw new Error('KullanÄ±cÄ± bulunamadÄ±');
      }
      
      const currentBalance = userDoc.data().balance || 0;
      const newBalance = currentBalance + amount;
      
      // Bakiye gÃ¼ncelle
      transaction.update(userRef, {
        balance: newBalance,
        updatedAt: serverTimestamp()
      });
      
      // Wallet transaction kaydÄ± ekle
      const transactionRef = doc(collection(db, 'walletTransactions'));
      transaction.set(transactionRef, {
        ownerId,
        type: transactionData.type || 'reservation_income',
        amount: amount,
        reservationId: transactionData.reservationId || null,
        description: transactionData.description || '',
        timestamp: serverTimestamp(),
        status: transactionData.status || 'completed',
        createdAt: new Date()
      });
    });
    
    return { success: true };
  } catch (error) {
    console.error('Bakiye gÃ¼ncelleme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Saha sahibi bakiyesini getir
export const getOwnerBalance = async (ownerId) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', ownerId));
    if (userDoc.exists()) {
      return {
        success: true,
        data: {
          balance: userDoc.data().balance || 0
        }
      };
    } else {
      return {
        success: false,
        error: 'KullanÄ±cÄ± bulunamadÄ±'
      };
    }
  } catch (error) {
    console.error('Bakiye getirme hatasÄ±:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Wallet transaction geÃ§miÅŸini getir
export const getWalletTransactions = async (ownerId, filters = {}) => {
  try {
    let q = query(
      collection(db, 'walletTransactions'),
      where('ownerId', '==', ownerId)
    );

    if (filters.type) {
      q = query(q, where('type', '==', filters.type));
    }
    
    if (filters.status) {
      q = query(q, where('status', '==', filters.status));
    }
    
    if (filters.startDate) {
      q = query(q, where('timestamp', '>=', filters.startDate));
    }
    
    if (filters.endDate) {
      q = query(q, where('timestamp', '<=', filters.endDate));
    }

    const snapshot = await getDocs(q);
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

    // Apply limit after sorting
    if (filters.limit) {
      transactions.splice(filters.limit);
    }

    return { success: true, data: transactions };
  } catch (error) {
    console.error('Wallet transaction geÃ§miÅŸi getirme hatasÄ±:', error);
    return { success: false, error: error.message };
  }
};

// ==================== Ã‡EKÄ°M TALEPLERÄ° SERVÄ°SLERÄ° ====================

// Ã‡ekim talebi oluÅŸtur
export const createWithdrawalRequest = async (requestData) => {
  try {
    const { ownerId, amount, iban, fullName } = requestData;
    
    // KullanÄ±cÄ± bilgilerini al
    const userDoc = await getDoc(doc(db, 'users', ownerId));
    if (!userDoc.exists()) {
      return { success: false, error: 'KullanÄ±cÄ± bulunamadÄ±' };
    }
    
    const userData = userDoc.data();
    const currentBalance = userData.balance || 0;
    
    // Bakiye kontrolÃ¼
    if (currentBalance < amount) {
      return { success: false, error: 'Yetersiz bakiye' };
    }
    
    // Ã‡ekim talebi oluÅŸtur
    const withdrawalRef = doc(collection(db, 'withdrawalRequests'));
    await setDoc(withdrawalRef, {
      ownerId,
      ownerName: userData.displayName || userData.email || 'Bilinmiyor',
      ownerEmail: userData.email || '',
      amount: parseFloat(amount),
      iban: iban.trim(),
      fullName: fullName.trim(),
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return { success: true, data: { id: withdrawalRef.id } };
  } catch (error) {
    console.error('Ã‡ekim talebi oluÅŸturma hatasÄ±:', error);
    return { success: false, error: error.message };
  }
};

// TÃ¼m Ã§ekim taleplerini getir (Admin iÃ§in)
export const getAllWithdrawalRequests = async (filters = {}) => {
  try {
    let q = query(
      collection(db, 'withdrawalRequests'),
      orderBy('createdAt', 'desc')
    );
    
    if (filters.status) {
      q = query(q, where('status', '==', filters.status));
    }
    
    if (filters.limit) {
      q = query(q, limit(filters.limit));
    }
    
    const snapshot = await getDocs(q);
    const requests = [];
    snapshot.forEach((doc) => {
      requests.push({ id: doc.id, ...doc.data() });
    });
    
    return { success: true, data: requests };
  } catch (error) {
    console.error('Ã‡ekim talepleri getirme hatasÄ±:', error);
    return { success: false, error: error.message };
  }
};

// Ã‡ekim talebi durumunu gÃ¼ncelle (Admin iÃ§in)
export const updateWithdrawalRequestStatus = async (requestId, status, adminId, adminNote = '') => {
  try {
    const requestRef = doc(db, 'withdrawalRequests', requestId);
    const requestDoc = await getDoc(requestRef);
    
    if (!requestDoc.exists()) {
      return { success: false, error: 'Ã‡ekim talebi bulunamadÄ±' };
    }
    
    const requestData = requestDoc.data();
    
    // EÄŸer zaten iÅŸlenmiÅŸse tekrar iÅŸleme
    if (requestData.status !== 'pending') {
      return { success: false, error: 'Bu talep zaten iÅŸlenmiÅŸ' };
    }
    
    // OnaylandÄ±ÄŸÄ±nda bakiyeden dÃ¼ÅŸ
    if (status === 'approved') {
      const balanceResult = await getOwnerBalance(requestData.ownerId);
      if (!balanceResult.success) {
        return { success: false, error: 'Bakiye bilgisi alÄ±namadÄ±' };
      }
      
      const currentBalance = balanceResult.data.balance || 0;
      if (currentBalance < requestData.amount) {
        return { success: false, error: 'Yetersiz bakiye' };
      }
      
      // Bakiye gÃ¼ncelle (negatif amount ile dÃ¼ÅŸ)
      const updateResult = await updateOwnerBalance(
        requestData.ownerId,
        -requestData.amount,
        {
          type: 'withdrawal',
          description: `Ã‡ekim talebi - IBAN: ${requestData.iban}`,
          status: 'completed',
          withdrawalRequestId: requestId
        }
      );
      
      if (!updateResult.success) {
        return { success: false, error: 'Bakiye gÃ¼ncellenemedi' };
      }
    }
    
    // Ã‡ekim talebi durumunu gÃ¼ncelle
    const updateData = {
      status,
      updatedAt: serverTimestamp()
    };
    
    if (status === 'approved' || status === 'rejected') {
      updateData.processedAt = serverTimestamp();
      updateData.processedBy = adminId;
      if (adminNote) {
        updateData.adminNote = adminNote;
      }
    }
    
    await updateDoc(requestRef, updateData);
    
    return { success: true };
  } catch (error) {
    console.error('Ã‡ekim talebi durum gÃ¼ncelleme hatasÄ±:', error);
    return { success: false, error: error.message };
  }
};

// Saha sahibi iÃ§in Ã§ekim taleplerini getir
export const getWithdrawalRequestsByOwner = async (ownerId, filters = {}) => {
  try {
    let q = query(
      collection(db, 'withdrawalRequests'),
      where('ownerId', '==', ownerId)
    );
    
    if (filters.status) {
      q = query(q, where('status', '==', filters.status));
    }
    
    const snapshot = await getDocs(q);
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

    // Apply limit after sorting
    if (filters.limit) {
      requests.splice(filters.limit);
    }
    
    return { success: true, data: requests };
  } catch (error) {
    console.error('Saha sahibi Ã§ekim talepleri getirme hatasÄ±:', error);
    return { success: false, error: error.message };
  }
};

// ==================== PREMIUM YÃ–NETÄ°M SERVÄ°SLERÄ° (ADMIN) ====================

// TÃ¼m premium Ã¼yeleri getir
export const getAllPremiumMembers = async (filters = {}) => {
  try {
    let q = query(collection(db, 'memberships'), orderBy('createdAt', 'desc'));

    if (filters.status) {
      q = query(q, where('status', '==', filters.status));
    }
    if (filters.userType) {
      q = query(q, where('userType', '==', filters.userType));
    }
    if (filters.limit) {
      q = query(q, limit(filters.limit));
    }

    const snapshot = await getDocs(q);
    const members = [];

    for (const docSnap of snapshot.docs) {
      const membershipData = docSnap.data();
      const userId = docSnap.id;
      
      // KullanÄ±cÄ± bilgilerini getir
      const userDoc = await getDoc(doc(db, 'users', userId));
      const userData = userDoc.exists() ? userDoc.data() : null;

      members.push({
        id: docSnap.id,
        userId,
        ...membershipData,
        user: userData ? {
          fullName: userData.fullName,
          email: userData.email,
          phone: userData.phone,
          userType: userData.userType
        } : null
      });
    }

    return { success: true, data: members };
  } catch (error) {
    console.error('Premium Ã¼yeler getirme hatasÄ±:', error);
    return { success: false, error: error.message };
  }
};

// Premium istatistikleri getir
export const getPremiumStats = async () => {
  try {
    const membershipsSnapshot = await getDocs(collection(db, 'memberships'));
    const now = new Date();
    
    let totalMembers = 0;
    let activeMembers = 0;
    let cancelledMembers = 0;
    let expiredMembers = 0;
    let playerMembers = 0;
    let ownerMembers = 0;
    let monthlyRevenue = 0;
    let yearlyRevenue = 0;
    const monthlyTrend = {};
    const yearlyTrend = {};

    membershipsSnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      totalMembers++;

      // Durum sayÄ±larÄ±
      if (data.status === 'active') {
        activeMembers++;
        const endDate = data.endDate?.toDate?.() || new Date(data.endDate);
        if (endDate < now) {
          expiredMembers++;
        }
      } else if (data.status === 'cancelled') {
        cancelledMembers++;
      }

      // KullanÄ±cÄ± tipi
      if (data.userType === 'player') {
        playerMembers++;
      } else if (data.userType === 'owner') {
        ownerMembers++;
      }

      // Gelir hesaplama (plan fiyatÄ±ndan)
      if (data.planPrice) {
        if (data.duration === 'monthly') {
          monthlyRevenue += data.planPrice;
        } else if (data.duration === 'yearly') {
          yearlyRevenue += data.planPrice;
        }
      }

      // Trend hesaplama
      const createdAt = data.createdAt?.toDate?.() || new Date(data.createdAt);
      const monthKey = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}`;
      const yearKey = String(createdAt.getFullYear());

      monthlyTrend[monthKey] = (monthlyTrend[monthKey] || 0) + 1;
      yearlyTrend[yearKey] = (yearlyTrend[yearKey] || 0) + 1;
    });

    return {
      success: true,
      data: {
        totalMembers,
        activeMembers,
        cancelledMembers,
        expiredMembers,
        playerMembers,
        ownerMembers,
        monthlyRevenue,
        yearlyRevenue,
        monthlyTrend,
        yearlyTrend
      }
    };
  } catch (error) {
    console.error('Premium istatistikleri getirme hatasÄ±:', error);
    return { success: false, error: error.message };
  }
};

// Manuel premium Ã¼yelik oluÅŸtur (admin)
export const createPremiumMembership = async (userId, planId, adminId, customData = {}) => {
  try {
    // Plan bilgilerini getir
    const planDoc = await getDoc(doc(db, 'premiumPlans', planId));
    if (!planDoc.exists()) {
      return { success: false, error: 'Plan bulunamadÄ±' };
    }
    const planData = planDoc.data();

    // KullanÄ±cÄ± bilgilerini getir
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      return { success: false, error: 'KullanÄ±cÄ± bulunamadÄ±' };
    }
    const userData = userDoc.data();

    const startDate = customData.startDate ? new Date(customData.startDate) : new Date();
    const endDate = new Date(startDate);
    
    if (planData.duration === 'monthly') {
      endDate.setMonth(endDate.getMonth() + 1);
    } else if (planData.duration === 'yearly') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else if (customData.customDays) {
      endDate.setDate(endDate.getDate() + customData.customDays);
    }

    const membershipData = {
      type: 'premium',
      planId,
      planName: planData.name,
      planPrice: planData.price,
      duration: planData.duration || customData.duration,
      userType: userData.userType || 'player',
      startDate: Timestamp.fromDate(startDate),
      endDate: Timestamp.fromDate(endDate),
      status: 'active',
      createdBy: adminId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      ...customData
    };

    // Membership oluÅŸtur
    await setDoc(doc(db, 'memberships', userId), membershipData, { merge: true });

    // User gÃ¼ncelle
    await updateDoc(doc(db, 'users', userId), {
      membershipType: 'premium',
      membershipStartDate: Timestamp.fromDate(startDate),
      membershipEndDate: Timestamp.fromDate(endDate),
      updatedAt: serverTimestamp()
    });

    // Audit log
    await logAdminAction(adminId, 'premium_membership_created', {
      userId,
      planId,
      planName: planData.name,
      endDate: endDate.toISOString()
    });

    return { success: true };
  } catch (error) {
    console.error('Premium Ã¼yelik oluÅŸturma hatasÄ±:', error);
    return { success: false, error: error.message };
  }
};

// Premium Ã¼yelik gÃ¼ncelle
export const updatePremiumMembership = async (membershipId, data, adminId) => {
  try {
    const membershipRef = doc(db, 'memberships', membershipId);
    const updateData = {
      ...data,
      updatedAt: serverTimestamp(),
      updatedBy: adminId
    };

    // EÄŸer endDate gÃ¼ncelleniyorsa, user'Ä± da gÃ¼ncelle
    if (data.endDate) {
      const endDate = data.endDate instanceof Date ? Timestamp.fromDate(data.endDate) : data.endDate;
      updateData.endDate = endDate;
      
      await updateDoc(doc(db, 'users', membershipId), {
        membershipEndDate: endDate,
        updatedAt: serverTimestamp()
      });
    }

    await updateDoc(membershipRef, updateData);

    // Audit log
    await logAdminAction(adminId, 'premium_membership_updated', {
      membershipId,
      updates: data
    });

    return { success: true };
  } catch (error) {
    console.error('Premium Ã¼yelik gÃ¼ncelleme hatasÄ±:', error);
    return { success: false, error: error.message };
  }
};

// Premium Ã¼yelik iptal et (admin)
export const cancelPremiumMembership = async (membershipId, adminId, reason = '') => {
  try {
    await updateDoc(doc(db, 'memberships', membershipId), {
      status: 'cancelled',
      cancelledAt: serverTimestamp(),
      cancelledBy: adminId,
      cancellationReason: reason,
      updatedAt: serverTimestamp()
    });

    await updateDoc(doc(db, 'users', membershipId), {
      membershipType: 'free',
      updatedAt: serverTimestamp()
    });

    // Audit log
    await logAdminAction(adminId, 'premium_membership_cancelled', {
      membershipId,
      reason
    });

    return { success: true };
  } catch (error) {
    console.error('Premium Ã¼yelik iptal hatasÄ±:', error);
    return { success: false, error: error.message };
  }
};

// Premium planlarÄ± getir
export const getPremiumPlans = async () => {
  try {
    const snapshot = await getDocs(query(collection(db, 'premiumPlans'), orderBy('createdAt', 'desc')));
    const plans = [];
    snapshot.forEach((doc) => {
      plans.push({ id: doc.id, ...doc.data() });
    });
    return { success: true, data: plans };
  } catch (error) {
    console.error('Premium planlar getirme hatasÄ±:', error);
    return { success: false, error: error.message };
  }
};

// Premium plan oluÅŸtur
export const createPremiumPlan = async (planData) => {
  try {
    const planRef = await addDoc(collection(db, 'premiumPlans'), {
      ...planData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return { success: true, id: planRef.id };
  } catch (error) {
    console.error('Premium plan oluÅŸturma hatasÄ±:', error);
    return { success: false, error: error.message };
  }
};

// Premium plan gÃ¼ncelle
export const updatePremiumPlan = async (planId, planData) => {
  try {
    await updateDoc(doc(db, 'premiumPlans', planId), {
      ...planData,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('Premium plan gÃ¼ncelleme hatasÄ±:', error);
    return { success: false, error: error.message };
  }
};

// Premium plan sil
export const deletePremiumPlan = async (planId) => {
  try {
    await deleteDoc(doc(db, 'premiumPlans', planId));
    return { success: true };
  } catch (error) {
    console.error('Premium plan silme hatasÄ±:', error);
    return { success: false, error: error.message };
  }
};

// Premium Ã¶zellikleri getir
export const getPremiumFeatures = async () => {
  try {
    const snapshot = await getDocs(query(collection(db, 'premiumFeatures'), orderBy('order', 'asc')));
    const features = [];
    snapshot.forEach((doc) => {
      features.push({ id: doc.id, ...doc.data() });
    });
    return { success: true, data: features };
  } catch (error) {
    console.error('Premium Ã¶zellikler getirme hatasÄ±:', error);
    return { success: false, error: error.message };
  }
};

// Premium Ã¶zellik oluÅŸtur
export const createPremiumFeature = async (featureData) => {
  try {
    const featureRef = await addDoc(collection(db, 'premiumFeatures'), {
      ...featureData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return { success: true, id: featureRef.id };
  } catch (error) {
    console.error('Premium Ã¶zellik oluÅŸturma hatasÄ±:', error);
    return { success: false, error: error.message };
  }
};

// Premium Ã¶zellik gÃ¼ncelle
export const updatePremiumFeature = async (featureId, featureData) => {
  try {
    await updateDoc(doc(db, 'premiumFeatures', featureId), {
      ...featureData,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('Premium Ã¶zellik gÃ¼ncelleme hatasÄ±:', error);
    return { success: false, error: error.message };
  }
};

// Rezervasyon iptal et
export const cancelReservation = async (reservationId, playerId) => {
  try {
    const reservationRef = doc(db, 'rezervasyonlar', reservationId);
    const reservationDoc = await getDoc(reservationRef);
    
    if (!reservationDoc.exists()) {
      return { success: false, error: 'Rezervasyon bulunamadÄ±' };
    }
    
    const reservationData = reservationDoc.data();
    
    // Yetki kontrolÃ¼
    const isOrganizer = reservationData.userId === playerId;
    const isParticipant = (reservationData.playerIds && reservationData.playerIds.includes(playerId)) ||
                          (reservationData.players && Array.isArray(reservationData.players) && reservationData.players.includes(playerId)); // Eski veri desteÄŸi

    // Sadece players iÃ§inde string id olarak varsa includes Ã§alÄ±ÅŸÄ±r, obje ise Ã§alÄ±ÅŸmaz.
    // O yÃ¼zden isParticipant kontrolÃ¼nÃ¼ aÅŸaÄŸÄ±da daha detaylÄ± yapacaÄŸÄ±z veya playerIds'e gÃ¼veneceÄŸiz.
    // Yeni sistemde playerIds kesin var.

    if (!isOrganizer && !isParticipant) {
        // Obje array kontrolÃ¼
        const foundInObj = reservationData.players && Array.isArray(reservationData.players) && 
                           reservationData.players.some(p => (typeof p === 'object' && p.uid === playerId) || p === playerId);
        
        if (!foundInObj) {
            return { success: false, error: 'Bu rezervasyona eriÅŸim yetkiniz yok' };
        }
    }
    
    // Rezervasyon tarihini kontrol et (geÃ§miÅŸ rezervasyonlar iptal edilemez)
    const reservationDate = reservationData.date?.toDate ? reservationData.date.toDate() : new Date(reservationData.date);
    const now = new Date();
    
    if (reservationDate < now) {
      return { success: false, error: 'GeÃ§miÅŸ rezervasyonlar iptal edilemez' };
    }
    
    // EÄŸer OrganizatÃ¶r iptal ediyorsa tamamen iptal et
    if (isOrganizer) {
        await updateDoc(reservationRef, {
            status: 'cancelled',
            cancelledAt: serverTimestamp(),
            cancelledBy: playerId
        });
        return { success: true };
    }

    // KatÄ±lÄ±mcÄ± ise sadece kendini Ã§Ä±kar
    // 1. playerIds gÃ¼ncelle
    const updatedPlayerIds = (reservationData.playerIds || []).filter(id => id !== playerId);
    
    // 2. players gÃ¼ncelle (hem string hem obje olabilir)
    let updatedPlayers = [];
    if (reservationData.players && Array.isArray(reservationData.players)) {
        updatedPlayers = reservationData.players.filter(p => {
            if (typeof p === 'object') {
                return (p.uid || p.id) !== playerId;
            }
            return p !== playerId;
        });
    }

    // EÄŸer oyuncu kalmadÄ±ysa (teorik olarak organizatÃ¶r yoksa) iptal et
    if (updatedPlayers.length === 0 && updatedPlayerIds.length === 0) {
      await updateDoc(reservationRef, {
        status: 'cancelled',
        cancelledAt: serverTimestamp(),
        cancelledBy: playerId
      });
    } else {
      // Sadece oyuncuyu listeden Ã§Ä±kar
      await updateDoc(reservationRef, {
        playerIds: updatedPlayerIds,
        players: updatedPlayers,
        totalPlayers: updatedPlayers.length,
        updatedAt: serverTimestamp()
      });
    }
    
    return { success: true };
  } catch (error) {
    console.error('Rezervasyon iptal hatasÄ±:', error);
    return { success: false, error: error.message };
  }
};

// Fatura bilgilerini getir
export const getInvoice = async (reservationId, playerId) => {
  try {
    const reservationRef = doc(db, 'rezervasyonlar', reservationId);
    const reservationDoc = await getDoc(reservationRef);
    
    if (!reservationDoc.exists()) {
      return { success: false, error: 'Rezervasyon bulunamadÄ±' };
    }
    
    const reservationData = reservationDoc.data();
    
    // Oyuncunun bu rezervasyonda olup olmadÄ±ÄŸÄ±nÄ± kontrol et
    const isParticipant = (reservationData.playerIds && reservationData.playerIds.includes(playerId)) ||
                          (reservationData.players && Array.isArray(reservationData.players) && reservationData.players.includes(playerId)) || 
                          (reservationData.userId === playerId);

    if (!isParticipant) {
      return { success: false, error: 'Bu rezervasyona eriÅŸim yetkiniz yok' };
    }
    
    // Saha bilgilerini getir
    let tesisData = null;
    if (reservationData.tesisId) {
      const tesisRef = doc(db, 'tesisler', reservationData.tesisId);
      const tesisDoc = await getDoc(tesisRef);
      if (tesisDoc.exists()) {
        tesisData = { id: tesisDoc.id, ...tesisDoc.data() };
      }
    }
    
    const invoice = {
      reservationId: reservationId,
      reservationNumber: reservationData.reservationNumber || reservationId.slice(0, 8).toUpperCase(),
      date: reservationData.date?.toDate ? reservationData.date.toDate() : new Date(reservationData.date),
      tesisName: reservationData.tesisName || tesisData?.name || 'Bilinmeyen Saha',
      tesisAddress: tesisData?.address || tesisData?.location || '',
      timeSlot: reservationData.timeSlot || '',
      totalAmount: reservationData.totalAmount || reservationData.price || 0,
      playerCount: reservationData.totalPlayers || reservationData.players?.length || 0,
      amountPerPlayer: (reservationData.totalAmount || reservationData.price || 0) / (reservationData.totalPlayers || reservationData.players?.length || 1),
      status: reservationData.status,
      paymentMethod: reservationData.paymentMethod || 'N/A',
      createdAt: reservationData.createdAt?.toDate ? reservationData.createdAt.toDate() : new Date(reservationData.createdAt)
    };
    
    return { success: true, data: invoice };
  } catch (error) {
    console.error('Fatura getirme hatasÄ±:', error);
    return { success: false, error: error.message };
  }
};

// Oyuncu faturalarÄ±nÄ± getir
export const getPlayerInvoices = async (playerId) => {
  try {
    const reservationsResult = await getPlayerReservations(playerId);
    if (!reservationsResult.success) {
      return { success: false, error: reservationsResult.error };
    }
    
    const invoices = [];
    for (const reservation of reservationsResult.data) {
      const invoiceResult = await getInvoice(reservation.id, playerId);
      if (invoiceResult.success) {
        invoices.push(invoiceResult.data);
      }
    }
    
    return { success: true, data: invoices };
  } catch (error) {
    console.error('Oyuncu faturalarÄ± getirme hatasÄ±:', error);
    return { success: false, error: error.message };
  }
};

// Oyuncu profilini gÃ¼ncelle
export const updatePlayerProfile = async (userId, profileData) => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      ...profileData,
      updatedAt: serverTimestamp()
    });
    
    return { success: true };
  } catch (error) {
    console.error('Profil gÃ¼ncelleme hatasÄ±:', error);
    return { success: false, error: error.message };
  }
};

// Email'den kullanÄ±cÄ± bul
export const getUserByEmail = async (email) => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email.toLowerCase().trim()));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return { success: false, error: 'KullanÄ±cÄ± bulunamadÄ±' };
    }
    
    const userDoc = querySnapshot.docs[0];
    const userData = { id: userDoc.id, ...userDoc.data() };
    
    // Hassas bilgileri Ã§Ä±kar
    delete userData.password;
    
    return { success: true, data: userData };
  } catch (error) {
    console.error('KullanÄ±cÄ± bulma hatasÄ±:', error);
    return { success: false, error: error.message };
  }
};

// TakÄ±mÄ± turnuvaya kaydet
export const registerTeamToTournament = async (tournamentId, teamId) => {
  try {
    const tournamentRef = doc(db, 'tournaments', tournamentId);
    const tournamentDoc = await getDoc(tournamentRef);
    
    if (!tournamentDoc.exists()) {
      return { success: false, error: 'Turnuva bulunamadÄ±' };
    }
    
    const tournamentData = tournamentDoc.data();
    const registeredTeams = tournamentData.registeredTeams || [];
    
    if (registeredTeams.includes(teamId)) {
      return { success: false, error: 'TakÄ±m zaten turnuvaya kayÄ±tlÄ±' };
    }
    
    if (registeredTeams.length >= (tournamentData.maxTeams || 0)) {
      return { success: false, error: 'Turnuva dolu' };
    }
    
    await updateDoc(tournamentRef, {
      registeredTeams: [...registeredTeams, teamId],
      updatedAt: serverTimestamp()
    });
    
    return { success: true };
  } catch (error) {
    console.error('Turnuva kayÄ±t hatasÄ±:', error);
    return { success: false, error: error.message };
  }
};

// Oyuncunun oynadÄ±ÄŸÄ± diÄŸer oyuncularÄ± getir
export const getPlayerPlayedWith = async (playerId) => {
  try {
    const reservationsResult = await getPlayerReservations(playerId);
    if (!reservationsResult.success) {
      return { success: false, error: reservationsResult.error };
    }
    
    const playerMap = new Map();
    
    reservationsResult.data.forEach(reservation => {
      if (reservation.players && Array.isArray(reservation.players)) {
        reservation.players.forEach(playerIdInRes => {
          if (playerIdInRes !== playerId) {
            if (!playerMap.has(playerIdInRes)) {
              playerMap.set(playerIdInRes, {
                playerId: playerIdInRes,
                matchCount: 0,
                lastPlayed: null
              });
            }
            const playerData = playerMap.get(playerIdInRes);
            playerData.matchCount++;
            
            const resDate = reservation.date?.toDate ? reservation.date.toDate() : new Date(reservation.date);
            if (!playerData.lastPlayed || resDate > playerData.lastPlayed) {
              playerData.lastPlayed = resDate;
            }
          }
        });
      }
    });
    
    // KullanÄ±cÄ± bilgilerini getir
    const playersWithInfo = [];
    for (const [playerIdKey, playerData] of playerMap.entries()) {
      try {
        const userDoc = await getDoc(doc(db, 'users', playerIdKey));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          playersWithInfo.push({
            ...playerData,
            fullName: userData.fullName || userData.displayName || 'Bilinmeyen',
            email: userData.email || '',
            avatar: userData.photoURL || null
          });
        }
      } catch (err) {
        console.error('KullanÄ±cÄ± bilgisi getirme hatasÄ±:', err);
      }
    }
    
    // En Ã§ok oynadÄ±ÄŸÄ± oyunculara gÃ¶re sÄ±rala
    playersWithInfo.sort((a, b) => b.matchCount - a.matchCount);
    
    return { success: true, data: playersWithInfo };
  } catch (error) {
    console.error('OynadÄ±ÄŸÄ± oyuncular getirme hatasÄ±:', error);
    return { success: false, error: error.message };
  }
};

// Favorilere ekle
export const addToFavorites = async (playerId, tesisId) => {
  try {
    const userRef = doc(db, 'users', playerId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      return { success: false, error: 'KullanÄ±cÄ± bulunamadÄ±' };
    }
    
    const userData = userDoc.data();
    const favorites = userData.favorites || [];
    
    if (favorites.includes(tesisId)) {
      return { success: false, error: 'Zaten favorilerde' };
    }
    
    await updateDoc(userRef, {
      favorites: [...favorites, tesisId],
      updatedAt: serverTimestamp()
    });
    
    return { success: true };
  } catch (error) {
    console.error('Favori ekleme hatasÄ±:', error);
    return { success: false, error: error.message };
  }
};

// Favorilerden Ã§Ä±kar
export const removeFromFavorites = async (playerId, tesisId) => {
  try {
    const userRef = doc(db, 'users', playerId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      return { success: false, error: 'KullanÄ±cÄ± bulunamadÄ±' };
    }
    
    const userData = userDoc.data();
    const favorites = (userData.favorites || []).filter(id => id !== tesisId);
    
    await updateDoc(userRef, {
      favorites,
      updatedAt: serverTimestamp()
    });
    
    return { success: true };
  } catch (error) {
    console.error('Favori Ã§Ä±karma hatasÄ±:', error);
    return { success: false, error: error.message };
  }
};

// ==================== AÃ‡IK MAÃ‡ SÄ°STEMÄ° ====================

// KullanÄ±cÄ± puanÄ±nÄ± hesapla
export const getUserRating = async (userId) => {
  try {
    const reservationsResult = await getPlayerReservations(userId);
    if (!reservationsResult.success) {
      return { success: false, error: reservationsResult.error };
    }
    
    const reservations = reservationsResult.data;
    const completedMatches = reservations.filter(r => r.status === 'completed' || r.status === 'confirmed');
    
    // Basit puanlama sistemi: tamamlanan maÃ§ sayÄ±sÄ±na gÃ¶re
    // 0-10 maÃ§: 4.0-4.5
    // 11-50 maÃ§: 4.5-4.7
    // 51-100 maÃ§: 4.7-4.8
    // 100+ maÃ§: 4.8-5.0
    
    let rating = 4.0;
    const matchCount = completedMatches.length;
    
    if (matchCount > 100) {
      rating = 4.8 + (Math.min(matchCount - 100, 200) / 200) * 0.2; // Max 5.0
    } else if (matchCount > 50) {
      rating = 4.7 + ((matchCount - 50) / 50) * 0.1;
    } else if (matchCount > 10) {
      rating = 4.5 + ((matchCount - 10) / 40) * 0.2;
    } else if (matchCount > 0) {
      rating = 4.0 + (matchCount / 10) * 0.5;
    }
    
    return { success: true, data: { rating: Math.min(rating, 5.0), matchCount } };
  } catch (error) {
    console.error('KullanÄ±cÄ± puanÄ± hesaplama hatasÄ±:', error);
    return { success: false, error: error.message };
  }
};

// AÃ§Ä±k maÃ§ oluÅŸtur
export const createOpenMatch = async (matchData) => {
  try {
    // OrganizatÃ¶r bilgilerini getir
    const organizerDoc = await getDoc(doc(db, 'users', matchData.organizerId));
    if (!organizerDoc.exists()) {
      return { success: false, error: 'KullanÄ±cÄ± bulunamadÄ±' };
    }
    
    const organizerData = organizerDoc.data();
    const ratingResult = await getUserRating(matchData.organizerId);
    const organizerRating = ratingResult.success ? ratingResult.data.rating : 4.0;
    const organizerMatchCount = ratingResult.success ? ratingResult.data.matchCount : 0;
    
    // Tags hesapla
    const tags = [];
    if (matchData.pricePerPlayer === 0) tags.push('free');
    const matchHour = parseInt(matchData.timeSlot.split(':')[0]);
    if (matchHour >= 22 || matchHour < 6) tags.push('night');
    if (matchData.maxPlayers - matchData.currentPlayers <= 2) tags.push('urgent');
    
    const openMatchData = {
      organizerId: matchData.organizerId,
      organizerName: organizerData.fullName || organizerData.displayName || 'Bilinmeyen',
      organizerRating,
      organizerMatchCount,
      organizerAvatar: organizerData.photoURL || null,
      tesisId: matchData.tesisId || null,
      tesisName: matchData.tesisName || null,
      location: matchData.location || '',
      address: matchData.address || null,
      date: Timestamp.fromDate(new Date(matchData.date)),
      timeSlot: matchData.timeSlot,
      format: matchData.format,
      level: matchData.level,
      maxPlayers: matchData.maxPlayers,
      currentPlayers: 1, // OrganizatÃ¶r dahil
      players: [matchData.organizerId],
      pricePerPlayer: matchData.pricePerPlayer || 0,
      description: matchData.description || '',
      status: 'open',
      tags,
      isWithVenue: !!matchData.tesisId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const docRef = await addDoc(collection(db, 'openMatches'), openMatchData);
    
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('AÃ§Ä±k maÃ§ oluÅŸturma hatasÄ±:', error);
    return { success: false, error: error.message };
  }
};

// AÃ§Ä±k maÃ§larÄ± getir
export const getOpenMatches = async (filters = {}) => {
  try {
    const matchesRef = collection(db, 'openMatches');
    // Sadece status filtresi yapÄ±yoruz (composite index gerektirmemesi iÃ§in)
    // Tarih ve diÄŸer filtreleri client-side yapacaÄŸÄ±z
    const q = query(matchesRef, where('status', '==', 'open'));
    
    const querySnapshot = await getDocs(q);
    const matches = [];
    
    querySnapshot.forEach((doc) => {
      matches.push({ id: doc.id, ...doc.data() });
    });
    
    // Client-side filtreleme
    let filteredMatches = matches;
    
    // Tarih filtresi (gelecek maÃ§lar) - client-side
    const now = new Date();
    if (filters.date) {
      const dateStart = new Date(filters.date);
      dateStart.setHours(0, 0, 0, 0);
      const dateEnd = new Date(filters.date);
      dateEnd.setHours(23, 59, 59, 999);
      
      filteredMatches = filteredMatches.filter(m => {
        const matchDate = m.date?.toDate ? m.date.toDate() : new Date(m.date);
        return matchDate >= dateStart && matchDate <= dateEnd;
      });
    } else {
      // Gelecek maÃ§lar - client-side
      filteredMatches = filteredMatches.filter(m => {
        const matchDate = m.date?.toDate ? m.date.toDate() : new Date(m.date);
        return matchDate >= now;
      });
    }
    
    if (filters.location) {
      filteredMatches = filteredMatches.filter(m => 
        m.location?.toLowerCase().includes(filters.location.toLowerCase()) ||
        m.tesisName?.toLowerCase().includes(filters.location.toLowerCase())
      );
    }
    
    if (filters.format && filters.format !== 'all') {
      filteredMatches = filteredMatches.filter(m => m.format === filters.format);
    }
    
    if (filters.level && filters.level !== 'all') {
      filteredMatches = filteredMatches.filter(m => m.level === filters.level);
    }
    
    if (filters.priceFilter === 'free') {
      filteredMatches = filteredMatches.filter(m => m.pricePerPlayer === 0);
    }
    
    if (filters.timeRange) {
      const [startHour, endHour] = filters.timeRange.split('-').map(h => parseInt(h));
      filteredMatches = filteredMatches.filter(m => {
        const matchHour = parseInt(m.timeSlot.split(':')[0]);
        return matchHour >= startHour && matchHour < endHour;
      });
    }
    
    // SÄ±ralama: en yakÄ±n tarih Ã¶nce
    filteredMatches.sort((a, b) => {
      const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
      const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
      return dateA - dateB;
    });
    
    return { success: true, data: filteredMatches };
  } catch (error) {
    console.error('Açık maçlar getirme hatası:', error);
    return { success: false, error: error.message };
  }
};

// Tek açık maç getir
export const getOpenMatch = async (matchId) => {
  try {
    const docRef = doc(db, 'openMatches', matchId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { success: true, data: { id: docSnap.id, ...docSnap.data() } };
    } else {
      return { success: false, error: 'Maç bulunamadı' };
    }
  } catch (error) {
    console.error('Maç getirme hatası:', error);
    return { success: false, error: error.message };
  }
};

// MaÃ§a katÄ±l
export const joinOpenMatch = async (matchId, playerId) => {
  try {
    const matchRef = doc(db, 'openMatches', matchId);
    const matchDoc = await getDoc(matchRef);
    
    if (!matchDoc.exists()) {
      return { success: false, error: 'MaÃ§ bulunamadÄ±' };
    }
    
    const matchData = matchDoc.data();
    
    if (matchData.status !== 'open') {
      return { success: false, error: 'MaÃ§ artÄ±k aÃ§Ä±k deÄŸil' };
    }
    
    if (matchData.players.includes(playerId)) {
      return { success: false, error: 'Zaten bu maÃ§a katÄ±ldÄ±nÄ±z' };
    }
    
    if (matchData.currentPlayers >= matchData.maxPlayers) {
      return { success: false, error: 'MaÃ§ dolu' };
    }
    
    const newPlayers = [...matchData.players, playerId];
    const newCurrentPlayers = newPlayers.length;
    const newStatus = newCurrentPlayers >= matchData.maxPlayers ? 'full' : 'open';
    
    // Tags gÃ¼ncelle
    const tags = [...(matchData.tags || [])];
    if (matchData.maxPlayers - newCurrentPlayers <= 2 && !tags.includes('urgent')) {
      tags.push('urgent');
    }
    if (matchData.maxPlayers - newCurrentPlayers > 2 && tags.includes('urgent')) {
      tags.splice(tags.indexOf('urgent'), 1);
    }
    
    await updateDoc(matchRef, {
      players: newPlayers,
      currentPlayers: newCurrentPlayers,
      status: newStatus,
      tags,
      updatedAt: serverTimestamp()
    });

    // OrganizatÃ¶re bildirim gÃ¶nder
    if (matchData.organizerId !== playerId) {
      try {
        const userRef = doc(db, 'users', playerId);
        const userDoc = await getDoc(userRef);
        const playerName = userDoc.exists() ? (userDoc.data().displayName || userDoc.data().email) : 'Bir kullanÄ±cÄ±';
        
        await addDoc(collection(db, 'notifications'), {
          userId: matchData.organizerId,
          type: 'match_join',
          title: 'MaÃ§a KatÄ±lÄ±m',
          message: `${playerName} maÃ§Ä±nÄ±za katÄ±ldÄ±.`,
          read: false,
          createdAt: serverTimestamp()
        });
      } catch (notifError) {
        console.error('Bildirim gÃ¶nderme hatasÄ± (ihmal edilebilir):', notifError);
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('MaÃ§a katÄ±lma hatasÄ±:', error);
    return { success: false, error: error.message };
  }
};

// MaÃ§tan ayrÄ±l
export const leaveOpenMatch = async (matchId, playerId) => {
  try {
    const matchRef = doc(db, 'openMatches', matchId);
    const matchDoc = await getDoc(matchRef);
    
    if (!matchDoc.exists()) {
      return { success: false, error: 'MaÃ§ bulunamadÄ±' };
    }
    
    const matchData = matchDoc.data();
    
    if (!matchData.players.includes(playerId)) {
      return { success: false, error: 'Bu maÃ§a katÄ±lmamÄ±ÅŸsÄ±nÄ±z' };
    }
    
    // OrganizatÃ¶r ayrÄ±lamaz
    if (matchData.organizerId === playerId) {
      return { success: false, error: 'OrganizatÃ¶r maÃ§tan ayrÄ±lamaz' };
    }
    
    const newPlayers = matchData.players.filter(id => id !== playerId);
    const newCurrentPlayers = newPlayers.length;
    
    // Tags gÃ¼ncelle
    const tags = [...(matchData.tags || [])];
    if (matchData.maxPlayers - newCurrentPlayers <= 2 && !tags.includes('urgent')) {
      tags.push('urgent');
    }
    
    await updateDoc(matchRef, {
      players: newPlayers,
      currentPlayers: newCurrentPlayers,
      status: 'open', // Full ise open'e dÃ¶n
      tags,
      updatedAt: serverTimestamp()
    });

    // OrganizatÃ¶re bildirim gÃ¶nder
    if (matchData.organizerId && matchData.organizerId !== playerId) {
        try {
            const userRef = doc(db, 'users', playerId);
            const userDoc = await getDoc(userRef);
            const playerName = userDoc.exists() ? (userDoc.data().displayName || userDoc.data().email) : 'Bir oyuncu';
            
            await addDoc(collection(db, 'notifications'), {
                userId: matchData.organizerId,
                type: 'match_leave',
                title: 'MaÃ§tan AyrÄ±lma',
                message: `${playerName} maÃ§Ä±nÄ±zdan ayrÄ±ldÄ±.`,
                read: false,
                createdAt: serverTimestamp()
            });
        } catch (notifError) {
            console.error('Bildirim gÃ¶nderme hatasÄ± (ihmal edilebilir):', notifError);
        }
    }
    
    return { success: true };
  } catch (error) {
    console.error('MaÃ§tan ayrÄ±lma hatasÄ±:', error);
    return { success: false, error: error.message };
  }
};

// AÃ§Ä±k maÃ§ gÃ¼ncelle
export const updateOpenMatch = async (matchId, matchData) => {
  try {
    const matchRef = doc(db, 'openMatches', matchId);
    const matchDoc = await getDoc(matchRef);
    
    if (!matchDoc.exists()) {
      return { success: false, error: 'MaÃ§ bulunamadÄ±' };
    }
    
    const existingMatch = matchDoc.data();
    
    // Tags hesapla
    const tags = [];
    if ((matchData.pricePerPlayer !== undefined ? matchData.pricePerPlayer : existingMatch.pricePerPlayer) === 0) {
      tags.push('free');
    }
    const timeSlot = matchData.timeSlot || existingMatch.timeSlot;
    const matchHour = parseInt(timeSlot.split(':')[0]);
    if (matchHour >= 22 || matchHour < 6) {
      tags.push('night');
    }
    const maxPlayers = matchData.maxPlayers || existingMatch.maxPlayers;
    const currentPlayers = existingMatch.currentPlayers;
    if (maxPlayers - currentPlayers <= 2) {
      tags.push('urgent');
    }
    
    const updateData = {
      ...matchData,
      tags,
      updatedAt: serverTimestamp()
    };
    
    // Date'i Timestamp'e Ã§evir
    if (matchData.date) {
      updateData.date = Timestamp.fromDate(new Date(matchData.date));
    }
    
    await updateDoc(matchRef, updateData);
    
    return { success: true };
  } catch (error) {
    console.error('AÃ§Ä±k maÃ§ gÃ¼ncelleme hatasÄ±:', error);
    return { success: false, error: error.message };
  }
};

// AÃ§Ä±k maÃ§ sil
export const deleteOpenMatch = async (matchId, organizerId) => {
  try {
    const matchRef = doc(db, 'openMatches', matchId);
    const matchDoc = await getDoc(matchRef);
    
    if (!matchDoc.exists()) {
      return { success: false, error: 'MaÃ§ bulunamadÄ±' };
    }
    
    const matchData = matchDoc.data();
    
    if (matchData.organizerId !== organizerId) {
      return { success: false, error: 'Bu maÃ§Ä± silme yetkiniz yok' };
    }
    
    // KatÄ±lÄ±mcÄ±lara bildirim gÃ¶nder
    const playersToNotify = matchData.players.filter(pid => pid !== organizerId);
    if (playersToNotify.length > 0) {
        try {
            const batch = writeBatch(db);
            playersToNotify.forEach(pid => {
                const notifRef = doc(collection(db, 'notifications'));
                batch.set(notifRef, {
                    userId: pid,
                    type: 'match_cancel',
                    title: 'MaÃ§ Ä°ptali',
                    message: `${matchData.tesisName || 'Bir maÃ§'} organizatÃ¶r tarafÄ±ndan iptal edildi.`,
                    read: false,
                    createdAt: serverTimestamp()
                });
            });
            await batch.commit();
        } catch (notifError) {
            console.error('Toplu bildirim gÃ¶nderme hatasÄ± (ihmal edilebilir):', notifError);
        }
    }

    await deleteDoc(matchRef);
    
    return { success: true };
  } catch (error) {
    console.error('AÃ§Ä±k maÃ§ silme hatasÄ±:', error);
    return { success: false, error: error.message };
  }
};

// KullanÄ±cÄ±nÄ±n aÃ§Ä±k maÃ§larÄ±nÄ± getir
export const getUserOpenMatches = async (userId) => {
  try {
    const matchesRef = collection(db, 'openMatches');
    const q = query(matchesRef);
    
    const querySnapshot = await getDocs(q);
    const allMatches = [];
    
    querySnapshot.forEach((doc) => {
      allMatches.push({ id: doc.id, ...doc.data() });
    });
    
    // KullanÄ±cÄ±nÄ±n oluÅŸturduÄŸu veya katÄ±ldÄ±ÄŸÄ± maÃ§larÄ± filtrele
    const userMatches = {
      organized: allMatches.filter(m => m.organizerId === userId),
      joined: allMatches.filter(m => 
        m.players.includes(userId) && m.organizerId !== userId
      )
    };
    
    // SÄ±ralama: en yakÄ±n tarih Ã¶nce
    userMatches.organized.sort((a, b) => {
      const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
      const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
      return dateA - dateB;
    });
    
    userMatches.joined.sort((a, b) => {
      const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
      const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
      return dateA - dateB;
    });
    
    return { success: true, data: userMatches };
  } catch (error) {
    console.error('KullanÄ±cÄ± aÃ§Ä±k maÃ§larÄ± getirme hatasÄ±:', error);
    return { success: false, error: error.message };
  }
};

// KullanÄ±cÄ± verilerini JSON olarak export et (GDPR)
export const exportUserData = async (userId) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      return { success: false, error: 'KullanÄ±cÄ± bulunamadÄ±' };
    }

    const userData = userDoc.data();
    
    // KullanÄ±cÄ±nÄ±n tÃ¼m verilerini topla
    const exportData = {
      user: {
        uid: userId,
        email: userData.email,
        displayName: userData.displayName,
        fullName: userData.fullName,
        phone: userData.phone,
        photoURL: userData.photoURL,
        createdAt: userData.createdAt,
        updatedAt: userData.updatedAt
      },
      reservations: [],
      teams: [],
      tournaments: [],
      notifications: [],
      invoices: []
    };

    // Rezervasyonlar
    const reservationsQuery = query(
      collection(db, 'rezervasyonlar'),
      where('players', 'array-contains', userId)
    );
    const reservationsSnapshot = await getDocs(reservationsQuery);
    reservationsSnapshot.forEach((doc) => {
      const data = doc.data();
      exportData.reservations.push({
        id: doc.id,
        tesisName: data.tesisName,
        date: data.date,
        timeSlot: data.timeSlot,
        totalAmount: data.totalAmount,
        status: data.status,
        createdAt: data.createdAt
      });
    });

    // TakÄ±mlar
    const teamsQuery = query(
      collection(db, 'teams'),
      where('members', 'array-contains', userId)
    );
    const teamsSnapshot = await getDocs(teamsQuery);
    teamsSnapshot.forEach((doc) => {
      const data = doc.data();
      exportData.teams.push({
        id: doc.id,
        name: data.name,
        sport: data.sport,
        role: data.captainId === userId ? 'captain' : 'member',
        createdAt: data.createdAt
      });
    });

    // Turnuvalar
    const tournamentsQuery = query(collection(db, 'tournaments'));
    const tournamentsSnapshot = await getDocs(tournamentsQuery);
    tournamentsSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.participants && data.participants.includes(userId)) {
        exportData.tournaments.push({
          id: doc.id,
          name: data.name,
          status: data.status,
          createdAt: data.createdAt
        });
      }
    });

    // Bildirimler
    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      limit(1000)
    );
    const notificationsSnapshot = await getDocs(notificationsQuery);
    notificationsSnapshot.forEach((doc) => {
      const data = doc.data();
      exportData.notifications.push({
        id: doc.id,
        title: data.title,
        message: data.message,
        type: data.type,
        read: data.read,
        createdAt: data.createdAt
      });
    });

    return {
      success: true,
      data: exportData,
      json: JSON.stringify(exportData, null, 2)
    };
  } catch (error) {
    console.error('KullanÄ±cÄ± verisi export hatasÄ±:', error);
    return { success: false, error: error.message };
  }
};

// KullanÄ±cÄ± hesabÄ±nÄ± sil
export const deleteUserAccount = async (userId, password) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser || currentUser.uid !== userId) {
      return { success: false, error: 'Yetkisiz iÅŸlem' };
    }

    // Åifre ile yeniden doÄŸrula
    if (password) {
      const credential = EmailAuthProvider.credential(currentUser.email, password);
      await reauthenticateWithCredential(currentUser, credential);
    }

    // Firestore'dan kullanÄ±cÄ± verilerini sil
    const userRef = doc(db, 'users', userId);
    await deleteDoc(userRef);

    // Ä°liÅŸkili verileri temizle (opsiyonel - cascade delete)
    // Rezervasyonlardan kullanÄ±cÄ±yÄ± kaldÄ±r
    const reservationsQuery = query(
      collection(db, 'rezervasyonlar'),
      where('players', 'array-contains', userId)
    );
    const reservationsSnapshot = await getDocs(reservationsQuery);
    const batch = [];
    reservationsSnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const updatedPlayers = data.players.filter((pid) => pid !== userId);
      batch.push(updateDoc(doc(db, 'rezervasyonlar', docSnap.id), {
        players: updatedPlayers
      }));
    });
    if (batch.length > 0) {
      await Promise.all(batch);
    }

    // Auth'dan kullanÄ±cÄ±yÄ± sil
    await deleteUser(currentUser);

    return { success: true };
  } catch (error) {
    console.error('Hesap silme hatasÄ±:', error);
    return { success: false, error: error.message };
  }
};

// Performans verilerini PDF/Excel olarak export et
export const exportPerformanceData = async (playerId, format = 'excel') => {
  try {
    const [statsResult, reservationsResult] = await Promise.all([
      getPlayerStats(playerId),
      getPlayerReservations(playerId)
    ]);

    if (!statsResult.success || !reservationsResult.success) {
      return { success: false, error: 'Veriler alÄ±namadÄ±' };
    }

    const stats = statsResult.data;
    const reservations = reservationsResult.data;

    const exportData = {
      stats,
      reservations: reservations.map(r => ({
        tesisName: r.tesisName,
        date: r.date?.toDate ? r.date.toDate().toISOString() : r.date,
        timeSlot: r.timeSlot,
        totalAmount: r.totalAmount || r.price || 0,
        status: r.status
      })),
      summary: {
        totalMatches: stats.totalMatches || 0,
        completedMatches: stats.completedMatches || 0,
        totalSpent: reservations
          .filter(r => r.status === 'completed' || r.status === 'confirmed')
          .reduce((sum, r) => sum + (r.totalAmount || r.price || 0), 0),
        averagePerMatch: 0
      }
    };

    const totalSpent = exportData.summary.totalSpent;
    const completedMatches = exportData.summary.completedMatches;
    exportData.summary.averagePerMatch = completedMatches > 0 ? totalSpent / completedMatches : 0;

    if (format === 'json') {
      return {
        success: true,
        data: exportData,
        json: JSON.stringify(exportData, null, 2)
      };
    }

    // Excel format iÃ§in CSV
    if (format === 'excel' || format === 'csv') {
      const csvRows = [];
      csvRows.push(['Performans Raporu']);
      csvRows.push([]);
      csvRows.push(['Ä°statistik', 'DeÄŸer']);
      csvRows.push(['Toplam MaÃ§', stats.totalMatches || 0]);
      csvRows.push(['Tamamlanan MaÃ§', stats.completedMatches || 0]);
      csvRows.push(['Toplam Harcama', `â‚º${totalSpent.toLocaleString('tr-TR')}`]);
      csvRows.push(['MaÃ§ BaÅŸÄ± Ortalama', `â‚º${exportData.summary.averagePerMatch.toFixed(2)}`]);
      csvRows.push([]);
      csvRows.push(['Rezervasyon DetaylarÄ±']);
      csvRows.push(['Saha', 'Tarih', 'Saat', 'Tutar', 'Durum']);
      reservations.forEach(r => {
        const date = r.date?.toDate ? r.date.toDate().toLocaleDateString('tr-TR') : r.date;
        csvRows.push([
          r.tesisName || '',
          date,
          r.timeSlot || '',
          `â‚º${(r.totalAmount || r.price || 0).toLocaleString('tr-TR')}`,
          r.status || ''
        ]);
      });

      const csvContent = csvRows.map(row => row.join(',')).join('\n');
      return {
        success: true,
        data: exportData,
        csv: csvContent
      };
    }

    return { success: false, error: 'Desteklenmeyen format' };
  } catch (error) {
    console.error('Performans verisi export hatasÄ±:', error);
    return { success: false, error: error.message };
  }
};

// ==================== BLOG/HABER FONKSÄ°YONLARI ====================

export const getBlogPosts = async (filters = {}) => {
  try {
    const { collection, query, where, orderBy, getDocs, limit: limitFn } = await import('firebase/firestore');
    const blogsRef = collection(db, 'blogPosts');
    
    let q = query(blogsRef);
    
    if (filters.category && filters.category !== 'all') {
      q = query(q, where('category', '==', filters.category));
    }
    
    if (filters.featured) {
      q = query(q, where('featured', '==', true));
    }
    
    if (filters.status) {
      q = query(q, where('status', '==', filters.status));
    } else {
      q = query(q, where('status', '==', 'published'));
    }
    
    if (filters.limit) {
      q = query(q, limitFn(filters.limit));
    }
    
    const querySnapshot = await getDocs(q);
    let posts = [];
    
    querySnapshot.forEach((doc) => {
      posts.push({ id: doc.id, ...doc.data() });
    });
    
    // Client-side sorting (orderBy kullanmadan)
    if (filters.sortBy === 'date') {
      posts.sort((a, b) => {
        const dateA = a.publishedAt?.toDate ? a.publishedAt.toDate() : new Date(a.publishedAt);
        const dateB = b.publishedAt?.toDate ? b.publishedAt.toDate() : new Date(b.publishedAt);
        return filters.sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      });
    } else if (filters.sortBy === 'views') {
      posts.sort((a, b) => {
        return filters.sortOrder === 'asc' ? (a.views || 0) - (b.views || 0) : (b.views || 0) - (a.views || 0);
      });
    }
    
    return { success: true, data: posts };
  } catch (error) {
    console.error('Blog yazÄ±larÄ± getirme hatasÄ±:', error);
    return { success: false, error: error.message };
  }
};

export const getBlogPost = async (postId) => {
  try {
    const { doc, getDoc, updateDoc, increment } = await import('firebase/firestore');
    const postRef = doc(db, 'blogPosts', postId);
    const postSnap = await getDoc(postRef);
    
    if (!postSnap.exists()) {
      return { success: false, error: 'Blog yazÄ±sÄ± bulunamadÄ±' };
    }
    
    const postData = { id: postSnap.id, ...postSnap.data() };
    
    // GÃ¶rÃ¼ntÃ¼lenme sayÄ±sÄ±nÄ± artÄ±r
    await updateDoc(postRef, {
      views: increment(1)
    });
    
    return { success: true, data: postData };
  } catch (error) {
    console.error('Blog yazÄ±sÄ± getirme hatasÄ±:', error);
    return { success: false, error: error.message };
  }
};

export const getBlogCategories = async () => {
  try {
    const { collection, getDocs } = await import('firebase/firestore');
    const categoriesRef = collection(db, 'blogCategories');
    const querySnapshot = await getDocs(categoriesRef);
    
    const categories = [];
    querySnapshot.forEach((doc) => {
      categories.push({ id: doc.id, ...doc.data() });
    });
    
    // Kategori yoksa boş döner, varsayılan kategori döndürmez.
    // Bu sayede "olmayan" kategorileri düzenlemeye çalışma hatası önlenir.

    
    return { success: true, data: categories };
  } catch (error) {
    console.error('Blog kategorileri getirme hatasÄ±:', error);
    return { success: false, error: error.message };
  }
};



export const deleteBlogPost = async (postId) => {
  try {
    const { doc, deleteDoc } = await import('firebase/firestore');
    const postRef = doc(db, 'blogPosts', postId);
    await deleteDoc(postRef);
    
    return { success: true };
  } catch (error) {
    console.error('Blog yazÄ±sÄ± silme hatasÄ±:', error);
    return { success: false, error: error.message };
  }
};

export const getBlogPostById = async (postId) => {
  try {
    const { doc, getDoc } = await import('firebase/firestore');
    const postRef = doc(db, 'blogPosts', postId);
    const postSnap = await getDoc(postRef);
    
    if (!postSnap.exists()) {
      return { success: false, error: 'Blog yazÄ±sÄ± bulunamadÄ±' };
    }
    
    return { success: true, data: { id: postSnap.id, ...postSnap.data() } };
  } catch (error) {
    console.error('Blog yazÄ±sÄ± getirme hatasÄ±:', error);
    return { success: false, error: error.message };
  }
};

export const getBlogPostBySlug = async (slug) => {
  try {
    const { collection, getDocs, query, where, limit, doc, updateDoc, increment } = await import('firebase/firestore');
    const blogsRef = collection(db, 'blogPosts');
    const q = query(blogsRef, where('slug', '==', slug), limit(1));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return { success: false, error: 'Blog yazÄ±sÄ± bulunamadÄ±' };
    }
    
    const postDoc = querySnapshot.docs[0];
    const postData = { id: postDoc.id, ...postDoc.data() };
    
    // GÃ¶rÃ¼ntÃ¼lenme sayÄ±sÄ±nÄ± artÄ±r
    const postRef = doc(db, 'blogPosts', postDoc.id);
    await updateDoc(postRef, {
      views: increment(1)
    });
    
    return { success: true, data: postData };
  } catch (error) {
    console.error('Blog yazÄ±sÄ± getirme hatasÄ±:', error);
    return { success: false, error: error.message };
  }
};

// Blog kategorisi ekle
export const createBlogCategory = async (categoryData) => {
  try {
    const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
    const categoriesRef = collection(db, 'blogCategories');
    
    const newCategory = {
      name: categoryData.name,
      slug: categoryData.slug,
      color: categoryData.color || 'bg-gray-500',
      icon: categoryData.icon || 'BookOpen', // VarsayÄ±lan ikon
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const docRef = await addDoc(categoriesRef, newCategory);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Kategori oluÅŸturma hatasÄ±:', error);
    return { success: false, error: error.message };
  }
};

// Blog kategorisi gÃ¼ncelle
export const updateBlogCategory = async (categoryId, categoryData) => {
  try {
    const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
    const categoryRef = doc(db, 'blogCategories', categoryId);
    
    await updateDoc(categoryRef, {
      ...categoryData,
      updatedAt: serverTimestamp()
    });
    
    return { success: true };
  } catch (error) {
    console.error('Kategori gÃ¼ncelleme hatasÄ±:', error);
    return { success: false, error: error.message };
  }
};

// Blog kategorisi sil
export const deleteBlogCategory = async (categoryId) => {
  try {
    const { doc, deleteDoc } = await import('firebase/firestore');
    const categoryRef = doc(db, 'blogCategories', categoryId);
    await deleteDoc(categoryRef);
    return { success: true };
  } catch (error) {
    console.error('Kategori silme hatasÄ±:', error);
    return { success: false, error: error.message };
  }
};

export const getFeaturedPosts = async (limit = 3) => {
  try {
    const result = await getBlogPosts({ featured: true, limit, sortBy: 'date', sortOrder: 'desc' });
    return result;
  } catch (error) {
    console.error('Ã–ne Ã§Ä±kan blog yazÄ±larÄ± getirme hatasÄ±:', error);
    return { success: false, error: error.message };
  }
};

export const createBlogPost = async (postData) => {
  try {
    const { collection, addDoc, serverTimestamp, Timestamp } = await import('firebase/firestore');
    const blogsRef = collection(db, 'blogPosts');
    
    // Okuma sÃ¼resini hesapla
    const wordsPerMinute = 200;
    const wordCount = postData.content ? postData.content.split(/\s+/).length : 0;
    const readTime = Math.ceil(wordCount / wordsPerMinute);
    
    let publishedAt = null;
    if (postData.publishDate) {
      publishedAt = Timestamp.fromDate(new Date(postData.publishDate));
    } else if (postData.status === 'published') {
      publishedAt = serverTimestamp();
    }

    const newPost = {
      title: postData.title,
      slug: postData.slug || postData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      content: postData.content,
      excerpt: postData.excerpt || '',
      summary: postData.excerpt || '',
      category: postData.category || 'haberler',
      featuredImage: postData.featuredImage || postData.image || '',
      image: postData.featuredImage || postData.image || '',
      author: postData.author || 'Admin',
      authorName: postData.authorName || postData.author || 'Admin',
      status: postData.status || 'draft',
      featured: postData.featured || false,
      readTime: `${readTime} dk okuma`,
      views: 0,
      metaTitle: postData.metaTitle || postData.title,
      metaDescription: postData.metaDescription || postData.excerpt || '',
      publishedAt: publishedAt,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const docRef = await addDoc(blogsRef, newPost);
    
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Blog yazÄ±sÄ± oluÅŸturma hatasÄ±:', error);
    return { success: false, error: error.message };
  }
};

export const updateBlogPost = async (postId, postData) => {
  try {
    const { doc, updateDoc, serverTimestamp, Timestamp } = await import('firebase/firestore');
    const postRef = doc(db, 'blogPosts', postId);
    
    // Okuma sÃ¼resini hesapla
    const wordsPerMinute = 200;
    const wordCount = postData.content ? postData.content.split(/\s+/).length : 0;
    const readTime = Math.ceil(wordCount / wordsPerMinute);
    
    const updateData = {
      title: postData.title,
      slug: postData.slug || postData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      content: postData.content,
      excerpt: postData.excerpt || '',
      summary: postData.excerpt || '',
      category: postData.category,
      featuredImage: postData.featuredImage || postData.image || '',
      image: postData.featuredImage || postData.image || '',
      author: postData.author || 'Admin',
      authorName: postData.authorName || postData.author || 'Admin',
      status: postData.status,
      featured: postData.featured || false,
      readTime: `${readTime} dk okuma`,
      metaTitle: postData.metaTitle || postData.title,
      metaDescription: postData.metaDescription || postData.excerpt || '',
      updatedAt: serverTimestamp()
    };
    
    // YayÄ±nlanma tarihi mantÄ±ÄŸÄ±
    if (postData.publishDate) {
      updateData.publishedAt = Timestamp.fromDate(new Date(postData.publishDate));
    } else if (postData.status === 'published') {
      const { getDoc } = await import('firebase/firestore');
      const postSnap = await getDoc(postRef);
      // EÄŸer daha Ã¶nce yayÄ±nlanma tarihi yoksa ÅŸu anÄ± ata
      if (postSnap.exists() && !postSnap.data().publishedAt) {
        updateData.publishedAt = serverTimestamp();
      }
    }
    
    await updateDoc(postRef, updateData);
    
    return { success: true };
  } catch (error) {
    console.error('Blog yazÄ±sÄ± gÃ¼ncelleme hatasÄ±:', error);
    return { success: false, error: error.message };
  }
};

// Ä°ki kullanÄ±cÄ± arasÄ±nda konuÅŸma oluÅŸtur veya mevcut konuÅŸmayÄ± getir
// Ä°ki kullanÄ±cÄ± arasÄ±nda konuÅŸma oluÅŸtur veya mevcut konuÅŸmayÄ± getir
export const createOrGetConversation = async (userId1, userId2, initialStatus = 'accepted') => {
  try {
    if (userId1 === userId2) {
      return { success: false, error: 'Kendi kendinize mesaj gÃ¶nderemezsiniz' };
    }

    // Conversation ID: alfabetik sÄ±ralÄ± kullanÄ±cÄ± ID'leri birleÅŸtir
    const participants = [userId1, userId2].sort();
    const conversationId = `${participants[0]}_${participants[1]}`;

    const conversationRef = doc(db, 'conversations', conversationId);
    const conversationSnap = await getDoc(conversationRef);

    if (conversationSnap.exists()) {
      
      // EÄŸer konuÅŸma silinmiÅŸse (hidden), tekrar gÃ¶rÃ¼nÃ¼r yap
      const currentData = conversationSnap.data();
      if (currentData.deletedFor && currentData.deletedFor[userId1]) {
           await updateDoc(conversationRef, {
               [`deletedFor.${userId1}`]: deleteField()
           });
      }

      return {
        success: true,
        data: { id: conversationSnap.id, ...currentData },
        isNew: false
      };
    }

    // Yeni konuÅŸma oluÅŸtur
    const conversationData = {
      participants: participants,
      lastMessage: null,
      lastMessageAt: serverTimestamp(),
      unreadCount: {
        [userId1]: 0,
        [userId2]: 0
      },
      status: initialStatus, // pending, accepted, blocked
      initiatorId: initialStatus === 'pending' ? userId1 : null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    await setDoc(conversationRef, conversationData);

    return {
      success: true,
      data: { id: conversationId, ...conversationData },
      isNew: true
    };
  } catch (error) {
    console.error('KonuÅŸma oluÅŸturma/getirme hatasÄ±:', error);
    return { success: false, error: error.message };
  }
};

// Sohbet daveti gÃ¶nder
export const sendChatInvitation = async (inviterId, invitedId) => {
    try {
        // KullanÄ±cÄ± bilgilerini al
        const inviterDoc = await getDoc(doc(db, 'users', inviterId));
        const inviterName = inviterDoc.exists() ? (inviterDoc.data().displayName || 'Bir kullanÄ±cÄ±') : 'Bir kullanÄ±cÄ±';

        await addDoc(collection(db, 'notifications'), {
            userId: invitedId,
            type: 'chat_invitation',
            title: 'MesajlaÅŸma Ä°steÄŸi',
            message: `${inviterName} sizinle mesajlaÅŸmak istiyor.`,
            senderId: inviterId,
            senderName: inviterName,
            status: 'pending',
            read: false,
            createdAt: serverTimestamp()
        });
        return { success: true };
    } catch (error) {
        console.error('Davet gÃ¶nderme hatasÄ±:', error);
        return { success: false, error: error.message };
    }
};

// Sohbet davetine yanÄ±t ver
export const respondToChatInvitation = async (notificationId, response, userId) => {
    try {
        const notifRef = doc(db, 'notifications', notificationId);
        const notifDoc = await getDoc(notifRef);
        
        if (!notifDoc.exists()) return { success: false, error: 'Bildirim bulunamadÄ±' };
        const notifData = notifDoc.data();
        
        // KonuÅŸmayÄ± bul ve gÃ¼ncelle
        const participants = [userId, notifData.senderId].sort();
        const conversationId = `${participants[0]}_${participants[1]}`;
        const conversationRef = doc(db, 'conversations', conversationId);

        if (response === 'accept') {
            await updateDoc(conversationRef, {
                status: 'accepted',
                updatedAt: serverTimestamp()
            });
            
            await updateDoc(notifRef, {
                status: 'accepted',
                read: true,
                message: 'MesajlaÅŸma isteÄŸini kabul ettiniz.'
            });
            
            // GÃ¶nderene bildirim
            await addDoc(collection(db, 'notifications'), {
                userId: notifData.senderId,
                type: 'chat_accepted',
                title: 'Ä°stek Kabul Edildi',
                message: 'MesajlaÅŸma isteÄŸiniz kabul edildi.',
                senderId: userId,
                read: false,
                createdAt: serverTimestamp()
            });
        } else {
             // ReddedildiÄŸinde konuÅŸma durumunu deÄŸiÅŸtirme veya sil?
             // Åimdilik blocked veya rejected yapabiliriz veya status'u deÄŸiÅŸtirmeyebiliriz.
             // Belki de rejected yapalÄ±m.
             await updateDoc(conversationRef, {
                status: 'rejected',
                updatedAt: serverTimestamp()
            });

            await updateDoc(notifRef, {
                status: 'rejected',
                read: true,
                message: 'MesajlaÅŸma isteÄŸini reddettiniz.'
            });
        }
        
        return { success: true };
    } catch (error) {
        console.error('YanÄ±t verme hatasÄ±:', error);
        return { success: false, error: error.message };
    }
};

// KullanÄ±cÄ±nÄ±n tÃ¼m konuÅŸmalarÄ±nÄ± getir
export const getUserConversations = async (userId) => {
  try {
    const conversationsRef = collection(db, 'conversations');
    const q = query(
      conversationsRef,
      where('participants', 'array-contains', userId)
    );

    const querySnapshot = await getDocs(q);
    const conversations = [];

    querySnapshot.forEach((doc) => {
      conversations.push({
        id: doc.id,
        ...doc.data()
      });
    });

    // Son mesaja gÃ¶re sÄ±rala (client-side)
    conversations.sort((a, b) => {
      const dateA = a.lastMessageAt?.toDate?.() || new Date(0);
      const dateB = b.lastMessageAt?.toDate?.() || new Date(0);
      return dateB - dateA;
    });

    return { success: true, data: conversations };
  } catch (error) {
    console.error('KonuÅŸmalarÄ± getirme hatasÄ±:', error);
    return { success: false, error: error.message };
  }
};

// KonuÅŸma mesajlarÄ±nÄ± getir
export const getConversationMessages = async (conversationId, limitCount = 50) => {
  try {
    const messagesRef = collection(db, 'messages');
    const q = query(
      messagesRef,
      where('conversationId', '==', conversationId),
      where('isDeleted', '==', false),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    const messages = [];

    querySnapshot.forEach((doc) => {
      messages.push({
        id: doc.id,
        ...doc.data()
      });
    });

    // Client-side sorting: createdAt'e gÃ¶re sÄ±rala (en eskiden yeniye)
    messages.sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
      const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
      return dateA - dateB;
    });

    return { success: true, data: messages };
  } catch (error) {
    console.error('MesajlarÄ± getirme hatasÄ±:', error);
    return { success: false, error: error.message };
  }
};

// Mesaj gÃ¶nder
export const sendMessage = async (conversationId, senderId, receiverId, text, attachments = []) => {
  try {
    if (!text && (!attachments || attachments.length === 0)) {
      return { success: false, error: 'Mesaj iÃ§eriÄŸi boÅŸ olamaz' };
    }

    const messageData = {
      conversationId,
      senderId,
      receiverId,
      text: text || '',
      attachments: attachments || [],
      isRead: false,
      readAt: null,
      isDeleted: false,
      deletedAt: null,
      reactions: {},
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    // MesajÄ± ekle
    const messagesRef = collection(db, 'messages');
    const messageDocRef = await addDoc(messagesRef, messageData);

    // KonuÅŸmayÄ± gÃ¼ncelle - unreadCount'u transaction ile artÄ±r
    const conversationRef = doc(db, 'conversations', conversationId);
    const lastMessage = {
      text: text || (attachments.length > 0 ? 'Dosya gÃ¶nderildi' : ''),
      senderId,
      createdAt: serverTimestamp()
    };

    // unreadCount'u artÄ±rmak iÃ§in transaction kullan
    try {
      await runTransaction(db, async (transaction) => {
        const convSnap = await transaction.get(conversationRef);
        if (convSnap.exists()) {
          const currentData = convSnap.data();
          const currentUnread = currentData.unreadCount?.[receiverId] || 0;
          transaction.update(conversationRef, {
            lastMessage,
            lastMessageAt: serverTimestamp(),
            [`unreadCount.${receiverId}`]: currentUnread + 1,
            [`deletedFor.${senderId}`]: deleteField(),
            [`deletedFor.${receiverId}`]: deleteField(),
            updatedAt: serverTimestamp()
          });
        } else {
          // KonuÅŸma yoksa oluÅŸtur (bu durumda olmamalÄ± ama gÃ¼venlik iÃ§in)
          transaction.set(conversationRef, {
            participants: [senderId, receiverId].sort(),
            lastMessage,
            lastMessageAt: serverTimestamp(),
            unreadCount: {
              [senderId]: 0,
              [receiverId]: 1
            },
            // Yeni konuÅŸma, deletedFor zaten yok ama temiz baÅŸlamak iÃ§in
            deletedFor: {},
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }
      });
    } catch (transactionError) {
      console.error('KonuÅŸma gÃ¼ncelleme hatasÄ± (transaction):', transactionError);
      // Transaction baÅŸarÄ±sÄ±z olursa manuel gÃ¼ncelleme dene
      try {
        await updateDoc(conversationRef, {
          lastMessage,
          lastMessageAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      } catch (updateError) {
        console.error('KonuÅŸma gÃ¼ncelleme hatasÄ± (fallback):', updateError);
      }
    }

    return {
      success: true,
      data: { id: messageDocRef.id, ...messageData }
    };
  } catch (error) {
    console.error('Mesaj gÃ¶nderme hatasÄ±:', error);
    return { success: false, error: error.message };
  }
};

// MesajlarÄ± okundu olarak iÅŸaretle
export const markMessagesAsRead = async (conversationId, userId) => {
  try {
    const messagesRef = collection(db, 'messages');
    const q = query(
      messagesRef,
      where('conversationId', '==', conversationId),
      where('receiverId', '==', userId),
      where('isRead', '==', false),
      where('isDeleted', '==', false)
    );

    const querySnapshot = await getDocs(q);
    const { writeBatch } = await import('firebase/firestore');
    const batch = writeBatch(db);

    querySnapshot.forEach((messageDoc) => {
      const messageRef = doc(db, 'messages', messageDoc.id);
      batch.update(messageRef, {
        isRead: true,
        readAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    });

    await batch.commit();

    // KonuÅŸmanÄ±n unreadCount'unu sÄ±fÄ±rla
    const conversationRef = doc(db, 'conversations', conversationId);
    await updateDoc(conversationRef, {
      [`unreadCount.${userId}`]: 0,
      updatedAt: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('MesajlarÄ± okundu iÅŸaretleme hatasÄ±:', error);
    return { success: false, error: error.message };
  }
};

// Mesaj sil (soft delete)
export const deleteMessage = async (messageId, userId) => {
  try {
    const messageRef = doc(db, 'messages', messageId);
    const messageSnap = await getDoc(messageRef);

    if (!messageSnap.exists()) {
      return { success: false, error: 'Mesaj bulunamadÄ±' };
    }

    const messageData = messageSnap.data();
    if (messageData.senderId !== userId) {
      return { success: false, error: 'Sadece kendi mesajlarÄ±nÄ±zÄ± silebilirsiniz' };
    }

    await updateDoc(messageRef, {
      isDeleted: true,
      deletedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Mesaj silme hatasÄ±:', error);
    return { success: false, error: error.message };
  }
};

// Mesaja emoji reaksiyonu ekle
export const addMessageReaction = async (messageId, emoji, userId) => {
  try {
    const messageRef = doc(db, 'messages', messageId);
    const messageSnap = await getDoc(messageRef);

    if (!messageSnap.exists()) {
      return { success: false, error: 'Mesaj bulunamadÄ±' };
    }

    const messageData = messageSnap.data();
    const reactions = messageData.reactions || {};

    if (!reactions[emoji]) {
      reactions[emoji] = [];
    }

    if (!reactions[emoji].includes(userId)) {
      reactions[emoji].push(userId);
    }

    await updateDoc(messageRef, {
      reactions,
      updatedAt: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Emoji reaksiyonu ekleme hatasÄ±:', error);
    return { success: false, error: error.message };
  }
};

// Emoji reaksiyonunu kaldÄ±r
export const removeMessageReaction = async (messageId, emoji, userId) => {
  try {
    const messageRef = doc(db, 'messages', messageId);
    const messageSnap = await getDoc(messageRef);

    if (!messageSnap.exists()) {
      return { success: false, error: 'Mesaj bulunamadÄ±' };
    }

    const messageData = messageSnap.data();
    const reactions = messageData.reactions || {};

    if (reactions[emoji]) {
      reactions[emoji] = reactions[emoji].filter(id => id !== userId);
      if (reactions[emoji].length === 0) {
        delete reactions[emoji];
      }
    }

    await updateDoc(messageRef, {
      reactions,
      updatedAt: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Emoji reaksiyonu kaldÄ±rma hatasÄ±:', error);
    return { success: false, error: error.message };
  }
};

// KullanÄ±cÄ±nÄ±n toplam okunmamÄ±ÅŸ mesaj sayÄ±sÄ±
export const getUnreadCount = async (userId) => {
  try {
    const conversationsRef = collection(db, 'conversations');
    const q = query(
      conversationsRef,
      where('participants', 'array-contains', userId)
    );

    const querySnapshot = await getDocs(q);
    let totalUnread = 0;

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const unreadCount = data.unreadCount?.[userId] || 0;
      totalUnread += unreadCount;
    });

    return { success: true, data: totalUnread };
  } catch (error) {
    console.error('OkunmamÄ±ÅŸ mesaj sayÄ±sÄ± getirme hatasÄ±:', error);
    return { success: false, error: error.message };
  }
};

// --- YENÄ° EKLENEN FONKSÄ°YONLAR ---

// MaÃ§a katÄ±l
// MaÃ§a katÄ±lma isteÄŸi gÃ¶nder
export const requestJoinMatch = async (matchId, userId, userData) => {
  try {
    const matchRef = doc(db, 'openMatches', matchId);
    
    await runTransaction(db, async (transaction) => {
      const matchDoc = await transaction.get(matchRef);
      if (!matchDoc.exists()) {
        throw new Error('MaÃ§ bulunamadÄ±');
      }

      const matchData = matchDoc.data();
      
      if (matchData.status !== 'open') {
        throw new Error('Bu maÃ§ artÄ±k katÄ±lÄ±ma aÃ§Ä±k deÄŸil');
      }

      const players = matchData.players || [];
      if (players.includes(userId)) {
        throw new Error('Zaten bu maÃ§tasÄ±nÄ±z');
      }

      const joinRequests = matchData.joinRequests || [];
      if (joinRequests.includes(userId)) {
        throw new Error('Zaten katÄ±lma isteÄŸi gÃ¶nderdiniz');
      }

      const currentPlayers = matchData.currentPlayers || 0;
      const maxPlayers = matchData.maxPlayers || 14; 

      if (currentPlayers >= maxPlayers) {
        throw new Error('MaÃ§ kadrosu dolu');
      }

      // Add to join requests
      transaction.update(matchRef, {
        joinRequests: arrayUnion(userId)
      });
      
      // Send notification to organizer
      if (matchData.organizerId && matchData.organizerId !== userId) {
        const notificationRef = doc(collection(db, 'notifications'));
        const requesterName = userData?.name || userData?.displayName || 'Bir kullanÄ±cÄ±';
        
        transaction.set(notificationRef, {
          userId: matchData.organizerId,
          type: 'match_join_request',
          title: 'Yeni MaÃ§ Ä°steÄŸi',
          message: `${requesterName} oluÅŸturduÄŸunuz "${matchData.title || 'MaÃ§'}" etkinliÄŸine katÄ±lmak istiyor.`,
          relatedId: matchId,
          relatedUserId: userId,
          read: false,
          createdAt: serverTimestamp()
        });
      }
    });

    return { success: true };
  } catch (error) {
    console.error('MaÃ§a katÄ±lma isteÄŸi hatasÄ±:', error);
    return { success: false, error: error.message };
  }
};

// MaÃ§a katÄ±lma isteÄŸini yanÄ±tla
export const respondToMatchJoinRequest = async (notificationId, action, matchId, requestingUserId, currentUserId) => {
  try {
    const matchRef = doc(db, 'openMatches', matchId);
    const notificationRef = doc(db, 'notifications', notificationId);
    
    await runTransaction(db, async (transaction) => {
      // 1. MaÃ§ durumunu kontrol et
      const matchDoc = await transaction.get(matchRef);
      if (!matchDoc.exists()) {
        throw new Error('MaÃ§ bulunamadÄ±');
      }
      const matchData = matchDoc.data();
      
      if (matchData.organizerId !== currentUserId) {
         throw new Error('Yetkisiz iÅŸlem');
      }
      
      if (matchData.status !== 'open') {
         // EÄŸer maÃ§ kapandÄ±ysa, isteÄŸi reddet veya hata fÄ±rlat
         // Bildirimi yine de gÃ¼ncellemek isteyebiliriz ama ÅŸimdilik hata verelim
         // throw new Error('MaÃ§ kapalÄ±, iÅŸlem yapÄ±lamaz.');
      }

      // 2. Ä°steÄŸi iÅŸle
      // joinRequests'ten Ã§Ä±kar
      transaction.update(matchRef, {
         joinRequests: arrayRemove(requestingUserId)
      });
      
      if (action === 'accept') {
          // Kapasite kontrolÃ¼
          const currentPlayers = matchData.currentPlayers || 0;
          const maxPlayers = matchData.maxPlayers || 14; 
          
          if (currentPlayers >= maxPlayers) {
             throw new Error('MaÃ§ kapasitesi dolu');
          }
          
          // Oyuncuyu ekle
          transaction.update(matchRef, {
             players: arrayUnion(requestingUserId),
             currentPlayers: currentPlayers + 1
          });
          
          // Bildirim gÃ¶nder (istek sahibine)
          const acceptNotificationRef = doc(collection(db, 'notifications'));
          transaction.set(acceptNotificationRef, {
             userId: requestingUserId,
             type: 'system',
             title: 'MaÃ§ Ä°steÄŸiniz Kabul Edildi! âœ…',
             message: `"${matchData.title || 'MaÃ§'}" iÃ§in katÄ±lÄ±m isteÄŸiniz onaylandÄ±. Ä°yi maÃ§lar!`,
             relatedId: matchId,
             read: false,
             createdAt: serverTimestamp()
          });
          
      } else {
          // Reject - Bildirim gÃ¶nder
          const rejectNotificationRef = doc(collection(db, 'notifications'));
          transaction.set(rejectNotificationRef, {
             userId: requestingUserId,
             type: 'system',
             title: 'MaÃ§ Ä°steÄŸiniz Geri Ã‡evrildi',
             message: `"${matchData.title || 'MaÃ§'}" iÃ§in katÄ±lÄ±m isteÄŸiniz maalesef onaylanmadÄ±.`,
             relatedId: matchId,
             read: false,
             createdAt: serverTimestamp()
          });
      }
      
      // 3. Orijinal bildirimi gÃ¼ncelle (cevaplandÄ± olarak iÅŸaretle veya sil)
      // KullanÄ±cÄ± talebi: Tike tÄ±klayÄ±nca bir ÅŸey olmadÄ± -> Muhtemelen bu fonksiyon yoktu.
      transaction.delete(notificationRef); // Ä°ÅŸlem bitince bildirimi sil temizlik olsun
    });

    return { success: true };
  } catch (error) {
    console.error('Ä°stek yanÄ±tlama hatasÄ±:', error);
    return { success: false, error: error.message };
  }
};

// MesajlaÅŸma isteÄŸini yanÄ±tla
export const respondToMessageRequest = async (notificationId, action) => {
  try {
    await runTransaction(db, async (transaction) => {
      const notificationRef = doc(db, 'notifications', notificationId);
      const notificationDoc = await transaction.get(notificationRef);
      
      if (!notificationDoc.exists()) {
         throw new Error('Bildirim bulunamadÄ±');
      }
      
      const notifData = notificationDoc.data();
      const conversationId = notifData.relatedId;
      
      if (conversationId) {
         const convRef = doc(db, 'conversations', conversationId);
         const convDoc = await transaction.get(convRef);
         
         if (convDoc.exists()) {
             if (action === 'accept') {
                 transaction.update(convRef, {
                     status: 'active',
                     acceptedAt: serverTimestamp()
                 });
             } else {
                 transaction.update(convRef, {
                     status: 'rejected',
                     rejectedAt: serverTimestamp()
                 });
             }
         }
      }
      
      transaction.delete(notificationRef);
    });
    
    return { success: true };
  } catch (error) {
    console.error('Mesaj isteÄŸi yanÄ±t hatasÄ±:', error);
    return { success: false, error: error.message };
  }
};

// MaÃ§tan oyuncu at (OrganizatÃ¶r iÃ§in)
export const kickPlayerFromMatch = async (matchId, playerId) => {
  try {
    const matchRef = doc(db, 'openMatches', matchId);
    
    await runTransaction(db, async (transaction) => {
      const matchDoc = await transaction.get(matchRef);
      if (!matchDoc.exists()) {
        throw new Error('MaÃ§ bulunamadÄ±');
      }

      const matchData = matchDoc.data();
      const players = matchData.players || [];

      if (!players.includes(playerId)) {
        throw new Error('Oyuncu bu maÃ§ta deÄŸil');
      }

      const newPlayers = players.filter(id => id !== playerId);
      let newCurrentPlayers = matchData.currentPlayers - 1;
      if (newCurrentPlayers < 1) newCurrentPlayers = 1;

      transaction.update(matchRef, {
        players: newPlayers,
        currentPlayers: newCurrentPlayers
      });
      
      // Bildirim gÃ¶nder
      const notificationRef = doc(collection(db, 'notifications'));
      transaction.set(notificationRef, {
        userId: playerId,
        type: 'match_kick',
        title: 'MaÃ§tan Ã‡Ä±karÄ±ldÄ±nÄ±z',
        message: `${matchData.tesisName || 'Bir maÃ§tan'} yÃ¶netici tarafÄ±ndan Ã§Ä±karÄ±ldÄ±nÄ±z.`,
        read: false,
        createdAt: serverTimestamp()
      });
    });

    return { success: true };
  } catch (error) {
    console.error('Oyuncu atma hatasÄ±:', error);
    return { success: false, error: error.message };
  }
};

// Birden Ã§ok kullanÄ±cÄ±yÄ± ID'lerine gÃ¶re getir
export const getUsersByIds = async (userIds) => {
  try {
    if (!userIds || userIds.length === 0) return { success: true, data: [] };
    
    // BasitÃ§e her ID iÃ§in getDoc yapalÄ±m
    const promises = userIds.map(id => getDoc(doc(db, 'users', id)));
    const docs = await Promise.all(promises);
    
    const users = [];
    docs.forEach(d => {
      if (d.exists()) {
        users.push(d.data());
      }
    });

    return { success: true, data: users };
  } catch (error) {
    console.error('KullanÄ±cÄ±larÄ± getirme hatasÄ±:', error);
    return { success: false, error: error.message };
  }
};

// MaÃ§ mesajÄ± gÃ¶nder
export const sendMatchMessage = async (matchId, senderId, senderName, text) => {
  try {
    // 1. MesajÄ± kaydet
    await addDoc(collection(db, 'openMatches', matchId, 'messages'), {
      senderId,
      senderName,
      text,
      createdAt: serverTimestamp()
    });

    // 2. MaÃ§ katÄ±lÄ±mcÄ±larÄ±nÄ± bul ve bildirim gÃ¶nder
    const matchRef = doc(db, 'openMatches', matchId);
    const matchDoc = await getDoc(matchRef);
    
    if (matchDoc.exists()) {
       const matchData = matchDoc.data();
       const participants = new Set(matchData.players || []);
       // OrganizatÃ¶r players iÃ§inde olabilir veya olmayabilir. Genelde players iÃ§indedir.
       // EÄŸer players iÃ§inde yoksa ekleyelim.
       if (matchData.organizerId) participants.add(matchData.organizerId); 
       
       const batch = writeBatch(db);
       let hasBatchOps = false;

       participants.forEach(pid => {
           if (pid !== senderId) {
               const notifRef = doc(collection(db, 'notifications'));
               batch.set(notifRef, {
                   userId: pid,
                   type: 'message',
                   title: `Yeni Mesaj: ${matchData.title || matchData.tesisName || 'Futbol MaÃ§Ä±'}`,
                   message: `${senderName}: ${text}`,
                   relatedId: matchId, // Link to match details
                   read: false,
                   createdAt: serverTimestamp()
               });
               hasBatchOps = true;
           }
       });
       
       if (hasBatchOps) {
           await batch.commit();
       }
    }

    return { success: true };
  } catch (error) {
    console.error('Mesaj gÃ¶nderme hatasÄ±:', error);
    return { success: false, error: error.message };
  }
};


// KullanÄ±cÄ±nÄ±n katÄ±ldÄ±ÄŸÄ± veya oluÅŸturduÄŸu aÃ§Ä±k maÃ§larÄ± getir
export const getUserOpenMatchesList = async (userId) => {
  try {
    const q = query(
      collection(db, 'openMatches'),
      where('players', 'array-contains', userId)
    );
    
    const snapshot = await getDocs(q);
    const matches = [];
    
    snapshot.forEach((doc) => {
      matches.push({ id: doc.id, ...doc.data() });
    });
    
    // Tarihe gÃ¶re sÄ±rala (yakÄ±n tarih Ã¶nce)
    matches.sort((a, b) => {
      const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
      const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
      return dateA - dateB;
    });

    return { success: true, data: matches };
  } catch (error) {
    console.error('KullanÄ±cÄ± maÃ§larÄ±nÄ± getirme hatasÄ±:', error);
    return { success: false, error: error.message };
  }
};

// Oyuncu Puanlama Ä°ÅŸlemleri

export const submitMatchRatings = async (matchId, ratingsToSubmit, raterId) => {
  try {
    const batch = writeBatch(db);
    
    // 1. Mark match as rated by this user in 'rezervasyonlar'
    const matchResRef = doc(db, 'rezervasyonlar', matchId);
    batch.update(matchResRef, {
      ratedBy: arrayUnion(raterId)
    });

    // 2. Process each rating
    for (const { userId, criteria, overallRating } of ratingsToSubmit) {
      // Create a rating document (matching Puanlarim.jsx name)
      const ratingRef = doc(collection(db, 'ratings'));
      batch.set(ratingRef, {
        matchId,
        raterId,
        ratedUserId: userId, // Matching Puanlarim.jsx query
        overallRating,
        skillRating: criteria.skill || 0,
        teamworkRating: criteria.teamwork || 0,
        sportsmanshipRating: criteria.sportsmanship || 0,
        punctualityRating: criteria.punctuality || 0,
        comment: '', // Optional for now
        createdAt: serverTimestamp()
      });

      // Update user's aggregated stats
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        // Helper to calc new average
        const calcNewAvg = (currentAvg, currentCount, newVal) => {
          if (newVal <= 0) return currentAvg || 0;
          const count = currentCount || 0;
          const totalScore = (currentAvg || 5) * count; // Base 5 for empty accounts? Or 0? Let's use 0 if count is 0.
          if (count === 0) return newVal;
          return Math.round(((totalScore + newVal) / (count + 1)) * 10) / 10;
        };

        const currentCount = userData.ratingCount || 0;
        const newCount = currentCount + 1;

        const updates = {
          ratingCount: newCount,
          rating: calcNewAvg(userData.rating, currentCount, overallRating),
          skillRating: calcNewAvg(userData.skillRating, currentCount, criteria.skill),
          teamworkRating: calcNewAvg(userData.teamworkRating, currentCount, criteria.teamwork),
          sportsmanshipRating: calcNewAvg(userData.sportsmanshipRating, currentCount, criteria.sportsmanship),
          punctualityRating: calcNewAvg(userData.punctualityRating, currentCount, criteria.punctuality)
        };

        batch.update(userRef, updates);

        // Notify user about new rating
        const notificationRef = doc(collection(db, 'notifications'));
        batch.set(notificationRef, {
            userId: userId,
            type: 'rating',
            title: 'Yeni DeÄŸerlendirme AlÄ±ndÄ± â­',
            message: 'Son maÃ§Ä±nÄ±zdan sonra performansÄ±nÄ±z deÄŸerlendirildi. Profilinizden detaylarÄ± inceleyebilirsiniz.',
            relatedId: matchId,
            read: false,
            createdAt: serverTimestamp()
        });
      }
    }

    await batch.commit();
    return { success: true };

  } catch (error) {
    console.error('Puanlama hatasÄ±:', error);
    return { success: false, error: error.message };
  }
};


// KonuÅŸmayÄ± sil (KullanÄ±cÄ± iÃ§in gizle)
// KonuÅŸmayÄ± sil (KullanÄ±cÄ± iÃ§in gizle)
export const deleteConversation = async (conversationId, userId) => {
  try {
    const conversationRef = doc(db, 'conversations', conversationId);
    
    // deletedFor map'ini gÃ¼ncelle - setDoc ile merge kullanarak map yoksa oluÅŸturur
    await setDoc(conversationRef, {
      deletedFor: {
        [userId]: true
      }
    }, { merge: true });

    return { success: true };
  } catch (error) {
    console.error('KonuÅŸma silme hatasÄ±:', error);
    return { success: false, error: error.message };
  }
};

// --- System Settings (System-wide configurations) ---
export const getSystemSettings = async (settingType) => {
  try {
    const docRef = doc(db, 'system_settings', settingType);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { success: true, data: docSnap.data() };
    }
    return { success: true, data: null };
  } catch (error) {
    console.error('Sistem ayarları getirme hatası:', error);
    return { success: false, error: error.message };
  }
};

export const updateSystemSettings = async (settingType, data) => {
  try {
    const docRef = doc(db, 'system_settings', settingType);
    await setDoc(docRef, data, { merge: true });
    return { success: true };
  } catch (error) {
     console.error('Sistem ayarları güncelleme hatası:', error);
    return { success: false, error: error.message };
  }
};


// --- Page Management Service ---

// Get all pages
export const getPages = async () => {
    try {
        const q = query(collection(db, 'pages'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        const pages = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        return { success: true, data: pages };
    } catch (error) {
        console.error("Error getting pages:", error);
        return { success: false, error: error.message };
    }
};

// Get single page by slug
export const getPageBySlug = async (slug) => {
    try {
        const q = query(collection(db, 'pages'), where('slug', '==', slug), limit(1));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            return { success: false, error: 'Page not found' };
        }

        const doc = snapshot.docs[0];
        return { success: true, data: { id: doc.id, ...doc.data() } };
    } catch (error) {
        console.error("Error getting page:", error);
        return { success: false, error: error.message };
    }
};

// Create or update page
export const savePage = async (pageData) => {
    try {
        const { id, ...data } = pageData;
        const now = new Date().toISOString();

        if (id) {
            // Update existing
            await updateDoc(doc(db, 'pages', id), {
                ...data,
                updatedAt: now
            });
            return { success: true, data: { ...pageData, updatedAt: now } };
        } else {
            // Create new
            const docRef = await addDoc(collection(db, 'pages'), {
                ...data,
                createdAt: now,
                updatedAt: now
            });
            return { success: true, data: { id: docRef.id, ...data, createdAt: now, updatedAt: now } };
        }
    } catch (error) {
        console.error("Error saving page:", error);
        return { success: false, error: error.message };
    }
};

export const getAuthPageContent = async (pageType) => {
    try {
        const docRef = doc(db, 'settings', 'auth_pages');
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            return { success: true, data: data[pageType] || null };
        }
        return { success: true, data: null };
    } catch (error) {
        console.error("Error fetching auth page content:", error);
        return { success: false, error: error.message };
    }
};

export const saveAuthPageContent = async (pageType, content) => {
    try {
        const docRef = doc(db, 'settings', 'auth_pages');
        await setDoc(docRef, { [pageType]: content }, { merge: true });
        return { success: true };
    } catch (error) {
        console.error("Error saving auth page content:", error);
        return { success: false, error: error.message };
    }
};

// Delete page
export const deletePage = async (id) => {
    try {
        await deleteDoc(doc(db, 'pages', id));
        return { success: true };
    } catch (error) {
        console.error("Error deleting page:", error);
        return { success: false, error: error.message };
    }
};

// Toggle publish status
export const togglePagePublish = async (id, currentStatus) => {
    try {
        await updateDoc(doc(db, 'pages', id), {
            isPublished: !currentStatus,
            updatedAt: new Date().toISOString()
        });
        return { success: true };
    } catch (error) {
        console.error("Error toggling page status:", error);
        return { success: false, error: error.message };
    }
};

// Müşteri Segmenti Ekle
export const addCustomerSegment = async (segmentData) => {
  try {
    await addDoc(collection(db, 'customerSegments'), {
      ...segmentData,
      createdAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('Segment ekleme hatası:', error);
    return { success: false, error: error.message };
  }
};

// Müşteri Segmenti Sil
export const deleteCustomerSegment = async (segmentId) => {
  try {
    await deleteDoc(doc(db, 'customerSegments', segmentId));
    return { success: true };
  } catch (error) {
    console.error('Segment silme hatası:', error);
    return { success: false, error: error.message };
  }
};

// Marketing Mesajı Gönder (Mock veya Log)
export const sendMarketingMessage = async (templateId, segmentId, channel) => {
  try {
    // Mesaj log kaydı oluştur
    await addDoc(collection(db, 'messageLogs'), {
      templateId,
      segmentId,
      channel,
      sentAt: serverTimestamp(),
      status: 'sent',
      recipientCount: 0 // İleride gerçek segment sayısını eklemeli
    });
    
    // Şablon istatistiklerini güncelle
    const templateRef = doc(db, 'messageTemplates', templateId);
    await updateDoc(templateRef, {
      'stats.sent': increment(1), 
      'stats.lastSent': serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Mesaj gönderme hatası:', error);
    return { success: false, error: error.message };
  }
};

// Kaydedilmiş Segmentleri Getir
export const getSavedCustomerSegments = async (ownerId) => {
    try {
        const q = query(collection(db, 'customerSegments'), where('ownerId', '==', ownerId), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        const segments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return { success: true, data: segments };
    } catch (error) {
        return { success: false, error: error.message };
    }
};
