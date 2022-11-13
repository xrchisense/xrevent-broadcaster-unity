import express from 'express';
import * as http from 'http';
import * as WebSocket from 'ws';
import { WebSocketConnection } from './lib/ws';


const main = async() => {
    const app = express();
    const server = http.createServer(app);
    const Websocket = new WebSocket.Server({server, path: '/ws'});

    WebSocketConnection(Websocket);
    const port = 8009;

    server.listen(port,()=>{
        console.log("Server startetd on port ", port);
    })
}
export {main}