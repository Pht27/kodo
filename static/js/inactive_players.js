document.addEventListener('DOMContentLoaded', function () {
    const playerList = document.getElementById('player-list');

    // Spieler laden
    function loadPlayers() {
        fetch('/api/inactive_players')
            .then(response => response.json())
            .then(data => {
                playerList.innerHTML = '';
                data.forEach(player => {
                    const li = document.createElement('li');
                    li.classList.add('player-container')
                    li.innerHTML = `${player.name} <span class="reactivate-player" data-id="${player.player_id}">♻️</span>`;
                    li.addEventListener('click', function () {
                        window.location.href = `/player/${player.player_id}`;
                    });
                    playerList.appendChild(li);
                });

                // Event Listener für Lösch-Buttons hinzufügen
                document.querySelectorAll('.reactivate-player').forEach(button => {
                    button.addEventListener('click', function (event) {
                        event.stopPropagation(); // Prevent the click from propagating to the li element
                        if (confirm('Are you sure you want to reactivate this player?')) {
                            reactivatePlayer(button.getAttribute('data-id'));
                        }
                    });
                });
            });
    }

    // Spieler initial laden
    loadPlayers();

    // Spieler löschen
    function reactivatePlayer(playerId) {
        fetch(`/api/players/${playerId}`, {
            method: 'REACTIVATE'
        }).then(response => {
            if (response.ok) {
                loadPlayers();
            }
        });
    }
});