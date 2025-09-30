import React, { useState, useRef } from 'react';
import { parseLyricsWithChords } from '../utils/parseLyrics';

const LyricsEditor = ({ lyrics, chords, onLyricsChange, onChordsChange }) => {
  const textareaRef = useRef(null);

  const handleTextareaChange = (e) => {
    onLyricsChange(e.target.value);
  };

  return (
    <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
      <div className="mb-4">
        <h3 className="text-xl font-semibold text-white">✏️ Lyrics & Chords Editor</h3>
      </div>

      {/* Lyrics Textarea */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Song Lyrics with Chords
        </label>
        <textarea
          ref={textareaRef}
          value={lyrics || ''}
          onChange={handleTextareaChange}
          placeholder="Start writing your song lyrics here...&#10;&#10;Example:&#10;Am          G             &#10;Yo quiero vivir la vida&#10;C                 F   &#10;Cantando bajo el sol"
          className="w-full h-96 p-4 bg-gray-900 border border-gray-600 rounded-lg text-gray-200 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-vertical"
          style={{ fontFamily: 'Fira Code, Consolas, monospace' }}
        />
      </div>

      {/* Character Count */}
      <div className="text-right text-sm text-gray-400">
        Characters: {lyrics?.length || 0} / 10,000
      </div>


      {/* Quick Actions */}
      <div className="flex gap-2 mt-4">
        <button
          onClick={() => onLyricsChange('')}
          className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition duration-200 text-sm"
        >
          Clear All
        </button>
        <button
          onClick={() => {
            const example = "Am          G             \nYo quiero vivir la vida\nC                 F   \nCantando bajo el sol\nG        Am            F         C   G \nQue los momentos no pasen en vano\nAm       F        C        G          Am   \nQue mi corazón siempre cante con voz";
            onLyricsChange(example);
          }}
          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition duration-200 text-sm"
        >
          Load Example
        </button>
      </div>
    </div>
  );
};

export default LyricsEditor;