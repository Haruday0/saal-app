import React from 'react';

interface IconProps {
  name: string;
  className?: string;
  filled?: boolean;
  size?: number | string;
}

export const Icon: React.FC<IconProps> = ({
  name,
  className = '',
  filled = false,
  size,
}) => {
  const style = size
    ? {
        fontSize: typeof size === 'number' ? `${size}px` : size,
        width: typeof size === 'number' ? `${size}px` : size,
        height: typeof size === 'number' ? `${size}px` : size,
      }
    : undefined;

  return (
    <span
      className={`material-symbols-rounded select-none inline-flex items-center justify-center ${
        filled ? 'filled' : ''
      } ${className}`}
      style={style}
    >
      {name}
    </span>
  );
};
