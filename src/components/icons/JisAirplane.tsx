import React from 'react';
import { JisIconProps } from './types';

/**
 * 国土交通省・日本産業規格 JIS Z 8210（5201: 航空機・空港）公式ベクターデータ準拠
 */
export const JisAirplane: React.FC<JisIconProps> = ({
  size = 24,
  className = '',
  color = 'currentColor',
  showFrame = false,
  ...props
}) => {
  return (
    <svg
      viewBox="0 0 60.601004 60.601004"
      width={size}
      height={size}
      className={`shrink-0 select-none ${className}`}
      aria-label="航空機・空港（JIS Z 8210）"
      {...props}
    >
      {showFrame && (
        <path
          d="m 7.7855027,56.031128 c -1.77625,0 -3.21625,-1.43875 -3.21625,-3.21375 l 0,-45.0325003 c 0,-1.77625 1.44,-3.215 3.21625,-3.215 l 45.0300003,0 c 1.7775,0 3.21625,1.43875 3.21625,3.215 l 0,45.0325003 c 0,1.775 -1.43875,3.21375 -3.21625,3.21375 l -45.0300003,0 z"
          fill="#ffffff"
          stroke="#cbd5e1"
          strokeWidth="0.8"
        />
      )}
      <path d="m 30.300505,10.629875 c 1.1325,0 2.075,0.9425 2.075,2.1375 l 0,12.57625 17.60625,9.87375 0,4.4 -17.60625,-5.09375 0,9.18125 4.15125,3.08125 0,3.64625 -6.22625,-2.075 -6.22375,2.075 0,-3.64625 4.14875,-3.08125 0,-9.18125 -17.60625,5.09375 0,-4.4 17.60625,-9.87375 0,-12.57625 c 0,-1.195 0.9425,-2.1375 2.075,-2.1375" fill={color} fillRule="nonzero" />
    </svg>
  );
};
