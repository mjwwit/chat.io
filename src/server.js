var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var bodyParser = require('body-parser');
var fs = require('fs');

server.listen(9001);

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

app.get('/:channel/messages', function (req, res) {
    res.type('application/json');

    if (messages[req.params.channel]) {
        res.status(200).send(messages[req.params.channel]);
    } else {
        res.type('text/plain');
        res.status(404).send('Channel not found!');
    }
});

app.get('/channels', function (req, res) {
    res.type('application/json');

    res.status(200).send(Object.keys(messages));
});

app.post('/channels', bodyParser.json(), function (req, res) {
    res.type('text/plain');
    if (req.body.name) {
        var channelName = req.body.name;
        if (messages[channelName]) {
            res.status(409).send('Channel already exists!');
        }
        messages[channelName] = [];
        res.status(201).send('Channel created!');
    } else {
        res.status(400).send('Channel name cannot be empty!');
    }
});

var messages = {};
var channelMap = {};
try {
    messages = JSON.parse(fs.readFileSync('messages.json'));
} catch (e) {
    console.log(e);
}

io.on('connection', function (socket) {
    // join to room and save the room name
    socket.on('join', function (channel) {
        console.log('Joining: ', channel);
        var room = socket.join(channel).rooms[0];
        channelMap[room] = channel;
    });

    // On received chat
    socket.on('chat', function (message) {
        console.log('New message: ', message);

        // Get channel
        var channel = socket.rooms[0];
        // Add message to collection
        messages[channelMap[channel]].push(message);
        fs.writeFile('messages.json', JSON.stringify(messages), function (error) {
            if (error) throw error;

            // Send message to all connected clients
            socket.broadcast.to(channelMap[channel]).emit('message', message);
        });
    });

    io.on('disconnect', function () { console.log('Client disconnected...') });
});