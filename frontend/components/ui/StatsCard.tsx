"use client";
import React from 'react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  className?: string;
  variant?: 'blue' | 'green' | 'purple' | 'orange' | 'red';
}

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon,
  trend,
  className = '',
  variant = 'blue'
}) => {
  const variants = {
    blue: 'from-blue-500 to-indigo-600',
    green: 'from-green-500 to-emerald-600',
    purple: 'from-purple-500 to-pink-600',
    orange: 'from-orange-500 to-red-600',
    red: 'from-red-500 to-rose-600',
  };

  return (
    <div className={`relative overflow-hidden bg-white rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02] ${className}`}>
      {/* Gradient overlay */}
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${variants[variant]} opacity-10 rounded-bl-full`}></div>
      
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 uppercase tracking-wide mb-1">{title}</p>
            <h3 className="text-3xl font-bold text-gray-900">{value}</h3>
          </div>
          {icon && (
            <div className={`w-12 h-12 bg-gradient-to-br ${variants[variant]} rounded-xl flex items-center justify-center shadow-lg`}>
              {icon}
            </div>
          )}
        </div>

        {trend && (
          <div className="flex items-center space-x-1">
            {trend.isPositive ? (
              <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6" />
              </svg>
            )}
            <span className={`text-sm font-semibold ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {trend.value}
            </span>
            <span className="text-xs text-gray-500">vs last month</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatsCard;
export { StatsCard };
