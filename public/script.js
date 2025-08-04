window.addEventListener('load', () => {
    // --- SETUP INICIAL ---
    const socket = io();
    const canvas = document.getElementById('whiteboard');
    const context = canvas.getContext('2d');
    const elementsContainer = document.getElementById('elements-container');

    // Extrai o ID da sala da URL (ex: /board/minha-sala -> minha-sala)
    const roomId = window.location.pathname.split('/')[2] || 'default-room';

    // Avisa o servidor que entramos na sala
    socket.emit('joinRoom', roomId);

    // Redimensiona o canvas para o tamanho do container
    const boardContainer = document.getElementById('board-container');
    function resizeCanvas() {
        canvas.width = boardContainer.clientWidth;
        canvas.height = boardContainer.clientHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);


    // --- ESTADO E FERRAMENTAS ---
    let currentTool = 'draw';
    let painting = false;
    let drawingConfig = {
        color: '#000000',
        size: 5
    };

    const tools = document.querySelectorAll('.tool');
    tools.forEach(tool => {
        tool.addEventListener('click', () => {
            document.querySelector('.tool.active').classList.remove('active');
            tool.classList.add('active');
            currentTool = tool.id.replace('Tool', ''); // ex: 'drawTool' -> 'draw'
        });
    });

    const colorPicker = document.getElementById('colorPicker');
    colorPicker.addEventListener('change', e => drawingConfig.color = e.target.value);
    
    const brushSize = document.getElementById('brushSize');
    brushSize.addEventListener('change', e => drawingConfig.size = e.target.value);


    // --- FUNÇÕES DE DESENHO NO CANVAS ---
    function startPosition(e) {
        if (currentTool !== 'draw' && currentTool !== 'erase') return;
        painting = true;
        draw(e);
    }

    function endPosition() {
        painting = false;
        context.beginPath();
    }

    function draw(e) {
        if (!painting) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const color = (currentTool === 'erase') ? '#FFFFFF' : drawingConfig.color;

        context.lineWidth = drawingConfig.size;
        context.lineCap = 'round';
        context.strokeStyle = color;
        context.lineTo(x, y);
        context.stroke();
        context.beginPath();
        context.moveTo(x, y);

        socket.emit('drawing', {
            roomId,
            x: x / canvas.width,
            y: y / canvas.height,
            color,
            size: drawingConfig.size,
        });
    }

    canvas.addEventListener('mousedown', startPosition);
    canvas.addEventListener('mouseup', endPosition);
    canvas.addEventListener('mousemove', draw);


    // --- CRIAÇÃO DE ELEMENTOS (NOTAS, TEXTO, IMAGENS) ---
    boardContainer.addEventListener('click', (e) => {
        if (e.target !== elementsContainer && e.target !== boardContainer) return;

        const x = e.clientX - boardContainer.getBoundingClientRect().left;
        const y = e.clientY - boardContainer.getBoundingClientRect().top;
        const id = `element-${Date.now()}-${socket.id}`;

        if (currentTool === 'sticky') {
            const noteData = { roomId, id, x, y, content: 'Nova nota...' };
            createStickyNote(noteData);
            socket.emit('stickyNote_create', noteData);
        } else if (currentTool === 'text') {
            const text = prompt('Digite seu texto:');
            if (text) {
                const textData = { roomId, id, x, y, content: text };
                createTextElement(textData);
                socket.emit('textElement_create', textData);
            }
        }
    });

    // Ferramenta de imagem
    document.getElementById('imageTool').addEventListener('click', () => {
        const url = prompt("Cole a URL da imagem:");
        if (url) {
            const id = `element-${Date.now()}-${socket.id}`;
            const imageData = { roomId, id, url, x: 100, y: 100 };
            createImageElement(imageData);
            socket.emit('image_add', imageData);
        }
    });


    // --- FUNÇÕES DE MANIPULAÇÃO DE ELEMENTOS DINÂMICOS ---
    function makeDraggable(element) {
        let isDragging = false;
        let offsetX, offsetY;

        element.addEventListener('mousedown', (e) => {
            isDragging = true;
            offsetX = e.clientX - element.offsetLeft;
            offsetY = e.clientY - element.offsetTop;
            element.style.cursor = 'grabbing';
            e.stopPropagation();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            element.style.left = `${e.clientX - offsetX}px`;
            element.style.top = `${e.clientY - offsetY}px`;
        });

        document.addEventListener('mouseup', (e) => {
            if (!isDragging) return;
            isDragging = false;
            element.style.cursor = 'grab';
            
            const eventName = element.classList.contains('sticky-note') ? 'stickyNote_move' : 'textElement_move';
            socket.emit(eventName, {
                roomId,
                id: element.id,
                x: element.offsetLeft,
                y: element.offsetTop
            });
        });
    }

    function createStickyNote({ id, x, y, content }) {
        const note = document.createElement('div');
        note.id = id;
        note.className = 'draggable sticky-note';
        note.style.left = `${x}px`;
        note.style.top = `${y}px`;
        note.innerHTML = `<div contenteditable="true">${content}</div>`;
        addDeleteButton(note);
        elementsContainer.appendChild(note);
        makeDraggable(note);
    }
    
    function createTextElement({ id, x, y, content }) {
        const textElem = document.createElement('div');
        textElem.id = id;
        textElem.className = 'draggable text-element';
        textElem.style.left = `${x}px`;
        textElem.style.top = `${y}px`;
        textElem.innerHTML = `<div contenteditable="true" style="padding: 5px;">${content}</div>`;
        addDeleteButton(textElem);
        elementsContainer.appendChild(textElem);
        makeDraggable(textElem);
    }

    function createImageElement({ id, url, x, y }) {
        const imgContainer = document.createElement('div');
        imgContainer.id = id;
        imgContainer.className = 'draggable';
        imgContainer.style.left = `${x}px`;
        imgContainer.style.top = `${y}px`;
        
        const img = document.createElement('img');
        img.src = url;
        img.className = 'board-image';
        
        imgContainer.appendChild(img);
        addDeleteButton(imgContainer);
        elementsContainer.appendChild(imgContainer);
        makeDraggable(imgContainer);
    }

    function addDeleteButton(element) {
        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '&times;';
        deleteBtn.className = 'delete-btn';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            elementsContainer.removeChild(element);
            socket.emit('stickyNote_delete', { roomId, id: element.id });
        };
        element.appendChild(deleteBtn);
    }


    // --- BOTÕES DE AÇÃO DO QUADRO ---
    const clearBoardBtn = document.getElementById('clearBoard');
    clearBoardBtn.addEventListener('click', () => {
        if (confirm('Tem certeza que deseja limpar o quadro para todos?')) {
            socket.emit('clearBoard', { roomId });
        }
    });

    const saveBoardBtn = document.getElementById('saveBoard');
    saveBoardBtn.addEventListener('click', () => {
        // Nota: Esta função salva apenas o conteúdo do canvas (desenhos).
        // Salvar os elementos HTML (notas, etc.) requereria uma abordagem mais complexa.
        const link = document.createElement('a');
        link.download = `quadro-${roomId}-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    });


    // --- LISTENERS DE EVENTOS DO SOCKET.IO ---
    socket.on('drawing', (data) => {
        const w = canvas.width;
        const h = canvas.height;
        context.lineWidth = data.size;
        context.lineCap = 'round';
        context.strokeStyle = data.color;
        context.lineTo(data.x * w, data.y * h);
        context.stroke();
        context.beginPath();
        context.moveTo(data.x * w, data.y * h);
    });

    socket.on('clearBoard', () => {
        context.clearRect(0, 0, canvas.width, canvas.height);
        elementsContainer.innerHTML = ''; // Limpa também os elementos
    });

    socket.on('stickyNote_create', createStickyNote);
    socket.on('textElement_create', createTextElement);
    socket.on('image_add', createImageElement);

    socket.on('stickyNote_move', (data) => {
        const note = document.getElementById(data.id);
        if (note) {
            note.style.left = `${data.x}px`;
            note.style.top = `${data.y}px`;
        }
    });

    socket.on('textElement_move', (data) => {
        const textEl = document.getElementById(data.id);
        if (textEl) {
            textEl.style.left = `${data.x}px`;
            textEl.style.top = `${data.y}px`;
        }
    });
    
    socket.on('stickyNote_delete', (data) => {
        const note = document.getElementById(data.id);
        if (note) {
            elementsContainer.removeChild(note);
        }
    });
});