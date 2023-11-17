import {
  coordinateMustBeEmpty,
  coordinateMustShareASide
} from '../rules/placementRules';
import { type QTile, type BaseTile } from './tile';
import { Dictionary, Set } from 'typescript-collections';
import Coordinate from './coordinate';
import { Dimensions } from '../types/map.types';
import { TilePlacement } from '../types/gameState.types';
import { PlacementRule } from '../types/rules.types';

/**
 * Interface representing the map of a Q Game.
 * Contains functionality to add new tiles and get the valid placements of tiles.
 * The map contains the invariant that tiles can only be placed next to one another.
 * This means that there are two rules baked into the constructor of the abstract map,
 * that tiles must share a side and that tiles cannot be placed on top of an existing tile.
 * This is to uphold the integrity of the map and is enforced on every validity check and tile placement.
 *
 * This Map data representation keeps track of the dimensions of the map, meaning the x coordinates of the furthest left and right tile, and the y coordinate of the furthest top and bottom coordinate. These dimensions are not currently being used, but could have applications in the future.
 */
export interface QMap<T extends QTile> {
  /**
   * Get a list of all the coordinates where the given tile could be placed according to both the provided rules and the default structural rules.
   * @param tile The tile to check valid placements of.
   * @param placementRules A list of the rules to determine validity in a given position. Rules are functions that evaluate to a boolean.
   * @returns A list of Coordinates representing the valid positions the given tile can be placed.
   */
  getAllValidPlacements: (
    tile: T,
    placementRules: PlacementRule<T>[]
  ) => Coordinate[];

  /**
   * Add a tile to the board at the given coordinate if it abides by the structural rules of the map.
   * @param tilePlacement The tile to be placed on the board and the Coordinate of where to place it
   * @throws Error if placement doesn't follow the structural rules
   * @returns void
   */
  placeTile: (tile: T, coordinate: Coordinate) => void;

  /**
   * Gets the tile stored at the given coordinate or returns undefined if no tile exists
   * @param coordinate A Coordinate representing the position to get
   * @returns the tile stored at the coordinate, or undefined if it does not exist
   */
  getTile: (coordinate: Coordinate) => T | undefined;

  /**
   * Gets the dimensions of the board.
   * @returns Dimensions object consisting of the furthest point in each direction
   */
  getDimensions: () => Dimensions;

  /**
   * Gets a list of all tile placements in the map
   * @returns a list of TilePlacements
   */
  getAllPlacements: () => TilePlacement<T>[];
}

/**
 * Abstract class representing a Map in the QGame.
 * Contains the board and keeps track of the furthest position of tiles in each direction.
 * Maintains the structural rules that all tiles must share a side and no tile can be placed where another tile already exists
 */
abstract class AbstractQMap<T extends QTile> implements QMap<T> {
  private readonly board: Dictionary<Coordinate, T>;

  // An object containing the position of the furthest tile in each direction.
  private readonly dimensions: Dimensions;

  // This array contains the rules that are always enforced by the map to maintain the its structural integrity
  private readonly structuralMapRules: ReadonlyArray<PlacementRule<T>> = [
    coordinateMustBeEmpty,
    coordinateMustShareASide
  ];

  constructor(startingTilePlacements: TilePlacement<T>[]) {
    this.board = new Dictionary<Coordinate, T>();
    this.dimensions = { topmost: 0, bottommost: 0, leftmost: 0, rightmost: 0 };
    startingTilePlacements.forEach(({ tile, coordinate }) => {
      this.addToBoard(tile, coordinate);
    });
  }

  public getAllValidPlacements(
    tile: T,
    placementRules: PlacementRule<T>[]
  ): Coordinate[] {
    const seenTiles = new Set<Coordinate>();

    const potentialPlacements = this.board
      .keys()
      .flatMap((coord) => Object.values(coord.getNeighbors()));

    const validPlacements = potentialPlacements.filter((coordinate) => {
      const hasNotBeenSeen = !seenTiles.contains(coordinate);
      const isValid = this.isValidPlacement(
        [{ tile, coordinate }],
        placementRules
      );
      seenTiles.add(coordinate);

      return hasNotBeenSeen && isValid;
    });

    return validPlacements;
  }

  public placeTile(tile: T, coordinate: Coordinate): void {
    if (!this.isValidPlacement([{ tile, coordinate }], [])) {
      throw new Error('Invalid tile placement');
    }
    this.addToBoard(tile, coordinate);
  }

  /**
   * Method to add a tile and coordinate to the dictionary and update the dimensions
   * @param tile the tile to add to the board
   * @param coordinate the coordinate to place the tile at
   */
  private addToBoard(tile: T, coordinate: Coordinate): void {
    this.board.setValue(coordinate, tile);
    this.expandDimensions(coordinate);
  }

  public getTile(coordinate: Coordinate) {
    return this.board.getValue(coordinate);
  }

  public getDimensions() {
    return this.dimensions;
  }

  /**
   * Mutate the dimensions object if the x or y coordinate is outside the current bounds of the board.
   * @param coordinate the new coordinate added to the board
   */
  private expandDimensions(coordinate: Coordinate): void {
    const { x, y } = coordinate.getCoordinate();
    this.dimensions.topmost = Math.max(y, this.dimensions.topmost);
    this.dimensions.bottommost = Math.min(y, this.dimensions.bottommost);
    this.dimensions.leftmost = Math.min(x, this.dimensions.leftmost);
    this.dimensions.rightmost = Math.max(x, this.dimensions.rightmost);
  }

  private isValidPlacement(
    tilePlacements: TilePlacement<T>[],
    placementRules: PlacementRule<T>[]
  ): boolean {
    const structuralMapRulesUpheld = this.structuralMapRules.every((rule) =>
      rule(tilePlacements, (coord: Coordinate) => this.getTile(coord))
    );
    const placementRulesUpheld = placementRules.every((rule) =>
      rule(tilePlacements, (coord: Coordinate) => this.getTile(coord))
    );
    return structuralMapRulesUpheld && placementRulesUpheld;
  }

  public getAllPlacements() {
    const allEntries = this.board.keys().map((coordinate) => {
      return {
        coordinate,
        tile: this.board.getValue(coordinate)
      };
    });
    const filteredEntries: TilePlacement<T>[] = [];
    allEntries.forEach((placement) => {
      const coordinate = placement.coordinate;
      const tile = placement.tile;
      if (tile !== undefined) {
        filteredEntries.push({ coordinate, tile });
      }
    });
    return filteredEntries;
  }
}

/**
 * Class representing a map for the Q Game.
 */
class BaseMap extends AbstractQMap<BaseTile> {
  constructor(startingTiles: TilePlacement<BaseTile>[]) {
    super(startingTiles);
  }
}

export default BaseMap;
