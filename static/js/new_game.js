document.addEventListener('DOMContentLoaded', function () {
    const teams = ['team1', 'team2', 'team3', 'team4'];
    let allPlayers = [];
    const teamData = {};

    // Funktion, um Spieler vom Server abzurufen
    async function fetchPlayers() {
        try {
            const response = await fetch('/api/players');
            if (!response.ok) {
                throw new Error('Network response was not ok ' + response.statusText);
            }
            const data = await response.json();
            allPlayers = data;
        } catch (error) {
            console.error('Fetch error: ', error);
        }
    }

    // Spieler vom Server abrufen und Initialisierung vornehmen
    fetchPlayers().then(() => {
        teams.forEach(team => {
            teamData[team] = {
                players: [],
                suggestions: [],
                selectedIndex: 0, // Set the initial selectedIndex to 0
                type: 'Re' // Default type is Re
            };

            const playerNameInput = document.getElementById(`${team}-player-name`);
            const suggestionsList = document.getElementById(`${team}-suggestions`);
            const teamPlayersList = document.getElementById(`${team}-players`);
            const teamTypeRadios = document.querySelectorAll(`input[name='${team}-type']`);

            teamTypeRadios.forEach(radio => {
                radio.addEventListener('change', function () {
                    teamData[team].type = this.value;
                    console.log(`Team ${team} type changed to ${teamData[team].type}`);
                });
            });

            playerNameInput.addEventListener('input', function () {
                const inputValue = this.value.trim().toLowerCase();
                teamData[team].suggestions = allPlayers.filter(player =>
                    player.name.toLowerCase().startsWith(inputValue) && !teamData['team1'].players.includes(player)
                    && !teamData['team2'].players.includes(player) && !teamData['team3'].players.includes(player)
                    && !teamData['team4'].players.includes(player)
                );

                teamData[team].selectedIndex = 0; // Reset the selectedIndex to 0 on input change
                if (inputValue.length > 0) {
                    renderSuggestions(team);
                } else {
                    suggestionsList.innerHTML = '';
                }
            });

            playerNameInput.addEventListener('keydown', function (event) {
                if (event.key === 'Enter') {
                    event.preventDefault(); // Prevent form submission
                    const selectedPlayer = teamData[team].suggestions[teamData[team].selectedIndex];
                    if (selectedPlayer) {
                        addPlayerToTeam(selectedPlayer, team);
                    }
                } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
                    event.preventDefault();
                    adjustSelectedIndex(event.key, team);
                    renderSuggestions(team);
                }
            });

            function renderSuggestions(team) {
                suggestionsList.innerHTML = '';
                teamData[team].suggestions.forEach((player, index) => {
                    const li = document.createElement('li');
                    li.textContent = player.name;
                    li.addEventListener('click', function () {
                        addPlayerToTeam(player, team);
                    });
                    if (index === teamData[team].selectedIndex) {
                        li.classList.add('selected');
                    }
                    suggestionsList.appendChild(li);
                });
            }

            function adjustSelectedIndex(key, team) {
                const maxIndex = teamData[team].suggestions.length - 1;
                if (key === 'ArrowUp' && teamData[team].selectedIndex > 0) {
                    teamData[team].selectedIndex--;
                } else if (key === 'ArrowDown' && teamData[team].selectedIndex < maxIndex) {
                    teamData[team].selectedIndex++;
                }
            }

            function addPlayerToTeam(player, team) {
                teamData[team].players.push(player);
                const li = document.createElement('li');
                li.textContent = player.name;
                const deleteButton = document.createElement('span');
                deleteButton.textContent = 'x';
                deleteButton.classList.add('delete-player');
                deleteButton.addEventListener('click', function () {
                    teamData[team].players = teamData[team].players.filter(p => p !== player);
                    li.remove();
                });
                li.appendChild(deleteButton);
                teamPlayersList.appendChild(li);
                playerNameInput.value = '';
                teamData[team].suggestions = [];
                teamData[team].selectedIndex = 0; // Reset the selectedIndex after adding a player
                renderSuggestions(team);
            }
        });
    });
});

document.addEventListener("DOMContentLoaded", function () {
    // Selektiere alle toggle-section Überschriften
    const toggleSections = document.querySelectorAll(".toggle-section");

    // Füge Klick-Eventlistener hinzu
    toggleSections.forEach(section => {
        section.addEventListener("click", () => {
            // Toggle die Klasse 'collapsed' auf das nächste sibling Element
            section.nextElementSibling.classList.toggle("collapsed");
        });
    });
});

document.querySelectorAll('.toggle-section').forEach(section => {
    section.addEventListener('click', () => {
        section.nextElementSibling.classList.toggle('hidden');
        section.querySelector('.toggle-indicator').classList.toggle('rotated');
    });
});

document.getElementById('save-game').addEventListener('click', () => {
    const teams = [];
    let valid = true;

    for (let i = 1; i <= 4; i++) {
        const teamPlayers = document.querySelectorAll(`#team${i}-players li`);
        if (teamPlayers.length === 0) {
            alert(`Team ${i} hat keine Spieler.`);
            valid = false;
            break;
        }

        const teamType = document.querySelector(`input[name="team${i}-type"]:checked`);
        if (!teamType) {
            alert(`Team ${i} ist keiner Partei zugewiesen.`);
            valid = false;
            break;
        }

        const extraPoints = Array.from(document.querySelectorAll(`input[name="team${i}-extra-points"]:checked`)).map(input => input.value);
        const specialConditions = Array.from(document.querySelectorAll(`input[name="team${i}-special-conditions"]:checked`)).map(input => input.value);

        teams.push({
            team: i,
            players: Array.from(teamPlayers).map(li => li.textContent),
            type: teamType.value,
            extraPoints: extraPoints,
            specialConditions: specialConditions
        });
    }

    if (!valid) return;

    const winner = document.querySelector('input[name="winning-party"]:checked');
    if (!winner) {
        alert('Bitte wählen Sie eine Siegerpartei.');
        return;
    }

    const points = parseFloat(document.getElementById('points').value);
    if (isNaN(points)) {
        alert('Bitte geben Sie eine gültige Punktzahl ein.');
        return;
    }

    const gameType = document.getElementById('game-type').value;

    const gameData = {
        teams: teams,
        winner: winner.value,
        points: points,
        gameType: gameType
    };

    // Hier können wir die Daten an den Server senden oder lokal speichern
    console.log('Game Data:', gameData);
    alert('Spiel erfolgreich gespeichert!');

    fetch('/api/games', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(gameData)
    }).then(response => {
        if (response.ok) {
            loadPlayers();
            form.reset();
        }
    });
});