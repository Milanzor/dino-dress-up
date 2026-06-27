/**
 * main.ts — bootstrap. Grab the canvas + UI root and start the game.
 */

import { GameApp } from './app/GameApp'

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null
const uiRoot = document.getElementById('ui-root')

if (!canvas || !uiRoot) {
  throw new Error('Missing #game-canvas or #ui-root in index.html')
}

const app = new GameApp(canvas, uiRoot)
void app.start()

// Handy for debugging in the browser console; harmless in production.
;(window as unknown as { __dino?: GameApp }).__dino = app
