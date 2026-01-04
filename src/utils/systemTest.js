// Sistem Test Fonksiyonları
// Bu dosya tüm sistem özelliklerini test etmek için fonksiyonlar içerir

import { 
  testPageLoad, 
  testRealtimeListener, 
  testFormValidation,
  testExportFunction,
  testNavigation,
  testPerformance,
  testErrorHandling,
  runTestSuite
} from './testHelpers';

import {
  getUserData,
  getTesisler,
  getPlayerReservations,
  getPlayerStats,
  getPlayerTeams,
  getPlayerNotifications,
  getPlayerInvoices,
  getPlayerPlayedWith,
  getOpenMatches,
  getUserOpenMatches,
  getTournaments,
  getPlayerTournaments,
  getAllTesisler,
  getDashboardStats,
  getTodaySchedule,
  getRecentReservations,
  getRezervasyonlar,
  getCustomers,
  getFinancialData,
  getExpenses,
  getRevenues,
  getReportData,
  getCampaigns,
  getCustomerSegments,
  getTournamentStats,
  getPremiumPlans,
  getPremiumFeatures,
  getAllPremiumMembers,
  getPremiumStats,
  getAllTesislerAdmin,
  getAllUsers,
  getAllReservations,
  getAllComplaints,
  getAllWithdrawalRequests,
  exportUserData,
  exportPerformanceData
} from '../services/firestoreService';

/**
 * Authentication Test Suite
 */
export const testAuthentication = async (user) => {
  const tests = [
    {
      name: 'Kullanıcı verisi yükleme',
      function: async () => {
        if (!user) return { success: false, error: 'Kullanıcı giriş yapmamış' };
        return await testPageLoad('getUserData', () => getUserData(user.uid));
      }
    }
  ];

  return await runTestSuite(tests);
};

/**
 * Oyuncu Paneli Test Suite
 */
export const testPlayerPanel = async (userId) => {
  if (!userId) {
    return { error: 'Kullanıcı ID gerekli' };
  }

  const tests = [
    {
      name: 'Dashboard - İstatistikler',
      function: async () => await testPageLoad('getPlayerStats', () => getPlayerStats(userId))
    },
    {
      name: 'Dashboard - Rezervasyonlar',
      function: async () => await testPageLoad('getPlayerReservations', () => getPlayerReservations(userId))
    },
    {
      name: 'Rezervasyonlar - Liste',
      function: async () => await testPageLoad('getPlayerReservations', () => getPlayerReservations(userId))
    },
    {
      name: 'Sahalar - Liste',
      function: async () => await testPageLoad('getAllTesisler', () => getAllTesisler())
    },
    {
      name: 'Ekip - Takımlar',
      function: async () => await testPageLoad('getPlayerTeams', () => getPlayerTeams(userId))
    },
    {
      name: 'Turnuvalar - Liste',
      function: async () => await testPageLoad('getPlayerTournaments', () => getPlayerTournaments(userId))
    },
    {
      name: 'Bildirimler - Liste',
      function: async () => await testPageLoad('getPlayerNotifications', () => getPlayerNotifications(userId))
    },
    {
      name: 'Faturalar - Liste',
      function: async () => await testPageLoad('getPlayerInvoices', () => getPlayerInvoices(userId))
    },
    {
      name: 'Oyuncular - Liste',
      function: async () => await testPageLoad('getPlayerPlayedWith', () => getPlayerPlayedWith(userId))
    },
    {
      name: 'Oyuncu Bul - Açık Maçlar',
      function: async () => await testPageLoad('getOpenMatches', () => getOpenMatches({}))
    },
    {
      name: 'Maç Oluştur - Kullanıcı Maçları',
      function: async () => await testPageLoad('getUserOpenMatches', () => getUserOpenMatches(userId))
    },
    {
      name: 'Veri İndirme (GDPR)',
      function: async () => await testExportFunction(() => exportUserData(userId), 'json')
    },
    {
      name: 'Performans Export',
      function: async () => await testExportFunction(() => exportPerformanceData(userId, 'csv'), 'csv')
    }
  ];

  return await runTestSuite(tests);
};

/**
 * Saha Sahibi Paneli Test Suite
 */
export const testOwnerPanel = async (ownerId) => {
  if (!ownerId) {
    return { error: 'Saha sahibi ID gerekli' };
  }

  const tests = [
    {
      name: 'Dashboard - İstatistikler',
      function: async () => await testPageLoad('getDashboardStats', () => getDashboardStats(ownerId))
    },
    {
      name: 'Dashboard - Bugünkü Program',
      function: async () => await testPageLoad('getTodaySchedule', () => getTodaySchedule(ownerId))
    },
    {
      name: 'Dashboard - Son Rezervasyonlar',
      function: async () => await testPageLoad('getRecentReservations', () => getRecentReservations(ownerId))
    },
    {
      name: 'Saha Yönetimi - Sahalar',
      function: async () => await testPageLoad('getTesisler', () => getTesisler(ownerId))
    },
    {
      name: 'Rezervasyonlar - Liste',
      function: async () => await testPageLoad('getRezervasyonlar', () => getRezervasyonlar(ownerId))
    },
    {
      name: 'Müşteriler - Liste',
      function: async () => await testPageLoad('getCustomers', () => getCustomers(ownerId))
    },
    {
      name: 'Finansal - Veriler',
      function: async () => await testPageLoad('getFinancialData', () => getFinancialData(ownerId))
    },
    {
      name: 'Finansal - Giderler',
      function: async () => await testPageLoad('getExpenses', () => getExpenses(ownerId))
    },
    {
      name: 'Finansal - Gelirler',
      function: async () => await testPageLoad('getRevenues', () => getRevenues(ownerId))
    },
    {
      name: 'Raporlar - Veriler',
      function: async () => {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
        return await testPageLoad('getReportData', () => getReportData(ownerId, startDate, endDate));
      }
    },
    {
      name: 'Marketing - Kampanyalar',
      function: async () => await testPageLoad('getCampaigns', () => getCampaigns(ownerId))
    },
    {
      name: 'Marketing - Müşteri Segmentleri',
      function: async () => await testPageLoad('getCustomerSegments', () => getCustomerSegments(ownerId))
    },
    {
      name: 'Turnuvalar - İstatistikler',
      function: async () => await testPageLoad('getTournamentStats', () => getTournamentStats(ownerId))
    },
    {
      name: 'Premium - Planlar',
      function: async () => await testPageLoad('getPremiumPlans', () => getPremiumPlans())
    },
    {
      name: 'Premium - Özellikler',
      function: async () => await testPageLoad('getPremiumFeatures', () => getPremiumFeatures())
    }
  ];

  return await runTestSuite(tests);
};

/**
 * Admin Paneli Test Suite
 */
export const testAdminPanel = async () => {
  const tests = [
    {
      name: 'Tesisler - Liste',
      function: async () => await testPageLoad('getAllTesislerAdmin', () => getAllTesislerAdmin({}))
    },
    {
      name: 'Kullanıcılar - Liste',
      function: async () => await testPageLoad('getAllUsers', () => getAllUsers({}))
    },
    {
      name: 'Rezervasyonlar - Liste',
      function: async () => await testPageLoad('getAllReservations', () => getAllReservations({}))
    },
    {
      name: 'Şikayetler - Liste',
      function: async () => await testPageLoad('getAllComplaints', () => getAllComplaints({}))
    },
    {
      name: 'Çekim Talepleri - Liste',
      function: async () => await testPageLoad('getAllWithdrawalRequests', () => getAllWithdrawalRequests({}))
    },
    {
      name: 'Premium - Üyeler',
      function: async () => await testPageLoad('getAllPremiumMembers', () => getAllPremiumMembers({}))
    },
    {
      name: 'Premium - İstatistikler',
      function: async () => await testPageLoad('getPremiumStats', () => getPremiumStats())
    },
    {
      name: 'Premium - Planlar',
      function: async () => await testPageLoad('getPremiumPlans', () => getPremiumPlans())
    },
    {
      name: 'Premium - Özellikler',
      function: async () => await testPageLoad('getPremiumFeatures', () => getPremiumFeatures())
    }
  ];

  return await runTestSuite(tests);
};

/**
 * Public Sayfalar Test Suite
 */
export const testPublicPages = async () => {
  const tests = [
    {
      name: 'Yakındaki Sahalar - Tesis Listesi',
      function: async () => await testPageLoad('getAllTesisler', () => getAllTesisler())
    },
    {
      name: 'Oyuncu Bul - Açık Maçlar',
      function: async () => await testPageLoad('getOpenMatches', () => getOpenMatches({}))
    }
  ];

  return await runTestSuite(tests);
};

/**
 * Form Validasyon Test Suite
 */
export const testFormValidations = () => {
  const tests = [
    {
      name: 'IBAN Formatı',
      function: async () => {
        const result = testFormValidation(
          { iban: 'TR330006100519786457841326' },
          { iban: { required: true, type: 'iban' } }
        );
        return result;
      }
    },
    {
      name: 'Email Formatı',
      function: async () => {
        const result = testFormValidation(
          { email: 'test@example.com' },
          { email: { required: true, type: 'email' } }
        );
        return result;
      }
    },
    {
      name: 'Şifre Uzunluk Kontrolü',
      function: async () => {
        const result = testFormValidation(
          { password: '123456' },
          { password: { required: true, minLength: 6 } }
        );
        return result;
      }
    },
    {
      name: 'Zorunlu Alan Kontrolü',
      function: async () => {
        const result = testFormValidation(
          { name: '' },
          { name: { required: true } }
        );
        return { success: !result.success, error: result.errors?.name };
      }
    }
  ];

  return runTestSuite(tests);
};

/**
 * Tüm Sistem Test Suite
 */
export const runFullSystemTest = async (user, userType, options = {}) => {
  const results = {
    timestamp: new Date().toISOString(),
    user: user?.uid || 'anonymous',
    userType: userType || 'unknown',
    tests: {},
    startTime: Date.now()
  };

  try {
    // Authentication testleri
    if (user) {
      try {
        results.tests.authentication = await testAuthentication(user);
      } catch (error) {
        results.tests.authentication = {
          error: error.message,
          stack: error.stack,
          summary: { total: 0, passed: 0, failed: 1, passRate: '0%' },
          results: []
        };
      }
    }

    // Public sayfalar testleri
    try {
      results.tests.publicPages = await testPublicPages();
    } catch (error) {
      results.tests.publicPages = {
        error: error.message,
        stack: error.stack,
        summary: { total: 0, passed: 0, failed: 1, passRate: '0%' },
        results: []
      };
    }

    // Kullanıcı tipine göre panel testleri
    if (userType === 'player' && user) {
      try {
        results.tests.playerPanel = await testPlayerPanel(user.uid);
      } catch (error) {
        results.tests.playerPanel = {
          error: error.message,
          stack: error.stack,
          summary: { total: 0, passed: 0, failed: 1, passRate: '0%' },
          results: []
        };
      }
    } else if (userType === 'owner' && user) {
      try {
        results.tests.ownerPanel = await testOwnerPanel(user.uid);
      } catch (error) {
        results.tests.ownerPanel = {
          error: error.message,
          stack: error.stack,
          summary: { total: 0, passed: 0, failed: 1, passRate: '0%' },
          results: []
        };
      }
    } else if (userType === 'admin') {
      try {
        results.tests.adminPanel = await testAdminPanel();
      } catch (error) {
        results.tests.adminPanel = {
          error: error.message,
          stack: error.stack,
          summary: { total: 0, passed: 0, failed: 1, passRate: '0%' },
          results: []
        };
      }
    }

    // Form validasyon testleri
    try {
      results.tests.formValidations = await testFormValidations();
    } catch (error) {
      results.tests.formValidations = {
        error: error.message,
        stack: error.stack,
        summary: { total: 0, passed: 0, failed: 1, passRate: '0%' },
        results: []
      };
    }

    // Genel özet
    const allTests = [
      ...(results.tests.authentication?.results || []),
      ...(results.tests.publicPages?.results || []),
      ...(results.tests.playerPanel?.results || []),
      ...(results.tests.ownerPanel?.results || []),
      ...(results.tests.adminPanel?.results || []),
      ...(results.tests.formValidations?.results || [])
    ];

    results.summary = {
      total: allTests.length,
      passed: allTests.filter(t => t.success).length,
      failed: allTests.filter(t => !t.success).length,
      passRate: allTests.length > 0 
        ? `${((allTests.filter(t => t.success).length / allTests.length) * 100).toFixed(2)}%`
        : '0%'
    };

    results.endTime = Date.now();
    results.duration = ((results.endTime - results.startTime) / 1000).toFixed(2);

    return results;
  } catch (error) {
    results.endTime = Date.now();
    results.duration = ((results.endTime - results.startTime) / 1000).toFixed(2);
    
    return {
      ...results,
      error: error.message || 'Bilinmeyen hata',
      stack: error.stack,
      errorCategory: 'System'
    };
  }
};

/**
 * Test sonuçlarını konsola yazdır
 */
export const printTestResults = (results) => {
  console.group('🧪 Sistem Test Sonuçları');
  console.log('📅 Tarih:', results.timestamp);
  console.log('👤 Kullanıcı:', results.user);
  console.log('🔑 Kullanıcı Tipi:', results.userType);
  
  if (results.summary) {
    console.group('📊 Özet');
    console.log('Toplam Test:', results.summary.total);
    console.log('✅ Başarılı:', results.summary.passed);
    console.log('❌ Başarısız:', results.summary.failed);
    console.log('📈 Başarı Oranı:', results.summary.passRate);
    console.groupEnd();
  }

  Object.keys(results.tests).forEach(testGroup => {
    const group = results.tests[testGroup];
    if (group && group.summary) {
      console.group(`📋 ${testGroup}`);
      console.log('Başarılı:', group.summary.passed);
      console.log('Başarısız:', group.summary.failed);
      console.log('Oran:', group.summary.passRate);
      
      if (group.errors && group.errors.length > 0) {
        console.group('❌ Hatalar');
        group.errors.forEach(err => {
          console.error(`- ${err.test}: ${err.error}`);
        });
        console.groupEnd();
      }
      console.groupEnd();
    }
  });

  if (results.error) {
    console.error('🚨 Test Hatası:', results.error);
  }

  console.groupEnd();
};

/**
 * Test sonuçlarını JSON olarak indir
 */
export const downloadTestResults = (results) => {
  const json = JSON.stringify(results, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `test-results-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

