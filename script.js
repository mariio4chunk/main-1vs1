document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const gameContainer = document.getElementById('game-container');
    const gameBoardElement = document.getElementById('game-board');
    const statusTextElement = document.getElementById('status-text');
    const playerIndicatorElement = document.querySelector('#status .player-indicator');
    const resetButton = document.getElementById('reset-button');
    
    // Setup Modal Elements
    const setupModal = document.getElementById('setup-modal');
    const vsPlayerButton = document.getElementById('vs-player');
    const vsBotButton = document.getElementById('vs-bot');
    const difficultySelection = document.getElementById('difficulty-selection');
    const difficultyButtons = document.querySelectorAll('.difficulty-button');

    // Game Over Modal Elements
    const gameOverModal = document.getElementById('game-over-modal');
    const modalMessage = document.getElementById('modal-message');
    const playAgainButton = document.getElementById('play-again-button');

    // --- Game Constants ---
    const ROWS = 6;
    const COLS = 7;
    const PLAYER = 1;
    const BOT = 2;

    // --- Game State ---
    let board = [];
    let currentPlayer = PLAYER;
    let gameOver = false;
    let gameMode = 'pvp'; // 'pvp' or 'pvc'
    let difficulty = 'medium';

    // --- Sound Effects ---
    let synth, winSynth;
    const initSound = () => {
        if (typeof Tone === 'undefined') return; // Jangan jalankan jika Tone.js tidak ada
        if (Tone.context.state !== 'running') Tone.start();
        if (!synth) synth = new Tone.Synth().toDestination();
        if (!winSynth) winSynth = new Tone.PolySynth(Tone.Synth).toDestination();
    };
    const playDropSound = () => synth && synth.triggerAttackRelease('C4', '8n');
    const playWinSound = () => winSynth && winSynth.triggerAttackRelease(['C4', 'E4', 'G4', 'C5'], '8n', Tone.now());

    // --- Game Setup ---
    vsPlayerButton.addEventListener('click', () => {
        gameMode = 'pvp';
        startGame();
    });

    vsBotButton.addEventListener('click', () => {
        gameMode = 'pvc';
        difficultySelection.style.display = 'block';
    });

    difficultyButtons.forEach(button => {
        button.addEventListener('click', () => {
            difficulty = button.dataset.difficulty;
            startGame();
        });
    });

    function startGame() {
        setupModal.classList.remove('show');
        gameContainer.classList.add('active');
        initializeGame();
    }
    
    function resetToMenu() {
        gameContainer.classList.remove('active');
        gameOverModal.classList.remove('show');
        difficultySelection.style.display = 'none';
        setupModal.classList.add('show');
    }

    // --- Core Game Logic ---
    function initializeGame() {
        initSound();
        board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
        currentPlayer = PLAYER;
        gameOver = false;
        
        gameBoardElement.innerHTML = '';
        for (let c = 0; c < COLS; c++) {
            const column = document.createElement('div');
            column.classList.add('column');
            column.dataset.col = c;
            for (let r = 0; r < ROWS; r++) {
                const cell = document.createElement('div');
                cell.classList.add('cell');
                cell.dataset.row = r;
                cell.dataset.col = c;
                column.appendChild(cell);
            }
            column.addEventListener('click', handleColumnClick);
            gameBoardElement.appendChild(column);
        }
        
        gameOverModal.classList.remove('show');
        updateStatus();
    }

    function updateStatus() {
        if (gameOver) return;
        if (gameMode === 'pvc') {
            statusTextElement.textContent = currentPlayer === PLAYER ? 'Giliran Kamu' : 'Bot berpikir...';
        } else {
            statusTextElement.textContent = `Giliran Pemain ${currentPlayer}`;
        }
        const colorVar = currentPlayer === PLAYER ? '--player1-color' : '--player2-color';
        playerIndicatorElement.style.backgroundColor = `var(${colorVar})`;
    }

    function handleColumnClick(event) {
        if (gameOver || (gameMode === 'pvc' && currentPlayer === BOT)) return;
        
        const col = parseInt(event.currentTarget.dataset.col);
        if (board[0][col] !== 0) return; // Column is full

        makeMove(col, currentPlayer);
    }

    function makeMove(col, player) {
        if (gameOver) return;

        let row = -1;
        for (let r = ROWS - 1; r >= 0; r--) {
            if (board[r][col] === 0) {
                row = r;
                break;
            }
        }
        if (row === -1) return;

        playDropSound();
        placePiece(row, col, player);
        
        const winningInfo = checkForWin(board, player);
        if (winningInfo) {
            endGame(false, winningInfo.winningCells);
        } else if (isBoardFull(board)) {
            endGame(true, []);
        } else {
            switchPlayer();
        }
    }

    function placePiece(row, col, player) {
        board[row][col] = player;
        const cell = document.querySelector(`.cell[data-row='${row}'][data-col='${col}']`);
        cell.classList.add(`player${player}`);
    }

    function switchPlayer() {
        currentPlayer = (currentPlayer === PLAYER) ? BOT : PLAYER;
        updateStatus();

        if (gameMode === 'pvc' && currentPlayer === BOT && !gameOver) {
            setTimeout(botMove, 700);
        }
    }
    
    function endGame(isDraw, winningCells) {
        gameOver = true;
        playWinSound();
        
        if (!isDraw) {
            highlightWinningCells(winningCells);
        }

        setTimeout(() => {
            if (isDraw) {
                modalMessage.textContent = "Permainan Seri!";
            } else {
                if (gameMode === 'pvc') {
                    modalMessage.textContent = currentPlayer === PLAYER ? "Kamu Menang!" : "Bot Menang!";
                } else {
                    modalMessage.textContent = `Pemain ${currentPlayer} Menang!`;
                }
            }
            gameOverModal.classList.add('show');
        }, 800);
    }

    function highlightWinningCells(cells) {
        cells.forEach(c => {
            const cellEl = document.querySelector(`.cell[data-row='${c.r}'][data-col='${c.c}']`);
            cellEl && cellEl.classList.add('win');
        });
    }

    // --- Bot AI Logic ---
    function botMove() {
        let col = -1;
        if (difficulty === 'easy') {
            col = findRandomMove();
        } else if (difficulty === 'medium') {
            col = findMediumMove();
        } else if (difficulty === 'hard') {
            col = findBestMove();
        }
        
        if (col !== -1) {
            makeMove(col, BOT);
        }
    }

    function findRandomMove() {
        let validCols = [];
        for (let c = 0; c < COLS; c++) {
            if (board[0][c] === 0) validCols.push(c);
        }
        return validCols.length > 0 ? validCols[Math.floor(Math.random() * validCols.length)] : -1;
    }

    function findMediumMove() {
        // 1. Check if Bot can win
        for (let c = 0; c < COLS; c++) {
            if (board[0][c] === 0) {
                let tempBoard = JSON.parse(JSON.stringify(board));
                let tempRow = getNextOpenRow(tempBoard, c);
                tempBoard[tempRow][c] = BOT;
                if (checkForWin(tempBoard, BOT)) return c;
            }
        }
        // 2. Check if Player is about to win and block
        for (let c = 0; c < COLS; c++) {
            if (board[0][c] === 0) {
                let tempBoard = JSON.parse(JSON.stringify(board));
                let tempRow = getNextOpenRow(tempBoard, c);
                tempBoard[tempRow][c] = PLAYER;
                if (checkForWin(tempBoard, PLAYER)) return c;
            }
        }
        // 3. Otherwise, play randomly
        return findRandomMove();
    }

    function findBestMove() {
        let bestScore = -Infinity;
        let bestCol = -1;
        let validCols = [];
         for (let c = 0; c < COLS; c++) {
            if (board[0][c] === 0) validCols.push(c);
        }
        // Prioritize center columns
        validCols.sort((a,b) => Math.abs(Math.floor(COLS/2) - a) - Math.abs(Math.floor(COLS/2) - b));

        for (const c of validCols) {
            let tempBoard = JSON.parse(JSON.stringify(board));
            let tempRow = getNextOpenRow(tempBoard, c);
            tempBoard[tempRow][c] = BOT;
            let score = minimax(tempBoard, 4, false, -Infinity, Infinity);
            if (score > bestScore) {
                bestScore = score;
                bestCol = c;
            }
        }
        return bestCol !== -1 ? bestCol : findRandomMove();
    }

    function minimax(currentBoard, depth, isMaximizing, alpha, beta) {
        let winInfoPlayer = checkForWin(currentBoard, PLAYER);
        if (winInfoPlayer) return -100000 - depth;
        let winInfoBot = checkForWin(currentBoard, BOT);
        if (winInfoBot) return 100000 + depth;
        if (isBoardFull(currentBoard) || depth === 0) return scorePosition(currentBoard, BOT);

        let validCols = [];
        for (let c = 0; c < COLS; c++) {
            if (currentBoard[0][c] === 0) validCols.push(c);
        }

        if (isMaximizing) {
            let maxEval = -Infinity;
            for (const c of validCols) {
                let tempBoard = JSON.parse(JSON.stringify(currentBoard));
                let tempRow = getNextOpenRow(tempBoard, c);
                tempBoard[tempRow][c] = BOT;
                let evalScore = minimax(tempBoard, depth - 1, false, alpha, beta);
                maxEval = Math.max(maxEval, evalScore);
                alpha = Math.max(alpha, evalScore);
                if (beta <= alpha) break;
            }
            return maxEval;
        } else {
            let minEval = Infinity;
            for (const c of validCols) {
                let tempBoard = JSON.parse(JSON.stringify(currentBoard));
                let tempRow = getNextOpenRow(tempBoard, c);
                tempBoard[tempRow][c] = PLAYER;
                let evalScore = minimax(tempBoard, depth - 1, true, alpha, beta);
                minEval = Math.min(minEval, evalScore);
                beta = Math.min(beta, evalScore);
                if (beta <= alpha) break;
            }
            return minEval;
        }
    }
    
    // --- Helper Functions ---
    function getNextOpenRow(b, col) {
        for (let r = ROWS - 1; r >= 0; r--) if (b[r][col] === 0) return r;
        return -1;
    }

    function isBoardFull(b) {
        return b[0].every(cell => cell !== 0);
    }

    function checkForWin(b, player) {
        // Check horizontal, vertical, and both diagonals
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (c + 3 < COLS && b[r][c] === player && b[r][c+1] === player && b[r][c+2] === player && b[r][c+3] === player)
                    return { winningCells: [{r,c},{r,c:c+1},{r,c:c+2},{r,c:c+3}] };
                if (r + 3 < ROWS) {
                    if (b[r][c] === player && b[r+1][c] === player && b[r+2][c] === player && b[r+3][c] === player)
                        return { winningCells: [{r,c},{r:r+1,c},{r:r+2,c},{r:r+3,c}] };
                    if (c + 3 < COLS && b[r][c] === player && b[r+1][c+1] === player && b[r+2][c+2] === player && b[r+3][c+3] === player)
                        return { winningCells: [{r,c},{r:r+1,c:c+1},{r:r+2,c:c+2},{r:r+3,c:c+3}] };
                    if (c - 3 >= 0 && b[r][c] === player && b[r+1][c-1] === player && b[r+2][c-2] === player && b[r+3][c-3] === player)
                        return { winningCells: [{r,c},{r:r+1,c:c-1},{r:r+2,c:c-2},{r:r+3,c:c-3}] };
                }
            }
        }
        return null;
    }

    function scorePosition(b, piece) {
        let score = 0;
        // Score center column
        let centerArray = b.map(row => row[Math.floor(COLS / 2)]);
        let centerCount = centerArray.filter(p => p === piece).length;
        score += centerCount * 3;

        // Score Horizontal, Vertical, Diagonal
        const checkWindow = (window, p) => {
            let score = 0;
            const opponent = p === PLAYER ? BOT : PLAYER;
            const pieceCount = window.filter(i => i === p).length;
            const emptyCount = window.filter(i => i === 0).length;
            const opponentCount = window.filter(i => i === opponent).length;

            if (pieceCount === 4) score += 100;
            else if (pieceCount === 3 && emptyCount === 1) score += 5;
            else if (pieceCount === 2 && emptyCount === 2) score += 2;
            if (opponentCount === 3 && emptyCount === 1) score -= 4;
            return score;
        };

        // Horizontal
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS - 3; c++) {
                const window = [b[r][c], b[r][c+1], b[r][c+2], b[r][c+3]];
                score += checkWindow(window, piece);
            }
        }
        // Vertical
        for (let c = 0; c < COLS; c++) {
            for (let r = 0; r < ROWS - 3; r++) {
                const window = [b[r][c], b[r+1][c], b[r+2][c], b[r+3][c]];
                score += checkWindow(window, piece);
            }
        }
        // Positive Diagonal
        for (let r = 0; r < ROWS - 3; r++) {
            for (let c = 0; c < COLS - 3; c++) {
                const window = [b[r][c], b[r+1][c+1], b[r+2][c+2], b[r+3][c+3]];
                score += checkWindow(window, piece);
            }
        }
        // Negative Diagonal
        for (let r = 3; r < ROWS; r++) {
            for (let c = 0; c < COLS - 3; c++) {
                const window = [b[r][c], b[r-1][c+1], b[r-2][c+2], b[r-3][c+3]];
                score += checkWindow(window, piece);
            }
        }
        return score;
    }

    // --- Event Listeners ---
    resetButton.addEventListener('click', initializeGame);
    playAgainButton.addEventListener('click', resetToMenu);
});