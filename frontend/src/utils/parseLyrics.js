// src/utils/parseLyrics.js
export function parseLyricsWithChords(lyrics) {
  if (!lyrics) return [];

  const lines = lyrics.split("\n");

  // Check if lyrics contain [Chord] notation
  if (lyrics.includes("[")) {
    // Parse [Chord] notation
    return lines.map(line => {
      // Parse line to extract clean lyrics and chord positions
      const chords = [];
      let cleanLyrics = "";
      let pos = 0;
      let i = 0;

      while (i < line.length) {
        if (line[i] === "[") {
          const closeBracket = line.indexOf("]", i);
          if (closeBracket !== -1) {
            const chord = line.substring(i + 1, closeBracket);
            chords.push({ chord, pos });
            i = closeBracket + 1;
          } else {
            cleanLyrics += line[i];
            pos++;
            i++;
          }
        } else {
          cleanLyrics += line[i];
          pos++;
          i++;
        }
      }

      // Create chords line with chords at their positions
      const chordsArray = new Array(cleanLyrics.length).fill(' ');
      for (const { chord, pos: chordPos } of chords) {
        for (let j = 0; j < chord.length && chordPos + j < chordsArray.length; j++) {
          chordsArray[chordPos + j] = chord[j];
        }
      }

      const chordsLine = chordsArray.join('');
      return { chordsLine, lyricsLine: cleanLyrics };
    });
  } else {
    // Parse songbook format (chords line, lyrics line, chords line, lyrics line, ...)
    const result = [];
    for (let i = 0; i < lines.length; i += 2) {
      const chordsLine = lines[i] || "";
      const lyricsLine = lines[i + 1] || "";
      result.push({ chordsLine, lyricsLine });
    }
    return result;
  }
}