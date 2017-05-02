"use strict";

var Yinsh = {};

(function() {
  Yinsh.Constants = class {
    get coord_max() {
      return 5;
    }

    get coord_min() {
      return -5;
    }
  };

  Yinsh.Color = {
    WHITE: 0,
    BLACK: 1,
  };

  Yinsh.PieceState = {
    ACTIVE: 0,
    INACTIVE: 1,
  };

  Yinsh.PieceKind = {
    RING: 0,
    MARKER: 1,
  };

  Yinsh.Phase = {
    INITIAL_RING_PLACEMENT: 0,
    MARKER_PLACEMENT: 1,
    ROW_REMOVAL: 2,
  };

  Yinsh.NoPosition = undefined;

  Yinsh.Piece = class {
    constructor(color, kind) {
      this.color = color;
      this.kind = kind;
      this.state = Yinsh.PieceState.INACTIVE;
      this.position = Yinsh.NoPosition;
    }
  };

  Yinsh.MoveKind = {
    PLACE_RING: 0,
    PLACE_MARKER: 1,
    REMOVE_ROW: 2,
    REMOVE_RING: 3,
  };

  Yinsh.Move = class {
    constructor(player, kind, data) {
      this.player = player;
      this.kind = kind;
      this.data = data;
    }
  };

  Yinsh.GameState = class {
    constructor() {
      this.pieces = [];
      this.board = [];
      this.current_player = Yinsh.Color.WHITE;
    }
  };

  Yinsh.History = class {
    constructor() {
      this.moves = [];
    }

    pushMove(move) {
      this.moves.push(move);
    }
  };
})();
