const express  = require('express')
const app = express();
const server = require('http').createServer(app)
const cors  = require('cors')
const ACTIONS = require('./actions.js');
const PORT = process.env.port || 3007;
const io = require('socket.io')(server, {
    cors: {
        origin:'*',
        methods: ['GET','POST']
    }
})


app.use(cors({
    origin:'*',
    methods: ['GET','POST']
}));



const userSocketMap = {};
const userPeer = {}
 
function getAllConnectedClients(roomId) {
    return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map(
        (socketId) => {
            return {
                socketId,
                username: userSocketMap[socketId],
            };
        }
    );
}

io.on('connection', (socket) => {
    // console.log(socket.id);
    let id1 = socket.id


    socket.on(ACTIONS.JOIN, ({ roomId, username, peerId }) => {
        userSocketMap[socket.id] = username;
        userPeer[peerId] = username
        // console.log(socket.id,username);
        const clients = getAllConnectedClients(roomId);
        socket.join(roomId);
        io.to(socket.id).emit(ACTIONS.SHARE_PEER_IDS, {userPeer})
        clients.forEach(({ socketId }) => {
            // console.log('sending notif to', socketId);
            io.to(socketId).emit(ACTIONS.JOINED, {
                clients,
                username,
                socketId: socket.id,
                peerId
            });
        });
        
    });


    socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code }) => {
        socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { code });
    });

    socket.on(ACTIONS.SYNC_CODE, ({ socketId, code }) => {
        io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code });
    });

    socket.on(ACTIONS.DISCONNECTED, () => {
        const rooms = [...socket.rooms];
        rooms.forEach((roomId) => {
            socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
                socketId: socket.id,
                username: userSocketMap[socket.id],
            });
        });
        delete userSocketMap[socket.id];
        socket.leave();
    });
});



server.listen(PORT, ()=> {
    console.log('Server is running on ' , PORT);
})

