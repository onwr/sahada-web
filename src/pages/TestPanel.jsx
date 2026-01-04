import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  runFullSystemTest, 
  testPlayerPanel, 
  testOwnerPanel, 
  testAdminPanel,
  testPublicPages,
  testFormValidations,
  printTestResults,
  downloadTestResults
} from '../utils/systemTest';
import { 
  Play, 
  Download, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Loader2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Filter,
  Search,
  RefreshCw,
  Settings,
  History,
  Share2,
  Eye,
  EyeOff,
  Info,
  Zap,
  Activity,
  Target,
  AlertTriangle,
  Timer,
  Database,
  Network,
  Shield,
  Code,
  Building2,
  Globe
} from 'lucide-react';
import toast from '../utils/toast';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
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
  ArcElement
} from 'chart.js';

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

const TestPanel = () => {
  const { user, userData } = useAuth();
  const [testResults, setTestResults] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedTest, setSelectedTest] = useState('full');
  const [progress, setProgress] = useState({ current: 0, total: 0, currentTest: '' });
  const [expandedGroups, setExpandedGroups] = useState({});
  const [expandedTests, setExpandedTests] = useState({});
  const [filterStatus, setFilterStatus] = useState('all'); // all, passed, failed
  const [searchQuery, setSearchQuery] = useState('');
  const [testHistory, setTestHistory] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    timeout: 10000,
    retryFailed: false,
    parallelExecution: false,
    saveHistory: true
  });
  const [errorDetails, setErrorDetails] = useState({});
  const [showErrorDetails, setShowErrorDetails] = useState({});

  // Test geçmişini yükle
  useEffect(() => {
    const savedHistory = localStorage.getItem('testHistory');
    if (savedHistory) {
      try {
        setTestHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Test geçmişi yüklenemedi:', e);
      }
    }
  }, []);

  // Test geçmişini kaydet
  const saveTestHistory = (results) => {
    if (!settings.saveHistory) return;
    
    const historyItem = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      testType: selectedTest,
      summary: results.summary,
      user: user?.uid || 'anonymous',
      userType: userData?.userType || 'unknown'
    };
    
    const updatedHistory = [historyItem, ...testHistory].slice(0, 50); // Son 50 test
    setTestHistory(updatedHistory);
    localStorage.setItem('testHistory', JSON.stringify(updatedHistory));
  };

  const runTest = async (testType) => {
    setIsRunning(true);
    setTestResults(null);
    setProgress({ current: 0, total: 0, currentTest: '' });
    setErrorDetails({});
    setShowErrorDetails({});

    try {
      let results;
      const startTime = Date.now();

      // Progress tracking için wrapper
      const trackProgress = async (testFunction, testName) => {
        setProgress(prev => ({ ...prev, currentTest: testName }));
        try {
          const result = await Promise.race([
            testFunction(),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Timeout')), settings.timeout)
            )
          ]);
          setProgress(prev => ({ ...prev, current: prev.current + 1 }));
          return result;
        } catch (error) {
          setProgress(prev => ({ ...prev, current: prev.current + 1 }));
          throw error;
        }
      };

      switch (testType) {
        case 'full':
          setProgress({ current: 0, total: 50, currentTest: 'Tam sistem testi başlatılıyor...' });
          results = await runFullSystemTest(user, userData?.userType);
          break;
        case 'player':
          if (!user) {
            toast.error('Oyuncu testleri için giriş yapmalısınız');
            setIsRunning(false);
            return;
          }
          setProgress({ current: 0, total: 13, currentTest: 'Oyuncu paneli testleri başlatılıyor...' });
          results = await testPlayerPanel(user.uid);
          break;
        case 'owner':
          if (!user) {
            toast.error('Saha sahibi testleri için giriş yapmalısınız');
            setIsRunning(false);
            return;
          }
          setProgress({ current: 0, total: 15, currentTest: 'Saha sahibi paneli testleri başlatılıyor...' });
          results = await testOwnerPanel(user.uid);
          break;
        case 'admin':
          setProgress({ current: 0, total: 9, currentTest: 'Admin paneli testleri başlatılıyor...' });
          results = await testAdminPanel();
          break;
        case 'public':
          setProgress({ current: 0, total: 2, currentTest: 'Public sayfalar testleri başlatılıyor...' });
          results = await testPublicPages();
          break;
        case 'validation':
          setProgress({ current: 0, total: 4, currentTest: 'Validasyon testleri başlatılıyor...' });
          results = await testFormValidations();
          break;
        default:
          results = await runFullSystemTest(user, userData?.userType);
      }

      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);

      if (results) {
        results.duration = `${duration}s`;
        results.startTime = new Date(startTime).toISOString();
        results.endTime = new Date(endTime).toISOString();
        
        // Hata detaylarını çıkar
        if (results.tests) {
          Object.keys(results.tests).forEach(groupName => {
            const group = results.tests[groupName];
            if (group?.errors) {
              group.errors.forEach(err => {
                errorDetails[err.test] = {
                  error: err.error,
                  category: categorizeError(err.error),
                  solution: getErrorSolution(err.error)
                };
              });
            }
          });
        }
        
        setTestResults(results);
        saveTestHistory(results);
        printTestResults(results);
        
        const passRate = results.summary?.passRate || '0%';
        toast.success(`Testler tamamlandı! Başarı oranı: ${passRate} (${duration}s)`);
      }
    } catch (error) {
      console.error('Test hatası:', error);
      const errorMessage = error.message || 'Bilinmeyen hata';
      toast.error(`Test hatası: ${errorMessage}`);
      
      setTestResults({
        error: errorMessage,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsRunning(false);
      setProgress({ current: 0, total: 0, currentTest: '' });
    }
  };

  const categorizeError = (errorMessage) => {
    if (!errorMessage) return 'Unknown';
    
    const lowerError = errorMessage.toLowerCase();
    if (lowerError.includes('index') || lowerError.includes('firestore')) return 'Firestore';
    if (lowerError.includes('network') || lowerError.includes('fetch')) return 'Network';
    if (lowerError.includes('timeout')) return 'Timeout';
    if (lowerError.includes('validation') || lowerError.includes('format')) return 'Validation';
    if (lowerError.includes('permission') || lowerError.includes('auth')) return 'Authentication';
    
    return 'Other';
  };

  const getErrorSolution = (errorMessage) => {
    if (!errorMessage) return 'Hata detayı bulunamadı';
    
    const lowerError = errorMessage.toLowerCase();
    if (lowerError.includes('index')) {
      return 'Firestore composite index oluşturulması gerekiyor. Hata mesajındaki linki kullanarak index oluşturun.';
    }
    if (lowerError.includes('network') || lowerError.includes('fetch')) {
      return 'Ağ bağlantısını kontrol edin ve tekrar deneyin.';
    }
    if (lowerError.includes('timeout')) {
      return `Timeout süresini artırın (şu an: ${settings.timeout}ms). Ayarlar panelinden değiştirebilirsiniz.`;
    }
    if (lowerError.includes('permission')) {
      return 'Firestore güvenlik kurallarını kontrol edin.';
    }
    
    return 'Hata detaylarını inceleyin ve gerekirse tekrar deneyin.';
  };

  const toggleGroup = (groupName) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  const toggleTest = (testId) => {
    setShowErrorDetails(prev => ({
      ...prev,
      [testId]: !prev[testId]
    }));
  };

  const retryFailedTests = async () => {
    if (!testResults) return;
    
    const failedTests = [];
    if (testResults.tests) {
      Object.keys(testResults.tests).forEach(groupName => {
        const group = testResults.tests[groupName];
        if (group?.results) {
          group.results.forEach(test => {
            if (!test.success) {
              failedTests.push({ group: groupName, test });
            }
          });
        }
      });
    }
    
    if (failedTests.length === 0) {
      toast.info('Yeniden denenebilecek başarısız test yok');
      return;
    }
    
    toast.info(`${failedTests.length} başarısız test yeniden deneniyor...`);
    // Retry logic buraya eklenecek
  };

  const getFilteredResults = () => {
    if (!testResults || !testResults.tests) return testResults;
    
    const filtered = { ...testResults, tests: {} };
    
    Object.keys(testResults.tests).forEach(groupName => {
      const group = testResults.tests[groupName];
      if (!group?.results) return;
      
      let filteredResults = group.results;
      
      // Status filtresi
      if (filterStatus === 'passed') {
        filteredResults = filteredResults.filter(t => t.success);
      } else if (filterStatus === 'failed') {
        filteredResults = filteredResults.filter(t => !t.success);
      }
      
      // Arama filtresi
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filteredResults = filteredResults.filter(t => 
          t.testName?.toLowerCase().includes(query)
        );
      }
      
      if (filteredResults.length > 0) {
        filtered.tests[groupName] = {
          ...group,
          results: filteredResults,
          summary: {
            total: filteredResults.length,
            passed: filteredResults.filter(t => t.success).length,
            failed: filteredResults.filter(t => !t.success).length,
            passRate: filteredResults.length > 0 
              ? `${((filteredResults.filter(t => t.success).length / filteredResults.length) * 100).toFixed(2)}%`
              : '0%'
          }
        };
      }
    });
    
    return filtered;
  };

  const getChartData = () => {
    if (!testResults || !testResults.tests) return null;
    
    const categories = [];
    const passed = [];
    const failed = [];
    
    Object.keys(testResults.tests).forEach(groupName => {
      const group = testResults.tests[groupName];
      if (group?.summary) {
        categories.push(groupName);
        passed.push(group.summary.passed);
        failed.push(group.summary.failed);
      }
    });
    
    return {
      categories,
      passed,
      failed
    };
  };

  const renderProgressBar = () => {
    if (!isRunning || progress.total === 0) return null;
    
    const percentage = (progress.current / progress.total) * 100;
    
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-green-600" />
            <span className="font-medium text-gray-900">Testler çalıştırılıyor...</span>
          </div>
          <span className="text-sm text-gray-600">
            {progress.current} / {progress.total}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
          <div 
            className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        </div>
        {progress.currentTest && (
          <p className="text-sm text-gray-600">{progress.currentTest}</p>
        )}
      </div>
    );
  };

  const renderTestCard = (test, index, groupName) => {
    const testId = `${groupName}-${index}`;
    const isExpanded = expandedTests[testId];
    const errorDetail = errorDetails[test.testName];
    const showError = showErrorDetails[testId];
    
    return (
      <div
        key={index}
        className={`border rounded-lg transition-all ${
          test.success
            ? 'bg-green-50 border-green-200'
            : 'bg-red-50 border-red-200'
        }`}
      >
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3 flex-1">
            {test.success ? (
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{test.testName}</p>
              {test.loadTime && (
                <div className="flex items-center gap-2 mt-1">
                  <Clock className="w-3 h-3 text-gray-500" />
                  <span className="text-xs text-gray-500">{test.loadTime}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {test.error && (
              <button
                onClick={() => toggleTest(testId)}
                className="p-1 hover:bg-red-100 rounded transition-colors"
                title="Hata detaylarını göster"
              >
                {showError ? (
                  <EyeOff className="w-4 h-4 text-red-600" />
                ) : (
                  <Eye className="w-4 h-4 text-red-600" />
                )}
              </button>
            )}
            {!test.success && errorDetail && (
              <div className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-red-100 text-red-700">
                <AlertTriangle className="w-3 h-3" />
                {errorDetail.category}
              </div>
            )}
          </div>
        </div>
        
        {showError && test.error && (
          <div className="px-4 pb-4 border-t border-red-200">
            <div className="mt-3 space-y-2">
              <div className="bg-red-100 rounded p-3">
                <p className="text-sm font-medium text-red-900 mb-1">Hata Mesajı:</p>
                <p className="text-sm text-red-800 break-words">{test.error}</p>
              </div>
              {errorDetail && (
                <>
                  <div className="bg-blue-50 rounded p-3">
                    <p className="text-sm font-medium text-blue-900 mb-1">Çözüm Önerisi:</p>
                    <p className="text-sm text-blue-800">{errorDetail.solution}</p>
                  </div>
                  {test.stack && (
                    <details className="bg-gray-50 rounded p-3">
                      <summary className="text-sm font-medium text-gray-700 cursor-pointer">
                        Stack Trace
                      </summary>
                      <pre className="text-xs text-gray-600 mt-2 overflow-auto">
                        {test.stack}
                      </pre>
                    </details>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderTestResults = (results) => {
    if (!results) return null;
    
    const filteredResults = getFilteredResults();
    const chartData = getChartData();

    if (results.error) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-6 h-6 text-red-600" />
            <h3 className="text-lg font-bold text-red-900">Test Hatası</h3>
          </div>
          <p className="text-red-800 mb-2">{results.error}</p>
          {results.stack && (
            <details className="mt-4">
              <summary className="text-sm font-medium text-red-700 cursor-pointer">
                Stack Trace
              </summary>
              <pre className="text-xs text-red-600 mt-2 overflow-auto bg-red-100 p-3 rounded">
                {results.stack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    if (results.summary) {
      return (
        <div className="space-y-6">
          {/* Özet Kartları */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <Target className="w-8 h-8 opacity-80" />
                {results.summary.passRate && (
                  <span className="text-2xl font-bold">{results.summary.passRate}</span>
                )}
              </div>
              <p className="text-blue-100 text-sm">Başarı Oranı</p>
              <p className="text-3xl font-bold mt-2">{results.summary.total}</p>
              <p className="text-blue-100 text-sm">Toplam Test</p>
            </div>
            
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="w-8 h-8 opacity-80" />
                <span className="text-2xl font-bold">{results.summary.passed}</span>
              </div>
              <p className="text-green-100 text-sm">Başarılı Testler</p>
            </div>
            
            <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <XCircle className="w-8 h-8 opacity-80" />
                <span className="text-2xl font-bold">{results.summary.failed}</span>
              </div>
              <p className="text-red-100 text-sm">Başarısız Testler</p>
            </div>
            
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <Timer className="w-8 h-8 opacity-80" />
                {results.duration && (
                  <span className="text-2xl font-bold">{results.duration}</span>
                )}
              </div>
              <p className="text-purple-100 text-sm">Toplam Süre</p>
            </div>
          </div>

          {/* Grafikler */}
          {chartData && chartData.categories.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Kategori Bazlı Sonuçlar</h3>
                <Bar
                  data={{
                    labels: chartData.categories,
                    datasets: [
                      {
                        label: 'Başarılı',
                        data: chartData.passed,
                        backgroundColor: 'rgba(34, 197, 94, 0.8)',
                      },
                      {
                        label: 'Başarısız',
                        data: chartData.failed,
                        backgroundColor: 'rgba(239, 68, 68, 0.8)',
                      }
                    ]
                  }}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: {
                        position: 'top',
                      },
                      title: {
                        display: false,
                      }
                    }
                  }}
                />
              </div>
              
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Başarı Dağılımı</h3>
                <Doughnut
                  data={{
                    labels: ['Başarılı', 'Başarısız'],
                    datasets: [{
                      data: [results.summary.passed, results.summary.failed],
                      backgroundColor: [
                        'rgba(34, 197, 94, 0.8)',
                        'rgba(239, 68, 68, 0.8)'
                      ],
                    }]
                  }}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: {
                        position: 'bottom',
                      }
                    }
                  }}
                />
              </div>
            </div>
          )}

          {/* Filtreler ve Arama */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Test ara..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">Tümü</option>
                  <option value="passed">Başarılı</option>
                  <option value="failed">Başarısız</option>
                </select>
                {results.summary.failed > 0 && (
                  <button
                    onClick={retryFailedTests}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Başarısızları Yeniden Dene
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Test Grupları */}
          {filteredResults.tests && Object.keys(filteredResults.tests).map(groupName => {
            const group = filteredResults.tests[groupName];
            if (!group || !group.results || group.results.length === 0) return null;
            
            const isExpanded = expandedGroups[groupName] !== false;

            return (
              <div key={groupName} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <button
                  onClick={() => toggleGroup(groupName)}
                  className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${
                      group.summary.failed > 0 ? 'bg-red-100' : 'bg-green-100'
                    }`}>
                      {group.summary.failed > 0 ? (
                        <XCircle className="w-5 h-5 text-red-600" />
                      ) : (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      )}
                    </div>
                    <div className="text-left">
                      <h3 className="text-lg font-bold text-gray-900 capitalize">{groupName}</h3>
                      <p className="text-sm text-gray-600">
                        {group.results.length} test • {group.summary.passed} başarılı • {group.summary.failed} başarısız
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {group.summary && (
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-green-600 font-medium">✅ {group.summary.passed}</span>
                        <span className="text-red-600 font-medium">❌ {group.summary.failed}</span>
                        <span className="text-blue-600 font-medium">{group.summary.passRate}</span>
                      </div>
                    )}
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </button>
                
                {isExpanded && (
                  <div className="px-6 pb-6 space-y-3">
                    {group.results.map((test, index) => renderTestCard(test, index, groupName))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    // Tek test grubu sonuçları
    if (results.results) {
      return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Test Sonuçları</h3>
            {results.summary && (
              <div className="flex items-center gap-4 text-sm">
                <span className="text-green-600">✅ {results.summary.passed}</span>
                <span className="text-red-600">❌ {results.summary.failed}</span>
                <span className="text-blue-600">{results.summary.passRate}</span>
              </div>
            )}
          </div>
          <div className="space-y-3">
            {results.results.map((test, index) => renderTestCard(test, index, 'single'))}
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Activity className="w-6 h-6 text-blue-600" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900">Sistem Test Paneli</h1>
              </div>
              <p className="text-gray-600">
                Tüm sistem özelliklerini test edin, sonuçları görüntüleyin ve analiz edin
              </p>
            </div>
            <div className="flex items-center gap-2">
              {testResults && (
                <>
                  <button
                    onClick={() => downloadTestResults(testResults)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Sonuçları İndir</span>
                  </button>
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    title="Ayarlar"
                  >
                    <Settings className="w-5 h-5 text-gray-600" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Ayarlar Paneli */}
        {showSettings && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Test Ayarları</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Timeout (ms)
                </label>
                <input
                  type="number"
                  value={settings.timeout}
                  onChange={(e) => setSettings({ ...settings, timeout: parseInt(e.target.value) || 10000 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="retryFailed"
                  checked={settings.retryFailed}
                  onChange={(e) => setSettings({ ...settings, retryFailed: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="retryFailed" className="ml-2 text-sm text-gray-700">
                  Başarısız testleri otomatik yeniden dene
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="saveHistory"
                  checked={settings.saveHistory}
                  onChange={(e) => setSettings({ ...settings, saveHistory: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="saveHistory" className="ml-2 text-sm text-gray-700">
                  Test geçmişini kaydet
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Test Seçimi */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Test Seçimi</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { id: 'full', label: 'Tam Test', icon: Zap, color: 'purple' },
              { id: 'player', label: 'Oyuncu Paneli', icon: Target, color: 'blue' },
              { id: 'owner', label: 'Saha Sahibi', icon: Building2, color: 'green' },
              { id: 'admin', label: 'Admin Paneli', icon: Shield, color: 'red' },
              { id: 'public', label: 'Public Sayfalar', icon: Globe, color: 'orange' },
              { id: 'validation', label: 'Validasyonlar', icon: CheckCircle, color: 'indigo' }
            ].map(({ id, label, icon: Icon, color }) => (
              <button
                key={id}
                onClick={() => {
                  setSelectedTest(id);
                  runTest(id);
                }}
                disabled={isRunning}
                className={`p-4 rounded-xl border-2 transition-all transform hover:scale-105 ${
                  selectedTest === id
                    ? `border-${color}-600 bg-${color}-50 shadow-md`
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                } ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Icon className={`w-6 h-6 mx-auto mb-2 ${
                  selectedTest === id ? `text-${color}-600` : 'text-gray-700'
                }`} />
                <p className={`text-sm font-medium ${
                  selectedTest === id ? `text-${color}-700` : 'text-gray-700'
                }`}>{label}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Progress Bar */}
        {renderProgressBar()}

        {/* Test Sonuçları */}
        {testResults && !isRunning && (
          <div className="space-y-6">
            {renderTestResults(testResults)}
          </div>
        )}

        {/* Kullanıcı Bilgisi */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mt-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Kullanıcı Bilgisi</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Kullanıcı ID</p>
              <p className="font-medium text-gray-900 break-all">{user?.uid || 'Giriş yapılmamış'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Kullanıcı Tipi</p>
              <p className="font-medium text-gray-900">{userData?.userType || 'Bilinmiyor'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Email</p>
              <p className="font-medium text-gray-900">{user?.email || 'Bilinmiyor'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestPanel;
