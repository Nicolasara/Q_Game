import { BaseTile, QTile } from '../game/map/tile';
import { TilePlacement } from '../game/types/gameState.types';
import { suggestMoveByStrategy, tilePlacementsToMap } from './strategyUtils';
import { PlacementRule } from '../game/types/rules.types';
import {
  sortCoordinatesByMostNeighbors,
  sortCoordinatesByRowColumnOrder
} from './strategySorters';
import { BaseTurnAction, TurnAction } from './turnAction';
import { colorList, shapeList } from '../game/types/map.types';
import Coordinate from '../game/map/coordinate';
import { Dictionary } from 'typescript-collections';

/**
 * Interface representing an implementation of a strategy for taking a turn in a Q game.
 * Strategies implement a suggestMove method that take in the necessary components of a game state and return the TurnAction that the player should take
 */
export interface Strategy<T extends QTile> {
  /**
   * Suggests a turn action based on the state of the map, the player's
   * available tiles, and the number of remaining tiles.
   * @param mapState the current placements of tiles on the game board
   * @param playerTiles the tiles currently in the active player's hand
   * @param remainingTilesCount nnumber of remaining tiles
   * @param placementRules list of the placement rules that must be adhered to. These include all placement rules, including the structural map rules
   * @returns The TurnAction that the player should play
   */
  suggestMove: (
    mapState: TilePlacement<T>[],
    playerTiles: T[],
    remainingTilesCount: number,
    placementRules: ReadonlyArray<PlacementRule<T>>
  ) => TurnAction<T>;
}

/**
 * Implementation of the Strategy interface that uses the DAG strategy.
 *
 * The DAG strategy chooses the players smallest tile that can extend the map. It breaks ties for more than one place by using Row Column ordering of coordinates.
 *
 * Tiles are ordered based on their lexicographical ordering, where shape is compared first and then color if there is a tie.
 * Shapes and Colors are weighted in the order that they're defined in the shapeList and colorList variables.
 *
 * Row Column Ordering compares a coordinates row first, and then column if there is a tie.
 */
export class DagStrategy implements Strategy<BaseTile> {
  public suggestMove(
    mapState: TilePlacement<BaseTile>[],
    playerTiles: BaseTile[],
    remainingTilesCount: number,
    placementRules: ReadonlyArray<PlacementRule<BaseTile>>
  ) {
    return suggestMoveByStrategy<BaseTile>(
      mapState,
      playerTiles,
      remainingTilesCount,
      placementRules,
      sortCoordinatesByRowColumnOrder
    );
  }
}

/**
 * Implementation of the Strategy interface that uses the DAG strategy.
 *
 * The DAG strategy chooses the players smallest tile that can extend the map. It breaks ties for more than one place by choosing the placement with the most neighbors. Ties for most neighbors are broken with Row Column ordering.
 *
 * Tiles are ordered based on their lexicographical ordering, where shape is compared first and then color if their is a tie.
 * Shapes and Colors are weighted in the order that they're defined in the shapeList and colorList variables.
 *
 * Row Column Ordering compares a coordinates row first, and then column if there is a tie.
 */
export class LdasgStrategy implements Strategy<BaseTile> {
  public suggestMove(
    mapState: TilePlacement<BaseTile>[],
    playerTiles: BaseTile[],
    remainingTilesCount: number,
    placementRules: ReadonlyArray<PlacementRule<BaseTile>>
  ) {
    return suggestMoveByStrategy<BaseTile>(
      mapState,
      playerTiles,
      remainingTilesCount,
      placementRules,
      sortCoordinatesByMostNeighbors
    );
  }
}

/**
 * Denotes a player that in response to being granted a turn, requests the
 * placement of a tile that is not adjacent to a placed tile.
 */
export class NonAdjacentCoordinateStrategy implements Strategy<BaseTile> {
  public suggestMove(
    mapState: TilePlacement<BaseTile>[],
    playerTiles: BaseTile[]
  ) {
    const maxRight = Math.max(
      ...mapState.map((tp) => tp.coordinate.getCoordinate().x)
    );
    return new BaseTurnAction('PLACE', [
      { tile: playerTiles[0], coordinate: new Coordinate(maxRight + 1, 0) }
    ]);
  }
}

/**
 * Denotes a player that in response to being granted a turn, requests the
 * placement of a tile that it does not own.
 */
export class TileNotOwnedStrategy implements Strategy<BaseTile> {
  private backupStrategy: Strategy<BaseTile>;
  constructor(backupStrategy: Strategy<BaseTile>) {
    this.backupStrategy = backupStrategy;
  }

  public suggestMove(
    mapState: TilePlacement<BaseTile>[],
    playerTiles: BaseTile[],
    remainingTilesCount: number,
    placementRules: ReadonlyArray<PlacementRule<BaseTile>>
  ) {
    for (const shape of shapeList) {
      for (const color of colorList) {
        const tile = new BaseTile(shape, color);
        if (!playerTiles.find((t) => t.equals(tile))) {
          return new BaseTurnAction('PLACE', [
            { tile: tile, coordinate: new Coordinate(0, 0) }
          ]);
        }
      }
    }
    return this.backupStrategy.suggestMove(
      mapState,
      playerTiles,
      remainingTilesCount,
      placementRules
    );
  }
}

/**
 * Denotes a player that in response to being granted a turn, requests
 * placements that are not in one line (row, column).
 */
export class NotALineStrategy implements Strategy<BaseTile> {
  private backupStrategy: Strategy<BaseTile>;
  constructor(backupStrategy: Strategy<BaseTile>) {
    this.backupStrategy = backupStrategy;
  }

  public suggestMove(
    mapState: TilePlacement<BaseTile>[],
    playerTiles: BaseTile[],
    remainingTilesCount: number,
    placementRules: ReadonlyArray<PlacementRule<BaseTile>>
  ) {
    if (playerTiles.length >= 2) {
      return new BaseTurnAction('PLACE', [
        { tile: playerTiles[0], coordinate: new Coordinate(1, 1) },
        { tile: playerTiles[1], coordinate: new Coordinate(2, 2) }
      ]);
    }
    return this.backupStrategy.suggestMove(
      mapState,
      playerTiles,
      remainingTilesCount,
      placementRules
    );
  }
}

/**
 * Denotes a player that in response to being granted a turn, requests a tile
 * replacement but it owns more tiles than the referee has left.
 */
export class BadAskForTilesStrategy implements Strategy<BaseTile> {
  private backupStrategy: Strategy<BaseTile>;
  constructor(backupStrategy: Strategy<BaseTile>) {
    this.backupStrategy = backupStrategy;
  }

  public suggestMove(
    mapState: TilePlacement<BaseTile>[],
    playerTiles: BaseTile[],
    remainingTilesCount: number,
    placementRules: ReadonlyArray<PlacementRule<BaseTile>>
  ) {
    if (playerTiles.length > remainingTilesCount) {
      return new BaseTurnAction<BaseTile>('EXCHANGE');
    }
    return this.backupStrategy.suggestMove(
      mapState,
      playerTiles,
      remainingTilesCount,
      placementRules
    );
  }
}

/**
 * Denotes a player that in response to being granted a turn, requests the
 * placement of a tile that does not match its adjacent tiles.
 */
export class NoFitStrategy implements Strategy<BaseTile> {
  private backupStrategy: Strategy<BaseTile>;
  constructor(backupStrategy: Strategy<BaseTile>) {
    this.backupStrategy = backupStrategy;
  }

  public suggestMove(
    mapState: TilePlacement<BaseTile>[],
    playerTiles: BaseTile[],
    remainingTilesCount: number,
    placementRules: ReadonlyArray<PlacementRule<BaseTile>>
  ) {
    const map = tilePlacementsToMap(mapState);
    for (const tile of playerTiles) {
      //const validPlacements = getAllValidPlacements(tile, map, placementRules);
      const validPlacements = [];
      for (const placement of validPlacements) {
        const turnAction = this.getUnmatchingNeighborIfExists(
          tile,
          placement,
          map
        );
        if (turnAction?.ofType('PLACE')) {
          return turnAction;
        }
      }
    }
    return this.backupStrategy.suggestMove(
      mapState,
      playerTiles,
      remainingTilesCount,
      placementRules
    );
  }

  private getUnmatchingNeighborIfExists(
    tile: BaseTile,
    placement: Coordinate,
    map: Dictionary<Coordinate, BaseTile>
  ) {
    for (const neighbor of Object.values(placement.getNeighbors()).map((c) => ({
      tile: map.getValue(c) as BaseTile,
      coordinate: c
    }))) {
      if (!neighbor.tile.sameColor(tile) && !neighbor.tile.sameShape(tile)) {
        return new BaseTurnAction<BaseTile>('PLACE', [
          { tile, coordinate: placement }
        ]);
      }
    }
    return new BaseTurnAction<BaseTile>('PASS');
  }
}
