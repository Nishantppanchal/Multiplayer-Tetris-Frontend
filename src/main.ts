/**
 * Inside this file you will use the classes and functions from rx.js
 * to add visuals to the svg element in index.html, animate them, and make them interactive.
 *
 * Study and complete the tasks in observable exercises first to get ideas.
 *
 * Course Notes showing Asteroids in FRP: https://tgdwyer.github.io/asteroids/
 *
 * You will be marked on your functional programming style
 * as well as the functionality that you implement.
 *
 * Document your code!
 */

import './style.css';

import { of, fromEvent, interval, merge, Observable, Subject } from 'rxjs';
import { filter, map, scan, switchMap, takeWhile } from 'rxjs/operators';
import { Viewport, Constants, BlockDimensions } from './constants';
import {
  Block,
  ServerEvent,
  UIUpdate,
  ServerUpdate,
  Update,
  ServerGameState,
  GameState,
} from './types';
import { io, Socket } from 'socket.io-client';
import { getTetrominoBlocks } from './utils';
import { emptyState } from './state';

/** User input */

type Key =
  | 'KeyS'
  | 'KeyA'
  | 'KeyD'
  | 'KeyW'
  | 'Space'
  | 'KeyR'
  | 'Digit1'
  | 'Digit2';

type KeyEvent = 'keydown' | 'keyup' | 'keypress';

/** Rendering (side effects) */

/**
 * Displays a SVG element on the canvas. Brings to foreground.
 * @param elem SVG element to display
 */
const show = (elem: SVGGraphicsElement) => {
  elem.setAttribute('visibility', 'visible');
  elem.parentNode!.appendChild(elem);
};

/**
 * Hides a SVG element on the canvas.
 * @param elem SVG element to hide
 */
const hide = (elem: SVGGraphicsElement) =>
  elem.setAttribute('visibility', 'hidden');

/**
 * Creates an SVG element with the given properties.
 *
 * See https://developer.mozilla.org/en-US/docs/Web/SVG/Element for valid
 * element names and properties.
 *
 * @param namespace Namespace of the SVG element
 * @param name SVGElement name
 * @param props Properties to set on the SVG element
 * @returns SVG element
 */
const createSvgElement = (
  namespace: string | null,
  name: string,
  props: Record<string, string> = {}
) => {
  const elem = document.createElementNS(namespace, name) as SVGElement;
  Object.entries(props).forEach(([k, v]) => elem.setAttribute(k, v));
  return elem;
};

function createUIUpdate(
  oldBlocks: ReadonlyArray<Block>,
  newBlocks: ReadonlyArray<Block>
): UIUpdate {
  const renderBlocks = newBlocks.filter(
    (newBlock) => !oldBlocks.find((prevBlock) => prevBlock.id === newBlock.id)
  );
  const moveBlocks = newBlocks.filter((newBlock) =>
    oldBlocks.find(
      (prevBlock) =>
        prevBlock.id === newBlock.id &&
        (prevBlock.pos.x !== newBlock.pos.x ||
          prevBlock.pos.y !== newBlock.pos.y)
    )
  );
  const removeBlocks = oldBlocks.filter(
    (prevBlock) => !newBlocks.find((newBlock) => prevBlock.id === newBlock.id)
  );

  return {
    render: renderBlocks,
    move: moveBlocks,
    remove: removeBlocks,
  };
}

function detectChange(
  oldState: GameState | null,
  newState: ServerGameState
): GameState {
  const oldStateGridBlocks = oldState
    ? oldState.tetromino
      ? [...oldState.placedBlocks, ...getTetrominoBlocks(oldState.tetromino)]
      : newState.placedBlocks
    : [];
  const newStateGridBlocks = newState.tetromino
    ? [...newState.placedBlocks, ...getTetrominoBlocks(newState.tetromino)]
    : newState.placedBlocks;
  const oldStatePreviewBlocks =
    oldState && oldState.nextTetromino
      ? getTetrominoBlocks(oldState.nextTetromino)
      : [];
  const newStatePreviewBlocks = newState.nextTetromino
    ? getTetrominoBlocks(newState.nextTetromino)
    : [];

  return {
    ...newState,
    gridUpdate: createUIUpdate(oldStateGridBlocks, newStateGridBlocks),
    previewUpdate: createUIUpdate(oldStatePreviewBlocks, newStatePreviewBlocks),
  };
}

const removeAll = (
  oldState: GameState,
  newState: ServerGameState | null
): GameState => ({
  ...(newState ? newState : emptyState),
  gridUpdate: {
    render: [],
    move: [],
    remove: [
      ...oldState.placedBlocks,
      ...(oldState.tetromino ? getTetrominoBlocks(oldState.tetromino) : []),
    ],
  },
  previewUpdate: {
    render: [],
    move: [],
    remove: oldState.nextTetromino
      ? [...getTetrominoBlocks(oldState.nextTetromino)]
      : [],
  },
});

/**
 * This is the function called on page load. Your main game loop
 * should be called here.
 */
function main() {
  // Canvas elements
  const canvasElements = {
    player: {
      displayDiv: document.querySelector(
        '#player-displayDiv'
      ) as SVGGraphicsElement & HTMLElement,
      playerTag: document.querySelector('#player-tag') as SVGGraphicsElement &
        HTMLElement,
      svg: document.querySelector('#player-svgCanvas') as SVGGraphicsElement &
        HTMLElement,
      preview: document.querySelector(
        '#player-svgPreview'
      ) as SVGGraphicsElement & HTMLElement,
      gameOver: document.querySelector(
        '#player-gameOver'
      ) as SVGGraphicsElement & HTMLElement,
      matchMaking: document.querySelector(
        '#player-matchMaking'
      ) as SVGGraphicsElement & HTMLElement,
      container: document.querySelector('#player-main') as HTMLElement,
    },
    opponent: {
      displayDiv: document.querySelector(
        '#opponent-displayDiv'
      ) as SVGGraphicsElement & HTMLElement,
      svg: document.querySelector('#opponent-svgCanvas') as SVGGraphicsElement &
        HTMLElement,
      preview: document.querySelector(
        '#opponent-svgPreview'
      ) as SVGGraphicsElement & HTMLElement,
      gameOver: document.querySelector(
        '#opponent-gameOver'
      ) as SVGGraphicsElement & HTMLElement,
      matchMaking: document.querySelector(
        '#opponent-matchMaking'
      ) as SVGGraphicsElement & HTMLElement,
      container: document.querySelector('#opponent-main') as HTMLElement,
    },
  };

  canvasElements.player.svg.setAttribute('height', `${Viewport.CANVAS_HEIGHT}`);
  canvasElements.player.svg.setAttribute('width', `${Viewport.CANVAS_WIDTH}`);
  canvasElements.player.preview.setAttribute(
    'height',
    `${Viewport.PREVIEW_HEIGHT}`
  );
  canvasElements.player.preview.setAttribute(
    'width',
    `${Viewport.PREVIEW_WIDTH}`
  );

  canvasElements.opponent.svg.setAttribute(
    'height',
    `${Viewport.CANVAS_HEIGHT}`
  );
  canvasElements.opponent.svg.setAttribute('width', `${Viewport.CANVAS_WIDTH}`);
  canvasElements.opponent.preview.setAttribute(
    'height',
    `${Viewport.PREVIEW_HEIGHT}`
  );
  canvasElements.opponent.preview.setAttribute(
    'width',
    `${Viewport.PREVIEW_WIDTH}`
  );

  const hideOpponent = () => {
    canvasElements.opponent.displayDiv.setAttribute('style', 'display: none;');
    canvasElements.player.playerTag.setAttribute('style', 'display: none;');
  };
  const showOpponent = () => {
    canvasElements.opponent.displayDiv.setAttribute('style', 'display: block;');
    canvasElements.player.playerTag.setAttribute('style', 'display: block;');
  };

  // Text fields
  const textFields = {
    player: {
      levelText: document.querySelector('#player-levelText') as HTMLElement,
      scoreText: document.querySelector('#player-scoreText') as HTMLElement,
      highScoreText: document.querySelector(
        '#player-highScoreText'
      ) as HTMLElement,
    },
    opponent: {
      levelText: document.querySelector('#opponent-levelText') as HTMLElement,
      scoreText: document.querySelector('#opponent-scoreText') as HTMLElement,
      highScoreText: document.querySelector(
        '#opponent-highScoreText'
      ) as HTMLElement,
    },
  };

  /** User input */

  const key$ = fromEvent<KeyboardEvent>(document, 'keypress');

  const fromKey = <T>(keyCode: Key, result: () => T) =>
    key$.pipe(
      filter(({ code }) => code === keyCode),
      map(result)
    );

  // const left$ = fromKey('KeyA', () => new Left());
  // const right$ = fromKey('KeyD', () => new Right());
  // const down$ = fromKey('Space', () => new Space());
  // const up$ = fromKey('KeyW', () => new Up());
  // const r$ = fromKey('KeyR', () => new Reset());
  const left$: Observable<ServerEvent> = fromKey('KeyA', () => 'left');
  const right$: Observable<ServerEvent> = fromKey('KeyD', () => 'right');
  const down$: Observable<ServerEvent> = fromKey('Space', () => 'smash');
  const up$: Observable<ServerEvent> = fromKey('KeyW', () => 'rotate');
  const r$: Observable<ServerEvent> = fromKey('KeyR', () => 'reset');
  const singlePlayer$: Observable<ServerEvent> = fromKey(
    'Digit1',
    () => 'new SPG'
  );
  const multiPlayer$: Observable<ServerEvent> = fromKey(
    'Digit2',
    () => 'new MPG'
  );

  /** Observables */

  /**
   * Renders the current state to the canvas.
   *
   * In MVC terms, this updates the View using the Model.
   *
   * @param s Current state
   */
  const render = (
    s: GameState,
    a: 'player' | 'opponent',
    highScore: number
  ) => {
    textFields[a].scoreText.textContent = `${s.stats.score}`;
    textFields[a].levelText.textContent = `${s.stats.level}`;
    textFields[a].highScoreText.textContent = `${highScore}`;

    s.gridUpdate.remove.forEach(({ id }) => {
      const blockSvg = document.getElementById(`${a}-${id}`);
      blockSvg !== null && canvasElements[a].svg.removeChild(blockSvg);
    });

    s.previewUpdate.remove.forEach(({ id }) => {
      const blockSvg = document.getElementById(`${a}-${id}`);
      blockSvg !== null && canvasElements[a].preview.removeChild(blockSvg);
    });

    s.gridUpdate.move.forEach(({ pos, id }) => {
      const blockSvg = document.getElementById(`${a}-${id}`);
      if (blockSvg !== null) {
        blockSvg.setAttribute('x', `${pos.x}`);
        blockSvg.setAttribute('y', `${pos.y}`);
      }
    });
    s.previewUpdate.move.forEach(({ pos, id }) => {
      const blockSvg = document.getElementById(`${a}-${id}`);
      if (blockSvg !== null) {
        blockSvg.setAttribute('x', `${pos.x}`);
        blockSvg.setAttribute('y', `${pos.y}`);
      }
    });

    canvasElements[a].svg.append(
      ...s.gridUpdate.render.map(({ pos, color, id }) =>
        createSvgElement(canvasElements[a].svg.namespaceURI, 'rect', {
          height: `${BlockDimensions.HEIGHT}`,
          width: `${BlockDimensions.WIDTH}`,
          x: `${pos.x}`,
          y: `${pos.y}`,
          style: `fill: ${color}`,
          id: `${a}-${id}`,
        })
      )
    );
    canvasElements[a].preview.append(
      ...s.previewUpdate.render.map(({ pos, color, id }) =>
        createSvgElement(canvasElements[a].preview.namespaceURI, 'rect', {
          height: `${BlockDimensions.HEIGHT}`,
          width: `${BlockDimensions.WIDTH}`,
          x: `${pos.x}`,
          y: `${pos.y}`,
          style: `fill: ${color}`,
          id: `${a}-${id}`,
        })
      )
    );
  };

  const processUpdate = (
    prevUpdate: Update,
    currUpdate: ServerUpdate
  ): Update => {
    if (!prevUpdate.gameEnd && currUpdate.gameEnd) {
      return {
        ...currUpdate,
        player1:
          prevUpdate.player1 && currUpdate.player1
            ? {
                ...currUpdate.player1,
                gameState: removeAll(
                  prevUpdate.player1.gameState,
                  currUpdate.player1.gameState
                ),
              }
            : null,
        player2:
          prevUpdate.player2 && currUpdate.player2
            ? {
                ...currUpdate.player2,
                gameState: removeAll(
                  prevUpdate.player2.gameState,
                  currUpdate.player2.gameState
                ),
              }
            : null,
      };
    } else {
      return {
        ...currUpdate,
        player1: currUpdate.player1
          ? {
              ...currUpdate.player1,
              gameState: detectChange(
                prevUpdate.player1 ? prevUpdate.player1.gameState : null,
                currUpdate.player1.gameState
              ),
            }
          : null,
        player2: currUpdate.player2
          ? {
              ...currUpdate.player2,
              gameState: detectChange(
                prevUpdate.player2 ? prevUpdate.player2.gameState : null,
                currUpdate.player2.gameState
              ),
            }
          : null,
      };
    }
  };

  const socket: Socket = io('http://localhost:3000');
  const update$ = new Subject<ServerUpdate>();
  socket.on('update', (data: ServerUpdate) => {
    update$.next(data);
  });

  merge(left$, right$, up$, down$, r$, singlePlayer$, multiPlayer$).subscribe(
    (e: ServerEvent) => {
      if (e === 'new SPG') hideOpponent();
      else if (e === 'new MPG') {
        showOpponent();
        show(canvasElements.player.matchMaking);
        show(canvasElements.opponent.matchMaking);
      }
      socket.emit('input', e);
    }
  );
  update$.subscribe((update) => console.log(update));

  update$
    .pipe(
      scan(processUpdate, {
        gameEnd: false,
        matchMaking: false,
        player: 'player1',
        player1: null,
        player2: null,
      })
      //   scan(
      //     (prevUpdate: ServerUpdate, currUpdate): ServerUpdate =>
      //       prevUpdate.gameEnd
      //         ? {
      //             ...currUpdate,
      //             player1:
      //               prevUpdate.player1 && currUpdate.player1
      //                 ? removeAll(prevUpdate.player1, currUpdate.player1)
      //                 : currUpdate.player1,
      //             player2:
      //               prevUpdate.player2 && currUpdate.player2
      //                 ? removeAll(prevUpdate.player2, currUpdate.player2)
      //                 : currUpdate.player2,
      //           }
      //         : currUpdate,
      //     {
      //       gameEnd: false,
      //       player: 'player1',
      //       player1: null,
      //       player2: null,
      //     }
      //   )
    )
    .subscribe((update: Update) => {
      console.log(update);
      if (update.player === 'player1' && update.player1) {
        render(update.player1.gameState, 'player', update.player1.highScore);
        if (update.player2)
          render(
            update.player2.gameState,
            'opponent',
            update.player2.highScore
          );
      } else if (update.player === 'player2' && update.player2) {
        render(update.player2.gameState, 'player', update.player2.highScore);
        if (update.player1)
          render(
            update.player1.gameState,
            'opponent',
            update.player1.highScore
          );
      }

      if (update.matchMaking) {
        show(canvasElements.player.matchMaking);
        show(canvasElements.opponent.matchMaking);
      } else if (update.gameEnd) {
        hide(canvasElements.player.matchMaking);
        hide(canvasElements.opponent.matchMaking);
        show(canvasElements.player.gameOver);
        show(canvasElements.opponent.gameOver);
      } else {
        hide(canvasElements.player.matchMaking);
        hide(canvasElements.opponent.matchMaking);
        hide(canvasElements.player.gameOver);
        hide(canvasElements.opponent.gameOver);
      }

      if (update.player2) {
        showOpponent();
      } else {
        hideOpponent();
      }
    });
}

// The following simply runs your main function on window load.  Make sure to leave it in place.
if (typeof window !== 'undefined') {
  window.onload = () => {
    main();
  };
}
