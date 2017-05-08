"use strict";

var Yinsh = {};

if (typeof module !== 'undefined' && exports) {
  Yinsh = exports;
}

(function() {
  Yinsh.Constants = {
    COORD_MAX: 5,
    COORD_MIN: -5,
    NUM_MARKERS: 51,
    NUM_RINGS: 5,
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

  Yinsh.NoPosition = {};

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

  class Predicates {
    static IsColor(expected) {
      const predicates = [];
      predicates[Yinsh.Color.Black] = IsBlack;
      predicates[Yinsh.Color.White] = IsWhite;
      return predicates[expected];
    }
    static IsBlack(color) { return color == Yinsh.Color.BLACK; }
    static IsWhite(color) { return color == Yinsh.Color.WHITE; }
    static IsRing(kind) { return kind == Yinsh.PieceKind.RING; }
    static IsInactive(state) { return state == Yinsh.PieceState.INACTIVE; }
    static IsActive(state) { return state == Yinsh.PieceState.ACTIVE; }
  };

  const Validators = [];

  Validators[Yinsh.MoveKind.PLACE_RING] = function(move, state) {
    if (state.current_player != move.player) return false;

    const unused_player_rings = state.FilterPieces(
      IsColor(move.player), IsRing, IsInactive);
    if (unused_player_rings.length == 0) return false;

    if (GetPieceAt(move.target_position) !== undefined) return false;

    return true;
  };

  Yinsh.MoveValidator = class {
    static Validate(move, state) {
      return Validators[move.kind](move, state);
    }
  };

  Yinsh.GameState = class {
    constructor() {
      this.pieces = [];
      this.board = [];
      this.current_player = Yinsh.Color.WHITE;
      this.phase = Yinsh.Phase.INITIAL_RING_PLACEMENT;
    }

    static NewInitialState() {
      const state = new Yinsh.GameState();

      for (let i = 0; i < Yinsh.Constants.NUM_MARKERS; i++) {
        state.pieces.push(
          new Yinsh.Piece(Yinsh.Color.WHITE, Yinsh.PieceKind.MARKER));
      }

      for (let i = 0; i < Yinsh.Constants.NUM_RINGS; i++) {
        state.pieces.push(
          new Yinsh.Piece(Yinsh.Color.WHITE, Yinsh.PieceKind.RING));
        state.pieces.push(
          new Yinsh.Piece(Yinsh.Color.BLACK, Yinsh.PieceKind.RING));
      }

      return state;
    }

    FilterPieces(colorPredicate, kindPredicate, statePredicate) {
      return this.pieces.filter(p => {
        return colorPredicate(p.color) &&
               kindPredicate(p.kind) &&
               statePredicate(p.state);
      });
    }

    GetPieceAt(position) {
      const pieces = this.pieces.filter(p => {
        if (IsInactive(p)) return false;
        if (p.position == Yinsh.NoPosition) return false;
        const {x, y, z} = p.position;
        return position.x == x && position.y == y && position.z == z;
      });
      if (pieces.length != 1) return undefined;
      return pieces[0];
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
