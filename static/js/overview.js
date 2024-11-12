document.addEventListener('DOMContentLoaded', function () {
    const summaryTable = document.getElementById('summary').querySelector('tbody');
    const headers = document.querySelectorAll('#summary th');
    let data = [];

    // Spieler laden
    function loadStats() {
        fetch('/api/stats')
            .then(response => response.json())
            .then(fetchedData => {
                data = fetchedData;
                renderTable(data);
            })
            .catch(error => {
                console.error('Error loading stats:', error);
                summaryTable.innerHTML = '<tr><td colspan="4">Error loading stats</td></tr>';
            });
    }

    // Tabelle rendern
    function renderTable(data) {
        summaryTable.innerHTML = '';
        data.forEach(player => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${player.name}</td>
                <td>${player.points}</td>
                <td>${player.winrate < 0 ? 'NaN' : Math.round(player.winrate * 10000) / 100 + '%'}</td>
                <td>${player.mean_points}</td>
            `;
            summaryTable.appendChild(row);
        });
    }

    // Sortierfunktion
    function sortTable(columnIndex, ascending) {
        data.sort((a, b) => {
            let valA, valB;
            switch (columnIndex) {
                case 0:
                    valA = a.name.toLowerCase();
                    valB = b.name.toLowerCase();
                    break;
                case 1:
                    valA = a.points;
                    valB = b.points;
                    break;
                case 2:
                    valA = a.winrate;
                    valB = b.winrate;
                    break;
                case 3:
                    valA = a.mean_points;
                    valB = b.mean_points;
                    break;
            }

            if (valA < valB) return ascending ? -1 : 1;
            if (valA > valB) return ascending ? 1 : -1;
            return 0;
        });
        renderTable(data);
    }

    // Klick-Event für Spaltenüberschriften
    headers.forEach((header, index) => {
        let ascending = true;
        header.addEventListener('click', () => {
            sortTable(index, ascending);
            ascending = !ascending;
        });
    });

    // Stats initial laden
    loadStats();
});
