import React from 'react';
import { motion } from 'framer-motion';
import Header from '../components/Header';
import Hero from '../components/Hero';
// HeroBar is now integrated into YakinTesisler as "Quick Categories" or can be removed if redundant. 
// Keeping it if it serves a specific different purpose, but likely YakinTesisler covers it now based on request.
import YakinTesisler from '../components/YakinTesisler'; 
import Rakamlar from '../components/Rakamlar';
import Blog from '../components/Blog';
import Footer from '../components/Footer';

const Home = () => {  
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Hero />
        {/* HeroBar removed as its functionality (Quick Categories) is now in YakinTesisler per the reference snippet alignment */}
        <div className="bg-white">
          <YakinTesisler />
        </div>
        <Rakamlar />
        <Blog />
      </motion.div>
      <Footer />
    </div>
  );
};

export default Home;