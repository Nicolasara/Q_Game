import { REFEREE_PLAYER_TIMEOUT_MS } from '../constants';
import { RandomBagOfTiles } from '../game/gameState/bagOfTiles';
import { BaseGameState, QGameState } from '../game/gameState/gameState';
import PlayerState from '../game/gameState/playerState';
import PlayerTurnQueue from '../game/gameState/playerTurnQueue';
import BaseMap from '../game/map/map';
import { BaseTile } from '../game/map/tile';
import { BaseRuleBook } from '../game/rules/ruleBook';
import { BasePlayer } from '../player/player';
import { DagStrategy } from '../player/strategy';
import { BaseReferee } from './referee';
import { endGame, runGame, setUpGame, setUpPlayers } from './refereeUtils';
import { SafePlayer } from './safePlayer';

jest.mock('./refereeUtils');

describe('tests for referee function', () => {
  test('BaseReferee calls the setUpGame method with a copy of the players array if no existing state passed in', async () => {
    // Arrange
    const rulebook = new BaseRuleBook();
    const player1 = new BasePlayer('name 1', new DagStrategy(), rulebook);
    const players = [player1];

    const mockSetUpGame = jest.fn();
    jest.mocked(setUpGame).mockImplementation(mockSetUpGame);

    // Act
    await BaseReferee(players, [], rulebook);

    // Assert
    expect(mockSetUpGame).toBeCalledWith(expect.objectContaining(players));
  });
  test('BaseReferee does not call the setUpGame method if an existing state passed in', async () => {
    // Arrange
    const rulebook = new BaseRuleBook();
    const player1 = new BasePlayer('jacob', new DagStrategy(), rulebook);
    const players = [player1];
    const map = new BaseMap([]);
    const gameState = new BaseGameState(
      map,
      new PlayerTurnQueue<BaseTile>([
        new PlayerState(
          new SafePlayer(player1, REFEREE_PLAYER_TIMEOUT_MS),
          'jacob'
        )
      ]),
      new RandomBagOfTiles<BaseTile>([])
    );

    const mockSetUpGame = jest.fn();
    jest.mocked(setUpGame).mockImplementation(mockSetUpGame);

    // Act
    await BaseReferee(players, [], rulebook, gameState);

    // Assert
    expect(mockSetUpGame).not.toBeCalledWith();
  });
  test('BaseReferee calls setUpPlayers with the game state', async () => {
    // Arrange
    const rulebook = new BaseRuleBook();
    const player1 = new BasePlayer('name 1', new DagStrategy(), rulebook);
    const players = [player1];

    const mockGameState = {} as QGameState<BaseTile>;
    const mockSetUpGame = jest.fn().mockReturnValue(mockGameState);
    jest.mocked(setUpGame).mockImplementation(mockSetUpGame);

    const mockSetUpPlayers = jest.fn();
    jest.mocked(setUpPlayers).mockImplementation(mockSetUpPlayers);

    // Act
    await BaseReferee(players, [], rulebook);

    // Assert
    expect(mockSetUpPlayers).toBeCalledWith(mockGameState);
  });
  test('BaseReferee calls runGame function with game state and rulebook', async () => {
    // Arrange
    const rulebook = new BaseRuleBook();
    const player1 = new BasePlayer('name 1', new DagStrategy(), rulebook);
    const players = [player1];

    const mockSetUpGame = jest.fn();
    const gameState = {} as QGameState<BaseTile>;
    mockSetUpGame.mockReturnValue(gameState);
    jest.mocked(setUpGame).mockImplementation(mockSetUpGame);
    const mockRunGame = jest.fn();
    jest.mocked(runGame).mockImplementation(mockRunGame);

    // Act
    await BaseReferee(players, [], rulebook);

    // Assert
    expect(mockRunGame).toBeCalledWith(gameState, rulebook);
  });
  test('BaseReferee calls endGame function with the final game state', async () => {
    // Arrange
    const rulebook = new BaseRuleBook();
    const player1 = new BasePlayer('name 1', new DagStrategy(), rulebook);
    const players = [player1];

    const mockSetUpGame = jest.fn();
    const gameState = {} as QGameState<BaseTile>;
    mockSetUpGame.mockReturnValue(gameState);
    jest.mocked(setUpGame).mockImplementation(mockSetUpGame);

    const mockRunGame = jest.fn();
    const finalGameState = {} as QGameState<BaseTile>;
    mockRunGame.mockReturnValue(finalGameState);
    jest.mocked(runGame).mockImplementation(mockRunGame);

    const mockEndGame = jest.fn();
    jest.mocked(endGame).mockImplementation(mockEndGame);

    // Act
    await BaseReferee(players, [], rulebook);

    // Assert
    expect(mockEndGame).toBeCalledWith(finalGameState);
  });
  test('BaseReferee calls setupGame then runGame then endGame in order', async () => {
    // Arrange
    const rulebook = new BaseRuleBook();
    const player1 = new BasePlayer('name 1', new DagStrategy(), rulebook);
    const players = [player1];

    const mockSetUpGame = jest.fn();
    jest.mocked(setUpGame).mockImplementation(mockSetUpGame);

    const mockRunGame = jest.fn();
    jest.mocked(runGame).mockImplementation(mockRunGame);

    const mockEndGame = jest.fn();
    jest.mocked(endGame).mockImplementation(mockEndGame);

    // Act
    await BaseReferee(players, [], rulebook);

    // Assert
    expect(mockSetUpGame.mock.invocationCallOrder[0]).toBeLessThan(
      mockRunGame.mock.invocationCallOrder[0]
    );
    expect(mockRunGame.mock.invocationCallOrder[0]).toBeLessThan(
      mockEndGame.mock.invocationCallOrder[0]
    );
  });
});
