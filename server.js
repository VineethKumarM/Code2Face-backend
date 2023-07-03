const express  = require('express')
const app = express();
const fs = require("fs");
const path = require("path");
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
app.use(express.json());

const userSocketMap = {};
const userPeer = {};
const interviewers = {}; 

app.post("/save_data", (req, res) => {
    const dataFilePath = path.join(__dirname, "data.json");
    let existingData = fs.readFileSync(dataFilePath, "utf8");
    if(existingData.length==0) {
        existingData= "[]"
    }
    const jsonData = JSON.parse(existingData);
  

    const { heading, body } = req.body;
  
    const newObject = {
      heading: heading,
      body: body
    };
  
    jsonData.push(newObject);
  
    fs.writeFileSync(dataFilePath, JSON.stringify(jsonData), "utf8");
  
    res.sendStatus(200);
});

app.get("/get_data", (req, res) => {
    const dataFilePath = path.join(__dirname, "data.json");
    const existingData = fs.readFileSync(dataFilePath, "utf8");
    const jsonData = JSON.parse(existingData);
  
    res.json(jsonData);
});
  

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
    console.log(id1);

    socket.on(ACTIONS.JOIN, ({ roomId, username, peerId, flag }) => {
        console.log(username +'joined' + roomId);
        userSocketMap[socket.id] = username;
        userPeer[peerId] = username
        if(flag) {
            interviewers[roomId] = peerId
            socket.in(roomId).emit(ACTIONS.SIR_JOined, {peerId})
        }

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

    socket.on(ACTIONS.SYNC_CODE, ({ socketId, globalCode }) => {
        io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code:globalCode });
    });

    socket.on(ACTIONS.SEND_MSG, ({roomId, sender, msg}) => {
        socket.in(roomId).emit(ACTIONS.RECV_MSG, {sender, text:msg})
    })

    socket.on(ACTIONS.LANG_CHANGE, ({roomId, lang}) => {
        socket.in(roomId).emit(ACTIONS.UPDATE_LAN, {lang})
    }
    )

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

