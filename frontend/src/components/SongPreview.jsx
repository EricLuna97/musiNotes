import React from 'react';
import { parseLyricsWithChords } from '../utils/parseLyrics';

const SongPreview = ({ title, artist, album, genre, lyrics, chords }) => {
  const parsed = parseLyricsWithChords(lyrics);

  return (
    <div className="card p-6">
      <h3 className="text-xl font-semibold text-techno-light mb-6">👀 Song Preview</h3>

      {/* Song Info */}
      <div className="mb-8 text-center">
        <h4 className="text-2xl font-bold text-primary mb-3">{title || 'Song Title'}</h4>
        <p className="text-lg text-neutral-light mb-2">By {artist || 'Artist'}</p>
        {album && <p className="text-sm text-neutral-dark">Album: {album}</p>}
        {genre && <p className="text-sm text-neutral-dark">Genre: {genre}</p>}
      </div>

      {/* Lyrics with Chords */}
      <div className="bg-neutral-dark bg-opacity-20 p-6 rounded-xl font-mono text-sm leading-relaxed">
        {parsed.map((line, index) => (
          <div key={index} className="mb-2">
            <pre style={{ margin: 0, color: '#6C63FF' }}>{line.chordsLine}</pre>
            <pre style={{ margin: 0, color: '#ffffff' }}>{line.lyricsLine}</pre>
          </div>
        ))}

        {parsed.length === 0 && (
          <div className="text-neutral-light italic text-center py-12">
            No lyrics to preview. Start writing your song!
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-6 text-xs text-neutral-dark">
        <p>💡 Tip: Use [Chord] notation in your lyrics to position chords above words</p>
        <p>Example: [Am]Yo quiero [G]vivir la [C]vida</p>
      </div>
    </div>
  );
};

export default SongPreview;