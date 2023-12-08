import puppeteer from 'puppeteer';
import { RenderableGameState } from '../game/types/gameState.types';
import { gameStateHtmlBuilder } from '../game/graphicalRenderer/htmlBuilder';
import { createWindow } from '../electron/main/gameStateWindow';
import { writeFile, existsSync, mkdirSync } from 'fs';
import { toJState } from '../json/serialize/jState';

/**
 * Interface for observing a game.
 * Provides functionality for receiving game state updates and game over
 * notifications.
 */
export interface Observer {
  /**
   * Receives an updated game state which can be used to render the game.
   * @param gameState the game data which is available for observation
   */
  receiveState(gameState: RenderableGameState): void;

  /**
   * Alerts the observer that no more states will be received.
   * @param gameState the final game state data from the referee's perspective
   * @param winnerNames the names of the winners of the game
   * @param eliminatedNames the names of the eliminated players
   */
  gameOver(
    gameState: RenderableGameState,
    winnerNames: string[],
    eliminatedNames: string[]
  ): void;
}

/**
 * Interface for the api of an observer, which provides functionality for
 * controlling the observer's state, and interacts with the GUI.
 */
export interface ObserverAPI {
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

export class BaseObserver implements Observer, ObserverAPI {
  stateHistory: RenderableGameState[];
  currentStateIndex: number;
  updateViewCallback: (html: string) => void;
  endGameCallback: (gameStateHtml: string, endGameCardHtml: string) => void;

  constructor() {
    this.stateHistory = [];
    this.currentStateIndex = 0;
    this.updateViewCallback = () => {};
    this.endGameCallback = () => {};
    createWindow(this);
  }

  public gameOver(
    gameState: RenderableGameState,
    winnerNames: string[],
    eliminatedNames: string[]
  ) {
    this.endGameCallback(
      gameStateHtmlBuilder(gameState),
      this.makeGameOverCard(winnerNames, eliminatedNames)
    );
  }

  private makeGameOverCard(winners: string[], eliminated: string[]): string {
    return `<div>
        <h1> GAME OVER</h1>
        ${winners.map((winner) => `<h2> ${winner} wins! </h2>`).join('\n')}
        ${eliminated
          .map(
            (eliminatedPlayer) => `<h2> ${eliminatedPlayer} was a baddie! </h2>`
          )
          .join('\n')}
      </div>`;
  }

  public receiveState(gameState: RenderableGameState) {
    this.saveStateToMemory(gameState);
    this.saveStateToImage(this.stateHistory.length - 1);
    this.updateGUIView();
  }

  private saveStateToMemory(gameState: RenderableGameState) {
    this.stateHistory.push(gameState);
  }

  private saveStateToImage(gameStateIndex: number) {
    const gameState = this.stateHistory[gameStateIndex];

    const tmpFolderPath = 'Tmp';
    if (!existsSync(tmpFolderPath)) {
      mkdirSync(tmpFolderPath);
    }

    this.saveHtmlToImage(
      gameStateHtmlBuilder(gameState),
      `${tmpFolderPath}/${gameStateIndex}.png`
    );
  }

  /**
   * Saves an html string to an image file.
   * @param html the html string to save
   * @param outputPath the path to save the image to
   */
  private async saveHtmlToImage(html: string, outputPath: string) {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.setContent(html);
    await page.screenshot({ path: outputPath });
    await browser.close();
  }

  public nextState() {
    if (this.currentStateIndex < this.stateHistory.length - 1) {
      this.currentStateIndex++;
      this.updateGUIView();
    }
  }

  public previousState() {
    if (this.currentStateIndex > 0) {
      this.currentStateIndex--;
      this.updateGUIView();
    }
  }

  public saveState(filepath: string): void {
    const jstate = toJState(this.stateHistory[this.currentStateIndex]);
    saveJsonToFilePath(JSON.stringify(jstate), filepath);
  }

  public setUpdateViewCallback(
    updateViewCallback: (html: string) => void
  ): void {
    this.updateViewCallback = updateViewCallback;
  }

  /**
   * Updates the GUI view to the current state.
   */
  private updateGUIView() {
    this.updateViewCallback(
      gameStateHtmlBuilder(this.stateHistory[this.currentStateIndex])
    );
  }

  public setEndGameCallback(
    endGameCallback: (gameStateHtml: string, endGameCardHtml: string) => void
  ): void {
    this.endGameCallback = endGameCallback;
  }
}

function saveJsonToFilePath(jsonString: string, filePath: string) {
  writeFile(filePath, jsonString, 'utf8', (err) => {
    if (err) {
      console.error('An error occurred:', err);
      return;
    }
    console.error('File has been saved.');
  });
}
