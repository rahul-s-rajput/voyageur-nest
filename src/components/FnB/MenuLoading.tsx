import React from 'react';

const SkeletonItem: React.FC = () => (
  <div className="flex items-start justify-between py-2 animate-pulse">
    <div className="flex items-center gap-3 min-w-0">
      <div className="w-10 h-10 rounded bg-gray-200" />
      <div className="h-3 w-40 bg-gray-200 rounded" />
    </div>
    <div className="flex-1 flex items-center min-w-0 ml-2">
      <span aria-hidden className="flex-1 mx-2 border-b border-dotted border-gray-300" />
      <div className="h-3 w-12 bg-gray-200 rounded ml-2" />
    </div>
  </div>
);

export default function MenuLoading() {
  return (
    <div className="min-h-screen bg-white">
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="h-7 w-28 bg-gray-200 rounded animate-pulse" />
          <div className="flex items-center gap-3">
            <div className="h-3 w-14 bg-gray-200 rounded animate-pulse" />
            <div className="h-3 w-20 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex flex-wrap gap-2 justify-center mb-6 mt-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-9 w-24 rounded-md bg-gray-200 animate-pulse" />
          ))}
        </div>
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="h-36 sm:h-48 bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 animate-pulse" />
          <div className="p-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonItem key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}



