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
let cnt=0;
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

    socket.on(ACTIONS.JOIN, ({ roomId, username, stream }) => {
        userSocketMap[socket.id] = username;
        console.log(socket.id,username);
        socket.join(roomId);
        const clients = getAllConnectedClients(roomId);
        
        clients.forEach(({ socketId }) => {
            io.to(socketId).emit(ACTIONS.JOINED, {
                clients,
                username,
                socketId: socket.id,
                ustream: stream,
            });
        });
        
        if(clients.length==1) {
            socket.emit('CreatePeer')
        } else if(clients.length>2) {
            socket.emit('SessionActive')
        }
        
    });
    

    socket.on('Offer', SendOffer)
    socket.on('Answer', SendAnswer)

    socket.on(ACTIONS.SEND_STREAM, ({ username, roomId, stream }) => {
        // console.log(typeof stream);
        socket.in(roomId).emit(ACTIONS.RECV_STREAM, { username, stream });
        console.log(typeof stream);
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



function SendOffer(offer) {
    this.broadcast.emit("BackOffer", offer)
}

function SendAnswer(data) {
    this.broadcast.emit("BackAnswer", data)
}


server.listen(PORT, ()=> {
    console.log('Server is running on ' , PORT);
})

