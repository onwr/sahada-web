import { createOrUpdateMembership, getMembership, cancelMembership, checkPremiumStatus } from './firestoreService';
import { Timestamp } from 'firebase/firestore';

export const purchaseMembership = async (userId, planId, duration, paymentId, planName = null, planPrice = null) => {
  const startDate = new Date();
  const endDate = new Date();
  
  if (duration === 'monthly') {
    endDate.setMonth(endDate.getMonth() + 1);
  } else if (duration === 'yearly') {
    endDate.setFullYear(endDate.getFullYear() + 1);
  }

  const membershipData = {
    type: 'premium',
    planId: planId,
    planName: planName || `Premium ${duration === 'monthly' ? 'Aylık' : 'Yıllık'}`,
    planPrice: planPrice || 0,
    duration,
    startDate: Timestamp.fromDate(startDate),
    endDate: Timestamp.fromDate(endDate),
    paymentId,
    status: 'active',
    createdAt: Timestamp.fromDate(new Date())
  };

  return await createOrUpdateMembership(userId, membershipData);
};

export const getUserMembership = async (userId) => {
  return await getMembership(userId);
};

export const cancelUserMembership = async (userId) => {
  return await cancelMembership(userId);
};

export const isUserPremium = async (userId) => {
  const result = await checkPremiumStatus(userId);
  return result.success && result.isPremium;
};

