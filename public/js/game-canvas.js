// The yinsh board is hexagonal with a side length of 6 all edge hexes missing.
// In cube-coords, we have all (x, y, z) s.t. x+y+z = 0. Edge hexes
// have one coord equal 0 and the others are \in {6, -6}.
// Each hex represents a point.
// http://www.redblobgames.com/grids/hexagons/

"use strict";

function cartesianToDisplay(pt) {
  const bounds = paper.view.bounds;
  const scale = 40;
  const translate = new paper.Point(bounds.width / 2, bounds.height / 2);
  return pt.multiply(scale).add(translate);
}

function cubeToDisplay(hex) {
  const layout = new Layout(layout_flat, new Point(1, 1), new Point(0, 0));
  const pixel = hex_to_pixel(layout, hex);

  const point = new paper.Point(pixel.x, pixel.y);
  return cartesianToDisplay(point);
}

function displayToCube(pt) {
  const bounds = paper.view.bounds;
  const scale = 40;
  const translate = new paper.Point(bounds.width / 2, bounds.height / 2);

  const cartesian = pt.subtract(translate).divide(scale);
  const pixel = new Point(cartesian.x, cartesian.y);

  const layout = new Layout(layout_flat, new Point(1, 1), new Point(0, 0));
  return hex_round(pixel_to_hex(layout, pixel));
}

function drawRing(piece) {
  piece.kind.should.be.exactly(Yinsh.PieceKind.RING);

  const pt = cubeToDisplay(piece.position);
  const color = (piece.color == Yinsh.Color.WHITE) ? 'white' : 'black';

  const path = new paper.Path.Circle({
    center: pt,
    radius: 30,
    strokeColor: color,
    strokeWidth: 9,
  });
}

function drawMarker(piece) {
  piece.kind.should.be.exactly(Yinsh.PieceKind.MARKER);

  const pt = cubeToDisplay(piece.position);
  const fill_color = (piece.color == Yinsh.Color.WHITE) ? 'white' : 'black';
  const stroke_color = (piece.color == Yinsh.Color.WHITE) ? 'black' : 'white';

  const path = new paper.Path.Circle({
    center: pt,
    radius: 23,
    strokeColor: stroke_color,
    fillColor: fill_color,
    strokeWidth: 2,
  });
}

function drawSelection(position) {
  const pt = cubeToDisplay(position);
  const color = (thisPlayer == Yinsh.Color.WHITE) ? 'white' : 'black';

  const path = new paper.Path.Circle({
    center: pt,
    radius: 45,
    strokeColor: color,
    strokeWidth: 9,
    dashArray: [1, 1],
  });
}

function drawPiece(piece) {
  if (piece.state != Yinsh.PieceState.ACTIVE) return;

  switch (piece.kind) {
    case Yinsh.PieceKind.RING:
      drawRing(piece);
      break;
    case Yinsh.PieceKind.MARKER:
      drawMarker(piece);
      break;
  }
}

function drawGuide(from, to) {
  const from_pt = cubeToDisplay(from);
  const to_pt   = cubeToDisplay(to);

  const color = 'white';

  new paper.Path.Line({
    segments: [from_pt, to_pt],
    strokeColor: color,
    strokeWidth: 10,
    strokeCap: 'round',
    dashArray: [4, 20],
  });
}

let state = undefined;
let socket = undefined;

let selected_position = undefined;
let partial_move = undefined;

function drawBoard() {
  var background = new paper.Shape.Rectangle({
    rectangle: paper.view.bounds,
    fillColor: 0.5
  });

  if (state === undefined) return;

  const n = 5;
  const points = [];
  for (let x = -n; x <= n; x++) {
    for (let y = -n; y <= n; y++) {
      const z = 0 - x - y;
      if (z < -n || z > n) continue;
      if ([x, y, z].sort().join(',') == [-n, 0, n].join(',')) continue;
      points.push(new Hex(x, y, z));
    }
  }

  const layout = new Layout(layout_flat, new Point(1, 1), new Point(0, 0));

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const {x, y} = hex_to_pixel(layout, p);

    const paper_point = cartesianToDisplay(new paper.Point(x, y));

    const path = new paper.Path.Circle(paper_point, 4);
    path.strokeColor = 'black';
    path.fillColor = 'black'
  }

  for (let x = -n; x <= n; x++) {
    let that = (x <= 0) ? n : n - x;
    if (Math.abs(x) == n || x == 0) that--;

    let from = [x, that, 0 - x - that];
    let to   = [x, 0 - x - that, that];

    for (let i = 0; i < 3; i++) {
      const from_pt = cubeToDisplay(new Hex(...from));
      const to_pt   = cubeToDisplay(new Hex(...to));

      const path = new paper.Path.Line({
        segments: [from_pt, to_pt],
        strokeColor: 'black',
        strokeWidth: 2,
        strokeCap: 'round',
      });

      from = from.slice(1).concat(from[0]);
      to = to.slice(1).concat(to[0]);
    }
  }

  state.pieces.forEach(drawPiece);

  if (selected_position !== undefined) {
    drawSelection(selected_position);
  }
}

function handleMouseDownEvent(event) {
  if (state === undefined) return true;
  if (!state.IsCurrentPlayer(thisPlayer)) return true;

  const clicked_position = displayToCube(event.point);
  switch (state.phase) {
    case Yinsh.Phase.INITIAL_RING_PLACEMENT:
      const move = Yinsh.Move.PlaceRing(thisPlayer, clicked_position);
      socket.emit('client-send-move', move);
      break;
    case Yinsh.Phase.MARKER_PLACEMENT:
      if (partial_move === undefined) {
        partial_move = { source_position: clicked_position };
        selected_position = clicked_position;
        drawSelection(clicked_position);
      } else {
        const move = Yinsh.Move.PlaceMarker(thisPlayer,
          partial_move.source_position, clicked_position);

        socket.emit('client-send-move', move);

        partial_move = undefined;
        selected_position = undefined;
        drawBoard();  // Could skip if we sent InvalidMove and refreshed on that.
      }
      break;
  }

  return true;
}

window.onload = function() {
  var canvas = document.getElementById('gameCanvas');
  paper.setup(canvas);

  paper.view.onResize = (event) => drawBoard();
  paper.view.onMouseDown = (event) => handleMouseDownEvent(event);

  const identity = {
    gameId: gameId,
    player: thisPlayer,
  };

  socket = io.connect();
  socket.on('host-request-identity',
    () => socket.emit('client-send-identity', identity));

  socket.on('host-send-state', (data) => {
    state = Yinsh.GameState.From(data);

    drawBoard();
    paper.view.draw();
  });
};
