import {
  NUMBER_OF_EACH_TILE,
  NUMBER_OF_PLAYER_TILES,
  REFEREE_PLAYER_TIMEOUT_MS
} from '../constants';
import { RandomBagOfTiles, QBagOfTiles } from '../game/gameState/bagOfTiles';
import { BaseGameState, QGameState } from '../game/gameState/gameState';
import PlayerState from '../game/gameState/playerState';
import PlayerTurnQueue from '../game/gameState/playerTurnQueue';
import Coordinate from '../game/map/coordinate';
import BaseMap from '../game/map/map';
import { BaseTile } from '../game/map/tile';
import { QRuleBook } from '../game/rules/ruleBook';
import {
  Scoreboard,
  PlayerEndGameInformation,
  RenderableGameState,
  TurnState
} from '../game/types/gameState.types';
import { colorList, shapeList } from '../game/types/map.types';
import {
  EndOfGameRule,
  PlacementRule,
  ScoringRule
} from '../game/types/rules.types';
import { TurnAction } from '../player/turnAction';
import { GameResult, Result } from './referee.types';
import { Observer } from '../observer/observer';
import { SafePlayer } from './safePlayer';

/**
 * Set up a game of Q by creating the initial game state and communicating to each of the players the initial state.
 * Game state is created with a bag of tiles, an initial map, and the player turn queue.
 * @param players list of the players in the game, as passed to the referee. Invariant that this is a copy of the original list, and the ordering of the players will never change.
 * @returns The initial game state
 */
export const setUpGame = (players: SafePlayer<BaseTile>[]) => {
  const bagOfTiles = createBagOfTiles(NUMBER_OF_EACH_TILE);

  const map = createMap(bagOfTiles);

  const turnQueue = createPlayerTurnQueue(bagOfTiles, players);

  const gameState = new BaseGameState(map, turnQueue, bagOfTiles);

  return gameState;
};

/**
 * Create a bag of tiles with a certain number of each type of tile.
 * @param numOfEach number of each type of tile to make
 * @returns a bag of tiles, with the ordering of the tiles randomized
 */
const createBagOfTiles = (numOfEach: number) => {
  const tiles = createNumOfEachTile(numOfEach);
  return new RandomBagOfTiles(tiles);
};

/**
 * Create a list of tiles with the given number of each type of tile, where the types are determined by every combination of colors and shapes.
 * @param numOfEach Number of each type of tile to make
 * @returns a list of tiles with the given number of each kind of tile
 */
const createNumOfEachTile = (numOfEach: number) => {
  const tiles: BaseTile[] = [];
  for (let i = 0; i < numOfEach; i++) {
    colorList.forEach((color) => {
      shapeList.forEach((shape) => {
        tiles.push(new BaseTile(shape, color));
      });
    });
  }
  return tiles;
};

/**
 * Create the initial map for the Q game.
 * Choose the first tile from the bag as the starting tile and use (0, 0) as the starting coordinate
 * @param bagOfTiles The bag of tiles for the game
 * @returns The inital map
 */
const createMap = (bagOfTiles: QBagOfTiles<BaseTile>) => {
  const startingTile = bagOfTiles.drawTile();
  return new BaseMap([
    { tile: startingTile, coordinate: new Coordinate(0, 0) }
  ]);
};

/**
 * Initialize the turn queue for the players in the game.
 * This involves first creating PlayerStates for all of the players, and then communicating to the players with the initial map and their tiles.
 * @param bagOfTiles The bag of tiles for the game
 * @param players A list of the Players
 * @param initialTilePlacements The initial tile placements on the map
 * @returns The initial Player Turn Queue
 */
const createPlayerTurnQueue = (
  bagOfTiles: QBagOfTiles<BaseTile>,
  players: SafePlayer<BaseTile>[]
): PlayerTurnQueue<BaseTile> => {
  const playerStates = createPlayerStates(bagOfTiles, players);

  return new PlayerTurnQueue<BaseTile>(playerStates);
};

/**
 * Create a PlayerState for each Player.
 * If the PlayerState throws an error on instantiation, indicating the Player's name()
 * method threw an error, then we do not include them in the game
 * @param bagOfTiles The bag of tiles for the game
 * @param players A list of the Players in the game
 * @returns a list of the PlayerStates generated for the players
 */
const createPlayerStates = (
  bagOfTiles: QBagOfTiles<BaseTile>,
  players: SafePlayer<BaseTile>[]
) => {
  return players
    .map((player) => {
      const playerTiles: BaseTile[] = [];
      for (let i = 0; i < NUMBER_OF_PLAYER_TILES; i++) {
        playerTiles.push(bagOfTiles.drawTile());
      }

      const playerName = player.name();
      if (!playerName.success || playerName.value === undefined) {
        return undefined;
      }

      return new PlayerState<BaseTile>(player, playerName.value);
    })
    .filter(
      (playerState): playerState is PlayerState<BaseTile> =>
        playerState !== undefined
    );
};

/**
 * Communicate with each player their tiles to start the game and the initial tile placements on the map.
 * If a player throws an error on set up, they should be eliminated from the game
 * @param gameState the current game state
 * @return void
 */
export const setUpPlayers = (gameState: QGameState<BaseTile>) => {
  const playerSetupInformation = gameState.getAllPlayersSetupInformation();
  const initialTilePlacements = gameState.getActivePlayerInfo().mapState;
  const eliminatePlayer = (name: string) => gameState.eliminatePlayer(name);

  playerSetupInformation.forEach(({ name, tiles, setUp }) => {
    const setUpResult = setUp(initialTilePlacements, tiles);
    if (setUpResult.success === false) {
      eliminatePlayer(name);
    }
  });
};

/**
 * A pipeline method to run the game from start to end.
 *
 * For each turn:
 * - Get the active player's state
 * - Request a turn action from the player
 * - Validate their turn
 * - If invalid, eliminate the player
 * - Otherwise, score the turn action
 * - Execute the turn action
 * - Give the player their new tiles
 * - Update the players score in the gamestate
 * - Check if the game is over
 * Once the game is over, exit the loop and return the final scoreboard
 * @param gameState The initial state of the game
 * @param players The initial list of players
 * @param rulebook The rulebook for the game
 * @returns The final scoreboard of the game
 */
export const runGame = (
  gameState: QGameState<BaseTile>,
  rulebook: QRuleBook<BaseTile>,
  observers: Observer<BaseTile>[]
): QGameState<BaseTile> => {
  const isGameOver = () => gameState.isGameOver(rulebook.getEndOfGameRules());

  updateObservers(gameState.getRenderableData(), observers);
  while (!isGameOver()) {
    manageTurn(gameState, rulebook);
    updateObservers(gameState.getRenderableData(), observers);
  }

  return gameState;
};

/**
 * Informs all observers of the current state of the game
 * @param gameState the data from the current game state from the
 * referee's perspective
 * @param observers the observers to inform of the current game state
 */
const updateObservers = (
  gameState: RenderableGameState<BaseTile>,
  observers: Observer<BaseTile>[]
): void => {
  observers.forEach((observer) => observer.receiveState(gameState));
};

/**
 * Manage a single turn by a player.
 * A turn involves getting the turn action from a player, validating it, executing it, and scoring it
 * @param gameState the current game state
 * @param rulebook the rules of the game
 * @returns void
 */
const manageTurn = (
  gameState: QGameState<BaseTile>,
  rulebook: QRuleBook<BaseTile>
) => {
  const publicState = gameState.getActivePlayerInfo();
  const activePlayerName = publicState.playersQueue[0];
  const activePlayerController = gameState.getActivePlayerController();

  const turnAction = getAndValidateTurnAction(
    activePlayerName,
    activePlayerController.takeTurn(publicState),
    gameState,
    rulebook.getPlacementRules()
  );

  if (turnAction !== undefined) {
    doTurnAndUpdatePlayer(
      turnAction,
      activePlayerName,
      activePlayerController,
      gameState,
      rulebook
    );
  }
};

const doTurnAndUpdatePlayer = (
  turnAction: TurnAction<BaseTile>,
  playerName: string,
  playerController: SafePlayer<BaseTile>,
  gameState: QGameState<BaseTile>,
  rulebook: QRuleBook<BaseTile>
) => {
  const { originalTiles, newTiles } = executeTurnAction(turnAction, gameState);

  const score = scoreTurnAction(
    originalTiles,
    turnAction,
    gameState,
    rulebook.getScoringRules()
  );

  gameState.updatePlayerScore(playerName, score);

  gameState.nextTurn(originalTiles, turnAction);

  givePlayerNewTiles(
    playerName,
    playerController,
    newTiles,
    gameState,
    rulebook.getEndOfGameRules()
  );
};

/**
 * Give the player their new tiles, if there are any to give, eliminating them
 * if they misbehave.
 * @param playerName the name of the player to give new tiles to
 * @param playerController the player controller for the player
 * @param newTiles the new tiles to give to the player
 * @param gameState the current game state
 * @param endOfGameRules the end of game rules for the game
 */
const givePlayerNewTiles = (
  playerName: string,
  playerController: SafePlayer<BaseTile>,
  newTiles: BaseTile[],
  gameState: QGameState<BaseTile>,
  endOfGameRules: ReadonlyArray<EndOfGameRule<BaseTile>>
): void => {
  if (newTiles.length > 0 && !gameState.isGameOver(endOfGameRules)) {
    const resultNewTilesCall = playerController.newTiles(newTiles);
    if (resultNewTilesCall.success === false) {
      gameState.eliminatePlayer(playerName);
    }
  }
};

/**
 * Request a turn action from the Player.
 * If the player throws an error, or the given turn action is invalid, eliminate them from the game
 * @param activePlayerName Name of the active player
 * @param takeTurn function to request a turn from the player
 * @param gameState the current game state
 * @param placementRules a list of placement rules a turn action must adhere to
 * @returns a TurnAction if the player requested a valid turn with throwing an error, otherwise undefined
 */
const getAndValidateTurnAction = (
  activePlayerName: string,
  turnAction: Result<TurnAction<BaseTile>>,
  gameState: QGameState<BaseTile>,
  placementRules: ReadonlyArray<PlacementRule<BaseTile>>
): TurnAction<BaseTile> | undefined => {
  if (turnAction.success === false || turnAction.value === undefined) {
    gameState.eliminatePlayer(activePlayerName);
    return undefined;
  }

  const isValidTurnAction = validateTurnAction(
    turnAction.value,
    gameState,
    placementRules
  );

  if (!isValidTurnAction) {
    gameState.eliminatePlayer(activePlayerName, turnAction.value);
    return undefined;
  }

  return turnAction.value;
};

/**
 * Check if the given turn action is valid according to the given placement rules and game state.
 * PASS turns are always valid.
 * EXCHANGE turns are only valid if the referee has more remaining tiles than the player has.
 * Placements are valid if they follow the given placement rules.
 * @param turnAction the turn action to validate
 * @param gameState the current game state
 * @param placementRules the placement rules to check a tile placement against
 * @returns boolean, true if it is a valid turn action, false otherwise.
 */
const validateTurnAction = (
  turnAction: TurnAction<BaseTile>,
  gameState: QGameState<BaseTile>,
  placementRules: ReadonlyArray<PlacementRule<BaseTile>>
): boolean => {
  if (turnAction.ofType('PLACE')) {
    return gameState.isValidPlacement(
      turnAction.getPlacements(),
      placementRules
    );
  } else if (turnAction.ofType('EXCHANGE')) {
    const { playerTiles, remainingTilesCount } =
      gameState.getActivePlayerInfo();
    return playerTiles.length <= remainingTilesCount;
  } else {
    return true;
  }
};

/**
 * Score the given turn action according to the given rules and game state.
 * When this function gets called, the turn action has not yet been executed, however if it had the same score would be returned.
 * PASS and EXCHANGE turns return a score of 0
 * @param activePlayerName name of the active player
 * @param turnAction The turn action to check
 * @param gameState The current state of the game
 * @param scoringRules The scoring rules to use to get a score
 * @returns void
 */
const scoreTurnAction = (
  originalTiles: BaseTile[],
  turnAction: TurnAction<BaseTile>,
  gameState: QGameState<BaseTile>,
  scoringRules: ReadonlyArray<ScoringRule<BaseTile>>
) => {
  if (turnAction.ofType('PASS') || turnAction.ofType('EXCHANGE')) {
    return 0;
  }

  const turnState: TurnState<BaseTile> = {
    turnAction,
    playerTiles: originalTiles
  };

  return gameState.getPlacementScore(turnState, scoringRules);
};

/**
 * Execute the turn action on behalf of the active player and get the player's new tiles, if applicable
 * Invariant that the turn action has already been validated
 * @param turnAction The turn action the active player
 * @param gameState The current game state
 * @returns The player's tiles at the beginning of the turn and the new tiles
 * the player received during the turn
 */
const executeTurnAction = (
  turnAction: TurnAction<BaseTile>,
  gameState: QGameState<BaseTile>
): { originalTiles: BaseTile[]; newTiles: BaseTile[] } => {
  if (turnAction.ofType('PLACE')) {
    return gameState.placeTurn(turnAction.getPlacements());
  } else if (turnAction.ofType('EXCHANGE')) {
    return gameState.exchangeTurn();
  } else {
    return gameState.passTurn();
  }
};

/**
 * Creates a list with two elements, the names of the winners of the game and the names of the eliminated players.
 * Also, communicates to each non eliminated player whether they won or lost.
 * @param finalGameState The final game state for the game
 * @returns A GameResult of the winners and eliminated players
 */
export function endGame(
  finalGameState: QGameState<BaseTile>,
  observers: Observer<BaseTile>[]
): GameResult {
  const scoreboard = finalGameState.getScoreboard();

  const winners = getWinnersNames(scoreboard);
  const eliminated = finalGameState.getEliminatedPlayerNames();

  const finalResult = communicateWinWithPlayers(
    finalGameState.getAllPlayersEndGameInformation(),
    [winners, eliminated]
  );

  informObserversOfEndGame(
    observers,
    finalGameState.getRenderableData(),
    winners,
    eliminated
  );

  return finalResult;
}

/**
 * Informs the observers that the game has completed.
 * @param observers the observers to inform about the end of the game
 */
const informObserversOfEndGame = (
  observers: Observer<BaseTile>[],
  gameState: RenderableGameState<BaseTile>,
  winnerNames: string[],
  eliminatedNames: string[]
) => {
  observers.forEach((observer) =>
    observer.gameOver(gameState, winnerNames, eliminatedNames)
  );
};

/**
 * Get names of the winners of the game
 * @param scoreboard The scoreboard of the game
 * @returns The names of the winners
 */
const getWinnersNames = (scoreboard: Scoreboard): string[] => {
  scoreboard.sort((a, b) => b.score - a.score);

  const winners = scoreboard
    .filter(({ score }) => score === scoreboard[0].score)
    .map(({ name }) => name);

  return winners;
};

/**
 * Tell each of the players whether they won or lost.
 * Do not communicate with eliminated players
 * @param players
 * @param playerNames
 * @param gameResult
 */
const communicateWinWithPlayers = (
  playersEndGameInformation: PlayerEndGameInformation[],
  [winners, eliminated]: GameResult
): GameResult => {
  playersEndGameInformation.forEach(({ name, win }) => {
    const playerWon = winners.includes(name);

    const resultWinCall = win(playerWon);
    if (resultWinCall.success === false) {
      if (playerWon) {
        winners.splice(
          winners.findIndex((winnerName) => winnerName === name),
          1
        );
      }
      eliminated.push(name);
    }
  });

  return [winners, eliminated];
};
