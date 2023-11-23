import { REFEREE_PLAYER_TIMEOUT_MS } from '../../../constants';
import PlayerState from '../../../game/gameState/playerState';
import Coordinate from '../../../game/map/coordinate';
import BaseMap from '../../../game/map/map';
import { BaseTile } from '../../../game/map/tile';
import { TilePlacement } from '../../../game/types/gameState.types';
import { Player } from '../../../player/player';
import { SafePlayer } from '../../../referee/safePlayer';
import { JState, JMap, JCell, JTile } from '../types';

type QState = {
  qMap: BaseMap;
  qTilesInBag: BaseTile[];
  playerStates: PlayerState<BaseTile>[];
};

export async function toQState(
  jState: JState,
  players: Player<BaseTile>[]
): Promise<QState> {
  const qMap = toQMap(jState.map);
  const qTilesInBag = jState['tile*'].map((tile) => toQTile(tile));
  const qPlayers = jState.players.map((player) => ({
    score: player.score,
    'tile*': player['tile*'].map((tile) => toQTile(tile))
  }));

  const playerStates = await Promise.all(
    players.map(async (player, index) => {
      const playerState = new PlayerState(
        new SafePlayer(player, REFEREE_PLAYER_TIMEOUT_MS),
        await player.name()
      );
      const qPlayer = qPlayers[index];
      playerState.setTiles(qPlayer['tile*']);
      playerState.updateScore(qPlayer.score);

      return playerState;
    })
  );

  return { qMap, qTilesInBag, playerStates };
}

export function toQMap(jMap: JMap): BaseMap {
  const tilePlacements: TilePlacement<BaseTile>[] = [];
  jMap.forEach((row) => {
    (row.slice(1) as JCell[]).forEach((cell) =>
      tilePlacements.push({
        tile: new BaseTile(cell[1].shape, cell[1].color),
        coordinate: new Coordinate(cell[0], row[0])
      })
    );
  });
  return new BaseMap(tilePlacements);
}

function toQTile(jTile: JTile): BaseTile {
  return new BaseTile(jTile.shape, jTile.color);
}
