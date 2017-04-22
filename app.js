const express = require('express');
const bodyParser = require('body-parser');

const app = express();

const http = require('http').Server(app);
const io = require('socket.io')(http);

var connections = {};

app.use(bodyParser.urlencoded({ extended: true }));

io.set('authorization', function (handshakeData, accept) {
    accept(null, true);
});

io.on('connection', function(socket) {
    console.log("connection device : " + socket);
    console.log('a user connected : ' + deviceId);
    io.on('disconnect', function(socket) {
        console.log("disconnect");
    });
});

app.get('/', function(req, res) {
    return res.json("anvil-hack-iii");
});

http.listen(4242, "0.0.0.0");