'use client';

import React, { FC, MouseEvent } from 'react';

interface StarRatingProps {
  rating: number;
  onRatingChange?: (rating: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
}

export default function StarRating({
  rating,
  onRatingChange,
  readonly = false,
  size = 'md',
  showValue = false
}: StarRatingProps) {
  const stars = [1, 2, 3, 4, 5];
  
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  const handleStarClick = (starRating: number) => {
    if (!readonly && onRatingChange) {
      onRatingChange(starRating);
    }
  };

  const handleStarHover = (event: MouseEvent<HTMLButtonElement>) => {
    if (!readonly) {
      const button = event.currentTarget;
      const stars = button.parentElement?.querySelectorAll('.star');
      const index = Array.from(stars || []).indexOf(button);
      
      stars?.forEach((star, i) => {
        const svg = star.querySelector('svg');
        if (svg) {
          svg.style.fill = i <= index ? '#fbbf24' : '#e5e7eb';
        }
      });
    }
  };

  const handleMouseLeave = () => {
    if (!readonly) {
      const stars = document.querySelectorAll('.star svg');
      stars.forEach((star, i) => {
        (star as SVGElement).style.fill = i < rating ? '#fbbf24' : '#e5e7eb';
      });
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div 
        className="flex items-center gap-1" 
        onMouseLeave={handleMouseLeave}
      >
        {stars.map((star) => (
          <button
            key={star}
            type="button"
            className={`${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'} transition-transform`}
            onClick={() => handleStarClick(star)}
            onMouseEnter={handleStarHover}
            disabled={readonly}
          >
            <svg
              className={`${sizeClasses[size]} transition-colors`}
              fill={star <= rating ? '#fbbf24' : '#e5e7eb'}
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </button>
        ))}
      </div>
      
      {showValue && (
        <span className={`${textSizes[size]} text-gray-600 ml-2`}>
          {rating > 0 ? `${rating}/5` : 'Sin calificar'}
        </span>
      )}
    </div>
  );
} 