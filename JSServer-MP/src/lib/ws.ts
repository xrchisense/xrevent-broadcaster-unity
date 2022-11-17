import WebSocket, { createWebSocketStream } from "ws";
import { createWorker } from "./worker";
import * as mediasoup from 'mediasoup';
import { createWebRtcTransport } from "./createWebrtcTransport";

let mediasoupRouter : mediasoup.types.Router;
let producerTransport: mediasoup.types.Transport;
let producer: mediasoup.types.Producer;



const WebSocketConnection = async(websock: WebSocket.Server) => {
    try {
        mediasoupRouter = await createWorker();
    }  
    catch (error) {
        throw error;
    }


    websock.on('connection', (ws: WebSocket) =>{
        console.log("Websocket start");


        ws.on('message',(message: string) =>{
            const jsonValidation = IsJsonString(message);
            
            if (!jsonValidation) {
                console.error("json Error")
                return;
            }


            //parse Message from here
            const event = JSON.parse(message);
            switch(event.type) {
                case 'getRouterRtpCapabilities':
                    onRouterRtpCapabilities(event,ws);
                break;
                
                case 'createProducerTransport':
                    onCreateProducerTransport(event,ws);
                break;

                case 'connectProducerTransport':
                    onConnectProducerTransport(event,ws);
                break;
                
                case 'produce':
                    onProduce(event,ws,websock);
                break;
            }
            
        });
    });

    console.log("Everthing is running");
}
export {WebSocketConnection}

function IsJsonString(str: string) {
    try {
        JSON.parse(str);
    } catch (error) {
        return false;
    }
    return true;
}

function onRouterRtpCapabilities(event: string, ws: WebSocket) {
    send(ws,"routerCapabilities",mediasoupRouter.rtpCapabilities);
}

const onCreateProducerTransport = async (event: string,ws: WebSocket) => {
    try {
        const {transport, params} = await createWebRtcTransport(mediasoupRouter);
        producerTransport = transport;
        send(ws,"ProducerTransportCreated", params);
    } catch (error) {
        console.error(error);
        send(ws,"Server-Error",error);
    }
    
}

const onConnectProducerTransport = async (event:any,ws:WebSocket) => {
    await producerTransport.connect({dtlsParameters: event.dtlsParameters});
    send(ws,'producerConnected',"producerConnected")
}

const onProduce = async (event:any, ws:WebSocket, websocketServer : WebSocket.Server) => {
    const { kind, rtpParameters} = event;
    producer = await producerTransport.produce({kind, rtpParameters});
    const resp = {
        id: producer.id
    }
    send(ws, 'produced',resp);
    broadcast(websocketServer, 'newProducer', "new user");
}

const send = (ws: WebSocket, type: string, msg: any) => {
    const message = {
        type,
        data: msg,
    }

    const resp = JSON.stringify(message);
    ws.send(resp);
}

const broadcast = (ws: WebSocket.Server,type: string,msg:any) => {
    const message = {
        type,
        data: msg,
    }
    const resp = JSON.stringify(message);
    ws.clients.forEach((client) =>
    {
        client.send(resp);
    });
}

