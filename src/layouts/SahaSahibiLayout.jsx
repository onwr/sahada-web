import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import OnBoard from '../pages/saha-sahibi/OnBoard';
import Dashboard from '../pages/saha-sahibi/Dashboard';
import Rezervasyonlar from '../pages/saha-sahibi/Rezervasyonlar';
// Musteriler deleted
import Finansal from '../pages/saha-sahibi/Finansal';
import Raporlar from '../pages/saha-sahibi/Raporlar';
import Marketing from '../pages/saha-sahibi/Marketing';
import Turnuvalar from '../pages/saha-sahibi/Turnuvalar';
import Ayarlar from '../pages/saha-sahibi/Ayarlar';
import SahaYonetimi from '../pages/saha-sahibi/SahaYonetimi';
import SahaDetay from '../pages/saha-sahibi/SahaDetay';
import Premium from '../pages/saha-sahibi/Premium';
import CRM from '../pages/saha-sahibi/CRM';
import Destek from '../pages/saha-sahibi/Destek';
import Mesajlar from '../pages/saha-sahibi/Mesajlar';

const SahaSahibiLayout = () => {
  const { userData } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        <Route path="" element={<Navigate to="dashboard" replace />} />
        <Route path="/onboarding" element={<OnBoard />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/rezervasyonlar" element={<Rezervasyonlar />} />
        {/* Route path="/musteriler" element={<Musteriler />} */ }
        <Route path="/finansal" element={<Finansal />} />
        <Route path="/raporlar" element={<Raporlar />} />
        <Route path="/marketing" element={<Marketing />} />
        <Route path="/turnuvalar" element={<Turnuvalar />} />
        <Route path="/ayarlar" element={<Ayarlar />} />
        <Route path="/saha-yonetimi" element={<SahaYonetimi />} />
        <Route path="/saha-detay/:id" element={<SahaDetay />} />
        <Route path="/premium" element={<Premium />} />
        <Route path="/crm" element={<CRM />} />
        <Route path="/mesajlar" element={<Mesajlar />} />
        <Route path="/destek" element={<Destek />} />
      </Routes>
    </div>
  );
};

export default SahaSahibiLayout;
