import { QGameState } from '../game/gameState/gameState';
import { QTile } from '../game/map/tile';
import { QRuleBook } from '../game/rules/ruleBook';
import { Player } from '../player/player';
import { Observer } from '../observer/observer';

/**
 * Type representing the return type of a referee.
 * Consists of a two element array, where the first element is a list of the winner's names, and the second element is a list of the eliminated player's names.
 */
export type GameResult = [string[], string[]];

/**
 * Type representing the referee.
 * The referee is a function that takes in a list of the players and a rulebook.
 * It returns the winners of the game and the eliminated players.
 */
export type RefereeFunction<T extends QTile> = (
  players: Player<T>[],
  observers: Observer<T>[],
  ruleBook: QRuleBook<T>,
  existingGameState?: QGameState<T>
) => GameResult;

/**
 * Represents a result which encapsulates whether or not a function succeeded in
 * running and the return value of the function.
 */
export type Result<R> = {
  success: boolean;
  value?: R;
};
