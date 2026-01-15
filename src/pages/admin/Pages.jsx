import React, { useState, useEffect } from 'react';
import { 
    getPages, 
    savePage, 
    deletePage, 
    togglePagePublish 
} from '../../services/firestoreService';
import { uploadImage } from '../../services/cdnService';
import AdminSidebar from '../../components/AdminSidebar';
import {
    FileText, Plus, Edit, Trash2, Save, X, Globe,
    Search, ExternalLink, EyeOff, Clock, Loader2, CheckCircle, Image, Upload, Link
} from 'lucide-react';
import toast from 'react-hot-toast';

const Pages = () => {
    const [pages, setPages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showEditor, setShowEditor] = useState(false);
    const [editingPage, setEditingPage] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('ALL');

    useEffect(() => {
        loadPages();
    }, []);

    const loadPages = async () => {
        try {
            setLoading(true);
            const result = await getPages();
            if (result.success) {
                setPages(result.data);
            } else {
                toast.error("Sayfalar yüklenirken hata oluştu");
            }
        } catch (error) {
            console.error(error);
            toast.error("Bir hata oluştu");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (pageData) => {
        try {
            const loadingToast = toast.loading("Kaydediliyor...");
            const result = await savePage(pageData);
            
            if (result.success) {
                toast.dismiss(loadingToast);
                toast.success("Sayfa başarıyla kaydedildi");
                loadPages(); // Reload list
                setShowEditor(false);
                setEditingPage(null);
            } else {
                toast.dismiss(loadingToast);
                toast.error("Kaydetme hatası: " + result.error);
            }
        } catch (error) {
            toast.error("Beklenmedik bir hata oluştu");
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Bu sayfayı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.')) {
            try {
                const result = await deletePage(id);
                if (result.success) {
                    toast.success("Sayfa silindi");
                    setPages(prev => prev.filter(p => p.id !== id));
                } else {
                    toast.error("Silme hatası");
                }
            } catch (error) {
                toast.error("Hata oluştu");
            }
        }
    };

    const handleTogglePublish = async (page) => {
        try {
            const result = await togglePagePublish(page.id, page.isPublished);
            if (result.success) {
                toast.success(`Sayfa ${!page.isPublished ? 'yayına alındı' : 'yayından kaldırıldı'}`);
                setPages(prev => prev.map(p => 
                    p.id === page.id ? { ...p, isPublished: !p.isPublished, updatedAt: new Date().toISOString() } : p
                ));
            } else {
                toast.error("Durum değiştirme hatası");
            }
        } catch (error) {
            toast.error("Hata oluştu");
        }
    };

    const filteredPages = pages.filter(p => {
        const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.slug.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'ALL' ||
            (filterStatus === 'PUBLISHED' && p.isPublished) ||
            (filterStatus === 'DRAFT' && !p.isPublished);
        return matchesSearch && matchesStatus;
    });

    const publishedCount = pages.filter(p => p.isPublished).length;
    const draftCount = pages.filter(p => !p.isPublished).length;

    if (loading && pages.length === 0) {
        return (
            <div className="flex h-screen bg-gray-50 items-center justify-center">
                <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-gray-50">
            <AdminSidebar />
            
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                <main className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
                    <div className="space-y-6 max-w-[1600px] mx-auto">

                        {/* Header */}
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Sayfa Yönetimi</h1>
                                <p className="text-sm text-gray-500 mt-1">Statik içerik sayfalarını yönetin (Hakkımızda, Gizlilik vb.)</p>
                            </div>
                            <button
                                onClick={() => { setEditingPage(null); setShowEditor(true); }}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 text-sm font-bold shadow-lg shadow-green-200 transition-all"
                            >
                                <Plus size={16} />
                                Yeni Sayfa
                            </button>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <StatsCard title="Toplam Sayfa" value={pages.length} icon={<FileText />} />
                            <StatsCard title="Yayında" value={publishedCount} icon={<Globe />} color="green" />
                            <StatsCard title="Taslak" value={draftCount} icon={<EyeOff />} color="yellow" />
                        </div>

                        {/* Filters */}
                        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col md:flex-row gap-4 shadow-sm">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Sayfa adı veya URL ara..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20"
                                />
                            </div>
                            <div className="flex gap-2">
                                {['ALL', 'PUBLISHED', 'DRAFT'].map((status) => (
                                    <button
                                        key={status}
                                        onClick={() => setFilterStatus(status)}
                                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${filterStatus === status
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            }`}
                                    >
                                        {status === 'ALL' ? 'Tümü' : status === 'PUBLISHED' ? 'Yayında' : 'Taslak'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Pages List */}
                        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200">
                                        <th className="text-left py-4 px-6 text-xs font-bold text-gray-500 uppercase">Sayfa Detayları</th>
                                        <th className="text-left py-4 px-6 text-xs font-bold text-gray-500 uppercase">URL Adresi</th>
                                        <th className="text-left py-4 px-6 text-xs font-bold text-gray-500 uppercase">Durum</th>
                                        <th className="text-left py-4 px-6 text-xs font-bold text-gray-500 uppercase">Son Güncelleme</th>
                                        <th className="text-right py-4 px-6 text-xs font-bold text-gray-500 uppercase">İşlemler</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredPages.map((page) => (
                                        <tr key={page.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                                                        <FileText size={20} />
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-gray-900">{page.title}</div>
                                                        {page.metaTitle && (
                                                            <div className="text-xs text-gray-500 truncate max-w-[200px]">{page.metaTitle}</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600 border border-gray-200 font-mono">
                                                    /{page.slug}
                                                </code>
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${
                                                    page.isPublished ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                                }`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${page.isPublished ? 'bg-green-600' : 'bg-yellow-600'}`}></span>
                                                    {page.isPublished ? 'Yayında' : 'Taslak'}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 text-sm text-gray-600">
                                                <div className="flex items-center gap-1.5">
                                                    <Clock size={14} className="text-gray-400" />
                                                    {page.updatedAt ? new Date(page.updatedAt).toLocaleDateString('tr-TR') : '-'}
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="flex gap-2 justify-end">
                                                    <button
                                                        onClick={() => window.open(`/page/${page.slug}`, '_blank')}
                                                        className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                                                        title="Önizle"
                                                    >
                                                        <ExternalLink size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => { setEditingPage(page); setShowEditor(true); }}
                                                        className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                                                        title="Düzenle"
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleTogglePublish(page)}
                                                        className={`p-2 rounded-lg transition-colors ${page.isPublished
                                                                ? 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100'
                                                                : 'bg-green-50 text-green-600 hover:bg-green-100'
                                                            }`}
                                                        title={page.isPublished ? 'Yayından Kaldır' : 'Yayınla'}
                                                    >
                                                        {page.isPublished ? <EyeOff size={16} /> : <Globe size={16} />}
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(page.id)}
                                                        className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                                        title="Sil"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {filteredPages.length === 0 && (
                                <div className="py-16 text-center">
                                    <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <FileText size={32} className="text-gray-400" />
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900">Sayfa Bulunamadı</h3>
                                    <p className="text-gray-500 mt-1">Arama kriterlerinize uygun sayfa yok veya henüz hiç sayfa oluşturulmamış.</p>
                                </div>
                            )}
                        </div>

                    </div>
                </main>
            </div>

            {/* Editor Modal */}
            {showEditor && (
                <PageEditor
                    page={editingPage}
                    onClose={() => { setShowEditor(false); setEditingPage(null); }}
                    onSave={handleSave}
                />
            )}
        </div>
    );
};

// Subcomponents
const StatsCard = ({ title, value, icon, color = 'gray' }) => {
    const colorClasses = {
        gray: 'bg-gray-100 text-gray-600',
        green: 'bg-green-100 text-green-600',
        yellow: 'bg-yellow-100 text-yellow-600',
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 flex items-center justify-between shadow-sm">
            <div>
                <div className="text-sm font-bold text-gray-500 mb-1">{title}</div>
                <div className="text-3xl font-black text-gray-900">{value}</div>
            </div>
            <div className={`p-4 rounded-xl ${colorClasses[color]}`}>
                {React.cloneElement(icon, { size: 24 })}
            </div>
        </div>
    );
};

const PageEditor = ({ page, onClose, onSave }) => {
    const [formData, setFormData] = useState(page || {
        title: '',
        slug: '',
        content: '',
        metaTitle: '',
        metaDescription: '',
        keywords: '', // SEO Keywords
        image: '', // Hero/Featured Image
        isPublished: false,
    });
    const [activeTab, setActiveTab] = useState('content');
    const [uploadingImage, setUploadingImage] = useState(false);

    const generateSlug = (title) => {
        return title
            .toLowerCase()
            .replace(/ğ/g, 'g')
            .replace(/ü/g, 'u')
            .replace(/ş/g, 's')
            .replace(/ı/g, 'i')
            .replace(/ö/g, 'o')
            .replace(/ç/g, 'c')
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploadingImage(true);
        try {
            const result = await uploadImage(file, 'pages', 'admin');
             if (result.success) {
                const url = result.data?.url || result.data;
                setFormData(prev => ({ ...prev, image: url }));
                toast.success("Görsel yüklendi");
             } else {
                 toast.error("Görsel yüklenemedi: " + result.error);
             }
        } catch (error) {
            console.error(error);
            toast.error("Yükleme hatası");
        } finally {
            setUploadingImage(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-center shrink-0 bg-gray-50/50">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">
                            {page ? 'Sayfayı Düzenle' : 'Yeni Sayfa Oluştur'}
                        </h2>
                        <p className="text-xs text-gray-500 mt-0.5">İçerik, görsel ve SEO ayarlarını buradan yönetebilirsiniz.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg text-gray-500 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-100 shrink-0 px-6">
                    <button
                        onClick={() => setActiveTab('content')}
                        className={`px-6 py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'content' ? 'border-green-600 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        İçerik & Görsel
                    </button>
                    <button
                        onClick={() => setActiveTab('seo')}
                        className={`px-6 py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'seo' ? 'border-green-600 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        SEO & Meta
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 bg-gray-50/30">
                    {activeTab === 'content' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="text-sm font-bold text-gray-700 block mb-2">Sayfa Başlığı <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        value={formData.title}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            title: e.target.value,
                                            slug: formData.slug || generateSlug(e.target.value)
                                        })}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20 font-medium bg-white"
                                        placeholder="Örn: Hakkımızda"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-bold text-gray-700 block mb-2">Sayfa Linki (Slug)</label>
                                    <div className="flex group">
                                        <span className="px-4 py-3 bg-gray-100 border border-r-0 border-gray-200 rounded-l-xl text-gray-500 text-sm font-medium flex items-center gap-1">
                                            <Link size={14} /> /
                                        </span>
                                        <input
                                            type="text"
                                            value={formData.slug}
                                            onChange={(e) => setFormData({ ...formData, slug: generateSlug(e.target.value) })}
                                            className="flex-1 px-4 py-3 border border-gray-200 rounded-r-xl focus:outline-none focus:ring-2 focus:ring-green-500/20 font-medium bg-white"
                                            placeholder="page-url"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Image Upload */}
                             <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                <label className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                                    <Image size={18} className="text-purple-500" />
                                    Öne Çıkan Görsel (Featured Image)
                                </label>
                                <div className="flex items-start gap-6">
                                    <div className="flex-1">
                                        <div className="relative group">
                                            <input 
                                                type="text" 
                                                value={formData.image || ''}
                                                onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                                                className="w-full px-4 py-3 pl-10 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 text-sm text-gray-600 mb-3"
                                                placeholder="https://..."
                                            />
                                            <Link className="absolute left-3 top-3.5 text-gray-400" size={16} />
                                        </div>
                                        <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg cursor-pointer transition-colors w-fit text-sm font-medium">
                                            {uploadingImage ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                                            {uploadingImage ? 'Yükleniyor...' : 'Bilgisayardan Yükle'}
                                            <input 
                                                type="file" 
                                                className="hidden" 
                                                accept="image/*"
                                                onChange={handleImageUpload}
                                                disabled={uploadingImage}
                                            />
                                        </label>
                                        <p className="text-xs text-gray-400 mt-2">Bu görsel sayfa başlığında arka plan veya sosyal medya paylaşımlarında kullanılabilir.</p>
                                    </div>
                                    {formData.image && (
                                        <div className="w-32 h-20 bg-gray-100 rounded-lg border border-gray-200 overflow-hidden relative shrink-0">
                                            <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                                            <button 
                                                onClick={() => setFormData({ ...formData, image: '' })}
                                                className="absolute top-1 right-1 bg-white/80 p-1 rounded-full text-red-500 hover:bg-white"
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-bold text-gray-700 block mb-2">İçerik (HTML) <span className="text-red-500">*</span></label>
                                <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 text-xs text-gray-500 flex justify-between">
                                        <span>HTML Editörü</span>
                                        <span>Desteklenen taglar: h1, h2, p, ul, img, strong, vb.</span>
                                    </div>
                                    <textarea
                                        value={formData.content}
                                        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                        rows={15}
                                        className="w-full px-4 py-4 focus:outline-none font-mono text-sm leading-relaxed resize-y"
                                        placeholder="<h2>Başlık</h2><p>İçerik buraya...</p>"
                                    />
                                </div>
                            </div>

                            {/* Preview */}
                            {formData.content && (
                                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                                    <label className="text-xs font-bold text-gray-400 block mb-4 uppercase tracking-wider">Canlı Önizleme</label>
                                    <div
                                        className="prose prose-sm md:prose-base max-w-none prose-green"
                                        dangerouslySetInnerHTML={{ __html: formData.content }}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'seo' && (
                        <div className="space-y-6 max-w-3xl mx-auto">
                            <div>
                                <label className="text-sm font-bold text-gray-700 block mb-2">Meta Başlık (Title)</label>
                                <input
                                    type="text"
                                    value={formData.metaTitle}
                                    onChange={(e) => setFormData({ ...formData, metaTitle: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20 bg-white"
                                    placeholder="Sayfa Başlığı - Saha Merkezi"
                                />
                                <div className="flex justify-between mt-1 text-xs text-gray-400">
                                    <span>Google arama sonuçlarında görünen başlık.</span>
                                    <span className={`${(formData.metaTitle?.length || 0) > 60 ? 'text-red-500' : ''}`}>{(formData.metaTitle?.length || 0)}/60</span>
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-bold text-gray-700 block mb-2">Meta Açıklama (Description)</label>
                                <textarea
                                    value={formData.metaDescription}
                                    onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value })}
                                    rows={4}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20 bg-white resize-none"
                                    placeholder="Sayfa açıklaması..."
                                />
                                <div className="flex justify-between mt-1 text-xs text-gray-400">
                                    <span>Arama sonuçlarında başlığın altında çıkan açıklama.</span>
                                    <span className={`${(formData.metaDescription?.length || 0) > 160 ? 'text-red-500' : ''}`}>{(formData.metaDescription?.length || 0)}/160</span>
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-bold text-gray-700 block mb-2">Anahtar Kelimeler (Keywords)</label>
                                <input
                                    type="text"
                                    value={formData.keywords || ''}
                                    onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20 bg-white"
                                    placeholder="halı saha, kiralama, istanbul, futbol (Virgül ile ayırın)"
                                />
                                <p className="text-xs text-gray-400 mt-1">SEO uyumluluğu için sayfayla ilgili anahtar kelimeleri virgülle ayırarak girin.</p>
                            </div>

                            {/* Google Preview */}
                            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm mt-8">
                                <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <Globe size={16} /> Google'da Nasıl Görünecek?
                                </h4>
                                <div className="bg-white p-5 rounded-xl border border-gray-100 hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
                                            <span className="text-xs font-bold text-gray-500">S</span>
                                        </div>
                                        <span className="text-sm text-gray-700">Saha Merkezi</span>
                                        <span className="text-xs text-gray-400">•</span>
                                        <span className="text-xs text-gray-500">https://sahamerkezi.com/{formData.slug || 'url'}</span>
                                    </div>
                                    <div className="text-[#1a0dab] text-xl font-medium cursor-pointer hover:underline truncate">
                                        {formData.metaTitle || formData.title || 'Sayfa Başlığı'}
                                    </div>
                                    <div className="text-[#4d5156] text-sm mt-1 leading-normal line-clamp-2">
                                        {formData.metaDescription || 'Sayfa açıklaması burada görünecek. Bu alan arama sonuçlarında kullanıcıların sayfa içeriği hakkında bilgi almasını sağlar.'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 flex items-center justify-between shrink-0 bg-white shadow-[0_-5px_20px_rgba(0,0,0,0.02)]">
                    <label className="flex items-center gap-3 cursor-pointer group">
                        <div className={`w-12 h-6 rounded-full p-1 transition-colors ${formData.isPublished ? 'bg-green-500' : 'bg-gray-200'}`}>
                            <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${formData.isPublished ? 'translate-x-6' : 'translate-x-0'}`}></div>
                        </div>
                        <input
                            type="checkbox"
                            checked={formData.isPublished || false}
                            onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                            className="hidden"
                        />
                        <span className={`text-sm font-bold transition-colors ${formData.isPublished ? 'text-green-600' : 'text-gray-500'}`}>
                            {formData.isPublished ? 'Yayında' : 'Taslak Halinde'}
                        </span>
                    </label>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors"
                        >
                            Vazgeç
                        </button>
                        <button
                            disabled={!formData.title || !formData.content}
                            onClick={() => onSave(formData)}
                            className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-green-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Save size={18} /> Kaydet
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Pages;
