import React from 'react';

export interface JisIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  className?: string;
  color?: string;
  direction?: 'up' | 'down' | 'both';
  variant?: 'general' | 'accessible';
  showFrame?: boolean;
}
