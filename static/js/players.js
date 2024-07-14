document.addEventListener('DOMContentLoaded', function () {
    const playerList = document.getElementById('player-list');
    const form = document.getElementById('add-player-form');

    // Spieler laden
    function loadPlayers() {
        fetch('/api/players')
            .then(response => response.json())
            .then(data => {
                playerList.innerHTML = '';
                data.forEach(player => {
                    const li = document.createElement('li');
                    li.innerHTML = `${player.name} <span class="delete-player" data-id="${player.player_id}">🗑️</span>`;
                    li.addEventListener('click', function () {
                        window.location.href = `/player/${player.player_id}`;
                    });
                    playerList.appendChild(li);
                });

                // Event Listener für Lösch-Buttons hinzufügen
                document.querySelectorAll('.delete-player').forEach(button => {
                    button.addEventListener('click', function (event) {
                        event.stopPropagation(); // Prevent the click from propagating to the li element
                        if (confirm('Are you sure you want to delete this player?')) {
                            deletePlayer(button.getAttribute('data-id'));
                        }
                    });
                });
            });
    }

    // Neuer Spieler hinzufügen
    form.addEventListener('submit', function (event) {
        event.preventDefault();
        const name = document.getElementById('name').value;

        fetch('/api/players', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: name })
        }).then(response => {
            if (response.ok) {
                loadPlayers();
                form.reset();
            }
        });
    });

    // Spieler löschen
    function deletePlayer(playerId) {
        fetch(`/api/players/${playerId}`, {
            method: 'DELETE'
        }).then(response => {
            if (response.ok) {
                loadPlayers();
            }
        });
    }

    // Spieler initial laden
    loadPlayers();
});

document.getElementById('show_inactive').addEventListener('click', function () {
    window.location.href = "/players/inactive_players";
});
