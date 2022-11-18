import WebSocket, { createWebSocketStream } from "ws";
import { createWorker } from "./worker";
import * as mediasoup from 'mediasoup';
import { createWebRtcTransport } from "./createWebrtcTransport";

let mediasoupRouter : mediasoup.types.Router;
let producerTransport: mediasoup.types.Transport;
let producer: mediasoup.types.Producer;
let consumerTransport: mediasoup.types.Transport;
let consumer: mediasoup.types.Consumer;



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
                console.error("json Error");
                return;
            }


            //parse Message from here
            const event = JSON.parse(message);
            console.log(event.type);
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

                case 'createConsumerTransport':
                    onCreateConsumerTransport(event,ws);
                    break;

                case 'connectConsumerTransport':
                    onConnectConsumerTransport(event,ws);
                    break;

                case 'resume':
                    onResume(event,ws);
                    break;

                case 'consume':
                    onConsume(event,ws);
                    break;
            }
            
        });
    });

    console.log("Everthing is running");


function IsJsonString(str: string) {
    try {
        JSON.parse(str);
    } catch (error) {
        console.error(error);
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
    send(ws,'producerConnected',producerTransport.id)
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

const onCreateConsumerTransport = async (event: String, ws: WebSocket) =>  {
    try {
        const {transport,params} = await createWebRtcTransport(mediasoupRouter);
        consumerTransport = transport;
        send(ws,"subscriberTransportCreated", params);
    } catch (error) {
        console.error(error);
    }
}

const onConnectConsumerTransport = async (event: any, ws: WebSocket) =>  {
    await consumerTransport.connect({dtlsParameters: event.dtlsParameters})
    send(ws,'consumerConnected',consumerTransport.id)
}

const onResume = async (event:any, ws: WebSocket) => {
    await consumer.resume();
    send(ws,"resumed","resumed id:" + consumerTransport.id);
}

const onConsume =async (event:any, ws: WebSocket) => {
    const res = await createConsumer(producer,event.rtpCapabilities);
    send(ws,"subscribed",res);
}

const createConsumer = async(producer:mediasoup.types.Producer, rtpCapabilities: mediasoup.types.RtpCapabilities) => 
{
    if (!mediasoupRouter.canConsume({producerId: producer.id, rtpCapabilities})) {
        console.error("consume Failed");
        return;
    }

    try {
        consumer = await consumerTransport.consume({producerId: producer.id, rtpCapabilities,paused: producer.kind === 'video'});
    } catch (error) {
        console.error('consume failed: ', error);
        return;
    }

    return {
        producerId: producer.id,
        id: consumer.id,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters,
        type: consumer.type,
        producerPaused: consumer.producerPaused
    }
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
}
export {WebSocketConnection}
