import React, { useState, useRef } from 'react';
import { parseLyricsWithChords } from '../utils/parseLyrics';

const LyricsEditor = ({ lyrics, chords, onLyricsChange, onChordsChange }) => {
  const textareaRef = useRef(null);

  const handleTextareaChange = (e) => {
    onLyricsChange(e.target.value);
  };

  return (
    <div className="card p-6">
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-techno-light">✏️ Lyrics & Chords Editor</h3>
      </div>

      {/* Lyrics Textarea */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-neutral-light mb-3">
          Song Lyrics with Chords
        </label>
        <textarea
          ref={textareaRef}
          value={lyrics || ''}
          onChange={handleTextareaChange}
          placeholder="Start writing your song lyrics here...&#10;&#10;Example:&#10;Am          G             &#10;Yo quiero vivir la vida&#10;C                 F   &#10;Cantando bajo el sol"
          className="input-field w-full h-96 resize-vertical font-mono text-sm"
          style={{ fontFamily: 'Fira Code, Consolas, monospace' }}
        />
      </div>

      {/* Character Count */}
      <div className="text-right text-sm text-neutral-dark mb-6">
        Characters: {lyrics?.length || 0} / 10,000
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => onLyricsChange('')}
          className="bg-error text-techno-light px-4 py-2 rounded-xl font-medium hover:bg-opacity-80 transition-all duration-200"
        >
          Clear All
        </button>
        <button
          onClick={() => {
            const example = "Am          G             \nYo quiero vivir la vida\nC                 F   \nCantando bajo el sol\nG        Am            F         C   G \nQue los momentos no pasen en vano\nAm       F        C        G          Am   \nQue mi corazón siempre cante con voz";
            onLyricsChange(example);
          }}
          className="bg-secondary text-techno-light px-4 py-2 rounded-xl font-medium hover:bg-opacity-80 transition-all duration-200"
        >
          Load Example
        </button>
      </div>
    </div>
  );
};

export default LyricsEditor;