import * as net from 'net';
import { Connection, TCPConnection } from '../connection';
import { TCPPlayer } from './playerProxy';
import { Player } from '../../player/player';
import { BaseReferee } from '../../referee/referee';
import { ConfiguredRulebook } from '../../game/rules/ruleBook';
import { SERVER_MAX_PLAYERS, SERVER_MIN_PLAYERS } from '../../constants';
import { GameResult } from '../../referee/referee.types';
import {
  DEFAULT_SERVER_CONFIG,
  ServerConfig
} from '../../json/config/serverConfig';
import { BaseObserver, Observer } from '../../observer/observer';
import { toQGameState } from '../../json/deserialize/qState';
import { RefereeConfig } from '../../json/config/refereeConfig';
import { toMs } from '../../utils';
import { DebugLog } from '../debugLog';

const EMPTY_RESULT: GameResult = [[], []];

let debug: DebugLog | undefined;

/**
 * Runs a game over TCP. Waits for a minimum number of remote clients to connect and
 * sign up during a waiting period. Re-enters the waiting state for a given number
 * of attempts. If the minimum number of players is not met and all waiting periods
 * have been exhausted the server doesn’t run a game and instead delivers a empty result.
 *
 * The steps are as follows:
 *  1) Create a TCP server and wait for players to connect
 *  2) On connect, create a `TCPConnection` using the `Socket` and create a
 *     `TCPPlayer` using the new `TCPConnection`
 *  3) On the first connection, wait for additional players to connect
 *    3.1) While there are less than the maximum number of players, keep waiting.
 *    3.2) If the wait time has exceeded the maximum wait time, check if there
 *         are enough players to run the game.
 *     3.2.1) If there are enough players to run the game, jump to step (4).
 *       3.2.2) If there are not enough players to run the game, check if the wait
 *             period has already been restarted the maximum number of times.
 *        3.2.2.1) If no, start an additional wait period, jumping back to step (3.1).
 *        3.2.2.2) If yes, jump to step (4).
 *  4) If there are enough players to run the game, start the game, passing the
 *     referee the `TCPPlayer`s to run the game with. Otherwise, do not run the game
 *     and return an empty result
 *
 * @returns the result of the game
 */
export async function runTCPGame(config = DEFAULT_SERVER_CONFIG) {
  debug = new DebugLog(!config.quiet);
  debug.log('running TCP game in func');
  const players: Player[] = [];
  const connections: Connection[] = [];
  const server = net.createServer();

  debug.log('starting server');
  server.listen(config.port);
  debug.log(`server started listening on port ${config.port}`);

  const enoughPlayersToRun = await new Promise<boolean>((resolve) => {
    server.once('connection', () => {
      waitForAdditionalPlayers(players, config).then(resolve);
    });
  });

  server.on('connection', (socket) =>
    handleConnection(socket, connections, players, config)
  );

  const gameResult = await runGameIfPossible(
    enoughPlayersToRun,
    players,
    config
  );

  terminateConnections(connections);
  server.close();
  return gameResult;
}

/**
 * Handles a new connection, adding the new connection to the list of connections and signing up the player.
 *
 * @param socket the socket to create a connection from
 * @param connections the list of connections to add the new connection to
 * @param players the list of players to add the new player to
 * @param config the server config
 */
function handleConnection(
  socket: net.Socket,
  connections: Connection[],
  players: Player[],
  config: ServerConfig
) {
  debug?.log('received connection on the server');

  const maxResponseWait = Math.max(
    config['wait-for-signup'],
    config['ref-spec']['per-turn']
  );
  const newConnection = new TCPConnection(socket);
  connections.push(newConnection);
  signUp(new TCPPlayer(newConnection, maxResponseWait), players, config);
}

/**
 * Attempts to wait for additional players to connect to the game.
 *
 * This is a asynchronous operation which relies on the callbacks triggering when
 * a client connects mutating the players array while this function is running.
 *
 * @param players the player list which new players are added to as they connect.
 * @param attempt the number of times the wait period has been tried
 * @returns true if the game should be run, false otherwise
 */
function waitForAdditionalPlayers(
  players: Player[],
  config: ServerConfig,
  attempt = 1
): Promise<boolean> {
  debug?.log('waiting for additional players');
  const serverWaitMs = toMs(config['server-wait']);

  return new Promise<boolean>((resolve) => {
    const start = Date.now();
    const checkIntervalMs = 200; // check every 200ms
    const intervalId = setInterval(() => {
      if (players.length >= SERVER_MAX_PLAYERS) {
        clearInterval(intervalId);
        resolve(true);
      } else if (Date.now() >= start + serverWaitMs) {
        if (players.length >= SERVER_MIN_PLAYERS) {
          clearInterval(intervalId);
          resolve(true);
        } else if (attempt < config['server-tries']) {
          debug?.log(
            `not enough players, restarting wait period ${attempt}, will retry ${config['server-tries']} times`
          );
          clearInterval(intervalId);
          waitForAdditionalPlayers(players, config, attempt + 1).then(resolve);
        } else {
          clearInterval(intervalId);
          resolve(false);
        }
      }
    }, checkIntervalMs);
  });
}

/**
 * Runs a game if there are enough players to run the game. Otherwise, informs all players that the game will not be run.
 *
 * @param enoughPlayersToRun wether or not there are enough players to run the game.
 * @param players the players to run the game with
 * @param config the server config
 * @returns the result of the game
 */
async function runGameIfPossible(
  enoughPlayersToRun: boolean,
  players: Player[],
  config: ServerConfig
): Promise<GameResult> {
  if (enoughPlayersToRun) {
    const playerNames = await Promise.all(players.map((p) => p.name()));
    debug?.log(`running game with players ${playerNames.join(', ')}`);
    const gameResults = await startGame(players, config['ref-spec']);
    return gameResults;
  }
  informPlayersOfNoGame(players);
  return EMPTY_RESULT;
}

/**
 * Attempts to inform all players that the game will not be run.
 * @param players the players to inform
 */
function informPlayersOfNoGame(players: Player[]) {
  players.forEach((player) => {
    try {
      player.win(false);
    } catch (e) {
      // ignore
    }
  });
}

/**
 * Terminates all connections.
 *
 * @param connections the client connections to terminate.
 */
function terminateConnections(connections: Connection[]) {
  connections.forEach((connection) => connection.close());
}

/**
 * Runs a game with the given players.
 * @param players the players to run the game with
 * @param refereeConfig the referee configuration to run the game with
 *
 * @returns the result of the game
 */
async function startGame(
  players: Player[],
  refereeConfig: RefereeConfig
): Promise<GameResult> {
  const gameState = await toQGameState(refereeConfig.state0, players);
  const observers: Observer[] = [];
  if (refereeConfig.observe) {
    observers.push(new BaseObserver());
  }
  const turnTimeMS = toMs(refereeConfig['per-turn']);
  return await BaseReferee(
    players,
    observers,
    new ConfiguredRulebook(
      refereeConfig['config-s'].fbo,
      refereeConfig['config-s'].qbo
    ),
    gameState,
    turnTimeMS
  );
}

/**
 * Attempts to sign up a player by asking for their name. If the player
 * responds in time, they are added to the given list of players.
 *
 * @mutates players
 *
 * @param player the player to sign up
 * @param players the list of players to add the player to if they respond in
 * time
 */
async function signUp(
  player: Player,
  players: Player[],
  config: ServerConfig
): Promise<void> {
  const waitForSignupMs = toMs(config['wait-for-signup']);
  debug?.log(`waiting for signup for ${waitForSignupMs}ms`);
  await Promise.race([
    player.name().then((name) => {
      debug?.log(`received signup from ${name}`);
      players.push(player);
    }),
    new Promise((_, reject) => {
      setTimeout(() => {
        reject();
      }, waitForSignupMs);
    })
  ]).catch(() => {
    debug?.log('signup timed out');
  });
}
