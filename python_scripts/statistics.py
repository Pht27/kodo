import os
import pandas as pd
import numpy as np

# DIRECTORIES

from python_scripts.saved_paths import *

# FUNCTIONS

def total_points_per_player():
    # import data
    players = pd.read_csv(csv_file_players, index_col=False)
    players_teams = pd.read_csv(csv_file_player_team, index_col=False)
    teams = pd.read_csv(csv_file_teams, index_col=False)
    rounds = pd.read_csv(csv_file_rounds, index_col=False)
    teams_rounds = pd.read_csv(csv_file_team_round, index_col=False)

    # calc no of team members in round to calculate points
    team_members = teams.merge(players_teams, on="team_id").groupby(['team_id']).size().reset_index(name='no_team_members')

    # joins teams with players
    data = players.merge(players_teams, on="player_id").merge(team_members, on='team_id')
    
    data = data.merge(teams, on='team_id')
    
    data = data.merge(teams_rounds, on='team_id')
    
    # merge with rounds
    data = data.merge(rounds, on='round_id')   

    # check if game was won
    data.loc[data['party']!=data['winning_party'], 'points'] *= -1

    # check if game was solo, if so triple points for Re party
    solos = [   
        "Trumpfsolo",
        "Damensolo",
        "Bubensolo",
        "Fleischloses",
        "Knochenloses",
        "Schlanker Martin",
        "Kontrasolo",
        "Stille Hochzeit"
    ]

    data.loc[(data['game_type'].isin(solos)) & (data['party'] == 'Re'), 'points'] *= 3
    
    # drop unimportant cols
    data = data[['player_id', 'name', 'team_id', 'no_team_members', 'party', 'round_id', 'winning_party', 'points', 'start_points']]

    # check if game was won
    data['won'] = np.where(data['party']==data['winning_party'], True, False)

    # add to count games
    data['played'] = 1

    # divide points by team members
    data = data.astype({'points':float})
    data.loc[:, 'points'] /= data['no_team_members']

    # drop unimportant cols
    data = data[['player_id', 'name', 'points', 'won', 'played', 'start_points']]
    
    # sum over all rows to get wr and points
    data = data.groupby(['player_id', 'name', 'start_points']).sum().reset_index()
    data['winrate'] = round(data['won'] / data['played'], 4)
    data['points'] += data['start_points']

    # drop unimportant cols
    data = data[['player_id', 'name', 'points', 'winrate']]

    # # if a player has not played a round yet, they will not be shown in the table
    # # to fix this, we add them with their initial points
    data = players.merge(data, on=["player_id", "name"], how="left")
    data.loc[data['points'].isnull(), 'points'] = data['start_points']
    data.loc[data['winrate'].isnull(), 'winrate'] = -1

    # lastly, drop players who are inactive
    data = data[data['active']]

    # # drop unimportant cols
    data = data[['name', 'points', 'winrate']]
    print(data)

    data = data.sort_values(by=['points'],  ascending=False)
    
    return data
