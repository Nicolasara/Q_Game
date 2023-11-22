import { REFEREE_PLAYER_TIMEOUT_MS } from '../constants';
import { BaseTile } from '../game/map/tile';
import { RefereeFunction } from './referee.types';
import { endGame, runGame, setUpGame, setUpPlayers } from './refereeUtils';
import { SafePlayer } from './safePlayer';

/**
 * Function representing a referee to carry out a single game of Q.
 *
 * The referee is responsible for creating a game state, or resuming from an existing one, running the game to completion and enforcing the game protocol, and communicating with the players.
 *
 * Setting up the initial game state involves creating:
 * - Creating a bag of tiles with an equal number of each kind of tile
 * - Creating the map with a starting tile taken from the bag of tiles
 * - Creating the player turn queue, with the player states
 *      - The ids used in the PlayerStates are the indices of the players in the list passed into the referee
 *
 * Running the game follows the given protocol:
 * - Get the active player state
 * - Give the active player state to the active player
 * - Get the active player's requested move
 * - Check if the requested move is valid
 *      - If it is valid:
 *          - Execute the move
 *          - Score the move
 *          - Give the player their new tiles, if applicable
 *          - Update the player's score
 *      - If it is not valid:
 *          - Eliminate the player and cease communication
 * - Check if the game is over
 *      - If the game is not over:
 *          - Repeat the entire protocol to this point
 *      - If the game is over:
 *          - Get the final scoreboard for the game
 *
 * Ending the game involves returning the GameResult type and communicating to each non eliminated player whether they won or lost.
 *
 * We also define some failure modes for player communication.
 *
 * Player Failure Modes:
 *  - Player violates the game rules
 *      - This is handled by this referee. When the player breaks the game rules they are eliminated from the game.
 *  - Player raises an exception
 *      - This is handled by this referee. If the player throws an exception they are eliminated from the game.
 *  - Player takes too long to respond
 *      - This is not handled by the referee. Will be handled by the remote communication layer.
 *
 * @param players a list of Players, already sorted in order of age. Players have distinct names.
 * @param observers a list of Observers, which spectate a game
 * @param ruleBook the rulebook for this game
 * @param existingGameState optional QGameState type. When passed in, the referee resumes the game from that game state.
 * @returns GameResult type: pair of a list of the winners and a list of the eliminated players
 */
export const BaseReferee: RefereeFunction<BaseTile> = (
  players,
  observers,
  ruleBook,
  existingGameState
) => {
  const playersCopy = [...players];

  const safePlayers = playersCopy.map(
    (player) => new SafePlayer(player, REFEREE_PLAYER_TIMEOUT_MS)
  );

  const gameState = existingGameState ?? setUpGame(safePlayers);

  setUpPlayers(gameState);

  const finalGameState = runGame(gameState, ruleBook, observers);

  return endGame(finalGameState, observers);
};
