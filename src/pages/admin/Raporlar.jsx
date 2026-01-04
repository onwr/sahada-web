import React, { useState, useEffect } from 'react';
import { getAllReservations, getAllUsers, getAllTesislerAdmin } from '../../services/firestoreService';
import AdminSidebar from '../../components/AdminSidebar';
import { 
    Calendar, TrendingUp, TrendingDown, Users,
    Building2, Wallet, BarChart2, PieChart
} from 'lucide-react';
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
import { Bar, Doughnut } from 'react-chartjs-2';

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

const Raporlar = () => {
    // States
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        revenue: 0,
        reservations: 0,
        users: 0,
        facilities: 0
    });
    const [monthlyRevenue, setMonthlyRevenue] = useState([]);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            setLoading(true);
            const [usersRes, facilitiesRes, reservationsRes] = await Promise.all([
                getAllUsers(),
                getAllTesislerAdmin(),
                getAllReservations()
            ]);

            const users = usersRes.success ? usersRes.data : [];
            const facilities = facilitiesRes.success ? facilitiesRes.data : [];
            const reservations = reservationsRes.success ? reservationsRes.data : [];

            // Calculate Stats
            const totalRevenue = reservations.reduce((sum, r) => sum + (Number(r.totalAmount) || Number(r.price) || 0), 0);
            
            setStats({
                revenue: totalRevenue,
                reservations: reservations.length,
                users: users.length,
                facilities: facilities.length
            });

            // Calculate Monthly Revenue (Last 12 months)
            const revenueData = new Array(12).fill(0);

            reservations.forEach(r => {
                const d = r.date?.toDate ? r.date.toDate() : new Date(r.date);
                const month = d.getMonth(); // 0-11
                if (!isNaN(month)) {
                    revenueData[month] += (Number(r.totalAmount) || Number(r.price) || 0);
                }
            });

            setMonthlyRevenue(revenueData);
            setLoading(false);
        } catch (error) {
            console.error("Dashboard yüklenirken hata:", error);
            setLoading(false);
        }
    };

    // Chart Data
    const barChartData = {
        labels: ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'],
        datasets: [{
            label: 'Aylık Gelir (₺)',
            data: monthlyRevenue,
            backgroundColor: 'rgba(34, 197, 94, 0.6)',
            borderColor: 'rgba(34, 197, 94, 1)',
            borderWidth: 1,
            borderRadius: 4
        }]
    };

    const doughnutData = {
        labels: ['Rezervasyon', 'Premium', 'Diğer'],
        datasets: [{
            data: [stats.revenue * 0.8, stats.revenue * 0.15, stats.revenue * 0.05], // Mock distribution
            backgroundColor: ['#10B981', '#3B82F6', '#F59E0B'],
            borderWidth: 0
        }]
    };

    if (loading) {
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
                    <div className="space-y-6 max-w-[1600px] mx-auto">
                        
                        {/* Header */}
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Raporlar ve Analizler</h1>
                                <p className="text-sm text-gray-500 mt-1">Sistem performansını izleyin ve istatistikleri görüntüleyin</p>
                            </div>
                        </div>

                        {/* Quick Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <QuickStatCard
                                title="Toplam Gelir"
                                value={`₺${stats.revenue.toLocaleString('tr-TR')}`}
                                change="+12%"
                                isPositive={true}
                                icon={<Wallet />}
                                color="green"
                            />
                            <QuickStatCard
                                title="Toplam Rezervasyon"
                                value={stats.reservations.toLocaleString('tr-TR')}
                                change="+8%"
                                isPositive={true}
                                icon={<Calendar />}
                                color="blue"
                            />
                            <QuickStatCard
                                title="Kayıtlı Kullanıcı"
                                value={stats.users.toLocaleString('tr-TR')}
                                change="+15%"
                                isPositive={true}
                                icon={<Users />}
                                color="purple"
                            />
                            <QuickStatCard
                                title="Aktif Tesis"
                                value={stats.facilities.toString()}
                                change="+5%"
                                isPositive={true}
                                icon={<Building2 />}
                                color="orange"
                            />
                        </div>

                        {/* Charts Area */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Revenue Chart */}
                            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                                <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
                                    <BarChart2 size={20} className="text-gray-400" />
                                    Yıllık Gelir Trendi
                                </h3>
                                <div className="h-64">
                                    <Bar 
                                        data={barChartData} 
                                        options={{
                                            responsive: true,
                                            maintainAspectRatio: false,
                                            plugins: { legend: { display: false } },
                                            scales: {
                                                y: { beginAtZero: true, grid: { color: '#f3f4f6' } },
                                                x: { grid: { display: false } }
                                            }
                                        }} 
                                    />
                                </div>
                            </div>

                            {/* Distribution Chart */}
                            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                                <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
                                    <PieChart size={20} className="text-gray-400" />
                                    Gelir Dağılımı
                                </h3>
                                <div className="h-48 flex justify-center relative">
                                    <Doughnut 
                                        data={doughnutData} 
                                        options={{
                                            responsive: true,
                                            maintainAspectRatio: false,
                                            cutout: '70%',
                                            plugins: { legend: { display: false } }
                                        }} 
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                                        <span className="text-xs text-gray-400 font-medium">Toplam</span>
                                        <span className="text-lg font-bold text-gray-900">₺{stats.revenue.toLocaleString('tr-TR', { notation: "compact" })}</span>
                                    </div>
                                </div>
                                <div className="mt-6 space-y-3">
                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                            <span className="w-3 h-3 rounded-full bg-green-500"></span>
                                            <span className="text-gray-600">Rezervasyonlar</span>
                                        </div>
                                        <span className="font-bold text-gray-900">80%</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                            <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                                            <span className="text-gray-600">Premium Üyelik</span>
                                        </div>
                                        <span className="font-bold text-gray-900">15%</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                            <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                                            <span className="text-gray-600">Diğer</span>
                                        </div>
                                        <span className="font-bold text-gray-900">5%</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </main>
            </div>
        </div>
    );
};

// Subcomponents
const QuickStatCard = ({ title, value, change, isPositive, icon, color }) => {
    const colorClasses = {
        green: 'bg-green-50 text-green-600',
        blue: 'bg-blue-50 text-blue-600',
        purple: 'bg-purple-50 text-purple-600',
        orange: 'bg-orange-50 text-orange-600'
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-bold text-gray-500">{title}</span>
                <span className={`p-3 rounded-xl ${colorClasses[color]}`}>
                    {React.cloneElement(icon, { size: 20 })}
                </span>
            </div>
            <div className="text-3xl font-black text-gray-900 mb-2 tracking-tight">{value}</div>
            <div className={`flex items-center gap-1.5 text-xs font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {change} geçen aya göre
            </div>
        </div>
    );
};

export default Raporlar;
