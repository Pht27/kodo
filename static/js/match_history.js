let roundData = []; // Array zum Speichern aller geladenen Runden
let matchesShown = 0;
const matchesPerPage = 16;

const matchContainer = document.getElementById('matchContainer');
const loadMoreBtn = document.getElementById('loadMoreBtn');

// Funktion zum Laden von Runden
function loadRounds(offset = 0) {
    fetch(`/api/stats/match_history?offset=${offset}&limit=${matchesPerPage}`)
        .then(response => response.json())
        .then(data => {
            roundData = roundData.concat(data.data); // Neue Runden an das bestehende Array anhängen
            displayMatches(); // Alle bisherigen Runden anzeigen
        });
}

// Initialer Aufruf, um die ersten 16 Spiele zu laden
loadRounds();

// Funktion zum Anzeigen der Spiele
function displayMatches() {
    for (let i = matchesShown; i < roundData.length; i++) {
        const match = roundData[i];

        const reTeams = [];
        const kontraTeams = [];

        const teams = [
            { players: [match[3], match[4]], party: match[5] },
            { players: [match[6], match[7]], party: match[8] },
            { players: [match[9], match[10]], party: match[11] },
            { players: [match[12], match[13]], party: match[14] }
        ];

        teams.forEach(team => {
            if (team.party === 'Re') {
                reTeams.push(team);
            } else if (team.party === 'Kontra') {
                kontraTeams.push(team);
            }
        });

        const winning_party = match[15];

        const reTeamsHTML = reTeams.map(team => `
            <div class="team-container ${winning_party === 'Re' ? 'won' : 'lost'}">
                ${team.players.filter(player => player !== 'None').map(player => `<span class="player-name">${player}</span>`).join('')}
            </div>
        `).join('');

        const kontraTeamsHTML = kontraTeams.map(team => `
            <div class="team-container ${winning_party === 'Kontra' ? 'won' : 'lost'}">
                ${team.players.filter(player => player !== 'None').map(player => `<span class="player-name">${player}</span>`).join('')}
            </div>
        `).join('');

        // Split formatted datetime into date and time
        const datetimeParts = match[1].split(', ');
        const datetimeDate = datetimeParts.slice(0, 2).join(', '); // Join first two parts with a comma
        const datetimeTime = datetimeParts.slice(2).join(', '); // Join remaining parts with a comma

        let matchHTML = `
            <div class="match" onclick="openMatchPage('${match[0]}')">
                <span class="match-icon"></span>
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
                <div class="match-column points">${match[16]}</div> <!-- Points -->
            </div>
        `;

        // handle border depending on if it was a solo
        if (match[18]) {
            matchHTML = `
            <div class="match solo" onclick="openMatchPage('${match[0]}')">
                <span class="match-icon">⭐</span>
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
                <div class="match-column points">${match[16]}</div> <!-- Points -->
            </div>
        `;
        }

        matchContainer.innerHTML += matchHTML;
    }

    matchesShown = roundData.length; // Update the count of shown matches

    // Check if alle Runden geladen wurden
    if (roundData.length % matchesPerPage !== 0) {
        loadMoreBtn.style.display = 'none';
    }
}

// Event listener für den "Mehr laden"-Button
loadMoreBtn.addEventListener('click', () => loadRounds(roundData.length));
