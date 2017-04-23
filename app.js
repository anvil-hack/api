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
var phone;

app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: false}));

const playTrack = function (track) {
    var request = require('request');

    console.log(track);

    var headers = {
        'Accept': 'application/json',
        'Authorization': 'Bearer BQD-4wSiv403RRHnUxCWOGFNnuPL6Q-AuyZyJmqayDUvksrs97SigksXFDVtmBCoJ50ukzMJFvOf5buGw1O2G6aflTbvx8bU_xcHey1Nb12NT_cxw_VPQz1YXpxIP9wFwoFDn9nBETj9I-hNnONKzZE4eUQlZKRx3b0_1c78sKoZaluWCRDmWc6Gb_UBV1cIWfPqLqZhHp1tXp8N1bVne9EnOmJ4NvVMO13YYF4x_Rod0QpSgSdQrdRDvFacSYEn7P4Rj4I_lw7TbG9Sna5J_woIl_DM_fFcwt7f2JyM55VxBUljejwinP2gRO2J8xtBnA',
        'Content-Type': 'application/json'
    };

    var dataString = '{"uris":[\"' + track + '\"]}';

    var options = {
        url: 'https://api.spotify.com/v1/me/player/play',
        method: 'PUT',
        headers: headers,
        body: dataString
    };

    function callback(error, response, body) {
        console.log(error);
        if (!error && response.statusCode == 200) {
            console.log(body);
        }
    }

    request(options, callback);
}

const getSpotifyTrack = function (mood) {
    var request = require('request');

    const tokenAuth = "Bearer BQD-4wSiv403RRHnUxCWOGFNnuPL6Q-AuyZyJmqayDUvksrs97SigksXFDVtmBCoJ50ukzMJFvOf5buGw1O2G6aflTbvx8bU_xcHey1Nb12NT_cxw_VPQz1YXpxIP9wFwoFDn9nBETj9I-hNnONKzZE4eUQlZKRx3b0_1c78sKoZaluWCRDmWc6Gb_UBV1cIWfPqLqZhHp1tXp8N1bVne9EnOmJ4NvVMO13YYF4x_Rod0QpSgSdQrdRDvFacSYEn7P4Rj4I_lw7TbG9Sna5J_woIl_DM_fFcwt7f2JyM55VxBUljejwinP2gRO2J8xtBnA";
    var headers = {
        'Accept': 'application/json',
        'Authorization': tokenAuth
    };

    var options = {
        url: 'https://api.spotify.com/v1/recommendations?market=GB&min_popularity=80&seed_tracks=0c6xIDDpzE81m2q797ordA&seed_artists=4NHQUGzhtTLFvgF5SZesLK&limit=1&target_valence=' + mood,
        headers: headers
    };

    function callback(error, response, body) {
        const json = JSON.parse(body);
        if (json && json.tracks[0]) {
            const uri = json.tracks[0].uri;
            playTrack(uri);
        }
    }

    request(options, callback);
};

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
                    mood = res[0];
                    messageCall = res[1];
                    getSpotifyTrack(mood);
                    connection.emit("speech", "Hello " + res[1]);
                } else {
                    messageCall = res[0];
                    getSpotifyTrack(0.5);
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
    phone = "+" + req.body.phone;
    const username = req.body.username;
    const type = req.body.type;

    if (!username) {
        res.status(401).send("error invalid arguments");
        return;
    }
    if (connection) {
        if (type !== "onDemand") {
            connection.emit("speech", "Welcome " + username);
        }
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

    const result = text.split("\n");
    if (result .length > 2) {
        mood = result [0];
        getSpotifyTrack(mood);
    } else {
        getSpotifyTrack(0.5);
    }
    console.log(result);

    messageCall = text;
    sendCall(phone);
    res.status(200).json('yeah');
});

app.post('/exit', function (req, res) {
    console.log("exit");
    if (connection) {
        connection.emit("speech", "Goodbye Franco");
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