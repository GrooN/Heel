import * as net from 'net';

import { ClientConnection } from './lib/ClientConnection';

process.on('uncaughtException', function (err) {
    console.error(err);
}); 

const listener = (socket: net.Socket) => {
    new ClientConnection(socket);
};

const server = net.createServer(listener);

// 1080 is the default port
server.listen(1080, '0.0.0.0');

server.on('listening', () => {
    const address = server.address();

    console.log(`Started server on ${address.address}:${address.port}`);
});
