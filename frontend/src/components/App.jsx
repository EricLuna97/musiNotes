import React, { useState, useEffect } from 'react';

// Componente del formulario para agregar canciones, ahora definido en el mismo archivo
const CreateSongForm = () => {
  // Estado del formulario
  const [formData, setFormData] = useState({
    title: '',
    artist: '',
    album: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Datos del formulario:', formData);
    // Aquí es donde se haría la llamada a la API
  };

  return (
    <div className="flex justify-center min-h-screen font-sans text-white p-4">
      <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-md border border-gray-700">
        <h1 className="text-3xl font-bold mb-6 text-center text-teal-400">Agregar Nueva Canción</h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-1">
              Título
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="mt-1 block w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Título de la canción"
              required
            />
          </div>
          <div>
            <label htmlFor="artist" className="block text-sm font-medium text-gray-300 mb-1">
              Artista
            </label>
            <input
              type="text"
              id="artist"
              name="artist"
              value={formData.artist}
              onChange={handleChange}
              className="mt-1 block w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Nombre del artista"
              required
            />
          </div>
          <div>
            <label htmlFor="album" className="block text-sm font-medium text-gray-300 mb-1">
              Álbum (Opcional)
            </label>
            <input
              type="text"
              id="album"
              name="album"
              value={formData.album}
              onChange={handleChange}
              className="mt-1 block w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Nombre del álbum"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-teal-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-teal-700 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            Guardar Canción
          </button>
        </form>
      </div>
    </div>
  );
};

// Componente de la lista de canciones, ahora en el mismo archivo
const SongList = () => {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const mockSongs = [
      { id: 1, title: 'Bohemian Rhapsody', artist: 'Queen', album: 'A Night at the Opera' },
      { id: 2, title: 'Hotel California', artist: 'Eagles', album: 'Hotel California' },
      { id: 3, title: 'Stairway to Heaven', artist: 'Led Zeppelin', album: 'Led Zeppelin IV' },
    ];

    setTimeout(() => {
      setSongs(mockSongs);
      setLoading(false);
    }, 1500);
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-900 text-teal-400">
        <p className="text-xl animate-pulse">Cargando canciones...</p>
      </div>
    );
  }

  return (
    <div className="flex justify-center min-h-screen bg-gray-900 text-white p-4">
      <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-2xl border border-gray-700">
        <h1 className="text-3xl font-bold mb-6 text-center text-teal-400">Mi Lista de Canciones</h1>
        {songs.length > 0 ? (
          <div className="space-y-4">
            {songs.map(song => (
              <div key={song.id} className="bg-gray-700 p-4 rounded-lg shadow-md border border-gray-600">
                <h2 className="text-xl font-semibold text-teal-300">{song.title}</h2>
                <p className="text-gray-400">Artista: <span className="text-white">{song.artist}</span></p>
                <p className="text-gray-400">Álbum: <span className="text-white">{song.album}</span></p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500">Aún no hay canciones en tu colección.</p>
        )}
      </div>
    </div>
  );
};

/**
 * Componente principal de la aplicación.
 * @returns {JSX.Element} El componente principal con navegación.
 */
const App = () => {
  // Estado para controlar qué vista se está mostrando
  const [currentView, setCurrentView] = useState('list'); // 'list' o 'form'

  return (
    <div className="bg-gray-900 min-h-screen font-sans text-white">
      {/* Navegación para cambiar de vista */}
      <nav className="p-4 bg-gray-800 shadow-lg flex justify-center space-x-4">
        <button
          onClick={() => setCurrentView('list')}
          className={`px-4 py-2 rounded-lg transition-colors duration-300 ${
            currentView === 'list'
              ? 'bg-teal-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-teal-500'
          }`}
        >
          Ver Lista de Canciones
        </button>
        <button
          onClick={() => setCurrentView('form')}
          className={`px-4 py-2 rounded-lg transition-colors duration-300 ${
            currentView === 'form'
              ? 'bg-teal-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-teal-500'
          }`}
        >
          Agregar Nueva Canción
        </button>
      </nav>

      <main className="p-8">
        {/* Renderiza el componente según el estado de la vista */}
        {currentView === 'list' ? <SongList /> : <CreateSongForm />}
      </main>
    </div>
  );
};

export default App;
