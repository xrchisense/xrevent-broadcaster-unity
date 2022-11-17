const mediasoupClient = require ('mediasoup-client');
const {v4: uuidV4} = require('uuid');

const websocketURL = 'ws://localhost:8009/ws';
let device;
let playerDIV;
let textPublish;
let btnWebcam;
let producer;



document.addEventListener("DOMContentLoaded", function() {
    btnWebcam = document.getElementById("btn-webcam");
    playerDIV = document.getElementById("player");
    textPublish = document.getElementById("text-publish");

    btnWebcam.addEventListener('click', publish);
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
        
        switch (resp.type) {
            case 'routerCapabilities':
                onRouterCapabilites(resp.data);
            break;
            case 'ProducerTransportCreated':
                onProducerTransportCreated(resp.data);
            break;

            case 'Server-Error':

            break;
        }
    } 
    
}

const onRouterCapabilites = async (resp) =>{
    
    loadDevice (resp);   
    btnWebcam.disabled = false;
}

const onProducerTransportCreated = async (data) => {

    const transport = device.createSendTransport(data);
    transport.on('connect',async ({dtlsParameters},callback,errback) => {
        const message = {
            type:'connectProducerTransport',
            dtlsParameters
        }

        const resp = JSON.stringify(message);
        socket.send(resp);
        socket.addEventListener('message', (event) => {
        
            const jsonValidation = IsJsonString(event.data);
            
            if (!jsonValidation) {
                console.error("json Error")
                return;
            }
    
            //JSON is fine
    
            let resp = JSON.parse(event.data);

            if (resp.type === "producerConnected") {
                console.log ("producer connected")
                callback()
            }
            
        });
    })

    transport.on('produce',async ({kind,rtpParameters}, callback, errback) =>{
        const message = {
            type: 'produce',
            transportID: transport.transportID,
            kind,
            rtpParameters
        };
        const resp = JSON.stringify(message);
        socket.send(resp);

        socket.addEventListener('published', (resp) => {
            callback(resp.data.id);
        });
        
    });


    transport.on('connectionstatechange', (state)=>{
        switch (state) {
            case 'connecting':
                textPublish.innerHTML = 'connecting'
            break;
        
            case 'connected':
                playerDIV.srcObject = stream;
                textPublish.innerHTML = 'Connected';
            break;

            case 'failed':
                transport.close();
                textPublish.innerHTML = 'failed'
            break;
        }
    });

    let stream;
    try {
        stream = await getUserMedia(transport, true);
        const track = stream.getVideoTracks()[0];
        const params = {track};

        producer = await transport.produce(params);
    } catch (error) {
        console.error(error);
        textPublish.innerHTML = "failed to get Media";
    }
    
}

const publish =  () => {
    btnWebcam.disabled = true;

    const message = {
        type: 'createProducerTransport',
        forceTPC: false,
        rtpCapabilities: device.rtpCapabilities
    }
    const resp = JSON.stringify(message);
    socket.send(resp);
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

const getUserMedia = async (transport, isWebcam) => {
    
    if (!device.canProduce('video')) {
        console.error ("Error initilasing Camera")
        return;
    }

    let stream;
    try {
        stream = isWebcam ?
        await navigator.mediaDevices.getUserMedia({video: true, audio: true}) :
        await navigator.mediaDevices.getDisplayMedia({video: true});
    } catch (error) {
        console.error(error);
        throw error
    }
    return stream;

}
/* mediasoupClient.Device. */

function IsJsonString(str) {
    try {
        JSON.parse(str);
    } catch (error) {
        console.log(error)
        return false;
    }
    return true;
}

