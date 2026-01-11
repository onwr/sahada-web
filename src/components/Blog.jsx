import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Clock, User, Loader2, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getBlogPosts, getBlogCategories } from '../services/firestoreService';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';

const Blog = () => {
  const navigate = useNavigate();
  const [blogPosts, setBlogPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadCategories();
    loadPosts();
    setupRealtimeListener();
  }, [selectedCategory]);

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

  const loadPosts = async () => {
    setLoading(true);
    setError(null);
    try {
      const filters = {
        limit: 6,
        sortBy: 'date',
        sortOrder: 'desc'
      };
      
      if (selectedCategory !== 'all') {
        filters.category = selectedCategory;
      }
      
      const result = await getBlogPosts(filters);
      if (result.success) {
        setBlogPosts(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Blog yazıları yüklenirken hata oluştu');
      console.error('Blog yükleme hatası:', err);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeListener = () => {
    try {
      const blogsRef = collection(db, 'blogPosts');
      let q = query(blogsRef, where('status', '==', 'published'));
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const posts = [];
        snapshot.forEach((doc) => {
          posts.push({ id: doc.id, ...doc.data() });
        });
        
        // Client-side filtering
        let filtered = posts;
        if (selectedCategory !== 'all') {
          filtered = posts.filter(post => post.category === selectedCategory);
        }
        
        // Client-side sorting
        filtered.sort((a, b) => {
          const dateA = a.publishedAt?.toDate ? a.publishedAt.toDate() : new Date(a.publishedAt);
          const dateB = b.publishedAt?.toDate ? b.publishedAt.toDate() : new Date(b.publishedAt);
          return dateB - dateA;
        });
        
        setBlogPosts(filtered.slice(0, 6));
        setLoading(false);
      }, (err) => {
        console.error('Real-time listener hatası:', err);
        setError('Blog yazıları güncellenirken hata oluştu');
      });
      
      return () => unsubscribe();
    } catch (err) {
      console.error('Listener kurulum hatası:', err);
    }
  };

  const getCategoryColor = (categorySlug) => {
    const category = categories.find(cat => cat.slug === categorySlug);
    if (category?.color) return category.color;
    
    // Varsayılan renkler
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

  if (loading && blogPosts.length === 0) {
    return (
      <div className='py-12 lg:py-20 bg-gradient-to-br from-gray-50 to-gray-100'>
        <div className='container mx-auto max-w-screen-xl px-4'>
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-green-600" />
              <p className="text-gray-600">Blog yazıları yükleniyor...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='py-16 lg:py-24 bg-gradient-to-br from-gray-50 via-white to-gray-50'>
      <div className='container mx-auto max-w-screen-xl px-4'>
        {/* Header */}
        <div className='flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8'>
          <div className="mb-6 lg:mb-0">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-green-700 rounded-xl flex items-center justify-center shadow-lg">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <h2 className='text-3xl lg:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent'>
                Spor Dünyasından
              </h2>
            </div>
            <p className="text-gray-600 text-lg">En güncel haberler, ipuçları ve rehberler</p>
          </div>

          <button
            onClick={() => navigate('/blog')}
            className='flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 font-semibold transition-all duration-200 shadow-lg hover:shadow-xl group'
          >
            Tüm Yazılar
            <ArrowRight size={20} className='group-hover:translate-x-1 transition-transform duration-200' />
          </button>
        </div>

        {/* Category Filter */}
        {categories.length > 0 && (
          <div className='flex flex-wrap gap-3 mb-10'>
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                selectedCategory === 'all'
                  ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-50 shadow-sm'
              }`}
            >
              Tümü
            </button>
            {categories.map((category) => (
              <button
                key={category.id || category.slug}
                onClick={() => setSelectedCategory(category.slug)}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  selectedCategory === category.slug
                    ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg'
                    : 'bg-white text-gray-700 hover:bg-gray-50 shadow-sm'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⚠️</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Hata</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={loadPosts}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Tekrar Dene
            </button>
          </div>
        )}

        {/* Blog Grid */}
        {!error && (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8'>
            {blogPosts.length > 0 ? (
              blogPosts.map((post, index) => (
                <article
                  key={post.id}
                  onClick={() => navigate(`/blog/${post.slug || post.id}`)}
                  className='bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 group cursor-pointer border border-gray-100 hover:-translate-y-2'
                >
                  {/* Image */}
                  <div className='relative h-56 overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200'>
                    {post.featuredImage || post.image ? (
                      <img 
                        src={post.featuredImage || post.image} 
                        alt={post.title}
                        className='w-full h-full object-cover group-hover:scale-110 transition-transform duration-500'
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen className="w-16 h-16 text-gray-300" />
                      </div>
                    )}
                    <div className='absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300'></div>
                    <div className='absolute top-4 left-4'>
                      <span className={`${getCategoryColor(post.category)} text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg`}>
                        {getCategoryName(post.category)}
                      </span>
                    </div>
                    {post.featured && (
                      <div className='absolute top-4 right-4'>
                        <span className='bg-yellow-500 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg'>
                          ⭐ Öne Çıkan
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className='p-6'>
                    <h3 className='font-bold text-xl text-gray-900 mb-3 leading-tight group-hover:text-green-600 transition-colors duration-200 line-clamp-2'>
                      {post.title}
                    </h3>

                    <p className='text-gray-600 text-sm leading-relaxed mb-4 line-clamp-3'>
                      {post.excerpt || post.summary || 'Blog yazısı içeriği...'}
                    </p>

                    {/* Meta */}
                    <div className='flex items-center justify-between text-sm text-gray-500 pt-4 border-t border-gray-100'>
                      <div className='flex items-center gap-2'>
                        <div className="w-6 h-6 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
                          <User size={12} className="text-white" />
                        </div>
                        <span className="font-medium">{post.authorName || post.author || 'Sahada'}</span>
                      </div>
                      <div className='flex items-center gap-1'>
                        <Clock size={14} />
                        <span>{post.readTime || calculateReadTime(post.content)}</span>
                      </div>
                    </div>
                    
                    {post.publishedAt && (
                      <div className="mt-2 text-xs text-gray-400">
                        {formatDate(post.publishedAt)}
                      </div>
                    )}
                  </div>
                </article>
              ))
            ) : (
              <div className="col-span-full text-center py-16">
                <BookOpen className="w-20 h-20 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-900 mb-2">Henüz blog yazısı yok</h3>
                <p className="text-gray-600">Yakında yeni içerikler eklenecek!</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Blog;