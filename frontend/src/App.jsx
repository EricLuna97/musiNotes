import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';

// Global variables provided by the environment
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const authToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// The main App component
const App = () => {
    // State variables for the app's data and UI
    const [songs, setSongs] = useState([]);
    const [view, setView] = useState('list');
    const [currentSong, setCurrentSong] = useState(null);
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [modal, setModal] = useState({ show: false, message: '', isConfirm: false, onConfirm: () => {} });

    // Modal component
    const Modal = ({ show, message, isConfirm, onConfirm, onClose }) => {
        if (!show) return null;

        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 transition-opacity duration-300 ease-in-out">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg w-full max-w-sm transform transition-transform duration-300 ease-in-out scale-100 opacity-100">
                    <h2 className="text-xl font-bold mb-4">{message}</h2>
                    <div className="flex justify-end space-x-4">
                        <button onClick={onClose} className="w-full py-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors duration-300">
                            Cerrar
                        </button>
                        {isConfirm && (
                            <button onClick={onConfirm} className="w-full py-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors duration-300">
                                Eliminar
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    // Function to show the modal
    const showModal = (message, isConfirm = false, onConfirm = () => {}) => {
        setModal({
            show: true,
            message,
            isConfirm,
            onConfirm: () => {
                onConfirm();
                setModal({ ...modal, show: false });
            },
            onClose: () => {
                setModal({ ...modal, show: false });
            }
        });
    };

    // Firebase initialization and authentication
    useEffect(() => {
        const initFirebase = async () => {
            try {
                const firebaseApp = initializeApp(firebaseConfig);
                const authInstance = getAuth(firebaseApp);
                const dbInstance = getFirestore(firebaseApp);
                setAuth(authInstance);
                setDb(dbInstance);

                if (authToken) {
                    await signInWithCustomToken(authInstance, authToken);
                } else {
                    await signInAnonymously(authInstance);
                }

                // Listen for auth state changes
                onAuthStateChanged(authInstance, (user) => {
                    if (user) {
                        setUserId(user.uid);
                    } else {
                         setUserId(crypto.randomUUID());
                    }
                    setIsAuthReady(true);
                });
            } catch (e) {
                console.error("Error initializing Firebase:", e);
                showModal("Error al inicializar la base de datos.");
            }
        };
        initFirebase();
    }, []);

    // Firestore data listener
    useEffect(() => {
        if (!isAuthReady || !userId || !db) return;

        console.log("Setting up Firestore listener.");
        // The collection path now includes the user ID for security
        const songsColRef = collection(db, "artifacts", appId, "users", userId, "songs");

        // Use onSnapshot to get real-time updates
        const unsubscribe = onSnapshot(songsColRef, (snapshot) => {
            console.log("Received data from Firestore.");
            const fetchedSongs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Sort songs by title client-side to avoid Firestore index errors
            fetchedSongs.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
            setSongs(fetchedSongs);
        }, (error) => {
            console.error("Error listening to Firestore:", error);
            showModal("Error al cargar las canciones desde la base de datos.");
        });

        // Clean up the listener on component unmount
        return () => unsubscribe();
    }, [isAuthReady, userId, db]);

    // Handlers for Firestore actions
    const saveSong = async (songData, id = null) => {
        if (!isAuthReady || !userId || !db) {
            showModal("Error: La base de datos no está lista.");
            return;
        }
        try {
            const songDocRef = id ? doc(db, "artifacts", appId, "users", userId, "songs", id) : doc(collection(db, "artifacts", appId, "users", userId, "songs"));
            await setDoc(songDocRef, songData);
            showModal("Canción guardada exitosamente.");
        } catch (e) {
            console.error("Error saving song: ", e);
            showModal("Error al guardar la canción.");
        }
    };

    const deleteSong = async (id) => {
        if (!isAuthReady || !userId || !db) {
            showModal("Error: La base de datos no está lista.");
            return;
        }
        try {
            await deleteDoc(doc(db, "artifacts", appId, "users", userId, "songs", id));
            showModal("Canción eliminada exitosamente.");
        } catch (e) {
            console.error("Error deleting song: ", e);
            showModal("Error al eliminar la canción.");
        }
    };

    // Component for the song list view
    const SongList = () => {
        const [searchTerm, setSearchTerm] = useState('');
        const [selectedGenre, setSelectedGenre] = useState('');

        const genres = [...new Set(songs.map(song => song.genre).filter(Boolean))];

        const filteredSongs = songs.filter(song => {
            const matchesSearch = (song.title?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                                  (song.artist?.toLowerCase() || '').includes(searchTerm.toLowerCase());
            const matchesGenre = selectedGenre ? song.genre === selectedGenre : true;
            return matchesSearch && matchesGenre;
        });

        return (
            <div className="w-full max-w-4xl p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg transition-colors duration-300">
                <h1 className="text-3xl font-bold mb-4 text-center">MusiNotes</h1>
                <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                    <input
                        type="text"
                        placeholder="Buscar por título o artista..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full sm:w-2/3 px-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-purple-600 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                    />
                    <select
                        value={selectedGenre}
                        onChange={(e) => setSelectedGenre(e.target.value)}
                        className="w-full sm:w-1/3 px-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-purple-600 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                    >
                        <option value="">Todos los géneros</option>
                        {genres.map(genre => <option key={genre} value={genre}>{genre}</option>)}
                    </select>
                </div>
                <button
                    onClick={() => { setView('add'); setCurrentSong(null); }}
                    className="w-full px-6 py-3 mb-6 bg-purple-600 text-white rounded-full font-bold hover:bg-purple-700 transition-colors duration-300 transform hover:scale-105"
                >
                    Agregar Nueva Canción
                </button>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredSongs.length > 0 ? filteredSongs.map(song => (
                        <div key={song.id} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl shadow-md transition-transform transform hover:scale-105">
                            <h3 className="text-xl font-semibold">{song.title}</h3>
                            <p className="text-gray-600 dark:text-gray-300">Artista: {song.artist}</p>
                            {song.album && <p className="text-gray-600 dark:text-gray-300">Álbum: {song.album}</p>}
                            {song.genre && <p className="text-gray-600 dark:text-gray-300">Género: {song.genre}</p>}
                            <div className="flex justify-end mt-4 space-x-2">
                                <button
                                    onClick={() => { setView('view'); setCurrentSong(song); }}
                                    className="bg-purple-500 text-white px-3 py-1 rounded-full text-sm hover:bg-purple-600 transition-colors duration-300"
                                >
                                    Ver
                                </button>
                                <button
                                    onClick={() => { setView('edit'); setCurrentSong(song); }}
                                    className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm hover:bg-blue-600 transition-colors duration-300"
                                >
                                    Editar
                                </button>
                                <button
                                    onClick={() => showModal("¿Estás seguro de que quieres eliminar esta canción?", true, () => deleteSong(song.id))}
                                    className="bg-red-500 text-white px-3 py-1 rounded-full text-sm hover:bg-red-600 transition-colors duration-300"
                                >
                                    Eliminar
                                </button>
                            </div>
                        </div>
                    )) : (
                        <p className="text-center text-gray-500 mt-8 col-span-full">No se encontraron canciones.</p>
                    )}
                </div>
            </div>
        );
    };

    // Component for the song form view
    const SongForm = () => {
        const [title, setTitle] = useState(currentSong?.title || '');
        const [artist, setArtist] = useState(currentSong?.artist || '');
        const [album, setAlbum] = useState(currentSong?.album || '');
        const [genre, setGenre] = useState(currentSong?.genre || '');
        const [lyrics, setLyrics] = useState(currentSong?.lyrics || '');
        const [chords, setChords] = useState(currentSong?.chords || '');

        const handleSubmit = (e) => {
            e.preventDefault();
            if (!title || !artist) {
                showModal("El título y el artista son campos obligatorios.");
                return;
            }
            const songData = { title, artist, album, genre, lyrics, chords };
            saveSong(songData, currentSong?.id);
        };

        return (
            <div className="w-full max-w-4xl p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg transition-colors duration-300">
                <h1 className="text-3xl font-bold mb-6 text-center">{currentSong ? 'Editar Canción' : 'Agregar Nueva Canción'}</h1>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Título</label>
                        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Artista</label>
                        <input type="text" value={artist} onChange={(e) => setArtist(e.target.value)} className="w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Álbum</label>
                        <input type="text" value={album} onChange={(e) => setAlbum(e.target.value)} className="w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Género</label>
                        <input type="text" value={genre} onChange={(e) => setGenre(e.target.value)} className="w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Letra</label>
                        <textarea rows="5" value={lyrics} onChange={(e) => setLyrics(e.target.value)} className="w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"></textarea>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Acordes</label>
                        <textarea rows="5" value={chords} onChange={(e) => setChords(e.target.value)} className="w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"></textarea>
                    </div>
                    <div className="flex justify-between mt-6">
                        <button type="submit" className="px-6 py-3 bg-green-500 text-white rounded-full font-bold hover:bg-green-600 transition-colors duration-300">
                            Guardar Canción
                        </button>
                        <button type="button" onClick={() => setView('list')} className="px-6 py-3 bg-gray-500 text-white rounded-full font-bold hover:bg-gray-600 transition-colors duration-300">
                            Cancelar
                        </button>
                    </div>
                </form>
            </div>
        );
    };

    // New component for individual song view
    const SongView = () => {
        if (!currentSong) {
            return (
                <div className="text-center text-gray-500 mt-8">
                    No se seleccionó ninguna canción.
                    <button
                        onClick={() => setView('list')}
                        className="mt-4 px-6 py-3 bg-purple-600 text-white rounded-full font-bold hover:bg-purple-700 transition-colors duration-300"
                    >
                        Volver a la lista
                    </button>
                </div>
            );
        }

        const formatText = (text) => {
            return text ? text.split('\n').map((line, index) => <p key={index}>{line}</p>) : null;
        };

        return (
            <div className="w-full max-w-4xl p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg transition-colors duration-300">
                <div className="flex justify-between items-start mb-6">
                    <button
                        onClick={() => setView('list')}
                        className="bg-gray-500 text-white px-4 py-2 rounded-full font-bold hover:bg-gray-600 transition-colors duration-300"
                    >
                        &lt; Volver
                    </button>
                    <div className="text-right">
                        <h1 className="text-4xl font-bold">{currentSong.title}</h1>
                        <h2 className="text-xl text-gray-600 dark:text-gray-300">{currentSong.artist}</h2>
                        {currentSong.album && <p className="text-sm text-gray-500 dark:text-gray-400">Álbum: {currentSong.album}</p>}
                        {currentSong.genre && <p className="text-sm text-gray-500 dark:text-gray-400">Género: {currentSong.genre}</p>}
                    </div>
                </div>

                <div className="mt-8 p-4 bg-gray-100 dark:bg-gray-700 rounded-xl">
                    <h3 className="text-2xl font-semibold mb-2">Letra</h3>
                    <div className="whitespace-pre-wrap text-lg text-gray-800 dark:text-gray-200">{formatText(currentSong.lyrics)}</div>
                </div>

                <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-700 rounded-xl">
                    <h3 className="text-2xl font-semibold mb-2">Acordes</h3>
                    <div className="whitespace-pre-wrap text-lg text-gray-800 dark:text-gray-200">{formatText(currentSong.chords)}</div>
                </div>
            </div>
        );
    };

    const renderView = () => {
        switch (view) {
            case 'list':
                return <SongList />;
            case 'add':
                return <SongForm />;
            case 'edit':
                return <SongForm />;
            case 'view':
                return <SongView />;
            default:
                return <SongList />;
        }
    };

    return (
        <div className="flex flex-col items-center w-full min-h-screen p-4 bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300 font-sans">
            <Modal {...modal} onClose={() => setModal({ ...modal, show: false })} />
            {isAuthReady && userId && (
                <div className="p-2 bg-gray-200 dark:bg-gray-700 text-sm rounded-lg text-center mb-4">
                    Tu ID de usuario: {userId}
                </div>
            )}
            {renderView()}
        </div>
    );
};

export default App;
