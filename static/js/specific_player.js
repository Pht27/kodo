document.addEventListener("DOMContentLoaded", function () {
  const playerContainer = document.querySelector(".match-history-container");
  const playerID = playerContainer.getAttribute("data-player-id");

  showMatchHistory(playerID);
  loadPlayerStats(playerID);
  loadDaytimeStats(playerID);
  loadWeekdayStats(playerID);
  loadTimeSeries(playerID);
});

function loadPlayerStats(playerID) {
  fetch(`/api/stats/${playerID}`)
    .then((response) => response.json())
    .then((data) => {
      document.getElementById("points").textContent = data[0].points;
      setWinrateColor(document.getElementById("winrate"), data[0].winrate);
      document.getElementById("mean_points").textContent = data[0].mean_points;
      setMeanPointsColor(
        document.getElementById("mean_points"),
        data[0].mean_points,
      );
      setWinrateColor(
        document.getElementById("solo_winrate"),
        data[0].solo_winrate,
      );
      document.getElementById("played_solo").textContent = data[0].played_solo;
      document.getElementById("played_alone").textContent =
        data[0].played_alone;
      setWinrateColor(
        document.getElementById("alone_winrate"),
        data[0].alone_winrate,
      );
      document.getElementById("alone_mean_points").textContent =
        data[0].alone_mean_points;
      setMeanPointsColor(
        document.getElementById("alone_mean_points"),
        data[0].alone_mean_points,
      );
      document.getElementById("played").textContent = data[0].played;
      setWinrateColor(
        document.getElementById("winrate_lately"),
        data[0].winrate_lately,
      );
    })
    .catch((error) => {
      console.error("Error fetching player stats:", error);
    });
}

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

function showMatchHistory(playerID) {
  let roundData = [];
  let teamData = [];

  let matchesShown = 0;
  const matchesPerPage = 16;

  // Funktion zum Laden von Runden
  function loadRounds(offset = 0) {
    fetch(
      `/api/stats/match_history/${playerID}?offset=${offset}&limit=${matchesPerPage}`,
    )
      .then((response) => response.json())
      .then((data) => {
        roundData = roundData.concat(data.data); // Neue Runden an das bestehende Array anhängen
        displayMatches(); // Alle bisherigen Runden anzeigen
      });
  }

  // Team WR laden
  function loadTeamWinRates() {
    fetch(`/api/stats/wr_teams/${playerID}`)
      .then((response) => response.json())
      .then((data) => {
        teamData = data; // Accessing the data array from the fetched data
        displayTeammates(); // Load initial teammates after fetching the data
      });
  }

  // Karten WR laden
  function loadCardWinRates() {
    fetch(`/api/stats/cards/${playerID}`)
      .then((response) => response.json())
      .then((data) => {
        cardData = data; // Accessing the data array from the fetched data
        displayCards(); // Load initial teammates after fetching the data
      });
  }

  function loadGameTypeWinRates() {
    fetch(`/api/stats/game_types/${playerID}`)
      .then((response) => response.json())
      .then((data) => {
        cardData = data; // Accessing the data array from the fetched data
        displayGameTypes(cardData); // Load initial teammates after fetching the data
      });
  }

  loadRounds();
  loadTeamWinRates();
  loadCardWinRates();
  loadGameTypeWinRates();

  const matchContainer = document.getElementById("matchContainer");
  const loadMoreBtn = document.getElementById("loadMoreBtn");

  function displayMatches() {
    for (let i = matchesShown; i < roundData.length; i++) {
      const match = roundData[i];

      const reTeams = [];
      const kontraTeams = [];

      const teams = [
        { players: [match[3], match[4]], party: match[5] },
        { players: [match[6], match[7]], party: match[8] },
        { players: [match[9], match[10]], party: match[11] },
        { players: [match[12], match[13]], party: match[14] },
      ];

      teams.forEach((team) => {
        if (team.party === "Re") {
          reTeams.push(team);
        } else if (team.party === "Kontra") {
          kontraTeams.push(team);
        }
      });

      const reTeamsHTML = reTeams
        .map(
          (team) => `
                <div class="team-container">
                    ${team.players
                      .filter((player) => player !== "None")
                      .map(
                        (player) =>
                          `<span class="player-name">${player}</span>`,
                      )
                      .join("")}
                </div>
            `,
        )
        .join("");

      const kontraTeamsHTML = kontraTeams
        .map(
          (team) => `
                <div class="team-container">
                    ${team.players
                      .filter((player) => player !== "None")
                      .map(
                        (player) =>
                          `<span class="player-name">${player}</span>`,
                      )
                      .join("")}
                </div>
            `,
        )
        .join("");

      // Split formatted datetime into date and time
      const datetimeParts = match[1].split(", ");
      const datetimeDate = datetimeParts.slice(0, 2).join(", "); // Join first two parts with a comma
      const datetimeTime = datetimeParts.slice(2).join(", "); // Join remaining parts with a comma

      const matchElement = document.createElement("div");

      matchElement.innerHTML = `
                <div class="match-column">${datetimeTime}<br>${datetimeDate}</div> <!-- Date and Time -->
                <div class="match-column">${match[2]}</div> <!-- Game Type -->
                <div class="match-column teams-wrapper">
                    <div class="re-kontra-container">
                        <div class="teams-column">
                            ${reTeamsHTML}
                        </div>
                    </div>
                </div>
                <div class="match-column teams-wrapper">
                    <div class="re-kontra-container">
                        <div class="teams-column">
                            ${kontraTeamsHTML}
                        </div>
                    </div>
                </div>
                <div class="match-column">${match[15]}</div> <!-- Winning Party -->
            `;

      // handle border depending on if it was a solo
      if (match[18]) {
        matchElement.classList.add("solo");
        matchElement.innerHTML =
          `  <span class="match-icon">⭐</span>` + matchElement.innerHTML;
      } else {
        matchElement.innerHTML =
          `  <span class="match-icon"></span>` + matchElement.innerHTML;
      }

      // handle color of points depending on won / lost
      if (match[17]) {
        matchElement.innerHTML =
          matchElement.innerHTML +
          `<div class="match-column points won">${match[16]}</div> <!-- Points -->`;
      } else {
        matchElement.innerHTML =
          matchElement.innerHTML +
          `<div class="match-column points lost">${match[16]}</div> <!-- Points -->`;
      }

      // handle color of match depending on won / lost
      matchElement.classList.add("match");
      matchElement.classList.add(match[17] ? "won" : "lost");
      matchElement.onclick = () => openMatchPage(match[0]);

      matchContainer.appendChild(matchElement);
    }

    matchesShown = roundData.length; // Update the count of shown matches

    // Check if alle Runden geladen wurden
    if (roundData.length % matchesPerPage !== 0) {
      loadMoreBtn.style.display = "none";
    }
  }

  function displayTeammates() {
    // Filter teammates and sort by winrate
    const teammates = teamData.filter((d) => d.winrate !== "None");
    teammates.sort((a, b) => b.winrate - a.winrate);

    // Get top 5 and bottom 5 teammates
    const bestTeammates = teammates.slice(0, 5);
    const worstTeammates = teammates.slice(-5).reverse();

    // Do the same for the stonks teammates
    teammates.sort((a, b) => b.mean_points - a.mean_points);
    const stonksTeammates = teammates.slice(0, 5);
    const brokeTeammates = teammates.slice(-5).reverse();

    // Display best teammates
    const bestList = document.getElementById("bestTeammates");
    bestList.innerHTML = "";
    bestTeammates.forEach((teammate) => {
      const listItem = document.createElement("li");
      listItem.classList.add("teammate-item");

      // Create a container for name and winrate
      const infoContainer = document.createElement("div");
      infoContainer.classList.add("info-container");

      // Create separate elements for name and winrate
      const nameElement = document.createElement("span");
      nameElement.classList.add("name");
      nameElement.textContent = teammate.name_y;
      infoContainer.appendChild(nameElement);

      const winrateElement = document.createElement("span");
      winrateElement.classList.add("winrate");
      winrateElement.textContent = `${teammate.winrate}%`;
      winrateElement.style.color = getColorForPercentage(
        teammate.winrate / 100,
      );
      infoContainer.appendChild(winrateElement);

      // Append the infoContainer to listItem
      listItem.appendChild(infoContainer);

      // Create element for total games played
      const totalGamesElement = document.createElement("span");
      totalGamesElement.classList.add("total-games");
      totalGamesElement.textContent = ` (${teammate.total_games_played})`;

      // Append the totalGamesElement to listItem
      listItem.appendChild(totalGamesElement);

      bestList.appendChild(listItem);
    });

    // Display worst teammates
    const worstList = document.getElementById("worstTeammates");
    worstList.innerHTML = "";
    worstTeammates.forEach((teammate) => {
      const listItem = document.createElement("li");
      listItem.classList.add("teammate-item");

      // Create a container for name and winrate
      const infoContainer = document.createElement("div");
      infoContainer.classList.add("info-container");

      // Create separate elements for name and winrate
      const nameElement = document.createElement("span");
      nameElement.classList.add("name");
      nameElement.textContent = teammate.name_y;
      infoContainer.appendChild(nameElement);

      const winrateElement = document.createElement("span");
      winrateElement.classList.add("winrate");
      winrateElement.textContent = `${teammate.winrate}%`;
      winrateElement.style.color = getColorForPercentage(
        teammate.winrate / 100,
      );
      infoContainer.appendChild(winrateElement);

      // Append the infoContainer to listItem
      listItem.appendChild(infoContainer);

      // Create element for total games played
      const totalGamesElement = document.createElement("span");
      totalGamesElement.classList.add("total-games");
      totalGamesElement.textContent = ` (${teammate.total_games_played})`;

      // Append the totalGamesElement to listItem
      listItem.appendChild(totalGamesElement);

      worstList.appendChild(listItem);
    });

    // Display stonks teammates
    const stonksList = document.getElementById("stonksTeammates");
    stonksList.innerHTML = "";
    stonksTeammates.forEach((teammate) => {
      const listItem = document.createElement("li");
      listItem.classList.add("teammate-item");

      // Create a container for name and mean points
      const infoContainer = document.createElement("div");
      infoContainer.classList.add("info-container");

      // Create separate elements for name and mean points
      const nameElement = document.createElement("span");
      nameElement.classList.add("name");
      nameElement.textContent = teammate.name_y;
      infoContainer.appendChild(nameElement);

      const winrateElement = document.createElement("span");
      winrateElement.classList.add("mean_points");
      winrateElement.textContent = `${teammate.mean_points}`;
      winrateElement.style.color = getColorForMeanPoints(teammate.mean_points);
      infoContainer.appendChild(winrateElement);

      // Append the infoContainer to listItem
      listItem.appendChild(infoContainer);

      // Create element for total games played
      const totalGamesElement = document.createElement("span");
      totalGamesElement.classList.add("total-games");
      totalGamesElement.textContent = ` (${teammate.total_games_played})`;

      // Append the totalGamesElement to listItem
      listItem.appendChild(totalGamesElement);

      stonksList.appendChild(listItem);
    });

    // Display stonks teammates
    const brokeList = document.getElementById("brokeTeammates");
    brokeList.innerHTML = "";
    brokeTeammates.forEach((teammate) => {
      const listItem = document.createElement("li");
      listItem.classList.add("teammate-item");

      // Create a container for name and mean points
      const infoContainer = document.createElement("div");
      infoContainer.classList.add("info-container");

      // Create separate elements for name and mean points
      const nameElement = document.createElement("span");
      nameElement.classList.add("name");
      nameElement.textContent = teammate.name_y;
      infoContainer.appendChild(nameElement);

      const winrateElement = document.createElement("span");
      winrateElement.classList.add("mean_points");
      winrateElement.textContent = `${teammate.mean_points}`;
      winrateElement.style.color = getColorForMeanPoints(teammate.mean_points);
      infoContainer.appendChild(winrateElement);

      // Append the infoContainer to listItem
      listItem.appendChild(infoContainer);

      // Create element for total games played
      const totalGamesElement = document.createElement("span");
      totalGamesElement.classList.add("total-games");
      totalGamesElement.textContent = ` (${teammate.total_games_played})`;

      // Append the totalGamesElement to listItem
      listItem.appendChild(totalGamesElement);

      brokeList.appendChild(listItem);
    });
  }

  function displayCards() {
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

  // Function to handle clicking on match containers
  function openMatchPage(matchId) {
    console.log("Clicked on match with ID:", matchId);
    // Example: window.location.href = '/match/' + matchId;
  }

  // Event listener für den "Mehr laden"-Button
  loadMoreBtn.addEventListener("click", () => loadRounds(roundData.length));
}

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

function showTab(tabId) {
  // Alle Tab-Inhalte verstecken
  document
    .querySelectorAll(".tab-content")
    .forEach((content) => content.classList.remove("active"));
  // Alle Tab-Buttons deaktivieren
  document
    .querySelectorAll(".tab-button")
    .forEach((button) => button.classList.remove("active"));

  // Den gewünschten Tab anzeigen und den zugehörigen Button aktivieren
  document.getElementById(tabId).classList.add("active");
  document
    .querySelector(`.tab-button[onclick="showTab('${tabId}')"]`)
    .classList.add("active");
}

// Initialen Tab anzeigen
document.addEventListener("DOMContentLoaded", function () {
  showTab("teampartner"); // Zeigt standardmäßig die Teampartner*innen an
});

function loadWeekdayStats(playerID) {
  fetch(`/api/stats/weekdays/${playerID}`)
    .then((response) => response.json())
    .then((data) => {
      // Container für die Wochentags-Statistiken
      const container = document.querySelector(".plot1-container");

      // Bar-Plot für die gespielten Spiele
      const playedBar = {
        x: data.map((d) => d.weekday),
        y: data.map((d) => d.played),
        yaxis: "y1",
        type: "bar",
        name: "Gespielte Spiele",
        marker: { color: "#358336" },
      };

      // Bar-Plot für Mean Points, zentriert um die Offset-Achse
      const meanPointsLine = {
        x: data.map((d) => d.weekday),
        y: data.map((d) => d.mean_points), // Verschiebe Mean Points
        yaxis: "y2",
        type: "scatter",
        mode: "lines+markers",
        name: "Durchschnittliche Punkte",
        marker: { color: "#FFA500" },
      };

      // Layout für den Plot
      const layout = {
        // title: "Gespielte Spiele und Mean Points (Zentrierte Achse)",
        xaxis: { title: "Wochentag" },
        yaxis: {
          title: "Gespielte Spiele",
          zeroline: true, // Zeige Nullachse
          zerolinewidth: 2,
          zerolinecolor: "gray",
        },
        yaxis2: {
          title: "Punkte",
          overlaying: "y",
          side: "right",
          zeroline: false, // Zeige Nullachse nicht
        },
        shapes: [
          {
            type: "line",
            x0: -0.5, // Startpunkt der Linie (x-Achse)
            x1: data.length - 0.5, // Endpunkt der Linie (x-Achse, abhängig von der Anzahl der Tage)
            y0: 0, // Zerolinie (y-Wert)
            y1: 0, // Gleicher Wert wie y0
            xref: "x",
            yref: "y2", // Bezieht sich auf die yaxis2
            line: {
              color: "#2e4981", // Farbe der Linie
              width: 2,
              dash: "dash", // Optionale Strichlinie
            },
            layer: "below traces", // Hier wird die Shape hinter die Traces gelegt
          },
        ],
      };

      // Kombiniere die Plots
      Plotly.newPlot(container, [playedBar, meanPointsLine], layout);
    })
    .catch((error) =>
      console.error("Fehler beim Abrufen der Wochentagsdaten:", error),
    );
}

function loadDaytimeStats(playerID) {
  fetch(`/api/stats/daytime/${playerID}`)
    .then((response) => response.json())
    .then((data) => {
      // Container für die Wochentags-Statistiken
      const container = document.querySelector(".plot2-container");

      // Bar-Plot für die gespielten Spiele
      const playedBar = {
        x: data.map((d) => d.hour),
        y: data.map((d) => d.played),
        yaxis: "y1",
        type: "bar",
        name: "Gespielte Spiele",
        marker: { color: "#358336" },
      };

      // Bar-Plot für Mean Points, zentriert um die Offset-Achse
      const meanPointsLine = {
        x: data.map((d) => d.hour),
        y: data.map((d) => d.mean_points), // Verschiebe Mean Points
        yaxis: "y2",
        type: "scatter",
        mode: "lines+markers",
        name: "Durchschnittliche Punkte",
        marker: { color: "#FFA500" },
      };

      // Layout für den Plot
      const layout = {
        // title: "Gespielte Spiele und Mean Points (Zentrierte Achse)",
        xaxis: { title: "Uhrzeit" },
        yaxis: {
          title: "Gespielte Spiele",
          zeroline: true, // Zeige Nullachse
          zerolinewidth: 2,
          zerolinecolor: "gray",
        },
        yaxis2: {
          title: "Punkte",
          overlaying: "y",
          side: "right",
          zeroline: false, // Zeige Nullachse nicht
        },
        shapes: [
          {
            type: "line",
            x0: -0.5, // Startpunkt der Linie (x-Achse)
            x1: 24, // Endpunkt der Linie (x-Achse, abhängig von der Anzahl der Tage)
            y0: 0, // Zerolinie (y-Wert)
            y1: 0, // Gleicher Wert wie y0
            xref: "x",
            yref: "y2", // Bezieht sich auf die yaxis2
            line: {
              color: "#2e4981", // Farbe der Linie
              width: 2,
              dash: "dash", // Optionale Strichlinie
            },
            layer: "below traces", // Hier wird die Shape hinter die Traces gelegt
          },
        ],
      };

      // Kombiniere die Plots
      Plotly.newPlot(container, [playedBar, meanPointsLine], layout);
    })
    .catch((error) =>
      console.error("Fehler beim Abrufen der Tageszeitdaten:", error),
    );
}

function loadTimeSeries(playerID) {
  fetch(`/api/stats/timeseries/${playerID}`)
    .then((response) => response.json())
    .then((fetchedData) => {
      renderTSPlotly(fetchedData);
    })
    .catch((error) => {
      console.error("Error loading TS stats:", error);
    });
}

function renderTSPlotly(data) {
  const traces = [];
  const players = [...new Set(data.map((item) => item.name))];

  players.forEach((player) => {
    const playerData = data.filter((item) => item.name === player);

    // Create individual traces for each line segment (between two points)
    for (let i = 0; i < playerData.length - 1; i++) {
      const trace = {
        x: [new Date(playerData[i].date), new Date(playerData[i + 1].date)],
        y: [playerData[i].points, playerData[i + 1].points],
        type: "scatter",
        mode: "lines",
        name: player,
        line: {
          color: "green", // Color the line segment based on the first point in the segment
          width: 2, // Optional line width
        },
        showlegend: false,
      };
      traces.push(trace);
    }

    // Add markers with color based on the point values
    const markerTrace = {
      x: playerData.map((item) => new Date(item.date)),
      y: playerData.map((item) => item.points),
      type: "scatter",
      mode: "markers",
      name: player,
      marker: {
        color: "green", // Color the markers based on the points
        size: 8, // Optional marker size
      },
      showlegend: false,
    };
    traces.push(markerTrace);
  });

  const layout = {
    title: "Spieler*in Punkte über Zeit",
    xaxis: {
      title: "Datum",
    },
    yaxis: {
      title: "Punkte",
    },
    hovermode: "closest",
  };

  Plotly.newPlot("time-series-plot", traces, layout);
}
