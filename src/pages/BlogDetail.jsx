import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Clock, 
  User, 
  Share2, 
  Facebook, 
  Twitter, 
  Linkedin,
  Calendar,
  Eye,
  Loader2,
  BookOpen
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { getBlogPostBySlug, getBlogPost, getBlogPosts } from '../services/firestoreService';
import toast from '../utils/toast';

const BlogDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [relatedPosts, setRelatedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (slug) {
      loadPost();
    }
  }, [slug]);

  const loadPost = async () => {
    setLoading(true);
    setError(null);
    try {
      // Önce slug ile aramayı dene
      let result = await getBlogPostBySlug(slug);
      
      // Eğer slug ile bulunamazsa, ID ile aramayı dene (Eski linkler için)
      if (!result.success) {
        result = await getBlogPost(slug);
      }
      
      if (result.success) {
        setPost(result.data);
        loadRelatedPosts(result.data.category, result.data.id);
      } else {
        setError('Blog yazısı bulunamadı');
        toast.error('Blog yazısı bulunamadı');
      }
    } catch (err) {
      setError('Blog yazısı yüklenirken hata oluştu');
      toast.error('Blog yazısı yüklenirken hata oluştu');
      console.error('Blog yükleme hatası:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadRelatedPosts = async (category, currentPostId) => {
    try {
      const result = await getBlogPosts({
        category: category,
        limit: 3,
        sortBy: 'date',
        sortOrder: 'desc'
      });
      if (result.success) {
        // Mevcut yazıyı hariç tut
        const filtered = result.data.filter(p => p.id !== currentPostId).slice(0, 3);
        setRelatedPosts(filtered);
      }
    } catch (err) {
      console.error('İlgili yazılar yükleme hatası:', err);
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    const d = date?.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('tr-TR', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  };

  const calculateReadTime = (content) => {
    if (!content) return '5 dk okuma';
    const wordsPerMinute = 200;
    const wordCount = content.split(/\s+/).length;
    const minutes = Math.ceil(wordCount / wordsPerMinute);
    return `${minutes} dk okuma`;
  };

  const getCategoryColor = (categorySlug) => {
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
    const categoryNames = {
      'saglik': 'Sağlık',
      'antrenman': 'Antrenman',
      'ekipman': 'Ekipman',
      'haberler': 'Haberler',
      'ipuclari': 'İpuçları'
    };
    return categoryNames[categorySlug] || categorySlug;
  };

  const shareUrl = window.location.href;
  const shareTitle = post?.title || '';

  const handleShare = (platform) => {
    const url = encodeURIComponent(shareUrl);
    const title = encodeURIComponent(shareTitle);
    
    let shareLink = '';
    switch (platform) {
      case 'facebook':
        shareLink = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
        break;
      case 'twitter':
        shareLink = `https://twitter.com/intent/tweet?url=${url}&text=${title}`;
        break;
      case 'linkedin':
        shareLink = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
        break;
      default:
        return;
    }
    
    window.open(shareLink, '_blank', 'width=600,height=400');
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success('Link kopyalandı!');
  };

  if (loading) {
    return (
      <div>
        <Header />
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-green-600" />
            <p className="text-gray-600">Blog yazısı yükleniyor...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div>
        <Header />
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <BookOpen className="w-20 h-20 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Blog yazısı bulunamadı</h2>
            <p className="text-gray-600 mb-6">{error || 'Aradığınız yazı mevcut değil.'}</p>
            <button
              onClick={() => navigate('/blog')}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Blog'a Dön
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto max-w-4xl px-4 py-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <button
              onClick={() => navigate('/')}
              className="hover:text-green-600 transition-colors"
            >
              Ana Sayfa
            </button>
            <span>/</span>
            <button
              onClick={() => navigate('/blog')}
              className="hover:text-green-600 transition-colors"
            >
              Blog
            </button>
            <span>/</span>
            <span className="text-gray-900 font-medium truncate max-w-xs">{post.title}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <article className="container mx-auto max-w-4xl px-4 py-12">
        {/* Back Button */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate('/blog')}
          className="flex items-center gap-2 text-gray-600 hover:text-green-600 transition-colors mb-8 group"
        >
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">Blog'a Dön</span>
        </motion.button>

        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-4">
            <span className={`${getCategoryColor(post.category)} text-white text-sm font-semibold px-4 py-2 rounded-full`}>
              {getCategoryName(post.category)}
            </span>
            {post.featured && (
              <span className="bg-yellow-500 text-white text-sm font-semibold px-4 py-2 rounded-full">
                ⭐ Öne Çıkan
              </span>
            )}
          </div>
          
          <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight">
            {post.title}
          </h1>

          {/* Meta Info */}
          <div className="flex flex-wrap items-center gap-6 text-gray-600 mb-6 pb-6 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
                <User size={18} className="text-white" />
              </div>
              <div>
                <div className="font-medium text-gray-900">{post.authorName || post.author || 'Sahada'}</div>
                <div className="text-sm text-gray-500">Yazar</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Calendar size={18} />
              <span>{formatDate(post.publishedAt)}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Clock size={18} />
              <span>{post.readTime || calculateReadTime(post.content)}</span>
            </div>
            
            {post.views && (
              <div className="flex items-center gap-2">
                <Eye size={18} />
                <span>{post.views.toLocaleString('tr-TR')} görüntülenme</span>
              </div>
            )}
          </div>
        </motion.header>

        {/* Featured Image */}
        {(post.featuredImage || post.image) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-12 rounded-2xl overflow-hidden shadow-2xl"
          >
            <img
              src={post.featuredImage || post.image}
              alt={post.title}
              className="w-full h-auto max-h-[600px] object-cover"
            />
          </motion.div>
        )}

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="prose prose-lg max-w-none mb-12"
        >
          {post.content ? (
            <div 
              className="text-gray-700 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />
          ) : (
            <div className="text-gray-700 leading-relaxed whitespace-pre-line">
              {post.excerpt || post.summary || 'İçerik yükleniyor...'}
            </div>
          )}
        </motion.div>

        {/* Share Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl p-6 shadow-lg mb-12 border border-gray-200"
        >
          <div className="flex items-center gap-4 mb-4">
            <Share2 size={20} className="text-gray-600" />
            <h3 className="font-bold text-gray-900">Paylaş</h3>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => handleShare('facebook')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Facebook size={18} />
              <span>Facebook</span>
            </button>
            <button
              onClick={() => handleShare('twitter')}
              className="flex items-center gap-2 px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors"
            >
              <Twitter size={18} />
              <span>Twitter</span>
            </button>
            <button
              onClick={() => handleShare('linkedin')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors"
            >
              <Linkedin size={18} />
              <span>LinkedIn</span>
            </button>
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <Share2 size={18} />
              <span>Linki Kopyala</span>
            </button>
          </div>
        </motion.div>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-16"
          >
            <h2 className="text-3xl font-bold text-gray-900 mb-8">İlgili Yazılar</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedPosts.map((relatedPost, index) => (
                <motion.article
                  key={relatedPost.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + (index * 0.1) }}
                  onClick={() => navigate(`/blog/${relatedPost.slug || relatedPost.id}`)}
                  className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group border border-gray-100"
                >
                  <div className="relative h-40 overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
                    {relatedPost.featuredImage || relatedPost.image ? (
                      <img
                        src={relatedPost.featuredImage || relatedPost.image}
                        alt={relatedPost.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen className="w-12 h-12 text-gray-300" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-2 group-hover:text-green-600 transition-colors">
                      {relatedPost.title}
                    </h3>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                      {relatedPost.excerpt || relatedPost.summary}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Clock size={12} />
                      <span>{relatedPost.readTime || calculateReadTime(relatedPost.content)}</span>
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>
          </motion.section>
        )}
      </article>

      <Footer />
    </div>
  );
};

export default BlogDetail;

