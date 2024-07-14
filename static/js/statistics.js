document.addEventListener('DOMContentLoaded', function () {
    function loadTSStats() {
        fetch('/api/stats/ts')
            .then(response => response.json())
            .then(fetchedData => {
                renderTSPlotly(fetchedData);
            })
            .catch(error => {
                console.error('Error loading TS stats:', error);
            });
    }

    function loadWRStats() {
        fetch('/api/stats/wr_teams')
            .then(response => response.json())
            .then(fetchedData => {
                renderWRPlotly(fetchedData);
            })
            .catch(error => {
                console.error('Error loading WR stats:', error);
            });
    }

    function renderTSPlotly(data) {
        const traces = [];
        const players = [...new Set(data.map(item => item.name))];

        players.forEach(player => {
            const playerData = data.filter(item => item.name === player);
            const trace = {
                x: playerData.map(item => new Date(item.date)),
                y: playerData.map(item => item.points),
                type: "scatter",
                mode: "lines+markers",
                name: player
            };
            traces.push(trace);
        });

        const layout = {
            title: 'Spieler*in Punkte über Zeit',
            xaxis: {
                title: 'Datum',
            },
            yaxis: {
                title: 'Punkte'
            }
        };

        Plotly.newPlot('ts-plot', traces, layout);
    }

    function renderWRPlotly(dataDict) {
        const playerNames = Array.from(new Set(dataDict.data.map(item => item[0]).concat(dataDict.data.map(item => item[1]))));

        const zValues = playerNames.map(rowPlayer =>
            playerNames.map(colPlayer => {
                const match = dataDict.data.find(item => item[0] === rowPlayer && item[1] === colPlayer);
                const value = match ? match[2] : NaN;
                return isNaN(value) ? null : value; // Convert NaN to null
            })
        );

        // Define the colorscale from red (0.0) to green (100.0)
        const colorscale = [
            [0, 'red'],
            [0.5, 'yellow'],
            [1, 'green']
        ];

        const heatmapData = [{
            x: playerNames,
            y: playerNames,
            z: zValues,
            type: 'heatmap',
            colorscale: colorscale,
            colorbar: {
                title: 'Winrate',
                titleside: 'top',
                tickmode: 'array',
                tickvals: [0, 50, 100],
                ticktext: ['0%', '50%', '100%']
            }
        }];




        const layout = {
            title: 'Team Winrates',
            xaxis: { title: 'Spieler*in 1' },
            yaxis: { title: 'Spieler*in 2' }
        };

        Plotly.newPlot('team-winrates-plot', heatmapData, layout);
    }

    loadTSStats();
    loadWRStats();
});
