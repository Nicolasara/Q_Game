import { BaseBagOfTiles } from '../../game/gameState/bagOfTiles';
import { BaseGameState } from '../../game/gameState/gameState';
import PlayerTurnQueue from '../../game/gameState/playerTurnQueue';
import { BaseTile } from '../../game/map/tile';
import { BaseRuleBook } from '../../game/rules/ruleBook';
import { BaseObserver } from '../../observer/observer';
import { BaseReferee } from '../../referee/referee';
import { mustParseAsJActors } from './parseJson/parseActor';
import { mustParseAsJState } from './parseJson/parseState';
import { toQPlayers } from './parseQ/qActor';
import { toQState } from './parseQ/qState';
import { JState, JActor, Json } from './types';
import { validateJActors } from './validate/validateJActors';
import { validateJState } from './validate/validateJState';
import JSONStream from 'JSONStream';

let inputState: JState | undefined = undefined;
let inputActors: JActor[] | undefined = undefined;

export function processInputAndRunGame(observers: BaseObserver<BaseTile>[]) {
  processInput();
  runGame(observers);
}

function processInput() {
  process.stdin.pipe(JSONStream.parse()).on('data', (data: Json) => {
    if (!inputState) {
      inputState = mustParseAsJState(data);
      return;
    }
    if (!inputActors) {
      inputActors = mustParseAsJActors(data);
      return;
    }
    throw new Error('invalid JSON input, JPub and JStrategy already specified');
  });
}

// TODO: Does this require that stdin is closed before triggering?
function runGame(observers: BaseObserver<BaseTile>[]) {
  process.stdin.on('end', () => {
    if (!inputState || !inputActors) {
      throw new Error('invalid JSON input, JPub and JStrategy not defined');
    }

    validateJState(inputState);
    validateJActors(inputActors);

    if (inputState.players.length !== inputActors.length) {
      throw new Error(
        'The array of JPlayers in JState must contain as many players as the JActors.'
      );
    }

    const rulebook = new BaseRuleBook();

    const players = toQPlayers(inputActors, rulebook);

    const { qMap, qTilesInBag, playerStates } = toQState(inputState, players);

    const qBagOfTiles = new BaseBagOfTiles(qTilesInBag);
    const qPlayerTurnQueue = new PlayerTurnQueue<BaseTile>(playerStates);

    const qGameState = new BaseGameState(qMap, qPlayerTurnQueue, qBagOfTiles);

    const [winners, eliminated] = BaseReferee(
      players,
      observers,
      rulebook,
      qGameState
    );
    winners.sort();

    process.stdout.write(JSON.stringify([winners, eliminated]));

    if (observers.length == 0) {
      process.exit();
    }
  });
}
