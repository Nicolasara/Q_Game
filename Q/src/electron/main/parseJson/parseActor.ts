import { JActor, JCheat, JExn, JStrategy, Json } from '../types';

export function mustParseAsJActors(json: Json): JActor[] {
  if (!Array.isArray(json)) {
    throw new Error('invalid JActors array');
  }

  return json.map((j) => mustParseAsSingleActor(j));
}

function mustParseAsSingleActor(json: unknown): JActor {
  if (isSimpleJActor(json)) {
    return mustParseAsSimpleJActor(json);
  }
  if (isExceptionJActor(json)) {
    return mustParseAsExceptionJActor(json);
  }
  if (isCheatJActor(json)) {
    return mustParseAsCheatJActor(json);
  }
  if (isDelayedInfiniteLoopJActor(json)) {
    return mustParseAsDelayedInfiniteLoopJActor(json);
  }
  throw new Error('invalid JActor');
}

export function isSimpleJActor(json: unknown): json is [string, JStrategy] {
  return isArrayWithLength(json, 2) && isJName(json[0]) && isJStrategy(json[1]);
}

function mustParseAsSimpleJActor(json: unknown): JActor {
  if (!isSimpleJActor(json)) {
    throw new Error('invalid JActor');
  }
  return json;
}

function isJName(json: unknown): json is string {
  return typeof json === 'string';
}

function isJStrategy(json: unknown): json is JStrategy {
  return json === 'dag' || json === 'ldasg';
}

export function isExceptionJActor(
  json: unknown
): json is [string, JStrategy, JExn] {
  return (
    isArrayWithLength(json, 3) &&
    isJName(json[0]) &&
    isJStrategy(json[1]) &&
    isJExn(json[2])
  );
}

function mustParseAsExceptionJActor(json: unknown): JActor {
  if (!isExceptionJActor(json)) {
    throw new Error('invalid JActor');
  }
  return json;
}

/**
 * checks if the input is of type JExn
 *
 * @param input the input to validate
 */
function isJExn(input: unknown): input is JExn {
  return (
    input === 'setup' ||
    input === 'take-turn' ||
    input === 'new-tiles' ||
    input === 'win'
  );
}

export function isCheatJActor(
  json: unknown
): json is [string, JStrategy, 'a cheat', JCheat] {
  return (
    isArrayWithLength(json, 4) &&
    isJName(json[0]) &&
    isJStrategy(json[1]) &&
    json[2] === 'a cheat' &&
    isJCheat(json[3])
  );
}

function mustParseAsCheatJActor(json: unknown): JActor {
  if (!isCheatJActor(json)) {
    throw new Error('invalid JActor');
  }
  return json;
}

/**
 * checks if the input is of type JCheat
 *
 * @param input the input to validate
 */
function isJCheat(input: unknown): input is JCheat {
  return (
    input === 'non-adjacent-coordinate' ||
    input === 'tile-not-owned' ||
    input === 'not-a-line' ||
    input === 'bad-ask-for-tiles' ||
    input === 'no-fit'
  );
}

export function isDelayedInfiniteLoopJActor(
  json: unknown
): json is [string, JStrategy, JExn, number] {
  return (
    isArrayWithLength(json, 4) &&
    isJName(json[0]) &&
    isJStrategy(json[1]) &&
    isJExn(json[2]) &&
    isCount(json[3])
  );
}

function mustParseAsDelayedInfiniteLoopJActor(json: unknown): JActor {
  if (!isDelayedInfiniteLoopJActor(json)) {
    throw new Error('invalid JActor');
  }
  return json;
}

function isCount(input: unknown): input is number {
  return typeof input === 'number';
}

function isArrayWithLength(json: unknown, length: number): json is unknown[] {
  return Array.isArray(json) && json.length === length;
}
