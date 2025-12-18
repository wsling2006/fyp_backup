"use client";
import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'outline';
}

const Button: React.FC<ButtonProps> = ({ 
  className = "", 
  variant = 'primary',
  children, 
  ...props 
}) => {
  const variantClasses = {
    primary: "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/50 hover:shadow-blue-600/50",
    secondary: "bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white shadow-lg shadow-gray-500/50",
    danger: "bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white shadow-lg shadow-red-500/50",
    success: "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg shadow-green-500/50",
    outline: "bg-transparent border-2 border-blue-600 text-blue-600 hover:bg-blue-50 shadow-none"
  };

  return (
    <button
      className={`
        ${variantClasses[variant]}
        rounded-xl px-6 py-3 w-full font-semibold
        transition-all duration-300 
        transform hover:scale-[1.02] active:scale-[0.98]
        disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
        focus:outline-none focus:ring-4 focus:ring-blue-500/50
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
export { Button };
