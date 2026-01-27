import React from 'react';
import { Shield, Lock, Eye, FileText, Server, Globe, Mail } from 'lucide-react';
import Footer from '../components/Footer'; // Assuming you have a Footer component

const GizlilikSozlesmesi = () => {
  const lastUpdated = "10 Ocak 2026";

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 text-white pt-24 pb-16 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
           <div className="absolute top-10 left-10 w-64 h-64 rounded-full bg-white blur-3xl"></div>
           <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-white blur-3xl"></div>
        </div>
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 relative z-10 text-center">
          <div className="inline-flex items-center justify-center p-3 bg-white/10 backdrop-blur-sm rounded-full mb-6">
            <Shield className="w-8 h-8 text-green-300" />
          </div>
          <h1 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight">Gizlilik Sözleşmesi</h1>
          <p className="text-lg md:text-xl text-green-100 max-w-2xl mx-auto">
            Verilerinizin güvenliği bizim için en önemli önceliktir. Şeffaflık ve güven ilkelerine dayalı gizlilik politikamızı aşağıda bulabilirsiniz.
          </p>
          <div className="mt-6 text-sm text-green-200 font-medium">
            Son Güncelleme: {lastUpdated}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 -mt-8">
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 mb-12 border border-gray-100">
          
          {/* Introduction */}
          <div className="prose prose-lg prose-green max-w-none text-gray-700">
            <p className="lead text-xl text-gray-800 font-medium mb-8">
              Saha Merkezi ("Şirket", "Biz") olarak, kullanıcılarımızın ("Kullanıcı", "Siz") gizliliğine büyük önem veriyoruz. Bu Gizlilik Sözleşmesi, platformumuzu kullanırken kişisel verilerinizin nasıl toplandığını, kullanıldığını, saklandığını ve korunduğunu açıklamaktadır.
            </p>

            <div className="grid md:grid-cols-2 gap-8 mb-12 not-prose">
                <div className="bg-green-50 p-6 rounded-xl border border-green-100">
                    <div className="flex items-center gap-3 mb-3">
                        <Lock className="w-5 h-5 text-green-600" />
                        <h3 className="font-bold text-gray-900">Güvenli Altyapı</h3>
                    </div>
                    <p className="text-sm text-gray-600">Verileriniz en güncel şifreleme teknolojileri ile korunmaktadır.</p>
                </div>
                <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
                    <div className="flex items-center gap-3 mb-3">
                        <Eye className="w-5 h-5 text-blue-600" />
                        <h3 className="font-bold text-gray-900">Şeffaf Süreçler</h3>
                    </div>
                    <p className="text-sm text-gray-600">Verilerinizin ne amaçla kullanıldığını her zaman açıkça belirtiyoruz.</p>
                </div>
            </div>

            <PrivacySection 
                number="1"
                title="Toplanan Veriler"
                icon={<FileText className="w-5 h-5" />}
            >
                <p>Hizmetlerimizi sunabilmek için aşağıdaki veri türlerini toplayabiliriz:</p>
                <ul className="list-disc pl-5 space-y-2 mt-4">
                    <li><strong>Kimlik Bilgileri:</strong> Ad, soyad, T.C. kimlik numarası (yasal zorunluluk halinde).</li>
                    <li><strong>İletişim Bilgileri:</strong> E-posta adresi, telefon numarası, adres.</li>
                    <li><strong>İşlem Bilgileri:</strong> Rezervasyon geçmişi, ödeme kayıtları (kredi kartı bilgileri sistemimizde saklanmaz, ödeme altyapısı sağlayıcısı tarafından işlenir).</li>
                    <li><strong>Teknik Veriler:</strong> IP adresi, tarayıcı türü, cihaz bilgileri, çerezler ve kullanım verileri.</li>
                </ul>
            </PrivacySection>

            <PrivacySection 
                number="2"
                title="Verilerin Kullanım Amacı"
                icon={<Server className="w-5 h-5" />}
            >
                <p>Topladığımız verileri şu amaçlarla işliyoruz:</p>
                <ul className="list-disc pl-5 space-y-2 mt-4">
                    <li>Hizmetlerimizi sağlamak, rezervasyonları yönetmek ve müşteri desteği sunmak.</li>
                    <li>Yasal yükümlülüklerimizi yerine getirmek (fatura kesimi, vergi mevzuatı vb.).</li>
                    <li>Platform güvenliğini sağlamak ve dolandırıcılığı önlemek.</li>
                    <li>Hizmet kalitemizi artırmak için analiz ve raporlama yapmak.</li>
                    <li>Onay vermeniz halinde, size özel kampanyalar ve duyurular iletmek.</li>
                </ul>
            </PrivacySection>

            <PrivacySection 
                number="3"
                title="Çerez Politikası"
                icon={<Globe className="w-5 h-5" />}
            >
                <p>
                    Web sitemizde kullanıcı deneyimini iyileştirmek, site trafiğini analiz etmek ve kişiselleştirilmiş içerik sunmak amacıyla çerezler (cookies) kullanmaktayız. Çerezleri tarayıcı ayarlarınızdan dilediğiniz zaman devre dışı bırakabilirsiniz, ancak bu durumda sitenin bazı özellikleri tam çalışmayabilir.
                </p>
            </PrivacySection>

            <PrivacySection 
                number="4"
                title="Verilerin Paylaşımı"
                icon={<Shield className="w-5 h-5" />}
            >
                <p>Kişisel verileriniz, yasal zorunluluklar saklı kalmak kaydıyla, üçüncü taraflarla paylaşılmaz. Ancak aşağıdaki durumlarda paylaşım yapılabilir:</p>
                <ul className="list-disc pl-5 space-y-2 mt-4">
                    <li><strong>Yasal Otoriteler:</strong> Mahkeme kararı veya yasal düzenlemeler gereği yetkili kurumlarla.</li>
                    <li><strong>Hizmet Sağlayıcılar:</strong> Ödeme işlemleri için bankalar veya ödeme kuruluşları, SMS/E-posta gönderimi için altyapı sağlayıcıları (Gizlilik sözleşmeleri çerçevesinde).</li>
                </ul>
            </PrivacySection>

            <PrivacySection 
                number="5"
                title="Haklarınız (KVKK)"
                icon={<Lock className="w-5 h-5" />}
            >
                 <p>6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) uyarınca aşağıdaki haklara sahipsiniz:</p>
                 <ul className="list-disc pl-5 space-y-2 mt-4">
                    <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme.</li>
                    <li>İşlenen veriler hakkında bilgi talep etme.</li>
                    <li>Verilerin amacına uygun kullanılıp kullanılmadığını öğrenme.</li>
                    <li>Eksik veya yanlış işlenen verilerin düzeltilmesini isteme.</li>
                    <li>KVKK şartları çerçevesinde verilerin silinmesini veya yok edilmesini talep etme.</li>
                 </ul>
            </PrivacySection>

            <PrivacySection 
                number="6"
                title="İletişim"
                icon={<Mail className="w-5 h-5" />}
            >
                <p>
                    Gizlilik politikamızla ilgili her türlü soru, görüş veya talebiniz için bizimle iletişime geçebilirsiniz.
                </p>
                <div className="mt-6 bg-gray-50 p-6 rounded-lg border border-gray-200">
                    <p className="font-semibold text-gray-900">Saha Merkezi İletişim:</p>
                    <p className="mt-2 text-gray-600">E-posta: privacy@sahamerkezi.com</p>
                    <p className="text-gray-600">Adres: Teknoloji Vadisi, Yazılım Blokları No:12, İstanbul</p>
                </div>
            </PrivacySection>

          </div>
        </div>
      </div>
      
      <div className="bg-white border-t border-gray-100 py-12">
        <Footer />
      </div>
    </div>
  );
};

// Reusable Section Component
const PrivacySection = ({ number, title, icon, children }) => (
    <div className="mb-10 last:mb-0">
        <div className="flex items-center gap-3 mb-4">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-700 font-bold text-sm">
                {number}
            </span>
            <div className="flex items-center gap-2">
                <span className="text-green-600">{icon}</span>
                <h2 className="text-2xl font-bold text-gray-900 m-0">{title}</h2>
            </div>
        </div>
        <div className="pl-11 text-gray-600 leading-relaxed">
            {children}
        </div>
    </div>
);

export default GizlilikSozlesmesi;
