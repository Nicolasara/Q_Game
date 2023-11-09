import PlayerState from '../../../game/gameState/playerState';
import Coordinate from '../../../game/map/coordinate';
import BaseMap from '../../../game/map/map';
import { BaseTile } from '../../../game/map/tile';
import { TilePlacement } from '../../../game/types/gameState.types';
import { Player } from '../../../player/player';
import { JState, JMap, JCell, JTile } from '../types';

type QState = {
  qMap: BaseMap;
  qTilesInBag: BaseTile[];
  playerStates: PlayerState<BaseTile>[];
};

export function toQState(jState: JState, players: Player<BaseTile>[]): QState {
  const qMap = toQMap(jState.map);
  const qTilesInBag = jState['tile*'].map((tile) => toQTile(tile));
  const qPlayers = jState.players.map((player) => ({
    score: player.score,
    'tile*': player['tile*'].map((tile) => toQTile(tile))
  }));

  const playerStates = players.map((player, index) => {
    const playerState = new PlayerState(player);
    const qPlayer = qPlayers[index];
    playerState.setTiles(qPlayer['tile*']);
    playerState.updateScore(qPlayer.score);

    return playerState;
  });

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
