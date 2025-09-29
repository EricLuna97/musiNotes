import React, { useEffect, useRef, useState } from "react";
import * as VF from "vexflow";

const SheetMusic = () => {
  const containerRef = useRef(null);
  const [notes, setNotes] = useState([]); // Start empty
  const [currentDuration, setCurrentDuration] = useState("q"); // quarter note
  const [currentAccidental, setCurrentAccidental] = useState(""); // "", "#", "b", "n"

  useEffect(() => {
    if (!containerRef.current) return;

    // Limpiar antes de dibujar
    containerRef.current.innerHTML = "";

    // Crear renderer SVG
    const renderer = new VF.Renderer(containerRef.current, VF.Renderer.Backends.SVG);
    renderer.resize(800, 250);
    const context = renderer.getContext();

    // Crear pentagrama
    const stave = new VF.Stave(20, 50, 700);
    stave.addClef("treble").addTimeSignature("4/4");
    stave.setContext(context).draw();

    if (notes.length === 0) return; // No notes to draw

    // Crear notas VexFlow
    const vexNotes = notes.map((note) => {
      const staveNote = new VF.StaveNote({ keys: [note.key], duration: note.duration });
      if (note.accidental) {
        staveNote.addAccidental(0, new VF.Accidental(note.accidental));
      }
      return staveNote;
    });

    // Crear voz
    const voice = new VF.Voice({ num_beats: 4, beat_value: 4 });
    voice.setMode(VF.Voice.Mode.SOFT);
    voice.addTickables(vexNotes);

    // Formatear y dibujar
    new VF.Formatter().joinVoices([voice]).format([voice], 600);
    voice.draw(context, stave);
  }, [notes]);

  // Agregar nota
  const addNote = (noteKey) => {
    const key = noteKey + currentAccidental + "/4";
    setNotes((prev) => [...prev, { key, duration: currentDuration, accidental: currentAccidental }]);
  };

  // Agregar rest
  const addRest = () => {
    setNotes((prev) => [...prev, { key: "b/4", duration: currentDuration + "r", accidental: "" }]);
  };

  // Limpiar notas
  const clearNotes = () => setNotes([]);

  // Undo last note
  const undoNote = () => {
    setNotes((prev) => prev.slice(0, -1));
  };

  const noteButtons = ["c", "d", "e", "f", "g", "a", "b"];
  const durationOptions = [
    { label: "Whole", value: "w" },
    { label: "Half", value: "h" },
    { label: "Quarter", value: "q" },
    { label: "Eighth", value: "8" },
  ];
  const accidentalOptions = [
    { label: "Natural", value: "n" },
    { label: "Sharp", value: "#" },
    { label: "Flat", value: "b" },
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center text-green-400 mb-6">🎼 Professional Sheet Music Composer</h1>

        {/* Staff Container */}
        <div className="bg-gray-800 p-6 rounded-2xl shadow-lg mb-6">
          <div ref={containerRef} className="flex justify-center"></div>
        </div>

        {/* Controls */}
        <div className="bg-gray-800 p-6 rounded-2xl shadow-lg">
          {/* Duration Selector */}
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">Note Duration</h3>
            <div className="flex gap-2">
              {durationOptions.map((dur) => (
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

          {/* Accidental Selector */}
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">Accidental</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentAccidental("")}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  currentAccidental === "" ? "bg-green-600 text-white" : "bg-gray-700 hover:bg-gray-600"
                }`}
              >
                None
              </button>
              {accidentalOptions.map((acc) => (
                <button
                  key={acc.value}
                  onClick={() => setCurrentAccidental(acc.value)}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    currentAccidental === acc.value ? "bg-green-600 text-white" : "bg-gray-700 hover:bg-gray-600"
                  }`}
                >
                  {acc.label}
                </button>
              ))}
            </div>
          </div>

          {/* Note Buttons */}
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">Add Notes</h3>
            <div className="grid grid-cols-7 gap-2 mb-2">
              {noteButtons.map((note) => (
                <button
                  key={note}
                  onClick={() => addNote(note)}
                  className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition"
                >
                  {note.toUpperCase()}
                </button>
              ))}
            </div>
            <button
              onClick={addRest}
              className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg font-medium transition mr-2"
            >
              Rest
            </button>
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

export default SheetMusic;