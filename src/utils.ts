import { BlockDimensions } from './constants';
import { Block, Tetromino } from './types';

function getTetrominoBlocks(tetromino: Tetromino): ReadonlyArray<Block> {
  const anchor = tetromino.anchor;
  const mappedBlocks = tetromino.blocks.map((row, y) =>
    row
      .map((block, x) =>
        block !== null
          ? {
              ...block,
              pos: {
                x: anchor.x + x * BlockDimensions.WIDTH,
                y: anchor.y + y * BlockDimensions.HEIGHT,
              },
            }
          : block
      )
      .filter((block): block is Block => block !== null)
  );
  return mappedBlocks.flat();
}

export { getTetrominoBlocks };
