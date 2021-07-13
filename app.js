let express = require('express');
let app = express();
let server = require('http').Server(app);
let io = require('socket.io')(server);
let favicon = require('serve-favicon');
let path = require('path');
let stream = require('./ws/stream');


app.use(favicon(path.join(__dirname, 'favicon.ico')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

console.log(__dirname);

io.of('/stream').on('connection', stream);
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});
app.get('/videoCall.html', (req, res) => {
    res.sendFile(__dirname + '/videoCall.html')
});
app.get('/signIn.html', (req, res) => {
    res.sendFile(__dirname + '/signIn.html')
});

server.listen(process.env.PORT || 3000);