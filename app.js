const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const fs = require('fs');
const uuidV1 = require('uuid/v1');

const app = express();

const http = require('http').Server(app);
const io = require('socket.io')(http);

var upload = multer({ dest: './files/'});

var connection;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

io.set('authorization', function (handshakeData, accept) {
    accept(null, true);
});

app.post('/analyse', function(req, res) {
    const phone = req.body.phone;
    const username = req.body.username;
    const type = req.body.type;
/*
    if (!username || !type) {
        res.status(401).send("error invalid arguments");
        return;
    }
*/
    console.log("ENTER req body: " + req.body);
    connection.emit("captureFrame");
    res.status(200).send("success");
});

app.post('/capture', function(req, res) {
    var upload = multer({ dest: 'files/'}).single('file');
    upload(req, res, function(err) {
        if (err || !req.body.file) {
            res.status(401).send("error upload file");
            return;
        }

        fs.writeFile("./files/" + uuidV1(), new Buffer(req.body.file, "base64"), function(err) {
            if(err) {
                return console.log(err);
            }
            console.log("The file was saved!");
        });
        res.status(200).json('yeah');
    });
});

app.post('/exit', function(req, res) {
    const phone = req.body.phone;
    const username = req.body.username;
    if (!username) {
        res.status(401).send("username missing");
        return;
    }
    res.status(200).send("success");
});

io.on('connection', function(socket) {
    connection = socket;
    console.log("connection device : " + socket);
    io.on('disconnect', function(socket) {
        console.log("disconnect");
    });
});

app.get('/', function(req, res) {
    return res.json("anvil-hack-iii");
});

http.listen(4242, "0.0.0.0");