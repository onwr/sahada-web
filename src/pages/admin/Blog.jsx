import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import AdminSidebar from '../../components/AdminSidebar';
import {
  getBlogPosts,
  getBlogCategories,
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
  createBlogCategory,
  updateBlogCategory,
  deleteBlogCategory,
  getBlogPostById,
  logAdminAction
} from '../../services/firestoreService';
import {
  BookOpen,
  Search,
  Filter,
  Download,
  Plus,
  Edit,
  Trash2,
  Eye,
  X,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Loader2,
  Save,
  User,
  CheckCircle,
  XCircle,
  Calendar,
  Activity,
  Heart,
  Zap,
  Star,
  Award,
  TrendingUp,
  Info
} from 'lucide-react';
import { exportToCSV, exportToExcel, exportToPDF } from '../../utils/exportUtils';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import toast from '../../utils/toast';
import { useNavigate } from 'react-router-dom';
import JoditEditor from 'jodit-react';
import { uploadImage } from '../../services/cdnService';
import { Upload, X as XIcon } from 'lucide-react';

const Blog = () => {
  const { user, userData } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState(null);

  // Filtreleme ve arama
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState('createdAt');
  const [sortDirection, setSortDirection] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    content: '',
    excerpt: '',
    category: 'haberler',
    featuredImage: '',
    author: userData?.fullName || 'Admin',
    authorName: userData?.fullName || 'Admin',
    status: 'draft',
    featured: false,
    metaTitle: '',
    metaDescription: '',
    publishDate: ''
  });
  
  // Category Modal State
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    slug: '',
    color: 'bg-gray-500',
    icon: 'BookOpen'
  });
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageUploadMethod, setImageUploadMethod] = useState('url'); // 'url' or 'file'
  const editorRef = useRef(null);
  const fileInputRef = useRef(null);

  // Jodit Editor Image Upload Handler - useCallback ile memoize edildi
  const handleEditorImageUpload = useCallback(async (editor) => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      setUploadingImage(true);
      try {
        const result = await uploadImage(file, 'general', user?.uid || 'admin');
        if (result.success && result.data?.url) {
          // Resmi editor'a ekle
          const image = editor.selection.j.createInside.element('img');
          image.setAttribute('src', result.data.url);
          image.setAttribute('alt', file.name);
          editor.selection.insertNode(image);
          toast.success('Resim başarıyla eklendi');
        } else {
          toast.error(result.error || 'Resim yüklenemedi');
        }
      } catch (error) {
        console.error('Resim yükleme hatası:', error);
        toast.error('Resim yüklenirken bir hata oluştu');
      } finally {
        setUploadingImage(false);
      }
    };
  }, [user?.uid]);

  // Jodit Editor Configuration - useMemo ile memoize edildi
  const editorConfig = useMemo(() => ({
    readonly: false,
    height: 500,
    language: 'tr',
    placeholder: 'Blog yazısı içeriğini buraya yazın...',
    toolbar: true,
    toolbarButtonSize: 'medium',
    toolbarAdaptive: true,
    showCharsCounter: true,
    showWordsCounter: true,
    showXPathInStatusbar: false,
    askBeforePasteHTML: true,
    askBeforePasteFromWord: true,
    defaultActionOnPaste: 'insert_as_html',
    buttons: [
      'source', '|',
      'bold', 'italic', 'underline', 'strikethrough', '|',
      'superscript', 'subscript', '|',
      'align', '|',
      'ul', 'ol', '|',
      'outdent', 'indent', '|',
      'font', 'fontsize', 'brush', 'paragraph', '|',
      'uploadImage', 'image', 'video', 'table', 'link', '|',
      'undo', 'redo', '|',
      'hr', 'eraser', 'copyformat', '|',
      'fullsize', 'selectall', 'print', '|',
      'cut', 'copy', 'paste', 'pastePlainText', '|',
      'about'
    ],
    uploader: {
      insertImageAsBase64URI: false
    },
    removeButtons: ['brush', 'file'],
    showPlaceholder: true,
    useSearch: true,
    spellcheck: false,
    enter: 'P',
    enterBlock: 'div',
    defaultMode: '1',
    useAceEditor: false,
    colors: {
      greyscale: ['#000000', '#434343', '#666666', '#999999', '#B7B7B7', '#CCCCCC', '#D9D9D9', '#EFEFEF', '#F3F3F3', '#FFFFFF'],
      palette: ['#980000', '#FF0000', '#FF9900', '#FFFF00', '#00FF00', '#00FFFF', '#4A86E8', '#0000FF', '#9900FF', '#FF00FF'],
      full: [
        '#000000', '#434343', '#666666', '#999999', '#B7B7B7', '#CCCCCC', '#D9D9D9', '#EFEFEF', '#F3F3F3', '#FFFFFF',
        '#980000', '#FF0000', '#FF9900', '#FFFF00', '#00FF00', '#00FFFF', '#4A86E8', '#0000FF', '#9900FF', '#FF00FF'
      ]
    },
    image: {
      editSrc: true,
      selectImageAfterUpload: true,
      defaultWidth: 100,
      defaultHeight: 100
    },
    link: {
      noFollowCheckbox: true,
      openInNewTabCheckbox: true
    },
    table: {
      insert: true,
      addColumn: true,
      addRow: true,
      deleteColumn: true,
      deleteRow: true,
      merge: true,
      split: true,
      autofill: true,
      resize: true
    }
  }), []);

  useEffect(() => {
    loadCategories();
    setupRealtimeListener();
  }, []);

  // Jodit Editor Handlers - useCallback ile memoize edildi
  const handleEditorBlur = useCallback((newContent) => {
    setFormData(prev => ({ ...prev, content: newContent }));
  }, []);

  const handleEditorChange = useCallback((newContent) => {
    setFormData(prev => ({ ...prev, content: newContent }));
  }, []);

  const handleEditorInit = useCallback((editor) => {
    // Custom upload image button
    editor.registerCommand('uploadImage', {
      exec: (editor) => {
        handleEditorImageUpload(editor);
      },
      hotkeys: 'ctrl+shift+u'
    });
  }, [handleEditorImageUpload]);

  useEffect(() => {
    if (showExportMenu) {
      const handleClickOutside = (event) => {
        if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
          setShowExportMenu(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showExportMenu]);

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
      const q = query(blogsRef);
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const allPosts = [];
        snapshot.forEach((doc) => {
          allPosts.push({ id: doc.id, ...doc.data() });
        });
        
        // Client-side sorting
        allPosts.sort((a, b) => {
          let aValue, bValue;
          
          if (sortField === 'createdAt' || sortField === 'publishedAt' || sortField === 'updatedAt') {
            aValue = a[sortField]?.toDate ? a[sortField].toDate() : new Date(a[sortField] || 0);
            bValue = b[sortField]?.toDate ? b[sortField].toDate() : new Date(b[sortField] || 0);
          } else if (sortField === 'views') {
            aValue = a.views || 0;
            bValue = b.views || 0;
          } else {
            aValue = a[sortField] || '';
            bValue = b[sortField] || '';
          }
          
          if (sortDirection === 'asc') {
            return aValue > bValue ? 1 : -1;
          } else {
            return aValue < bValue ? 1 : -1;
          }
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

  const filteredPosts = posts.filter(post => {
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      if (!post.title?.toLowerCase().includes(query) &&
          !post.content?.toLowerCase().includes(query) &&
          !post.excerpt?.toLowerCase().includes(query) &&
          !post.authorName?.toLowerCase().includes(query) &&
          !post.author?.toLowerCase().includes(query)) {
        return false;
      }
    }
    
    // Category filter
    if (categoryFilter !== 'all' && post.category !== categoryFilter) {
      return false;
    }
    
    // Status filter
    if (statusFilter !== 'all' && post.status !== statusFilter) {
      return false;
    }
    
    return true;
  });

  const paginatedPosts = filteredPosts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredPosts.length / itemsPerPage);

  const handleOpenModal = (post = null) => {
    if (post) {
      setEditingPost(post);
      setFormData({
        title: post.title || '',
        slug: post.slug || '',
        content: post.content || '',
        excerpt: post.excerpt || post.summary || '',
        category: post.category || 'haberler',
        featuredImage: post.featuredImage || post.image || '',
        author: post.author || userData?.fullName || 'Admin',
        authorName: post.authorName || post.author || userData?.fullName || 'Admin',
        status: post.status || 'draft',
        featured: post.featured || false,
        metaTitle: post.metaTitle || post.title || '',
        metaDescription: post.metaDescription || post.excerpt || '',
        publishDate: post.publishedAt?.toDate ? post.publishedAt.toDate().toISOString().slice(0, 16) : ''
      });
    } else {
      setEditingPost(null);
      setFormData({
        title: '',
        slug: '',
        content: '',
        excerpt: '',
        category: 'haberler',
        featuredImage: '',
        author: userData?.fullName || 'Admin',
        authorName: userData?.fullName || 'Admin',
        status: 'draft',
        featured: false,
        metaTitle: '',
        metaDescription: '',
        publishDate: ''
      });
    }
    setFormErrors({});
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingPost(null);
    setFormData({
      title: '',
      slug: '',
      content: '',
      excerpt: '',
      category: 'haberler',
      featuredImage: '',
      author: userData?.fullName || 'Admin',
      authorName: userData?.fullName || 'Admin',
      status: 'draft',
      featured: false,
      metaTitle: '',
      metaDescription: '',
      publishDate: ''
    });
    setFormErrors({});
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.title.trim()) {
      errors.title = 'Başlık gereklidir';
    }
    
    if (!formData.content.trim()) {
      errors.content = 'İçerik gereklidir';
    }
    
    if (!formData.excerpt.trim()) {
      errors.excerpt = 'Özet gereklidir';
    }
    
    if (!formData.category) {
      errors.category = 'Kategori seçilmelidir';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      toast.error('Lütfen tüm zorunlu alanları doldurun');
      return;
    }
    
    setSaving(true);
    try {
      if (editingPost) {
        const result = await updateBlogPost(editingPost.id, formData);
        if (result.success) {
          toast.success('Blog yazısı güncellendi');
          await logAdminAction(user.uid, 'update_blog_post', { postId: editingPost.id });
          handleCloseModal();
        } else {
          toast.error(result.error || 'Güncelleme başarısız');
        }
      } else {
        const result = await createBlogPost(formData);
        if (result.success) {
          toast.success('Blog yazısı oluşturuldu');
          await logAdminAction(user.uid, 'create_blog_post', { postId: result.id });
          handleCloseModal();
        } else {
          toast.error(result.error || 'Oluşturma başarısız');
        }
      }
    } catch (err) {
      console.error('Kaydetme hatası:', err);
      toast.error('Bir hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (postId) => {
    if (!window.confirm('Bu blog yazısını silmek istediğinizden emin misiniz?')) {
      return;
    }
    
    try {
      const result = await deleteBlogPost(postId);
      if (result.success) {
        toast.success('Blog yazısı silindi');
        await logAdminAction(user.uid, 'delete_blog_post', { postId });
      } else {
        toast.error(result.error || 'Silme başarısız');
      }
    } catch (err) {
      console.error('Silme hatası:', err);
      toast.error('Bir hata oluştu');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) {
      toast.error('Lütfen silmek için yazı seçin');
      return;
    }
    
    if (!window.confirm(`${selectedIds.length} blog yazısını silmek istediğinizden emin misiniz?`)) {
      return;
    }
    
    try {
      for (const postId of selectedIds) {
        await deleteBlogPost(postId);
        await logAdminAction(user.uid, 'delete_blog_post', { postId });
      }
      toast.success(`${selectedIds.length} blog yazısı silindi`);
      setSelectedIds([]);
    } catch (err) {
      console.error('Toplu silme hatası:', err);
      toast.error('Bir hata oluştu');
    }
  };

  const handleBulkStatusChange = async (newStatus) => {
    if (selectedIds.length === 0) {
      toast.error('Lütfen güncellemek için yazı seçin');
      return;
    }
    
    try {
      for (const postId of selectedIds) {
        const post = posts.find(p => p.id === postId);
        if (post) {
          await updateBlogPost(postId, { ...post, status: newStatus });
          await logAdminAction(user.uid, 'update_blog_post_status', { postId, status: newStatus });
        }
      }
      toast.success(`${selectedIds.length} blog yazısı güncellendi`);
      setSelectedIds([]);
    } catch (err) {
      console.error('Toplu güncelleme hatası:', err);
      toast.error('Bir hata oluştu');
    }
  };

  const generateSlug = (text) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  // Kategori Yönetimi Fonksiyonları
  const handleOpenCategoryModal = (category = null) => {
    if (category) {
      setEditingCategory(category);
      setCategoryFormData({
        name: category.name,
        slug: category.slug,
        color: category.color || 'bg-gray-500',
        icon: category.icon || 'BookOpen'
      });
    } else {
      setEditingCategory(null);
      setCategoryFormData({
        name: '',
        slug: '',
        color: 'bg-green-500',
        icon: 'BookOpen'
      });
    }
    setShowCategoryModal(true);
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!categoryFormData.name || !categoryFormData.slug) {
      toast.error('Kategori adı ve slug zorunludur');
      return;
    }

    try {
      if (editingCategory) {
        const result = await updateBlogCategory(editingCategory.id, categoryFormData);
        if (result.success) {
          toast.success('Kategori güncellendi');
          loadCategories(); // Listeyi yenile
          setShowCategoryModal(false);
        } else {
          toast.error('Güncelleme başarısız');
        }
      } else {
        const result = await createBlogCategory(categoryFormData);
        if (result.success) {
          toast.success('Kategori oluşturuldu');
          loadCategories(); // Listeyi yenile
          setShowCategoryModal(false);
        } else {
          toast.error('Oluşturma başarısız');
        }
      }
    } catch (err) {
      console.error('Kategori kaydetme hatası:', err);
      toast.error('Bir hata oluştu');
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    if (!window.confirm('Bu kategoriyi silmek istediğinizden emin misiniz?')) return;
    
    try {
      const result = await deleteBlogCategory(categoryId);
      if (result.success) {
        toast.success('Kategori silindi');
        loadCategories(); // Listeyi yenile
      } else {
        toast.error('Silme başarısız');
      }
    } catch (err) {
      console.error('Kategori silme hatası:', err);
      toast.error('Bir hata oluştu');
    }
  };

  const handleExport = (format) => {
    const headers = ['Başlık', 'Kategori', 'Yazar', 'Durum', 'Görüntülenme', 'Tarih'];
    const data = filteredPosts.map(post => [
      post.title || '',
      post.category || '',
      post.authorName || post.author || '',
      post.status === 'published' ? 'Yayında' : 'Taslak',
      post.views || 0,
      post.publishedAt?.toDate ? post.publishedAt.toDate().toLocaleDateString('tr-TR') : 
      post.createdAt?.toDate ? post.createdAt.toDate().toLocaleDateString('tr-TR') : ''
    ]);
    
    switch (format) {
      case 'csv':
        exportToCSV(headers, data, 'blog-yazilari');
        break;
      case 'excel':
        exportToExcel(headers, data, 'blog-yazilari');
        break;
      case 'pdf':
        exportToPDF(headers, data, 'blog-yazilari');
        break;
    }
    
    setShowExportMenu(false);
    toast.success('Dışa aktarma başarılı');
  };

  const formatDate = (date) => {
    if (!date) return '-';
    const d = date?.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getCategoryName = (categorySlug) => {
    const category = categories.find(cat => cat.slug === categorySlug);
    return category?.name || categorySlug;
  };

  const createSlug = (text) => {
    if (!text) return '';
    return text
      .toString()
      .toLowerCase()
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ı/g, 'i')
      .replace(/İ/g, 'i')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '');
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

  const getCategoryIconComponent = (categorySlug) => {
    const category = categories.find(cat => cat.slug === categorySlug);
    const iconName = category?.icon || 'BookOpen';
    
    const icons = {
      BookOpen,
      Activity,
      Heart,
      Zap,
      Star,
      Award,
      TrendingUp,
      Info
    };
    
    const IconComponent = icons[iconName] || BookOpen;
    return <IconComponent className="w-3 h-3" />;
  };

  const handlePreview = (post) => {
    window.open(`/blog/${post.slug || post.id}`, '_blank');
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <AdminSidebar />
      <div className="flex-1 flex flex-col">
        <header className="bg-white shadow-sm border-b px-6 py-4 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Blog Yönetimi</h1>
              <p className="text-gray-600 mt-1">Blog yazılarını yönetin, düzenleyin ve yayınlayın</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Ara..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 w-64"
                />
              </div>
              <div className="relative group" ref={exportMenuRef}>
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <Download className="w-4 h-4" />
                  <span>Dışa Aktar</span>
                </button>
                <div className={`absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 ${showExportMenu ? 'opacity-100 visible' : 'opacity-0 invisible'} transition-all z-10`}>
                  <button
                    onClick={() => handleExport('csv')}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-t-lg"
                  >
                    CSV olarak indir
                  </button>
                  <button
                    onClick={() => handleExport('excel')}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Excel olarak indir
                  </button>
                  <button
                    onClick={() => handleExport('pdf')}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-b-lg"
                  >
                    PDF olarak indir
                  </button>
                </div>
              </div>

              <button
                onClick={() => handleOpenCategoryModal()}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <BookOpen className="w-4 h-4" />
                <span>Kategorileri Yönet</span>
              </button>
              <button
                onClick={() => handleOpenModal()}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Plus className="w-4 h-4" />
                <span>Yeni Yazı</span>
              </button>
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 lg:p-8">
            {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <div className="text-sm text-gray-600 mb-1">Toplam Yazı</div>
              <div className="text-2xl font-bold text-gray-900">{posts.length}</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <div className="text-sm text-gray-600 mb-1">Yayında</div>
              <div className="text-2xl font-bold text-green-600">
                {posts.filter(p => p.status === 'published').length}
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <div className="text-sm text-gray-600 mb-1">Taslak</div>
              <div className="text-2xl font-bold text-yellow-600">
                {posts.filter(p => p.status === 'draft').length}
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <div className="text-sm text-gray-600 mb-1">Toplam Görüntülenme</div>
              <div className="text-2xl font-bold text-blue-600">
                {posts.reduce((sum, p) => sum + (p.views || 0), 0).toLocaleString('tr-TR')}
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              >
                <option value="all">Tüm Kategoriler</option>
                {categories.map(cat => (
                  <option key={cat.id || cat.slug} value={cat.slug}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              >
                <option value="all">Tüm Durumlar</option>
                <option value="published">Yayında</option>
                <option value="draft">Taslak</option>
              </select>
              <select
                value={`${sortField}-${sortDirection}`}
                onChange={(e) => {
                  const [field, direction] = e.target.value.split('-');
                  setSortField(field);
                  setSortDirection(direction);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              >
                <option value="createdAt-desc">Tarih (Yeni)</option>
                <option value="createdAt-asc">Tarih (Eski)</option>
                <option value="views-desc">Görüntülenme (Yüksek)</option>
                <option value="views-asc">Görüntülenme (Düşük)</option>
                <option value="title-asc">Başlık (A-Z)</option>
                <option value="title-desc">Başlık (Z-A)</option>
              </select>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedIds.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-center justify-between">
              <span className="text-blue-900 font-medium">
                {selectedIds.length} yazı seçildi
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleBulkStatusChange('published')}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                >
                  Yayınla
                </button>
                <button
                  onClick={() => handleBulkStatusChange('draft')}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm"
                >
                  Taslağa Al
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                >
                  Sil
                </button>
                <button
                  onClick={() => setSelectedIds([])}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
                >
                  Seçimi Temizle
                </button>
              </div>
            </div>
          )}

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-green-600" />
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-900">
              {error}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left">
                          <input
                            type="checkbox"
                            checked={selectedIds.length === paginatedPosts.length && paginatedPosts.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedIds(paginatedPosts.map(p => p.id));
                              } else {
                                setSelectedIds([]);
                              }
                            }}
                            className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                          />
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Başlık
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Kategori
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Yazar
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Durum
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Görüntülenme
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tarih
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          İşlemler
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {paginatedPosts.length > 0 ? (
                        paginatedPosts.map((post) => (
                          <tr key={post.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <input
                                type="checkbox"
                                checked={selectedIds.includes(post.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedIds([...selectedIds, post.id]);
                                  } else {
                                    setSelectedIds(selectedIds.filter(id => id !== post.id));
                                  }
                                }}
                                className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                              />
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                {post.featured && (
                                  <span className="text-yellow-500">
                                    <FileText className="w-4 h-4" />
                                  </span>
                                )}
                                <div>
                                  <div className="font-medium text-gray-900 line-clamp-1">
                                    {post.title}
                                  </div>
                                  {post.excerpt && (
                                    <div className="text-sm text-gray-500 line-clamp-1 mt-1">
                                      {post.excerpt}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`${getCategoryColor(post.category)} text-white text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1 w-fit`}>
                                {getCategoryIconComponent(post.category)}
                                {getCategoryName(post.category)}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {post.authorName || post.author || 'Admin'}
                            </td>
                            <td className="px-6 py-4">
                              {post.status === 'published' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                                  <CheckCircle className="w-3 h-3" />
                                  Yayında
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">
                                  <XCircle className="w-3 h-3" />
                                  Taslak
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {post.views?.toLocaleString('tr-TR') || 0}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {formatDate(post.publishedAt || post.createdAt)}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handlePreview(post)}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Önizle"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleOpenModal(post)}
                                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                  title="Düzenle"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(post.id)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Sil"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                            <p>Blog yazısı bulunamadı</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {totalPages > 1 && (
                  <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      Toplam {filteredPosts.length} yazıdan {(currentPage - 1) * itemsPerPage + 1}-
                      {Math.min(currentPage * itemsPerPage, filteredPosts.length)} arası gösteriliyor
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Önceki
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`px-4 py-2 rounded-lg transition-colors ${
                            currentPage === page
                              ? 'bg-green-600 text-white'
                              : 'border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Sonraki
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Blog Editor Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingPost ? 'Blog Yazısı Düzenle' : 'Yeni Blog Yazısı'}
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Başlık *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => {
                      const title = e.target.value;
                      setFormData(prev => ({ 
                        ...prev, 
                        title,
                        // Auto-generate slug if it was empty or matched the old title slug
                        slug: (!prev.slug || prev.slug === createSlug(prev.title)) ? createSlug(title) : prev.slug
                      }));
                    }}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                      formErrors.title ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Blog yazısı başlığı"
                    required
                  />
                  {formErrors.title && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.title}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Slug (URL)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: createSlug(e.target.value) })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="url-yapisina-uygun-baslik"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, slug: createSlug(prev.title) }))}
                      className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
                      title="Başlıktan oluştur"
                    >
                      <img src="https://api.iconify.design/lucide:refresh-cw.svg" className="w-4 h-4" alt="Generate" />
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Özet *
                </label>
                <textarea
                  value={formData.excerpt}
                  onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                  rows={3}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                    formErrors.excerpt ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Kısa özet (ana sayfada görünecek)"
                  required
                />
                {formErrors.excerpt && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.excerpt}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kategori *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                      formErrors.category ? 'border-red-500' : 'border-gray-300'
                    }`}
                    required
                  >
                    {categories.map(cat => (
                      <option key={cat.id || cat.slug} value={cat.slug}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  {formErrors.category && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.category}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Durum & Yayınlanma Tarihi
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="draft">Taslak</option>
                      <option value="published">Yayınla</option>
                    </select>
                    <input
                      type="datetime-local"
                      value={formData.publishDate}
                      onChange={(e) => setFormData({ ...formData, publishDate: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Öne Çıkan Görsel
                </label>
                
                {/* Upload Method Toggle */}
                <div className="flex items-center gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setImageUploadMethod('url')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      imageUploadMethod === 'url'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    URL ile Ekle
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageUploadMethod('file')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      imageUploadMethod === 'file'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Dosya Yükle
                  </button>
                </div>

                {/* URL Input */}
                {imageUploadMethod === 'url' && (
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={formData.featuredImage}
                      onChange={(e) => setFormData({ ...formData, featuredImage: e.target.value })}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="https://example.com/image.jpg"
                    />
                    {formData.featuredImage && (
                      <div className="relative">
                        <img
                          src={formData.featuredImage}
                          alt="Preview"
                          className="w-20 h-20 object-cover rounded-lg border border-gray-300"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, featuredImage: '' })}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <XIcon className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* File Upload */}
                {imageUploadMethod === 'file' && (
                  <div className="space-y-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;

                        setUploadingImage(true);
                        try {
                          const result = await uploadImage(file, 'general', user?.uid || 'admin');
                          if (result.success && result.data?.url) {
                            setFormData({ ...formData, featuredImage: result.data.url });
                            toast.success('Resim başarıyla yüklendi');
                          } else {
                            toast.error(result.error || 'Resim yüklenemedi');
                          }
                        } catch (error) {
                          console.error('Resim yükleme hatası:', error);
                          toast.error('Resim yüklenirken bir hata oluştu');
                        } finally {
                          setUploadingImage(false);
                        }
                      }}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                      className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {uploadingImage ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin text-green-600" />
                          <span className="text-gray-700">Yükleniyor...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-5 h-5 text-gray-400" />
                          <span className="text-gray-700">Resim Seç veya Sürükle</span>
                        </>
                      )}
                    </button>
                    {formData.featuredImage && (
                      <div className="relative inline-block">
                        <img
                          src={formData.featuredImage}
                          alt="Preview"
                          className="w-32 h-32 object-cover rounded-lg border border-gray-300"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, featuredImage: '' })}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <XIcon className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  İçerik *
                </label>
                <div className={`border rounded-lg overflow-hidden ${
                  formErrors.content ? 'border-red-500' : 'border-gray-300'
                }`}>
                  <style>{`
                    .jodit-container {
                      border: none !important;
                    }
                    .jodit-toolbar-editor-collection {
                      border-bottom: 1px solid #e5e7eb !important;
                    }
                    .jodit-wysiwyg {
                      min-height: 400px !important;
                      padding: 16px !important;
                    }
                    .jodit-statusbar {
                      border-top: 1px solid #e5e7eb !important;
                    }
                  `}</style>
                  <JoditEditor
                    ref={editorRef}
                    value={formData.content}
                    config={editorConfig}
                    onBlur={handleEditorBlur}
                    onChange={handleEditorChange}
                    onInit={handleEditorInit}
                    tabIndex={1}
                  />
                </div>
                {formErrors.content && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.content}</p>
                )}
                <p className="mt-2 text-xs text-gray-500">
                  Zengin metin editörü ile içeriğinizi formatlayabilirsiniz. Resim, tablo, link ve daha fazlasını ekleyebilirsiniz.
                </p>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.featured}
                    onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                    className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  />
                  <span className="text-sm text-gray-700">Öne çıkan yazı olarak işaretle</span>
                </label>
              </div>

              <div className="border-t pt-4 mt-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">SEO Ayarları</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Meta Başlık
                    </label>
                    <input
                      type="text"
                      value={formData.metaTitle}
                      onChange={(e) => setFormData({ ...formData, metaTitle: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="SEO Başlığı (Opsiyonel)"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Boş bırakılırsa yazı başlığı kullanılır.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Meta Açıklama
                    </label>
                    <textarea
                      value={formData.metaDescription}
                      onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value })}
                      rows={2}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="SEO Açıklaması (Opsiyonel)"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Boş bırakılırsa yazı özeti kullanılır.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all shadow-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Kaydediliyor...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>{editingPost ? 'Güncelle' : 'Oluştur'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Management Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">
                  Kategori Yönetimi
                </h2>
                <button
                  onClick={() => setShowCategoryModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {/* Category Form */}
              <form onSubmit={handleSaveCategory} className="mb-8 bg-gray-50 p-4 rounded-xl border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {editingCategory ? 'Kategori Düzenle' : 'Yeni Kategori Ekle'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Kategori Adı</label>
                    <input
                      type="text"
                      value={categoryFormData.name}
                      onChange={(e) => {
                         const name = e.target.value;
                         setCategoryFormData(prev => ({
                           ...prev,
                           name,
                           slug: (!prev.slug || prev.slug === createSlug(prev.name)) ? createSlug(name) : prev.slug
                         }));
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Slug</label>
                    <input
                      type="text"
                      value={categoryFormData.slug}
                      onChange={(e) => setCategoryFormData({ ...categoryFormData, slug: createSlug(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Renk</label>
                    <select
                      value={categoryFormData.color}
                      onChange={(e) => setCategoryFormData({ ...categoryFormData, color: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    >
                      <option value="bg-gray-500">Gri</option>
                      <option value="bg-red-500">Kırmızı</option>
                      <option value="bg-orange-500">Turuncu</option>
                      <option value="bg-yellow-500">Sarı</option>
                      <option value="bg-green-500">Yeşil</option>
                      <option value="bg-teal-500">Turkuaz</option>
                      <option value="bg-blue-500">Mavi</option>
                      <option value="bg-indigo-500">İndigo</option>
                      <option value="bg-purple-500">Mor</option>
                      <option value="bg-pink-500">Pembe</option>
                    </select>
                  </div>
                   <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">İkon</label>
                     <select
                      value={categoryFormData.icon}
                      onChange={(e) => setCategoryFormData({ ...categoryFormData, icon: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    >
                      <option value="BookOpen">Kitap (Varsayılan)</option>
                      <option value="Activity">Aktivite</option>
                      <option value="Heart">Kalp</option>
                      <option value="Zap">Şimşek</option>
                      <option value="Star">Yıldız</option>
                      <option value="Award">Ödül</option>
                      <option value="TrendingUp">Trend</option>
                      <option value="Info">Bilgi</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  {editingCategory && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCategory(null);
                        setCategoryFormData({ name: '', slug: '', color: 'bg-green-500', icon: 'BookOpen' });
                      }}
                      className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                      İptal
                    </button>
                  )}
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    {editingCategory ? 'Güncelle' : 'Ekle'}
                  </button>
                </div>
              </form>

              {/* Category List */}
              <div className="overflow-hidden rounded-xl border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Renk/İkon</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İsim</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Slug</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {categories.map((cat) => (
                      <tr key={cat.id || cat.slug}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`w-8 h-8 rounded-full ${cat.color} flex items-center justify-center text-white`}>
                              {(() => {
                                const icons = { BookOpen, Activity, Heart, Zap, Star, Award, TrendingUp, Info };
                                const IconComp = icons[cat.icon] || BookOpen;
                                return <IconComp className="w-4 h-4" />;
                              })()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{cat.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{cat.slug}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleOpenCategoryModal(cat)}
                            className="text-indigo-600 hover:text-indigo-900 mr-4"
                          >
                            Düzenle
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(cat.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Sil
                          </button>
                        </td>
                      </tr>
                    ))}
                    {categories.length === 0 && (
                       <tr>
                          <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500">
                             Henüz kategori eklenmemiş.
                          </td>
                       </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Blog;
