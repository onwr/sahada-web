import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Heart, Share2, ShieldCheck, MapPin, User, MessageCircle, ShoppingBag } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';

// Mock Data (Shared source ideally, but duplicated here for standalone demo)
const MOCK_PRODUCTS = [
    {
        id: 1,
        title: 'Nike Mercurial Superfly 8 Elite Krampon',
        price: 2450,
        originalPrice: 3500,
        image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1000&h=1000&fit=crop',
        condition: 'Az Kullanılmış',
        description: 'Sadece 3-4 maç giyildi. Hiçbir yırtığı veya söküğü yok. 42 numara. Profesyonel seviye krampon. Kutusu duruyor.',
        category: 'Ekipman',
        location: 'Kadıköy, İstanbul',
        date: '2 gün önce',
        seller: {
            name: 'Burak Y.',
            rating: 4.8,
            joinDate: 'Ocak 2024'
        },
        images: [
             'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1000&h=1000&fit=crop',
             'https://images.unsplash.com/photo-1560769629-975e13f0c470?w=1000&h=1000&fit=crop', // generic shoe
             'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=1000&h=1000&fit=crop'  // generic shoe
        ]
    },
    {
        id: 2,
        title: 'Wilson US Open Tenis Raketi',
        price: 3200,
        originalPrice: 4500,
        image: 'https://images.unsplash.com/photo-1617083934555-560940605530?w=1000&h=1000&fit=crop',
        condition: 'Sıfır',
        description: 'Hediye geldi, hıc kullanmadım. Jelatini üzerinde. Grip L3.',
        category: 'Raket',
        location: 'Beşiktaş, İstanbul',
        date: '5 saat önce',
        seller: {
            name: 'Selin A.',
            rating: 5.0,
            joinDate: 'Mart 2024'
        },
        images: ['https://images.unsplash.com/photo-1617083934555-560940605530?w=1000&h=1000&fit=crop']
    },
     {
        id: 3,
        title: 'Orijinal Galatasaray 2024 Forma',
        price: 1800,
        originalPrice: 2200,
        image: 'https://images.unsplash.com/photo-1563116520-22709670f2b2?w=1000&h=1000&fit=crop',
        condition: 'Sıfır',
        description: 'Etiketli orijinal ürün. L Beden. İhtiyaç fazlası.',
        category: 'Giyim',
        location: 'Şişli, İstanbul',
        date: '1 hafta önce',
        seller: {
            name: 'Mert K.',
            rating: 4.5,
            joinDate: 'Şubat 2024'
        },
        images: ['https://images.unsplash.com/photo-1563116520-22709670f2b2?w=1000&h=1000&fit=crop']
    },
    {
        id: 4,
        title: 'Spalding TF-1000 Basketbol Topu',
        price: 950,
        originalPrice: 1400,
        image: 'https://images.unsplash.com/photo-1519861531473-920026393112?w=1000&h=1000&fit=crop',
        condition: 'Yeni Gibi',
        description: 'Salon topudur. Dış sahada kullanılmadı. Grip mükemmel durumda.',
        category: 'Top',
        location: 'Üsküdar, İstanbul',
        date: 'Dün',
        seller: {
            name: 'Caner E.',
            rating: 4.9,
            joinDate: 'Aralık 2023'
        },
        images: ['https://images.unsplash.com/photo-1519861531473-920026393112?w=1000&h=1000&fit=crop']
    }
];

const ProductDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [product, setProduct] = useState(null);
    const [activeImage, setActiveImage] = useState(0);

    useEffect(() => {
        // Simulate fetch
        const found = MOCK_PRODUCTS.find(p => p.id === parseInt(id));
        setProduct(found);
    }, [id]);

    if (!product) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900">Ürün Bulunamadı</h2>
                    <button onClick={() => navigate('/')} className="mt-4 text-green-600 hover:underline">Anasayfaya Dön</button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <Header />
            
            <div className="container mx-auto px-4 pt-8 md:pt-12">
                {/* Breadcrumb / Back */}
                <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-green-600 mb-6 transition-colors">
                    <ArrowLeft size={20} />
                    <span className="font-medium">Geri Dön</span>
                </button>

                <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="grid grid-cols-1 lg:grid-cols-2">
                        
                        {/* LEFT: Images */}
                        <div className="p-6 md:p-8 bg-gray-50/50">
                            <div className="relative aspect-square rounded-2xl overflow-hidden bg-white shadow-sm mb-4 border border-gray-100">
                                <img 
                                    src={product.images ? product.images[activeImage] : product.image} 
                                    alt={product.title} 
                                    className="w-full h-full object-cover"
                                />
                                <span className="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg text-xs font-bold text-gray-900 shadow-sm">
                                    {product.condition}
                                </span>
                            </div>
                            
                            {/* Thumbnails */}
                            {product.images && product.images.length > 1 && (
                                <div className="flex gap-4 overflow-x-auto pb-2">
                                    {product.images.map((img, idx) => (
                                        <button 
                                            key={idx}
                                            onClick={() => setActiveImage(idx)}
                                            className={`relative w-20 h-20 rounded-xl overflow-hidden border-2 transition-all flex-shrink-0 ${activeImage === idx ? 'border-green-500' : 'border-transparent hover:border-gray-300'}`}
                                        >
                                            <img src={img} alt="thumb" className="w-full h-full object-cover" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* RIGHT: Details */}
                        <div className="p-6 md:p-8 flex flex-col">
                            {/* Header */}
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <div className="inline-flex items-center gap-2 mb-2">
                                        <span className="text-xs font-bold text-green-600 uppercase tracking-wide bg-green-50 px-2 py-1 rounded-md">{product.category}</span>
                                        <span className="text-xs text-gray-400 flex items-center gap-1"><MapPin size={12}/> {product.location}</span>
                                    </div>
                                    <h1 className="text-2xl md:text-3xl font-black text-gray-900 leading-tight mb-2">{product.title}</h1>
                                    <div className="text-sm text-gray-500">İlan Tarihi: {product.date}</div>
                                </div>
                                <div className="flex gap-2">
                                    <button className="p-2.5 rounded-full bg-gray-100 hover:bg-red-50 hover:text-red-500 text-gray-400 transition-colors">
                                        <Heart size={20} />
                                    </button>
                                    <button className="p-2.5 rounded-full bg-gray-100 hover:bg-blue-50 hover:text-blue-500 text-gray-400 transition-colors">
                                        <Share2 size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* Price */}
                            <div className="mb-8 border-b border-gray-100 pb-8">
                                <div className="flex items-baseline gap-3">
                                    <span className="text-4xl font-black text-gray-900">{product.price} ₺</span>
                                    {product.originalPrice && (
                                        <span className="text-lg text-gray-400 line-through decoration-2">{product.originalPrice} ₺</span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 mt-2 text-green-600 font-medium text-sm">
                                    <ShieldCheck size={16} />
                                    <span>Güvenli Ödeme & Kargo İmkanı</span>
                                </div>
                            </div>

                            {/* Description */}
                            <div className="mb-8">
                                <h3 className="font-bold text-gray-900 mb-3">Ürün Açıklaması</h3>
                                <p className="text-gray-600 leading-relaxed text-sm md:text-base">
                                    {product.description}
                                </p>
                            </div>

                            {/* Seller Box */}
                            <div className="mt-auto bg-gray-50 rounded-2xl p-4 flex items-center justify-between mb-8">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-gray-400 shadow-sm">
                                        <User size={24} />
                                    </div>
                                    <div>
                                        <div className="font-bold text-gray-900">{product.seller.name}</div>
                                        <div className="text-xs text-gray-500 flex items-center gap-1">
                                            <Star size={10} className="fill-yellow-400 text-yellow-400"/> {product.seller.rating} • {product.seller.joinDate}'den beri üye
                                        </div>
                                    </div>
                                </div>
                                <button className="text-xs font-bold text-gray-900 underline">Profili Gör</button>
                            </div>

                            {/* Action Buttons */}
                            <div className="grid grid-cols-2 gap-4">
                                <button className="py-4 rounded-xl border-2 border-green-600 text-green-700 font-bold hover:bg-green-50 transition-colors flex items-center justify-center gap-2">
                                     <MessageCircle size={20} />
                                     Satıcıya Sor
                                </button>
                                <button className="py-4 rounded-xl bg-green-600 text-white font-bold hover:bg-green-700 transition-colors shadow-lg shadow-green-200 flex items-center justify-center gap-2">
                                     <ShoppingBag size={20} />
                                     Satın Al
                                </button>
                            </div>

                        </div>
                    </div>
                </div>
            </div>

            <Footer />
        </div>
    );
};

// Helper for Star icon since we used it in render
const Star = ({ size = 24, className }) => (
    <svg 
     xmlns="http://www.w3.org/2000/svg" 
     width={size} 
     height={size} 
     viewBox="0 0 24 24" 
     fill="none" 
     stroke="currentColor" 
     strokeWidth="2" 
     strokeLinecap="round" 
     strokeLinejoin="round" 
     className={className}
    >
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
    </svg>
);

export default ProductDetail;
