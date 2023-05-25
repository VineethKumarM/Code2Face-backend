const express  = require('express')
const app = express();
const server = require('http').createServer(app)
const cors  = require('cors')
const io = require('socket.io')(server, {
    cors: {
        origin:'*',
        methods: ['GET','POST']
    }
})
const ACTIONS = require('./actions.js')
const PORT = process.env.port || 3007;
app.use(cors({
    origin:'*',
    methods: ['GET','POST']
}));



app.get("/test", (req,res) => {
    res.send("Server is Running! 0PkD3mgNLP",)
})

const userSocketMap = {};
function getAllConnectedClients(roomId) {
    // Map
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
    console.log('socket connected', socket.id);
    // socket.emit("user joined",socket.id);

    socket.on(ACTIONS.JOIN, ({ roomId, username }) => {
        userSocketMap[socket.id] = username;
        console.log(roomId,username);
        socket.join(roomId);
        const clients = getAllConnectedClients(roomId);
        clients.forEach(({ socketId }) => {
            io.to(socketId).emit(ACTIONS.JOINED, {
                clients,
                username,
                socketId: socket.id,
            });
        });
    });

    socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code }) => {
        socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { code });
    });

    socket.on(ACTIONS.SYNC_CODE, ({ socketId, code }) => {
        io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code });
    });

    socket.on('disconnecting', () => {
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

