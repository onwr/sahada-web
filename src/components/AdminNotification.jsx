import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Bell, AlertCircle, CheckCircle, MessageSquare, Building2 } from 'lucide-react';
import toast from '../utils/toast';

const AdminNotification = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Index gerektirmeyen sorgular - orderBy kaldırıldı, client-side sorting yapılacak
    const complaintsQuery = query(
      collection(db, 'complaints'),
      where('status', '==', 'pending')
    );

    const ticketsQuery = query(
      collection(db, 'tickets'),
      where('status', '==', 'open')
    );

    const tesisQuery = query(
      collection(db, 'tesisler'),
      where('status', '==', 'pending')
    );

    let isFirstLoadComplaints = true;
    const unsubscribeComplaints = onSnapshot(complaintsQuery, (snapshot) => {
      // Client-side sorting
      const complaints = [];
      snapshot.forEach((doc) => {
        complaints.push({ id: doc.id, ...doc.data() });
      });
      complaints.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || a.createdAt?.toMillis?.() || 0;
        const dateB = b.createdAt?.toDate?.() || b.createdAt?.toMillis?.() || 0;
        return dateB - dateA;
      });

      if (isFirstLoadComplaints) {
          isFirstLoadComplaints = false;
          return;
      }

      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          toast((t) => (
            <div 
              onClick={() => {
                toast.dismiss(t.id);
                window.location.href = '/admin/sikayetler';
              }}
              className="cursor-pointer flex items-center"
            >
              <span className="mr-2">⚠️</span>
              <span className="font-medium">Yeni şikayet: {data.title || 'Şikayet'}</span>
            </div>
          ), {
            duration: 4000,
          });
        }
      });
    });

    let isFirstLoadTickets = true;
    const unsubscribeTickets = onSnapshot(ticketsQuery, (snapshot) => {
      // Client-side sorting
      const tickets = [];
      snapshot.forEach((doc) => {
        tickets.push({ id: doc.id, ...doc.data() });
      });
      tickets.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || a.createdAt?.toMillis?.() || 0;
        const dateB = b.createdAt?.toDate?.() || b.createdAt?.toMillis?.() || 0;
        return dateB - dateA;
      });

      if (isFirstLoadTickets) {
          isFirstLoadTickets = false;
          return;
      }

      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          toast((t) => (
            <div 
              onClick={() => {
                toast.dismiss(t.id);
                window.location.href = '/admin/destek';
              }}
              className="cursor-pointer flex items-center"
            >
              <span className="mr-2">💬</span>
              <span className="font-medium">Yeni ticket: {data.title || 'Ticket'}</span>
            </div>
          ), {
            duration: 4000,
          });
        }
      });
    });

    let isFirstLoadTesis = true;
    const unsubscribeTesis = onSnapshot(tesisQuery, (snapshot) => {
      const tesisler = [];
      snapshot.forEach((doc) => {
        tesisler.push({ id: doc.id, ...doc.data() });
      });
      
      // Client-side sorting by createdAt
      tesisler.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateB - dateA;
      });
      
      if (isFirstLoadTesis) {
          isFirstLoadTesis = false;
          return;
      }

      // Sadece yeni eklenenleri göster (ilk 5)
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          toast((t) => (
            <div 
              onClick={() => {
                toast.dismiss(t.id);
                window.location.href = '/admin/tesisler';
              }}
              className="cursor-pointer flex items-center"
            >
              <span className="mr-2">🏢</span>
              <span className="font-medium">Yeni tesis onayı bekliyor: {data.name || 'Tesis'}</span>
            </div>
          ), {
            duration: 4000,
          });
        }
      });
    });

    // Unread count hesaplama - mevcut sorguları kullanarak
    let complaintsCount = 0;
    let ticketsCount = 0;
    let tesisCount = 0;

    const updateUnreadCount = () => {
      setUnreadCount(complaintsCount + ticketsCount + tesisCount);
    };

    const unsubscribeComplaintsCount = onSnapshot(complaintsQuery, (snapshot) => {
      complaintsCount = snapshot.size;
      updateUnreadCount();
    });

    const unsubscribeTicketsCount = onSnapshot(ticketsQuery, (snapshot) => {
      ticketsCount = snapshot.size;
      updateUnreadCount();
    });

    const unsubscribeTesisCount = onSnapshot(tesisQuery, (snapshot) => {
      tesisCount = snapshot.size;
      updateUnreadCount();
    });

    return () => {
      unsubscribeComplaints();
      unsubscribeTickets();
      unsubscribeTesis();
      unsubscribeComplaintsCount();
      unsubscribeTicketsCount();
      unsubscribeTesisCount();
    };
  }, []);

  return null;
};

export default AdminNotification;

