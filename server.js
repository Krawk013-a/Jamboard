const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Define a porta do servidor, usando a porta do ambiente ou 3000 como padrão
const PORT = process.env.PORT || 3000;

// Serve os arquivos estáticos da pasta 'public'
app.use(express.static('public'));

// Evento de conexão do Socket.IO
io.on('connection', (socket) => {
  console.log('Um novo usuário se conectou:', socket.id);

  // Evento para quando um usuário começa a desenhar
  socket.on('drawing', (data) => {
    // Transmite os dados do desenho para todos os outros clientes
    socket.broadcast.emit('drawing', data);
  });

  // Evento de desconexão do usuário
  socket.on('disconnect', () => {
    console.log('Usuário desconectado:', socket.id);
  });
});

// Inicia o servidor
server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Acesse em http://localhost:${PORT}`);
});