import { SafePlayer } from './safePlayer';
import { Player } from '../player/player';
import { BaseTile } from '../game/map/tile';
import { BaseTurnAction } from '../player/turnAction';
import {
  RelevantPlayerInfo,
  TilePlacement
} from '../game/types/gameState.types';

class AbstractFailPlayer implements Player<BaseTile> {
  constructor() {}

  protected async fail() {
    throw new Error('Test error');
  }

  public async name() {
    await this.fail();
    return 'Test';
  }

  public async setUp(_m: TilePlacement<BaseTile>[], _st: BaseTile[]) {
    await this.fail();
  }

  public async takeTurn(_s: RelevantPlayerInfo<BaseTile>) {
    await this.fail();
    return new BaseTurnAction<BaseTile>('PASS');
  }

  public async newTiles(_st: BaseTile[]) {
    await this.fail();
  }

  public async win() {
    await this.fail();
  }
}

class ErrorPlayer extends AbstractFailPlayer {
  constructor() {
    super();
  }

  protected async fail() {
    throw new Error('Test error');
  }
}

class TimeoutPlayer extends AbstractFailPlayer {
  constructor() {
    super();
  }

  protected async fail() {
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
}

class GoodPlayer extends AbstractFailPlayer {
  constructor() {
    super();
  }

  protected async fail() {
    // Do nothing
  }
}

describe('SafePlayer tests', () => {
  let goodPlater: GoodPlayer;
  let mockErrorPlayer: ErrorPlayer;
  let mockTimeoutPlayer: TimeoutPlayer;
  let safeGoodPlayer: SafePlayer<BaseTile>;
  let safeErrorPlayer: SafePlayer<BaseTile>;
  let safeTimeoutPlayer: SafePlayer<BaseTile>;

  beforeEach(() => {
    goodPlater = new GoodPlayer();
    mockErrorPlayer = new ErrorPlayer();
    mockTimeoutPlayer = new TimeoutPlayer();
    safeGoodPlayer = new SafePlayer(goodPlater, 2000);
    safeErrorPlayer = new SafePlayer(mockErrorPlayer, 2000);
    safeTimeoutPlayer = new SafePlayer(mockTimeoutPlayer, 2000);
  });

  it('should handle errors', async () => {
    const name = await safeErrorPlayer.name();
    expect(name.success).toBe(false);
    const setUp = await safeErrorPlayer.setUp([], []);
    expect(setUp.success).toBe(false);
    const takeTurn = await safeErrorPlayer.takeTurn({
      mapState: [],
      remainingTilesCount: 0,
      scoreboard: [],
      playerTiles: [],
      playersQueue: []
    });
    expect(takeTurn.success).toBe(false);
    const newTiles = await safeErrorPlayer.newTiles([]);
    expect(newTiles.success).toBe(false);
    const win = await safeErrorPlayer.win(true);
    expect(win.success).toBe(false);
  });

  it('should handle timeouts', async () => {
    const name = await safeTimeoutPlayer.name();
    expect(name.success).toBe(false);
    const setUp = await safeTimeoutPlayer.setUp([], []);
    expect(setUp.success).toBe(false);
    const takeTurn = await safeTimeoutPlayer.takeTurn({
      mapState: [],
      remainingTilesCount: 0,
      scoreboard: [],
      playerTiles: [],
      playersQueue: []
    });
    expect(takeTurn.success).toBe(false);
    const newTiles = await safeTimeoutPlayer.newTiles([]);
    expect(newTiles.success).toBe(false);
    const win = await safeTimeoutPlayer.win(true);
    expect(win.success).toBe(false);
  }, 12000);

  it('should handle good calls', async () => {
    const name = await safeGoodPlayer.name();
    expect(name.success).toBe(true);
    expect(name.value).toBe('Test');
    const setUp = await safeGoodPlayer.setUp([], []);
    expect(setUp.success).toBe(true);
    const takeTurn = await safeGoodPlayer.takeTurn({
      mapState: [],
      remainingTilesCount: 0,
      scoreboard: [],
      playerTiles: [],
      playersQueue: []
    });
    expect(takeTurn.success).toBe(true);
    expect(takeTurn.value).toStrictEqual(new BaseTurnAction<BaseTile>('PASS'));
    const newTiles = await safeGoodPlayer.newTiles([]);
    expect(newTiles.success).toBe(true);
    const win = await safeGoodPlayer.win(true);
    expect(win.success).toBe(true);
  });
});
