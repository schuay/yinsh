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
io.sockets.on('connection', (socket) => {
    socket.on('client-host', () => {
        console.log("omg");
        socket.emit('host-client');
    });
});

const hex = require('./js/hex');
console.log(hex.Point(0, 0, 0));
