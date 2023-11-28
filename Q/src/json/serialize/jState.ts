import { RenderableGameState } from '../../game/types/gameState.types';
import { ShapeColorTile } from '../../game/map/tile';
import { JPlayer, JState } from '../data/data.types';
import { toJMap, toJTile } from './jMap';
import { toJPlayer } from './jPlayer';

export function toJState(
  gameState: RenderableGameState<ShapeColorTile>
): JState {
  const map = toJMap(gameState.mapState);
  const refsTiles = gameState.remainingTiles.map(toJTile);

  if (gameState.players.length === 0) {
    throw new Error('A player');
  }
  const jPlayers = gameState.players.map(toJPlayer);
  const players: [JPlayer, ...JPlayer[]] = [jPlayers[0], ...jPlayers.slice(1)];
  return {
    map,
    'tile*': refsTiles,
    players
  };
}
