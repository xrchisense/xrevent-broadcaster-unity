const mediasoupClient = require ('mediasoup-client');
const {v4: uuidV4} = require('uuid');

const websocketURL = 'ws://localhost:8009/ws';
let device;
let playerDIV;



document.addEventListener("DOMContentLoaded", function() {
    playerDIV = document.getElementById("player");
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

