"use strict";

const should = require('../node_modules/should/should');
const yinsh = require('./yinsh');

var YinshServer = {};

(function() {
  YinshServer.ActiveGames = new Map();

  YinshServer.PlayerCallbacks = class {
    SendCurrentState(state) {
      console.log("YinshServer.PlayerCallbacks.SendCurrentState");
    }

    Disconnect() {
      console.log("YinshServer.PlayerCallbacks.Disconnect");
    }

    InvalidMove(move, state) {
      console.log("YinshServer.InvalidMove");
    }
  };

  YinshServer.Game = class {
    constructor(id) {
      this.id = id;
      this.history = new yinsh.History();
      this.state = yinsh.GameState.NewInitialState();
      this.callbacks = {};
      this.callbacks[yinsh.Color.WHITE] = undefined;
      this.callbacks[yinsh.Color.BLACK] = undefined;
    }

    SetCallbacks(player, callbacks) {
      [ yinsh.Color.WHITE, yinsh.Color.BLACK ].should.matchAny(player);
      callbacks.should.be.instanceof(YinshServer.PlayerCallbacks);

      if (this.callbacks[player] !== undefined) {
        this.callbacks[player].Disconnect();
      }
      this.callbacks[player] = callbacks;
    }

    Callbacks(player) {
      return this.callbacks[player];
    }

    Broadcast(fn) {
      if (this.Callbacks(yinsh.Color.WHITE) !== undefined) {
        fn(this.Callbacks(yinsh.Color.WHITE));
      }
      if (this.Callbacks(yinsh.Color.BLACK) !== undefined) {
        fn(this.Callbacks(yinsh.Color.BLACK));
      }
    }

    ProcessMove(move) {
      if (!yinsh.MoveValidator.Validate(move, this.state)) {
        this.Callbacks(move.player).InvalidMove(move, this.state);
        return;
      }

      this.history.PushMove(move);

      yinsh.MoveProcessor.Apply(move, this.state);
      this.Broadcast(cb => cb.SendCurrentState(this.state));
    }
  };

  YinshServer.Initialize = function() {
    console.log("YinshServer.Initialize");

    const initialGameId = 0;
    YinshServer.ActiveGames.clear();
    YinshServer.ActiveGames.set(
      initialGameId, new YinshServer.Game(initialGameId));
  };

  YinshServer.NewConnection = function(gameId, player, callbacks) {
    console.log("YinshServer.NewConnection");

    const game = YinshServer.ActiveGames.get(gameId);
    should.exist(game);

    game.SetCallbacks(player, callbacks);
    callbacks.SendCurrentState(game.state);

    return game;
  };
})();

exports.Initialize = YinshServer.Initialize;
exports.NewConnection = YinshServer.NewConnection;
exports.PlayerCallbacks = YinshServer.PlayerCallbacks;
