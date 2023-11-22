import { Color, Shape } from '../../game/types/map.types';

export type Json =
  | string
  | number
  | { [x: string]: Json }
  | Array<Json>
  | boolean
  | null;

export type JMap = JRow[];

export type JRow = [number, ...JCell[]];

export type JCell = [number, JTile];

export type JTile = { color: Color; shape: Shape };

export type JCoordinate = { row: number; column: number };

export type JState = {
  map: JMap;
  'tile*': JTile[];
  players: JPlayer[];
};

export type JPlayer = {
  score: number;
  'tile*': JTile[];
};

export type JPlacements = OnePlacement[];
export type OnePlacement = {
  coordinate: JCoordinate;
  '1tile': JTile;
};

export type JStrategy = 'dag' | 'ldasg';

export type JAction = 'pass' | 'replace' | OnePlacement;

export type JExn = 'setup' | 'take-turn' | 'new-tiles' | 'win';

export type JActor =
  | [string, JStrategy]
  | [string, JStrategy, JExn]
  | [string, JStrategy, 'a cheat', JCheat]
  | [string, JStrategy, JExn, number];

export type JCheat =
  | 'non-adjacent-coordinate'
  | 'tile-not-owned'
  | 'not-a-line'
  | 'bad-ask-for-tiles'
  | 'no-fit';
