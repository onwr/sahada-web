import React from 'react';

const HomeSkeleton = () => {
  return (
    <div className="w-full min-h-screen bg-gray-50 overflow-hidden">
      {/* Hero Section Skeleton */}
      <div className="relative h-[500px] w-full bg-gray-200 animate-pulse">
        <div className="container mx-auto px-4 h-full flex flex-col justify-center gap-6">
          <div className="h-12 w-3/4 md:w-1/2 bg-gray-300 rounded-lg"></div>
          <div className="h-6 w-1/2 md:w-1/3 bg-gray-300 rounded-lg"></div>
          <div className="h-14 w-full max-w-2xl bg-white rounded-xl shadow-lg mt-8"></div>
        </div>
      </div>

      {/* Features Grid Skeleton */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
                <div key={i} className="h-64 bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col gap-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
                    <div className="h-6 w-3/4 bg-gray-200 rounded"></div>
                    <div className="h-4 w-full bg-gray-200 rounded"></div>
                    <div className="h-4 w-5/6 bg-gray-200 rounded"></div>
                </div>
            ))}
        </div>
      </div>
      
       {/* List Section Skeleton */}
       <div className="container mx-auto px-4 py-8">
            <div className="h-8 w-48 bg-gray-200 rounded mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 h-80">
                        <div className="h-40 bg-gray-200"></div>
                        <div className="p-4 space-y-3">
                            <div className="h-5 w-2/3 bg-gray-200 rounded"></div>
                            <div className="h-4 w-1/2 bg-gray-200 rounded"></div>
                            <div className="h-10 w-full bg-gray-200 rounded mt-4"></div>
                        </div>
                    </div>
                ))}
            </div>
       </div>
    </div>
  );
};

export default HomeSkeleton;
