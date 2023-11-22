import { QTile } from '../game/map/tile';
import {
  RelevantPlayerInfo,
  TilePlacement
} from '../game/types/gameState.types';
import { Player } from '../player/player';
import { TurnAction } from '../player/turnAction';
import { Result } from './referee.types';

/**
 * A safe player is a decorator for a player that will eliminate the player if
 * they take too long to take a turn or if they throw an error.
 */
export class SafePlayer<T extends QTile> {
  private readonly player: Player<T>;
  private readonly timeout: number;

  /**
   * Constructs a new safe player to wrap a given player.
   * @param player the player which this wraps
   * @param timeout the amount of time the safe player waits for a method to run
   * before failing
   */
  constructor(player: Player<T>, timeout: number) {
    this.player = player;
    this.timeout = timeout;
  }

  private handleErrorsAndTimeout<R>(f: () => R): Result<R> {
    try {
      return { success: true, value: this.handleTimeout(f) };
    } catch (error) {
      return { success: false };
    }
  }

  private handleTimeout<R>(f: () => R): R {
    let result: R | undefined = undefined;
    new Promise<R>(() => {
      f();
    }).then((res) => (result = res));
    const start = Date.now();
    while (start + this.timeout < Date.now()) {
      if (result !== undefined) {
        return result;
      }
    }
    throw new Error('Player timeout');
  }

  /**
   * Getter method for the player's name that handles errors and timeouts
   * @returns a result which indicates whether the call was successful and if so
   * contains the player's name
   */
  public name(): Result<string> {
    return this.handleErrorsAndTimeout(() => this.player.name());
  }

  /**
   * Calls the player's setUp method and handles errors and timeouts
   * @param m The initial map of the game
   * @param st The player's starting tiles
   * @returns a result which indicates whether the call was successful
   */
  public setUp(m: TilePlacement<T>[], st: T[]): Result<void> {
    return this.handleErrorsAndTimeout(() => this.player.setUp(m, st));
  }

  /**
   * Calls the player's takeTurn method and handles errors and timeouts
   * @param s The current public game state. Includes the map, number of remaining tiles, and the player's tiles.
   * @returns a result which indicates whether the call was successful and if so
   * contains the turn action that the player wants to take
   */
  public takeTurn(s: RelevantPlayerInfo<T>): Result<TurnAction<T>> {
    return this.handleErrorsAndTimeout(() => this.player.takeTurn(s));
  }

  /**
   * Calls the player's newTiles method and handles errors and timeouts
   * @param st The new tiles
   * @returns a result which indicates whether the call was successful
   */
  public newTiles(st: T[]): Result<void> {
    return this.handleErrorsAndTimeout(() => this.player.newTiles(st));
  }

  /**
   * Calls the player's win method and handles errors and timeouts
   * @param w boolean, true if the player won, false otherwise
   * @returns a result which indicates whether the call was successful
   */
  public win(w: boolean): Result<void> {
    return this.handleErrorsAndTimeout(() => this.player.win(w));
  }
}
