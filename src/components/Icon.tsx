import React from 'react';

interface IconProps extends React.HTMLAttributes<HTMLElement> {
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
  style: propStyle,
  ...rest
}) => {
  const style: React.CSSProperties = {
    ...(size
      ? {
          fontSize: typeof size === 'number' ? `${size}px` : size,
          width: typeof size === 'number' ? `${size}px` : size,
          height: typeof size === 'number' ? `${size}px` : size,
        }
      : {}),
    ...propStyle,
  };

  return (
    <span
      data-slot="custom-icon"
      className={`material-symbols-rounded select-none inline-flex items-center justify-center ${
        filled ? 'filled' : ''
      } ${className}`}
      style={Object.keys(style).length > 0 ? style : undefined}
      {...rest}
    >
      {name}
    </span>
  );
};

