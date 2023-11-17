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
  name: () => string;

  /**
   * Set up the player with the initial map and their starting tiles.
   * @param m The initial map of the game
   * @param st The player's starting tiles
   * @returns void
   */
  setUp: (m: TilePlacement<T>[], st: T[]) => void;

  /**
   * Given the current public game state, which includes the current map, the number of remaining tiles, and the player's tiles, make a move based on the player's strategy.
   * A turn action is one of
   * - pass
   * - ask the referee to replace all of their tiles
   * - requests the extension of the map in the given state with some tile placements
   * @param s The current public game state. Includes the map, number of remaining tiles, and the player's tiles.
   * @returns The turn action that the player wants to take
   */
  takeTurn: (s: RelevantPlayerInfo<T>) => TurnAction<T>;

  /**
   * Method to receive a new hand of tiles. The new tiles are added onto whatever tiles the player currently has after their last move
   * @param st The new tiles
   * @returns void
   */
  newTiles: (st: T[]) => void;

  /**
   * Method to alert this Player that they have won the game.
   * @param w boolean, true if the player won, false otherwise
   * @returns void
   */
  win: (w: boolean) => void;
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

  public name() {
    return this.playerName;
  }

  public setUp(m: TilePlacement<T>[], st: T[]) {
    this.map = m;
    this.tiles = st;
  }

  public takeTurn(s: RelevantPlayerInfo<T>) {
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

  public newTiles(st: T[]) {
    this.tiles = [...this.tiles, ...st];
  }

  public win(w: boolean) {
    w;
  }
}

abstract class AbstractDelayedTimeoutPlayer<
  T extends QTile
> extends BasePlayer<T> {
  setupCallCount: number;

  constructor(
    name: string,
    strategy: Strategy<T>,
    rulebook: QRuleBook<T>,
    private readonly delay: number
  ) {
    super(name, strategy, rulebook);
    this.setupCallCount = 0;
  }

  protected callDelayedTimeoutMethod() {
    this.setupCallCount++;
    if (this.setupCallCount >= this.delay) {
      while (true) {
        // infinite loop
      }
    }
  }
}

export class DelayedSetupTimeoutPlayer extends AbstractDelayedTimeoutPlayer<QTile> {
  public setUp(m: TilePlacement<QTile>[], st: QTile[]) {
    this.callDelayedTimeoutMethod();
    super.setUp(m, st);
  }
}

export class DelayedTurnTimeoutPlayer extends AbstractDelayedTimeoutPlayer<QTile> {
  public takeTurn(s: RelevantPlayerInfo<QTile>) {
    this.callDelayedTimeoutMethod();
    return super.takeTurn(s);
  }
}

export class DelayedNewTilesTimeoutPlayer extends AbstractDelayedTimeoutPlayer<QTile> {
  public newTiles(st: QTile[]) {
    this.callDelayedTimeoutMethod();
    super.newTiles(st);
  }
}

export class DelayedWinTimeoutPlayer extends AbstractDelayedTimeoutPlayer<QTile> {
  public win(w: boolean) {
    this.callDelayedTimeoutMethod();
    super.win(w);
  }
}
