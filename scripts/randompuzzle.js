// ============================================================================
// GLOBAL VARIABLES
// ============================================================================

let board = null;
let game = null;
let puzzleMoves = [];
let currentMoveIndex = -1; // -1 means showing the starting position
let originalFen = null;

// ============================================================================
// CHESSBOARD CONFIGURATION
// ============================================================================

const config = {
    pieceTheme: 'img/wikipedia/{piece}.png',
    position: 'start',
    draggable: true,
    orientation: 'white', // Default orientation, will be set based on FEN
    onDrop: function(source, target) {
        try {
            // Check if the move is legal
            var move = game.move({
                from: source,
                to: target,
                promotion: 'q' // Always promote to queen for simplicity
            });

            // Illegal move
            if (move === null) {
                console.log('Illegal move attempted:', source, 'to', target);
                return 'snapback';
            }

            // Legal move - update the board
            console.log('Legal move made:', move.san);
            updateMoveDisplay();
            return 'snapback'; // Always snapback to ensure clean state
        } catch (error) {
            console.error('Error in onDrop:', error);
            return 'snapback'; // Always return piece to original position on error
        }
    }
};

// ============================================================================
// MATERIAL CALCULATION CONSTANTS
// ============================================================================

const MATERIAL_VALUES = {
    'p': 1,   // pawn
    'n': 3,   // knight
    'b': 3,   // bishop
    'r': 5,   // rook
    'q': 9,   // queen
    'k': 0    // king (not counted in material)
};

// ============================================================================
// MATERIAL CALCULATION FUNCTIONS
// ============================================================================

/**
 * Calculate material value for a given position
 * @param {string} fen - FEN string representing the position
 * @returns {Object} Object with white and black material values
 */
function calculateMaterial(fen) {
    try {
        const game = new Chess(fen);
        const board = game.board();
        
        let whiteMaterial = 0;
        let blackMaterial = 0;
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = board[row][col];
                if (piece) {
                    const pieceType = piece.type;
                    const pieceColor = piece.color;
                    const value = MATERIAL_VALUES[pieceType];
                    
                    if (pieceColor === 'w') {
                        whiteMaterial += value;
                    } else {
                        blackMaterial += value;
                    }
                }
            }
        }
        
        return { white: whiteMaterial, black: blackMaterial };
    } catch (error) {
        console.error("Error calculating material:", error);
        return { white: 0, black: 0 };
    }
}

/**
 * Play through moves and calculate final material
 * @param {string} startFen - Starting FEN position
 * @param {string} moves - Space-separated moves to play
 * @returns {Object} Object with white and black material values after moves
 */
function playMovesAndCalculateMaterial(startFen, moves) {
    try {
        const game = new Chess(startFen);
        const moveArray = moves.split(' ');
        
        // Play through all moves
        for (let move of moveArray) {
            if (move && move.length >= 4) {
                try {
                    game.move(move, { sloppy: true });
                } catch (e) {
                    console.error('Invalid move:', move, e);
                    break;
                }
            }
        }
        
        // Calculate material after all moves
        return calculateMaterial(game.fen());
    } catch (error) {
        console.error("Error playing moves:", error);
        return { white: 0, black: 0 };
    }
}

// ============================================================================
// INITIALIZATION FUNCTIONS
// ============================================================================

/**
 * Initialize the chessboard when the page loads
 */
function initializeChessboard() {
    console.log("initializeChessboard called");
    try {
        // Check if all required libraries are loaded
        if (typeof Chessboard === 'undefined') {
            console.error("Chessboard library not loaded");
            setTimeout(initializeChessboard, 100);
            return;
        }
        
        if (typeof Chess === 'undefined') {
            console.error("Chess.js library not loaded");
            setTimeout(initializeChessboard, 100);
            return;
        }
        
        console.log("Libraries loaded, creating chessboard");
        
        // Hide material display initially
        const materialDisplay = document.getElementById('material-display');
        if (materialDisplay) {
            materialDisplay.style.display = 'none';
        }
        
        // Create the chessboard with a stable initial position
        board = Chessboard('myBoard', {
            ...config,
            position: 'start' // Start with a stable position
        });
        console.log("Chessboard created successfully");
        
        // Wait a moment for the board to fully render before loading puzzle
        setTimeout(() => {
            fetchRandomPuzzle();
        }, 100);
        
    } catch (error) {
        console.error("Error creating chessboard:", error);
        // Retry after a short delay
        setTimeout(initializeChessboard, 200);
    }
}

// ============================================================================
// DOM READY HANDLER
// ============================================================================

console.log("Document ready state:", document.readyState);
if (document.readyState === 'loading') {
    console.log("DOM still loading, adding event listener");
    document.addEventListener('DOMContentLoaded', initializeChessboard);
} else {
    console.log("DOM already ready, calling initializeChessboard");
    // DOM is already ready, but check if libraries are loaded
    setTimeout(initializeChessboard, 100);
}

// ============================================================================
// PUZZLE LOADING FUNCTIONS
// ============================================================================

/**
 * Fetch and load a random puzzle from the puzzles.json file
 */
async function fetchRandomPuzzle() {
    console.log("fetchRandomPuzzle called");
    try {
        const response = await fetch("puzzles.json");
        const data = await response.json();
        
        // Pick a random puzzle
        const puzzle = data[Math.floor(Math.random() * data.length)];
        console.log("FEN:", puzzle.FEN, "Moves:", puzzle.Moves);

        // Store original FEN and reset move index
        originalFen = puzzle.FEN;
        currentMoveIndex = -1;

        // Load into chess.js
        game = new Chess(puzzle.FEN);

        // Set board orientation based on whose turn it is to move first
        // If it's Black's turn to move first, show from White's perspective (so player sees Black pieces at bottom)
        // If it's White's turn to move first, show from Black's perspective (so player sees White pieces at bottom)
        if (game.turn() === 'b') {
            // Black to move first - show from White's perspective
            board.orientation('white');
            console.log('Board oriented from White perspective (Black to move first)');
        } else {
            // White to move first - show from Black's perspective  
            board.orientation('black');
            console.log('Board oriented from Black perspective (White to move first)');
        }

                // Store moves
        puzzleMoves = puzzle.Moves.split(" ");
        
        // Show the initial position on the board
        board.position(puzzle.FEN);
        
        // Automatically play the first move to show the puzzle starting position
        if (puzzleMoves.length > 0 && puzzleMoves[0]) {
            // Add a short delay so we can see the initial position
            setTimeout(() => {
                try {
                    game.move(puzzleMoves[0], { sloppy: true });
                    // Update the board position smoothly
                    board.position(game.fen()); // Enable animations
                    currentMoveIndex = 0; // Now we're at the first move
                    console.log("Automatically played first move:", puzzleMoves[0]);
                    updateMoveDisplay(); // Update the display after the move
                } catch (e) {
                    console.error("Error playing first move:", e);
                    currentMoveIndex = -1; // Stay at starting position if error
                }
            }, 800); // 0.8 second delay
        }
         
                   // Initialize navigation controls (they're now static HTML)
          createNavigationControls();
        
                 // Calculate material analysis with error handling
         console.log("Starting material analysis...");
         try {
             // Calculate material after the first move (the actual starting position for the puzzle)
             const firstMoveMaterial = playMovesAndCalculateMaterial(puzzle.FEN, puzzle.Moves.split(' ')[0]);
             console.log("Material after first move calculated:", firstMoveMaterial);
             
             const endMaterial = playMovesAndCalculateMaterial(puzzle.FEN, puzzle.Moves);
             console.log("End material calculated:", endMaterial);
             
             // Calculate differences (comparing after first move to final position)
             const whiteDiff = endMaterial.white - firstMoveMaterial.white;
             const blackDiff = endMaterial.black - firstMoveMaterial.black;
            
                         // Display results
             console.log("=== MATERIAL ANALYSIS ===");
             console.log("After opponent's move (puzzle start):");
             console.log(`  White: ${firstMoveMaterial.white} points`);
             console.log(`  Black: ${firstMoveMaterial.black} points`);
             console.log("");
             console.log("After solution:");
             console.log(`  White: ${endMaterial.white} points`);
             console.log(`  Black: ${endMaterial.black} points`);
             console.log("");
             console.log("Material gained from solution:");
             console.log(`  White: ${whiteDiff > 0 ? '+' : ''}${whiteDiff} points`);
             console.log(`  Black: ${blackDiff > 0 ? '+' : ''}${blackDiff} points`);
             
             // Add visual display to the page
             console.log("Calling displayMaterialAnalysis...");
             displayMaterialAnalysis(firstMoveMaterial, endMaterial, whiteDiff, blackDiff);
            console.log("Material analysis display completed");
        } catch (materialError) {
            console.error("Error in material analysis:", materialError);
            console.error("Error stack:", materialError.stack);
            // Board should still work even if material analysis fails
        }
        
    } catch (error) {
        console.error("Error loading puzzle:", error);
        // Fallback to starting position if puzzle loading fails
        if (board) {
            board.position('start');
        }
    }
}

// ============================================================================
// UI UPDATE FUNCTIONS
// ============================================================================

/**
 * Display material analysis on the page
 * @param {Object} startMaterial - Material after opponent's move
 * @param {Object} endMaterial - Material after solution
 * @param {number} whiteDiff - Material difference for white
 * @param {number} blackDiff - Material difference for black
 */
function displayMaterialAnalysis(startMaterial, endMaterial, whiteDiff, blackDiff) {
    console.log("displayMaterialAnalysis called with:", { startMaterial, endMaterial, whiteDiff, blackDiff });
    
    try {
        // Get the material display element
        const display = document.getElementById('material-display');
        if (!display) {
            console.error("Material display element not found");
            return;
        }
        
        // Update the content with the calculated values
        document.getElementById('start-white').textContent = startMaterial.white;
        document.getElementById('start-black').textContent = startMaterial.black;
        document.getElementById('end-white').textContent = endMaterial.white;
        document.getElementById('end-black').textContent = endMaterial.black;
        
        // Update the difference values with proper CSS classes
        const diffWhite = document.getElementById('diff-white');
        const diffBlack = document.getElementById('diff-black');
        
        diffWhite.textContent = `${whiteDiff > 0 ? '+' : ''}${whiteDiff} pts`;
        diffWhite.className = `material-diff ${whiteDiff > 0 ? 'positive' : whiteDiff < 0 ? 'negative' : 'neutral'}`;
        
        diffBlack.textContent = `${blackDiff > 0 ? '+' : ''}${blackDiff} pts`;
        diffBlack.className = `material-diff ${blackDiff > 0 ? 'positive' : blackDiff < 0 ? 'negative' : 'neutral'}`;
        
        // Show the display
        display.style.display = 'block';
        
        console.log("Material analysis display updated successfully");
    } catch (error) {
        console.error("Error displaying material analysis:", error);
        console.error("Error stack:", error.stack);
    }
}

/**
 * Initialize navigation controls (they're now static HTML)
 */
function createNavigationControls() {
    // The navigation controls are now static HTML, so we just need to initialize them
    console.log("Navigation controls already exist in HTML, initializing...");
    
    // Update the move display
    updateMoveDisplay();
}

/**
 * Update the move display information
 */
function updateMoveDisplay() {
    const moveInfo = document.getElementById('move-info');
    if (!moveInfo) return;
    
    if (currentMoveIndex === -1) {
        moveInfo.textContent = 'Position: Starting position';
    } else if (currentMoveIndex >= puzzleMoves.length) {
        moveInfo.textContent = 'Position: After all moves';
    } else {
        moveInfo.textContent = `Move ${currentMoveIndex + 1}: ${puzzleMoves[currentMoveIndex]}`;
    }
    
    // Update button states
    updateButtonStates();
}

/**
 * Update the state of navigation buttons (enabled/disabled)
 */
function updateButtonStates() {
    const btnStart = document.getElementById('btn-start');
    const btnPrev = document.getElementById('btn-prev');
    const btnNext = document.getElementById('btn-next');
    const btnEnd = document.getElementById('btn-end');
    
    if (btnStart) btnStart.disabled = (currentMoveIndex === -1);
    if (btnPrev) btnPrev.disabled = (currentMoveIndex <= -1);
    if (btnNext) btnNext.disabled = (currentMoveIndex >= puzzleMoves.length - 1);
    if (btnEnd) btnEnd.disabled = (currentMoveIndex >= puzzleMoves.length - 1);
}

// ============================================================================
// NAVIGATION FUNCTIONS
// ============================================================================

/**
 * Go to the starting position (before any moves)
 */
function goToStart() {
    currentMoveIndex = -1;
    game = new Chess(originalFen);
    board.position(originalFen); // Enable animations
    updateMoveDisplay();
}

/**
 * Go to the previous move position
 */
function previousMove() {
    if (currentMoveIndex > -1) {
        currentMoveIndex--;
        if (currentMoveIndex === -1) {
            goToStart();
        } else {
            // Replay moves up to the previous position
            game = new Chess(originalFen);
            for (let i = 0; i <= currentMoveIndex; i++) {
                game.move(puzzleMoves[i], { sloppy: true });
            }
            board.position(game.fen()); // Enable animations
            updateMoveDisplay();
        }
    }
}

/**
 * Go to the next move position
 */
function nextMove() {
    if (currentMoveIndex < puzzleMoves.length - 1) {
        currentMoveIndex++;
        game.move(puzzleMoves[currentMoveIndex], { sloppy: true });
        board.position(game.fen()); // Enable animations
        updateMoveDisplay();
    }
}

/**
 * Go to the final position after all moves
 */
function goToEnd() {
    currentMoveIndex = puzzleMoves.length - 1;
    game = new Chess(originalFen);
    for (let i = 0; i <= currentMoveIndex; i++) {
        game.move(puzzleMoves[i], { sloppy: true });
    }
    board.position(game.fen()); // Enable animations
    updateMoveDisplay();
}