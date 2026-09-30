/* Nine Men's Morris Animation by Austin Welsh-Graham */

return class MyEffect {
  constructor(display) {
    this.display = display;
    this.width = display.width;
    this.height = display.height;

    this.colours = {
      background: [0, 0, 0],
      board: [20, 100, 180],
      node: [35, 130, 210],
      red: [255, 45, 50],
      yellow: [255, 220, 35],
      selected: [255, 255, 255],
      mill: [100, 255, 180],
      celebration: [100, 255, 180],
    };

    this.points = [
      [0, 0], [3, 0], [6, 0], [6, 3], [6, 6], [3, 6], [0, 6], [0, 3],

      [1, 1], [3, 1], [5, 1], [5, 3], [5, 5], [3, 5], [1, 5], [1, 3],

      [2, 2], [3, 2], [4, 2], [4, 3], [4, 4], [3, 4], [2, 4], [2, 3]];

    this.edges = [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
      [6, 7],
      [7, 0],

      [8, 9],
      [9, 10],
      [10, 11],
      [11, 12],
      [12, 13],
      [13, 14],
      [14, 15],
      [15, 8],

      [16, 17],
      [17, 18],
      [18, 19],
      [19, 20],
      [20, 21],
      [21, 22],
      [22, 23],
      [23, 16],

      [1, 9],
      [9, 17],
      [3, 11],
      [11, 19],
      [5, 13],
      [13, 21],
      [7, 15],
      [15, 23]];

    this.mills = [
      [0, 1, 2], [2, 3, 4], [4, 5, 6], [6, 7, 0],

      [8, 9, 10], [10, 11, 12], [12, 13, 14], [14, 15, 8],

      [16, 17, 18], [18, 19, 20], [20, 21, 22], [22, 23, 16],

      [1, 9, 17], [3, 11, 19], [5, 13, 21], [7, 15, 23]];

    this.adjacency = Array.from({length: 24}, () => []);

    for (const [a, b] of this.edges) {
      this.adjacency[a].push(b);
      this.adjacency[b].push(a);
    }

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

  reset() {
    this.board = Array(24).fill(0);

    this.players = {
      1: {
        colour: this.colours.red, placed: 0, pieces: 9,
      }, 2: {
        colour: this.colours.yellow, placed: 0, pieces: 9,
      },
    };

    this.turn = 1;
    this.phase = 'place';
    this.phaseFrame = 0;
    this.frameDelay = 0;

    this.selected = -1;
    this.lastMove = -1;
    this.highlightMill = [];
    this.captureTarget = -1;
    this.winner = 0;

    this.placementOrder = this.shuffle(Array.from({length: 24}, (_, i) => i));

    this.placementIndex = 0;
    this.moveCount = 0;
    this.millPause = 0;

    this.clear();
  }

  pixel(x, y, colour) {
    x = Math.round(x);
    y = Math.round(y);

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

  screenPoint(index) {
    const [gx, gy] = this.points[index];

    const margin = 1;
    const usableW = Math.max(1, this.width - 1 - margin * 2);
    const usableH = Math.max(1, this.height - 1 - margin * 2);

    const side = Math.min(usableW, usableH);
    const left = Math.floor((this.width - side) / 2);
    const top = Math.floor((this.height - side) / 2);

    return {
      x: left + margin + gx * (side - 1) / 6,
      y: top + margin + gy * (side - 1) / 6,
    };
  }

  line(x0, y0, x1, y1, colour) {
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);

    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;

    let err = dx - dy;

    while (true) {
      this.pixel(x0, y0, colour);

      if (x0 === x1 && y0 === y1) {
        break;
      }

      const e2 = 2 * err;

      if (e2 > -dy) {
        err -= dy;
        x0 += sx;
      }

      if (e2 < dx) {
        err += dx;
        y0 += sy;
      }
    }
  }

  drawBoard() {
    for (const [a, b] of this.edges) {
      const p1 = this.screenPoint(a);
      const p2 = this.screenPoint(b);

      this.line(p1.x, p1.y, p2.x, p2.y, this.colours.board);
    }

    for (let i = 0; i < 24; i++) {
      const p = this.screenPoint(i);

      let colour = this.colours.node;

      if (this.highlightMill.includes(i)) {
        colour = this.colours.celebration;
      }

      this.pixel(p.x, p.y, colour);
    }
  }

  drawPiece(index, colour, radius) {
    const p = this.screenPoint(index);
    const r = Math.max(0, Math.floor(radius));

    if (r === 0) {
      this.pixel(p.x, p.y, colour);
      return;
    }

    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy <= r * r + 1) {
          this.pixel(p.x + dx, p.y + dy, colour);
        }
      }
    }
  }

  drawPieces() {
    const radius = this.width >= 18 && this.height >= 18 ? 1 : 0;

    for (let i = 0; i < 24; i++) {
      if (this.board[i] === 0) {
        continue;
      }

      const colour = this.players[this.board[i]].colour;

      this.drawPiece(i, colour, radius);
    }

    if (this.selected >= 0) {
      const p = this.screenPoint(this.selected);

      this.pixel(p.x, p.y, this.colours.selected);
    }

    if (this.lastMove >= 0 && this.phaseFrame % 4 < 2) {
      const p = this.screenPoint(this.lastMove);

      this.pixel(p.x, p.y, this.colours.selected);
    }

    if (this.captureTarget >= 0 && this.phaseFrame % 2 === 0) {
      const p = this.screenPoint(this.captureTarget);

      this.pixel(p.x, p.y, this.colours.mistake || [255, 50, 50]);
    }
  }

  draw() {
    this.clear();
    this.drawBoard();
    this.drawPieces();

    if (this.phase === 'celebrate') {
      this.drawCelebration();
    }

    this.display.flush();
  }

  isMillAt(index, player) {
    return this.mills.some(mill => mill.includes(index) &&
        mill.every(point => this.board[point] === player));
  }

  findNewMill(index, player) {
    return this.mills.find(mill => mill.includes(index) &&
        mill.every(point => this.board[point] === player)) || null;
  }

  findCapture(player) {
    const opponent = player === 1 ? 2 : 1;

    const enemyPieces = [];

    for (let i = 0; i < 24; i++) {
      if (this.board[i] === opponent) {
        enemyPieces.push(i);
      }
    }

    if (enemyPieces.length === 0) {
      return -1;
    }

    const outsideMills = enemyPieces.filter(i => !this.isMillAt(i, opponent));

    const targets = outsideMills.length > 0 ? outsideMills : enemyPieces;

    return targets[this.randomInt(targets.length)];
  }

  switchTurn() {
    this.turn = this.turn === 1 ? 2 : 1;
  }

  placePiece() {
    const available = this.placementOrder.filter(
        index => this.board[index] === 0);

    if (available.length === 0) {
      this.phase = 'celebrate';
      this.winner = 0;
      this.phaseFrame = 0;
      return;
    }

    const index = available[0];

    this.board[index] = this.turn;
    this.players[this.turn].placed++;
    this.lastMove = index;

    const mill = this.findNewMill(index, this.turn);

    if (mill) {
      this.highlightMill = mill.slice();
      this.captureTarget = this.findCapture(this.turn);
      this.phase = this.captureTarget >= 0 ? 'capture' : 'pause';
      this.phaseFrame = 0;
      return;
    }

    if (this.players[1].placed >= 9 && this.players[2].placed >= 9) {
      this.phase = 'move';
    }

    this.switchTurn();
  }

  movablePieces(player) {
    const result = [];

    for (let i = 0; i < 24; i++) {
      if (this.board[i] !== player) {
        continue;
      }

      const destinations = this.adjacency[i].filter(
          destination => this.board[destination] === 0);

      if (destinations.length > 0) {
        result.push({
          from: i, destinations,
        });
      }
    }

    if (this.players[player].pieces === 3) {
      const empty = this.board.map((piece, i) => piece === 0 ? i : -1).
          filter(i => i >= 0);

      for (let i = 0; i < 24; i++) {
        if (this.board[i] === player && !result.some(item => item.from === i)) {
          result.push({
            from: i, destinations: empty,
          });
        }
      }
    }

    return result;
  }

  movePiece() {
    if (this.moveCount >= 100) {
      this.winner = 0;
      this.phase = 'celebrate';
      this.phaseFrame = 0;
      return;
    }

    const options = this.movablePieces(this.turn);

    if (options.length === 0) {
      this.winner = this.turn === 1 ? 2 : 1;
      this.phase = 'celebrate';
      this.phaseFrame = 0;
      return;
    }

    const option = options[this.randomInt(options.length)];
    const destination = option.destinations[this.randomInt(
        option.destinations.length)];

    this.board[option.from] = 0;
    this.board[destination] = this.turn;

    this.lastMove = destination;
    this.selected = option.from;
    this.moveCount++;

    const mill = this.findNewMill(destination, this.turn);

    if (mill) {
      this.highlightMill = mill.slice();
      this.captureTarget = this.findCapture(this.turn);
      this.phase = this.captureTarget >= 0 ? 'capture' : 'pause';
      this.phaseFrame = 0;
      return;
    }

    this.selected = -1;

    const opponent = this.turn === 1 ? 2 : 1;

    if (this.players[opponent].pieces < 3 ||
        this.movablePieces(opponent).length === 0) {
      this.winner = this.turn;
      this.phase = 'celebrate';
      this.phaseFrame = 0;
      return;
    }

    this.switchTurn();
  }

  removePiece() {
    if (this.captureTarget >= 0) {
      const victim = this.board[this.captureTarget];

      if (victim !== 0) {
        this.board[this.captureTarget] = 0;
        this.players[victim].pieces--;
        this.moveCount = 0;
      }
    }

    this.captureTarget = -1;
    this.highlightMill = [];
    this.selected = -1;

    const opponent = this.turn === 1 ? 2 : 1;

    if (this.players[opponent].pieces < 3) {
      this.winner = this.turn;
      this.phase = 'celebrate';
      this.phaseFrame = 0;
      return;
    }

    this.phase = 'pause';
    this.phaseFrame = 0;
  }

  drawCelebration() {
    if (this.winner === 0) {
      const colour = this.phaseFrame % 6 < 3 ?
          this.colours.board :
          this.colours.celebration;

      for (const [a, b] of this.edges) {
        const p1 = this.screenPoint(a);
        const p2 = this.screenPoint(b);

        this.line(p1.x, p1.y, p2.x, p2.y, colour);
      }

      return;
    }

    const colour = this.players[this.winner].colour;

    if (this.phaseFrame % 4 < 2) {
      for (let i = 0; i < 24; i++) {
        if (this.board[i] === this.winner) {
          this.drawPiece(i, colour, 1);
        }
      }
    }
  }

  update() {
    this.frameDelay++;

    if (this.frameDelay < 4) {
      return;
    }

    this.frameDelay = 0;
    this.phaseFrame++;

    switch (this.phase) {
      case 'place': {
        if (this.players[1].placed >= 9 && this.players[2].placed >= 9) {
          this.phase = 'move';
          this.phaseFrame = 0;
          break;
        }

        this.placePiece();
        break;
      }

      case 'move': {
        this.movePiece();
        break;
      }

      case 'capture': {
        if (this.phaseFrame >= 5) {
          this.removePiece();
        }
        break;
      }

      case 'pause': {
        if (this.phaseFrame >= 3) {
          this.switchTurn();

          const placementComplete = this.players[1].placed >= 9 &&
              this.players[2].placed >= 9;

          this.phase = placementComplete ? 'move' : 'place';
          this.phaseFrame = 0;
        }
        break;
      }

      case 'celebrate': {
        if (this.phaseFrame >= 32) {
          this.reset();
        }
        break;
      }
    }

    this.draw();
  }
}