import { Set } from 'typescript-collections';
import Coordinate from '../map/coordinate';
import { CoordinateGetter, ScoringRule } from '../types/rules.types';
import { TilePlacement } from '../types/gameState.types';
import { QTile, ShapeColorTile } from '../map/tile';
import { colorList, shapeList, Shape, Color } from '../types/map.types';

/**
 * A rule giving one point per tile placed in the turn.
 * @param tilePlacements The tiles and coordinates placed in this turn.
 * @returns The number of additional points given from this rule
 */
export const pointPerTilePlaced: ScoringRule<QTile> = (turnState) => {
  return turnState.turnAction.getPlacements().length;
};

/**
 *This method is a getter for a Map, but treats a tile placement as if it has already been placed on the map.
 * @param tilePlacements The tiles and coordinates placed in this turn
 * @param getTile a function that takes a coordinate and returns a tile at that
 * location or undefined if it does not exist
 * @returns a getter method that takes a coordinate and gets the tile from either the map or the tile placement list, or returns undefined if the coordinate is not present in either.
 */
export const getTileWithPlacements = <T extends QTile>(
  tilePlacements: TilePlacement<T>[],
  getTile: CoordinateGetter<T>
) => {
  return (coord: Coordinate) => {
    const tileFromPlacements = tilePlacements.find((tilePlacement) =>
      coord.equals(tilePlacement.coordinate)
    );
    return tileFromPlacements?.tile ?? getTile(coord);
  };
};

/**
 * This function takes returns a scoring rule that gives bonus points if the player played all of their tiles in the turn
 * The number of bonus points is taken in as an argument
 * @param bonusPointsAmount number of bonus points awarded if the player played all of their tiles
 * @returns the bonus point amount if the player placed all of their tiles, 0 otherwise
 */
export const pointsForPlayingAllTiles = (
  bonusPointsAmount: number
): ScoringRule<QTile> => {
  return (turnState) => {
    const numPlacements = turnState.turnAction.getPlacements().length;
    const numTilesInHand = turnState.playerTiles.length;

    const playerPlacedAllMoreThan0 =
      numPlacements === numTilesInHand && numPlacements > 0;

    return playerPlacedAllMoreThan0 ? bonusPointsAmount : 0;
  };
};

/**
 * This function returns a scoring rule that awards bonus points for each Q completed in the turn
 * The bonus points are taken in as an argument
 * A Q is a contiguous sequence of tiles that contains all the shapes or all the colors
 * @returns The number of Q's completed in the turn times the amount of the bonus
 */
export const pointsPerQ = (
  bonusPointsAmount: number
): ScoringRule<ShapeColorTile> => {
  return (turnState, getTile) => {
    const tilePlacements = turnState.turnAction.getPlacements();

    const colorQsCount = qForSpecificAttribute(
      tilePlacements,
      (tile: ShapeColorTile) => tile.getColor(),
      colorList.length,
      getTileWithPlacements(tilePlacements, getTile)
    );

    const shapeQsCount = qForSpecificAttribute(
      tilePlacements,
      (tile: ShapeColorTile) => tile.getShape(),
      shapeList.length,
      getTileWithPlacements(tilePlacements, getTile)
    );

    return (colorQsCount + shapeQsCount) * bonusPointsAmount;
  };
};

/**
 * This function returns a function that gets some list of opposing neighbors.
 * Opposing neighbors means either the left and right or top and bottom neighbors of a tile.
 * @param dir Either 'left-right' indicating it should get the left and right neighbors, or top-bottom indicating it should get the top and bottom neighbors
 * @returns a function that returns a list of coordinates where the first element is either the left or top neighbor and the second element is either the right or bottom neighbor.
 */
const getOpposingNeighbors = (
  dir: 'left-right' | 'top-bottom'
): ((coord: Coordinate) => [Coordinate, Coordinate]) => {
  const dir1 = dir === 'left-right' ? 'left' : 'top';
  const dir2 = dir === 'left-right' ? 'right' : 'bottom';
  return (coord: Coordinate) => {
    const neighbors = coord.getNeighbors();
    return [neighbors[dir1], neighbors[dir2]];
  };
};

/**
 * Finds the total number of Q's completed for either all the shapes or all the colors, depending on which attribute is passed in.
 * In this context, the word 'attribute' refers to either Shape or Color.
 * Qs found that contain a previously checked tile placement do not count.
 * @param tilePlacements The tiles and coordinates placed in this turn
 * @param getTileAttribute Get the attribute for a given tile, either the Shape or Color
 * @param numberOfAttributes Number of attributes required for completing a Q
 * @param getTile a function that takes a coordinate and returns a tile at that
 * location or undefined if it does not exist
 * @returns The number of Q's found for the given attribute,
 */
const qForSpecificAttribute = <
  T extends ShapeColorTile,
  A extends Shape | Color
>(
  tilePlacements: TilePlacement<T>[],
  getTileAttribute: (tile: T) => A,
  numberOfAttributes: number,
  getTile: CoordinateGetter<T>
) => {
  const seenTiles = new Set<Coordinate>();

  const qScore = tilePlacements.reduce((score, tilePlacement) => {
    const qInRow = qForSpecificDirection(
      tilePlacement.coordinate,
      getTile,
      seenTiles,
      getTileAttribute,
      numberOfAttributes,
      getOpposingNeighbors('left-right')
    );

    const qInColumn = qForSpecificDirection(
      tilePlacement.coordinate,
      getTile,
      seenTiles,
      getTileAttribute,
      numberOfAttributes,
      getOpposingNeighbors('top-bottom')
    );

    seenTiles.add(tilePlacement.coordinate);

    return score + qInRow + qInColumn;
  }, 0);

  return qScore;
};

/**
 * Finds the number of Q's created in either the horizontal or vertical directions by single tile placement
 * @param initialCoordinate coordinate to start checking at
 * @param getTile getTile a function that takes a coordinate and returns a tile at that location or undefined if it does not exist
 * @param seenTiles tiles already checked for this turn
 * @param getTileAttribute Get the attribute for a given tile, either the Shape or Color
 * @param numberOfAttributes Number of attributes required for completing a Q
 * @param getOpposingNeighbors Get the opposing neighbors for a tile, either left and right, or top and bottom
 * @returns 1 if a new Q is found, and 0 otherwise
 */
const qForSpecificDirection = <
  T extends ShapeColorTile,
  A extends Shape | Color
>(
  initialCoordinate: Coordinate,
  getTile: CoordinateGetter<T>,
  seenTiles: Set<Coordinate>,
  getTileAttribute: (tile: T) => A,
  numberOfAttributes: number,
  getOpposingNeighbors: (coord: Coordinate) => [Coordinate, Coordinate]
) => {
  const direction1 = qFromSequenceInOneDirection(
    initialCoordinate,
    (coord: Coordinate) => getOpposingNeighbors(coord)[0],
    getTile,
    seenTiles,
    getTileAttribute
  );

  const direction2 = qFromSequenceInOneDirection(
    initialCoordinate,
    (coord: Coordinate) => getOpposingNeighbors(coord)[1],
    getTile,
    seenTiles,
    getTileAttribute
  );

  return compareDirectionSetsOfQs(direction1, direction2, numberOfAttributes);
};

/**
 * Compare two sets of the attributes in the same row or column to the total number of attributes in the Shape or Color type
 * @param direction1PartialQ Set of attributes seen in one direction
 * @param direction2PartialQ Set of attributes seen in the other direction
 * @param numberOfAttributes Number of attributes needed to complete the Q
 * @returns 1 if the two directions complete a Q, 0 otherwise
 */
const compareDirectionSetsOfQs = <A extends Shape | Color>(
  direction1PartialQ: Set<A>,
  direction2PartialQ: Set<A>,
  numberOfAttributes: number
) => {
  // When comparing we add 1 to number of attributes, since each direction
  // counts the initial tile placement once
  const sizeOfEachQEqualsNumAttributes =
    direction1PartialQ.size() + direction2PartialQ.size() ===
    numberOfAttributes + 1;

  if (sizeOfEachQEqualsNumAttributes) {
    direction1PartialQ.union(direction2PartialQ);

    const unionOfSetsEqualsNumAttributes =
      direction1PartialQ.size() === numberOfAttributes;

    if (unionOfSetsEqualsNumAttributes) {
      return 1;
    }
  }

  return 0;
};

/**
 * Starting at an initial coordinate, find the set of attributes in the rest of the sequence of tiles in a single direction.
 * A single direction means either left, right, up, or down.
 * @param initialCoord Coordinate to start checking at
 * @param nextCoordinate Function to get the next coordinate in the direction
 * @param @param getTile getTile a function that takes a coordinate and returns a tile at that location or undefined if it does not exist
 * @param seenTiles tiles already checked for this turn
 * @param getTileAttribute Get the attribute for a given tile, either the Shape or Color
 * @returns The set of attributes in a single direction. Empty set if a tile in the direction has already been seen or there is a dublicate attribute.
 */
const qFromSequenceInOneDirection = <
  T extends ShapeColorTile,
  A extends Shape | Color
>(
  initialCoord: Coordinate,
  nextCoordinate: (coord: Coordinate) => Coordinate,
  getTile: CoordinateGetter<T>,
  seenTiles: Set<Coordinate>,
  getTileAttribute: (tile: T) => A
) => {
  const seenAttributes = new Set<A>();
  let coordinate = initialCoord;
  let tile = getTile(initialCoord);

  while (tile) {
    const attribute = getTileAttribute(tile);
    const alreadyPlacedTile = seenTiles.contains(coordinate);
    const hasDuplicateAttribute = seenAttributes.contains(attribute);
    if (alreadyPlacedTile || hasDuplicateAttribute) {
      return new Set<A>();
    }

    seenAttributes.add(attribute);

    coordinate = nextCoordinate(coordinate);
    tile = getTile(coordinate);
  }
  return seenAttributes;
};

/**
 * A rule giving one point per tile in a contiguous sequence that contains a
 * tile placed in this turn
 * @param tilePlacements The tiles and coordinates placed in this turn
 * @param getTile a function that takes a coordinate and returns a tile at that
 * location or undefined if it does not exist
 * @returns The number of additional points given from this rule
 */
export const pointPerTileInSequence: ScoringRule<QTile> = (
  turnState,
  getTile
) => {
  const seenTiles = new Set<Coordinate>();
  const tilePlacements = turnState.turnAction.getPlacements();
  return tilePlacements.reduce((score, tilePlacement) => {
    const rowScore = scoreSequence(
      tilePlacement.coordinate,
      getTileWithPlacements(tilePlacements, getTile),
      seenTiles,
      getOpposingNeighbors('left-right')
    );

    const columnScore = scoreSequence(
      tilePlacement.coordinate,
      getTileWithPlacements(tilePlacements, getTile),
      seenTiles,
      getOpposingNeighbors('top-bottom')
    );

    const accScore = score + rowScore + columnScore;

    seenTiles.add(tilePlacement.coordinate);
    return accScore;
  }, 0);
};

/**
 * Scores a sequence of contiguous tiles by adding the number of tiles extending in each direction
 * @param coordinate Coordinate to start counting at
 * @param getTile a function that takes a coordinate and returns a tile at that
 * location or undefined if it does not exist
 * @param seenTiles tiles already checked for this turn
 * @param getOpposingNeighbors Get the opposing neighbors for a tile, either left and right, or top and bottom
 * @returns The score for the sequence of tiles in the given direction
 */
const scoreSequence = <T extends QTile>(
  coordinate: Coordinate,
  getTile: CoordinateGetter<T>,
  seenTiles: Set<Coordinate>,
  getOpposingNeighbors: (coord: Coordinate) => [Coordinate, Coordinate]
): number => {
  const tileExists = (coord: Coordinate): boolean =>
    getTile(coord) !== undefined;
  const [neighbor1, neighbor2] = getOpposingNeighbors(coordinate);

  if (!tileExists(neighbor1) && !tileExists(neighbor2)) {
    return 0;
  }

  const dir1Score = scoreFromSequence(
    neighbor1,
    (coord: Coordinate) => getOpposingNeighbors(coord)[0],
    tileExists,
    seenTiles
  );

  const dir2Score = scoreFromSequence(
    neighbor2,
    (coord: Coordinate) => getOpposingNeighbors(coord)[1],
    tileExists,
    seenTiles
  );

  if (dir1Score === -1 || dir2Score === -1) {
    return 0;
  }

  // Subtract one because each scoreFromSequence will count the starting tile
  return dir1Score + dir2Score - 1;
};

/**
 * Gets the score from a certain direction in a sequence of tiles, where each tile is worth one point.
 * A direction means either left, right, up, or down.
 * @param initialCoord coordinate to start counting at
 * @param nextCoordinate The next coordinate in the given direction
 * @param tileExists A function to check if the tile exists in the map
 * @param seenTiles seenTiles tiles already checked for this turn
 * @returns the score for the sequence in a given direction, or -1 if the tile has already been seen in this sequence, indicating that the score for the sequence for this tile placement should be 0
 */
const scoreFromSequence = (
  initialCoord: Coordinate,
  nextCoordinate: (coord: Coordinate) => Coordinate,
  tileExists: (coord: Coordinate) => boolean,
  seenTiles: Set<Coordinate>
) => {
  let coordinate = initialCoord;
  let score = 1;
  while (tileExists(coordinate)) {
    if (seenTiles.contains(coordinate)) {
      return -1;
    }
    score += 1;
    coordinate = nextCoordinate(coordinate);
  }
  return score;
};
