import React, { useState } from 'react';

/**
 * Componente principal de la aplicación.
 * @returns {JSX.Element} El componente de la aplicación.
 */
const App = () => {
  // Estados para almacenar los valores del formulario
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [album, setAlbum] = useState('');
  const [message, setMessage] = useState('');

  /**
   * Maneja el envío del formulario.
   * @param {Event} e El evento de envío del formulario.
   */
  const handleSubmit = (e) => {
    e.preventDefault();

    // Simula el envío de datos a la API (por ahora, solo lo mostramos en consola)
    const newSong = { title, artist, album };
    console.log('Datos de la canción a enviar:', newSong);
    
    // Limpia los campos del formulario después del envío
    setTitle('');
    setArtist('');
    setAlbum('');
    setMessage('¡Canción lista para ser enviada a la API!');
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-900 text-white p-4">
      <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-md border border-gray-700">
        <h1 className="text-3xl font-bold mb-6 text-center text-teal-400">Agregar Nueva Canción</h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-400">Título</label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="mt-1 block w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 text-white"
            />
          </div>
          <div>
            <label htmlFor="artist" className="block text-sm font-medium text-gray-400">Artista</label>
            <input
              type="text"
              id="artist"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              required
              className="mt-1 block w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 text-white"
            />
          </div>
          <div>
            <label htmlFor="album" className="block text-sm font-medium text-gray-400">Álbum (opcional)</label>
            <input
              type="text"
              id="album"
              value={album}
              onChange={(e) => setAlbum(e.target.value)}
              className="mt-1 block w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 text-white"
            />
          </div>
          <button
            type="submit"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-colors"
          >
            Guardar Canción
          </button>
        </form>
        {message && (
          <p className="mt-4 text-center text-sm text-green-400 animate-pulse">{message}</p>
        )}
      </div>
    </div>
  );
};

export default App;
