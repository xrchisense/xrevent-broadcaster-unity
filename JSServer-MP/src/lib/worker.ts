import * as mediasoup from 'mediasoup';

import { config } from '../config';

const worker: Array<{

    worker: mediasoup.types.Worker;
    router: mediasoup.types.Router;

}> = [];

let nextMediasoupWorkerIdx = 0;

const createWorker = async() => {
    const worker = await mediasoup.createWorker(config.mediasoup.worker);

    worker.on('died', () =>{
        console.error("Mediasoup Worker DIED!, exiting");
    })

    const mediaCodecs = config.mediasoup.router.mediaCodecs;
    const mediasoupRouter = await worker.createRouter({mediaCodecs});
    return mediasoupRouter;
}

export {createWorker};