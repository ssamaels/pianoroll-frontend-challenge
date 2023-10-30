import PianoRoll from "./pianoroll.js";

class PianoRollDisplay {
  constructor() {
    // this.csvURL = csvURL;
    this.data = null;
  }

  async loadPianoRollData() {
    try {
      const response = await fetch("https://pianoroll.ai/random_notes");
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      this.data = await response.json();
    } catch (error) {
      console.error("Error loading data:", error);
    }
  }

  preparePianoRollCard(rollId, isMain = false) {
    const cardDiv = document.createElement("div");
    cardDiv.classList.add("piano-roll-card");
    if (isMain) {
      cardDiv.classList.add("main");
    }

    // Create and append other elements to the card container as needed
    const descriptionDiv = document.createElement("div");
    descriptionDiv.classList.add("description");
    descriptionDiv.textContent = `This is a piano roll number ${rollId}`;
    cardDiv.appendChild(descriptionDiv);

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.classList.add("piano-roll-svg");
    const svgWidth = isMain ? "90%" : "80%";
    const svgHeight = isMain ? "90%" : "150";

    svg.setAttribute("width", svgWidth);
    svg.setAttribute("height", svgHeight);

    // Append the SVG to the card container
    cardDiv.appendChild(svg);

    // Added event listener for the interactive selection
    cardDiv.addEventListener("click", () => {
      this.setMainView(rollId);
    });

    return { cardDiv, svg };
  }

  setMainView(rollId) {
    const pianoRollContainer = document.getElementById("pianoRollContainer");
    pianoRollContainer.innerHTML = "";

    // Setting the main view
    const { cardDiv: mainCard, svg: mainSvg } = this.preparePianoRollCard(
      rollId,
      true
    );
    pianoRollContainer.appendChild(mainCard);
    const roll = new PianoRoll(
      mainSvg,
      this.data.slice(rollId * 60, rollId * 60 + 60)
    );

    // Setting the list view
    const listView = document.createElement("div");
    listView.classList.add("list-view");
    for (let it = 0; it < 20; it++) {
      if (it === rollId) continue;
      const start = it * 60;
      const end = start + 60;
      const partData = this.data.slice(start, end);
      const { cardDiv, svg } = this.preparePianoRollCard(it);
      listView.appendChild(cardDiv);
      const listViewRoll = new PianoRoll(svg, partData);
    }
    pianoRollContainer.appendChild(listView);
  }

  async generateSVGs() {
    if (!this.data) await this.loadPianoRollData();
    if (!this.data) return;

    const pianoRollContainer = document.getElementById("pianoRollContainer");
    pianoRollContainer.innerHTML = "";
    for (let it = 0; it < 20; it++) {
      const start = it * 60;
      const end = start + 60;
      const partData = this.data.slice(start, end);

      const { cardDiv, svg } = this.preparePianoRollCard(it);

      pianoRollContainer.appendChild(cardDiv);
      const roll = new PianoRoll(svg, partData);
    }
  }
}

document.getElementById("loadCSV").addEventListener("click", async () => {
  const csvToSVG = new PianoRollDisplay();
  await csvToSVG.generateSVGs();
});
