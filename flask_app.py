from flask import Flask, render_template, request, jsonify
import pandas as pd

from python_scripts.data_management import *
from python_scripts.statistics import *

app = Flask(__name__)

# Route für die Startseite
@app.route('/')
@app.route('/players')
def players():
    return render_template('players.html')

@app.route('/players/inactive_players')
def inactive_players():
    return render_template('inactive_players.html')

@app.route('/player/<int:player_id>')
def specific_player(player_id):
    players = load_players()
    player_name = players[players['player_id'] == player_id].iloc[0]['name']
    data = {'player_id' : player_id, 'player_name' : player_name}
    return render_template('specific_player.html', data=data)


@app.route('/new_game')
def new_game():
    return render_template('new_game.html')

@app.route('/overview')
def overview():
    return render_template('overview.html')

@app.route('/rules')
def rules():
    return render_template('rules.html')

@app.route('/statistics')
def statistics():
    return render_template('statistics.html')

@app.route('/match_history')
def match_history():
    return render_template('match_history.html')


############ APIs #############

# API-Route zum Abrufen der Spieler
@app.route('/api/players', methods=['GET'])
def get_players():    
    players = load_players()
    players = players[players['active']]
    players_list = players.to_dict(orient='records')
    return jsonify(players_list)

# API-Route zum Abrufen der Spieler
@app.route('/api/inactive_players', methods=['GET'])
def get_inactive_players():    
    players = load_players()
    players = players[~players['active']]
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

# API-Route zum Reaktivieren eines Spielers
@app.route('/api/players/<int:player_id>', methods=['REACTIVATE'])
def reactivate_player(player_id):
    players = load_players()
    players.loc[players['player_id'] == player_id, 'active'] = True
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
    return jsonify(total_points_per_player().to_dict(orient='records'))

# get time series of points per player
@app.route('/api/stats/ts', methods=['GET'])
def time_series_stats():
    return jsonify(total_points_per_player_time_series().to_dict(orient='records'))

# get winrates of teams
@app.route('/api/stats/wr_teams', methods=['GET'])
def winrate_team_stats():
    data = winrates_of_teams().to_dict(orient='split')
    # Replace NaN with None (which will be translated to null in JSON)
    for entry in data['data']:
        for i in range(len(entry)):
            if pd.isna(entry[i]):
                entry[i] = None
    return jsonify(data)

# get match history stats
@app.route('/api/stats/match_history', methods=['GET'])
def get_match_history_stats():
    offset = int(request.args.get('offset', 0))
    limit = int(request.args.get('limit', 16))

    data = get_match_history_infos(start_index=offset, end_index=offset+limit).to_dict(orient='split')
    return jsonify(data)

# get match history for specific player
@app.route('/api/stats/match_history/<int:player_id>', methods=['GET'])
def get_match_history_stats_for_player(player_id):
    offset = int(request.args.get('offset', 0))
    limit = int(request.args.get('limit', 16))

    data = get_match_history_infos(specific_player_id=player_id, start_index=offset, end_index=offset+limit).to_dict(orient='split')
    return jsonify(data)

# get team stats for specific player
@app.route('/api/stats/wr_teams/<int:player_id>', methods=['GET'])
def get_wr_teams_stats_for_player(player_id):
    data = calc_team_wr_for_player(specific_player_id=player_id)
    data = data[data['player_id_x'] != data['player_id_y']]
    data = data.fillna('None').to_dict(orient='records')
    return jsonify(data)

# get stats for specific player
@app.route('/api/stats/<int:player_id>', methods=['GET'])
def get_stats_for_specific_player(player_id):
    data = calc_player_stats_for_specific_player(specific_player_id=player_id, up_to=20)
    data = data.fillna('None').to_dict(orient='records')
    # calc_winstreaks_with_other_players(specific_player_id=player_id)
    return jsonify(data)

# get winstreak stats for specific player
@app.route('/api/stats/cards/<int:player_id>', methods=['GET'])
def get_card_stats_for_specific_player(player_id):
    data = calc_winrates_with_cards(specific_player_id=player_id)
    data = data.fillna('None').to_dict(orient='records')
    return jsonify(data)


# get winstreak stats for specific player
@app.route('/api/stats/cards', methods=['GET'])
def get_card_stats():
    data = calc_winrates_with_cards_total()
    data = data.fillna('None').to_dict(orient='records')
    return jsonify(data)

@app.route('/api/stats/games_played', methods=['GET'])
def get_total_games_played():
    data = calc_total_games_played()
    return jsonify(data)

@app.route('/api/stats/game_types', methods=['GET'])
def get_game_type_wr():
    data = calc_winrates_game_types()
    data = data.fillna('None').to_dict(orient='records')
    return jsonify(data)

@app.route('/api/stats/game_types/<int:player_id>', methods=['GET'])
def get_game_type_wr_for_specific_player(player_id):
    data = calc_winrates_game_types_for_specific_player(player_id)
    data = data.fillna('None').to_dict(orient='records')
    return jsonify(data)


if __name__ == '__main__':
    app.run(debug=True)
