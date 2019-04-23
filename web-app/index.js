const express = require('express');
const path = require('path');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);



app.use(express.static(path.resolve(__dirname, 'public')));


app.get('/', (req, res) => {
  // res.send('<h1>Hello David</h1>')
  res.sendFile(__dirname, '/index.html');
});


io.on('connection', (socket) => {
  console.log('User connected');
})

http.listen(3000, () => {
  console.log("Listening on port 3000...");
})