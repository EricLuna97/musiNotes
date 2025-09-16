import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // Importa los estilos de Tailwind
import App from './components/App'; // Importa el componente principal de la aplicación

// Crea el punto de montaje de la aplicación de React
const root = ReactDOM.createRoot(document.getElementById('root'));

// Renderiza el componente principal en la raíz
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
