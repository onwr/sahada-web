import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Onboard from '../pages/oyuncu/Onboard';
import Dashboard from '../pages/oyuncu/Dashboard';
import Rezervasyonlar from '../pages/oyuncu/Rezervasyonlar';
import Sahalar from '../pages/oyuncu/Sahalar';
import SahaDetay from '../pages/oyuncu/SahaDetay';
import Profil from '../pages/oyuncu/Profil';
import Ekip from '../pages/oyuncu/Ekip';
import Turnuvalar from '../pages/oyuncu/Turnuvalar';
import Bildirimler from '../pages/oyuncu/Bildirimler';
import Faturalar from '../pages/oyuncu/Faturalar';
import Oyuncular from '../pages/oyuncu/Oyuncular';
import Ayarlar from '../pages/oyuncu/Ayarlar';
import OyuncuBul from '../pages/oyuncu/OyuncuBul';
import MacOlustur from '../pages/oyuncu/MacOlustur';
import Destek from '../pages/oyuncu/Destek';
import Mesajlar from '../pages/oyuncu/Mesajlar';
import Rozetlerim from '../pages/oyuncu/Rozetlerim';
import Puanlarim from '../pages/oyuncu/Puanlarim';
import Rezervasyon from '../pages/Rezervasyon';

const OyuncuLayout = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        <Route path="" element={<Navigate to="dashboard" replace />} />
        <Route path="/onboarding" element={<Onboard />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/rezervasyonlar" element={<Rezervasyonlar />} />
        <Route path="/sahalar" element={<Sahalar />} />
        <Route path="/saha-detay/:id" element={<SahaDetay />} />
        <Route path="/rezervasyon/:id" element={<Rezervasyon inPanel={true} />} />
        <Route path="/profil" element={<Profil />} />
        <Route path="/ekip" element={<Ekip />} />
        <Route path="/turnuvalar" element={<Turnuvalar />} />
        <Route path="/rozetlerim" element={<Rozetlerim />} />
        <Route path="/puanlarim" element={<Puanlarim />} />
        <Route path="/mesajlar" element={<Mesajlar />} />
        <Route path="/bildirimler" element={<Bildirimler />} />
        <Route path="/faturalar" element={<Faturalar />} />
        <Route path="/oyuncular" element={<Oyuncular />} />
        <Route path="/ayarlar" element={<Ayarlar />} />
        <Route path="/oyuncu-bul" element={<OyuncuBul />} />
        <Route path="/mac-olustur" element={<MacOlustur />} />
        <Route path="/destek" element={<Destek />} />
      </Routes>
    </div>
  );
};

export default OyuncuLayout;
