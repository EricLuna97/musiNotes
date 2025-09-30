import React from 'react';
import { parseLyricsWithChords } from '../utils/parseLyrics';

const SongPreview = ({ title, artist, album, genre, lyrics, chords }) => {
  const parsed = parseLyricsWithChords(lyrics);

  return (
    <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
      <h3 className="text-xl font-semibold text-white mb-4">👀 Song Preview</h3>

      {/* Song Info */}
      <div className="mb-6 text-center">
        <h4 className="text-2xl font-bold text-green-400 mb-2">{title || 'Song Title'}</h4>
        <p className="text-lg text-gray-300 mb-1">By {artist || 'Artist'}</p>
        {album && <p className="text-sm text-gray-400">Album: {album}</p>}
        {genre && <p className="text-sm text-gray-400">Genre: {genre}</p>}
      </div>

      {/* Lyrics with Chords */}
      <div className="bg-gray-900 p-4 rounded-lg font-mono text-sm leading-relaxed">
        {parsed.map((line, index) => (
          <div key={index}>
            <pre style={{ margin: 0 }}>{line.chordsLine}</pre>
            <pre style={{ margin: 0 }}>{line.lyricsLine}</pre>
          </div>
        ))}

        {parsed.length === 0 && (
          <div className="text-gray-500 italic text-center py-8">
            No lyrics to preview. Start writing your song!
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-4 text-xs text-gray-400">
        <p>💡 Tip: Use [Chord] notation in your lyrics to position chords above words</p>
        <p>Example: [Am]Yo quiero [G]vivir la [C]vida</p>
      </div>
    </div>
  );
};

export default SongPreview;