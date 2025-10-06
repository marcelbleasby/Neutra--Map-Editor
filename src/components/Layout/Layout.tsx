import React from 'react';
import { Box, Flex } from '@chakra-ui/react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <Flex direction="column" h="100vh">
      {/* Header */}
      <Box bg="brand.600" color="white" p={4}>
        <h1>Neutra+ Map Editor</h1>
      </Box>

      {/* Main content */}
      <Flex flex={1}>{children}</Flex>
    </Flex>
  );
};
