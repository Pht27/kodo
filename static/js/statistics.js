function getColorForPercentage(pct) {
  const startColor = { r: 153, g: 0, b: 0 }; // Dark red
  const midColor = { r: 153, g: 153, b: 0 }; // Dark yellow
  const endColor = { r: 0, g: 153, b: 0 }; // Dark green

  let color;
  if (pct < 0.5) {
    const factor = pct * 2;
    color = {
      r: Math.round(startColor.r + factor * (midColor.r - startColor.r)),
      g: Math.round(startColor.g + factor * (midColor.g - startColor.g)),
      b: Math.round(startColor.b + factor * (midColor.b - startColor.b)),
    };
  } else {
    const factor = (pct - 0.5) * 2;
    color = {
      r: Math.round(midColor.r + factor * (endColor.r - midColor.r)),
      g: Math.round(midColor.g + factor * (endColor.g - midColor.g)),
      b: Math.round(midColor.b + factor * (endColor.b - midColor.b)),
    };
  }

  return `rgb(${color.r}, ${color.g}, ${color.b})`;
}

function getColorForMeanPoints(meanPoints) {
  // Clamping meanPoints to the range -2 to 2
  const clampedPoints = Math.max(-2, Math.min(2, meanPoints));
  const pct = (clampedPoints + 2) / 4; // Normalize to 0 to 1
  return getColorForPercentage(pct);
}

function setWinrateColor(element, winrate) {
  winrate = (winrate * 100).toFixed(2);
  element.textContent = `${winrate}%`;
  element.style.color = getColorForPercentage(winrate / 100);
}

function setMeanPointsColor(element, meanPoints) {
  element.textContent = meanPoints;
  element.style.color = getColorForMeanPoints(meanPoints);
}

document.addEventListener("DOMContentLoaded", function () {
  function loadTSStats() {
    fetch("/api/stats/ts")
      .then((response) => response.json())
      .then((fetchedData) => {
        renderTSPlotly(fetchedData);
      })
      .catch((error) => {
        console.error("Error loading TS stats:", error);
      });
  }

  function loadWRStats() {
    fetch("/api/stats/wr_teams")
      .then((response) => response.json())
      .then((fetchedData) => {
        renderWRPlotly(fetchedData);
      })
      .catch((error) => {
        console.error("Error loading WR stats:", error);
      });
  }

  function loadCardStats() {
    fetch("/api/stats/cards")
      .then((response) => response.json())
      .then((fetchedData) => {
        displayCards(fetchedData); // Load initial teammates after fetching the data
      })
      .catch((error) => {
        console.error("Error loading Card stats:", error);
      });
  }

  function loadGamesPlayedStats() {
    fetch("/api/stats/games_played")
      .then((response) => response.json())
      .then((fetchedData) => {
        displayGamesPlayed(fetchedData); // Load initial teammates after fetching the data
      })
      .catch((error) => {
        console.error("Error loading games played stats:", error);
      });
  }

  function loadGameTypesStats() {
    fetch("/api/stats/game_types")
      .then((response) => response.json())
      .then((fetchedData) => {
        displayGameTypes(fetchedData); // Load initial teammates after fetching the data
      })
      .catch((error) => {
        console.error("Error loading game types stats:", error);
      });
  }

  function renderTSPlotly(data) {
    const traces = [];
    const players = [...new Set(data.map((item) => item.name))];
    players.forEach((player) => {
      const playerData = data.filter((item) => item.name === player);
      const trace = {
        x: playerData.map((item) => new Date(item.date)),
        y: playerData.map((item) => item.points),
        type: "scatter",
        mode: "lines+markers",
        name: player,
      };
      traces.push(trace);
    });

    const layout = {
      title: "Spieler*in Punkte über Zeit",
      xaxis: {
        title: "Datum",
      },
      yaxis: {
        title: "Punkte",
      },
    };

    Plotly.newPlot("ts-plot", traces, layout);
  }

  function renderWRPlotly(dataDict) {
    const playerNames = Array.from(
      new Set(
        dataDict.data
          .map((item) => item[0])
          .concat(dataDict.data.map((item) => item[1])),
      ),
    );

    const zValues = playerNames.map((rowPlayer) =>
      playerNames.map((colPlayer) => {
        const match = dataDict.data.find(
          (item) => item[0] === rowPlayer && item[1] === colPlayer,
        );
        const value = match ? match[2] : NaN;
        return isNaN(value) ? null : value; // Convert NaN to null
      }),
    );

    // Define the colorscale from red (0.0) to green (100.0)
    const colorscale = [
      [0, "red"],
      [0.5, "yellow"],
      [1, "green"],
    ];

    const heatmapData = [
      {
        x: playerNames,
        y: playerNames,
        z: zValues,
        type: "heatmap",
        colorscale: colorscale,
        colorbar: {
          title: "Winrate",
          titleside: "top",
          tickmode: "array",
          tickvals: [0, 50, 100],
          ticktext: ["0%", "50%", "100%"],
        },
      },
    ];

    const layout = {
      title: "Team Winrates",
      xaxis: {
        title: "Spieler*in 1",
      },
      yaxis: {
        title: "Spieler*in 2",
      },
      autosize: true,
    };

    Plotly.newPlot("team-winrates-plot", heatmapData, layout);
  }

  function displayCards(cardData) {
    // Referenz auf das Tabellen-Body-Element der Sonderkarten-Tabelle
    const tableBody = document.querySelector("#specialCardsTable tbody");

    // Leere das Tabellen-Body-Element, um alte Einträge zu entfernen
    tableBody.innerHTML = "";

    // Iteriere durch cardData und füge jede Karte zur Tabelle hinzu
    cardData.forEach((card) => {
      // Erstelle eine neue Zeile für die aktuelle Karte
      const row = document.createElement("tr");

      // Erstelle die Zellen für die Spalten "Sonderkarte", "Winrate" und "Durchschnittliche Punkte"
      const nameCell = document.createElement("td");
      nameCell.textContent = card.special;

      const winrateCell = document.createElement("td");
      winrateCell.textContent = `${card.winrate.toFixed(2)}%`;
      winrateCell.style.color = getColorForPercentage(card.winrate / 100);

      // Create element for total games played
      const totalGamesCell = document.createElement("td");
      totalGamesCell.innerHTML = ` <span style="font-weight: bold; color: black;">${card.played}</span>`;

      const meanPointsCell = document.createElement("td");
      meanPointsCell.textContent = `${card.mean_points.toFixed(2)}`;
      meanPointsCell.style.color = getColorForMeanPoints(card.mean_points);

      // Füge die Zellen zur Zeile hinzu
      row.appendChild(nameCell);
      row.appendChild(winrateCell);
      row.appendChild(totalGamesCell);
      row.appendChild(meanPointsCell);

      // Füge die Zeile zum Tabellen-Body hinzu
      tableBody.appendChild(row);
    });
  }

  function displayGameTypes(cardData) {
    // Referenz auf das Tabellen-Body-Element der Sonderkarten-Tabelle
    const tableBody = document.querySelector("#gameTypesTable tbody");
    // Leere das Tabellen-Body-Element, um alte Einträge zu entfernen
    tableBody.innerHTML = "";

    // Iteriere durch cardData und füge jede Karte zur Tabelle hinzu
    cardData.forEach((card) => {
      // Erstelle eine neue Zeile für die aktuelle Karte
      const row = document.createElement("tr");

      // Erstelle die Zellen für die Spalten "Sonderkarte", "Winrate" und "Durchschnittliche Punkte"
      const nameCell = document.createElement("td");
      nameCell.textContent = card.game_type;

      const winrateCell = document.createElement("td");
      winrateCell.textContent = `${card.winrate.toFixed(2)}%`;
      winrateCell.style.color = getColorForPercentage(card.winrate / 100);

      // Create element for total games played
      const totalGamesCell = document.createElement("td");
      totalGamesCell.innerHTML = ` <span style="font-weight: bold; color: black;">${card.played}</span>`;

      const meanPointsCell = document.createElement("td");
      meanPointsCell.textContent = `${card.mean_points.toFixed(2)}`;
      meanPointsCell.style.color = getColorForMeanPoints(card.mean_points);

      // Füge die Zellen zur Zeile hinzu
      row.appendChild(nameCell);
      row.appendChild(winrateCell);
      row.appendChild(totalGamesCell);
      row.appendChild(meanPointsCell);

      // Füge die Zeile zum Tabellen-Body hinzu
      tableBody.appendChild(row);
    });
  }

  function displayGamesPlayed(gamesData) {
    document.getElementById("games-played-counter").textContent = gamesData;
  }

  loadTSStats();
  loadWRStats();
  loadCardStats();
  loadGamesPlayedStats();
  loadGameTypesStats();
});

let sortDirections = [true, false, false, false]; // true: ascending for column 0, descending for 1 and 2

function sortTable(columnIndex) {
  const table = document.getElementById("specialCardsTable");
  const rows = Array.from(table.rows).slice(1); // exclude header
  const isNumeric = columnIndex > 0;

  // Toggle sort direction
  sortDirections[columnIndex] = !sortDirections[columnIndex];
  const sortAscending = sortDirections[columnIndex];

  // Sort rows
  const sortedRows = rows.sort((a, b) => {
    const aText = a.cells[columnIndex].textContent;
    const bText = b.cells[columnIndex].textContent;
    const comparison = isNumeric
      ? parseFloat(aText) - parseFloat(bText)
      : aText.localeCompare(bText);

    return sortAscending ? comparison : -comparison;
  });

  // Append sorted rows back to the table
  sortedRows.forEach((row) => table.appendChild(row));
}

function sortTable2(columnIndex) {
  const table = document.getElementById("gameTypesTable");
  const rows = Array.from(table.rows).slice(1); // exclude header
  const isNumeric = columnIndex > 0;

  // Toggle sort direction
  sortDirections[columnIndex] = !sortDirections[columnIndex];
  const sortAscending = sortDirections[columnIndex];

  // Sort rows
  const sortedRows = rows.sort((a, b) => {
    const aText = a.cells[columnIndex].textContent;
    const bText = b.cells[columnIndex].textContent;
    const comparison = isNumeric
      ? parseFloat(aText) - parseFloat(bText)
      : aText.localeCompare(bText);

    return sortAscending ? comparison : -comparison;
  });

  // Append sorted rows back to the table
  sortedRows.forEach((row) => table.appendChild(row));
}
