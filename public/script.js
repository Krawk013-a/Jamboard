window.addEventListener('load', () => {
    const socket = io();
    const canvas = document.getElementById('whiteboard');
    const context = canvas.getContext('2d');

    const colorPicker = document.getElementById('colorPicker');
    const brushSize = document.getElementById('brushSize');

    // Ajusta o tamanho do canvas para preencher a janela
    canvas.height = window.innerHeight * 0.8;
    canvas.width = window.innerWidth * 0.9;

    let painting = false;
    let current = {
        color: 'black',
        size: 5
    };

    function startPosition(e) {
        painting = true;
        draw(e);
    }

    function endPosition() {
        painting = false;
        context.beginPath(); // Começa um novo caminho para a próxima linha
    }

    function draw(e) {
        if (!painting) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        context.lineWidth = current.size;
        context.lineCap = 'round';
        context.strokeStyle = current.color;

        context.lineTo(x, y);
        context.stroke();
        context.beginPath();
        context.moveTo(x, y);

        // Emite os dados do desenho para o servidor
        socket.emit('drawing', {
            x: x / canvas.width, // Normaliza as coordenadas
            y: y / canvas.height,
            color: current.color,
            size: current.size,
            isDrawing: true
        });
    }
    
    // Listeners de eventos do mouse
    canvas.addEventListener('mousedown', startPosition);
    canvas.addEventListener('mouseup', endPosition);
    canvas.addEventListener('mousemove', draw);
    
    // Listeners para os controles de cor e tamanho
    colorPicker.addEventListener('change', (e) => {
        current.color = e.target.value;
    });

    brushSize.addEventListener('change', (e) => {
        current.size = e.target.value;
    });

    // Listener para receber dados de desenho de outros usuários
    socket.on('drawing', (data) => {
        const w = canvas.width;
        const h = canvas.height;
        
        if (data.isDrawing) {
            context.lineWidth = data.size;
            context.lineCap = 'round';
            context.strokeStyle = data.color;
            context.lineTo(data.x * w, data.y * h);
            context.stroke();
            context.beginPath();
            context.moveTo(data.x * w, data.y * h);
        } else {
            context.beginPath();
        }
    });

    // Ajusta o canvas se a janela for redimensionada (simplificado)
    window.addEventListener('resize', () => {
        canvas.height = window.innerHeight * 0.8;
        canvas.width = window.innerWidth * 0.9;
    });
});