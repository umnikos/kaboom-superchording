// PROBLEM: left clicking on every number 2^i times in advanced mode solves all boards if the resolution system is a sat solver
// and if it is not then it's unclear if all logical deductions can be expressed with a weaker resolver
// POSSIBLE RESOLUTIONS:
// - prove (the) weaker resolver can still be used to express anything a sat solver comes up with
// - change the game of minesweeper to something else entirely!

// TODO:
// better ui for advanced superchording
//   - numbers on higher values
//   - red and green colorings indicating what will be resolved as safe or mine
// figure out why that one puzzle is impossible to superchord
// game saving

// css in js!
function addGlobalStyle(css) {
    var head, style;
    head = document.getElementsByTagName('head')[0];
    if (!head) { return; }
    style = document.createElement('style');
    style.type = 'text/css';
    style.innerHTML = css;
    head.appendChild(style);
}

function makeStyle() {
  addGlobalStyle('.cell.chord-label { font-family: sans-serif }')
  addGlobalStyle('.cell.label-plus::after  { content:  "☉"; }');
  addGlobalStyle('.cell.label-minus::after  { content:  "🝰"; }');
  addGlobalStyle('.cell.label-high-plus::after  { content:  "⊛"; }');
  addGlobalStyle('.cell.label-low-minus::after  { content:  "♌︎"; }');
  addGlobalStyle('.cell.super-highlight  { background: #fff999; }');
}

function new_cellClick(e, x, y) {
  e.preventDefault();
  switch (e.button) {
    case 0:
        console.log("click!");
        if (this.__proto__.superchording.advanced) {
          this.chordAroundCell(x,y,1);
        } else {
          this.chordAroundCell(x,y,0);
        }
        if (this.unsafeMode || !this.solver.hasSafeCells()) {
            this.reveal(x,y);
        }
      break;
  }

}

function new_cellMouseDown(e, x, y) {
    switch(e.button) {
      case 1:
        e.preventDefault();
        console.log("middle click!");
        if (this.__proto__.superchording.advanced) {
          this.resolveWhite();
          this.resetSuperchording();
        } else {
          this.__proto__.superchording.advanced = true;
          this.refreshMana();
        }
        break;
      case 2:
        e.preventDefault();
        console.log("right click!");
        if (this.__proto__.superchording.advanced) {
          this.chordAroundCell(x,y,-1);
        } else {
          this.resetSuperchording();
        }
        break;
      default:
        e.preventDefault();
        console.log("MYSTERY CLICK!");
        break;
    }
}

function new_cellDblClick(e, x, y) {
  e.preventDefault();
  console.log("double click!");
}

function new_chordAroundCell(x,y,n) {
  if (!(this.state === State.PLAYING && this.map.labels[y][x] !== null)) {
    return;
  }
  this.cells[y][x].className += " super-highlight";
  let my_neighbors = Array.from(neighbors(x, y, this.width, this.height));
  let neighborflags = my_neighbors.filter(([x0,y0])=>(this.flags[y0][x0])).length;
  let value = this.map.labels[y][x] - neighborflags;
  this.chordAround(my_neighbors,value,n);
}

function new_chordAround(my_neighbors, value, n) {
  if (!(this.state === State.PLAYING)) {
    return;
  }

  let increment = 1;
  if (n != 0) {
    increment = n;
  }

  let blackcounts = [];
  let whitecounts = [];
  let neighborflags = 0;
  for (const [x0,y0] of my_neighbors) {
    let mydot = this.__proto__.superchording.dots.get(x0 + "," + y0);
    if (mydot < 0) {
      blackcounts.push(mydot);
    }
    if (mydot > 0) {
      whitecounts.push(mydot);
    }
    if (this.flags[y0][x0]) {
      neighborflags += 1;
    }
  }

  //debugger;
  if (n == 0 && blackcounts.length > 0 && whitecounts.length > 0) {
    return;
  }

  console.log("da counts:");
  console.log(whitecounts);
  console.log(blackcounts);
  console.log(this.__proto__.superchording)

  if (n == 0 && whitecounts.length > 0) {
    this.__proto__.superchording = this.negateDots();
  }

  console.log("gonna be adding to:")
  console.log(this.__proto__.superchording)
  this.__proto__.superchording.sum += increment*value;

  for (const [x0,y0] of my_neighbors) {
    let coords = [x0,y0]
    if (!(this.map.labels[y0][x0] === null && !this.flags[y0][x0])) {
      continue;
    }
    let current_dot = this.__proto__.superchording.dots.get(x0 + "," + y0);
    if (current_dot === undefined) {
      current_dot = 0;
    }
    this.__proto__.superchording.dots.set(x0 + "," + y0, current_dot+increment);
  }

  if (n == 0 && this.__proto__.superchording.sum < 0) {
    this.__proto__.superchording = this.negateDots();
  }

  this.refreshMana();
  this.refreshChording();
  if (n == 0) {
    this.resolveWhite();
  }
}

function new_chordGlobal() {
  let my_neighbors = [];
  for (x=0; x<this.width; x++) {
    for (y=0; y<this.height; y++) {
      my_neighbors.push([x,y])
    }
  }
  let neighborflags = my_neighbors.filter(([x0,y0])=>(this.flags[y0][x0])).length;
  let value = this.numMines - neighborflags;
  if (this.__proto__.superchording.advanced) {
    this.chordAround(my_neighbors,value,1); // TODO - right click to subtract
  } else {
    this.chordAround(my_neighbors,value,0);
  }

}

function new_refreshChording() {
  for (const [coords, value] of this.__proto__.superchording.dots.entries()) {
    let [x0,y0] = coords.split(",").map(Number);
    if (value < -1) {
      this.cells[y0][x0].className = "label-low-minus";
    }
    if (value === -1) {
      this.cells[y0][x0].className = "label-minus";
    }
    if (value === 0) {
      this.cells[y0][x0].className = "";
    }
    if (value === 1) {
      this.cells[y0][x0].className = "label-plus";
    }
    if (value > 1) {
      this.cells[y0][x0].className = "label-high-plus";
    }
    this.cells[y0][x0].className = "cell unknown chord-label " + this.cells[y0][x0].className
  }
}

function negateDots() {
  console.log("NEGATE!");
  let res = {
    sum: -this.__proto__.superchording.sum,
    dots: new Map()
  }
  for (const [coords, value] of this.__proto__.superchording.dots.entries()) {
    res.dots.set(coords, -value);
  }
  return res;
}

function resolveWhite() {
  if (this.__proto__.superchording.sum < 0) {
    this.__proto__.superchording = this.negateDots();
  }
  let whitecounts = [];
  let blackcounts = [];
  console.log(this.__proto__.superchording.dots);
  for (const [coords, value] of this.__proto__.superchording.dots.entries()) {
    let [x0,y0] = coords.split(",").map(Number);
    if (value < 0) {
      blackcounts.push(value);
    }
    if (value > 0) {
      whitecounts.push(value)
    }
  }
  if (this.__proto__.superchording.sum == 0 && blackcounts.length == 0 && whitecounts.length > 0) {
    this.__proto__.superchording = this.negateDots();
    return this.resolveWhite();
  }
  blackcounts.sort((a,b)=>(b-a))
  whitecounts.sort((a,b)=>(a-b))
  console.log("counts:");
  console.log(whitecounts);
  console.log(blackcounts);
  let resolved = 0;
  let is_in = {}
  while (true) {
    if (whitecounts.length > 0) {
      let biggest_white = whitecounts.pop()
      let biggest_sum_without = whitecounts.reduce((a,b)=>a+b,0)
      let smallest_sum_with = blackcounts.reduce((a,b)=>a+b,0) + biggest_white;
      if (biggest_sum_without < this.__proto__.superchording.sum) {
        // then it must be in
        resolved += 1;
        is_in[biggest_white] = true;
        this.__proto__.superchording.sum -= biggest_white;
        continue;
      }
      if (smallest_sum_with > this.__proto__.superchording.sum) {
        // then it must be out
        resolved += 1;
        is_in[biggest_white] = false;
        continue;
      }
      whitecounts.push(biggest_white);
    }
    if (blackcounts.length > 0) {
      let smallest_black = blackcounts.pop();
      let biggest_sum_with = whitecounts.reduce((a,b)=>a+b,0) + smallest_black;
      let smallest_sum_without = blackcounts.reduce((a,b)=>a+b,0);
      if (biggest_sum_with < this.__proto__.superchording.sum) {
        // then it must be out
        resolved += 1;
        is_in[smallest_black] = false;
        continue;
      }
      if (smallest_sum_without > this.__proto__.superchording.sum) {
        // then it must be in
        resolved += 1;
        is_in[smallest_black] = true;
        this.__proto__.superchording.sum -= smallest_black;
        continue;
      }
      blackcounts.push(smallest_black)
    }
    // no `continue` was reached so no more deductions can be made
    break;
  }

  for (const [coords, value] of this.__proto__.superchording.dots.entries()) {
    let [x0,y0] = coords.split(",").map(Number);
    if (is_in[value] == true) {
      this.toggleFlag(x0,y0);
    }
    if (is_in[value] == false) {
      this.reveal(x0, y0, true);
    }
  }
  /*
  if (this.__proto__.superchording.sum == whitecount) {
    for (const [coords, value] of this.__proto__.superchording.dots.entries()) {
      let [x0,y0] = coords.split(",").map(Number);
      if (value < 0) {
        this.reveal(x0, y0, true);
      }
      if (value > 0) {
        this.toggleFlag(x0,y0);
      }
    }
    this.resetSuperchording();
  }
  if (this.__proto__.superchording.sum == -blackcount) {
    for (const [coords, value] of this.__proto__.superchording.dots.entries()) {
      let [x0,y0] = coords.split(",").map(Number);
      if (value > 0) {
        this.reveal(x0, y0, true);
      }
      if (value < 0) {
        this.toggleFlag(x0,y0);
      }
    }
    this.resetSuperchording();
  }
  */
  if (resolved > 0) {
    this.resetSuperchording();
  }
}

function resetSuperchording() {
  console.log("RESET");
  this.__proto__.superchording = {
    sum: 0,
    dots: new Map(),
    advanced: false
  }
  document.getElementById("game").children[1].onclick = function() { game.chordGlobal() }
  this.refreshMana();
  this.refresh();
}

function refreshMana() {
  let label = "Mana: ";
  if (this.__proto__.superchording.advanced) {
    label = "[ADVANCED] " + label;
  }
  document.getElementById("mana").innerHTML = label + this.__proto__.superchording.sum;
}

function makeManaDisplay() {
  let a = document.createElement("div");
  a.id = "mana";
  document.getElementsByClassName("card-body")[0].appendChild(a);
}

(function() {
  makeStyle();
  makeManaDisplay();
  Game.prototype.chordAround = new_chordAround;
  Game.prototype.cellClick = new_cellClick;
  Game.prototype.cellDblClick = new_cellDblClick;
  Game.prototype.cellMouseDown = new_cellMouseDown;
  Game.prototype.negateDots = negateDots;
  Game.prototype.resolveWhite = resolveWhite;
  Game.prototype.refreshMana = refreshMana;
  Game.prototype.resetSuperchording = resetSuperchording;
  Game.prototype.chordGlobal = new_chordGlobal;
  Game.prototype.refreshChording = new_refreshChording;
  Game.prototype.chordAroundCell = new_chordAroundCell;
  Game.prototype.resetSuperchording();
})();
