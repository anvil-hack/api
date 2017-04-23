const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const fs = require('fs');
const uuidV1 = require('uuid/v1');
const twilio = require('twilio');

const app = express();

const http = require('http').Server(app);
const io = require('socket.io')(http);

var upload = multer({ dest: './files/'});

var connection;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

const sendSms = function(phone, message) {
    var accountSid = 'AC709939f7a39b9b9640f22213fedee8d5'; // Your Account SID from www.twilio.com/console
    var authToken = '05e442ca715e524460867cd67d954525';   // Your Auth Token from www.twilio.com/console

    var client = new twilio.RestClient(accountSid, authToken);

    client.messages.create({
        body: 'Hello from Node',
        to: '+447933830904',  // Text this number
        from: '+441513290272' // From a valid Twilio number
    }, function(err, message) {
        console.log(err);
        console.log(message);
    });
};

const sendCall = function(phone, message) {
    var accountSid = 'AC709939f7a39b9b9640f22213fedee8d5'; // Your Account SID from www.twilio.com/console
    var authToken = '05e442ca715e524460867cd67d954525';   // Your Auth Token from www.twilio.com/console

    var client = new twilio.RestClient(accountSid, authToken);
    client.calls.create({
        url: "http://178.62.14.170:4242/twiml",
        to: "+447933830904",
        from: "+441513290272"
    }, function(err, call) {
        process.stdout.write(call.sid);
    });
};

//sendCall("", "");

io.set('authorization', function (handshakeData, accept) {
    accept(null, true);
});

app.post('/twiml', function(req, res) {
    const twiml = new twilio.TwimlResponse();
    twiml.say('hello world!', { voice: 'alice' });
    res.type('text/xml');
    res.send(twiml.toString());
});

app.post('/analyse', function(req, res) {
    const phone = req.body.phone;
    const username = req.body.username;
    const type = req.body.type;

    if (!username || !type) {
        res.status(401).send("error invalid arguments");
        return;
    }
    console.log("ENTER req body: " + req.body);
    if (connection) {
        connection.emit("speech", "Hello " + username);
        connection.emit("captureFrame");
    }
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
    console.log("exit");
    if (!username) {
        res.status(401).send("username missing");
        return;
    }
    if (connection) {
        connection.emit("speech", "Aurevoir " + username);
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