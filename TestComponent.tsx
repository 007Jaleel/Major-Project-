import React from 'react';

export default function TestComponent() {
  return (
    <div className="p-8 max-w-md mx-auto mt-10 bg-white rounded-xl shadow-lg">
      <h1 className="text-3xl font-bold text-primary-700 mb-4">🎨 Tailwind CSS Test</h1>
      <div className="space-y-4">
        <div className="p-4 bg-primary-50 rounded-lg border border-primary-200">
          <h2 className="text-xl font-semibold text-primary-800">Colors</h2>
          <div className="flex space-x-2 mt-2">
            <div className="w-8 h-8 bg-primary-500 rounded"></div>
            <div className="w-8 h-8 bg-green-500 rounded"></div>
            <div className="w-8 h-8 bg-red-500 rounded"></div>
            <div className="w-8 h-8 bg-yellow-500 rounded"></div>
          </div>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg">
          <h2 className="text-xl font-semibold text-gray-800">Typography</h2>
          <p className="text-gray-600 mt-2">This text uses Tailwind's font classes.</p>
          <code className="block mt-2 p-2 bg-gray-800 text-green-400 rounded font-mono">
            npm run dev
          </code>
        </div>
        <button className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition duration-200">
          Test Button
        </button>
      </div>
      <p className="mt-6 text-center text-sm text-gray-500">
        If you see styled components, Tailwind is working! ✅
      </p>
    </div>
  );
}
