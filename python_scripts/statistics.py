import os
import pandas as pd
import numpy as np

# DIRECTORIES

from python_scripts.saved_paths import *

# FUNCTIONS

def total_points_per_player():
    players = pd.read_csv(csv_file_players, index_col=False)
    players_teams = pd.read_csv(csv_file_player_team, index_col=False)
    teams = pd.read_csv(csv_file_teams, index_col=False)
    rounds = pd.read_csv(csv_file_rounds, index_col=False)
    teams_rounds = pd.read_csv(csv_file_team_round, index_col=False)

    team_members = teams.merge(players_teams, on="team_id").groupby(['team_id']).size().reset_index(name='no_team_members')

    data = players.merge(players_teams, on="player_id").merge(team_members, on='team_id')
    
    data = data.merge(teams, on='team_id')
    
    data = data.merge(teams_rounds, on='team_id')
    
    data = data.merge(rounds, on='round_id')   
    
    data = data[['player_id', 'name', 'team_id', 'no_team_members', 'party', 'round_id', 'winning_party', 'points', 'start_points']]

    data.loc[data['party']!=data['winning_party'], 'points'] *= -1

    data['won'] = np.where(data['party']==data['winning_party'], True, False)
    data['played'] = 1

    data = data.astype({'points':float})
    data.loc[:, 'points'] /= data['no_team_members']

    data = data[['player_id', 'name', 'points', 'won', 'played', 'start_points']]
    data = data[['player_id', 'name', 'points', 'won', 'played', 'start_points']]
    
    data = data.groupby(['player_id', 'name', 'start_points']).sum().reset_index()
    data['winrate'] = data['won'] / data['played']
    data['points'] += data['start_points']

    data = data[['name', 'points', 'winrate']]

    data = data.sort_values(by=['points'],  ascending=False)
    
    return data
