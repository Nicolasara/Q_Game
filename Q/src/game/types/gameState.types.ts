import { TurnAction } from '../../player/turnAction';
import { Result } from '../../referee/referee.types';
import Coordinate from '../map/coordinate';
import { QTile } from '../map/tile';
import { Dimensions } from './map.types';

/**
 * Type representing the score of all players.
 * A list of objects containing the player's id and their score.
 */
export type Scoreboard = { name: string; score: number }[];

/**
 * Type representing a tile placement on the board.
 * Made up of a QTile and a Coordinate.
 */
export type TilePlacement<T extends QTile> = {
  tile: T;
  coordinate: Coordinate;
};

/**
 * Type defining the possible status of a game.
 * The options are either 'In Progress' meaning the game is ongoing,
 * or 'Finished' meaning the game is over, and there is a winner.
 * When a game is created the status is assigned as 'In Progress'
 * even if no moves have been made.
 */
export type GameStatus = 'In Progress' | 'Finished';

/**
 * Type representing the info a player will need when it's their turn.
 * Contains info regarding the player's tiles, the current map, the scoreboard, the remaining tiles in the bag, the order of the players, and the status of the game.
 */
export type RelevantPlayerInfo<T extends QTile> = {
  // The tiles that the current player has and can play or exchange.
  playerTiles: T[];

  // A list of every tile placement currently on the board. A tile placement consists of a coordinate and a tile.
  mapState: TilePlacement<T>[];

  // The scoreboard of the game, a list of player ids and scores
  scoreboard: Scoreboard;

  // The number of remaining tiles in the bag of tiles
  remainingTilesCount: number;

  // The order the players will take turns in. Represented by a list of their names, where the first in the list is the active player and the rest are listed in order.
  playersQueue: string[];
};

/**
 * Type representing the map state to be rendered in graphical context. Contains
 * the a list of tile placements (tiles and coordinates) and the dimensions of
 * the map, which helps the graphical renderer create the map more efficiently.
 */
export type RenderableMapState<T extends QTile> = {
  tilePlacements: TilePlacement<T>[];
  dimensions: Dimensions;
};

/**
 * Type representing the all the referee's knowledge of a game state needed in
 * order to create a graphical rendering of the game state. Includes the map
 * state, the player data (in their turn order), and the remaining referee tiles
 * (in the order that they will be drawn).
 */
export type RenderableGameState<T extends QTile> = {
  mapState: RenderableMapState<T>;
  players: RenderablePlayer<T>[];
  remainingTiles: T[];
};

/**
 * Type representing a referee's knowledge of a player's state needed in order to
 * create a graphical rendering of the player's state. Includes the player's
 * score and their tiles.
 */
export type RenderablePlayer<T extends QTile> = {
  name: string;
  score: number;
  tiles: T[];
};

/**
 * Type containing a player's turn action, and the tiles that the had when
 * they made that turn.
 * Could also be undefined, meaning that the player has not made a turn yet.
 */
export type TurnState<T extends QTile> = {
  turnAction: TurnAction<T>;
  playerTiles: T[];
};

/**
 * Type containing the information needed to set up a player.
 * Contains the player's name, their initial tiles, and a setUp method
 * to communicate to the player the initial map and starting tiles.
 */
export type PlayerSetupInformation<T extends QTile> = {
  name: string;
  tiles: T[];
  setUp: (m: TilePlacement<T>[], st: T[]) => Promise<Result<void>>;
};

/**
 * Type containing the information need to communicate with a player
 * at the end of a game. Contains the player's name and a win method
 * for telling the player whether they won or lost.
 */
export type PlayerEndGameInformation = {
  name: string;
  win: (w: boolean) => Promise<Result<void>>;
};
