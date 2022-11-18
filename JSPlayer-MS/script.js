const mediasoupClient = require ('mediasoup-client');
const {v4: uuidV4} = require('uuid');

const websocketURL = 'ws://localhost:8009/ws';
let device;
let playerDIV;
let textPublish;


let consumeTransport;
let consumer;


document.addEventListener("DOMContentLoaded", function() {
    playerDIV = document.getElementById("player");
    textPublish = document.getElementById("text");
    connect();
})

let socket;

const connect = () => {
    socket = new WebSocket(websocketURL);
    socket.onopen = () => {
        //start our socketrequest

        const msg = {
            type: "getRouterRtpCapabilities"
        }
        const resp = JSON.stringify(msg);
        socket.send(resp);
    }

    socket.onmessage = (event) => {
        const jsonValidation = IsJsonString(event.data);
            
        if (!jsonValidation) {
            console.error("json Error")
            return;
        }

        //JSON is fine

        let resp = JSON.parse(event.data);
        console.log(resp.type);
        switch (resp.type) {
            case 'routerCapabilities':
                onRouterCapabilites(resp.data);
                subscribe();
            break;
            case 'subscriberTransportCreated':
                onSubscriberTransportCreated(resp.data);
            break;
            case 'resumed':
                console.log(event.data);
                break;
            case 'subscribed': 
                onSubscribed(resp.data);
                break;
        }
    } 

    
    
}

const onRouterCapabilites = async (resp) =>{
    loadDevice (resp);   
}

const loadDevice = async (routerRtpCapabilities) => {

    //cath not supported browsers
    try {
        device = new mediasoupClient.Device();
    } catch (error) {
        if (error.name === 'UnsupportedError') {
            console.error("browser not supported!!!");
        }else{
            console.error(error);
        }
    }

    await device.load({routerRtpCapabilities});
}

const subscribe = () => {

    const msg = {
        type: "createConsumerTransport",
        forceTCP: false,
    }

    const message = JSON.stringify(msg);
    socket.send(message);

}

const onSubscriberTransportCreated = async (event) => {

    if (event.error) {
        console.error("onSubscriberTransportCreated Error: ", event.error);
        return;
    }

    const transport = device.createRecvTransport(event);
    console.log("created transport")
    

    transport.on ('connect', async ({dtlsParameters},callback,errback) => {
        const msg = {
            type: "connectConsumerTransport",
            transportId: transport.id,
            dtlsParameters
        }
        const message = JSON.stringify(msg);
        socket.send(message);

        socket.addEventListener('message', (event) => {
        
            const jsonValidation = IsJsonString(event.data);
            
            if (!jsonValidation) {
                console.error("json Error")
                return;
            }
    
            //JSON is fine
    
            let resp = JSON.parse(event.data);

            if (resp.type === "consumerConnected") {
                console.log ("consumer connected")
                callback()
            }
            
        });
    });

    transport.on('connectionstatechange', async (state)=>{
        switch (state) {
            case 'connecting':
                textPublish.innerHTML = 'connecting'
            break;
        
            case 'connected':
                playerDIV.srcObject = remoteStream;
                const msg = {
                    type: 'resume'
                }
                const message = JSON.stringify(msg);
                socket.send(message);
                textPublish.innerHTML = 'Connected';
            break;

            case 'failed':
                transport.close();
                textPublish.innerHTML = 'failed'
            break;
        }
    });

    consumeTransport = transport;
    const stream = consume(transport);
}

const consume = async(transport) => {
    const {rtpCapabilities} = device;
    const msg = {
        type: 'consume',
        rtpCapabilities
    }
    const message = JSON.stringify (msg);
    socket.send(message);
}

const onSubscribed = async (data) => {
    let codecOptions = {};
    consumer = await consumeTransport.consume({id: data.id, producerId: data.producerId,kind: data.kind,rtpParameters: data.rtpParameters, codecOptions});
    const stream = new MediaStream();
    stream.addTrack(consumer.track);
    remoteStream = stream;
}

function IsJsonString(str) {
    try {
        JSON.parse(str);
    } catch (error) {
        console.log(error)
        return false;
    }
    return true;
}
 
 