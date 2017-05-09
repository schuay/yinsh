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

  function OtherPlayer(thisPlayer) {
    switch (thisPlayer) {
      case Yinsh.Color.WHITE: return Yinsh.Color.BLACK;
      case Yinsh.Color.BLACK: return Yinsh.Color.WHITE;
    }
  }

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

    static PlaceRing(player, position) {
      return new Yinsh.Move(
        player, Yinsh.MoveKind.PLACE_RING, { target_position: position });
    }
  };

  class Predicates {
    static IsBlack(color) { return color == Yinsh.Color.BLACK; }
    static IsWhite(color) { return color == Yinsh.Color.WHITE; }
    static IsRing(kind) { return kind == Yinsh.PieceKind.RING; }
    static IsMarker(kind) { return kind == Yinsh.PieceKind.MARKER; }
    static IsInactive(state) { return state == Yinsh.PieceState.INACTIVE; }
    static IsActive(state) { return state == Yinsh.PieceState.ACTIVE; }

    static IsColor(expected) {
      const predicates = [];
      predicates[Yinsh.Color.BLACK] = Predicates.IsBlack;
      predicates[Yinsh.Color.WHITE] = Predicates.IsWhite;
      return predicates[expected];
    }
  };

  const Validators = [];

  Validators[Yinsh.MoveKind.PLACE_RING] = function(move, state) {
    if (state.current_player != move.player) return false;
    if (state.phase != Yinsh.Phase.INITIAL_RING_PLACEMENT) return false;

    const unused_player_rings = state.FilterPieces(
      Predicates.IsColor(move.player),
      Predicates.IsRing,
      Predicates.IsInactive);
    if (unused_player_rings.length == 0) return false;

    if (state.GetPieceAt(move.data.target_position) !== undefined) return false;

    return true;
  };

  Validators[Yinsh.MoveKind.PLACE_MARKER] = function(move, state) {
    if (state.current_player != move.player) return false;
    if (state.phase != Yinsh.Phase.MARKER_PLACEMENT) return false;

    const is_color = Predicates.IsColor(move.player);

    const unused_player_markers = state.FilterPieces(
      is_color,
      Predicates.IsMarker,
      Predicates.IsInactive);
    if (unused_player_markers.length == 0) return false;

    const source_piece = state.GetPieceAt(move.data.source_position);
    if (source_piece === undefined) return false;
    if (!Predicates.IsRing(source_piece.kind)) return false;
    if (!is_color(source_piece.color)) return false;

    if (state.GetPieceAt(move.data.target_position) !== undefined) return false;

    // TODO: Check for rules-conformant move (only 1 contiguous section of markers).
    // TODO: Transition to ROW_REMOVAL or game end.

    return true;
  };

  Yinsh.MoveValidator = class {
    static Validate(move, state) {
      return Validators[move.kind](move, state);
    }
  };

  const Processors = [];

  Processors[Yinsh.MoveKind.PLACE_RING] = function(move, state) {
    const unused_player_rings = state.FilterPieces(
      Predicates.IsColor(move.player), Predicates.IsRing,
      Predicates.IsInactive);

    const ring = unused_player_rings[0];
    ring.state = Yinsh.PieceState.ACTIVE;
    ring.position = move.data.target_position;

    state.current_player = OtherPlayer(state.current_player);

    if (Predicates.IsBlack(move.player) && unused_player_rings.length == 1) {
      state.phase = MARKER_PLACEMENT;
    }
  };

  Processors[Yinsh.MoveKind.PLACE_MARKER] = function(move, state) {
    const is_color = Predicates.IsColor(move.player);

    const unused_player_markers = state.FilterPieces(
      is_color,
      Predicates.IsMarker,
      Predicates.IsInactive);

    const marker = unused_player_markers[0];
    marker.state = Yinsh.PieceState.ACTIVE;
    marker.position = move.data.source_position;

    const ring = state.GetPieceAt(move.data.source_position);
    ring.position = move.data.target_position;

    state.current_player = OtherPlayer(state.current_player);

    // TODO: Flip all markers in-between.
  };

  Yinsh.MoveProcessor = class {
    static Apply(move, state) {
      return Processors[move.kind](move, state);
    }
  };

  Yinsh.GameState = class {
    constructor() {
      this.pieces = [];
      this.board = [];
      this.current_player = Yinsh.Color.WHITE;
      this.phase = Yinsh.Phase.INITIAL_RING_PLACEMENT;
    }

    static From(o) {
      const state = new Yinsh.GameState();
      state.pieces = o.pieces;
      state.board = o.board;
      state.current_player = o.current_player;
      state.phase = o.phase;
      return state;
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
        if (Predicates.IsInactive(p)) return false;
        if (p.position == Yinsh.NoPosition) return false;
        const {q, r, s} = p.position;
        return position.q == q && position.r == r && position.s == s;
      });
      if (pieces.length != 1) return undefined;
      return pieces[0];
    }

    IsCurrentPlayer(player) {
      return this.current_player == player;
    }
  };

  Yinsh.History = class {
    constructor() {
      this.moves = [];
    }

    PushMove(move) {
      this.moves.push(move);
    }
  };
})();
