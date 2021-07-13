const stream = (socket) => {

    // when a new user joins
    socket.on('newUserStart', (data) => {
        socket.to(data.to).emit('newUserStart', {
            sender: data.sender
        });
    });

    // join a room
    socket.on('subscribe', (data) => {
        socket.join(data.socketId);
        socket.join(data.room);

        // inform other members in the room of new user's arrival
        if (socket.adapter.rooms[data.room].length >= 2) {
            socket.to(data.room).emit('new user', {
                socketId: data.socketId
            });
        }
    });

    // when user chats
    socket.on('chat', (data) => {
        socket.to(data.room).emit('chat', {
            sender: data.sender,
            msg: data.msg,
            photo: data.photo
        });
    });

    // getting info about the candidates communicating
    socket.on('ice candidates', (data) => {
        socket.to(data.to).emit('ice candidates', {
            candidate: data.candidate,
            sender: data.sender
        });
    });

    // session description protocol
    socket.on('sdp', (data) => {
        socket.to(data.to).emit('sdp', {
            description: data.description,
            sender: data.sender
        });
    });

};

module.exports = stream;