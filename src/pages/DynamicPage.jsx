import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPageBySlug } from '../services/firestoreService';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Loader2, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const DynamicPage = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [page, setPage] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (slug) {
            loadPage();
        }
    }, [slug]);

    const loadPage = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await getPageBySlug(slug);
            if (result.success) {
                if (result.data.isPublished) {
                    setPage(result.data);
                    // Set document title and meta
                    document.title = result.data.metaTitle || result.data.title || 'Saha Merkezi';
                    const metaDesc = document.querySelector('meta[name="description"]');
                    if (metaDesc && result.data.metaDescription) {
                        metaDesc.setAttribute('content', result.data.metaDescription);
                    }
                } else {
                    setError('Bu sayfa yayında değil.');
                }
            } else {
                setError('Sayfa bulunamadı.');
            }
        } catch (err) {
            console.error(err);
            setError('Sayfa yüklenirken bir hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col">
                <Header />
                <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="w-10 h-10 text-green-600 animate-spin" />
                </div>
                <Footer />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col">
                <Header />
                <div className="flex-1 flex flex-col items-center justify-center p-4">
                    <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full text-center">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertCircle className="w-8 h-8 text-red-600" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">{error === 'Sayfa bulunamadı.' ? '404 - Sayfa Bulunamadı' : 'Erişim Hatası'}</h1>
                        <p className="text-gray-500 mb-6">{error}</p>
                        <button 
                            onClick={() => navigate('/')}
                            className="bg-green-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-green-700 transition-colors"
                        >
                            Ana Sayfaya Dön
                        </button>
                    </div>
                </div>
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <Header />
            
            {/* Page Header */}
            <div className="bg-gradient-to-br from-green-600 via-green-700 to-green-800 text-white py-12 md:py-20">
                <div className="container mx-auto px-4 max-w-screen-xl">
                    <motion.h1 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-3xl md:text-5xl font-black text-center"
                    >
                        {page.title}
                    </motion.h1>
                </div>
            </div>

            {/* Content */}
            <main className="flex-1 container mx-auto px-4 max-w-screen-xl py-12">
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-12 prose prose-lg prose-green max-w-none"
                    dangerouslySetInnerHTML={{ __html: page.content }}
                />
            </main>

            <Footer />
        </div>
    );
};

export default DynamicPage;
