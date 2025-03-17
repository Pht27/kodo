import datetime as dt
import os
from datetime import date

import numpy as np
import pandas as pd

from python_scripts.saved_paths import *

# DIRECTORIES


# FUNCTIONS


def total_points_per_player(
    filter_active=True, specific_date=None, specific_player_id=None
):
    # import data
    players = pd.read_csv(csv_file_players, index_col=False)
    players_teams = pd.read_csv(csv_file_player_team, index_col=False)
    teams = pd.read_csv(csv_file_teams, index_col=False)
    rounds = pd.read_csv(csv_file_rounds, index_col=False)
    teams_rounds = pd.read_csv(csv_file_team_round, index_col=False)

    # calc no of team members in round to calculate points
    team_members = (
        teams.merge(players_teams, on="team_id")
        .groupby(["team_id"])
        .size()
        .reset_index(name="no_team_members")
    )

    if specific_date is not None:
        rounds = rounds[rounds["date"].str.slice(stop=10) == specific_date]

    if specific_player_id is not None:
        players = players[players["player_id"] == specific_player_id]

    # joins teams with players
    data = players.merge(players_teams, on="player_id").merge(
        team_members, on="team_id"
    )

    data = data.merge(teams, on="team_id")

    data = data.merge(teams_rounds, on="team_id")

    # merge with rounds
    data = data.merge(rounds, on="round_id")

    # check if game was won
    data.loc[data["party"] != data["winning_party"], "points"] *= -1

    # check if game was solo, if so triple points for Re party
    solos = [
        "Trumpfsolo",
        "Damensolo",
        "Bubensolo",
        "Fleischloses",
        "Knochenloses",
        "Schlanker Martin",
        # "Kontrasolo",  kontrasolo is only solo where kontra points get tripled!!
        "Stille Hochzeit",
    ]

    data.loc[(data["game_type"].isin(solos)) & (data["party"] == "Re"), "points"] *= 3
    data.loc[
        (data["game_type"] == "Kontrasolo") & (data["party"] == "Kontra"), "points"
    ] *= 3

    # check if game was won
    data["won"] = np.where(data["party"] == data["winning_party"], True, False)

    # add to count games
    data["played"] = 1

    # divide points by team members
    data = data.astype({"points": float})
    data.loc[:, "points"] /= data["no_team_members"]

    data.loc[:, "date"] = pd.to_datetime(data["date"]).dt.date

    # drop unimportant cols
    data = data[["player_id", "name", "points", "won", "played", "start_points"]]

    # sum over all rows to get wr and points
    data = data.groupby(["player_id", "name", "start_points"]).sum().reset_index()
    data["winrate"] = round(data["won"] / data["played"], 4)
    data["mean_points"] = round(data["points"] / data["played"], 3)
    if specific_date is None:
        data["points"] += data["start_points"]

    # drop unimportant cols
    data = data[["player_id", "name", "points", "winrate", "mean_points"]]

    # # if a player has not played a round yet, they will not be shown in the table
    # # to fix this, we add them with their initial points
    data = players.merge(data, on=["player_id", "name"], how="left")
    if specific_date is None:
        data.loc[data["points"].isnull(), "points"] = data["start_points"]
    data.loc[data["winrate"].isnull(), "winrate"] = -1

    # lastly, drop players who are inactive
    if filter_active:
        data = data[data["active"]]

    # drop unimportant cols
    if specific_date is None:
        data = data[["name", "points", "winrate", "mean_points"]]
        data = data.sort_values(by=["points"], ascending=False)
    else:
        data = data[["name", "points", "player_id"]]

    return data


def total_points_per_player_time_series(specific_player_id=None):

    players = pd.read_csv(csv_file_players, index_col=False)
    players_teams = pd.read_csv(csv_file_player_team, index_col=False)
    teams = pd.read_csv(csv_file_teams, index_col=False)
    rounds = pd.read_csv(csv_file_rounds, index_col=False)
    teams_rounds = pd.read_csv(csv_file_team_round, index_col=False)

    if specific_player_id is not None:
        players = players[players["player_id"] == specific_player_id]

    # calc no of team members in round to calculate points
    team_members = (
        teams.merge(players_teams, on="team_id")
        .groupby(["team_id"])
        .size()
        .reset_index(name="no_team_members")
    )

    # joins teams with players
    data = players.merge(players_teams, on="player_id").merge(
        team_members, on="team_id"
    )

    data = data.merge(teams, on="team_id")

    data = data.merge(teams_rounds, on="team_id")

    # merge with rounds
    data = data.merge(rounds, on="round_id")

    data = data[data["active"]]

    time_series = players.rename(columns={"start_points": "points"})[
        players["active"]
    ].drop("active", axis=1)
    time_series["date"] = dt.datetime(2024, 7, 11)
    time_series = time_series[["player_id", "name", "date", "points"]]

    intresting_dates = data.sort_values(by=["date"])["date"].str.slice(stop=10).unique()

    for datum in intresting_dates:
        if specific_player_id is not None:
            df = total_points_per_player(
                specific_date=datum, specific_player_id=specific_player_id
            )
        else:
            df = total_points_per_player(specific_date=datum)
        df["date"] = datum
        df = df[["player_id", "name", "date", "points"]]
        time_series = pd.concat([time_series, df], ignore_index=True)

    if specific_player_id is None:
        time_series["date"] = pd.to_datetime(time_series["date"])
        time_series = time_series.sort_values(by=["player_id", "date"])
        time_series.fillna(0, inplace=True)
        time_series["points"] = time_series.groupby("player_id")["points"].cumsum()

    else:
        time_series["points"] = time_series["points"].cumsum()
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
    data["won"] = data["party"] == data["winning_party"]

    # if wasnt won, negative points
    data.loc[data["party"] != data["winning_party"], "points"] *= -1

    # add to count games
    data["played"] = 1

    # add players to the mix
    data = data.merge(players, on="player_id")

    # only take players that are active
    data = data[data["active"]]

    # self join to get combinations
    data = data.merge(data, on="team_id")
    data = data[
        [
            "player_id_x",
            "player_id_y",
            "won_x",
            "points_x",
            "game_type_x",
            "name_x",
            "name_y",
            "party_x",
            "played_x",
        ]
    ]
    data = data.rename(
        columns={
            "won_x": "won",
            "points_x": "points",
            "game_type_x": "game_type",
            "party_x": "party",
            "played_x": "played",
        }
    )

    # calc statistics
    data = (
        data.groupby(["player_id_x", "name_x", "player_id_y", "name_y"])
        .agg(
            mean_points=("points", "mean"),
            winrate=("won", lambda x: round(x.mean() * 100, 2)),
            total_games_played=("played", "sum"),
        )
        .reset_index()
    )

    players = players[players["active"]]

    player_data = players.merge(players, how="cross")
    player_data = player_data.rename(columns={"player_id": "player_id_y"})

    player_data = player_data[player_data["player_id_x"] <= player_data["player_id_y"]]

    data = player_data.merge(
        data, on=["player_id_x", "player_id_y", "name_x", "name_y"], how="outer"
    )
    data["mean_points"] = np.round(data["mean_points"], 3)
    data = data[
        [
            "name_x",
            "name_y",
            "winrate",
            "player_id_x",
            "player_id_y",
            "total_games_played",
            "mean_points",
        ]
    ]
    return data


def get_match_history_infos(specific_player_id=None, start_index=0, end_index=16):
    # import data
    players = pd.read_csv(csv_file_players, index_col=False)
    players_teams = pd.read_csv(csv_file_player_team, index_col=False)
    teams = pd.read_csv(csv_file_teams, index_col=False)
    rounds = pd.read_csv(csv_file_rounds, index_col=False)
    teams_rounds = pd.read_csv(csv_file_team_round, index_col=False)

    # filter rounds for player if given
    if specific_player_id is not None:
        rounds_tmp = rounds.merge(teams_rounds, on="round_id")
        rounds_tmp = rounds_tmp.merge(players_teams, on="team_id")
        rounds_tmp = rounds_tmp[rounds_tmp["player_id"] == specific_player_id]
        rounds_tmp = rounds_tmp.merge(teams, on="team_id")
        rounds_tmp["won"] = rounds_tmp["party"] == rounds_tmp["winning_party"]

        # calc no of team members in round to calculate points
        team_members = (
            teams.merge(players_teams, on="team_id")
            .groupby(["team_id"])
            .size()
            .reset_index(name="no_team_members")
        )
        rounds_tmp = rounds_tmp.merge(team_members, on="team_id")

        rounds = rounds_tmp[np.concatenate([rounds.columns, ["won"]])]
        rounds.loc[rounds["won"] == False, "points"] *= -1

    rounds.loc[:, "date"] = pd.to_datetime(rounds["date"])
    rounds = rounds.sort_values(by="date", ascending=False)
    rounds = rounds.iloc[start_index:end_index]

    data = pd.DataFrame(
        columns=[
            "round_id",
            "date",
            "game_type",
            "team1_player1",
            "team1_player2",
            "team1_party",
            "team2_player1",
            "team2_player2",
            "team2_party",
            "team3_player1",
            "team3_player2",
            "team3_party",
            "team4_player1",
            "team4_player2",
            "team4_party",
            "winning_party",
            "points",
            "won",
        ]
    )

    for index, match in rounds.iterrows():
        teams_this_round = teams.merge(teams_rounds, on="team_id").merge(
            rounds, on="round_id"
        )
        teams_this_round = teams_this_round[
            teams_this_round["round_id"] == match["round_id"]
        ]

        # get team1 players
        team1_id = teams_this_round.iloc[0]["team_id"]
        team1_party = teams_this_round[teams_this_round["team_id"] == team1_id].iloc[0][
            "party"
        ]
        team1_data = players.merge(players_teams, on="player_id")
        team1_data = team1_data[team1_data["team_id"] == team1_id]
        team1_player1 = team1_data.iloc[0]["name"]
        team1_player2 = "None"
        if team1_data.shape[0] > 1:
            team1_player2 = team1_data.iloc[1]["name"]

        # get team2 players
        team2_id = teams_this_round.iloc[1]["team_id"]
        team2_party = teams_this_round[teams_this_round["team_id"] == team2_id].iloc[0][
            "party"
        ]
        team2_data = players.merge(players_teams, on="player_id")
        team2_data = team2_data[team2_data["team_id"] == team2_id]
        team2_player1 = team2_data.iloc[0]["name"]
        team2_player2 = "None"
        if team2_data.shape[0] > 1:
            team2_player2 = team2_data.iloc[1]["name"]

        # get team3 players
        team3_id = teams_this_round.iloc[2]["team_id"]
        team3_party = teams_this_round[teams_this_round["team_id"] == team3_id].iloc[0][
            "party"
        ]
        team3_data = players.merge(players_teams, on="player_id")
        team3_data = team3_data[team3_data["team_id"] == team3_id]
        team3_player1 = team3_data.iloc[0]["name"]
        team3_player2 = "None"
        if team3_data.shape[0] > 1:
            team3_player2 = team3_data.iloc[1]["name"]

        # get team4 players
        team4_id = teams_this_round.iloc[3]["team_id"]
        team4_party = teams_this_round[teams_this_round["team_id"] == team4_id].iloc[0][
            "party"
        ]
        team4_data = players.merge(players_teams, on="player_id")
        team4_data = team4_data[team4_data["team_id"] == team4_id]
        team4_player1 = team4_data.iloc[0]["name"]
        team4_player2 = "None"
        if team4_data.shape[0] > 1:
            team4_player2 = team4_data.iloc[1]["name"]

        solos = [
            "Trumpfsolo",
            "Damensolo",
            "Bubensolo",
            "Fleischloses",
            "Knochenloses",
            "Schlanker Martin",
            # "Kontrasolo",
            "Stille Hochzeit",
        ]

        # handle won column
        points = match["points"]
        won = "None"
        solo = (match["game_type"] in solos) | (match["game_type"] == "Kontrasolo")
        if specific_player_id is not None:
            # add won var
            won = match["won"]
            # triple points if solo was played
            if match["game_type"] in solos and rounds_tmp.loc[index, "party"] == "Re":
                points = 3 * points
            if (match["game_type"] == "Kontrasolo") & (
                rounds_tmp.loc[index, "party"] == "Kontra"
            ):
                points = 3 * points
            if solo and rounds_tmp.loc[index, "party"] == "Kontra":
                solo = False
            if (match["game_type"] == "Kontrasolo") & (
                rounds_tmp.loc[index, "party"] == "Kontra"
            ):
                solo = True
            # divide points by team members
            points = points / rounds_tmp.loc[index, "no_team_members"]

        this_round = {
            "round_id": match["round_id"],
            "date": pd.to_datetime(match["date"]).strftime("%a, %d %b %Y, %H:%M:%S"),
            "game_type": match["game_type"],
            "team1_player1": team1_player1,
            "team1_player2": team1_player2,
            "team1_party": team1_party,
            "team2_player1": team2_player1,
            "team2_player2": team2_player2,
            "team2_party": team2_party,
            "team3_player1": team3_player1,
            "team3_player2": team3_player2,
            "team3_party": team3_party,
            "team4_player1": team4_player1,
            "team4_player2": team4_player2,
            "team4_party": team4_party,
            "winning_party": match["winning_party"],
            "points": points,
            "won": won,
            "solo": solo,
        }

        this_round = pd.DataFrame([this_round])
        data = pd.concat([data, this_round], ignore_index=True)
    return data


def calc_team_wr_for_player(specific_player_id):
    data = winrates_of_teams()

    data = data[data["player_id_x"] <= data["player_id_y"]]
    data = data[
        (data["player_id_x"] == specific_player_id)
        | (data["player_id_y"] == specific_player_id)
    ]

    tmp = data[data["player_id_x"] != specific_player_id]
    data = data[data["player_id_x"] == specific_player_id]
    tmp = tmp.rename(
        columns={
            "player_id_x": "player_id_y",
            "player_id_y": "player_id_x",
            "name_x": "name_y",
            "name_y": "name_x",
        }
    )
    tmp = tmp[data.columns]

    data = pd.concat([tmp, data], axis=0)
    return data


def calc_player_stats_for_specific_player(specific_player_id, up_to=20):
    # import data
    players = pd.read_csv(csv_file_players, index_col=False)
    players_teams = pd.read_csv(csv_file_player_team, index_col=False)
    teams = pd.read_csv(csv_file_teams, index_col=False)
    rounds = pd.read_csv(csv_file_rounds, index_col=False)
    teams_rounds = pd.read_csv(csv_file_team_round, index_col=False)
    specials = pd.read_csv(csv_file_specials, index_col=False)

    # calc no of team members in round to calculate points
    team_members = (
        teams.merge(players_teams, on="team_id")
        .groupby(["team_id"])
        .size()
        .reset_index(name="no_team_members")
    )

    # joins teams with players
    data = players.merge(players_teams, on="player_id").merge(
        team_members, on="team_id"
    )
    data = data.merge(teams, on="team_id")
    data = data.merge(teams_rounds, on="team_id")

    data = data[data["player_id"] == specific_player_id]

    # merge with rounds
    data = data.merge(rounds, on="round_id")

    # check if game was won
    data.loc[data["party"] != data["winning_party"], "points"] *= -1

    # check if game was solo, if so triple points for Re party

    solos = [
        "Trumpfsolo",
        "Damensolo",
        "Bubensolo",
        "Fleischloses",
        "Knochenloses",
        "Schlanker Martin",
        # "Kontrasolo",  kontrasolo is only solo where kontra points get tripled!!
        "Stille Hochzeit",
    ]

    data.loc[(data["game_type"].isin(solos)) & (data["party"] == "Re"), "points"] *= 3
    data.loc[
        (data["game_type"] == "Kontrasolo") & (data["party"] == "Kontra"), "points"
    ] *= 3

    # check if game was won
    data["won"] = np.where(data["party"] == data["winning_party"], True, False)

    # check solo data
    data["played_solo"] = np.where(
        ((data["game_type"].isin(solos)) & (data["party"] == "Re"))
        | ((data["game_type"] == "Kontrasolo") & (data["party"] == "Kontra")),
        True,
        False,
    )
    data["won_solo"] = np.where((data["played_solo"]) & (data["won"]), True, False)

    # check if played alone
    data["played_alone"] = np.where(data["no_team_members"] == 1, True, False)
    data["won_alone"] = np.where((data["played_alone"]) & (data["won"]), True, False)
    data["points_alone"] = np.where(data["played_alone"], data["points"], 0)

    # add to count games
    data["played"] = 1

    # divide points by team members
    data["points_whole_team"] = data["points"]
    data = data.astype({"points": float})
    data.loc[:, "points"] /= data["no_team_members"]

    # drop unimportant cols
    data = data[
        [
            "points_whole_team",
            "player_id",
            "name",
            "points",
            "won",
            "played",
            "start_points",
            "played_solo",
            "won_solo",
            "played_alone",
            "won_alone",
            "points_alone",
        ]
    ]

    # sum over all rows to get wr and points
    data = data.groupby(["player_id", "name", "start_points"]).sum().reset_index()
    data["winrate"] = round(data["won"] / data["played"], 4)
    data["mean_points"] = round(data["points_whole_team"] / data["played"], 3)
    data["solo_winrate"] = round(data["won_solo"] / data["played_solo"], 4)
    data["alone_winrate"] = round(data["won_alone"] / data["played_alone"], 4)
    data["alone_mean_points"] = round(data["points_alone"] / data["played_alone"], 3)
    data["points"] += data["start_points"]

    # drop unimportant cols
    data_total = data[
        [
            "player_id",
            "name",
            "points",
            "winrate",
            "mean_points",
            "solo_winrate",
            "played_solo",
            "played",
            "played_alone",
            "alone_winrate",
            "alone_mean_points",
        ]
    ]

    ######################################
    # do the same for the last n rounds: #
    ######################################

    # calc no of team members in round to calculate points
    team_members = (
        teams.merge(players_teams, on="team_id")
        .groupby(["team_id"])
        .size()
        .reset_index(name="no_team_members")
    )

    # joins teams with players
    data = players.merge(players_teams, on="player_id").merge(
        team_members, on="team_id"
    )
    data = data.merge(teams, on="team_id")
    data = data.merge(teams_rounds, on="team_id")

    data = data[data["player_id"] == specific_player_id]

    # merge with rounds
    data = data.merge(rounds, on="round_id")
    data.loc[:, "date"] = pd.to_datetime(data["date"])

    data = data.sort_values(by="date", ascending=False)
    data = data.head(up_to)

    # check if game was won
    data.loc[data["party"] != data["winning_party"], "points"] *= -1

    # check if game was solo, if so triple points for Re party
    solos = [
        "Trumpfsolo",
        "Damensolo",
        "Bubensolo",
        "Fleischloses",
        "Knochenloses",
        "Schlanker Martin",
        # "Kontrasolo",
        "Stille Hochzeit",
    ]

    data.loc[(data["game_type"].isin(solos)) & (data["party"] == "Re"), "points"] *= 3
    data.loc[
        (data["game_type"] == "Kontrasolo") & (data["party"] == "Kontra"), "points"
    ] *= 3

    # check if game was won
    data["won"] = np.where(data["party"] == data["winning_party"], True, False)

    # check solo data
    data["played_solo"] = np.where(
        ((data["game_type"].isin(solos)) & (data["party"] == "Re"))
        | ((data["game_type"] == "Kontrasolo") & (data["party"] == "Kontra")),
        True,
        False,
    )
    data["won_solo"] = np.where((data["played_solo"]) & (data["won"]), True, False)

    # add to count games
    data["played"] = 1

    # divide points by team members but backup so we can calc mean
    data["points_whole_team"] = data["points"]
    data = data.astype({"points": float})
    data.loc[:, "points"] /= data["no_team_members"]

    # drop unimportant cols
    data = data[
        [
            "points_whole_team",
            "player_id",
            "name",
            "points",
            "won",
            "played",
            "start_points",
            "played_solo",
            "won_solo",
        ]
    ]

    # sum over all rows to get wr and points
    data = data.groupby(["player_id", "name", "start_points"]).sum().reset_index()
    data["winrate"] = round(data["won"] / data["played"], 4)
    data["mean_points"] = round(data["points_whole_team"] / data["played"], 3)
    data["solo_winrate"] = round(data["won_solo"] / data["played_solo"], 4)
    data["points"] += data["start_points"]

    # drop unimportant cols
    data = data[
        [
            "player_id",
            "name",
            "points",
            "winrate",
            "mean_points",
            "solo_winrate",
            "played_solo",
            "played",
        ]
    ]

    calc_winrates_with_cards(specific_player_id)

    ## NOW ##
    # add winrate of last n to total data

    data_total["winrate_lately"] = data["winrate"]
    data_total["mean_points"] = round(data_total["mean_points"], 3)
    data_total["solo_winrate"] = round(data_total["solo_winrate"], 4)
    return data_total


def calc_winrates_with_cards(specific_player_id):

    # import data
    players = pd.read_csv(csv_file_players, index_col=False)
    players_teams = pd.read_csv(csv_file_player_team, index_col=False)
    teams = pd.read_csv(csv_file_teams, index_col=False)
    rounds = pd.read_csv(csv_file_rounds, index_col=False)
    teams_rounds = pd.read_csv(csv_file_team_round, index_col=False)
    specials = pd.read_csv(csv_file_specials, index_col=False)

    # calc no of team members in round to calculate points
    team_members = (
        teams.merge(players_teams, on="team_id")
        .groupby(["team_id"])
        .size()
        .reset_index(name="no_team_members")
    )

    # joins teams with players and specials
    data = players.merge(players_teams, on="player_id").merge(
        team_members, on="team_id"
    )
    data = data.merge(teams, on="team_id")
    data = data.merge(teams_rounds, on="team_id")
    data = data.merge(specials, on="team_id")

    data = data[data["player_id"] == specific_player_id]

    # merge with rounds
    data = data.merge(rounds, on="round_id")

    # check if game was won
    data.loc[data["party"] != data["winning_party"], "points"] *= -1

    # check if game was solo, if so triple points for Re party
    solos = [
        "Trumpfsolo",
        "Damensolo",
        "Bubensolo",
        "Fleischloses",
        "Knochenloses",
        "Schlanker Martin",
        # "Kontrasolo",
        "Stille Hochzeit",
    ]

    data.loc[(data["game_type"].isin(solos)) & (data["party"] == "Re"), "points"] *= 3
    data.loc[
        (data["game_type"] == "Kontrasolo") & (data["party"] == "Kontra"), "points"
    ] *= 3

    # check if game was won
    data["won"] = np.where(data["party"] == data["winning_party"], True, False)

    # add to count games
    data["played"] = 1

    # sum over all rows to get wr and points
    data = data.groupby(["player_id", "name", "special"]).sum().reset_index()
    data["winrate"] = round(data["won"] / data["played"], 4) * 100
    data["mean_points"] = round(data["points"] / data["played"], 3)

    data = data[
        ["player_id", "name", "points", "winrate", "mean_points", "played", "special"]
    ]
    return data


def calc_winrates_with_cards_total():

    # import data
    players = pd.read_csv(csv_file_players, index_col=False)
    players_teams = pd.read_csv(csv_file_player_team, index_col=False)
    teams = pd.read_csv(csv_file_teams, index_col=False)
    rounds = pd.read_csv(csv_file_rounds, index_col=False)
    teams_rounds = pd.read_csv(csv_file_team_round, index_col=False)
    specials = pd.read_csv(csv_file_specials, index_col=False)

    # calc no of team members in round to calculate points
    team_members = (
        teams.merge(players_teams, on="team_id")
        .groupby(["team_id"])
        .size()
        .reset_index(name="no_team_members")
    )

    # joins teams with specials
    data = team_members.merge(teams, on="team_id")
    data = data.merge(teams_rounds, on="team_id")
    data = data.merge(specials, on="team_id")

    # merge with rounds
    data = data.merge(rounds, on="round_id")

    # check if game was won
    data.loc[data["party"] != data["winning_party"], "points"] *= -1

    # check if game was solo, if so triple points for Re party
    solos = [
        "Trumpfsolo",
        "Damensolo",
        "Bubensolo",
        "Fleischloses",
        "Knochenloses",
        "Schlanker Martin",
        # "Kontrasolo",
        "Stille Hochzeit",
    ]

    data.loc[(data["game_type"].isin(solos)) & (data["party"] == "Re"), "points"] *= 3
    data.loc[
        (data["game_type"] == "Kontrasolo") & (data["party"] == "Kontra"), "points"
    ] *= 3

    # check if game was won
    data["won"] = np.where(data["party"] == data["winning_party"], True, False)

    # add to count games
    data["played"] = 1

    # sum over all rows to get wr and points
    data = data.groupby(["special"]).sum().reset_index()
    data["winrate"] = round(data["won"] / data["played"], 4) * 100
    data["mean_points"] = round(data["points"] / data["played"], 3)

    data = data[["points", "winrate", "mean_points", "played", "special"]]
    return data


def calc_total_games_played():
    data = pd.read_csv(csv_file_rounds, index_col=False)
    data["played"] = 1
    return len(data)


def calc_winrates_game_types():
    # import data
    data = pd.read_csv(csv_file_rounds, index_col=False)

    # check if game was won
    data.loc[data["winning_party"] != "Re", "points"] *= -1

    # check if game was solo, if so triple points for Re party
    solos = [
        "Trumpfsolo",
        "Damensolo",
        "Bubensolo",
        "Fleischloses",
        "Knochenloses",
        "Schlanker Martin",
        # "Kontrasolo",
        "Stille Hochzeit",
    ]

    data.loc[data["game_type"].isin(solos), "points"] *= 3

    # check if game was won
    data["won"] = np.where(data["winning_party"] == "Re", True, False)

    # add to count games
    data["played"] = 1

    # sum over all rows to get wr and points
    data = data.groupby(["game_type"]).sum().reset_index()
    data["winrate"] = round(data["won"] / data["played"], 4) * 100
    data["mean_points"] = round(data["points"] / data["played"], 3)

    data = data[["points", "winrate", "mean_points", "played", "game_type"]]
    return data


def calc_winrates_game_types_for_specific_player(specific_player_id):
    # import data
    players = pd.read_csv(csv_file_players, index_col=False)
    players_teams = pd.read_csv(csv_file_player_team, index_col=False)
    teams = pd.read_csv(csv_file_teams, index_col=False)
    rounds = pd.read_csv(csv_file_rounds, index_col=False)
    teams_rounds = pd.read_csv(csv_file_team_round, index_col=False)
    specials = pd.read_csv(csv_file_specials, index_col=False)

    # merge data and filter for player
    players = players[players["player_id"] == specific_player_id]
    data = players.merge(players_teams, on="player_id")
    data = data.merge(teams, on="team_id")
    data = data.merge(teams_rounds, on="team_id")
    data = data.merge(rounds, on="round_id")

    # check if game was won
    data.loc[data["winning_party"] != data["party"], "points"] *= -1

    # check if game was solo, if so triple points for Re party
    solos = [
        "Trumpfsolo",
        "Damensolo",
        "Bubensolo",
        "Fleischloses",
        "Knochenloses",
        "Schlanker Martin",
        # "Kontrasolo",
        "Stille Hochzeit",
    ]

    data.loc[(data["game_type"].isin(solos)) & (data["party"] == "Re"), "points"] *= 3
    data.loc[
        (data["game_type"] == "Kontrasolo") & (data["party"] == "Kontra"), "points"
    ] *= 3

    # only count solos that the player initiated
    data["played_solo"] = True
    data.loc[
        (data["game_type"].isin(solos)) & (data["party"] == "Kontra"), "played_solo"
    ] = False
    data.loc[
        (data["game_type"] == "Kontrasolo") & (data["party"] == "Kontra"), "played_solo"
    ] = True
    data = data[data["played_solo"]]

    # check if game was won
    data["won"] = np.where(data["winning_party"] == data["party"], True, False)

    # add to count games
    data["played"] = 1

    # sum over all rows to get wr and points
    data = data.groupby(["game_type"]).sum().reset_index()
    data["winrate"] = round(data["won"] / data["played"], 4) * 100
    data["mean_points"] = round(data["points"] / data["played"], 3)

    data = data[["points", "winrate", "mean_points", "played", "game_type"]]
    return data


def calc_daytime_stats_for_specific_player(specific_player_id):
    # import data
    players = pd.read_csv(csv_file_players, index_col=False)
    players_teams = pd.read_csv(csv_file_player_team, index_col=False)
    teams = pd.read_csv(csv_file_teams, index_col=False)
    rounds = pd.read_csv(csv_file_rounds, index_col=False)
    teams_rounds = pd.read_csv(csv_file_team_round, index_col=False)
    specials = pd.read_csv(csv_file_specials, index_col=False)

    # to datetime
    rounds.loc[:, "date"] = pd.to_datetime(rounds["date"])

    # calc no of team members in round to calculate points
    team_members = (
        teams.merge(players_teams, on="team_id")
        .groupby(["team_id"])
        .size()
        .reset_index(name="no_team_members")
    )

    # joins teams with players
    data = players.merge(players_teams, on="player_id").merge(
        team_members, on="team_id"
    )
    data = data.merge(teams, on="team_id")
    data = data.merge(teams_rounds, on="team_id")

    data = data[data["player_id"] == specific_player_id]

    # merge with rounds
    data = data.merge(rounds, on="round_id")

    # check if game was won
    data.loc[data["party"] != data["winning_party"], "points"] *= -1

    # check if game was solo, if so triple points for Re party
    solos = [
        "Trumpfsolo",
        "Damensolo",
        "Bubensolo",
        "Fleischloses",
        "Knochenloses",
        "Schlanker Martin",
        # "Kontrasolo",
        "Stille Hochzeit",
    ]

    data.loc[(data["game_type"].isin(solos)) & (data["party"] == "Re"), "points"] *= 3
    data.loc[
        (data["game_type"] == "Kontrasolo") & (data["party"] == "Kontra"), "points"
    ] *= 3

    # check if game was won
    data["won"] = np.where(data["party"] == data["winning_party"], True, False)

    # check solo data
    data["played_solo"] = np.where(
        ((data["game_type"].isin(solos)) & (data["party"] == "Re"))
        | ((data["game_type"] == "Kontrasolo") & (data["party"] == "Kontra")),
        True,
        False,
    )
    data["won_solo"] = np.where((data["played_solo"]) & (data["won"]), True, False)

    # check if played alone
    data["played_alone"] = np.where(data["no_team_members"] == 1, True, False)
    data["won_alone"] = np.where((data["played_alone"]) & (data["won"]), True, False)
    data["points_alone"] = np.where(data["played_alone"], data["points"], 0)

    # add to count games
    data["played"] = 1

    # divide points by team members
    data = data.astype({"points": float})
    data.loc[:, "points"] /= data["no_team_members"]

    # get weekday
    data["hour"] = pd.to_datetime(data["date"]).dt.hour

    # drop unimportant cols
    data = data[["points", "won", "played", "hour"]]

    # sum over all rows to get wr and points
    data = data.groupby(["hour"]).sum().reset_index()
    data["winrate"] = round(data["won"] / data["played"], 4)
    data["mean_points"] = round(data["points"] / data["played"], 3)

    return data


def calc_weekday_stats_for_specific_player(specific_player_id):
    # import data
    players = pd.read_csv(csv_file_players, index_col=False)
    players_teams = pd.read_csv(csv_file_player_team, index_col=False)
    teams = pd.read_csv(csv_file_teams, index_col=False)
    rounds = pd.read_csv(csv_file_rounds, index_col=False)
    teams_rounds = pd.read_csv(csv_file_team_round, index_col=False)
    specials = pd.read_csv(csv_file_specials, index_col=False)

    # to datetime
    rounds.loc[:, "date"] = pd.to_datetime(rounds["date"])

    # calc no of team members in round to calculate points
    team_members = (
        teams.merge(players_teams, on="team_id")
        .groupby(["team_id"])
        .size()
        .reset_index(name="no_team_members")
    )

    # joins teams with players
    data = players.merge(players_teams, on="player_id").merge(
        team_members, on="team_id"
    )
    data = data.merge(teams, on="team_id")
    data = data.merge(teams_rounds, on="team_id")

    data = data[data["player_id"] == specific_player_id]

    # merge with rounds
    data = data.merge(rounds, on="round_id")

    # check if game was won
    data.loc[data["party"] != data["winning_party"], "points"] *= -1

    # check if game was solo, if so triple points for Re party
    solos = [
        "Trumpfsolo",
        "Damensolo",
        "Bubensolo",
        "Fleischloses",
        "Knochenloses",
        "Schlanker Martin",
        # "Kontrasolo",
        "Stille Hochzeit",
    ]

    data.loc[(data["game_type"].isin(solos)) & (data["party"] == "Re"), "points"] *= 3
    data.loc[
        (data["game_type"] == "Kontrasolo") & (data["party"] == "Kontra"), "points"
    ] *= 3

    # check if game was won
    data["won"] = np.where(data["party"] == data["winning_party"], True, False)

    # check solo data
    data["played_solo"] = np.where(
        ((data["game_type"].isin(solos)) & (data["party"] == "Re"))
        | ((data["game_type"] == "Kontrasolo") & (data["party"] == "Kontra")),
        True,
        False,
    )
    data["won_solo"] = np.where((data["played_solo"]) & (data["won"]), True, False)

    # check if played alone
    data["played_alone"] = np.where(data["no_team_members"] == 1, True, False)
    data["won_alone"] = np.where((data["played_alone"]) & (data["won"]), True, False)
    data["points_alone"] = np.where(data["played_alone"], data["points"], 0)

    # add to count games
    data["played"] = 1

    # divide points by team members
    data = data.astype({"points": float})
    data.loc[:, "points"] /= data["no_team_members"]

    # get weekday
    data["weekday"] = pd.to_datetime(data["date"]).dt.dayofweek

    WEEKDAYS = [
        "Montag",
        "Dienstag",
        "Mittwoch",
        "Donnerstag",
        "Freitag",
        "Samstag",
        "Sonntag",
    ]

    # drop unimportant cols
    data = data[["points", "won", "played", "weekday"]]

    # sum over all rows to get wr and points
    data = data.groupby(["weekday"]).sum().reset_index()
    data["winrate"] = round(data["won"] / data["played"], 4)
    data["mean_points"] = round(data["points"] / data["played"], 3)

    data["weekday"] = data["weekday"].map(lambda x: WEEKDAYS[x])

    return data
