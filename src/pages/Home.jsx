import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Header from '../components/Header';
import Hero from '../components/Hero';
import YakinTesisler from '../components/YakinTesisler'; 
import Rakamlar from '../components/Rakamlar';
import Blog from '../components/Blog';
import Footer from '../components/Footer';
import AppLoader from '../components/AppLoader';
import HomeSkeleton from '../components/HomeSkeleton';

const Home = () => {
  const [appLoading, setAppLoading] = useState(true);
  const [contentReady, setContentReady] = useState(false);

  // Simulate content loading for skeleton
  useEffect(() => {
    const timer = setTimeout(() => {
        setContentReady(true);
    }, 2000); // Slight delay to show skeleton after app loader finishes or concurrently
    return () => clearTimeout(timer);
  }, []);

  const handleLoadingComplete = () => {
    setAppLoading(false);
  };

  return (
    <>
      {/* App Opening Loader - Shows only once on initial load usually */}
      <AppLoader onLoadingComplete={handleLoadingComplete} />

      {!appLoading && (
           <div className="min-h-screen bg-white">
             {contentReady ? (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                >
                    <Header />
                    <Hero />
                    <div className="bg-white">
                        <YakinTesisler />
                    </div>
                    <Rakamlar />
                    <Blog />
                    <Footer />
                </motion.div>
             ) : (
                 // Skeleton State
                 <div className="animate-in fade-in duration-700">
                    <Header /> {/* Header is usually static/fast, but can skeleton too if needed */}
                    <HomeSkeleton />
                 </div>
             )}
           </div>
      )}
    </>
  );
};

export default Home;