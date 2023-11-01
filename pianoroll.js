export function generateGradientTable(startColor, endColor, steps) {
  const gradientTable = [];
  for (let i = 0; i < steps; i++) {
    const r = startColor.r + ((endColor.r - startColor.r) * i) / (steps - 1);
    const g = startColor.g + ((endColor.g - startColor.g) * i) / (steps - 1);
    const b = startColor.b + ((endColor.b - startColor.b) * i) / (steps - 1);
    gradientTable.push(
      `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`
    );
  }
  return gradientTable;
}

export default class PianoRoll {
  constructor(svgElement, sequence) {
    this.svgElement = svgElement;
    this.end = null;
    this.notes = [];
    this.mouseHasMoved = false;

    // PianoRoll brand #5DB5D5
    const backgroundStartColor = { r: 93, g: 181, b: 213 };
    // #154151
    const backgroundEndColor = { r: 21, g: 65, b: 81 };
    this.backgroundColormap = generateGradientTable(
      backgroundStartColor,
      backgroundEndColor,
      128
    );

    const noteStartColor = { r: 66, g: 66, b: 61 };
    const noteEndColor = { r: 28, g: 28, b: 26 };
    this.noteColormap = generateGradientTable(
      noteStartColor,
      noteEndColor,
      128
    );

    this.svgElement.setAttribute("viewBox", "0 0 1 1");
    this.svgElement.setAttribute("preserveAspectRatio", "none");
    this.drawPianoRoll(sequence);

    // Initialize properties related to selection within the PianoRoll.
    this.selection = {
      active: false, // If a new selection is being drawn.
      present: false, // If a selection currently exists.
      start: null, // Start x-coordinate of the selection.
      end: null, // End x-coordinate of the selection.
      resizing: false, // If the selection is being resized.
      activeEdge: null, // Which edge ("start" or "end") of the selection is being manipulated.
    };

    // Create a rectangle for selection visuals
    this.selectionRect = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "rect"
    );
    this.selectionRect.setAttribute("visibility", "hidden");
    this.selectionRect.setAttribute("y", "0");
    this.selectionRect.setAttribute("height", "1");
    this.selectionRect.setAttribute("x", "0");
    this.selectionRect.setAttribute("width", "0.1");
    this.selectionRect.setAttribute("fill", "rgba(0, 255, 0, 0.2)");
    this.svgElement.appendChild(this.selectionRect);

    this.startHandle = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "rect"
    );
    this.startHandle.setAttribute("visibility", "hidden");
    this.startHandle.setAttribute("height", "1");
    this.startHandle.setAttribute("width", "0.003");
    this.startHandle.setAttribute("fill", "rgba(0, 255, 0)");
    this.startHandle.setAttribute("cursor", "col-resize");
    this.startHandle.setAttribute("z-index", "50");
    this.svgElement.appendChild(this.startHandle);

    this.endHandle = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "rect"
    );
    this.endHandle.setAttribute("visibility", "hidden");
    this.endHandle.setAttribute("height", "1");
    this.endHandle.setAttribute("width", "0.003");
    this.endHandle.setAttribute("fill", "rgba(0, 255, 0)");
    this.endHandle.setAttribute("cursor", "col-resize");
    this.endHandle.setAttribute("z-index", "50");
    this.svgElement.appendChild(this.endHandle);

    // Create an exit button for the selection
    this.exitButton = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "text"
    );
    this.exitButton.textContent = "X";
    this.exitButton.setAttribute("visibility", "hidden");
    this.exitButton.setAttribute("font-size", "0.02");
    this.exitButton.setAttribute("cursor", "pointer");
    this.exitButton.addEventListener("click", this.exitSelection.bind(this));
    this.svgElement.appendChild(this.exitButton);

    this.drawPianoRoll(sequence);

    // Event Listeners for selection
    this.svgElement.addEventListener(
      "mousedown",
      this.startSelection.bind(this)
    );
    this.svgElement.addEventListener(
      "mousemove",
      this.updateSelection.bind(this)
    );
    this.svgElement.addEventListener("mouseup", (e) =>
      this.confirmSelection(e)
    );
  }

  timeToX(time) {
    // Converts time value to x-coordinate on SVG.
    return time / this.end;
  }

  drawPianoRoll(sequence) {
    this.start = sequence[0].start;
    this.end = sequence[sequence.length - 1].end - this.start;
    // Extract just the pitches to prepare the SVG parameters
    const pitches = sequence.map((note) => {
      return note.pitch;
    });

    // Make it at lest 2 octaves (2 * 12)
    let pitch_min = Math.min(...pitches);
    let pitch_max = Math.max(...pitches);
    let pitch_span = pitch_max - pitch_min;

    // If the span is too low, we have to extend it equally on both sides
    if (pitch_span < 24) {
      const diff = 24 - pitch_span;
      const low = Math.ceil(diff / 2);
      const high = Math.floor(diff / 2);
      pitch_min -= low;
      pitch_max += high;
    }
    // And margin up and down
    pitch_min -= 3;
    pitch_max += 3;
    pitch_span = pitch_max - pitch_min;
    this.note_height = 1 / pitch_span;
    this.drawEmptyPianoRoll(pitch_min, pitch_max);

    sequence.forEach((note) => {
      const note_rectangle = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "rect"
      );

      // Position and width are based on time
      const x = this.timeToX(note.start - this.start);
      const w = this.timeToX(note.end - note.start);

      note_rectangle.setAttribute("x", `${x}`);
      note_rectangle.setAttribute("width", `${w}`);

      // Computers draw upside down
      const y = 1 - (note.pitch - pitch_min) / pitch_span;

      note_rectangle.setAttribute("y", `${y}`);
      note_rectangle.setAttribute("height", `${this.note_height}`);

      // Colorcoding velocity
      const color = this.noteColormap[note.velocity];
      note_rectangle.setAttribute("fill", color);

      note_rectangle.classList.add("note-rectangle");

      // Draw it
      this.svgElement.appendChild(note_rectangle);

      this.notes.push({
        note: note,
        position: x,
      });
    });
  }

  // Draws the empty PianoRoll with key separations and colors for black keys.
  drawEmptyPianoRoll(pitch_min, pitch_max) {
    const pitch_span = pitch_max - pitch_min;
    for (let it = pitch_min; it <= pitch_max + 1; it++) {
      // Black keys
      if ([1, 3, 6, 8, 10].includes(it % 12)) {
        const rect = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "rect"
        );
        const y = 1 - (it - pitch_min) / pitch_span;
        const x = 0;
        const h = 1 / pitch_span;
        const w = 1;

        rect.setAttribute("fill", this.backgroundColormap[12]);
        rect.setAttribute("fill-opacity", "0.666");
        rect.setAttribute("x", `${x}`);
        rect.setAttribute("y", `${y}`);
        rect.setAttribute("width", `${w}`);
        rect.setAttribute("height", `${h}`);
        this.svgElement.appendChild(rect);
      }

      // Key separation
      var line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      const y = 1 - (it - pitch_min) / pitch_span + 1 / pitch_span;
      line.setAttribute("x1", "0");
      line.setAttribute("y1", `${y}`);
      line.setAttribute("x2", "2");
      line.setAttribute("y2", `${y}`);
      let line_width;

      // Every octave, line is bolder
      if (it % 12 === 0) {
        line_width = 0.003;
      } else {
        line_width = 0.001;
      }
      line.setAttribute("stroke-width", `${line_width}`);
      line.setAttribute("stroke", "black");
      this.svgElement.appendChild(line);
    }
  }

  // Begins the process of making a selection.
  startSelection(e) {
    this.mouseHasMoved = false;

    const rect = this.svgElement.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;

    if (this.selection.present) {
      if (this.isNearEdge(x, "start")) {
        this.selection.resizing = true;
        this.selection.activeEdge = "start";
      } else if (this.isNearEdge(x, "end")) {
        this.selection.resizing = true;
        this.selection.activeEdge = "end";
      }
      return;
    }

    this.selection.active = true;
    this.selection.start = x;
    this.selection.end = x;
    this.selectionRect.setAttribute("x", this.selection.start);
    this.selectionRect.setAttribute("width", "0");
    this.selectionRect.setAttribute("visibility", "visible");
    this.exitButton.setAttribute("visibility", "visible");
  }

  // Determines if x-coordinate is within an existing selection.
  isWithinSelection(x) {
    // Check if the current x-coordinate is within the existing selection
    const start = parseFloat(this.selectionRect.getAttribute("x"));
    const width = parseFloat(this.selectionRect.getAttribute("width"));
    return x >= start && x <= start + width;
  }

  // Determines if the x-coordinate is near a specified edge of the selection.
  isNearEdge(x, edge) {
    const tolerance = 0.02;
    const position =
      edge === "start"
        ? parseFloat(this.startHandle.getAttribute("x"))
        : parseFloat(this.endHandle.getAttribute("x"));
    return Math.abs(x - position) < tolerance;
  }

  // Updates the visual representation of the selection as the mouse moves.
  updateSelection(e) {
    this.mouseHasMoved = true;

    const rect = this.svgElement.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;

    if (this.selection.resizing) {
      if (this.selection.activeEdge === "start") {
        this.selection.start = x;
      } else if (this.selection.activeEdge === "end") {
        this.selection.end = x;
      }
    } else {
      // If there's already a selection present, don't do anything
      if (this.selection.present) return;

      // If we're making a new selection
      if (x >= this.selection.start) {
        this.selection.end = x;
      } else {
        this.selection.end = this.selection.start;
        this.selection.start = x;
      }
    }

    this.updateRect();
    this.updateHandles();
    this.updateExitButton();
  }

  // Confirm the current selection when the mouse button is released.
  confirmSelection(e) {
    if (!this.mouseHasMoved) {
      this.exitSelection();
      return;
    }

    const [start, end] = [this.selection.start, this.selection.end].sort(
      (a, b) => a - b
    );

    this.selection.start = start;
    this.selection.end = end;

    this.selection.active = false;
    this.selection.resizing = false;
    this.selection.activeEdge = null;

    this.selection.present = true; // The selection is now present
    this.updateRect();
    this.updateExitButton();

    this.selectionRect.setAttribute("visibility", "visible");
    this.exitButton.setAttribute("visibility", "visible");
    this.startHandle.setAttribute("visibility", "visible");
    this.endHandle.setAttribute("visibility", "visible");

    let selectedNotes = this.notes.filter((noteObj) => {
      const noteStart = noteObj.position;
      const noteWidth = this.timeToX(noteObj.note.end - noteObj.note.start);
      const noteEnd = noteStart + noteWidth;
      return noteStart >= this.selection.start && noteEnd <= this.selection.end;
    });

    console.log("Selection Start:", this.selection.start);
    console.log("Selection End:", this.selection.end);
    console.log("Number of notes within the selection:", selectedNotes.length);
  }

  // Position the exit button on the selection.
  placeExitButton(x) {
    this.exitButton.setAttribute("x", x - 0.05);
    this.exitButton.setAttribute("y", "0.05");
    this.exitButton.setAttribute("visibility", "hidden");
  }

  // Exit the selection mode and hide selection visuals.
  exitSelection() {
    this.selectionRect.setAttribute("visibility", "hidden");
    this.exitButton.setAttribute("visibility", "hidden");
    this.startHandle.setAttribute("visibility", "hidden");
    this.endHandle.setAttribute("visibility", "hidden");

    this.selection.present = false; // Reset the flag when you exit the selection
    this.selection.active = false;
    this.selection.resizing = false;
    this.selection.activeEdge = null;
  }

  // Update the size and position of the selection rectangle.
  updateRect() {
    this.selectionRect.setAttribute("x", this.selection.start);
    this.selectionRect.setAttribute(
      "width",
      this.selection.end - this.selection.start
    );
  }

  // Update the position of the selection handles (start and end).
  updateHandles() {
    this.startHandle.setAttribute("x", this.selection.start);
    this.startHandle.setAttribute("y", "0");
    this.endHandle.setAttribute("x", this.selection.end);
    this.endHandle.setAttribute("y", "0");
  }

  // Update the position of the exit button based on the current selection.
  updateExitButton() {
    this.placeExitButton(this.selection.end + 0.06);
  }
}
