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
                    li.innerHTML = `${player.name}`;
                    playerList.appendChild(li);
                });
            });
    }

    // Spieler initial laden
    loadPlayers();
});