import { Set } from 'typescript-collections';
import { QTile } from '../map/tile';
import {
  PlayerEndGameInformation,
  PlayerSetupInformation,
  RenderablePlayer,
  Scoreboard,
  TilePlacement,
  TurnState
} from '../types/gameState.types';
import PlayerState from './playerState';
import { TurnAction } from '../../player/turnAction';

/**
 * Interface representing the players in a game and the order in which they take
 * turns.
 *
 * Contains a queue of players where the active player is first in the queue.
 * Provides functionality for moving the active player to the next player in
 * line, removing a player from the game, getting a scoreboard of all players
 * scores, and getting the names of all players.
 *
 * There is an invariant here that all player names in the queue are unique,
 * and that a queue cannot be created with 0 players.
 */
export interface QPlayerTurnQueue<T extends QTile> {
  /**
   * Change the active player to be the next player in queue. Move the
   * previously active player to be last in the queue.
   * @param turnState the turn state of the player who was the active
   * player when this method was called
   * @throws Error if there are no players remaining in the queue
   * @returns void
   */
  nextTurn: (turnState: TurnState<T>) => void;

  /**
   * Get the player whose turn it currently is
   * @throws Error if there are no players remaining in the queue
   * @returns the player whose turn it is
   */
  getActivePlayer: () => PlayerState<T>;

  /**
   * Get the player who went just before the currently active player
   * @throws Error if there are no players remaining in the queue
   * @returns the last active player
   */
  getLastActivePlayer: () => PlayerState<T>;

  /**
   * Remove the player with the given name from the queue/game.
   * If the eliminated player is also the 'first player' (the player who started the round), then the first player is changed to the next, non eliminated player.
   * @param playerName name of the player to be eliminated
   * @param attemptedTurnAction an optional turn action if the player got eliminated for attempting to make an invalid move
   * @throws an error if the player name does not exist in the turn queue
   * @returns a list of the eliminated players tiles
   */
  eliminatePlayer: (
    playerName: string,
    attemptedTurnAction?: TurnAction<T>
  ) => T[];

  /**
   * Get the scores of all players in the queue in the form of a Scoreboard
   * @returns Scoreboard, a list of scores for each player
   */
  getScoreboard: () => Scoreboard;

  /**
   * Get the names of all players in the game
   * @returns list of all players names
   */
  getAllPlayersNames: () => string[];

  /**
   * Update the given player's score by the given amount
   * @param playerName player whose score to update
   * @param scoreDelta amount to update by
   * @throws error if player name does not exist in turn queue
   * @returns void
   */
  updatePlayerScore: (playerName: string, scoreDelta: number) => void;

  /**
   * Check if a full round of turns has been completed.
   * This is the case if every player still in the game has played a turn this round.
   * We also consider the case where no players have played in the round to be over.
   * @returns true if the round is over, false otherwise
   */
  isRoundOver: () => boolean;

  /**
   * Gets the most recent turn state of each player.
   * A TurnState includes the player's most recent turn action, and their tiles before taking that turn. Or it is undefined if they haven't taken a turn yet.
   * This includes the most recent turns of both the current players, as well as the players who were eliminated while attempting an invalid move during the current round.
   * @returns a list of the turn states of the players
   */
  getAllMostRecentTurns: () => (TurnState<T> | undefined)[];

  /**
   * Gets the information needed to setup each Player controller
   * @returns a list of objects containing each player's tiles and respective
   * setup callback
   */
  getAllPlayersSetupInformation: () => PlayerSetupInformation<T>[];

  /**
   * Gets the information needed to communicate the end of game with each Player controller
   * @returns a list of objects containing each player's name and respective win callback
   */
  getAllPlayersEndGameInformation: () => PlayerEndGameInformation[];

  /**
   * Gets the information needed to render each player state from the referee's perspective
   * @returns a list of objects containing each player's score and tiles, in the
   * turn order of the players
   */
  getRenderablePlayerStates: () => RenderablePlayer<T>[];
}

/**
 * Class representing the players in the game and the order they take turns.
 */
class PlayerTurnQueue<T extends QTile> implements QPlayerTurnQueue<T> {
  // This is a queue of Player States. It will only be accessed by using the shift() method to remove from the front, or the push() method to add to the back
  private playerQueue: PlayerState<T>[];

  // This set contains the names of the players who have taken turns so far this
  // round.
  private playersActedThisRound: Set<string>;

  // This list contains the PlayerStates of the players who were eliminated while attempting an invalid move in the current round
  private playersEliminatedAttemptingTurnThisRound: PlayerState<T>[];

  constructor(players: PlayerState<T>[]) {
    this.playerQueue = players;
    if (players.length === 0) {
      throw new Error('Cannot create a turn queue with 0 players');
    }
    this.playersActedThisRound = new Set<string>();
    this.playersEliminatedAttemptingTurnThisRound = [];
  }

  public nextTurn(turnState: TurnState<T>) {
    const player = this.playerQueue.shift();
    if (!player) {
      throw new Error('No players in queue');
    }
    player.setMostRecentTurn(turnState);
    this.updateRound(player.getName());
    this.playerQueue.push(player);
  }

  private updateRound(playerName: string) {
    if (this.playersActedThisRound.contains(playerName)) {
      this.playersActedThisRound = new Set<string>();
      this.playersEliminatedAttemptingTurnThisRound = [];
    }
    this.playersActedThisRound.add(playerName);
  }

  public getActivePlayer() {
    const player = this.playerQueue[0];
    if (!player) {
      throw new Error('no players remaining');
    }
    return player;
  }

  public getLastActivePlayer() {
    const lastActivePlayer = this.playerQueue[this.playerQueue.length - 1];
    if (!lastActivePlayer) {
      throw new Error('no players remaining');
    }
    return lastActivePlayer;
  }

  public eliminatePlayer(
    playerName: string,
    attemptedTurnAction?: TurnAction<T>
  ) {
    const player = this.playerQueue.find((p) => p.getName() === playerName);
    if (!player) {
      throw new Error('player does not exist, or has already been eliminated');
    }
    const playerTiles = player?.getAllTiles();
    this.playerQueue = this.playerQueue.filter(
      (p) => p.getName() !== playerName
    );

    this.updateEliminatedPlayersAttemptingTurnThisRound(
      attemptedTurnAction,
      playerTiles,
      player
    );

    return playerTiles;
  }

  private updateEliminatedPlayersAttemptingTurnThisRound(
    attemptedTurnAction: TurnAction<T> | undefined,
    playerTiles: T[],
    player: PlayerState<T>
  ) {
    if (attemptedTurnAction) {
      player.setMostRecentTurn({
        playerTiles,
        turnAction: attemptedTurnAction
      });
      this.playersEliminatedAttemptingTurnThisRound.push(player);
    }
  }

  public getScoreboard() {
    return this.playerQueue.map((player) => {
      return { name: player.getName(), score: player.getScore() };
    });
  }

  public getAllPlayersNames() {
    return this.playerQueue.map((player) => player.getName());
  }

  public updatePlayerScore(playerName: string, scoreDelta: number) {
    const player = this.playerQueue.find((p) => p.getName() === playerName);
    if (!player) {
      throw new Error('player does not exist, or has already been eliminated');
    }
    player.updateScore(scoreDelta);
  }

  public isRoundOver() {
    return (
      // TODO: Bug about round over right after construction or after first
      // player eliminated?
      this.playersActedThisRound.size() === 0 ||
      this.playerQueue.every((playerState) =>
        this.playersActedThisRound.contains(playerState.getName())
      )
    );
  }

  public getAllMostRecentTurns(): (TurnState<T> | undefined)[] {
    const allTurns: (TurnState<T> | undefined)[] = [];
    const addTurnsFromPlayers = (players: PlayerState<T>[]) => {
      players.forEach((player) => {
        allTurns.push(player.getMostRecentTurn());
      });
    };
    addTurnsFromPlayers(this.playerQueue);
    addTurnsFromPlayers(this.playersEliminatedAttemptingTurnThisRound);
    return allTurns;
  }

  public getAllPlayersSetupInformation() {
    return this.playerQueue.map((playerState) => ({
      name: playerState.getName(),
      tiles: playerState.getAllTiles(),
      setUp: (m: TilePlacement<T>[], st: T[]) =>
        playerState.getPlayerController().setUp(m, st)
    }));
  }

  public getAllPlayersEndGameInformation() {
    return this.playerQueue.map((playerState) => ({
      name: playerState.getName(),
      win: (w: boolean) => playerState.getPlayerController().win(w)
    }));
  }

  public getRenderablePlayerStates() {
    return this.playerQueue.map((playerState) => ({
      name: playerState.getName(),
      score: playerState.getScore(),
      tiles: [...playerState.getAllTiles()]
    }));
  }
}

export default PlayerTurnQueue;
