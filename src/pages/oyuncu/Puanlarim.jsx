import React, { useState, useEffect } from 'react';
import { 
  Star, ThumbsUp, ThumbsDown, User, Calendar,
  MessageSquare, Filter, TrendingUp, Loader2, Award, Users
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import OyuncuSidebar from '../../components/OyuncuSidebar';
import toast from '../../utils/toast';

const Puanlarim = () => {
  const { user, userData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [ratings, setRatings] = useState([]);
  const [stats, setStats] = useState({
    overallRating: 0,
    totalRatings: 0,
    positivePercentage: 0,
    criteria: {
      skill: 0,
      teamwork: 0,
      sportsmanship: 0,
      punctuality: 0
    }
  });
  const [filter, setFilter] = useState('all'); // all, positive, negative

  useEffect(() => {
    if (user) {
      loadRatings();
    }
  }, [user]);

  const loadRatings = async () => {
    try {
      setLoading(true);

      // 1. Kullanıcı profilinden genel istatistikleri al
      const userStats = {
        overallRating: userData?.rating || 0,
        totalRatings: userData?.ratingCount || 0,
        positivePercentage: 0,
        criteria: {
          skill: userData?.skillRating || 0,
          teamwork: userData?.teamworkRating || 0,
          sportsmanship: userData?.sportsmanshipRating || 0,
          punctuality: userData?.punctualityRating || 0
        }
      };

      // 2. Değerlendirmeleri Firestore'dan çek
      const ratingsRef = collection(db, 'ratings');
      const ratingsQuery = query(
        ratingsRef,
        where('ratedUserId', '==', user.uid),
        orderBy('createdAt', 'desc'),
        limit(50)
      );

      let fetchedRatings = [];
      let positiveCount = 0;
      let totalSkill = 0, totalTeamwork = 0, totalSportsmanship = 0, totalPunctuality = 0;

      try {
        const ratingsSnap = await getDocs(ratingsQuery);
        
        for (const docSnap of ratingsSnap.docs) {
          const data = docSnap.data();
          
          // Değerlendirme yapan kişinin bilgilerini al
          let raterName = 'Anonim';
          let raterPhoto = null;
          
          if (data.raterId) {
            try {
              const raterDoc = await getDoc(doc(db, 'users', data.raterId));
              if (raterDoc.exists()) {
                const raterData = raterDoc.data();
                raterName = raterData.displayName || raterData.name || 'Oyuncu';
                raterPhoto = raterData.photoURL;
                // İsmin sadece baş harflerini göster (gizlilik için)
                const nameParts = raterName.split(' ');
                if (nameParts.length >= 2) {
                  raterName = `${nameParts[0]} ${nameParts[1].charAt(0)}.`;
                }
              }
            } catch (e) {
              console.log('Rater bilgisi alınamadı:', e);
            }
          }

          const rating = {
            id: docSnap.id,
            raterName,
            raterPhoto,
            raterId: data.raterId,
            date: data.createdAt?.toDate ? data.createdAt.toDate().toISOString().split('T')[0] : 
                  new Date(data.createdAt).toISOString().split('T')[0],
            overallRating: data.overallRating || data.rating || 0,
            criteria: {
              skill: data.skillRating || data.criteria?.skill || 0,
              teamwork: data.teamworkRating || data.criteria?.teamwork || 0,
              sportsmanship: data.sportsmanshipRating || data.criteria?.sportsmanship || 0,
              punctuality: data.punctualityRating || data.criteria?.punctuality || 0
            },
            comment: data.comment || data.review || '',
            matchId: data.matchId || data.reservationId,
            isPositive: (data.overallRating || data.rating || 0) >= 3
          };

          fetchedRatings.push(rating);
          
          // İstatistikler için hesapla
          if (rating.isPositive) positiveCount++;
          totalSkill += rating.criteria.skill;
          totalTeamwork += rating.criteria.teamwork;
          totalSportsmanship += rating.criteria.sportsmanship;
          totalPunctuality += rating.criteria.punctuality;
        }

        // Eğer ratings collection'dan veri geldiyse, ortalama hesapla
        if (fetchedRatings.length > 0) {
          const count = fetchedRatings.length;
          userStats.totalRatings = count;
          userStats.positivePercentage = Math.round((positiveCount / count) * 100);
          userStats.criteria = {
            skill: Number((totalSkill / count).toFixed(1)),
            teamwork: Number((totalTeamwork / count).toFixed(1)),
            sportsmanship: Number((totalSportsmanship / count).toFixed(1)),
            punctuality: Number((totalPunctuality / count).toFixed(1))
          };
          // Genel ortalama hesapla
          const avgAll = fetchedRatings.reduce((sum, r) => sum + r.overallRating, 0) / count;
          userStats.overallRating = Number(avgAll.toFixed(1));
        } else {
          // Ratings collection boşsa, userData'dan al
          userStats.positivePercentage = userStats.overallRating >= 3 ? 100 : 0;
        }

      } catch (queryError) {
        console.log('Ratings sorgusu hatası (indeks gerekebilir):', queryError.message);
        // Index yoksa sadece userData'dan gelen verileri kullan
      }

      setRatings(fetchedRatings);
      setStats(userStats);

    } catch (error) {
      console.error('Puanlar yükleme hatası:', error);
      toast.error('Puanlar yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // Filtrelenmiş değerlendirmeler
  const filteredRatings = ratings.filter(rating => {
    if (filter === 'positive') return rating.isPositive;
    if (filter === 'negative') return !rating.isPositive;
    return true;
  });

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <OyuncuSidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-10 h-10 animate-spin text-green-600 mx-auto mb-4" />
            <p className="text-gray-600">Puanlarınız yükleniyor...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <OyuncuSidebar />
      
      <div className="flex-1 overflow-y-auto p-6 lg:p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Puanlarım</h1>
              <p className="text-sm text-gray-500 mt-1">Diğer oyunculardan aldığınız değerlendirmeler</p>
            </div>
          </div>

          {/* Overall Rating Card */}
          <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-6xl font-bold">{stats.overallRating || '0.0'}</p>
                  <div className="flex items-center justify-center gap-1 mt-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={20}
                        className={star <= Math.round(stats.overallRating) ? 'text-white fill-white' : 'text-white/40'}
                      />
                    ))}
                  </div>
                </div>
                <div className="hidden md:block w-px h-20 bg-white/30"></div>
                <div>
                  <p className="text-yellow-100 text-sm">Toplam {stats.totalRatings} değerlendirme</p>
                  <div className="flex items-center gap-2 mt-2">
                    <ThumbsUp size={16} className="text-white" />
                    <span className="font-bold">{stats.positivePercentage}% olumlu</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/20 rounded-xl p-4 text-center backdrop-blur-sm">
                  <p className="text-2xl font-bold">{stats.criteria.skill || '0.0'}</p>
                  <p className="text-xs text-yellow-100">Yetenek</p>
                </div>
                <div className="bg-white/20 rounded-xl p-4 text-center backdrop-blur-sm">
                  <p className="text-2xl font-bold">{stats.criteria.teamwork || '0.0'}</p>
                  <p className="text-xs text-yellow-100">Takım Oyunu</p>
                </div>
                <div className="bg-white/20 rounded-xl p-4 text-center backdrop-blur-sm">
                  <p className="text-2xl font-bold">{stats.criteria.sportsmanship || '0.0'}</p>
                  <p className="text-xs text-yellow-100">Sportmenlik</p>
                </div>
                <div className="bg-white/20 rounded-xl p-4 text-center backdrop-blur-sm">
                  <p className="text-2xl font-bold">{stats.criteria.punctuality || '0.0'}</p>
                  <p className="text-xs text-yellow-100">Dakiklik</p>
                </div>
              </div>
            </div>
          </div>

          {/* Criteria Breakdown */}
          <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp size={18} className="text-green-600" />
              Kriter Dağılımı
            </h3>
            <div className="space-y-4">
              {[
                { label: 'Yetenek', value: stats.criteria.skill, color: 'bg-blue-500', icon: '⚽' },
                { label: 'Takım Oyunu', value: stats.criteria.teamwork, color: 'bg-green-500', icon: '🤝' },
                { label: 'Sportmenlik', value: stats.criteria.sportsmanship, color: 'bg-yellow-500', icon: '🏅' },
                { label: 'Dakiklik', value: stats.criteria.punctuality, color: 'bg-purple-500', icon: '⏰' },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <span>{item.icon}</span>
                      {item.label}
                    </span>
                    <span className="text-sm font-bold text-gray-900">{item.value}/5</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.color} rounded-full transition-all`}
                      style={{ width: `${(item.value / 5) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Ratings */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Son Değerlendirmeler</h3>
              <div className="flex gap-2">
                {['all', 'positive', 'negative'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                      filter === f 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {f === 'all' && <Filter size={12} />}
                    {f === 'positive' && <ThumbsUp size={12} />}
                    {f === 'negative' && <ThumbsDown size={12} />}
                    {f === 'all' ? 'Tümü' : f === 'positive' ? 'Olumlu' : 'Olumsuz'}
                  </button>
                ))}
              </div>
            </div>
            
            {filteredRatings.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {filteredRatings.map((rating) => (
                  <div key={rating.id} className="p-5 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
                        {rating.raterPhoto ? (
                          <img src={rating.raterPhoto} alt={rating.raterName} className="w-full h-full object-cover" />
                        ) : (
                          <User size={18} className="text-gray-500" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900">{rating.raterName}</span>
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <Calendar size={10} />
                              {new Date(rating.date).toLocaleDateString('tr-TR')}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                size={14}
                                className={star <= rating.overallRating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}
                              />
                            ))}
                          </div>
                        </div>
                        {rating.comment && (
                          <p className="text-sm text-gray-600 mt-2">{rating.comment}</p>
                        )}
                        <div className="flex items-center gap-3 mt-3">
                          <div className="flex gap-2 flex-wrap">
                            {Object.entries(rating.criteria).map(([key, value]) => (
                              value > 0 && (
                                <span key={key} className="px-2 py-1 bg-gray-50 rounded text-[10px] text-gray-500">
                                  {key === 'skill' ? 'Yetenek' :
                                    key === 'teamwork' ? 'Takım' :
                                      key === 'sportsmanship' ? 'Fair-play' : 'Dakiklik'}: {value}
                                </span>
                              )
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center">
                <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star size={32} className="text-gray-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-700 mb-2">Henüz Değerlendirme Yok</h3>
                <p className="text-sm text-gray-500 max-w-md mx-auto">
                  Maçlardan sonra diğer oyuncular sizi değerlendirecek. 
                  Maç yaptıkça puanlarınız burada görünecek!
                </p>
              </div>
            )}
          </div>

          {/* Rating Tips */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100">
            <h3 className="font-bold text-green-800 mb-3 flex items-center gap-2">
              <Award size={18} />
              Puanınızı Nasıl Yükseltirsiniz?
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">⏰</span>
                <div>
                  <p className="font-medium text-green-800">Dakik Olun</p>
                  <p className="text-sm text-green-600">Maçlara zamanında katılın</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-2xl">🤝</span>
                <div>
                  <p className="font-medium text-green-800">Takım Oyuncusu Olun</p>
                  <p className="text-sm text-green-600">Takım arkadaşlarınızla uyumlu oynayın</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-2xl">🏅</span>
                <div>
                  <p className="font-medium text-green-800">Sportmen Davranın</p>
                  <p className="text-sm text-green-600">Fair-play kurallarına uyun</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-2xl">⚽</span>
                <div>
                  <p className="font-medium text-green-800">Yeteneklerinizi Geliştirin</p>
                  <p className="text-sm text-green-600">Sürekli pratik yaparak gelişin</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Puanlarim;
