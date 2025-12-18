"use client";
import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

const Input: React.FC<InputProps> = ({ 
  className = "", 
  label,
  error,
  icon,
  ...props 
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
            {icon}
          </div>
        )}
        <input
          className={`
            bg-white border-2 border-gray-200 text-gray-900 
            rounded-xl px-4 py-3 w-full
            ${icon ? 'pl-12' : ''}
            focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20
            hover:border-gray-300
            transition-all duration-300
            placeholder:text-gray-400
            disabled:bg-gray-50 disabled:cursor-not-allowed
            ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}
            ${className}
          `}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600 font-medium">
          {error}
        </p>
      )}
    </div>
  );
};

export default Input;
export { Input };
