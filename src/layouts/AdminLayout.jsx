import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AdminNotification from '../components/AdminNotification';
import Dashboard from '../pages/admin/Dashboard';
import Tesisler from '../pages/admin/Tesisler';
import Kullanicilar from '../pages/admin/Kullanicilar';
import Rezervasyonlar from '../pages/admin/Rezervasyonlar';
import Sikayetler from '../pages/admin/Sikayetler';
import Finansal from '../pages/admin/Finansal';
import Premium from '../pages/admin/Premium';
import Raporlar from '../pages/admin/Raporlar';
import Marketing from '../pages/admin/Marketing';
import Destek from '../pages/admin/Destek';
import Blog from '../pages/admin/Blog';
import Hero from '../pages/admin/Hero';
import Ayarlar from '../pages/admin/Ayarlar';
import AuditLog from '../pages/admin/AuditLog';
import Turnuvalar from '../pages/admin/Turnuvalar';
import Pages from '../pages/admin/Pages';

const AdminLayout = () => {
  return (
    <>
      <AdminNotification />
      <Routes>
      <Route path="dashboard" element={<Dashboard />} />
      <Route path="tesisler" element={<Tesisler />} />
      <Route path="kullanicilar" element={<Kullanicilar />} />
      <Route path="rezervasyonlar" element={<Rezervasyonlar />} />
      <Route path="sikayetler" element={<Sikayetler />} />
      <Route path="finansal" element={<Finansal />} />
      <Route path="premium" element={<Premium />} />
      <Route path="raporlar" element={<Raporlar />} />
      <Route path="marketing" element={<Marketing />} />
      <Route path="destek" element={<Destek />} />
      <Route path="blog" element={<Blog />} />
      <Route path="hero" element={<Hero />} />
      <Route path="ayarlar" element={<Ayarlar />} />
      <Route path="audit-log" element={<AuditLog />} />
      <Route path="turnuvalar" element={<Turnuvalar />} />
      <Route path="pages" element={<Pages />} />
      <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
    </Routes>
    </>
  );
};

export default AdminLayout;

