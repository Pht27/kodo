import os
import pandas as pd
from datetime import datetime as dt, timedelta
import pytz

from python_scripts.saved_paths import *

tz = pytz.timezone('Europe/Berlin')

# Funktion zum Laden der Spieler aus der CSV-Datei
def load_players():
    try:
        return pd.read_csv(csv_file_players, index_col=False)
    except FileNotFoundError:
        df = pd.DataFrame(columns=['player_id', 'name', 'active', 'start_points'])
        df.to_csv(csv_file_players, index=False)
        return df

# Funktion zum Speichern der Spieler in die CSV-Datei
def save_players(players):
    players.to_csv(csv_file_players, index=False)

# Funktion um ein Spiel zu speichern
def save_game(data):
    teams = pd.read_csv(csv_file_teams, index_col=False)
    team_id = teams.shape[0] + 1

    rounds = pd.read_csv(csv_file_rounds, index_col=False)
    round_id = int(rounds.shape[0] + 1)

    player_team_relations = pd.read_csv(csv_file_player_team, index_col=False)
    player_team_relations_index = player_team_relations.shape[0] + 1

    team_round_relations = pd.read_csv(csv_file_team_round, index_col=False)
    team_round_relations_index = team_round_relations.shape[0] + 1

    all_players = pd.read_csv(csv_file_players, index_col=False)

    specials = pd.read_csv(csv_file_specials)
    specials_id = specials.shape[0] + 1

    for i in range(4):
        party = data['teams'][i]['type']
        teams = pd.concat([teams, pd.DataFrame({'team_id':team_id, 'party':party}, index=[team_id])], ignore_index=True)
        team_round_relations = pd.concat([team_round_relations, pd.DataFrame({'team_round_id':team_round_relations_index,
             'team_id':team_id, 'round_id':round_id}, index=[team_round_relations_index])], ignore_index=True)

        for player in data['teams'][i]['players']:
            temp = all_players[all_players['name']==player[:len(player)-1]]['player_id']
            player_id = temp.loc[temp.index[0]]

            player_team_relations = pd.concat([player_team_relations, pd.DataFrame({'player_team_id':player_team_relations_index, 'team_id':team_id, 'player_id':player_id}, index=[player_team_relations_index])],ignore_index=True)
            player_team_relations_index += 1
        
        for special in data['teams'][i]['specialConditions']:
            specials = pd.concat([specials, pd.DataFrame({'special_team_id':specials_id, 'team_id':team_id, 'special':special}, index=[specials_id])], ignore_index=True)
            specials_id +=1

        for special in data['teams'][i]['extraPoints']:
            specials = pd.concat([specials, pd.DataFrame({'special_team_id':specials_id, 'team_id':team_id, 'special':special}, index=[specials_id])], ignore_index=True)
            specials_id +=1

        team_id += 1
        team_round_relations_index += 1

    rounds = pd.concat([rounds, pd.DataFrame({
        'round_id':round_id,
        'winning_party': data['winner'],
        'points': data['points'],
        'game_type':data['gameType'],
        'date':dt.utcnow().astimezone(tz).replace(microsecond=0)
        }, index=[round_id])], ignore_index=True)

    
    rounds.to_csv(csv_file_rounds, index=False)
    teams.to_csv(csv_file_teams, index=False)
    specials.to_csv(csv_file_specials, index=False)
    player_team_relations.to_csv(csv_file_player_team, index=False)
    team_round_relations.to_csv(csv_file_team_round, index=False)
    

