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
    cardDiv.dataset.rollId = rollId;

    if (isMain) {
      cardDiv.classList.add("main");
    }

    // Create and append other elements to the card container as needed
    const descriptionDiv = document.createElement("div");
    descriptionDiv.classList.add("description");
    descriptionDiv.textContent = `This is a piano roll number ${rollId}`;
    cardDiv.appendChild(descriptionDiv);

    // Create an SVG element to display the actual piano roll.
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

  // This method sets the main view for a particular roll ID.
  setMainView(rollId) {
    const pianoRollContainer = document.getElementById("pianoRollContainer");
    const pianoRollCards =
      pianoRollContainer.querySelectorAll(".piano-roll-card");

    // Check if a listView exists, and if not, create it.
    let listView = pianoRollContainer.querySelector(".list-view");
    if (!listView) {
      listView = document.createElement("div");
      listView.classList.add("list-view");
      pianoRollContainer.appendChild(listView);
    }
    listView.innerHTML = ""; // Clear any existing content in the listView.

    // Iterate over all piano roll cards.
    pianoRollCards.forEach((card, index) => {
      // If the index matches the rollId, modify the card as the main view.
      if (index === rollId) {
        card.classList.add("main");
        card.querySelector(".piano-roll-svg").setAttribute("width", "90%");
        card.querySelector(".piano-roll-svg").setAttribute("height", "90%");
        pianoRollContainer.prepend(card); // Move the main view to the top
        // If not the main view, make adjustments and add to listView.
      } else {
        card.classList.remove("main");
        card.querySelector(".piano-roll-svg").setAttribute("width", "80%");
        card.querySelector(".piano-roll-svg").setAttribute("height", "150");
        listView.appendChild(card); // Append to listView
      }
    });
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
