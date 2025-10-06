import React from 'react';
import { ChakraProvider, createSystem, defaultConfig } from '@chakra-ui/react';
import { MapEditor } from './components/MapEditor';
import './App.css';

// Configuração do sistema do Chakra UI v3
const system = createSystem(defaultConfig, {
  theme: {
    tokens: {
      colors: {},
    },
  },
});

function App() {
  return (
    <ChakraProvider value={system}>
      <div className="App">
        <MapEditor />
      </div>
    </ChakraProvider>
  );
}

export default App;
