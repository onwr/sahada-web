import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { checkPremiumStatus } from '../services/firestoreService';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';

export const usePremium = () => {
  const { user, userData } = useAuth();
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [expiresAt, setExpiresAt] = useState(null);

  useEffect(() => {
    if (!user || !user.uid) {
      setIsPremium(false);
      setIsLoading(false);
      setExpiresAt(null);
      return;
    }

    setIsLoading(true);

    // İlk kontrol
    const initialCheck = async () => {
      const result = await checkPremiumStatus(user.uid);
      if (result.success) {
        setIsPremium(result.isPremium || false);
        setExpiresAt(result.expiresAt || null);
      }
      setIsLoading(false);
    };

    initialCheck();

    // Real-time listener - memberships collection
    const membershipRef = doc(db, 'memberships', user.uid);
    const unsubscribeMembership = onSnapshot(membershipRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const now = new Date();
        const endDate = data.endDate?.toDate?.() || (data.endDate ? new Date(data.endDate) : null);
        
        if (data.status === 'active' && endDate && endDate > now) {
          setIsPremium(true);
          setExpiresAt(endDate);
        } else {
          setIsPremium(false);
          setExpiresAt(null);
        }
      } else {
        setIsPremium(false);
        setExpiresAt(null);
      }
      setIsLoading(false);
    }, (error) => {
      console.error('Membership listener hatası:', error);
      setIsLoading(false);
    });

    // Real-time listener - users collection (membershipType değişiklikleri için)
    const userRef = doc(db, 'users', user.uid);
    const unsubscribeUser = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const membershipType = data.membershipType || 'free';
        const membershipEndDate = data.membershipEndDate?.toDate?.() || (data.membershipEndDate ? new Date(data.membershipEndDate) : null);
        
        if (membershipType === 'premium' && membershipEndDate) {
          const now = new Date();
          if (membershipEndDate > now) {
            setIsPremium(true);
            setExpiresAt(membershipEndDate);
          } else {
            setIsPremium(false);
            setExpiresAt(null);
          }
        } else {
          setIsPremium(false);
          setExpiresAt(null);
        }
      }
    }, (error) => {
      console.error('User listener hatası:', error);
    });

    return () => {
      unsubscribeMembership();
      unsubscribeUser();
    };
  }, [user?.uid]);

  const hasFeature = (feature) => {
    if (!isPremium) return false;
    return true;
  };

  return { isPremium, isLoading, expiresAt, hasFeature };
};

