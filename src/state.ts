import { Constants, LcgConstants } from './constants';
import { Lcg, GameState } from './types';

function createLcg(seed: number): Lcg {
  return () => (LcgConstants.A * seed + LcgConstants.C) % LcgConstants.M;
}

const emptyState: GameState = {
  tickEclipsed: 0,
  gameEnd: false,
  tetromino: null,
  nextTetromino: null,
  fallRate: Constants.INITIAL_FALL_RATE,
  placedBlocks: [],
  blockCounter: 0,
  stats: {
    score: 0,
    level: 1,
  },
  scheduledTasks: [],
  lcg: createLcg(0),
  gridUpdate: {
    render: [],
    move: [],
    remove: [],
  },
  previewUpdate: {
    render: [],
    move: [],
    remove: [],
  },
};

export { emptyState };
