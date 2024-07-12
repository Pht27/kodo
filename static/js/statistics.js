document.addEventListener('DOMContentLoaded', function () {
    let data = [];

    // Spieler laden
    function loadStats() {
        fetch('/api/stats/ts')
            .then(response => response.json())
            .then(fetchedData => {
                data = fetchedData;
                renderPlotly(data);
            })
            .catch(error => {
                // console.error('Error loading stats:', error);
                // summaryTable.innerHTML = '<tr><td colspan="3">Error loading stats</td></tr>';
            });
    }



    // Tabelle rendern
    function renderPlotly(data) {
        // Process data for Plotly
        const traces = [];
        const players = [...new Set(data.map(item => item.name))];

        const uniqueDates = [...new Set(data.map(item => new Date(item.date)))].sort((a, b) => a - b);
        const tickvals = uniqueDates.map(date => date.getTime()); // Convert dates to timestamps


        players.forEach(player => {
            const playerData = data.filter(item => item.name === player);
            const trace = {
                x: playerData.map(item => new Date(item.date)), // Convert date string to Date object
                y: playerData.map(item => item.points),
                mode: 'lines+markers',
                name: player
            };
            traces.push(trace);
        });

        const layout = {
            title: 'Spieler Punkte über Zeit',
            xaxis: {
                title: 'Datum',
                tickformat: '%d-%m-%Y', // Format date to dd-mm-yyyy
                tickvals: tickvals // Use the tick values from the unique dates
            },
            yaxis: {
                title: 'Punkte'
            }
        };

        Plotly.newPlot('plot', traces, layout);
    }

    loadStats()
});