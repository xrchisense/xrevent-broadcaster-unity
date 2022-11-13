import * as mediasoup from 'mediasoup';
import {config} from '../config';


const createWebRtcTransport = async (mediasoupRouter: mediasoup.types.Router) => {
    const {
        maxIncomeBitrate,
        initalAvailableOutgoingBitrate,
    } = config.mediasoup.webRtcTransport

    const transport = await mediasoupRouter.createWebRtcTransport(config.mediasoup.webRtcTransport);

    if (maxIncomeBitrate){
        try {
            await transport.setMaxIncomingBitrate(maxIncomeBitrate)
        } catch (error) {
            console.error(error);
        }
    }

    return {
        transport,
        params: {
            id: transport.id,
            iceParameters: transport.iceParameters,
            iceCandidates: transport.iceCandidates,
            dtlsParameters: transport.dtlsParameters
        }
    }
}

export {createWebRtcTransport};