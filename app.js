const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const fs = require('fs');
const uuidV1 = require('uuid/v1');
const twilio = require('twilio');

const app = express();

const http = require('http').Server(app);
const io = require('socket.io')(http);

var upload = multer({dest: './files/', limits: {fieldSize: 25 * 1024 * 1024}});

var connection;
var messageCall;

app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: false}));

const twilioConfig = {
    accountSid: 'AC709939f7a39b9b9640f22213fedee8d5',
    authToken: '05e442ca715e524460867cd67d954525'
};
const twilioClient = new twilio.RestClient(twilioConfig.accountSid, twilioConfig.authToken);

const sendSms = function (phone, message) {
    twilioClient.messages.create({
        body: message,
        to: phone,  // Text this number
        from: '+441513290272' // From a valid Twilio number
    }, function (err, message) {
        console.log(err);
        console.log(message);
    });
};

const sendCall = function (phone) {
    twilioClient.calls.create({
        url: "http://178.62.14.170:4242/twiml",
        to: phone,
        from: "+441513290272"
    }, function (err, call) {
        process.stdout.write(call.sid);
    });
};

// messageCall = "You are sleeping";

const runScriptLearning = function (path) {
    var child = require('child_process').execFile('image-learning/amazonwebbucket.py',
        [
            path
        ], function (err, stdout, stderr) {
            // Node.js will invoke this callback when the
            console.log("err : " + err);
            console.log("stdout : ");
            console.log(stdout);

            if (stdout) {
                const res = stdout.split("\n");
                if (res.length > 2) {
                    messageCall = res[1];
                    connection.emit("speech", "Hello " + res[1]);
                } else {
                    messageCall = res[0];
                    connection.emit("speech", "Hello " + res[0]);
                }
                console.log(res);
            }
        });
};

io.set('authorization', function (handshakeData, accept) {
    accept(null, true);
});

app.post('/twiml', function (req, res) {
    const twiml = new twilio.TwimlResponse();
    twiml.say(messageCall, {voice: 'alice'});
    res.type('text/xml');
    res.send(twiml.toString());
});

app.post('/analyse', function (req, res) {
    const phone = req.body.phone;
    const username = req.body.username;
    const type = req.body.type;

    if (!username) {
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

app.post('/capture', function (req, res) {
    console.log("get upload");
    console.log(req.body);

    const text = req.body.finalString;

    if (!text) {
        res.status(401).send("error upload file");
        return;
    }

    // const path = req.body.path;
    // console.log(path);
    // if (!path) {
    //     res.status(401).send("error upload file");
    //     return;
    // }
    // runScriptLearning(path);
    messageCall = text;
    sendCall("+447814949215");
    res.status(200).json('yeah');

    // var upload = multer({dest: 'files/', limits: { fieldSize: 25 * 1024 * 1024 }}).single('file');
    // upload(req, res, function (err) {
    //     if (err || !req.body.file) {
    //         console.log(err);
    //         res.status(401).send("error upload file");
    //         return;
    //     }
    //
    //     const path = "./files/" + uuidV1() + ".tiff";
    //
    //     var base64Image = req.body.file.toString('base64');
    //     var decodedImage = new Buffer(base64Image, 'base64');
    //
    //     // var base64Image = new Buffer(req.body.file).toString('base64');
    //     fs.writeFile(path, decodedImage, function (err) {
    //         if (err) {
    //             res.status(500).json('error save image');
    //             return console.log(err);
    //         }
    //         console.log("The file was saved!");
    //         runScriptLearning(path);
    //     });
    //     res.status(200).json('yeah');
    // });
});

app.post('/exit', function (req, res) {
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

io.on('connection', function (socket) {
    connection = socket;
    console.log("connection device : " + socket);
    io.on('disconnect', function (socket) {
        console.log("disconnect");
    });
});

app.get('/', function (req, res) {
    return res.json("anvil-hack-iii");
});

http.listen(4242, "0.0.0.0");