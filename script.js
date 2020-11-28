let canvas = document.getElementById("canvas"), context = canvas.getContext("2d");
    let score = 0, timer = 120, maxTimer = 120, gameOver = false, paused = false;
    let gameBoard = { width: 10, height: 20, blocks: [] };
    let tetromino = { x: 0, y: 0, type: 0, blocks: [] };
    let colors = ["#ffff00", "#ff00ff", "#00ffff", "#ff8800", "#0000ff", "#ff0000", "#00ff00"];
    
    // Offsets for each block (Relative to the center of the tetromino)
    let tetrominoDefinitions = [
      [{ x:  0, y: 0 }, { x:  1, y: 0 }, { x:  0, y: 1 }, { x:  1, y: 1 }], // Square piece (we don't rotate this piece so we put it in index 0, pieceType 0 does not get rotated)
      [{ x:  0, y: 0 }, { x: -1, y: 0 }, { x:  1, y: 0 }, { x:  0, y: 1 }], // T piece
      [{ x: -1, y: 0 }, { x:  0, y: 0 }, { x:  1, y: 0 }, { x:  2, y: 0 }], // Line piece
      [{ x: -1, y: 0 }, { x:  0, y: 0 }, { x:  1, y: 0 }, { x: -1, y: 1 }], // L piece
      [{ x: -1, y: 0 }, { x:  0, y: 0 }, { x:  1, y: 0 }, { x:  1, y: 1 }], // Backwards L piece
      [{ x: -1, y: 0 }, { x:  0, y: 0 }, { x:  0, y: 1 }, { x:  1, y: 1 }], // ~ piece
      [{ x:  0, y: 0 }, { x:  1, y: 0 }, { x: -1, y: 1 }, { x:  0, y: 1 }] // Backwards ~ piece
    ];

    // Size of each block in pixels
    let blockSize = {  width: canvas.width  / gameBoard.width,
                      height: canvas.height / gameBoard.height };

    function setup() {
      // Fill the `gameBoard.blocks` 2D array with zeros
      for (let i = 0; i < gameBoard.height; ++i)
        gameBoard.blocks.push(new Array(gameBoard.width).fill(0));
      resetTetromino(tetromino);
      if (!localStorage.highscore) localStorage.highscore = 0;
      updateScoreDisplay();
    }

    function draw() {
      context.fillStyle = "#333333";
      context.fillRect(0, 0, canvas.width, canvas.height); // Clear the canvas with a background color
      if (!gameOver && !paused && --timer < 0) {
        advanceTetromino(tetromino);
        timer = maxTimer;
      }
      drawBoard();
      drawPreviewTetromino(tetromino);
      drawTetromino(tetromino);
      if (gameOver || paused) {
        context.fillStyle = "#00000088";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = "#FFFFFF";
        context.font = "46px Monospace";
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(paused ? "PAUSED" : "GAME OVER!", canvas.width * .5, canvas.height * .5);
      }
      if (!gameOver) window.requestAnimationFrame(draw); // Continue the draw loop for another frame (at the refresh rate of the monitor)
    }

    // ****************************
    // Tetromino functions
    // ****************************
    function resetTetromino(tetro) {
      tetro.x = Math.ceil(gameBoard.width / 2); // Center the tetromino at the top
      tetro.y = 2;
      tetro.type = Math.floor(Math.random() * tetrominoDefinitions.length);
      tetro.blocks = tetrominoDefinitions[tetro.type].slice(); // We slice to make a copy of the array, when we rotate the piece we don't want to modify the pieceDefinitions
      for (let i = Math.floor(Math.random() * 4); i--;) tetro.blocks = getRotatedTetrominoBlocks(tetro, 1); // Rotate it 0 to 3 times
      moveTetromino(tetro, 0, -1); moveTetromino(tetro, 0, -1); // Move it up if possible so it's flush with the top of the screen
      if (checkTetrominoCollision(tetro, 0, 0)) gameOver = true; // If there's a collision straight away, then the player lost the game
    }

    /*
     * direction = 1 for a clockwise rotation
     * direction = -1 for anticlockwise
     */
    function getRotatedTetrominoBlocks(tetro, direction = 1) {
      if (direction == 0 || tetro.type === 0) return tetro.blocks; // Don't rotate if type is zero, this is the square piece which doesn't need rotating
      let newBlocks = [];
      for (let block of tetro.blocks)
        newBlocks.push({ x: -block.y * direction, y: block.x * direction });
      return newBlocks;
    }

    /*
     * Returns true if the tetromino was successfully moved
     * Returns false if the tetromino would hit a block on the board or would go offscreen
     */
    function moveTetromino(tetro, offsetX, offsetY, rotation = 0) {
      // Check if we are able to move the tetromino as requested
      if (checkTetrominoCollision(tetro, offsetX, offsetY, rotation)) return false; // Return failure, piece was not moved
      tetro.x += offsetX; // Move the tetromino
      tetro.y += offsetY; // Move the tetromino
      tetro.blocks = getRotatedTetrominoBlocks(tetro, rotation); // Rotate the tetromino
      return true; // Return success
    }

    function advanceTetromino(tetro) {
      if (moveTetromino(tetro, 0, 1) === false) placeTetromino(tetro); // Try to move the tetromino down, if we can't then place it on the board and get a new one
    }

    /*
     * Places all the blocks in the tetromino on the board
     * Removes completed lines from the board, updates the score and creates the next tetromino
     */
    function placeTetromino(tetro) {
      for (let block of tetro.blocks)
        gameBoard.blocks[tetro.y + block.y][tetro.x + block.x] = tetro.type + 1;
      resetTetromino(tetro);
      score += removeCompletedLines() * 10;
      localStorage.highscore = Math.max(score, localStorage.highscore);
      updateScoreDisplay();
      timer = maxTimer;
    }

    // Move the tetromino down until it hits something, the place it on the board
    function dropTetromino(tetro) {
      while (moveTetromino(tetro, 0, 1));
      placeTetromino(tetro);
    }

    // Checks if the tetromino would go offscreen or itersect the gameboard if it moved with the specified offset
    function checkTetrominoCollision(tetro, offsetX, offsetY, rotation = 0) {
      for (let block of getRotatedTetrominoBlocks(tetro, rotation)) {
        let blockX = tetro.x + block.x + offsetX;
        let blockY = tetro.y + block.y + offsetY;
        if (blockX < 0 || blockX >= gameBoard.width  ||
            blockY < 0 || blockY >= gameBoard.height ||
            gameBoard.blocks[blockY][blockX]) return true;
      }
      return false;
    }
    // ****************************

    function removeCompletedLines() {
      let completedLineCount = 0;
      for (let y = 0; y < gameBoard.height; ++y) {
        // A row with no zeros is a completed line
        if (gameBoard.blocks[y].includes(0) === false) {
          completedLineCount++;
          maxTimer *= 0.99; // Increase the difficulty
          gameBoard.blocks.splice(y, 1); // Remove this row from the array
          gameBoard.blocks.unshift(new Array(gameBoard.width).fill(0)); // Add a new empty row at the top of the board
          // Removing any row, and adding a new row to the top has the effect of shifting all rows above the removed one down by 1 block
        }
      }
      return completedLineCount;
    }

    // ****************************
    // Drawing functions
    // ****************************
    function drawTetromino(tetro, isPreview = false) {
      context.fillStyle = isPreview ? "#FFFFFF33" : colors[tetro.type];
      for (let block of tetro.blocks)
        context.fillRect((tetro.x + block.x) * blockSize.width, (tetro.y + block.y) * blockSize.height, blockSize.width, blockSize.height);
    }

    function drawPreviewTetromino(tetro) {
      let previewTetromino = Object.assign({}, tetro);
      while (moveTetromino(previewTetromino, 0, 1));
      drawTetromino(previewTetromino, true);
    }

    function drawBoard() {
      for (let y = 0; y < gameBoard.height; ++y) {
        for (let x = 0; x < gameBoard.height; ++x) {
          let val = gameBoard.blocks[y][x];
          if (val) {
            context.fillStyle = colors[val - 1];
            context.fillRect(x * blockSize.width, y * blockSize.height, blockSize.width, blockSize.height);
          }
        }
      }
    }

    function updateScoreDisplay() {
      document.getElementById("score_display").innerHTML = "SCORE:" + score + "&nbsp;&nbsp;HIGHSCORE:" + localStorage.highscore;
    }
    // ****************************

    document.addEventListener("keydown", function(ev) {
      switch (ev.keyCode) {
        case 37: moveTetromino(tetromino, -1, 0);   break; // LEFT ARROW
        case 39: moveTetromino(tetromino,  1, 0);   break; // RIGHT ARROW
        case 40: advanceTetromino(tetromino);       break; // DOWN ARROW
        case 38: moveTetromino(tetromino, 0, 0, 1); break; // UP ARROW
        case 32: dropTetromino(tetromino);          break; // SPACEBAR
        case 80: paused = !paused;                  break; // P
      }
    })
    setup();
    draw(); // Start the draw loop
