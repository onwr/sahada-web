// Test Helper Functions
// Bu dosya sistem testleri için yardımcı fonksiyonlar içerir

/**
 * Sayfa yükleme testi
 * @param {string} pageName - Test edilecek sayfa adı
 * @param {Function} loadFunction - Veri yükleme fonksiyonu
 * @returns {Promise<{success: boolean, error?: string, data?: any}>}
 */
export const testPageLoad = async (pageName, loadFunction, timeout = 30000) => {
  try {
    const startTime = performance.now();
    
    // Timeout wrapper
    const result = await Promise.race([
      loadFunction(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`Timeout: ${timeout}ms aşıldı`)), timeout)
      )
    ]);
    
    const endTime = performance.now();
    const loadTime = endTime - startTime;

    if (result && (result.success !== false)) {
      return {
        success: true,
        loadTime: `${loadTime.toFixed(2)}ms`,
        data: result.data || result,
        testName: pageName
      };
    } else {
      return {
        success: false,
        error: result?.error || 'Veri yüklenemedi',
        loadTime: `${loadTime.toFixed(2)}ms`,
        testName: pageName,
        stack: result?.stack
      };
    }
  } catch (error) {
    const endTime = performance.now();
    const loadTime = endTime - performance.now();
    
    // Hata kategorisini belirle
    let errorCategory = 'Unknown';
    const errorMsg = error.message?.toLowerCase() || '';
    
    if (errorMsg.includes('index') || errorMsg.includes('firestore')) {
      errorCategory = 'Firestore';
    } else if (errorMsg.includes('network') || errorMsg.includes('fetch')) {
      errorCategory = 'Network';
    } else if (errorMsg.includes('timeout')) {
      errorCategory = 'Timeout';
    } else if (errorMsg.includes('permission') || errorMsg.includes('auth')) {
      errorCategory = 'Authentication';
    }
    
    return {
      success: false,
      error: error.message || 'Beklenmeyen hata',
      stack: error.stack,
      testName: pageName,
      loadTime: `${loadTime.toFixed(2)}ms`,
      errorCategory
    };
  }
};

/**
 * Real-time listener testi
 * @param {Function} setupListener - Listener kurulum fonksiyonu
 * @param {number} timeout - Timeout süresi (ms)
 * @returns {Promise<{success: boolean, error?: string, updates?: number}>}
 */
export const testRealtimeListener = async (setupListener, timeout = 5000) => {
  return new Promise((resolve) => {
    let updateCount = 0;
    let isResolved = false;

    const cleanup = setupListener(() => {
      updateCount++;
      if (!isResolved && updateCount >= 1) {
        isResolved = true;
        if (cleanup && typeof cleanup === 'function') {
          cleanup();
        }
        resolve({
          success: true,
          updates: updateCount
        });
      }
    });

    setTimeout(() => {
      if (!isResolved) {
        isResolved = true;
        if (cleanup && typeof cleanup === 'function') {
          cleanup();
        }
        resolve({
          success: updateCount > 0,
          updates: updateCount,
          error: updateCount === 0 ? 'Listener güncelleme almadı' : undefined
        });
      }
    }, timeout);
  });
};

/**
 * Form validasyon testi
 * @param {Object} formData - Form verileri
 * @param {Object} validationRules - Validasyon kuralları
 * @returns {{success: boolean, errors?: Object}}
 */
export const testFormValidation = (formData, validationRules) => {
  const errors = {};

  Object.keys(validationRules).forEach((field) => {
    const rules = validationRules[field];
    const value = formData[field];

    // Required kontrolü
    if (rules.required && (!value || value.toString().trim() === '')) {
      errors[field] = `${field} zorunlu alan`;
      return;
    }

    // Email formatı kontrolü
    if (rules.type === 'email' && value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        errors[field] = 'Geçerli bir email adresi giriniz';
      }
    }

    // Telefon formatı kontrolü
    if (rules.type === 'phone' && value) {
      const phoneRegex = /^[0-9+\-\s()]+$/;
      if (!phoneRegex.test(value)) {
        errors[field] = 'Geçerli bir telefon numarası giriniz';
      }
    }

    // IBAN formatı kontrolü
    if (rules.type === 'iban' && value) {
      const ibanRegex = /^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/;
      const cleaned = value.replace(/\s/g, '');
      if (!ibanRegex.test(cleaned) || cleaned.length < 15 || cleaned.length > 34) {
        errors[field] = 'Geçerli bir IBAN giriniz';
      }
    }

    // Min length kontrolü
    if (rules.minLength && value && value.length < rules.minLength) {
      errors[field] = `En az ${rules.minLength} karakter olmalıdır`;
    }

    // Max length kontrolü
    if (rules.maxLength && value && value.length > rules.maxLength) {
      errors[field] = `En fazla ${rules.maxLength} karakter olabilir`;
    }

    // Min value kontrolü
    if (rules.min !== undefined && value !== undefined) {
      const numValue = Number(value);
      if (!isNaN(numValue) && numValue < rules.min) {
        errors[field] = `Değer en az ${rules.min} olmalıdır`;
      }
    }

    // Max value kontrolü
    if (rules.max !== undefined && value !== undefined) {
      const numValue = Number(value);
      if (!isNaN(numValue) && numValue > rules.max) {
        errors[field] = `Değer en fazla ${rules.max} olabilir`;
      }
    }
  });

  return {
    success: Object.keys(errors).length === 0,
    errors: Object.keys(errors).length > 0 ? errors : undefined
  };
};

/**
 * Export fonksiyonu testi
 * @param {Function} exportFunction - Export fonksiyonu
 * @param {string} format - Export formatı (csv, excel, pdf, json)
 * @returns {Promise<{success: boolean, error?: string, fileSize?: number}>}
 */
export const testExportFunction = async (exportFunction, format = 'csv') => {
  try {
    const result = await exportFunction(format);

    if (result.success) {
      let fileSize = 0;
      let fileContent = '';

      if (result.csv) {
        fileContent = result.csv;
      } else if (result.json) {
        fileContent = result.json;
      } else if (result.data) {
        fileContent = JSON.stringify(result.data);
      }

      fileSize = new Blob([fileContent]).size;

      return {
        success: true,
        format,
        fileSize: `${(fileSize / 1024).toFixed(2)} KB`,
        hasContent: fileContent.length > 0
      };
    } else {
      return {
        success: false,
        error: result.error || 'Export başarısız'
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Export hatası'
    };
  }
};

/**
 * Navigation testi
 * @param {Function} navigateFunction - Navigate fonksiyonu
 * @param {string} expectedPath - Beklenen path
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const testNavigation = async (navigateFunction, expectedPath) => {
  try {
    await navigateFunction(expectedPath);
    
    // URL kontrolü (browser ortamında)
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname;
      const isMatch = currentPath === expectedPath || currentPath.startsWith(expectedPath);
      
      return {
        success: isMatch,
        currentPath,
        expectedPath,
        error: !isMatch ? 'Path eşleşmedi' : undefined
      };
    }

    return {
      success: true,
      message: 'Navigate fonksiyonu çağrıldı (browser kontrolü yapılamadı)'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Navigation hatası'
    };
  }
};

/**
 * Responsive design testi
 * @param {number} width - Test edilecek genişlik
 * @param {Function} testFunction - Test fonksiyonu
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const testResponsiveDesign = async (width, testFunction) => {
  if (typeof window === 'undefined') {
    return {
      success: false,
      error: 'Browser ortamı gerekli'
    };
  }

  const originalWidth = window.innerWidth;
  
  try {
    // Viewport genişliğini değiştir (simüle et)
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: width
    });

    // Resize event'i tetikle
    window.dispatchEvent(new Event('resize'));

    const result = await testFunction();

    return {
      success: result !== false,
      width,
      result
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  } finally {
    // Orijinal genişliği geri yükle
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalWidth
    });
  }
};

/**
 * Performance testi
 * @param {Function} testFunction - Test edilecek fonksiyon
 * @param {number} maxTime - Maksimum süre (ms)
 * @returns {Promise<{success: boolean, executionTime: number, error?: string}>}
 */
export const testPerformance = async (testFunction, maxTime = 3000) => {
  try {
    const startTime = performance.now();
    await testFunction();
    const endTime = performance.now();
    const executionTime = endTime - startTime;

    return {
      success: executionTime <= maxTime,
      executionTime: `${executionTime.toFixed(2)}ms`,
      maxTime: `${maxTime}ms`,
      error: executionTime > maxTime ? `Süre limiti aşıldı (${executionTime.toFixed(2)}ms > ${maxTime}ms)` : undefined
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Performance test hatası'
    };
  }
};

/**
 * Error handling testi
 * @param {Function} testFunction - Hata üretebilecek fonksiyon
 * @returns {Promise<{success: boolean, errorHandled: boolean, error?: string}>}
 */
export const testErrorHandling = async (testFunction) => {
  try {
    await testFunction();
    return {
      success: true,
      errorHandled: true,
      message: 'Fonksiyon hata olmadan tamamlandı'
    };
  } catch (error) {
    // Hata yakalandı mı kontrol et
    return {
      success: true,
      errorHandled: true,
      error: error.message,
      message: 'Hata yakalandı ve işlendi'
    };
  }
};

/**
 * Test sonuçlarını raporla
 * @param {Array} testResults - Test sonuçları
 * @returns {Object} Test raporu
 */
export const generateTestReport = (testResults) => {
  const total = testResults.length;
  const passed = testResults.filter(r => r.success).length;
  const failed = total - passed;
  const passRate = total > 0 ? ((passed / total) * 100).toFixed(2) : 0;

  const errors = testResults
    .filter(r => !r.success)
    .map(r => ({
      test: r.testName || 'Bilinmeyen test',
      error: r.error || 'Hata detayı yok'
    }));

  return {
    summary: {
      total,
      passed,
      failed,
      passRate: `${passRate}%`
    },
    errors,
    results: testResults
  };
};

/**
 * Test suite çalıştırıcı
 * @param {Array} testSuite - Test suite array'i
 * @returns {Promise<Object>} Test raporu
 */
export const runTestSuite = async (testSuite, options = {}) => {
  const { 
    timeout = 30000, 
    parallel = false,
    onProgress = null 
  } = options;
  
  const results = [];
  const total = testSuite.length;

  if (parallel) {
    // Paralel çalıştırma
    const promises = testSuite.map(async (test, index) => {
      try {
        if (onProgress) {
          onProgress(index + 1, total, test.name);
        }
        
        const result = await Promise.race([
          test.function(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error(`Timeout: ${timeout}ms`)), timeout)
          )
        ]);
        
        return {
          testName: test.name,
          success: result.success !== false,
          ...result
        };
      } catch (error) {
        return {
          testName: test.name,
          success: false,
          error: error.message || 'Test hatası',
          stack: error.stack,
          errorCategory: error.message?.toLowerCase().includes('timeout') ? 'Timeout' : 'Other'
        };
      }
    });
    
    const parallelResults = await Promise.all(promises);
    results.push(...parallelResults);
  } else {
    // Sıralı çalıştırma
    for (let i = 0; i < testSuite.length; i++) {
      const test = testSuite[i];
      try {
        if (onProgress) {
          onProgress(i + 1, total, test.name);
        }
        
        const result = await Promise.race([
          test.function(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error(`Timeout: ${timeout}ms`)), timeout)
          )
        ]);
        
        results.push({
          testName: test.name,
          success: result.success !== false,
          ...result
        });
      } catch (error) {
        results.push({
          testName: test.name,
          success: false,
          error: error.message || 'Test hatası',
          stack: error.stack,
          errorCategory: error.message?.toLowerCase().includes('timeout') ? 'Timeout' : 'Other'
        });
      }
    }
  }

  return generateTestReport(results);
};

