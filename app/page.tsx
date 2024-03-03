import {
  FrameButton,
  FrameContainer,
  FrameImage,
  FrameInput,
  FrameReducer,
  NextServerPageProps,
  PreviousFrame,
  getFrameMessage,
  getPreviousFrame,
  useFramesReducer,
} from "frames.js/next/server";
import Link from "next/link";

const baseUrl = process.env.NEXT_PUBLIC_HOST || "http://localhost:3000";

type State = Array<Array<number>>

// array of columns
const initialState = [
  [0, 0, 0, 0, 0, 0, 0], // this is a column
  [0, 0, 0, 0, 0, 0, 0], // this is also a column
  [0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0],
]

const MAX_COLUMNS = 7;
const MAX_ROWS = 6;
const MAX_ALIGN_DISCS = 4; // 4 discs aligned = win

const haveWin = (board: State, player: number, column: number, index: number): boolean => {
  const winString = Array.apply(null, Array(MAX_ALIGN_DISCS).fill(player)).join(',');
  const haveColumnWin = board[column].join(',').includes(winString);
  const haveRowWin = board.map(column => column[index]).join(',').includes(winString);
  const haveDiagonalUp = board.map((column, i) => column[index + (i - column)]).join(',').includes(winString);
  const haveDiagnalDown = board.map((column, i) => column[index - (i - column)]).join(',').includes(winString);

  return haveColumnWin || haveRowWin || haveDiagonalUp || haveDiagnalDown
}
// check if the game is draw
const noMoreEmptyCell = (board: State): boolean => !board.map(col => col.join(',')).join(',').includes('0');

const reducer: FrameReducer<State> = (state, action) => {
  const inputText = action.postBody?.untrustedData.inputText
  if (inputText == null || inputText.length !== 1) {
    console.warn('undefined input')
    return state
  }

  let column: number
  try {
    column = Number.parseInt(inputText)
  } catch (e) {
    return state
  }

  column -= 1

  if (column >= MAX_COLUMNS - 1 || column < 0) return state;

  const board = state;

  // player adds disc
  const index = board[column].findIndex((cell: number) => cell === 0);
  if (index !== -1) {
    board[column][index] = 1
    if (haveWin(board, 1, column, index) || noMoreEmptyCell(board)) return board
  }

  // ai adds disc
  // Find draw case
  if (noMoreEmptyCell(board)) {
    return board
  }

  return board
};

// This is a react server component only
export default async function Home({
  params,
  searchParams,
}: NextServerPageProps) {
  const previousFrame = getPreviousFrame<State>(searchParams);

  const frameMessage = await getFrameMessage(previousFrame.postBody, {
    hubHttpUrl: "http://localhost:3010/hub"
  });

  if (frameMessage && !frameMessage?.isValid) {
    throw new Error("Invalid frame payload");
  }

  const [state, dispatch] = useFramesReducer<State>(
    reducer,
    initialState,
    previousFrame
  );

  // Here: do a server side side effect either sync or async (using await), such as minting an NFT if you want.
  // example: load the users credentials & check they have an NFT

  console.log("info: state is:", state);

  // const gamestate = [
  //   [0, 1, 2, 0, 0, 0, 0],
  //   [0, 1, 2, 0, 0, 0, 0],
  //   [0, 2, 1, 0, 0, 0, 0],
  //   [0, 1, 2, 0, 0, 0, 0],
  //   [0, 1, 2, 0, 0, 0, 0],
  //   [0, 1, 2, 0, 0, 0, 0],
  // ]

  // then, when done, return next frame
  return (
    <div className="p-4">
      frames.js starter kit. The Template Frame is on this page, it&apos;s in
      the html meta tags (inspect source).{" "}
      <Link href={`/debug?url=${baseUrl}`} className="underline">
        Debug
      </Link>
      <FrameContainer
        postUrl="/frames"
        pathname="/"
        state={state}
        previousFrame={previousFrame}
      >
        {/* <FrameImage src="https://framesjs.org/og.png" /> */}
        <FrameImage aspectRatio="1.91:1">
          <div tw="w-full h-full bg-slate-700 text-white justify-center items-center flex flex-col">
            <h1 tw="font-bold text-7xl">Make a Move</h1>
            {state.map((row, idx) => <div key={`${idx}`} tw="flex">
              {row.map((col, idx2) => <div key={`${idx}${idx2}`} tw="w-16 h-16 bg-white border border-black flex justify-center items-center">
                {col !== 0 ? 
                  <div tw={`w-[75%] h-[75%] rounded-full ${col === 1 ? "bg-red-700" : "bg-black"}`}></div> :
                  <></>}
              </div>)}
            </div>)}
          </div>
        </FrameImage>
        <FrameInput text="1-7 to make a move" />
        <FrameButton>
          Make Move
        </FrameButton>

      </FrameContainer>
    </div>
  );
}
