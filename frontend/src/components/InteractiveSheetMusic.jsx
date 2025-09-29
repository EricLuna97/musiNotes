import React, { useEffect, useRef, useState } from "react";
import * as VF from "vexflow";

const InteractiveSheetMusic = () => {
  const containerRef = useRef(null);
  const [notes, setNotes] = useState([
    { key: "c/4", duration: "q" },
    { key: "d/4", duration: "q" },
    { key: "e/4", duration: "q" },
    { key: "f/4", duration: "q" },
  ]);
  const [currentDuration, setCurrentDuration] = useState("q");
  const staveRef = useRef(null);
  const contextRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear previous rendering
    containerRef.current.innerHTML = "";

    // Create renderer
    const renderer = new VF.Renderer(containerRef.current, VF.Renderer.Backends.SVG);
    renderer.resize(800, 300);
    const context = renderer.getContext();
    contextRef.current = context;

    // Create stave
    const stave = new VF.Stave(20, 50, 700);
    stave.addClef("treble").addTimeSignature("4/4");
    stave.setContext(context).draw();
    staveRef.current = stave;

    // Render notes if any
    if (notes.length > 0) {
      const vexNotes = notes.map((note) => new VF.StaveNote({ keys: [note.key], duration: note.duration }));
      const voice = new VF.Voice({ num_beats: 4, beat_value: 4 });
      voice.setMode(VF.Voice.Mode.SOFT);
      voice.addTickables(vexNotes);
      new VF.Formatter().joinVoices([voice]).format([voice], 600);
      voice.draw(context, stave);
    }

    // Add click event to the SVG
    const svg = containerRef.current.querySelector("svg");
    if (svg) {
      svg.addEventListener("click", handleStaffClick);
    }

    return () => {
      if (svg) {
        svg.removeEventListener("click", handleStaffClick);
      }
    };
  }, [notes]);

  const handleStaffClick = (event) => {
    if (!staveRef.current || !contextRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Check if click is within stave area
    const staveY = staveRef.current.getYForTopText();
    const staveHeight = 100; // Approximate stave height
    if (y < staveY || y > staveY + staveHeight) return;

    // Calculate note key based on y position
    const noteKey = getNoteKeyFromY(y);
    if (noteKey) {
      addNote(noteKey);
    }
  };

  const getNoteKeyFromY = (y) => {
    // VexFlow stave lines: E4, G4, B4, D5, F5 for treble clef
    // Approximate y positions (this may need calibration)
    const staveTop = staveRef.current.getYForTopText() + 20; // Adjust for clef
    const lineSpacing = 10; // Approximate spacing between lines

    // Map y to note index
    const noteNames = ["c", "d", "e", "f", "g", "a", "b"];
    const octaves = [3, 4, 5, 6]; // Possible octaves

    // Calculate which line/space
    const relativeY = y - staveTop;
    const lineIndex = Math.round(relativeY / lineSpacing);

    // Map to note (this is simplified; real mapping needs VexFlow's note positions)
    const noteIndex = Math.max(0, Math.min(6, Math.floor(lineIndex / 2)));
    const octave = 4; // Default to 4th octave

    return `${noteNames[noteIndex]}/${octave}`;
  };

  const addNote = (key) => {
    setNotes((prev) => [...prev, { key, duration: currentDuration }]);
  };

  const clearNotes = () => setNotes([]);

  const undoNote = () => {
    setNotes((prev) => prev.slice(0, -1));
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center text-green-400 mb-6">🎼 Interactive Sheet Music Composer</h1>

        {/* Staff Container */}
        <div className="bg-gray-800 p-6 rounded-2xl shadow-lg mb-6 cursor-pointer">
          <div ref={containerRef} className="flex justify-center"></div>
          <p className="text-center text-sm text-gray-400 mt-2">Click on the staff to add notes</p>
        </div>

        {/* Controls */}
        <div className="bg-gray-800 p-6 rounded-2xl shadow-lg">
          {/* Duration Selector */}
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">Note Duration</h3>
            <div className="flex gap-2">
              {[
                { label: "Whole", value: "w" },
                { label: "Half", value: "h" },
                { label: "Quarter", value: "q" },
                { label: "Eighth", value: "8" },
              ].map((dur) => (
                <button
                  key={dur.value}
                  onClick={() => setCurrentDuration(dur.value)}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    currentDuration === dur.value ? "bg-green-600 text-white" : "bg-gray-700 hover:bg-gray-600"
                  }`}
                >
                  {dur.label}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={undoNote}
              className="bg-yellow-600 hover:bg-yellow-700 text-white py-2 px-4 rounded-lg font-medium transition"
            >
              ↶ Undo
            </button>
            <button
              onClick={clearNotes}
              className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg font-medium transition"
            >
              🗑️ Clear All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InteractiveSheetMusic;