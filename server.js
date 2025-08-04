const express = require('express');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

// Serve os arquivos estáticos da pasta 'public'
app.use(express.static('public'));

// Rota para qualquer sala de quadro, servindo o mesmo HTML
app.get('/board/:roomId', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

io.on('connection', (socket) => {
    console.log('Um novo usuário se conectou:', socket.id);

    // 1. Evento para entrar em uma sala específica
    socket.on('joinRoom', (roomId) => {
        socket.join(roomId);
        console.log(`Usuário ${socket.id} entrou na sala ${roomId}`);

        // Opcional: notificar outros na sala que um novo usuário entrou
        socket.to(roomId).emit('userJoined', socket.id);
    });

    // 2. Evento para dados de desenho
    socket.on('drawing', (data) => {
        socket.to(data.roomId).emit('drawing', data);
    });

    // 3. Evento para limpar o quadro
    socket.on('clearBoard', (data) => {
        socket.to(data.roomId).emit('clearBoard');
    });

    // 4. Eventos para Notas Adesivas
    socket.on('stickyNote_create', (data) => {
        socket.to(data.roomId).emit('stickyNote_create', data);
    });
    socket.on('stickyNote_move', (data) => {
        socket.to(data.roomId).emit('stickyNote_move', data);
    });
    socket.on('stickyNote_delete', (data) => {
        socket.to(data.roomId).emit('stickyNote_delete', data);
    });


    // 5. Eventos para Caixas de Texto
    socket.on('textElement_create', (data) => {
        socket.to(data.roomId).emit('textElement_create', data);
    });
    socket.on('textElement_move', (data) => {
        socket.to(data.roomId).emit('textElement_move', data);
    });

    // 6. Evento para adicionar imagem
    socket.on('image_add', (data) => {
        socket.to(data.roomId).emit('image_add', data);
    });
    
    socket.on('disconnect', () => {
        console.log('Usuário desconectado:', socket.id);
    });
});

server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log(`Use uma URL como http://localhost:${PORT}/board/nome-da-sua-sala`);
});