import os
import pandas as pd
import numpy as np

from datetime import date
import datetime as dt

# DIRECTORIES

from python_scripts.saved_paths import *

# FUNCTIONS

def total_points_per_player(filter_active=True, date=None):
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

    # if given a date, filter up to that date
    if date is not None:
        data = data[pd.to_datetime(data['date']) <= date]    

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
    if filter_active:
        data = data[data['active']]

    # drop unimportant cols
    if date is None:
        data = data[['name', 'points', 'winrate']]
    else:
        data = data[['name', 'points', 'winrate', 'player_id']]

    data = data.sort_values(by=['points'],  ascending=False)
    
    return data

def total_points_per_player_time_series():
    
    rounds = pd.read_csv(csv_file_rounds, index_col=False)
    players = pd.read_csv(csv_file_players, index_col=False)

    time_series = players.rename(columns={"start_points" : "points"})[players['active']].drop('active', axis=1)
    time_series['date'] = dt.datetime(2024, 7, 11)
    time_series = time_series[['player_id', 'name', 'date', 'points']]

    for datum in pd.to_datetime(rounds['date']):
        df = total_points_per_player(date=datum).drop('winrate', axis=1)
        df['date'] = datum.replace(second=0)
        df = df[['player_id', 'name', 'date', 'points']]

        time_series = pd.concat([time_series, df], ignore_index=True)
    return time_series
    