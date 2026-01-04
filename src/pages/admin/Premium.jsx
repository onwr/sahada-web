import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import AdminSidebar from '../../components/AdminSidebar';
import {
    Crown, Users, Building2, TrendingUp, Check, Edit,
    Plus, Trash2, Star, X, Save, Eye, Search, Filter,
    MoreVertical, Calendar, User, Mail, Phone, Ban, CheckCircle,
    Download
} from 'lucide-react';
import {
    getPremiumPlans,
    createPremiumPlan,
    updatePremiumPlan,
    createPremiumMembership,
    updatePremiumMembership,
    cancelPremiumMembership,
    getAllUsers
} from '../../services/firestoreService';
import { collection, query, onSnapshot, orderBy, where, doc, getDoc, limit } from 'firebase/firestore';
import { db } from '../../config/firebase';
import toast from '../../utils/toast';

const Premium = () => {
    const { user } = useAuth();
    const [packages, setPackages] = useState([]);
    const [members, setMembers] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [activeTab, setActiveTab] = useState('packages');
    const [filterType, setFilterType] = useState('ALL');
    const [loading, setLoading] = useState(true);

    // Modals
    const [showPackageEditor, setShowPackageEditor] = useState(false);
    const [editingPackage, setEditingPackage] = useState(null);
    const [showMemberEditor, setShowMemberEditor] = useState(false);
    const [editingMember, setEditingMember] = useState(null);

    // Filters for Members
    const [memberSearch, setMemberSearch] = useState('');
    const [memberStatusFilter, setMemberStatusFilter] = useState('ALL');

    // Initial Load & Listeners
    useEffect(() => {
        // Load Plans Realtime
        const qPlans = query(collection(db, 'premiumPlans'), orderBy('createdAt', 'desc'));
        const unsubscribePlans = onSnapshot(qPlans, (snapshot) => {
            const plansData = [];
            snapshot.forEach((doc) => {
                plansData.push({ id: doc.id, ...doc.data() });
            });
            setPackages(plansData);
        });

        // Load Members Realtime
        const qMembers = query(collection(db, 'memberships'), orderBy('createdAt', 'desc'));
        const unsubscribeMembers = onSnapshot(qMembers, async (snapshot) => {
            const membersData = [];
            for (const docSnap of snapshot.docs) {
                const membershipData = docSnap.data();
                const userId = membershipData.userId; // userId is in the document data usually
                const docId = docSnap.id;
                
                try {
                    let userData = null;
                    // Eğer userId membership içinde varsa
                    if (userId) {
                        const userDoc = await getDoc(doc(db, 'users', userId));
                        if (userDoc.exists()) userData = userDoc.data();
                    } 
                    // Eğer document ID kendisi userID ise (bazı yapılarda böyle olabilir)
                    else if (!membershipData.userId) {
                         // Fallback check
                         const userDoc = await getDoc(doc(db, 'users', docId));
                         if(userDoc.exists()) {
                             userData = userDoc.data();
                         }
                    }

                    membersData.push({
                        id: docId,
                        ...membershipData,
                        user: userData,
                        // Helper for easy access
                        userType: userData?.userType || 'player'
                    });
                } catch (err) {
                    console.error("User fetch error", err);
                    membersData.push({ id: docId, ...membershipData, userType: 'unknown' });
                }
            }
            setMembers(membersData);
            setLoading(false);
        });

        // Load All Users for selection (optimize this later with search)
        loadAllUsers();

        return () => {
            unsubscribePlans();
            unsubscribeMembers();
        };
    }, []);

    const loadAllUsers = async () => {
        try {
            const result = await getAllUsers();
            if (result.success) {
                setAllUsers(result.data);
            }
        } catch (error) {
            console.error("Error loading users", error);
        }
    };

    // --- Computed Stats ---
    // Fix: Check user.userType for accurate counts
    const getSubscriberCount = (planId) => members.filter(m => m.planId === planId && m.status === 'active').length;
    
    const packagesWithCount = packages.map(p => ({
        ...p,
        subscriberCount: getSubscriberCount(p.id)
    }));

    const activeMembers = members.filter(m => m.status === 'active');
    const totalRevenue = activeMembers.reduce((sum, m) => sum + (Number(m.planPrice) || 0), 0);
    const totalSubscribers = activeMembers.length;
    
    // Check against 'saha', 'owner', 'field_owner' etc to be safe
    const ownerSubscribers = activeMembers.filter(m => {
        const type = m.user?.userType;
        return type === 'saha' || type === 'owner' || type === 'tesis';
    }).length;

    const playerSubscribers = activeMembers.filter(m => {
        const type = m.user?.userType;
        return !type || type === 'player' || type === 'oyuncu';
    }).length;


    // --- Handlers ---

    const handleToggleActive = async (id, currentStatus) => {
        try {
            await updatePremiumPlan(id, { isActive: !currentStatus });
            toast.success('Paket durumu güncellendi');
        } catch (error) { toast.error('Hata: ' + error.message); }
    };

    const handleTogglePopular = async (id, currentStatus) => {
        try {
            await updatePremiumPlan(id, { isPopular: !currentStatus });
            toast.success('Popülerlik durumu güncellendi');
        } catch (error) { toast.error('Hata: ' + error.message); }
    };

    const handleSavePackage = async (pkgData) => {
        try {
            if (pkgData.id) {
                await updatePremiumPlan(pkgData.id, pkgData);
                toast.success('Paket güncellendi');
            } else {
                await createPremiumPlan(pkgData);
                toast.success('Yeni paket oluşturuldu');
            }
            setShowPackageEditor(false);
        } catch (error) { toast.error('Kaydedilemedi: ' + error.message); }
    };

    const handleSaveMember = async (memberData) => {
        try {
            // memberData: { userId, planId, startDate, customDays }
            if (memberData.id) {
                // Update existing membership (e.g. change status or extend)
                await updatePremiumMembership(memberData.id, {
                    status: memberData.status,
                    endDate: memberData.endDate // If extending manually
                }, user.uid);
                 toast.success('Üyelik güncellendi');
            } else {
                // Create new
                await createPremiumMembership(
                    memberData.userId,
                    memberData.planId,
                    user.uid,
                    {
                        startDate: memberData.startDate,
                        customDays: memberData.customDays
                    }
                );
                toast.success('Yeni üyelik oluşturuldu');
            }
            setShowMemberEditor(false);
        } catch (error) { toast.error('İşlem başarısız: ' + error.message); }
    };
    
    const handleCancelMember = async (memberId) => {
        if(!confirm('Üyeliği iptal etmek istiyor musunuz?')) return;
        try {
            await cancelPremiumMembership(memberId, user.uid, 'Admin tarafından iptal');
            toast.success('Üyelik iptal edildi');
        } catch (error) { toast.error('Hata: ' + error.message); }
    };

    // --- Filtering ---
    const filteredPackages = packagesWithCount.filter(p => {
        if (filterType === 'ALL') return true;
        
        const type = p.type?.toUpperCase();
        if (filterType === 'PLAYER') {
            return type === 'PLAYER' || type === 'OYUNCU';
        }
        if (filterType === 'OWNER') {
            // UI'da PLAYER olmayan her şeye Tesis dediğimiz için burada da aynı mantığı uyguluyoruz
            return type !== 'PLAYER' && type !== 'OYUNCU';
        }
        return false;
    });
    
    const filteredMembers = members.filter(m => {
        const matchesSearch = memberSearch === '' || 
            m.user?.fullName?.toLowerCase().includes(memberSearch.toLowerCase()) ||
            m.user?.email?.toLowerCase().includes(memberSearch.toLowerCase());
        
        const matchesStatus = memberStatusFilter === 'ALL' || m.status === memberStatusFilter;
        
        return matchesSearch && matchesStatus;
    });


    if (loading && packages.length === 0) {
         return (
             <div className="flex h-screen bg-gray-50 items-center justify-center">
                 <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
             </div>
         );
    }

    return (
        <div className="flex h-screen bg-gray-50">
            <AdminSidebar />
            
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                <main className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
                    <div className="space-y-8 max-w-[1600px] mx-auto">
                        
                        {/* Top Header Section */}
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Premium Yönetimi</h1>
                                <p className="text-gray-500 mt-1">Sistemdeki paketleri ve abonelikleri kontrol edin</p>
                            </div>
                            <div className="flex gap-3">
                                {activeTab === 'packages' ? (
                                    <button
                                        onClick={() => { setEditingPackage(null); setShowPackageEditor(true); }}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all shadow-lg shadow-green-200 font-medium"
                                    >
                                        <Plus size={18} />
                                        Yeni Paket
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => { setEditingMember(null); setShowMemberEditor(true); }}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all shadow-lg shadow-green-200 font-medium"
                                    >
                                        <Plus size={18} />
                                        Yeni Abone Ekle
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Quick Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                            <StatsCard
                                title="Aylık Toplam Gelir"
                                value={`₺${totalRevenue.toLocaleString('tr-TR')}`}
                                icon={<TrendingUp />}
                                color="green"
                                detail="Aktif abonelerden"
                            />
                            <StatsCard
                                title="Toplam Aktif Abone"
                                value={totalSubscribers.toString()}
                                icon={<Crown />}
                                color="yellow"
                                detail="Tüm paketler"
                            />
                            <StatsCard
                                title="Oyuncu Abonesi"
                                value={playerSubscribers.toString()}
                                icon={<Users />}
                                color="blue"
                                detail="Bireysel kullanıcılar"
                            />
                            <StatsCard
                                title="Tesis Abonesi"
                                value={ownerSubscribers.toString()}
                                icon={<Building2 />}
                                color="purple"
                                detail="Saha sahipleri"
                            />
                        </div>

                        {/* Main Content Area */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden min-h-[600px] flex flex-col">
                            {/* Tabs Navigation */}
                            <div className="flex border-b border-gray-100 px-6">
                                <button
                                    onClick={() => setActiveTab('packages')}
                                    className={`px-6 py-4 text-sm font-bold border-b-2 transition-all ${activeTab === 'packages' ? 'border-green-600 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                                >
                                    Paket Yönetimi
                                </button>
                                <button
                                    onClick={() => setActiveTab('subscribers')}
                                    className={`px-6 py-4 text-sm font-bold border-b-2 transition-all ${activeTab === 'subscribers' ? 'border-green-600 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                                >
                                    Abonelik Listesi
                                    <span className="ml-2 bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                                        {members.length}
                                    </span>
                                </button>
                            </div>

                            {/* Tab Contents */}
                            <div className="p-6 flex-1 bg-gray-50/30">
                                
                                {/* PACKAGES TAB */}
                                {activeTab === 'packages' && (
                                    <div className="space-y-6">
                                        <div className="flex gap-2 mb-6">
                                            {['ALL', 'PLAYER', 'OWNER'].map((type) => (
                                                <button
                                                    key={type}
                                                    onClick={() => setFilterType(type)}
                                                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm ${filterType === type ? 'bg-white text-green-700 border border-green-200 ring-2 ring-green-50' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
                                                >
                                                    {type === 'ALL' ? 'Tümü' : type === 'PLAYER' ? 'Oyuncu Paketleri' : 'Tesis Paketleri'}
                                                </button>
                                            ))}
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                                            {filteredPackages.map((pkg) => (
                                                <div
                                                    key={pkg.id}
                                                    className={`bg-white rounded-2xl border-2 p-6 relativer group hover:-translate-y-1 transition-all duration-300 ${pkg.isPopular ? 'border-yellow-400 shadow-xl shadow-yellow-100' : 'border-gray-100 hover:border-green-200 hover:shadow-lg'}`}
                                                >
                                                    {/* Status Badge */}
                                                    <div className="flex justify-between items-start mb-4">
                                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${pkg.type === 'PLAYER' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
                                                            {pkg.type === 'PLAYER' ? <Users size={12} /> : <Building2 size={12} />}
                                                            {pkg.type === 'PLAYER' ? 'Oyuncu' : 'Tesis'}
                                                        </span>
                                                        {!pkg.isActive && (
                                                            <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded-full font-bold">Pasif</span>
                                                        )}
                                                        {pkg.isPopular && (
                                                             <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full font-bold flex items-center gap-1">
                                                                <Star size={10} className="fill-current" /> Popüler
                                                             </span>
                                                        )}
                                                    </div>

                                                    <h3 className="text-xl font-bold text-gray-900 mb-2">{pkg.name}</h3>

                                                    <div className="flex items-baseline gap-1 mb-6">
                                                        <span className="text-4xl font-black text-gray-900 tracking-tight">₺{pkg.price}</span>
                                                        <span className="text-sm text-gray-500 font-medium">/ ay</span>
                                                    </div>

                                                    <div className="space-y-3 mb-8 min-h-[120px]">
                                                        {pkg.features && pkg.features.slice(0, 5).map((feature, i) => (
                                                            <div key={i} className="flex items-start gap-3 text-sm text-gray-600">
                                                                <div className="mt-0.5 w-5 h-5 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                                                                    <Check size={12} className="text-green-600" />
                                                                </div>
                                                                <span className="leading-snug">{feature}</span>
                                                            </div>
                                                        ))}
                                                        {pkg.features && pkg.features.length > 5 && (
                                                             <div className="text-xs text-gray-400 font-medium pl-8">+{pkg.features.length - 5} özellik daha</div>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center justify-between text-xs text-gray-500 mb-4 px-1">
                                                        <span>{pkg.subscriberCount || 0} aktif abone</span>
                                                        <span>{pkg.duration || 30} gün</span>
                                                    </div>

                                                    <div className="grid grid-cols-3 gap-2">
                                                        <button
                                                            onClick={() => { setEditingPackage(pkg); setShowPackageEditor(true); }}
                                                            className="col-span-2 py-2.5 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors text-sm font-bold flex items-center justify-center gap-2 border border-gray-200"
                                                        >
                                                            <Edit size={14} /> Düzenle
                                                        </button>
                                                        <div className="flex gap-1">
                                                            <button
                                                                onClick={() => handleToggleActive(pkg.id, pkg.isActive)}
                                                                className={`flex-1 rounded-lg transition-colors flex items-center justify-center border ${pkg.isActive ? 'border-red-100 bg-red-50 text-red-600 hover:bg-red-100' : 'border-green-100 bg-green-50 text-green-600 hover:bg-green-100'}`}
                                                                title={pkg.isActive ? "Pasife Al" : "Aktifleştir"}
                                                            >
                                                                {pkg.isActive ? <X size={16} /> : <Check size={16} />}
                                                            </button>
                                                            <button
                                                                onClick={() => handleTogglePopular(pkg.id, pkg.isPopular)}
                                                                className={`flex-1 rounded-lg transition-colors flex items-center justify-center border ${pkg.isPopular ? 'border-yellow-200 bg-yellow-100 text-yellow-600' : 'border-gray-200 bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
                                                                title="Popüler Yap"
                                                            >
                                                                <Star size={16} className={pkg.isPopular ? 'fill-current' : ''} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            
                                            {/* Add New Placeholder Card */}
                                            <button 
                                                onClick={() => { setEditingPackage(null); setShowPackageEditor(true); }}
                                                className="group border-2 border-dashed border-gray-200 rounded-2xl p-6 flex flex-col items-center justify-center text-gray-400 hover:border-green-400 hover:text-green-600 hover:bg-green-50/30 transition-all min-h-[400px]"
                                            >
                                                <div className="w-16 h-16 rounded-full bg-gray-50 group-hover:bg-white flex items-center justify-center mb-4 transition-colors shadow-sm">
                                                    <Plus size={32} />
                                                </div>
                                                <span className="font-bold text-lg">Yeni Paket Ekle</span>
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* SUBSCRIBERS TAB */}
                                {activeTab === 'subscribers' && (
                                    <div className="space-y-4">
                                        {/* Filters Toolbar */}
                                        <div className="flex flex-col md:flex-row gap-4 justify-between bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                                            <div className="relative flex-1 max-w-md">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                                <input
                                                    type="text"
                                                    placeholder="İsim, e-posta ile ara..."
                                                    value={memberSearch}
                                                    onChange={(e) => setMemberSearch(e.target.value)}
                                                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20"
                                                />
                                            </div>
                                            <div className="flex gap-2">
                                                <select
                                                    value={memberStatusFilter}
                                                    onChange={(e) => setMemberStatusFilter(e.target.value)}
                                                    className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500"
                                                >
                                                    <option value="ALL">Tüm Durumlar</option>
                                                    <option value="active">Aktif</option>
                                                    <option value="expired">Süresi Dolmuş</option>
                                                    <option value="cancelled">İptal Edilmiş</option>
                                                </select>
                                                <button className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 flex items-center font-medium text-sm">
                                                    <Download size={16} className="mr-2"/> CSV
                                                </button>
                                            </div>
                                        </div>

                                        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                                            <div className="overflow-x-auto">
                                                <table className="w-full">
                                                    <thead>
                                                        <tr className="bg-gray-50/50 border-b border-gray-100">
                                                            <th className="text-left py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Abone</th>
                                                            <th className="text-left py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Tip</th>
                                                            <th className="text-left py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Paket</th>
                                                            <th className="text-left py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Tarihler</th>
                                                            <th className="text-left py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Durum</th>
                                                            <th className="text-right py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">İşlemler</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100">
                                                        {filteredMembers.length > 0 ? (
                                                            filteredMembers.map((sub) => {
                                                                const startDate = sub.startDate?.toDate ? sub.startDate.toDate() : new Date(sub.startDate);
                                                                const endDate = sub.endDate?.toDate ? sub.endDate.toDate() : new Date(sub.endDate);
                                                                const isExpired = endDate < new Date() && sub.status === 'active';
                                                                
                                                                return (
                                                                    <tr key={sub.id} className="group hover:bg-gray-50/80 transition-colors">
                                                                        <td className="py-4 px-6">
                                                                            <div className="flex items-center gap-3">
                                                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-500 font-bold border-2 border-white shadow-sm">
                                                                                    {sub.user?.fullName?.[0] || 'U'}
                                                                                </div>
                                                                                <div>
                                                                                    <div className="font-bold text-gray-900">{sub.user?.fullName || 'İsimsiz Kullanıcı'}</div>
                                                                                    <div className="text-xs text-gray-500 font-mono">{sub.user?.email || sub.userId}</div>
                                                                                </div>
                                                                            </div>
                                                                        </td>
                                                                        <td className="py-4 px-6">
                                                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold ${
                                                                                sub.userType === 'saha' || sub.userType === 'owner' 
                                                                                ? 'bg-purple-100 text-purple-700' 
                                                                                : 'bg-blue-100 text-blue-700'
                                                                            }`}>
                                                                                {sub.userType === 'saha' || sub.userType === 'owner' ? <Building2 size={10} /> : <Users size={10} />}
                                                                                {sub.userType === 'saha' || sub.userType === 'owner' ? 'Tesis' : 'Oyuncu'}
                                                                            </span>
                                                                        </td>
                                                                        <td className="py-4 px-6">
                                                                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-full text-xs font-bold font-mono">
                                                                                <Crown size={10} />
                                                                                {sub.planName || 'Bilinmiyor'}
                                                                            </span>
                                                                        </td>
                                                                        <td className="py-4 px-6">
                                                                            <div className="flex flex-col text-sm">
                                                                                <span className="text-gray-900 font-medium">{startDate.toLocaleDateString('tr-TR')}</span>
                                                                                <span className="text-gray-400 text-xs">Bitiş: {endDate.toLocaleDateString('tr-TR')}</span>
                                                                            </div>
                                                                        </td>
                                                                        <td className="py-4 px-6">
                                                                            {isExpired ? (
                                                                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-bold">
                                                                                    <Clock size={12} /> Süresi Doldu
                                                                                </span>
                                                                            ) : (
                                                                                 <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${
                                                                                    sub.status === 'active' ? 'bg-green-100 text-green-700' :
                                                                                    sub.status === 'cancelled' ? 'bg-gray-100 text-gray-600' : 'bg-red-100 text-red-700'
                                                                                 }`}>
                                                                                    {sub.status === 'active' ? <CheckCircle size={12} /> : <Ban size={12} />}
                                                                                    {sub.status === 'active' ? 'Aktif' : sub.status === 'cancelled' ? 'İptal' : 'Pasif'}
                                                                                </span>
                                                                            )}
                                                                        </td>
                                                                        <td className="py-4 px-6 text-right">
                                                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                                {/* Actions */}
                                                                                {sub.status === 'active' && !isExpired && (
                                                                                     <button 
                                                                                        onClick={() => handleCancelMember(sub.id)}
                                                                                        className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors" title="İptal Et"
                                                                                     >
                                                                                         <Ban size={16} />
                                                                                     </button>
                                                                                )}
                                                                                <button 
                                                                                    onClick={() => { setEditingMember(sub); setShowMemberEditor(true); }}
                                                                                    className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors" title="Düzenle"
                                                                                >
                                                                                    <Edit size={16} />
                                                                                </button>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })
                                                        ) : (
                                                             <tr>
                                                                 <td colSpan="6" className="text-center py-12 text-gray-500 bg-gray-50/30">
                                                                    <div className="flex flex-col items-center">
                                                                        <Users className="w-12 h-12 text-gray-300 mb-2" />
                                                                        <span className="font-medium">Abone bulunamadı.</span>
                                                                        <span className="text-xs mt-1">Filtreleri kontrol edin veya yeni abone ekleyin.</span>
                                                                    </div>
                                                                 </td>
                                                             </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Package Editor Modal */}
                        {showPackageEditor && (
                            <PackageEditor
                                package={editingPackage}
                                onClose={() => setShowPackageEditor(false)}
                                onSave={handleSavePackage}
                            />
                        )}

                        {/* Member Editor Modal (New/Edit) */}
                        {showMemberEditor && (
                            <MemberEditor
                                member={editingMember}
                                packages={packages}
                                allUsers={allUsers}
                                onClose={() => setShowMemberEditor(false)}
                                onSave={handleSaveMember}
                            />
                        )}
                        
                    </div>
                </main>
            </div>
        </div>
    );
};

// --- SUBCOMPONENTS ---

const StatsCard = ({ title, value, icon, color, detail }) => {
    const colorClasses = {
        blue: 'bg-blue-50 text-blue-600',
        yellow: 'bg-yellow-50 text-yellow-600',
        green: 'bg-green-50 text-green-600',
        purple: 'bg-purple-50 text-purple-600',
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 flex items-start justify-between shadow-sm hover:shadow-md transition-shadow">
            <div>
                <div className="text-sm font-medium text-gray-500 mb-1">{title}</div>
                <div className="text-3xl font-bold text-gray-900 tracking-tight">{value}</div>
                {detail && <div className="text-xs text-gray-400 mt-2">{detail}</div>}
            </div>
            <div className={`p-4 rounded-xl ${colorClasses[color]}`}>
                {React.cloneElement(icon, { size: 24 })}
            </div>
        </div>
    );
};

const PackageEditor = ({ package: pkg, onClose, onSave }) => {
    const [formData, setFormData] = useState(pkg || {
        name: '',
        type: 'PLAYER',
        price: 0,
        duration: 30,
        features: [''],
        isPopular: false,
        isActive: true,
    });

    const handleFeatureChange = (index, value) => {
        const newFeatures = [...(formData.features || [])];
        newFeatures[index] = value;
        setFormData({ ...formData, features: newFeatures });
    };

    const addFeature = () => {
        setFormData({ ...formData, features: [...(formData.features || []), ''] });
    };

    const removeFeature = (index) => {
        const newFeatures = (formData.features || []).filter((_, i) => i !== index);
        setFormData({ ...formData, features: newFeatures });
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
            <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h2 className="text-xl font-bold text-gray-900">
                        {pkg ? 'Paketi Düzenle' : 'Yeni Paket Oluştur'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6 space-y-5">
                    <div>
                        <label className="text-sm font-bold text-gray-700 block mb-2">Paket Adı</label>
                        <input
                            type="text"
                            value={formData.name || ''}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all font-medium"
                            placeholder="Örn: Oyuncu Pro"
                        />
                    </div>

                    <div>
                        <label className="text-sm font-bold text-gray-700 block mb-2">Hedef Kitle</label>
                        <select
                            value={formData.type || 'PLAYER'}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all font-medium"
                        >
                            <option value="PLAYER">Oyuncu (Bireysel)</option>
                            <option value="OWNER">Tesis Sahibi (Kurumsal)</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-bold text-gray-700 block mb-2">Fiyat (₺)</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₺</span>
                                <input
                                    type="number"
                                    value={formData.price || 0}
                                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                                    className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all font-bold"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-sm font-bold text-gray-700 block mb-2">Süre (Gün)</label>
                            <input
                                type="number"
                                value={formData.duration || 30}
                                onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-bold text-gray-700 block mb-2">Özellikler Listesi</label>
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                            {(formData.features || []).map((feature, i) => (
                                <div key={i} className="flex gap-2">
                                    <input
                                        type="text"
                                        value={feature}
                                        onChange={(e) => handleFeatureChange(i, e.target.value)}
                                        className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 text-sm"
                                        placeholder="Özellik..."
                                    />
                                    <button
                                        onClick={() => removeFeature(i)}
                                        className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                            <button
                                onClick={addFeature}
                                className="w-full py-2 border-2 border-dashed border-gray-200 rounded-lg text-gray-500 hover:border-green-500 hover:text-green-600 transition-colors text-sm font-medium"
                            >
                                + Özellik Ekle
                            </button>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-gray-100 mt-4">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3.5 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                        >
                            Vazgeç
                        </button>
                        <button
                            onClick={() => onSave(formData)}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-200"
                        >
                            <Save size={18} /> Kaydet
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const MemberEditor = ({ member, packages, allUsers, onClose, onSave }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUser, setSelectedUser] = useState(member ? { id: member.userId, ...member.user } : null);
    const [formData, setFormData] = useState({
        userId: member?.userId || '',
        planId: member?.planId || '',
        startDate: member ? (member.startDate?.toDate ? new Date(member.startDate.toDate()).toISOString().substring(0, 10) : new Date(member.startDate).toISOString().substring(0, 10)) : new Date().toISOString().substring(0, 10),
        customDays: '',
        status: member?.status || 'active'
    });

    const filteredUsers = searchTerm ? allUsers.filter(u => 
        u.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        u.email?.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 5) : [];

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
            <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h2 className="text-xl font-bold text-gray-900">
                        {member ? 'Üyeliği Düzenle' : 'Yeni Üyelik Ekle'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6 space-y-6">
                    
                    {/* User Selection */}
                    {!member ? (
                         <div className="relative">
                            <label className="text-sm font-bold text-gray-700 block mb-2">Kullanıcı Seç</label>
                            {selectedUser ? (
                                <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-green-200 rounded-full flex items-center justify-center text-green-700 font-bold">
                                            {selectedUser.fullName?.[0] || 'U'}
                                        </div>
                                        <div>
                                            <div className="font-bold text-gray-900 text-sm">{selectedUser.fullName}</div>
                                            <div className="text-xs text-green-700">{selectedUser.email}</div>
                                        </div>
                                    </div>
                                    <button onClick={() => { setSelectedUser(null); setFormData({...formData, userId: ''}); }} className="p-1 hover:bg-green-200 rounded-full text-green-700">
                                        <X size={16} />
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                        <input 
                                            type="text"
                                            placeholder="İsim veya e-posta ile ara..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20"
                                        />
                                    </div>
                                    {searchTerm && (
                                        <div className="absolute top-full left-0 right-0 bg-white border border-gray-100 shadow-xl rounded-xl mt-1 z-10 max-h-48 overflow-y-auto">
                                            {filteredUsers.length > 0 ? filteredUsers.map(user => (
                                                <div 
                                                    key={user.id} 
                                                    onClick={() => { 
                                                        setSelectedUser(user); 
                                                        setFormData({...formData, userId: user.id});
                                                        setSearchTerm('');
                                                    }}
                                                    className="p-3 hover:bg-gray-50 cursor-pointer flex items-center gap-3 border-b border-gray-50 last:border-0"
                                                >
                                                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 font-bold">
                                                        {user.fullName?.[0]}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-gray-900 text-sm">{user.fullName}</div>
                                                        <div className="text-xs text-gray-500">{user.email}</div>
                                                    </div>
                                                </div>
                                            )) : (
                                                <div className="p-4 text-center text-gray-400 text-sm">Kullanıcı bulunamadı</div>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                         </div>
                    ) : (
                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                            <div className="text-sm text-gray-500 mb-1">Seçili Kullanıcı</div>
                            <div className="font-bold text-gray-900">{selectedUser?.fullName || member.userId}</div>
                            <div className="text-xs text-gray-500">{selectedUser?.email}</div>
                        </div>
                    )}

                    {/* Plan Selection */}
                    <div>
                        <label className="text-sm font-bold text-gray-700 block mb-2">Paket</label>
                        <select
                            value={formData.planId}
                            onChange={(e) => setFormData({ ...formData, planId: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20 bg-white"
                            disabled={!!member} // Can't change plan on edit mostly due to logic complexity, usually requires cancel & new
                        >
                            <option value="">Paket Seçin...</option>
                            {packages.filter(p => p.isActive).map(pkg => (
                                <option key={pkg.id} value={pkg.id}>
                                    {pkg.name} - ₺{pkg.price} ({pkg.type === 'PLAYER' ? 'Oyuncu' : 'Tesis'})
                                </option>
                            ))}
                        </select>
                         {member && <div className="text-xs text-gray-400 mt-1">Paket değişikliği için mevcut üyeliği iptal edip yeni oluşturun.</div>}
                    </div>

                    {/* Date & Duration */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-bold text-gray-700 block mb-2">Başlangıç Tarihi</label>
                            <input
                                type="date"
                                value={formData.startDate}
                                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20"
                                disabled={!!member}
                            />
                        </div>
                         {/* Only for new membership */}
                        {!member && (
                             <div>
                                <label className="text-sm font-bold text-gray-700 block mb-2">Özel Süre (Gün)</label>
                                <input
                                    type="number"
                                    placeholder="Varsayılan"
                                    value={formData.customDays}
                                    onChange={(e) => setFormData({ ...formData, customDays: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20"
                                />
                            </div>
                        )}
                        {/* Only for editing membership */}
                        {member && (
                             <div>
                                <label className="text-sm font-bold text-gray-700 block mb-2">Durum</label>
                                <select
                                     value={formData.status}
                                     onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                     className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20 bg-white"
                                >
                                    <option value="active">Aktif</option>
                                    <option value="cancelled">İptal Edildi</option>
                                    <option value="expired">Süresi Doldu</option>
                                </select>
                             </div>
                        )}
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-gray-100 mt-4">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3.5 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                        >
                            Vazgeç
                        </button>
                        <button
                            onClick={() => onSave({ ...formData, id: member?.id })}
                            disabled={!formData.userId || !formData.planId}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-200 disabled:opacity-50 disabled:shadow-none"
                        >
                            <Save size={18} /> {member ? 'Güncelle' : 'Oluştur'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Premium;
