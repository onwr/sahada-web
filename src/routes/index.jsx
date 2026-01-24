import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from '../pages/Home';
import Login from '../pages/LoginRegister';
import SahaDetay from '../pages/SahaDetay';
import Rezervasyon from '../pages/Rezervasyon';
import PaymentCallback from '../pages/PaymentCallback';
import OyuncuBul from '../pages/OyuncuBul';
import MacDetay from '../pages/MacDetay';
import YakinSahalar from '../pages/YakinSahalar';
import OyuncuDetay from '../pages/OyuncuDetay';
import Blog from '../pages/Blog';
import BlogDetail from '../pages/BlogDetail';
import Turnuvalar from '../pages/Turnuvalar';
import TestPanel from '../pages/TestPanel';
import OyuncuLayout from '../layouts/OyuncuLayout';
import SahaSahibiLayout from '../layouts/SahaSahibiLayout';
import AdminLayout from '../layouts/AdminLayout';
import AdminSetup from '../pages/admin/AdminSetup';
import ProtectedRoute from '../components/ProtectedRoute';
import PublicRoute from '../components/PublicRoute';
import ProductDetail from '../pages/ProductDetail';
import Community from '../pages/Community';
import Pricing from '../pages/Pricing';

import SahaSahibiLogin from '../pages/saha-sahibi/SahaSahibiLogin';
import DynamicPage from '../pages/DynamicPage';
import GizlilikSozlesmesi from '../pages/GizlilikSozlesmesi';

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/gizlilik-sozlesmesi" element={<GizlilikSozlesmesi />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/saha/:idOrSlug" element={<SahaDetay />} />
      <Route path="/saha-detay/:idOrSlug" element={<SahaDetay />} />
      <Route path="/rezervasyon/:id" element={<Rezervasyon />} />
      <Route path="/payment-callback" element={<PaymentCallback />} />
      <Route path="/oyuncu-bul" element={<OyuncuBul />} />
      <Route path="/mac-detay/:id" element={<MacDetay />} />
      <Route path="/yakin-sahalar" element={<YakinSahalar />} />
      <Route path="/oyuncu-detay/:idOrSlug" element={<OyuncuDetay />} />
      <Route path="/blog" element={<Blog />} />
      <Route path="/blog/:slug" element={<BlogDetail />} />
      <Route path="/turnuvalar" element={<Turnuvalar />} />
      <Route path="/test" element={<TestPanel />} />
      <Route path="/market/product/:id" element={<ProductDetail />} />
      <Route path="/meydan" element={<Community />} />
      <Route path="/page/:slug" element={<DynamicPage />} />
      <Route path="/:slug" element={<DynamicPage />} />
      <Route 
        path="/login" 
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        } 
      />
      <Route 
        path="/saha-sahibi-login" 
        element={
          <PublicRoute>
            <SahaSahibiLogin />
          </PublicRoute>
        } 
      />
      
      {/* Oyuncu Route'ları */}
      <Route 
        path="/oyuncu/*" 
        element={
          <ProtectedRoute requiredUserType="player">
            <OyuncuLayout />
          </ProtectedRoute>
        } 
      />
      
      {/* Saha Sahibi Route'ları */}
      <Route 
        path="/saha-sahibi/*" 
        element={
          <ProtectedRoute requiredUserType="owner">
            <SahaSahibiLayout />
          </ProtectedRoute>
        } 
      />
      
      {/* Admin Setup Route (Geliştirme için) */}
      <Route path="/admin-setup" element={<AdminSetup />} />
      
      {/* Admin Route'ları */}
      <Route 
        path="/admin/*" 
        element={
          <ProtectedRoute requiredUserType="admin">
            <AdminLayout />
          </ProtectedRoute>
        } 
      />
    </Routes>
  );
};

export default AppRoutes;
