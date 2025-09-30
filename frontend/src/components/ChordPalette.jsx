import React from 'react';

const ChordPalette = ({ onChordSelect }) => {
  const chordGroups = [
    {
      name: 'Major',
      chords: ['C', 'D', 'E', 'F', 'G', 'A', 'B']
    },
    {
      name: 'Minor',
      chords: ['Cm', 'Dm', 'Em', 'Fm', 'Gm', 'Am', 'Bm']
    },
    {
      name: '7th',
      chords: ['C7', 'D7', 'E7', 'F7', 'G7', 'A7', 'B7']
    },
    {
      name: 'Minor 7th',
      chords: ['Cm7', 'Dm7', 'Em7', 'Fm7', 'Gm7', 'Am7', 'Bm7']
    },
    {
      name: 'Major 7th',
      chords: ['Cmaj7', 'Dmaj7', 'Emaj7', 'Fmaj7', 'Gmaj7', 'Amaj7', 'Bmaj7']
    },
    {
      name: 'Diminished',
      chords: ['Cdim', 'Ddim', 'Edim', 'Fdim', 'Gdim', 'Adim', 'Bdim']
    },
    {
      name: 'Augmented',
      chords: ['Caug', 'Daug', 'Eaug', 'Faug', 'Gaug', 'Aaug', 'Baug']
    },
    {
      name: 'Suspended',
      chords: ['Csus2', 'Dsus2', 'Esus2', 'Fsus2', 'Gsus2', 'Asus2', 'Bsus2', 'Csus4', 'Dsus4', 'Esus4', 'Fsus4', 'Gsus4', 'Asus4', 'Bsus4']
    }
  ];

  return (
    <div className="bg-gray-800 p-4 rounded-xl shadow-lg">
      <h3 className="text-lg font-semibold text-white mb-4">🎹 Chord Palette</h3>
      <div className="space-y-3">
        {chordGroups.map((group) => (
          <div key={group.name}>
            <h4 className="text-sm font-medium text-gray-300 mb-2">{group.name}</h4>
            <div className="flex flex-wrap gap-2">
              {group.chords.map((chord) => (
                <button
                  key={chord}
                  onClick={() => onChordSelect(chord)}
                  className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition duration-200 text-sm font-medium"
                  title={`Insert ${chord} chord`}
                >
                  {chord}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChordPalette;