from flask import Flask, render_template, request, jsonify
import pandas as pd

from python_scripts.data_management import *
from python_scripts.statistics import *

app = Flask(__name__)

# Route für die Startseite
@app.route('/')
def index():
    return render_template('index.html')


@app.route('/new_game')
def new_game():
    return render_template('new_game.html')

@app.route('/overview')
def overview():
    return render_template('overview.html')


# API-Route zum Abrufen der Spieler
@app.route('/api/players', methods=['GET'])
def get_players():    
    players = load_players()
    players = players[players['active']]
    players_list = players.to_dict(orient='records')
    return jsonify(players_list)

# API-Route zum Hinzufügen eines neuen Spielers
@app.route('/api/players', methods=['POST'])
def add_player():
    players = load_players()
    new_name = request.json['name']
    
    if new_name:
        new_id = players['player_id'].max() + 1 if not players.empty else 1
        new_id = int(new_id)
        new_player = pd.DataFrame([[new_id, new_name, True, 0]], columns=['player_id', 'name', 'active', 'start_points'])
        players = pd.concat([players, new_player], ignore_index=True)
        save_players(players)
    
    return jsonify({'status': 'success'})

# API-Route zum Löschen eines Spielers
@app.route('/api/players/<int:player_id>', methods=['DELETE'])
def delete_player(player_id):
    players = load_players()
    players.loc[players['player_id'] == player_id, 'active'] = False
    save_players(players)
    return jsonify({'status': 'success'})

# API-Route zum Suchen eines Spielers
@app.route('/api/search_players')
def search_players():
    query = request.args.get('query')
    players = load_players()
    matched_players = players[players['name'].str.match(query, case=False)]
    return jsonify(matched_players.to_dict(orient='records'))


# API-Route zum Hinzufügen eines neuen Spielers
@app.route('/api/games', methods=['POST'])
def add_game():
    data = request.json
    save_game(data)
    return jsonify({'status': 'success'})

# API-Route zum Abrufen der Zusammenfassung
@app.route('/api/stats', methods=['GET'])
def get_overview_stats():
    print(jsonify(total_points_per_player().to_dict(orient='records')))
    return jsonify(total_points_per_player().to_dict(orient='records'))

if __name__ == '__main__':
    app.run(debug=True)
