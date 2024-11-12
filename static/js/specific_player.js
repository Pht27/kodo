document.addEventListener('DOMContentLoaded', function () {
    const playerContainer = document.querySelector('.match-history-container');
    const playerID = playerContainer.getAttribute('data-player-id');

    showMatchHistory(playerID);
    loadPlayerStats(playerID);
});

function loadPlayerStats(playerID) {
    fetch(`/api/stats/${playerID}`)
        .then(response => response.json())
        .then(data => {
            document.getElementById('points').textContent = data[0].points;
            setWinrateColor(document.getElementById('winrate'), data[0].winrate);
            document.getElementById('mean_points').textContent = data[0].mean_points;
            setMeanPointsColor(document.getElementById('mean_points'), data[0].mean_points);
            setWinrateColor(document.getElementById('solo_winrate'), data[0].solo_winrate);
            document.getElementById('played_solo').textContent = data[0].played_solo;
            document.getElementById('played_alone').textContent = data[0].played_alone;
            setWinrateColor(document.getElementById('alone_winrate'), data[0].alone_winrate);
            document.getElementById('alone_mean_points').textContent = data[0].alone_mean_points;
            document.getElementById('played').textContent = data[0].played;
            setWinrateColor(document.getElementById('winrate_lately'), data[0].winrate_lately);
        })
        .catch(error => {
            console.error('Error fetching player stats:', error);
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
            b: Math.round(startColor.b + factor * (midColor.b - startColor.b))
        };
    } else {
        const factor = (pct - 0.5) * 2;
        color = {
            r: Math.round(midColor.r + factor * (endColor.r - midColor.r)),
            g: Math.round(midColor.g + factor * (endColor.g - midColor.g)),
            b: Math.round(midColor.b + factor * (endColor.b - midColor.b))
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

    // Runden laden
    function loadRounds() {
        fetch(`/api/stats/match_history/${playerID}`)
            .then(response => response.json())
            .then(data => {
                roundData = data.data; // Accessing the data array from the fetched data
                displayMatches(); // Load initial matches after fetching the data
            });
    }

    // Team WR laden
    function loadTeamWinRates() {
        fetch(`/api/stats/wr_teams/${playerID}`)
            .then(response => response.json())
            .then(data => {
                teamData = data; // Accessing the data array from the fetched data
                displayTeammates(); // Load initial teammates after fetching the data
            });
    }

    loadRounds();
    loadTeamWinRates();

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

            const matchElement = document.createElement('div');

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
                matchElement.classList.add('solo')
                matchElement.innerHTML = `  <span class="match-icon">⭐</span>` + matchElement.innerHTML
            }
            else {
                matchElement.innerHTML = `  <span class="match-icon"></span>` + matchElement.innerHTML
            }

            // handle color of points depending on won / lost
            if (match[17]) {
                matchElement.innerHTML = matchElement.innerHTML + `<div class="match-column points won">${match[16]}</div> <!-- Points -->`
            }
            else {
                matchElement.innerHTML = matchElement.innerHTML + `<div class="match-column points lost">${match[16]}</div> <!-- Points -->`
            }

            // handle color of match depending on won / lost
            matchElement.classList.add('match');
            matchElement.classList.add(match[17] ? 'won' : 'lost');
            matchElement.onclick = () => openMatchPage(match[0]);

            matchContainer.appendChild(matchElement);
        }
        matchesShown += matchesPerPage;

        // Check if all matches have been loaded
        if (matchesShown >= roundData.length) {
            loadMoreBtn.style.display = 'none';
        }
    }

    function displayTeammates() {
        // Filter teammates and sort by winrate
        const teammates = teamData.filter(d => d.winrate !== 'None');
        teammates.sort((a, b) => b.winrate - a.winrate);

        // Get top 5 and bottom 5 teammates
        const bestTeammates = teammates.slice(0, 5);
        const worstTeammates = teammates.slice(-5).reverse();

        console.log(bestTeammates)
        console.log(worstTeammates)

        // Do the same for the stonks teammates
        teammates.sort((a, b) => b.mean_points - a.mean_points);
        const stonksTeammates = teammates.slice(0, 5);

        console.log(stonksTeammates)

        // Display best teammates
        const bestList = document.getElementById('bestTeammates');
        bestList.innerHTML = '';
        bestTeammates.forEach(teammate => {
            const listItem = document.createElement('li');
            listItem.classList.add('teammate-item');

            // Create a container for name and winrate
            const infoContainer = document.createElement('div');
            infoContainer.classList.add('info-container');

            // Create separate elements for name and winrate
            const nameElement = document.createElement('span');
            nameElement.classList.add('name');
            nameElement.textContent = teammate.name_y;
            infoContainer.appendChild(nameElement);

            const winrateElement = document.createElement('span');
            winrateElement.classList.add('winrate');
            winrateElement.textContent = `${teammate.winrate}%`;
            winrateElement.style.color = getColorForPercentage(teammate.winrate / 100);
            infoContainer.appendChild(winrateElement);

            // Append the infoContainer to listItem
            listItem.appendChild(infoContainer);

            // Create element for total games played
            const totalGamesElement = document.createElement('span');
            totalGamesElement.classList.add('total-games');
            totalGamesElement.textContent = ` (${teammate.total_games_played})`;

            // Append the totalGamesElement to listItem
            listItem.appendChild(totalGamesElement);

            bestList.appendChild(listItem);
        });

        // Display worst teammates
        const worstList = document.getElementById('worstTeammates');
        worstList.innerHTML = '';
        worstTeammates.forEach(teammate => {
            const listItem = document.createElement('li');
            listItem.classList.add('teammate-item');

            // Create a container for name and winrate
            const infoContainer = document.createElement('div');
            infoContainer.classList.add('info-container');

            // Create separate elements for name and winrate
            const nameElement = document.createElement('span');
            nameElement.classList.add('name');
            nameElement.textContent = teammate.name_y;
            infoContainer.appendChild(nameElement);

            const winrateElement = document.createElement('span');
            winrateElement.classList.add('winrate');
            winrateElement.textContent = `${teammate.winrate}%`;
            winrateElement.style.color = getColorForPercentage(teammate.winrate / 100);
            infoContainer.appendChild(winrateElement);

            // Append the infoContainer to listItem
            listItem.appendChild(infoContainer);

            // Create element for total games played
            const totalGamesElement = document.createElement('span');
            totalGamesElement.classList.add('total-games');
            totalGamesElement.textContent = ` (${teammate.total_games_played})`;

            // Append the totalGamesElement to listItem
            listItem.appendChild(totalGamesElement);

            worstList.appendChild(listItem);
        });

        // Display stonks teammates
        const stonksList = document.getElementById('stonksTeammates');
        stonksList.innerHTML = '';
        stonksTeammates.forEach(teammate => {
            const listItem = document.createElement('li');
            listItem.classList.add('teammate-item');

            // Create a container for name and mean points
            const infoContainer = document.createElement('div');
            infoContainer.classList.add('info-container');

            // Create separate elements for name and mean points
            const nameElement = document.createElement('span');
            nameElement.classList.add('name');
            nameElement.textContent = teammate.name_y;
            infoContainer.appendChild(nameElement);

            const winrateElement = document.createElement('span');
            winrateElement.classList.add('mean_points');
            winrateElement.textContent = `${teammate.mean_points}`;
            winrateElement.style.color = getColorForMeanPoints(teammate.mean_points);
            infoContainer.appendChild(winrateElement);

            // Append the infoContainer to listItem
            listItem.appendChild(infoContainer);

            // Create element for total games played
            const totalGamesElement = document.createElement('span');
            totalGamesElement.classList.add('total-games');
            totalGamesElement.textContent = ` (${teammate.total_games_played})`;

            // Append the totalGamesElement to listItem
            listItem.appendChild(totalGamesElement);

            stonksList.appendChild(listItem);
        });
    }

    // Function to handle clicking on match containers
    function openMatchPage(matchId) {
        console.log('Clicked on match with ID:', matchId);
        // Example: window.location.href = '/match/' + matchId;
    }

    // Event listener for load more button
    loadMoreBtn.addEventListener('click', displayMatches);
}
