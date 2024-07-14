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
    
def winrates_of_teams(specific_player_id=None):
    # import data
    players = pd.read_csv(csv_file_players, index_col=False)
    players_teams = pd.read_csv(csv_file_player_team, index_col=False)
    teams = pd.read_csv(csv_file_teams, index_col=False)
    rounds = pd.read_csv(csv_file_rounds, index_col=False)
    teams_rounds = pd.read_csv(csv_file_team_round, index_col=False)

    # merge all necessary info
    data = teams.merge(players_teams, on="team_id")
    data = data.merge(teams_rounds, on="team_id")
    data = data.merge(rounds, on="round_id")

    # check if won
    data['won'] = data['party']==data['winning_party']

    # if wasnt won, negative points
    data.loc[data['party']!=data['winning_party'], 'points'] *= -1

    # add to count games
    data['played'] = 1

    # add players to the mix
    data = data.merge(players, on="player_id")

    # self join to get combinations
    data = data.merge(data, on="team_id")
    data = data[['player_id_x', 'player_id_y', 'won_x', 'points_x', 'game_type_x', 'name_x', 'name_y', 'party_x', 'played_x']]
    data = data.rename(columns={'won_x' : 'won', 'points_x' : 'points', 'game_type_x' : 'game_type', 'party_x' : 'party', 'played_x' : 'played'})

    # calc statistics
    data = data.groupby(['player_id_x', 'name_x', 'player_id_y', 'name_y']).agg(
        mean_points=('points', 'mean'),
        winrate=('won', lambda x: round(x.mean() * 100, 2)),
        total_games_played=('played', 'sum')
        ).reset_index()

    # remove doubles
    data = data[data['player_id_x'] <= data['player_id_y']]

    players = players[players['active']]

    player_data = players.merge(players, how="cross")
    player_data = player_data.rename(columns={'player_id' : 'player_id_y'})

    player_data = player_data[player_data['player_id_x'] <= player_data['player_id_y']]

    data = player_data.merge(data, on=['player_id_x', 'player_id_y', 'name_x', 'name_y'], how='outer')

    if specific_player_id is not None:
        data = data[(data['player_id_x'] == specific_player_id) | (data['player_id_y'] == specific_player_id)]

    data = data[['name_x', 'name_y', 'winrate', 'player_id_x', 'player_id_y']]

    return data

def get_match_history_infos(specific_player_id=None):
    # import data
    players = pd.read_csv(csv_file_players, index_col=False)
    players_teams = pd.read_csv(csv_file_player_team, index_col=False)
    teams = pd.read_csv(csv_file_teams, index_col=False)
    rounds = pd.read_csv(csv_file_rounds, index_col=False)
    teams_rounds = pd.read_csv(csv_file_team_round, index_col=False)

    # filter rounds for player if given
    if specific_player_id is not None:
        rounds_tmp = rounds.merge(teams_rounds, on='round_id')
        rounds_tmp = rounds_tmp.merge(players_teams, on='team_id')
        rounds_tmp = rounds_tmp[rounds_tmp['player_id'] == specific_player_id]
        rounds_tmp = rounds_tmp.merge(teams, on='team_id')
        rounds_tmp['won'] = rounds_tmp['party'] == rounds_tmp['winning_party']
        rounds = rounds_tmp[np.concatenate([rounds.columns, ['won']])]
        rounds.loc[rounds['won']==False, 'points'] *= -1

    data = pd.DataFrame(columns=['round_id',
            'date',
            'game_type',
            'team1_player1',
            'team1_player2',
            'team1_party',
            'team2_player1',
            'team2_player2',
            'team2_party',
            'team3_player1',
            'team3_player2',
            'team3_party',
            'team4_player1',
            'team4_player2',
            'team4_party',
            'winning_party',
            'points',
            'won'
        ])

    for index, match in rounds.iterrows():
        teams_this_round = teams.merge(teams_rounds, on="team_id").merge(rounds, on="round_id")
        teams_this_round = teams_this_round[teams_this_round['round_id'] == match['round_id']]

        # get team1 players
        team1_id = teams_this_round.iloc[0]['team_id']
        team1_party = teams_this_round[teams_this_round['team_id'] == team1_id].iloc[0]['party']
        team1_data = players.merge(players_teams, on="player_id")
        team1_data = team1_data[team1_data['team_id']==team1_id]
        team1_player1 = team1_data.iloc[0]['name']
        team1_player2 = 'None'
        if team1_data.shape[0] > 1:
            team1_player2 = team1_data.iloc[1]['name']
        
        # get team2 players
        team2_id = teams_this_round.iloc[1]['team_id']
        team2_party = teams_this_round[teams_this_round['team_id'] == team2_id].iloc[0]['party']
        team2_data = players.merge(players_teams, on="player_id")
        team2_data = team2_data[team2_data['team_id']==team2_id]
        team2_player1 = team2_data.iloc[0]['name']
        team2_player2 = 'None'
        if team2_data.shape[0] > 1:
            team2_player2 = team2_data.iloc[1]['name']

        # get team3 players
        team3_id = teams_this_round.iloc[2]['team_id']
        team3_party = teams_this_round[teams_this_round['team_id'] == team3_id].iloc[0]['party']
        team3_data = players.merge(players_teams, on="player_id")
        team3_data = team3_data[team3_data['team_id']==team3_id]
        team3_player1 = team3_data.iloc[0]['name']
        team3_player2 = 'None'
        if team3_data.shape[0] > 1:
            team3_player2 = team3_data.iloc[1]['name']

        # get team4 players
        team4_id = teams_this_round.iloc[3]['team_id']
        team4_party = teams_this_round[teams_this_round['team_id'] == team4_id].iloc[0]['party']
        team4_data = players.merge(players_teams, on="player_id")
        team4_data = team4_data[team4_data['team_id']==team4_id]
        team4_player1 = team4_data.iloc[0]['name']
        team4_player2 = 'None'
        if team4_data.shape[0] > 1:
            team4_player2 = team4_data.iloc[1]['name']

        # handle won column
        if specific_player_id is not None:
            won = match['won']
        else:
            won = 'None'

        this_round = {'round_id' : match['round_id'],
            'date' : pd.to_datetime(match['date']).strftime("%d %b, %Y, %H:%M:%S"),
            'game_type' : match['game_type'],
            'team1_player1': team1_player1,
            'team1_player2': team1_player2,
            'team1_party' : team1_party,
            'team2_player1': team2_player1,
            'team2_player2': team2_player2,
            'team2_party' : team2_party,
            'team3_player1': team3_player1,
            'team3_player2': team3_player2,
            'team3_party' : team3_party,
            'team4_player1': team4_player1,
            'team4_player2': team4_player2,
            'team4_party' : team4_party,
            'winning_party' : match['winning_party'],
            'points' : match['points'],
            'won': won
            }
            
        this_round = pd.DataFrame([this_round])

        data = pd.concat([data, this_round], ignore_index=True)
    
    data = data.sort_values(by='date', ascending=False)
    return data

def calc_stats_for_player(player_id):
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

def calc_team_wr_for_player(specific_player_id):
    data = winrates_of_teams(specific_player_id=specific_player_id)

    tmp = data[data['player_id_x'] != specific_player_id]
    data = data[data['player_id_x'] == specific_player_id]
    tmp = tmp.rename(columns={'player_id_x' : 'player_id_y', 'player_id_y' : 'player_id_x',
                             'name_x' : 'name_y', 'name_y' : 'name_x'})
    tmp = tmp[data.columns]

    data = pd.concat([tmp, data], axis=0)
    return data