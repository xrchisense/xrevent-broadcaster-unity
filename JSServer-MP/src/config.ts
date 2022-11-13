import { RtpCodecCapability } from 'mediasoup/node/lib/RtpParameters';
import { TransportListenIp } from 'mediasoup/node/lib/Transport';
import { WorkerLogTag } from 'mediasoup/node/lib/Worker';
import os from 'os';

export const config = {
    listenIP: '0.0.0.0',
    listenPort: '3016',

    mediasoup: {
        numWorkers: Object.keys(os.cpus()).length,
        worker: {
            rtcMinPort: 10000,
            rtcMaxPort: 10100,
            logLevel: 'debug',
            logTags: [
                'info',
                'ice',
                'dtls',
                'rtp',
                'srtp',
                'rtcp',
            ] as WorkerLogTag[],
        },
        router: {
            mediaCodecs: [
                {
                    kind: 'audio',
                    mimeType: 'audio/opus',
                    clockRate: 48000,
                    channels: 2
                },
                {
                    kind: 'video',
                    mimeType: 'video/VP8',
                    clockRate: 90000,
                    parameters: {
                        'x-google-start-bitrate' : 1000
                    }
                },
            ] as RtpCodecCapability[]
        },

        
        webRtcTransport: {
            listenIps:[
                {
                    ip: '0.0.0.0',
                    announcedIp: '127.0.0.1'  //replace by public IP !!!!
                }
            ] as TransportListenIp[],
            maxIncomeBitrate: 1500000,
            initalAvailableOutgoingBitrate: 1000000,
            enableUdp: true,
            enableTcp: true,
            preferUdp: true,
        }
    }
} as const