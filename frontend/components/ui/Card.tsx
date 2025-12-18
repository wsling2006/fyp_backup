"use client";
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'gradient' | 'glass' | 'outline';
  hover?: boolean;
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  className = '', 
  variant = 'default',
  hover = false 
}) => {
  const variants = {
    default: 'bg-white dark:bg-gray-900 shadow-lg',
    gradient: 'bg-gradient-to-br from-white to-blue-50 dark:from-gray-900 dark:to-blue-950 shadow-xl',
    glass: 'bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl shadow-2xl border border-white/20',
    outline: 'bg-transparent border-2 border-gray-200 dark:border-gray-700 shadow-none',
  };

  const hoverEffect = hover ? 'hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 transform' : '';

  return (
    <div className={`rounded-xl p-6 ${variants[variant]} ${hoverEffect} ${className}`}>
      {children}
    </div>
  );
};
