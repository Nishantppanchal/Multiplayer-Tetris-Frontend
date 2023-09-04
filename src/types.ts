type ServerEvent =
  | 'right'
  | 'left'
  | 'smash'
  | 'rotate'
  | 'reset'
  | 'new SPG'
  | 'new MPG';

type Pos = Readonly<{
  x: number;
  y: number;
}>;

type Matrix<T> = ReadonlyArray<ReadonlyArray<T>>;

type Color =
  | 'lightblue'
  | 'darkblue'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'red'
  | 'magenta';

type TetrominoBlock = Readonly<{
  color: Color;
  id: string;
}>;

type TetrominoShape = 'I' | 'J' | 'L' | 'O' | 'S' | 'Z' | 'T';

interface Block extends TetrominoBlock {
  pos: Pos;
}

type Tetromino = Readonly<{
  anchor: Pos;
  shape: TetrominoShape;
  blocks: Matrix<TetrominoBlock | null>;
}>;

type ScheduledTask = Readonly<{
  triggerTime: number;
  task: (s: GameState) => GameState;
}>;

type UIUpdate = Readonly<{
  render: ReadonlyArray<Block>;
  move: ReadonlyArray<Block>;
  remove: ReadonlyArray<Block>;
}>;

type Stats = Readonly<{
  score: number;
  level: number;
}>;

type GameState = Readonly<{
  tickEclipsed: number;
  gameEnd: boolean;
  tetromino: Tetromino | null;
  fallRate: number;
  nextTetromino: Tetromino | null;
  placedBlocks: ReadonlyArray<Block>;
  blockCounter: number;
  stats: Stats;
  scheduledTasks: ReadonlyArray<ScheduledTask>;
  lcg: Lcg;
  gridUpdate: UIUpdate;
  previewUpdate: UIUpdate;
}>;

type ServerGameState = Readonly<{
  tickEclipsed: number;
  gameEnd: boolean;
  tetromino: Tetromino | null;
  fallRate: number;
  nextTetromino: Tetromino | null;
  placedBlocks: ReadonlyArray<Block>;
  blockCounter: number;
  stats: Stats;
  scheduledTasks: ReadonlyArray<ScheduledTask>;
  lcg: Lcg;
}>;

type Lcg = () => number;

type Loc = 'grid' | 'preview';

type ServerUpdate = {
  gameEnd: boolean;
  matchMaking: boolean;
  player: 'player1' | 'player2';
  player1: { gameState: ServerGameState; highScore: number } | null;
  player2: { gameState: ServerGameState; highScore: number } | null;
};

type Update = {
  gameEnd: boolean;
  matchMaking: boolean;
  player: 'player1' | 'player2';
  player1: {
    gameState: GameState;
    highScore: number;
  } | null;
  player2: {
    gameState: GameState;
    highScore: number;
  } | null;
};

export type {
  ServerEvent,
  Pos,
  Matrix,
  Color,
  Block,
  TetrominoBlock,
  TetrominoShape,
  Tetromino,
  ScheduledTask,
  UIUpdate,
  GameState,
  Lcg,
  Loc,
  ServerUpdate,
  ServerGameState,
  Update,
};
