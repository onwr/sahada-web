   import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Search, 
  Clock, 
  User, 
  Calendar,
  Grid3x3,
  List,
  Loader2,
  BookOpen,
  Filter,
  ChevronDown
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { getBlogPosts, getBlogCategories } from '../services/firestoreService';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import toast from '../utils/toast';

const Blog = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filteredPosts, setFilteredPosts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const postsPerPage = 9;

  useEffect(() => {
    loadCategories();
    setupRealtimeListener();
  }, []);

  useEffect(() => {
    filterAndPaginatePosts();
  }, [posts, selectedCategory, searchQuery, currentPage]);

  const loadCategories = async () => {
    try {
      const result = await getBlogCategories();
      if (result.success) {
        setCategories(result.data);
      }
    } catch (err) {
      console.error('Kategoriler yükleme hatası:', err);
    }
  };

  const setupRealtimeListener = () => {
    try {
      const blogsRef = collection(db, 'blogPosts');
      const q = query(blogsRef, where('status', '==', 'published'));
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const allPosts = [];
        snapshot.forEach((doc) => {
          allPosts.push({ id: doc.id, ...doc.data() });
        });
        
        // Client-side sorting by date
        allPosts.sort((a, b) => {
          const dateA = a.publishedAt?.toDate ? a.publishedAt.toDate() : new Date(a.publishedAt);
          const dateB = b.publishedAt?.toDate ? b.publishedAt.toDate() : new Date(b.publishedAt);
          return dateB - dateA;
        });
        
        setPosts(allPosts);
        setLoading(false);
      }, (err) => {
        console.error('Real-time listener hatası:', err);
        setError('Blog yazıları güncellenirken hata oluştu');
        setLoading(false);
      });
      
      return () => unsubscribe();
    } catch (err) {
      console.error('Listener kurulum hatası:', err);
      setLoading(false);
    }
  };

  const filterAndPaginatePosts = () => {
    let filtered = [...posts];

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(post => post.category === selectedCategory);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(post => 
        post.title?.toLowerCase().includes(query) ||
        post.excerpt?.toLowerCase().includes(query) ||
        post.summary?.toLowerCase().includes(query) ||
        post.content?.toLowerCase().includes(query)
      );
    }

    // Pagination
    const startIndex = (currentPage - 1) * postsPerPage;
    const endIndex = startIndex + postsPerPage;
    const paginated = filtered.slice(startIndex, endIndex);

    setFilteredPosts(paginated);
  };

  const getCategoryColor = (categorySlug) => {
    const category = categories.find(cat => cat.slug === categorySlug);
    if (category?.color) return category.color;
    
    const defaultColors = {
      'saglik': 'bg-green-500',
      'antrenman': 'bg-blue-500',
      'ekipman': 'bg-orange-500',
      'haberler': 'bg-purple-500',
      'ipuclari': 'bg-pink-500'
    };
    return defaultColors[categorySlug] || 'bg-gray-500';
  };

  const getCategoryName = (categorySlug) => {
    const category = categories.find(cat => cat.slug === categorySlug);
    return category?.name || categorySlug;
  };

  const formatDate = (date) => {
    if (!date) return '';
    const d = date?.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const calculateReadTime = (content) => {
    if (!content) return '5 dk okuma';
    const wordsPerMinute = 200;
    const wordCount = content.split(/\s+/).length;
    const minutes = Math.ceil(wordCount / wordsPerMinute);
    return `${minutes} dk okuma`;
  };

  const getTotalPages = () => {
    let filtered = [...posts];
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(post => post.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(post => 
        post.title?.toLowerCase().includes(query) ||
        post.excerpt?.toLowerCase().includes(query) ||
        post.summary?.toLowerCase().includes(query) ||
        post.content?.toLowerCase().includes(query)
      );
    }
    return Math.ceil(filtered.length / postsPerPage);
  };

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    setCurrentPage(1);
  };

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const totalPages = getTotalPages();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 text-white py-12">
        <div className="container mx-auto max-w-screen-xl px-4">
          <h1 className="text-3xl font-black mb-2">Blog</h1>
          <p className="text-green-100">Spor dünyasından en güncel haberler, ipuçları ve rehberler</p>
        </div>
      </div>

      {/* Filters and Search Bar overlapping the hero */}
      <div className="container mx-auto max-w-screen-xl px-4 -mt-8 relative z-20">
          <div className="bg-white rounded-2xl shadow-lg p-4 mb-8">
              <div className="flex flex-col lg:flex-row gap-4">
                  {/* Search Bar */}
                  <div className="flex-1 relative flex items-center bg-white border border-gray-200 rounded-xl focus-within:ring-2 focus-within:ring-green-500/20 overflow-hidden">
                      <div className="flex-1 relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                          <input
                              type="text"
                              value={searchQuery}
                              onChange={handleSearch}
                              placeholder="Blog yazılarında ara..."
                              className="w-full pl-10 pr-4 py-3 focus:outline-none text-gray-900"
                          />
                      </div>
                  </div>

                  {/* Category Filter and View Toggle */}
                  <div className="flex gap-3 flex-wrap lg:flex-nowrap items-center">
                      {/* Categories Dropdown */}
                      <div className="relative">
                          <select
                              value={selectedCategory}
                              onChange={(e) => handleCategoryChange(e.target.value)}
                              className="appearance-none bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 pr-10 text-sm font-medium text-gray-700 focus:outline-none cursor-pointer"
                          >
                              <option value="all">Tüm Kategoriler</option>
                              {categories.map((category) => (
                                  <option key={category.id || category.slug} value={category.slug}>
                                      {category.name}
                                  </option>
                              ))}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                      </div>

                      {/* View Mode Toggle */}
                      <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                          <button
                              onClick={() => setViewMode('grid')}
                              className={`p-1.5 rounded-md transition-all ${
                                  viewMode === 'grid' ? 'bg-white shadow text-green-600' : 'text-gray-400 hover:text-gray-600'
                              }`}
                          >
                              <Grid3x3 size={18} />
                          </button>
                          <button
                              onClick={() => setViewMode('list')}
                              className={`p-1.5 rounded-md transition-all ${
                                  viewMode === 'list' ? 'bg-white shadow text-green-600' : 'text-gray-400 hover:text-gray-600'
                              }`}
                          >
                              <List size={18} />
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      </div>

      {/* Content */}
      <div className="container mx-auto max-w-screen-xl px-4 py-12">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-green-600" />
              <p className="text-gray-600">Blog yazıları yükleniyor...</p>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⚠️</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Hata</h3>
            <p className="text-gray-600 mb-4">{error}</p>
          </div>
        ) : filteredPosts.length > 0 ? (
          <>
            {/* Posts Grid/List */}
            <div className={viewMode === 'grid' 
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 mb-12'
              : 'space-y-6 mb-12'
            }>
              {filteredPosts.map((post, index) => (
                <motion.article
                  key={post.id}
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ y: -8, transition: { duration: 0.2 } }}
                  onClick={() => navigate(`/blog/${post.slug || post.id}`)}
                  className={`bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer border border-gray-100 ${
                    viewMode === 'list' ? 'flex flex-col sm:flex-row' : ''
                  }`}
                >
                  {/* Image */}
                  <div className={`relative overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 ${
                    viewMode === 'list' 
                      ? 'sm:w-64 sm:h-48 w-full h-48 flex-shrink-0' 
                      : 'h-56'
                  }`}>
                    {post.featuredImage || post.image ? (
                      <img
                        src={post.featuredImage || post.image}
                        alt={post.title}
                        className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen className={`${viewMode === 'list' ? 'w-16 h-16' : 'w-20 h-20'} text-gray-300`} />
                      </div>
                    )}
                    <div className="absolute top-4 left-4">
                      <span className={`${getCategoryColor(post.category)} text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg`}>
                        {getCategoryName(post.category)}
                      </span>
                    </div>
                    {post.featured && (
                      <div className="absolute top-4 right-4">
                        <span className="bg-yellow-500 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg">
                          ⭐ Öne Çıkan
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className={`p-6 ${viewMode === 'list' ? 'flex-1' : ''}`}>
                    <h3 className="font-bold text-xl text-gray-900 mb-3 leading-tight hover:text-green-600 transition-colors line-clamp-2">
                      {post.title}
                    </h3>

                    <p className="text-gray-600 text-sm leading-relaxed mb-4 line-clamp-3">
                      {post.excerpt || post.summary || 'Blog yazısı içeriği...'}
                    </p>

                    {/* Meta */}
                    <div className="flex items-center justify-between text-sm text-gray-500 pt-4 border-t border-gray-100">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
                          <User size={12} className="text-white" />
                        </div>
                        <span className="font-medium">{post.authorName || post.author || 'Sahada'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock size={14} />
                        <span>{post.readTime || calculateReadTime(post.content)}</span>
                      </div>
                    </div>
                    
                    {post.publishedAt && (
                      <div className="mt-2 text-xs text-gray-400 flex items-center gap-1">
                        <Calendar size={12} />
                        <span>{formatDate(post.publishedAt)}</span>
                      </div>
                    )}
                  </div>
                </motion.article>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Önceki
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      currentPage === page
                        ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg'
                        : 'bg-white border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Sonraki
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16">
            <BookOpen className="w-20 h-20 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              {searchQuery ? 'Arama sonucu bulunamadı' : 'Henüz blog yazısı yok'}
            </h3>
            <p className="text-gray-600">
              {searchQuery 
                ? 'Farklı bir arama terimi deneyin' 
                : 'Yakında yeni içerikler eklenecek!'}
            </p>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default Blog;

