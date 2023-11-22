import { SafePlayer } from '../../referee/safePlayer';
import { QTile } from '../map/tile';
import { TurnState } from '../types/gameState.types';

/**
 * Interface representing PlayerState information. PlayerState contains
 * information such as the players name, current tiles, and score.
 * It also stores the Player object associated with the Player,
 * for communicating with the 'client'.
 */
interface QPlayerState<T extends QTile> {
  /**
   * Get the name of the player
   * @returns number representing the id
   */
  getName: () => string;

  /**
   * Get a SafePlayer object, which exposes the methods needed for communicating with a Player.
   * @returns The SafePlayer object
   */
  getPlayerController: () => SafePlayer<T>;

  /**
   * Gets all the tiles the player currently has
   * @returns a list of tiles
   */
  getAllTiles: () => T[];

  /**
   * Replace the players current tiles with a new array of tiles
   * @param tiles the players new tiles
   * @returns void
   */
  setTiles: (tiles: T[]) => void;

  /**
   * Get the number of tiles the player currently has
   * @returns number representing the players current number of tiles
   */
  getTileCount: () => number;

  /**
   * Get the players current score
   * @returns number representing the players score
   */
  getScore: () => number;

  /**
   * Add to the players current score
   * @param scoreDelta number to modify the players score by
   * @returns void
   */
  updateScore: (scoreDelta: number) => void;

  /**
   * Records the most recent turn taken by the player
   * @param turn the turn to record
   */
  setMostRecentTurn: (turnState: TurnState<T>) => void;

  /**
   * Returns the most recent turn taken by the player or undefined if they have
   * not taken a turn yet
   */
  getMostRecentTurn: () => TurnState<T> | undefined;
}

/**
 * Class representing the player state information. Contains the players name,
 * tiles, and score.
 * The PlayerState accepts a Player object in the constrcutor, which is a way to communicate
 * with the 'client' Player. The name of the Player is retrieved from the name()
 * method of this Player in the constructor, and if name() throws an error so will this constructor.
 */
class PlayerState<T extends QTile> implements QPlayerState<T> {
  private tiles: T[];
  private score: number;
  private mostRecentTurnState: TurnState<T> | undefined;
  private name: string;
  private player: SafePlayer<T>;

  constructor(player: SafePlayer<T>, playerName: string) {
    this.name = playerName;
    this.tiles = [];
    this.score = 0;
    this.mostRecentTurnState = undefined;
    this.player = player;
  }

  public getName() {
    return this.name;
  }

  public getPlayerController() {
    return this.player;
  }

  public getAllTiles() {
    return [...this.tiles];
  }

  public setTiles(tiles: T[]) {
    this.tiles = tiles;
  }

  public getTileCount() {
    return this.tiles.length;
  }

  public getScore() {
    return this.score;
  }

  public updateScore(scoreDelta: number) {
    this.score += scoreDelta;
  }

  public setMostRecentTurn(turnState: TurnState<T>): void {
    this.mostRecentTurnState = turnState;
  }

  public getMostRecentTurn(): TurnState<T> | undefined {
    return this.mostRecentTurnState;
  }
}

export default PlayerState;
