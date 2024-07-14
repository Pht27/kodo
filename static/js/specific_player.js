function showMatchHistory(playerID) {
    let roundData = [];
    // Runden laden
    function loadRounds() {
        fetch(`/api/stats/match_history/${playerID}`)
            .then(response => response.json())
            .then(data => {
                roundData = data.data; // Accessing the data array from the fetched data
                displayMatches(); // Load initial matches after fetching the data
            });
    }

    loadRounds();

    const matchContainer = document.getElementById('matchContainer');
    const loadMoreBtn = document.getElementById('loadMoreBtn');

    let matchesShown = 0;
    const matchesPerPage = 16;

    // Function to display matches
    function displayMatches() {
        for (let i = matchesShown; i < Math.min(matchesShown + matchesPerPage, roundData.length); i++) {
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

            const reTeamsHTML = reTeams.map(team => `
                <div class="team-container">
                    ${team.players.filter(player => player !== 'None').map(player => `<span class="player-name">${player}</span>`).join('')}
                </div>
            `).join('');

            const kontraTeamsHTML = kontraTeams.map(team => `
                <div class="team-container">
                    ${team.players.filter(player => player !== 'None').map(player => `<span class="player-name">${player}</span>`).join('')}
                </div>
            `).join('');

            // Split formatted datetime into date and time
            const datetimeParts = match[1].split(', ');
            const datetimeDate = datetimeParts.slice(0, 2).join(', '); // Join first two parts with a comma
            const datetimeTime = datetimeParts.slice(2).join(', '); // Join remaining parts with a comma

            const matchHTML = `
                <div class="match" onclick="openMatchPage('${match[0]}')">
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
                    <div class="match-column">${match[16]}</div> <!-- Points -->
                </div>
            `;
            matchContainer.innerHTML += matchHTML;
        }
        matchesShown += matchesPerPage;

        // Check if all matches have been loaded
        if (matchesShown >= roundData.length) {
            loadMoreBtn.style.display = 'none';
        }
    }

    // Function to handle clicking on match containers
    function openMatchPage(matchId) {
        console.log('Clicked on match with ID:', matchId);
        // Example: window.location.href = '/match/' + matchId;
    }

    // Event listener for load more button
    loadMoreBtn.addEventListener('click', displayMatches);

};

document.addEventListener('DOMContentLoaded', function () {
    const playerContainer = document.querySelector('.match-history-container');
    const playerID = playerContainer.getAttribute('data-player-id');
    showMatchHistory(playerID);
});