import Coordinate from '../map/coordinate';
import { BaseTile, QTile } from '../map/tile';
import { QMap } from '../map/map';
import { QPlayerTurnQueue } from './playerTurnQueue';
import { QBagOfTiles } from './bagOfTiles';
import PlayerState from './playerState';
import {
  PlayerEndGameInformation,
  PlayerSetupInformation,
  RelevantPlayerInfo,
  Scoreboard,
  TilePlacement,
  TurnState
} from '../types/gameState.types';
import {
  EndOfGameRule,
  PlacementRule,
  ScoringRule
} from '../types/rules.types';
import { Player } from '../../player/player';
import { TurnAction } from '../../player/turnAction';
import { RenderableGameState } from '../types/gameState.types';

/**
 * Interface representing the game state for a game of Q. Contains the game
 * status, the map, the bag of tiles, and the PlayerTurnQueue, which contains
 * information about the players and the order in which they take turns.
 */
export interface QGameState<T extends QTile> {
  /**
   * Check if placing a tile at a given coordinate is valid for the given rules
   * @param tilePlacements The tile and coordinates to be placed on the map
   * @param placementRules a list of rules that the referee enforces on placements
   * @returns True if the tile can be placed at the coordinate according to both
   * sets of rules, false otherwise
   */
  isValidPlacement: (
    tilePlacements: TilePlacement<T>[],
    placementRules: ReadonlyArray<PlacementRule<T>>
  ) => boolean;

  /**
   * Get the score for the given turnState based on the given scoring rules and
   * the current map.
   * @param turnState the state of the active player's most recent turn
   * @param scoringRules a list of the rules used for scoring a placement
   * @returns The score for the given placement
   */
  getPlacementScore: (
    turnState: TurnState<T>,
    scoringRules: ReadonlyArray<ScoringRule<T>>
  ) => number;

  /**
   * Progress the game to the next turn, recording the turn state of the
   * previous turn.
   * @param playerTiles the tiles that the player who just took a turn had at
   * the beginning of their turn
   * @param turnAction the action taken by the player who just took a turn
   */
  nextTurn(playerTiles: T[], turnAction: TurnAction<T>);

  /**
   * Execute a turn where the player passes.
   * The active player's most recent turn state is set to a pass turn with their current tiles.
   * Moves the active turn to the next player.
   * @returns The player's tiles at the beginning of the turn and the new tiles
   * the player received during the turn, which is always empty for a pass turn
   */
  passTurn: () => { originalTiles: T[]; newTiles: T[] };

  /**
   * Execute a turn where the player exchanges all of their current tiles for
   * new tiles from the bag.
   * The active player's most recent turn state is set to an exchange turn with their old tiles from before the turn.
   * When completed, moves the active turn to the next player.
   * @throws Error if there are not enough tiles in the bag to exchange.
   * @returns The player's tiles at the beginning of the turn and the new tiles
   * the player received during the turn
   */
  exchangeTurn: () => { originalTiles: T[]; newTiles: T[] };

  /**
   * Execute a turn where the player places tiles on the board and receives the
   * same number of tiles back if there are enough.
   * The active players most recent turn state is set to their tile placement with their old tiles from before the turn.
   * When completed, moves the active turn to the next player.
   * @param tilePlacements The new placements of the tiles on the board
   * @throws error if tile placement does not follow the structural map rules as defined in the QMap interface:
   * tiles must be empty and tiles must share a side
   * @returns The player's tiles at the beginning of the turn and the new tiles
   * the player received during the turn
   */
  placeTurn: (tilePlacements: TilePlacement<T>[]) => {
    originalTiles: T[];
    newTiles: T[];
  };

  /**
   * Get the relevant information the active player needs before their turn.
   * Includes immutable information about the active players tiles, the map
   * state, current scoreboard, remaining tiles, order of players, and that game
   * status
   * @returns The RelevantPlayerInfo for a players turn
   */
  getActivePlayerInfo: () => RelevantPlayerInfo<T>;

  /**
   * Get the Player that corresponds to the active PlayerState.
   * @throws Error if there are no players remaining in the queue
   * @returns The active Player
   */
  getActivePlayerController: () => Player<T>;

  /**
   * Gets the information needed to setup each Player controller
   * @returns a list of objects containing each player's name, tiles and respective
   * setup callback
   */
  getAllPlayersSetupInformation: () => PlayerSetupInformation<T>[];

  /**
   * Gets the information needed to communicate the end of game with each Player controller
   * @returns a list of objects containing each player's name and respective win callback
   */
  getAllPlayersEndGameInformation: () => PlayerEndGameInformation[];

  /**
   * Eliminates the player with the given name from the game and add their tiles to end of the
   * bag of tiles
   * @param playerName name of player to be eliminated
   * @param attemptedTurnAction an optional turn action if the player got eliminated for attempting to make an invalid move
   * @throws an error if there is no player in the turn order with the given name
   * @returns void
   */
  eliminatePlayer: (
    playerName: string,
    attemptedTurnAction?: TurnAction<T>
  ) => void;

  /**
   * Returns an array containing the names of all the players that have been eliminated
   * during this game
   * @returns the names of the eliminated players
   */
  getEliminatedPlayerNames: () => string[];

  /**
   * Update a player's score by the amount given
   * @param playerName the name of the player whose score to update
   * @param scoreDelta amount to update score
   * @returns void
   */
  updatePlayerScore: (playerName: string, scoreDelta: number) => void;

  /**
   * Check whether the game is over
   * @param endOfGameRules the rules which each specify end condition for the game
   * @returns true if at least one of the end game conditions are satisfied, false otherwise
   */
  isGameOver: (endOfGameRules: ReadonlyArray<EndOfGameRule<T>>) => boolean;

  /**
   * Gets the data that the referee knows about the game state that is needed to
   * render the game
   * @returns An object containing the map state, player data, and remaining tiles
   */
  getRenderableData: () => RenderableGameState<T>;

  /**
   * Check if a full round of turns has been completed.
   * This is the case if the current player is equal to the first player in the turn order who is still in the game
   * If there are no players left in the game, then the round is over
   * @returns true if the round is over, false otherwise
   */
  isRoundOver: () => boolean;

  /**
   * Returns the current scoreboard for the game
   * @returns The current scoreboard
   */
  getScoreboard: () => Scoreboard;
}

/**
 * An abstract class representing a game state for the game of Q. Comprised of
 * the map of the game, the players queue, and a bag of remaining tiles. Also
 * keeps track of the status of the game.
 */
abstract class AbstractGameState<T extends QTile> implements QGameState<T> {
  private map: QMap<T>;
  private playerTurnQueue: QPlayerTurnQueue<T>;
  private bagOfTiles: QBagOfTiles<T>;
  private eliminatedPlayerNames: string[];

  constructor(
    map: QMap<T>,
    playerTurnQueue: QPlayerTurnQueue<T>,
    bagOfTiles: QBagOfTiles<T>
  ) {
    this.map = map;
    this.playerTurnQueue = playerTurnQueue;
    this.bagOfTiles = bagOfTiles;
    this.eliminatedPlayerNames = [];
  }

  public isValidPlacement(
    tilePlacements: TilePlacement<T>[],
    placementRules: ReadonlyArray<PlacementRule<T>>
  ) {
    const playerOwnsTiles = this.playerOwnsPlacedTiles(tilePlacements);

    const getTile = (coord: Coordinate) => this.map.getTile(coord);
    const allPlacementRulesUpheld = placementRules.every((rule) =>
      rule(tilePlacements, getTile)
    );

    return playerOwnsTiles && allPlacementRulesUpheld;
  }

  /**
   * Check that the player owns all of the tiles they are trying to place.
   * @param tilePlacements List of placements the player is attempting to make
   * @returns true if they own all of the tiles in the placement, false otherwise
   */
  private playerOwnsPlacedTiles(tilePlacements: TilePlacement<T>[]) {
    const activePlayer = this.playerTurnQueue.getActivePlayer();
    const activePlayerTiles = activePlayer.getAllTiles();

    return tilePlacements.every(({ tile }) => {
      const tileIndex = activePlayerTiles.findIndex((playerTile) =>
        playerTile.equals(tile)
      );

      if (tileIndex === -1) {
        return false;
      }

      activePlayerTiles.splice(tileIndex, 1);
      return true;
    });
  }

  public getPlacementScore(
    turnState: TurnState<T>,
    scoringRules: ReadonlyArray<ScoringRule<T>>
  ) {
    const getTile = (coord: Coordinate) => this.map.getTile(coord);

    return scoringRules.reduce((score, rule) => {
      return score + rule(turnState, getTile);
    }, 0);
  }

  public nextTurn(playerTiles: T[], turnAction: TurnAction<T>) {
    this.playerTurnQueue.nextTurn({ turnAction, playerTiles });
  }

  public passTurn() {
    const player = this.playerTurnQueue.getActivePlayer();
    const originalTiles = player.getAllTiles();
    return { originalTiles, newTiles: [] };
  }

  public exchangeTurn() {
    const player = this.playerTurnQueue.getActivePlayer();

    const originalTiles = player.getAllTiles();

    const tilesToExchange = this.getTilesToExchange(player);
    const exchangedTiles = tilesToExchange.map((tile) =>
      this.bagOfTiles.exchangeTile(tile)
    );
    player.setTiles(exchangedTiles);

    return { originalTiles, newTiles: exchangedTiles };
  }

  /**
   * Get all of the active players tiles to be exchanged.
   * @param activePlayer The player whose turn it is
   * @throws if the player has more tiles than are in the bag
   * @returns the active players tiles
   */
  private getTilesToExchange(activePlayer: PlayerState<T>) {
    const playerTiles = activePlayer.getAllTiles();
    if (playerTiles.length > this.bagOfTiles.getRemainingCount()) {
      throw new Error('player has more tiles than remaining in the bag');
    }
    return playerTiles;
  }

  public placeTurn(tilePlacements: TilePlacement<T>[]) {
    const player = this.playerTurnQueue.getActivePlayer();

    const originalTiles = player.getAllTiles();

    tilePlacements.forEach(({ tile, coordinate }) => {
      this.map.placeTile(tile, coordinate);
    });

    const replacementTiles = this.getReplacementTiles(tilePlacements);
    player.setTiles(replacementTiles);

    return { originalTiles, newTiles: replacementTiles };
  }

  /**
   * Draws tile from the bag to replace the ones placed in a turn.
   * Replaces the minimum between the number of tiles drawn and the number left in the bag.
   * @param tilePlacements Placcements the player is attempting to place
   * @returns The tiles to replace with
   */
  private getReplacementTiles(tilePlacements: TilePlacement<T>[]) {
    const replacementTiles: T[] = [];
    tilePlacements.forEach(() => {
      try {
        const drawnTile = this.bagOfTiles.drawTile();
        replacementTiles.push(drawnTile);
      } catch (error) {
        // Do nothing, only replace tiles up to the amount left in the bag
      }
    });

    const unplayedTiles = this.getPlayersUnplacedTiles(tilePlacements);
    return [...replacementTiles, ...unplayedTiles];
  }

  private getPlayersUnplacedTiles(tilePlacements: TilePlacement<T>[]) {
    const tilePlacementsCopy = [...tilePlacements];
    const activePlayer = this.playerTurnQueue.getActivePlayer();
    const activePlayerTiles = activePlayer.getAllTiles();

    return activePlayerTiles.filter((playerTile) => {
      const tileIndex = tilePlacementsCopy.findIndex(({ tile }) =>
        tile.equals(playerTile)
      );

      if (tileIndex === -1) {
        return true;
      }

      tilePlacementsCopy.splice(tileIndex, 1);
      return false;
    });
  }

  public getActivePlayerInfo() {
    const player = this.playerTurnQueue.getActivePlayer();
    const playerTiles = player.getAllTiles();
    const { tilePlacements, scoreboard, remainingTilesCount, playersQueue } =
      this.getPublicData();

    return {
      playerTiles,
      mapState: tilePlacements,
      scoreboard,
      remainingTilesCount,
      playersQueue
    };
  }

  public getActivePlayerController() {
    return this.playerTurnQueue.getActivePlayer().getPlayerController();
  }

  public getAllPlayersSetupInformation() {
    return this.playerTurnQueue.getAllPlayersSetupInformation();
  }

  public getAllPlayersEndGameInformation() {
    return this.playerTurnQueue.getAllPlayersEndGameInformation();
  }

  /**
   * Get a list of every tile placement on the map
   * @returns a list of placements
   */
  private getTilePlacementsList(): TilePlacement<T>[] {
    return this.map.getAllPlacements();
  }

  public eliminatePlayer(
    playerName: string,
    attemptedTurnAction?: TurnAction<T>
  ) {
    const playersTiles = this.playerTurnQueue.eliminatePlayer(
      playerName,
      attemptedTurnAction
    );
    playersTiles.forEach((tile) => this.bagOfTiles.returnTile(tile));
    this.eliminatedPlayerNames.push(playerName);
  }

  public getEliminatedPlayerNames() {
    return this.eliminatedPlayerNames;
  }

  public updatePlayerScore(playerName: string, scoreDelta: number) {
    this.playerTurnQueue.updatePlayerScore(playerName, scoreDelta);
  }

  public isGameOver(endOfGameRules: ReadonlyArray<EndOfGameRule<T>>) {
    return endOfGameRules.some((rule) => rule(this.playerTurnQueue));
  }

  // TODO: Make this return json rather than objects
  public getRenderableData() {
    const tilePlacements = this.getTilePlacementsList();
    const dimensions = this.map.getDimensions();
    const players = this.playerTurnQueue.getRenderablePlayerStates();
    const remainingTiles = this.bagOfTiles.getRemainingTiles();

    return {
      mapState: {
        tilePlacements,
        dimensions
      },
      players,
      remainingTiles
    };
  }

  /**
   * Gets the data that is publicly available to all players.
   * This includes the map state, scoreboard, turn order queue, and number of remaining tiles.
   * @returns Publicly available data
   */
  private getPublicData() {
    const tilePlacements = this.getTilePlacementsList();
    const scoreboard = this.playerTurnQueue.getScoreboard();
    const remainingTilesCount = this.bagOfTiles.getRemainingCount();
    const playersQueue = this.playerTurnQueue.getAllPlayersNames();

    return {
      tilePlacements,
      scoreboard,
      remainingTilesCount,
      playersQueue
    };
  }

  public isRoundOver() {
    return this.playerTurnQueue.isRoundOver();
  }

  public getScoreboard() {
    return this.playerTurnQueue.getScoreboard();
  }
}

/**
 * A class representing the game state for a game of Q using BaseTiles.
 */
export class BaseGameState extends AbstractGameState<BaseTile> {
  constructor(
    map: QMap<BaseTile>,
    playerTurnQueue: QPlayerTurnQueue<BaseTile>,
    bagOfTiles: QBagOfTiles<BaseTile>
  ) {
    super(map, playerTurnQueue, bagOfTiles);
  }
}
