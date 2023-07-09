const express  = require('express')
const app = express();
const fs = require("fs");
const path = require("path");

const cors  = require('cors');

const PORT = process.env.port || 3007;


app.use(cors({
    origin:'*',
    methods: ['GET','POST']
}));
app.use(express.json());

const peerRoom = {}
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
  
app.post("/join", (req,res) => {
    const {roomId, peerId, flag, username} = req.body;

    
    let arr = [] ;
    if(peerRoom[roomId]) arr= Array.from(peerRoom[roomId])
    else peerRoom[roomId] = new Set();

    peerRoom[roomId].add({peerId, username})

    if(flag) {
        interviewers[roomId] = peerId
    }
    res.json(arr);
})


app.post("/leave", (req,res) => {
    const {roomId, peerId} = req.body;
    peerRoom[roomId]?.delete(peerId)
    
})


app.listen(PORT, ()=> {
    console.log('Server is running on ' , PORT);
})
