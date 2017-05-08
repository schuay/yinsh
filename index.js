"use strict";

const express = require('express');
const http = require('http');
const path = require('path');
const logger = require('morgan');

const port = 8080;

const app = express();
app.use(logger('dev'));
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app).listen(port);
const io = require('socket.io').listen(server);

const yinshServer = require('./js/yinsh-server');
yinshServer.Initialize();

const activeConnections = [];

class YinshConnection extends yinshServer.PlayerCallbacks {
  constructor(socket) {
    super();
    this.socket = socket;

    socket.on('client-send-identity', (data) => {
      const { gameId, player } = data;
      yinshServer.NewConnection(gameId, player, this);
    });

    socket.emit('host-request-identity');
  }

  SendCurrentState(state) {
    this.socket.emit('host-send-state', state);
  }
}

io.sockets.on('connection', (socket) => {
  activeConnections.push(new YinshConnection(socket));
});
