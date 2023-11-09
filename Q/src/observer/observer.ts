import puppeteer from 'puppeteer';
import { QTile, ShapeColorTile } from '../game/map/tile';
import { RenderableGameState } from '../game/types/gameState.types';
import { gameStateHtmlBuilder } from '../game/graphicalRenderer/HtmlRendererUtils/htmlBuilder';
import { createWindow } from '../electron/main/gameStateWindow';
import { TILE_SCALE } from '../constants';

import { writeFile } from 'fs';
import { toJState } from './parser';
/**
 * Interface for observing a game.
 * Provides functionality for receiving game state updates and game over
 * notifications.
 */
export interface ObserverAPI<T extends QTile> {
  /**
   * Receives an updated game state which can be used to render the game.
   * @param gameState the game data which is available for observation
   */
  receiveState(gameState: RenderableGameState<T>): void;

  /**
   * Alerts the observer that no more states will be received.
   * @param gameState the final game state data from the referee's perspective
   * @param winnerNames the names of the winners of the game
   * @param eliminatedNames the names of the eliminated players
   */
  gameOver(
    gameState: RenderableGameState<T>,
    winnerNames: string[],
    eliminatedNames: string[]
  ): void;

  /**
   * Moves the observer's current game state to the chronological next state.
   * If there is no next state, the observer's state will not change.
   */
  nextState(): void;

  /**
   * Moves the observer's current game state to the chronological previous state.
   * If there is no previous state, the observer's state will not change.
   */
  previousState(): void;

  /**
   * Saves the current game state as a JState to a specified JSON file.
   */
  saveState(filepath: string): void;

  // TODO Check for correctness
  /**
   * Sets the callback function for updating the GUI view.
   * @param updateViewCallback the callback function for updating the GUI view
   */
  setUpdateViewCallback(updateViewCallback: (html: string) => void): void;

  /**
   * Sets the callback function for displaying the end game card.
   * @param endGameCallback the callback function for displaying the end game card
   */
  setEndGameCallback(
    endGameCallback: (gameStateHtml: string, endGameCardHtml: string) => void
  ): void;
}

export class BaseObserver<T extends ShapeColorTile> implements ObserverAPI<T> {
  stateHistory: RenderableGameState<T>[];
  currenStateIndex: number;
  updateViewCallback: (html: string) => void;
  endGameCallback: (gameStateHtml: string, endGameCardHtml: string) => void;

  constructor() {
    this.stateHistory = [];
    this.currenStateIndex = 0;
    this.updateViewCallback = () => {};
    // TODO make a then for end game so it always runs if called
    this.endGameCallback = () => {};
    createWindow(this);
  }

  public gameOver(
    gameState: RenderableGameState<T>,
    winnerNames: string[],
    eliminatedNames: string[]
  ) {
    this.endGameCallback(
      this.toHtmlView(gameState),
      this.makeGameOverCard(winnerNames, eliminatedNames)
    );
  }

  private makeGameOverCard(winners: string[], eliminated: string[]): string {
    return '<h1> GAME OVER </h1>';
  }

  public receiveState(gameState: RenderableGameState<T>) {
    this.saveStateToMemory(gameState);
    this.saveStateToImage(this.stateHistory.length - 1);
    this.updateGUIView();
  }

  private saveStateToMemory(gameState: RenderableGameState<T>) {
    this.stateHistory.push(gameState);
  }

  private saveStateToImage(gameStateIndex: number) {
    const gameState = this.stateHistory[gameStateIndex];
    this.saveHtmlToImage(
      this.toHtmlView(gameState),
      `${gameStateIndex}.png`,
      this.calculateHeightAndWidth(gameState)
    );
  }

  private toHtmlView(gameState: RenderableGameState<T>): string {
    return gameStateHtmlBuilder(gameState);
  }

  private calculateHeightAndWidth(gameState: RenderableGameState<T>) {
    const dimensions = gameState.mapState.dimensions;
    const width = (dimensions.rightmost + 1 - dimensions.leftmost) * TILE_SCALE;
    const height =
      (dimensions.topmost + 1 - dimensions.bottommost) * TILE_SCALE;
    return { width, height };
  }

  private async saveHtmlToImage(
    html: string,
    outputPath: string,
    widthAndHeight: { width: number; height: number }
  ) {
    // const browser = await puppeteer.launch({ headless: 'new' });
    // const page = await browser.newPage();
    // await page.setContent(html);
    // // await page.setViewport(widthAndHeight);
    // await page.screenshot({ path: outputPath });
    // await browser.close();
  }

  public nextState() {
    if (this.currenStateIndex < this.stateHistory.length - 1) {
      this.currenStateIndex++;
      this.updateGUIView();
    }
  }

  public previousState() {
    if (this.currenStateIndex > 0) {
      this.currenStateIndex--;
      this.updateGUIView();
    }
  }

  public saveState(filepath: string): void {
    const jstate = toJState(this.stateHistory[this.currenStateIndex]);
    saveJsonToFilePath(jstate, filepath);
  }

  public setUpdateViewCallback(
    updateViewCallback: (html: string) => void
  ): void {
    this.updateViewCallback = updateViewCallback;
  }

  private updateGUIView() {
    this.updateViewCallback(
      this.toHtmlView(this.stateHistory[this.currenStateIndex])
    );
  }

  public setEndGameCallback(
    endGameCallback: (gameStateHtml: string, endGameCardHtml: string) => void
  ): void {
    this.endGameCallback = endGameCallback;
  }
}

function saveJsonToFilePath(json: Object, filePath: string) {
  const jsonString = JSON.stringify(json);
  writeFile(filePath, jsonString, 'utf8', (err) => {
    if (err) {
      console.error('An error occurred:', err);
      return;
    }
    console.log('File has been saved.');
  });
}
