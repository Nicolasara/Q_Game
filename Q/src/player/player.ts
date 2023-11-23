import { QTile } from '../game/map/tile';
import {
  RelevantPlayerInfo,
  TilePlacement
} from '../game/types/gameState.types';
import { Strategy } from './strategy';
import { QRuleBook } from '../game/rules/ruleBook';
import { TurnAction } from './turnAction';

/**
 * Interface representing a Player.
 * Players are identified by a unique name, and are abstracted over a Strategy to play the game.
 * The interface provides functionality for setting up a player for a game, making moves, getting new tiles
 */
export interface Player<T extends QTile> {
  /**
   * Getter method for the player's name
   * @returns the player's name
   */
  name: () => Promise<string>;

  /**
   * Set up the player with the initial map and their starting tiles.
   * @param m The initial map of the game
   * @param st The player's starting tiles
   * @returns void
   */
  setUp: (m: TilePlacement<T>[], st: T[]) => Promise<void>;

  /**
   * Given the current public game state, which includes the current map, the number of remaining tiles, and the player's tiles, make a move based on the player's strategy.
   * A turn action is one of
   * - pass
   * - ask the referee to replace all of their tiles
   * - requests the extension of the map in the given state with some tile placements
   * @param s The current public game state. Includes the map, number of remaining tiles, and the player's tiles.
   * @returns The turn action that the player wants to take
   */
  takeTurn: (s: RelevantPlayerInfo<T>) => Promise<TurnAction<T>>;

  /**
   * Method to receive a new hand of tiles. The new tiles are added onto whatever tiles the player currently has after their last move
   * @param st The new tiles
   * @returns void
   */
  newTiles: (st: T[]) => Promise<void>;

  /**
   * Method to alert this Player that they have won the game.
   * @param w boolean, true if the player won, false otherwise
   * @returns void
   */
  win: (w: boolean) => Promise<void>;
}

/**
 * Implementation of a Base Player.
 * The Player takes in their name, strategy, and a rulebook on initialization.
 */
export class BasePlayer<T extends QTile> implements Player<T> {
  private playerName: string;
  private strategy: Strategy<T>;
  private rulebook: QRuleBook<T>;

  private tiles: T[];
  private map: TilePlacement<T>[];
  private hasWon: boolean;

  constructor(name: string, strategy: Strategy<T>, rulebook: QRuleBook<T>) {
    this.playerName = name;
    this.strategy = strategy;
    this.rulebook = rulebook;

    this.tiles = [];
    this.map = [];
    this.hasWon = false;
  }

  public async name() {
    return this.playerName;
  }

  public async setUp(m: TilePlacement<T>[], st: T[]) {
    this.map = m;
    this.tiles = st;
  }

  public async takeTurn(s: RelevantPlayerInfo<T>) {
    const { mapState, remainingTilesCount, playerTiles } = s;

    this.tiles = playerTiles;
    this.map = mapState;

    const action = this.strategy.suggestMove(
      this.map,
      this.tiles,
      remainingTilesCount,
      this.rulebook.getPlacementRules()
    );

    this.reduceExistingTiles(action);

    return action;
  }

  private reduceExistingTiles(action: TurnAction<T>) {
    if (action.ofType('PLACE')) {
      this.tiles = this.tiles.filter(
        (playerTile) =>
          !action.getPlacements().find(({ tile }) => playerTile.equals(tile))
      );
    } else if (action.ofType('EXCHANGE')) {
      this.tiles = [];
    }
  }

  public async newTiles(st: T[]) {
    this.tiles = [...this.tiles, ...st];
  }

  public async win(w: boolean) {
    this.hasWon = w;
  }
}

export class SetupExceptionPlayer<T extends QTile> extends BasePlayer<T> {
  public async setUp(m: TilePlacement<T>[], st: T[]) {
    const mapString = JSON.stringify(m);
    const startingTileString = JSON.stringify(st);
    throw new Error(
      `Setup exception for player ${this.name()} when called with map: ${mapString}, and starting tile ${startingTileString}`
    );
  }
}

export class TurnExceptionPlayer<T extends QTile> extends BasePlayer<T> {
  public async takeTurn(s: RelevantPlayerInfo<T>): Promise<TurnAction<T>> {
    const stateString = JSON.stringify(s);
    throw new Error(
      `Turn exception for player ${this.name()} when called with state: ${stateString}`
    );
  }
}

export class NewTilesExceptionPlayer<T extends QTile> extends BasePlayer<T> {
  public async newTiles(st: T[]) {
    const tilesString = JSON.stringify(st);
    throw new Error(
      `New tiles exception for player ${this.name()} when called with tiles: ${tilesString}`
    );
  }
}

export class WinExceptionPlayer<T extends QTile> extends BasePlayer<T> {
  public async win(w: boolean) {
    throw new Error(
      `Win exception for player ${this.name()} when called with win: ${w}`
    );
  }
}

abstract class AbstractDelayedTimeoutPlayer<
  T extends QTile
> extends BasePlayer<T> {
  methodCallCount: number;

  constructor(
    name: string,
    strategy: Strategy<T>,
    rulebook: QRuleBook<T>,
    private readonly methodCallsUntilDelay: number
  ) {
    super(name, strategy, rulebook);
    this.methodCallCount = 0;
  }

  protected callDelayedTimeoutMethod() {
    this.methodCallCount++;
    if (this.methodCallCount >= this.methodCallsUntilDelay) {
      while (true) {
        // infinite loop
      }
    }
  }
}

export class DelayedSetupTimeoutPlayer<
  T extends QTile
> extends AbstractDelayedTimeoutPlayer<T> {
  public async setUp(m: TilePlacement<T>[], st: T[]) {
    this.callDelayedTimeoutMethod();
    super.setUp(m, st);
  }
}

export class DelayedTurnTimeoutPlayer<
  T extends QTile
> extends AbstractDelayedTimeoutPlayer<T> {
  public async takeTurn(s: RelevantPlayerInfo<T>) {
    this.callDelayedTimeoutMethod();
    return super.takeTurn(s);
  }
}

export class DelayedNewTilesTimeoutPlayer<
  T extends QTile
> extends AbstractDelayedTimeoutPlayer<T> {
  public async newTiles(st: T[]) {
    this.callDelayedTimeoutMethod();
    super.newTiles(st);
  }
}

export class DelayedWinTimeoutPlayer<
  T extends QTile
> extends AbstractDelayedTimeoutPlayer<T> {
  public async win(w: boolean) {
    this.callDelayedTimeoutMethod();
    super.win(w);
  }
}
