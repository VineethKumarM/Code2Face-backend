const express  = require('express')
const app = express();
const server = require('http').createServer(app)
const cors  = require('cors')
const ACTIONS = require('./actions.js');
const { log } = require('console');
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
const userPeer = {};
const interviewers = {}; 

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
    let id1 = socket.id

    socket.on(ACTIONS.JOIN, ({ roomId, username, peerId, flag }) => {
        userSocketMap[socket.id] = username;
        userPeer[peerId] = username
        if(flag) {
            interviewers[roomId] = peerId
            socket.in(roomId).emit(ACTIONS.SIR_JOined, {peerId})
            console.log('interviewer');
        }
        // console.log(interviewers[roomId]);
        const sir = interviewers[roomId] ? interviewers[roomId] : null
        io.to(socket.id).emit(ACTIONS.SHARE_PEER_IDS, {userPeer, InterviewPeer:sir})

        const clients = getAllConnectedClients(roomId);
        socket.join(roomId);

        clients.forEach(({ socketId }) => {
            io.to(socketId).emit(ACTIONS.JOINED, {
                username,
                socketId: socket.id,
                peerId
            });
        });
        
    });

    socket.on(ACTIONS.BEHAVIOUR, ({roomId} )=> {
        let sir = interviewers[roomId];
        if(sir) {
            io.to(sir).emit(ACTIONS.MONITOR);
        }
    })

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

