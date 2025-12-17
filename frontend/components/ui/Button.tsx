"use client";
import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
}

const Button: React.FC<ButtonProps> = ({ className = "", children, ...props }) => {
  return (
    <button
      className={`bg-blue-600 text-white rounded-lg p-2 w-full font-semibold shadow hover:bg-blue-700 transition disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
export { Button };
