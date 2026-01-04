import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Check, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const PremiumUpgrade = ({ userType = 'player' }) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const plans = {
    player: {
      monthly: { price: 99, originalPrice: 149 },
      yearly: { price: 899, originalPrice: 1788, savings: 889 }
    },
    owner: {
      monthly: { price: 299, originalPrice: 399 },
      yearly: { price: 2999, originalPrice: 4788, savings: 1789 }
    }
  };

  const currentPlans = plans[userType] || plans.player;

  const features = {
    player: [
      'Performans Analytics',
      'Priority Booking',
      'AI Matching',
      'Scout Mode',
      'Match Highlights',
      'Cashback & Rewards',
      'Pro Network',
      'VIP Events'
    ],
    owner: [
      'AI-Powered Analytics',
      'Competitor Analysis',
      'Dynamic Pricing',
      'Recurring Reservations',
      'Waitlist Management',
      'CRM Suite',
      'Loyalty Program',
      'Staff Management'
    ]
  };

  const currentFeatures = features[userType] || features.player;

  const handleUpgrade = (duration) => {
    if (user) {
      navigate(`/${userType === 'player' ? 'oyuncu' : 'saha-sahibi'}/premium?plan=${duration}`);
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-xl p-8 text-white">
      <div className="flex items-center space-x-2 mb-4">
        <Star className="w-6 h-6 fill-yellow-400 text-yellow-400" />
        <h3 className="text-2xl font-bold">Premium'a Yükselt</h3>
      </div>
      <p className="text-purple-100 mb-6">
        {userType === 'player' 
          ? 'Tüm premium özelliklere erişim sağla' 
          : 'İşletmenizi bir üst seviyeye taşıyın'}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
          <div className="mb-2">
            <span className="text-sm text-purple-200">Aylık</span>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-bold">₺{currentPlans.monthly.price}</span>
              <span className="text-sm text-purple-200 line-through">₺{currentPlans.monthly.originalPrice}</span>
            </div>
          </div>
          <button
            onClick={() => handleUpgrade('monthly')}
            className="w-full mt-4 bg-white text-purple-600 px-4 py-2 rounded-lg font-semibold hover:bg-purple-50 transition-colors flex items-center justify-center space-x-2"
          >
            <span>Başla</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border-2 border-yellow-400">
          <div className="mb-2">
            <span className="text-sm text-purple-200">Yıllık</span>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-bold">₺{currentPlans.yearly.price}</span>
              <span className="text-sm text-purple-200 line-through">₺{currentPlans.yearly.originalPrice}</span>
            </div>
            <div className="text-xs text-yellow-300 mt-1">
              {currentPlans.yearly.savings}₺ tasarruf edin!
            </div>
          </div>
          <button
            onClick={() => handleUpgrade('yearly')}
            className="w-full mt-4 bg-yellow-400 text-purple-900 px-4 py-2 rounded-lg font-semibold hover:bg-yellow-300 transition-colors flex items-center justify-center space-x-2"
          >
            <span>Başla</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="font-semibold mb-2">Premium Özellikler:</h4>
        {currentFeatures.map((feature, index) => (
          <div key={index} className="flex items-center space-x-2 text-sm">
            <Check className="w-4 h-4 text-yellow-400" />
            <span>{feature}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PremiumUpgrade;

