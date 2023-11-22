import {
  Color,
  Shape,
  colorList,
  shapeList
} from '../../../game/types/map.types';
import {
  Json,
  JPlacements,
  OnePlacement,
  JMap,
  JRow,
  JCell,
  JCoordinate,
  JTile
} from '../types';

export function mustParseAsJPlacements(json: Json): JPlacements {
  if (!Array.isArray(json)) {
    throw new Error('invalid JPlacements');
  }
  return json.map((json) => mustParseAsOnePlacement(json));
}

function mustParseAsOnePlacement(json: Json): OnePlacement {
  if (
    typeof json !== 'object' ||
    Array.isArray(json) ||
    json === null ||
    typeof json['coordinate'] !== 'object' ||
    typeof json['1tile'] !== 'object'
  ) {
    throw new Error('invalid 1Placement');
  }
  return {
    coordinate: mustParseAsJCoordinate(json['coordinate']),
    '1tile': mustParseAsJTile(json['1tile'])
  };
}

export function mustParseAsJMap(json: Json): JMap {
  if (!Array.isArray(json)) {
    throw new Error('invalid JMap');
  }
  return json.map((json) => mustParseAsJRow(json));
}

function mustParseAsJRow(json: Json): JRow {
  if (!Array.isArray(json) || json.length < 2 || typeof json[0] !== 'number') {
    throw new Error('invalid JRow');
  }
  return [json[0], ...json.slice(1).map((json) => mustParseAsJCell(json))];
}

function mustParseAsJCell(json: Json): JCell {
  if (
    !Array.isArray(json) ||
    json.length != 2 ||
    typeof json[0] !== 'number' ||
    typeof json[1] !== 'object'
  ) {
    throw new Error('invalid JCell');
  }
  return [json[0], mustParseAsJTile(json[1])];
}

export function mustParseAsJCoordinate(json: Json): JCoordinate {
  if (
    typeof json !== 'object' ||
    Array.isArray(json) ||
    json === null ||
    typeof json['row'] !== 'number' ||
    typeof json['column'] !== 'number'
  ) {
    throw new Error('invalid JCoordinate');
  }
  return {
    row: json['row'],
    column: json['column']
  };
}

export function mustParseAsJTile(json: Json): JTile {
  if (typeof json !== 'object' || Array.isArray(json) || json === null) {
    throw new Error('invalid JTile');
  }
  if (!isShape(json['shape'])) {
    throw new Error('specified shape is invalid');
  }
  if (!isColor(json['color'])) {
    throw new Error('specified color is invalid');
  }
  return {
    shape: json['shape'],
    color: json['color']
  };
}

const isShape = (x: unknown): x is Shape => shapeList.includes(x as Shape);

const isColor = (x: unknown): x is Color => colorList.includes(x as Color);
