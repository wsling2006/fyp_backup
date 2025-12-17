import React from 'react';

export const Avatar = ({ src, alt, className = '' }: { src?: string; alt?: string; className?: string }) => (
  <img
    src={src || '/default-avatar.png'}
    alt={alt || 'Avatar'}
    className={`w-10 h-10 rounded-full object-cover border border-gray-300 ${className}`}
  />
);
