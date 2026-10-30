const express = require('express');
const http = require('http');
const os = require('os');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

// FIX YAHAN HAI
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const users = new Map();
const connected = new Map();
const outgoing = new Map();

const names = () => [...users.values()];
function relFor(id) {
  return {
    connected: [...connected.get(id)],
    outgoing: [...outgoing.get(id)],
    incoming: [...users.keys()].filter((o) => outgoing.get(o).has(id)),
  };
}
function pushAll() {
  io.emit('users', [...users].map(([id, name]) => ({ id, name })));
  for (const id of users.keys()) io.to(id).emit('relations', relFor(id));
}
function link(a, b) {
  connected.get(a).add(b);
  connected.get(b).add(a);
  io.to(a).emit('toast', `Connected with ${users.get(b)}`);
  io.to(b).emit('toast', `Connected with ${users.get(a)}`);
}
function unlink(a, b) {
  connected.get(a)?.delete(b);
  connected.get(b)?.delete(a);
}

io.on('connection', (socket) => {
  const id = socket.id;
  const valid = (to) => users.has(id) && users.has(to) && to !== id;

  socket.on('join', (name) => {
    name = String(name || '').trim().slice(0, 16) || 'Player';
    if (names().includes(name)) name += Math.floor(Math.random() * 90 + 10);
    users.set(id, name);
    connected.set(id, new Set());
    outgoing.set(id, new Set());
    socket.emit('joined', { id, name });
    pushAll();
  });

  socket.on('request', (to) => {
    if (!valid(to) || connected.get(id).has(to) || outgoing.get(id).has(to)) return;
    if (outgoing.get(to).has(id)) {
      outgoing.get(to).delete(id);
      link(id, to);
    } else {
      outgoing.get(id).add(to);
      io.to(to).emit('toast', `${users.get(id)} wants to connect`);
    }
    pushAll();
  });

  socket.on('respond', ({ from, accept }) => {
    if (!valid(from) || !outgoing.get(from).has(id)) return;
    outgoing.get(from).delete(id);
    if (accept) link(id, from);
    else io.to(from).emit('toast', `${users.get(id)} declined your request`);
    pushAll();
  });

  socket.on('cancel', (to) => {
    if (users.has(id) && outgoing.get(id)) outgoing.get(id).delete(to);
    pushAll();
  });

  socket.on('unlink', ({ to }) => {
    if (!valid(to)) return;
    unlink(id, to);
    io.to(to).emit('toast', `${users.get(id)} disconnected`);
    pushAll();
  });

  socket.on('message', ({ to, text }) => {
    text = String(text || '').trim().slice(0, 1000);
    if (!text || !valid(to) || !connected.get(id).has(to)) return;
    const msg = { from: id, to, text, time: Date.now() };
    io.to(to).emit('message', msg);
    socket.emit('message', msg);
  });

  socket.on('typing', ({ to, isTyping }) => {
    if (valid(to) && connected.get(id).has(to)) io.to(to).emit('typing', { from: id, isTyping: !!isTyping });
  });

  socket.on('disconnect', () => {
    if (!users.has(id)) return;
    for (const peer of connected.get(id)) unlink(id, peer);
    for (const o of outgoing.keys()) outgoing.get(o).delete(id);
    users.delete(id); connected.delete(id); outgoing.delete(id);
    pushAll();
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Running on ${PORT}`);
});
