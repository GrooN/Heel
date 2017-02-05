import { assert } from 'chai';
import * as net from 'net';

let [node, path, command] = process.argv;
const usage = 'Usage: npm test [send|listen]';

assert.equal(node, 'node', usage);
assert.oneOf(command, ['listen', 'send'], usage);

const PORT = 8200;
const HOST = 'localhost';
const PACKET_SIZE = 3;

const OPS = {
    MSG_PING: 0x1,
    MSG_PONG: 0x2
};

class DynamicBuffer {
    private data: Buffer;

    constructor(chunk: Buffer) {
        this.data = chunk;
    }

    public static empty() {
        return new DynamicBuffer(new Buffer(0));
    }

    public get length(): number {
        return this.data.length;
    }

    public read(octets: number): Buffer {
        if (this.length < octets) {
            return null;
        }

        const result = this.data.slice(0, octets);
        this.data = this.data.slice(octets, this.length);

        return result;
    }

    public append(chunk: Buffer): void {
        this.data = Buffer.concat([this.data, chunk]);
    }
}

const send = () => {
    const buffer = DynamicBuffer.empty();
    const socket = net.connect({
        host: HOST,
        port: PORT
    });

    let counter = 0;
    const target = 1000;

    setInterval(() => {
        const chunk = buffer.read(PACKET_SIZE);
        if (chunk === null || !socket.writable) {
            return;
        }

        console.log('Received packet', counter);

        assert.equal(chunk.readUInt8(0), OPS.MSG_PONG);
        assert.equal(chunk.readUInt16BE(1), counter++);

        if (counter >= target) {
            console.log('Test successful. No lost packets.');

            socket.removeAllListeners();
            socket.destroy();
        }
    }, 10);

    socket.on('connect', () => {
        console.log('Connected, sending packets:');

        for (let i = 0; i < target; i++) {
            const buffer = new Buffer(PACKET_SIZE);
            buffer.writeUInt8(OPS.MSG_PING, 0);
            buffer.writeUInt16BE(i, 1); // max = 65k

            if (!socket.writable) {
                console.log('Socket no longer writable');
                return;
            }

            socket.write(buffer);

            console.log('Sent packet', i);
        }
    });

    socket.on('error', (err) => {
        console.log('Error', err);
    });

    socket.on('data', (chunk: Buffer) => {
        buffer.append(chunk);
    });
};

const listen = () => {
    const server = net.createServer((socket: net.Socket) => {
        const buffer = DynamicBuffer.empty();

        setInterval(() => {
            const chunk = buffer.read(PACKET_SIZE);
            if (chunk === null || !socket.writable) {
                return;
            }

            console.log('Read', chunk);

            const opcode = chunk.readUInt8(0);
            assert.equal(opcode, OPS.MSG_PING);
            chunk.writeUInt8(OPS.MSG_PONG, 0);

            const num = chunk.readUInt16BE(1);
            console.log('Number: ' + num);

            console.log('Sending', chunk);

            socket.write(chunk);
        }, 10);

        socket.on('connect', () => {
            console.log('Connected');
        });

        socket.on('data', (chunk: Buffer) => {
            buffer.append(chunk);
        });

        socket.on('error', (err) => {
            console.log('Error', err);
        });
    });

    server.listen({
        host: '0.0.0.0',
        port: 8200
    });
};

switch (command) {
    case 'send':
        send();
        break;
    case 'listen':
        listen();
        break;
}
