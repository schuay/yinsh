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
  };
})();

exports.Initialize = YinshServer.Initialize;
exports.NewConnection = YinshServer.NewConnection;
exports.PlayerCallbacks = YinshServer.PlayerCallbacks;
