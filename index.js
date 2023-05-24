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
const PORT = process.env.port || 3007;
app.use(cors());



app.get("/test", (req,res) => {
    res.send("Server is Running!")
})

io.on('connection', (socket) => {
    socket.emit("user joined",socket.id);

    socket.on('disconnect', () => {
        socket.broadcast.emit("user disconnected");
    })

    socket.on('calluser', ({dest, signalData, src, name}) => {
        io.to(dest).emit("calluser", {signal:signalData, src, name});
    })

    socket.on('answercall' , (data) => {
        io.to(data.to).emit('call acccepted', data.signal);
    })
})








server.listen(PORT, ()=> {
    console.log('Server is running on ' , PORT);
})

