/* Sudoku Animation by Austin Welsh-Graham */

return class MyEffect {
  constructor(display) {
    this.display = display;
    this.width = display.width;
    this.height = display.height;

    this.colours = {
      background: [0, 0, 0],
      grid: [35, 55, 65],
      box: [90, 120, 140],
      given: [100, 190, 255],
      solved: [100, 255, 170],
      thinking: [255, 220, 80],
      mistake: [255, 45, 55],
      notes: [55, 100, 120],
      complete: [100, 255, 190],
    };

    this.font = {
      1: [2, 6, 2, 2, 7],
      2: [6, 1, 2, 4, 7],
      3: [6, 1, 2, 1, 6],
      4: [5, 5, 7, 1, 1],
      5: [7, 4, 6, 1, 6],
      6: [3, 4, 7, 5, 7],
      7: [7, 1, 2, 2, 2],
      8: [7, 5, 7, 5, 7],
      9: [7, 5, 7, 1, 6],
    };

    this.reset();
  }

  randomInt(max) {
    return Math.floor(Math.random() * max);
  }

  shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = this.randomInt(i + 1);
      [array[i], array[j]] = [array[j], array[i]];
    }

    return array;
  }

  generateSolution() {
    const digits = this.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const bands = this.shuffle([0, 1, 2]);
    const stacks = this.shuffle([0, 1, 2]);

    const rows = [];
    const columns = [];

    for (const band of bands) {
      for (const row of this.shuffle([0, 1, 2])) {
        rows.push(band * 3 + row);
      }
    }

    for (const stack of stacks) {
      for (const column of this.shuffle([0, 1, 2])) {
        columns.push(stack * 3 + column);
      }
    }

    return rows.map(row => columns.map(
        column => digits[(row * 3 + Math.floor(row / 3) + column) % 9]));
  }

  reset() {
    this.solution = this.generateSolution();
    this.board = this.solution.map(row => row.slice());

    this.given = Array.from({length: 9}, () => Array(9).fill(true));

    const cells = this.shuffle(Array.from({length: 81}, (_, i) => i));

    const removals = 43 + this.randomInt(9);

    for (let i = 0; i < removals; i++) {
      const index = cells[i];
      const row = Math.floor(index / 9);
      const column = index % 9;

      this.board[row][column] = 0;
      this.given[row][column] = false;
    }

    this.emptyCells = this.shuffle(cells.slice(0, removals).map(index => ({
      row: Math.floor(index / 9), column: index % 9,
    })));

    this.notes = Array.from({length: 9},
        () => Array.from({length: 9}, () => []));

    this.mistakes = [];
    this.currentCell = null;
    this.completed = 0;

    this.phase = 'intro';
    this.phaseFrame = 0;
    this.actionIndex = 0;
    this.frameDelay = 0;

    this.clear();
  }

  pixel(x, y, colour) {
    x = Math.floor(x);
    y = Math.floor(y);

    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      this.display.setPixel(x, y, colour);
    }
  }

  clear() {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this.pixel(x, y, this.colours.background);
      }
    }
  }

  drawRect(x0, y0, x1, y1, colour) {
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        this.pixel(x, y, colour);
      }
    }
  }

  drawDigit(digit, x, y, w, h, colour) {
    const glyph = this.font[digit];
    if (!glyph || w < 1 || h < 1) {
      return;
    }

    if (w < 3 || h < 5) {
      this.pixel(x + Math.floor(w / 2), y + Math.floor(h / 2), colour);
      return;
    }

    const ox = x + Math.floor((w - 3) / 2);
    const oy = y + Math.floor((h - 5) / 2);

    for (let gy = 0; gy < 5; gy++) {
      for (let gx = 0; gx < 3; gx++) {
        if (glyph[gy] & (1 << (2 - gx))) {
          this.pixel(ox + gx, oy + gy, colour);
        }
      }
    }
  }

  drawCross(x, y, w, h) {
    const size = Math.min(w, h, 5);
    if (size < 2) {
      this.pixel(x + Math.floor(w / 2), y + Math.floor(h / 2),
          this.colours.mistake);
      return;
    }

    const ox = x + Math.floor((w - size) / 2);
    const oy = y + Math.floor((h - size) / 2);

    for (let i = 0; i < size; i++) {
      this.pixel(ox + i, oy + i, this.colours.mistake);
      this.pixel(ox + size - 1 - i, oy + i, this.colours.mistake);
    }
  }

  candidates(row, column) {
    const used = new Set();

    for (let i = 0; i < 9; i++) {
      if (this.board[row][i]) {
        used.add(this.board[row][i]);
      }
      if (this.board[i][column]) {
        used.add(this.board[i][column]);
      }
    }

    const boxRow = Math.floor(row / 3) * 3;
    const boxcolumn = Math.floor(column / 3) * 3;

    for (let r = boxRow; r < boxRow + 3; r++) {
      for (let c = boxcolumn; c < boxcolumn + 3; c++) {
        if (this.board[r][c]) {
          used.add(this.board[r][c]);
        }
      }
    }

    return [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(n => !used.has(n));
  }

  isMistake(row, column) {
    return this.mistakes.some(
        cell => cell.row === row && cell.column === column);
  }

  cellcolour(row, column) {
    if (this.currentCell && this.currentCell.row === row &&
        this.currentCell.column === column) {
      return [45, 38, 0];
    }

    return this.colours.background;
  }

  drawCell(row, column, x0, y0, x1, y1) {
    const w = x1 - x0;
    const h = y1 - y0;
    const digit = this.board[row][column];

    this.drawRect(x0, y0, x1, y1, this.cellcolour(row, column));

    if (digit !== 0) {
      const colour = this.given[row][column] ?
          this.colours.given :
          this.colours.solved;
      this.drawDigit(digit, x0, y0, w, h, colour);
    } else if (this.notes[row][column].length > 0) {
      const count = Math.min(3, this.notes[row][column].length);

      for (let i = 0; i < count; i++) {
        this.pixel(x0 + 1 + (i % Math.max(1, w - 2)),
            y0 + 1 + (i % Math.max(1, h - 2)), this.colours.notes);
      }
    }

    if (this.isMistake(row, column)) {
      this.drawCross(x0, y0, w, h);
    }
  }

  drawGridLines(x0, y0, cellW, cellH, count, scale) {
    const getPos = (i, cellDim, maxDim) => (i === count) ? maxDim - 1 : Math.floor(i * cellDim);

    for (let i = 0; i <= count; i++) {
      if (i % 3 === 0) {
        continue;
      }

      const x = getPos(i, cellW, this.width);
      const y = getPos(i, cellH, this.height);

      for (let py = 0; py < this.height; py++) {
        this.pixel(x, py, this.colours.grid);
      }
      for (let px = 0; px < this.width; px++) {
        this.pixel(px, y, this.colours.grid);
      }
    }

    for (let i = 0; i <= count; i += 3) {
      const x = getPos(i, cellW, this.width);
      const y = getPos(i, cellH, this.height);

      for (let py = 0; py < this.height; py++) {
        this.pixel(x, py, this.colours.box);
      }
      for (let px = 0; px < this.width; px++) {
        this.pixel(px, y, this.colours.box);
      }
    }
  }

  drawFullBoard() {
    const cw = this.width / 9;
    const ch = this.height / 9;

    for (let row = 0; row < 9; row++) {
      for (let column = 0; column < 9; column++) {
        const x0 = Math.floor(column * cw);
        const y0 = Math.floor(row * ch);
        const x1 = (column === 8) ? this.width : Math.floor((column + 1) * cw);
        const y1 = (row === 8) ? this.height : Math.floor((row + 1) * ch);

        this.drawCell(row, column, x0, y0, x1, y1);
      }
    }

    this.drawGridLines(0, 0, cw, ch, 9, 1);
  }

  drawCompletion() {
    const inset = this.phaseFrame % 3;

    for (let x = inset; x < this.width - inset; x++) {
      this.pixel(x, inset, this.colours.complete);
      this.pixel(x, this.height - 1 - inset, this.colours.complete);
    }

    for (let y = inset; y < this.height - inset; y++) {
      this.pixel(inset, y, this.colours.complete);
      this.pixel(this.width - 1 - inset, y, this.colours.complete);
    }
  }

  drawGrid() {
    this.clear();

    this.drawFullBoard();

    if (this.phase === 'complete') {
      this.drawCompletion();
    }

    this.display.flush();
  }

  makeMistake(cell) {
    const correct = this.solution[cell.row][cell.column];

    const choices = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(n => n !== correct);

    this.board[cell.row][cell.column] = choices[this.randomInt(choices.length)];

    this.currentCell = cell;
    this.mistakes = [cell];
    this.phase = 'mistake';
    this.phaseFrame = 0;
  }

  update() {
    this.frameDelay++;

    if (this.frameDelay < 3) {
      return;
    }
    this.frameDelay = 0;

    this.phaseFrame++;

    switch (this.phase) {
      case 'intro': {
        this.drawGrid();

        if (this.phaseFrame >= 27) {
          this.phase = 'notes';
          this.phaseFrame = 0;
          this.actionIndex = 0;
        }
        break;
      }

      case 'notes': {
        if (this.actionIndex < this.emptyCells.length) {
          const cell = this.emptyCells[this.actionIndex];

          this.currentCell = cell;

          this.notes[cell.row][cell.column] = this.candidates(cell.row,
              cell.column).slice(0, 4);

          this.drawGrid();
          this.actionIndex++;
        } else {
          this.phase = 'mistakes';
          this.phaseFrame = 0;
          this.actionIndex = 0;
        }
        break;
      }

      case 'mistakes': {
        if (this.actionIndex < Math.min(3, this.emptyCells.length)) {
          const cell = this.emptyCells[this.actionIndex];

          this.actionIndex++;
          this.makeMistake(cell);
          this.drawGrid();
        } else {
          this.phase = 'solve';
          this.phaseFrame = 0;
          this.actionIndex = 0;
          this.mistakes = [];
          this.currentCell = null;
        }
        break;
      }

      case 'mistake': {
        this.drawGrid();

        if (this.phaseFrame >= 5) {
          const cell = this.currentCell;

          this.board[cell.row][cell.column] = 0;
          this.notes[cell.row][cell.column] = [];
          this.mistakes = [];
          this.currentCell = null;

          this.phase = 'mistakes';
          this.phaseFrame = 0;
        }
        break;
      }

      case 'solve': {
        if (this.actionIndex < this.emptyCells.length) {
          const cell = this.emptyCells[this.actionIndex];

          this.currentCell = cell;

          /* Briefly show notes before entering some answers. */
          if (this.actionIndex % 6 === 0 && this.phaseFrame < 3) {
            this.notes[cell.row][cell.column] = this.candidates(cell.row,
                cell.column).slice(0, 3);

            this.drawGrid();
            break;
          }

          this.board[cell.row][cell.column] = this.solution[cell.row][cell.column];

          this.notes[cell.row][cell.column] = [];
          this.completed++;
          this.actionIndex++;
          this.phaseFrame = 0;

          this.drawGrid();
        } else {
          this.currentCell = null;
          this.phase = 'complete';
          this.phaseFrame = 0;
        }
        break;
      }

      case 'complete': {
        this.drawGrid();

        if (this.phaseFrame >= 45) {
          this.reset();
        }
        break;
      }
    }
  }
};