import React from 'react';
import { Box } from '@chakra-ui/react';
import { IconType } from 'react-icons';

interface CustomIconProps {
  as: IconType;
  mr?: number | string;
  ml?: number | string;
  color?: string;
  boxSize?: string;
  size?: string | number;
  [key: string]: any;
}

export const Icon: React.FC<CustomIconProps> = ({ as: IconComponent, size, boxSize, ...props }) => {
  const iconSize = size || boxSize || '1em';
  
  return (
    <Box 
      as="span" 
      display="inline-flex" 
      alignItems="center" 
      justifyContent="center"
      fontSize={typeof iconSize === 'number' ? `${iconSize}px` : iconSize}
      {...props}
    >
      {React.createElement(IconComponent as React.ComponentType)}
    </Box>
  );
};