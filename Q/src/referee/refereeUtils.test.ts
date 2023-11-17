import { BaseGameState } from '../game/gameState/gameState';
import Coordinate from '../game/map/coordinate';
import { BaseTile } from '../game/map/tile';
import { BaseRuleBook } from '../game/rules/ruleBook';
import { RelevantPlayerInfo } from '../game/types/gameState.types';
import { colorList, shapeList } from '../game/types/map.types';
import { BaseTurnAction } from '../player/turnAction';
import { BasePlayer } from '../player/player';
import { DagStrategy } from '../player/strategy';
import { endGame, runGame, setUpGame, setUpPlayers } from './refereeUtils';

const NUMBER_OF_EACH_TILE = 30;
const NUMBER_OF_PLAYER_TILES = 6;

const arrangeAndCallSetupGame = () => {
  // Arrange
  const rulebook = new BaseRuleBook();
  const player1 = new BasePlayer('joe', new DagStrategy(), rulebook);
  const player2 = new BasePlayer('bob', new DagStrategy(), rulebook);
  const player3 = new BasePlayer('john', new DagStrategy(), rulebook);
  const players = [player1, player2, player3];

  // Act
  return { gameState: setUpGame(players), players, rulebook };
};

type Frequency = {
  [color: string]: { [shape: string]: number };
};

const startingTileFrequencies = () => {
  const frequencies: Frequency = {};
  colorList.forEach((color) => {
    frequencies[color] = {};
    shapeList.forEach((shape) => {
      frequencies[color][shape] = NUMBER_OF_EACH_TILE;
    });
  });
  return frequencies;
};

const reduceFrequency = (tile: BaseTile, frequencies: Frequency) => {
  frequencies[tile.getColor()][tile.getShape()] -= 1;
};

const getTilePlacements = (tiles: BaseTile[], i: number) => {
  return tiles.map((tile, index) => ({
    tile,
    coordinate: new Coordinate(0, i + index)
  }));
};

describe('tests for referee util methods', () => {
  describe('tests for setUpGame function', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      jest.restoreAllMocks();
    });
    test('setup function creates a game state with 1061 remaining tiles (minus 1 for the starting tile and NUMBER_OF_PLAYER_TILES per player)', () => {
      // Arrange, Act
      const { gameState } = arrangeAndCallSetupGame();

      // Assert
      expect(gameState.getActivePlayerInfo().remainingTilesCount).toBe(1061);
    });
    test('setUp function creates a game state with NUMBER_OF_EACH_TILE of each kind of tile', () => {
      // Arrange, Act
      const { gameState } = arrangeAndCallSetupGame();

      // We'll check this by initializing a mapping of all types of tiles to a count of NUMBER_OF_EACH_TILE and reduce the counts every time we encounter a tile
      const frequencies = startingTileFrequencies();

      // Add starting map tile to collection
      reduceFrequency(
        gameState.getActivePlayerInfo().mapState[0].tile,
        frequencies
      );

      // Reduce the frequency of each players tiles and then place all of their tiles to draw new ones from the bag
      for (let i = 0; i < 1079; i += NUMBER_OF_PLAYER_TILES) {
        const playerTiles = gameState.getActivePlayerInfo().playerTiles;
        playerTiles.forEach((tile) => reduceFrequency(tile, frequencies));
        gameState.placeTurn(getTilePlacements(playerTiles, i + 1));
      }

      // Assert
      Object.values(frequencies).forEach((shapes) => {
        Object.values(shapes).forEach((frequency) => {
          expect(frequency).toBe(0);
        });
      });
    });
    test('setUp function creates a game state with a map that has one starting placement at (0, 0)', () => {
      // Arrange, Act
      const { gameState } = arrangeAndCallSetupGame();

      // Assert
      expect(gameState.getActivePlayerInfo().mapState.length).toBe(1);
      expect(gameState.getActivePlayerInfo().mapState).toStrictEqual(
        expect.arrayContaining([
          expect.objectContaining({ coordinate: new Coordinate(0, 0) })
        ])
      );
    });
    test('setUp function creates a game state with three PlayerStates when given three Players', () => {
      // Arrange, Act
      const { gameState } = arrangeAndCallSetupGame();

      // Assert
      expect(gameState.getActivePlayerInfo().playersQueue).toStrictEqual([
        'joe',
        'bob',
        'john'
      ]);
    });
    test('Players name function is called for every player', () => {
      // Arrange, Act
      const mockName = jest.fn().mockReturnValue('name');
      jest.spyOn(BasePlayer.prototype, 'name').mockImplementation(mockName);
      arrangeAndCallSetupGame();

      // Assert
      expect(mockName).toBeCalledTimes(3);
    });
    test('each player state is given NUMBER_OF_PLAYER_TILES tiles from the bag', () => {
      // Arrange, Act
      const { gameState } = arrangeAndCallSetupGame();

      // Assert
      for (let i = 0; i < 3; i++) {
        expect(gameState.getActivePlayerInfo().playerTiles.length).toBe(
          NUMBER_OF_PLAYER_TILES
        );
        gameState.passTurn();
      }
    });
    test('setupPlayers function calls setup method on each Player is called with initial map and player tiles', () => {
      // Arrange
      const mockSetUp = jest.fn();
      jest.spyOn(BasePlayer.prototype, 'setUp').mockImplementation(mockSetUp);
      const { gameState } = arrangeAndCallSetupGame();

      // Act
      setUpPlayers(gameState);

      // Assert
      expect(mockSetUp).toBeCalledTimes(3);
      expect(mockSetUp).toHaveBeenNthCalledWith(
        1,
        expect.arrayContaining([
          expect.objectContaining({ coordinate: new Coordinate(0, 0) })
        ]),
        gameState.getActivePlayerInfo().playerTiles
      );
      gameState.passTurn();
      expect(mockSetUp).toHaveBeenNthCalledWith(
        2,
        expect.arrayContaining([
          expect.objectContaining({ coordinate: new Coordinate(0, 0) })
        ]),
        gameState.getActivePlayerInfo().playerTiles
      );
      gameState.passTurn();
      expect(mockSetUp).toHaveBeenNthCalledWith(
        3,
        expect.arrayContaining([
          expect.objectContaining({ coordinate: new Coordinate(0, 0) })
        ]),
        gameState.getActivePlayerInfo().playerTiles
      );
    });
    test('setupPlayers function eliminates a player from the game if they throw an error', () => {
      // Arrange
      const mockSetUp = jest.fn();
      jest.spyOn(BasePlayer.prototype, 'setUp').mockImplementation(mockSetUp);
      const { gameState } = arrangeAndCallSetupGame();

      jest.spyOn(BasePlayer.prototype, 'setUp').mockImplementationOnce(() => {
        throw new Error();
      });

      // Act
      setUpPlayers(gameState);

      // Assert
      expect(gameState.getActivePlayerInfo().playersQueue).toStrictEqual([
        'bob',
        'john'
      ]);
    });
  });
  describe('tests for runGame function', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      jest.restoreAllMocks();
    });
    test('runGame function calls getActivePlayerInfo and passes result to player takeTurn method', () => {
      // Arrange
      const { gameState, rulebook } = arrangeAndCallSetupGame();
      const mockActivePlayerInfo = {
        playersQueue: ['joe', 'bob', 'john']
      } as RelevantPlayerInfo<BaseTile>;

      const mockGetActivePlayerInfo = jest.fn();
      mockGetActivePlayerInfo.mockReturnValue(mockActivePlayerInfo);
      jest
        .spyOn(BaseGameState.prototype, 'getActivePlayerInfo')
        .mockImplementation(mockGetActivePlayerInfo);

      const mockIsGameOver = jest.fn().mockReturnValueOnce(false);
      mockIsGameOver.mockReturnValue(true);
      jest
        .spyOn(BaseGameState.prototype, 'isGameOver')
        .mockImplementation(mockIsGameOver);

      const mockTakeTurn = jest
        .fn()
        .mockReturnValue(new BaseTurnAction('PASS'));
      jest
        .spyOn(BasePlayer.prototype, 'takeTurn')
        .mockImplementation(mockTakeTurn);

      // Act
      runGame(gameState, rulebook, []);

      // Assert
      expect(mockTakeTurn).toBeCalledWith(mockActivePlayerInfo);
    });
    test('if Player takeTurn method throws an error, then player is eliminated and game over is checked', () => {
      // Arrange
      const { gameState, rulebook } = arrangeAndCallSetupGame();

      const mockIsGameOver = jest.fn().mockReturnValueOnce(false);
      mockIsGameOver.mockReturnValue(true);
      jest
        .spyOn(BaseGameState.prototype, 'isGameOver')
        .mockImplementation(mockIsGameOver);

      const error = new Error('throw error on take turn');
      const mockTakeTurn = jest.fn().mockImplementation(() => {
        throw error;
      });
      jest
        .spyOn(BasePlayer.prototype, 'takeTurn')
        .mockImplementationOnce(mockTakeTurn);

      // Act
      runGame(gameState, rulebook, []);

      // Assert
      expect(gameState.getActivePlayerInfo().playersQueue).toStrictEqual([
        'bob',
        'john'
      ]);
    });
    test('if turn action is PASS, validate turn action returns true so eliminatePlayer is not called', () => {
      // Arrange
      const { gameState, rulebook } = arrangeAndCallSetupGame();

      jest.spyOn(BaseGameState.prototype, 'isGameOver').mockReturnValue(true);

      const mockTakeTurn = jest
        .fn()
        .mockReturnValue(new BaseTurnAction('PASS'));
      jest
        .spyOn(BasePlayer.prototype, 'takeTurn')
        .mockImplementationOnce(mockTakeTurn);

      const mockEliminatePlayer = jest.fn();
      jest
        .spyOn(BaseGameState.prototype, 'eliminatePlayer')
        .mockImplementation(mockEliminatePlayer);

      // Act
      runGame(gameState, rulebook, []);

      // Assert
      expect(mockEliminatePlayer).not.toHaveBeenCalled();
    });
    test('if turn action is EXCHANGE and there are enough tiles in the bag, validate turn action returns true so eliminatePlayer is not called', () => {
      // Arrange
      const { gameState, rulebook } = arrangeAndCallSetupGame();

      jest.spyOn(BaseGameState.prototype, 'isGameOver').mockReturnValue(true);

      const mockTakeTurn = jest
        .fn()
        .mockReturnValue(new BaseTurnAction('EXCHANGE'));
      jest
        .spyOn(BasePlayer.prototype, 'takeTurn')
        .mockImplementationOnce(mockTakeTurn);

      const mockEliminatePlayer = jest.fn();
      jest
        .spyOn(BaseGameState.prototype, 'eliminatePlayer')
        .mockImplementation(mockEliminatePlayer);

      // Act
      runGame(gameState, rulebook, []);

      // Assert
      expect(mockEliminatePlayer).not.toHaveBeenCalled();
    });
    test('if turn action is EXCHANGE and there are not enough tiles in the bag, validate turn action returns false so player is eliminated', () => {
      // Arrange
      const { gameState, rulebook } = arrangeAndCallSetupGame();
      const activePlayerInfo = gameState.getActivePlayerInfo();

      const mockIsGameOver = jest.fn().mockReturnValueOnce(false);
      mockIsGameOver.mockReturnValue(true);
      jest
        .spyOn(BaseGameState.prototype, 'isGameOver')
        .mockImplementation(mockIsGameOver);

      const mockTakeTurn = jest
        .fn()
        .mockReturnValue(new BaseTurnAction('EXCHANGE'));
      jest
        .spyOn(BasePlayer.prototype, 'takeTurn')
        .mockImplementationOnce(mockTakeTurn);

      jest
        .spyOn(BaseGameState.prototype, 'getActivePlayerInfo')
        .mockReturnValue({ ...activePlayerInfo, remainingTilesCount: 3 });

      const mockEliminatePlayer = jest.fn();
      jest
        .spyOn(BaseGameState.prototype, 'eliminatePlayer')
        .mockImplementation(mockEliminatePlayer);

      // Act
      runGame(gameState, rulebook, []);

      // Assert
      expect(mockEliminatePlayer).toHaveBeenCalled();
    });
    test('if turn action is a tile placement, and it is a valid placement, player is not eliminated', () => {
      // Arrange
      const { gameState, rulebook } = arrangeAndCallSetupGame();

      jest.spyOn(BaseGameState.prototype, 'isGameOver').mockReturnValue(true);

      const mockTakeTurn = jest.fn().mockReturnValue([]);
      jest
        .spyOn(BasePlayer.prototype, 'takeTurn')
        .mockImplementationOnce(mockTakeTurn);

      const mockIsValidPlacement = jest.fn().mockReturnValue(true);
      jest
        .spyOn(BaseGameState.prototype, 'isValidPlacement')
        .mockImplementation(mockIsValidPlacement);

      const mockEliminatePlayer = jest.fn();
      jest
        .spyOn(BaseGameState.prototype, 'eliminatePlayer')
        .mockImplementation(mockEliminatePlayer);

      // Act
      runGame(gameState, rulebook, []);

      // Assert
      expect(mockEliminatePlayer).not.toHaveBeenCalled();
    });
    test('if turn action is a tile placement, and it is not a valid placement, player is eliminated, but their turn action is still set', () => {
      // Arrange
      const { gameState, rulebook } = arrangeAndCallSetupGame();

      const mockIsGameOver = jest.fn().mockReturnValueOnce(false);
      mockIsGameOver.mockReturnValue(true);
      jest
        .spyOn(BaseGameState.prototype, 'isGameOver')
        .mockImplementation(mockIsGameOver);

      const mockTurnAction = new BaseTurnAction('PLACE', []);
      const mockTakeTurn = jest.fn().mockReturnValue(mockTurnAction);
      jest
        .spyOn(BasePlayer.prototype, 'takeTurn')
        .mockImplementationOnce(mockTakeTurn);

      const mockIsValidPlacement = jest.fn().mockReturnValue(false);
      jest
        .spyOn(BaseGameState.prototype, 'isValidPlacement')
        .mockImplementation(mockIsValidPlacement);

      const mockEliminatePlayer = jest.fn();
      jest
        .spyOn(BaseGameState.prototype, 'eliminatePlayer')
        .mockImplementation(mockEliminatePlayer);

      // Act
      runGame(gameState, rulebook, []);

      // Assert
      expect(mockEliminatePlayer).toHaveBeenCalledWith('joe', mockTurnAction);
    });
    test('if turnAction is a placement, getPlacementScore is called after isValidPlacement with the turn action and scoring rules', () => {
      // Arrange
      const { gameState, rulebook } = arrangeAndCallSetupGame();

      const mockIsGameOver = jest.fn().mockReturnValueOnce(false);
      mockIsGameOver.mockReturnValue(true);
      jest
        .spyOn(BaseGameState.prototype, 'isGameOver')
        .mockImplementation(mockIsGameOver);

      const turnAction = new BaseTurnAction('PLACE', []);
      const mockTakeTurn = jest.fn().mockReturnValue(turnAction);
      jest
        .spyOn(BasePlayer.prototype, 'takeTurn')
        .mockImplementationOnce(mockTakeTurn);

      const mockIsValidPlacement = jest.fn().mockReturnValue(true);
      jest
        .spyOn(BaseGameState.prototype, 'isValidPlacement')
        .mockImplementation(mockIsValidPlacement);

      const mockGetPlacementScore = jest.fn().mockReturnValue(10);
      jest
        .spyOn(BaseGameState.prototype, 'getPlacementScore')
        .mockImplementation(mockGetPlacementScore);

      // Act
      runGame(gameState, rulebook, []);

      // Assert
      expect(mockIsValidPlacement.mock.invocationCallOrder[0]).toBeLessThan(
        mockGetPlacementScore.mock.invocationCallOrder[0]
      );
      expect(mockGetPlacementScore).toBeCalledWith(
        turnAction.getPlacements(),
        rulebook.getScoringRules()
      );
    });
    test('if turn action is PASS, updatePlayerScore is called with 0', () => {
      // Arrange
      const { gameState, rulebook } = arrangeAndCallSetupGame();

      const mockIsGameOver = jest.fn().mockReturnValueOnce(false);
      mockIsGameOver.mockReturnValue(true);
      jest
        .spyOn(BaseGameState.prototype, 'isGameOver')
        .mockImplementation(mockIsGameOver);

      const mockTakeTurn = jest
        .fn()
        .mockReturnValue(new BaseTurnAction('PASS'));
      jest
        .spyOn(BasePlayer.prototype, 'takeTurn')
        .mockImplementationOnce(mockTakeTurn);

      const mockUpdatePlayerScore = jest.fn();
      jest
        .spyOn(BaseGameState.prototype, 'updatePlayerScore')
        .mockImplementation(mockUpdatePlayerScore);

      // Act
      runGame(gameState, rulebook, []);

      // Assert

      expect(mockUpdatePlayerScore).toHaveBeenCalledWith('joe', 0);
    });
    test('if turn action is EXCHANGE, updatePlayerScore is called with 0', () => {
      // Arrange
      const { gameState, rulebook } = arrangeAndCallSetupGame();

      const mockIsGameOver = jest.fn().mockReturnValueOnce(false);
      mockIsGameOver.mockReturnValue(true);
      jest
        .spyOn(BaseGameState.prototype, 'isGameOver')
        .mockImplementation(mockIsGameOver);

      const mockTakeTurn = jest
        .fn()
        .mockReturnValue(new BaseTurnAction('EXCHANGE'));
      jest
        .spyOn(BasePlayer.prototype, 'takeTurn')
        .mockImplementationOnce(mockTakeTurn);

      const mockUpdatePlayerScore = jest.fn();
      jest
        .spyOn(BaseGameState.prototype, 'updatePlayerScore')
        .mockImplementation(mockUpdatePlayerScore);

      // Act
      runGame(gameState, rulebook, []);

      // Assert

      expect(mockUpdatePlayerScore).toHaveBeenCalledWith('joe', 0);
    });
    test('if turn action is a placement, updatePlayerScore is called with the result of getPlacementScore', () => {
      // Arrange
      const { gameState, rulebook } = arrangeAndCallSetupGame();

      const mockIsGameOver = jest.fn().mockReturnValueOnce(false);
      mockIsGameOver.mockReturnValue(true);
      jest
        .spyOn(BaseGameState.prototype, 'isGameOver')
        .mockImplementation(mockIsGameOver);

      const mockTakeTurn = jest
        .fn()
        .mockReturnValue(new BaseTurnAction('PLACE', []));
      jest
        .spyOn(BasePlayer.prototype, 'takeTurn')
        .mockImplementationOnce(mockTakeTurn);

      const mockIsValidPlacement = jest.fn().mockReturnValue(true);
      jest
        .spyOn(BaseGameState.prototype, 'isValidPlacement')
        .mockImplementation(mockIsValidPlacement);

      const mockGetPlacementScore = jest.fn().mockReturnValue(10);
      jest
        .spyOn(BaseGameState.prototype, 'getPlacementScore')
        .mockImplementation(mockGetPlacementScore);

      const mockUpdatePlayerScore = jest.fn();
      jest
        .spyOn(BaseGameState.prototype, 'updatePlayerScore')
        .mockImplementation(mockUpdatePlayerScore);

      // Act
      runGame(gameState, rulebook, []);

      // Assert
      expect(mockUpdatePlayerScore).toBeCalledWith('joe', 10);
    });
    test('if turn action is PASS, gamestate.passTurn is called', () => {
      // Arrange
      const { gameState, rulebook } = arrangeAndCallSetupGame();

      const mockIsGameOver = jest.fn().mockReturnValueOnce(false);
      mockIsGameOver.mockReturnValue(true);
      jest
        .spyOn(BaseGameState.prototype, 'isGameOver')
        .mockImplementation(mockIsGameOver);

      const mockTakeTurn = jest
        .fn()
        .mockReturnValue(new BaseTurnAction('PASS'));
      jest
        .spyOn(BasePlayer.prototype, 'takeTurn')
        .mockImplementationOnce(mockTakeTurn);

      const mockPassTurn = jest.fn();
      jest
        .spyOn(BaseGameState.prototype, 'passTurn')
        .mockImplementation(mockPassTurn);

      // Act
      runGame(gameState, rulebook, []);

      // Assert
      expect(mockPassTurn).toBeCalled();
    });
    test('if turn action is EXCHANGE, gamestate.exchangeTurn is called', () => {
      // Arrange
      const { gameState, rulebook } = arrangeAndCallSetupGame();

      const mockIsGameOver = jest.fn().mockReturnValueOnce(false);
      mockIsGameOver.mockReturnValue(true);
      jest
        .spyOn(BaseGameState.prototype, 'isGameOver')
        .mockImplementation(mockIsGameOver);

      const mockTakeTurn = jest
        .fn()
        .mockReturnValue(new BaseTurnAction('EXCHANGE'));
      jest
        .spyOn(BasePlayer.prototype, 'takeTurn')
        .mockImplementationOnce(mockTakeTurn);

      const mockExchangeTurn = jest.fn().mockReturnValue([]);
      jest
        .spyOn(BaseGameState.prototype, 'exchangeTurn')
        .mockImplementation(mockExchangeTurn);

      // Act
      runGame(gameState, rulebook, []);

      // Assert
      expect(mockExchangeTurn).toBeCalled();
    });
    test('if turn action is a placement, placeTurn i4s called with the turn action', () => {
      // Arrange
      const { gameState, rulebook } = arrangeAndCallSetupGame();

      const mockIsGameOver = jest.fn().mockReturnValueOnce(false);
      mockIsGameOver.mockReturnValue(true);
      jest
        .spyOn(BaseGameState.prototype, 'isGameOver')
        .mockImplementation(mockIsGameOver);

      const turnAction = new BaseTurnAction('PLACE', []);
      const mockTakeTurn = jest.fn().mockReturnValue(turnAction);
      jest
        .spyOn(BasePlayer.prototype, 'takeTurn')
        .mockImplementationOnce(mockTakeTurn);

      const mockIsValidPlacement = jest.fn().mockReturnValue(true);
      jest
        .spyOn(BaseGameState.prototype, 'isValidPlacement')
        .mockImplementation(mockIsValidPlacement);

      const mockPlaceTurn = jest.fn().mockReturnValue([]);
      jest
        .spyOn(BaseGameState.prototype, 'placeTurn')
        .mockImplementation(mockPlaceTurn);

      // Act
      runGame(gameState, rulebook, []);

      // Assert
      expect(mockPlaceTurn).toBeCalledWith(turnAction.getPlacements());
    });
    test('if turn action is PASS, Players newTiles method is called with an empty list', () => {
      // Arrange
      const { gameState, rulebook } = arrangeAndCallSetupGame();

      const mockIsGameOver = jest.fn().mockReturnValueOnce(false);
      mockIsGameOver.mockReturnValue(true);
      jest
        .spyOn(BaseGameState.prototype, 'isGameOver')
        .mockImplementation(mockIsGameOver);

      const mockTakeTurn = jest
        .fn()
        .mockReturnValue(new BaseTurnAction('PASS'));
      jest
        .spyOn(BasePlayer.prototype, 'takeTurn')
        .mockImplementationOnce(mockTakeTurn);

      const mockNewTiles = jest.fn();
      jest
        .spyOn(BasePlayer.prototype, 'newTiles')
        .mockImplementation(mockNewTiles);

      // Act
      runGame(gameState, rulebook, []);

      // Assert
      expect(mockNewTiles).toBeCalledWith([]);
    });
    test('player is eliminated if Players newTiles method throws an error', () => {
      // Arrange
      const { gameState, rulebook } = arrangeAndCallSetupGame();

      const mockIsGameOver = jest.fn().mockReturnValueOnce(false);
      mockIsGameOver.mockReturnValue(true);
      jest
        .spyOn(BaseGameState.prototype, 'isGameOver')
        .mockImplementation(mockIsGameOver);

      const mockTakeTurn = jest
        .fn()
        .mockReturnValue(new BaseTurnAction('PASS'));
      jest
        .spyOn(BasePlayer.prototype, 'takeTurn')
        .mockImplementationOnce(mockTakeTurn);

      const error = new Error('new tiles throws error');
      const mockNewTiles = jest.fn().mockImplementation(() => {
        throw error;
      });
      jest
        .spyOn(BasePlayer.prototype, 'newTiles')
        .mockImplementation(mockNewTiles);

      const mockEliminatePlayer = jest.fn();
      jest
        .spyOn(BaseGameState.prototype, 'eliminatePlayer')
        .mockImplementation(mockEliminatePlayer);

      // Act
      runGame(gameState, rulebook, []);

      // Assert
      expect(mockEliminatePlayer).toBeCalledWith('joe');
    });
    test('isGameOver is called after the players score is updated', () => {
      // Arrange
      const { gameState, rulebook } = arrangeAndCallSetupGame();

      const mockIsGameOver = jest.fn().mockReturnValueOnce(false);
      mockIsGameOver.mockReturnValue(true);
      jest
        .spyOn(BaseGameState.prototype, 'isGameOver')
        .mockImplementation(mockIsGameOver);

      const mockTakeTurn = jest
        .fn()
        .mockReturnValue(new BaseTurnAction('PLACE', []));
      jest
        .spyOn(BasePlayer.prototype, 'takeTurn')
        .mockImplementationOnce(mockTakeTurn);

      jest
        .spyOn(BaseGameState.prototype, 'isValidPlacement')
        .mockReturnValue(true);

      const mockUpdatePlayerScore = jest.fn();
      jest
        .spyOn(BaseGameState.prototype, 'updatePlayerScore')
        .mockImplementation(mockUpdatePlayerScore);

      // Act
      runGame(gameState, rulebook, []);

      // Assert
      expect(mockUpdatePlayerScore.mock.invocationCallOrder[0]).toBeLessThan(
        mockIsGameOver.mock.invocationCallOrder[1]
      );
    });
    test('if given a game state that is over, getActivePlayerData should never get called', () => {
      // Arrange
      const { gameState, rulebook } = arrangeAndCallSetupGame();
      gameState.eliminatePlayer('joe');
      gameState.eliminatePlayer('bob');
      gameState.eliminatePlayer('john');

      const mockGetActivePlayerInfo = jest.fn();
      jest
        .spyOn(BaseGameState.prototype, 'getActivePlayerInfo')
        .mockImplementation(mockGetActivePlayerInfo);

      // Act
      runGame(gameState, rulebook, []);

      // Assert
      expect(mockGetActivePlayerInfo).not.toHaveBeenCalled();
    });
  });
  describe('tests for endGame function', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      jest.restoreAllMocks();
    });
    test('winners array includes only the players with the highest scores', () => {
      // Arrange
      const { gameState } = arrangeAndCallSetupGame();
      gameState.updatePlayerScore('joe', 20);
      gameState.updatePlayerScore('john', 10);
      gameState.updatePlayerScore('bob', 20);

      // Act
      const result = endGame(gameState, []);

      // Assert
      expect(result[0]).toStrictEqual(['joe', 'bob']);
    });
    test('eliminated array includes all eliminated players', () => {
      // Arrange
      const { gameState } = arrangeAndCallSetupGame();
      gameState.eliminatePlayer('bob');
      gameState.eliminatePlayer('john');

      // Act
      const result = endGame(gameState, []);

      // Assert
      expect(result[1]).toStrictEqual(['bob', 'john']);
    });
    test('all players are told if they won', () => {
      // Arrange
      const { gameState } = arrangeAndCallSetupGame();
      gameState.updatePlayerScore('joe', 20);
      gameState.updatePlayerScore('bob', 10);
      gameState.updatePlayerScore('john', 20);

      const mockWin = jest.fn();
      jest.spyOn(BasePlayer.prototype, 'win').mockImplementation(mockWin);

      // Act
      endGame(gameState, []);

      // Assert
      expect(mockWin).toBeCalledTimes(3);
      expect(mockWin).toHaveBeenNthCalledWith(1, true);
      expect(mockWin).toHaveBeenNthCalledWith(2, false);
      expect(mockWin).toHaveBeenNthCalledWith(3, true);
    });
    test('eliminated players are not told if they won', () => {
      // Arrange
      const { gameState } = arrangeAndCallSetupGame();
      gameState.updatePlayerScore('joe', 20);
      gameState.updatePlayerScore('bob', 10);
      gameState.updatePlayerScore('john', 20);
      gameState.eliminatePlayer('john');

      const mockWin = jest.fn();
      jest.spyOn(BasePlayer.prototype, 'win').mockImplementation(mockWin);

      // Act
      endGame(gameState, []);

      // Assert
      expect(mockWin).toBeCalledTimes(2);
      expect(mockWin).toHaveBeenNthCalledWith(1, true);
      expect(mockWin).toHaveBeenNthCalledWith(2, false);
    });
    test('if win method is throw by player who won, they are not included in final winners', () => {
      // Arrange
      const { gameState } = arrangeAndCallSetupGame();
      gameState.updatePlayerScore('joe', 20);
      gameState.updatePlayerScore('bob', 10);
      gameState.updatePlayerScore('john', 20);

      jest.spyOn(BasePlayer.prototype, 'win').mockImplementationOnce(() => {
        throw new Error('joe throws on win');
      });

      const mockWin = jest.fn();
      jest.spyOn(BasePlayer.prototype, 'win').mockImplementation(mockWin);

      // Act
      const [winners, eliminated] = endGame(gameState, []);

      // Assert
      expect(winners).toStrictEqual(['john']);
      expect(eliminated).toStrictEqual(['joe']);
    });
  });
});
