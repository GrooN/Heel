import * as net from 'net';
import { Transmission } from './Transmission';
import { VERSION } from './Protocol';

import {
    CommandRequest,
    CommandType,
    CommandReply,
    CommandReplyType,
    AddressType
} from './Commanding';

import {
    MethodSelectRequest,
    MethodSelectReply,
    MethodType
} from './MethodSelecton';

enum State {
    Handshake,
    Authenticate,
    ProcessCommand,
    Transmitting
}

export class ClientConnection {
    private state = State.Handshake;

    constructor(private socket: net.Socket) {
        socket.on('data', this.incoming.bind(this));
    }

    private handshake(chunk: Buffer) {
        const message = new MethodSelectRequest(chunk);
        let response = null;

        if (message.version !== VERSION) {
            this.socket.end();
            return;
        }

        // TODO: Handle other authentication methods
        if (message.acceptsMethod(MethodType.NoAuth)) {
            response = new MethodSelectReply(VERSION, MethodType.NoAuth);
            this.state = State.ProcessCommand;
        } else {
            response = new MethodSelectReply(VERSION, MethodType.Invalid);
        }

        this.socket.write(response.toBuffer());
    }

    private dump(chunk: Buffer): void {
        const line = [];
        for (let i = 0; i < chunk.length; i++) {
            line.push(chunk.readUInt8(i));
        }

        console.log('> ' + line.join(' '));
    }

    public incoming(chunk: Buffer) {
        this.dump(chunk);

        switch (this.state) {
            case State.Handshake:
                this.handshake(chunk);
                break;
            case State.Authenticate:
                // Currently, this won't happen.
                break;
            case State.ProcessCommand:
                this.processCommand(chunk);
                break;
            case State.Transmitting:
                // Don't do anything here
                break;
        }
    }

    public processCommand(chunk: Buffer) {
        const message = new CommandRequest(chunk);

        switch (message.command) {
            case CommandType.Connect:
                // The transmission will take care of 
                // the communication from here on after
                this.socket.removeAllListeners('data');
                this.state = State.Transmitting;

                const transmission = new Transmission();
                transmission.setClient(this.socket);
                transmission.setRemote(message.host, message.port);

                transmission.connect();
                break;
            case CommandType.Bind:
                throw new Error('Client requested bind');
            case CommandType.UDP_Associate:
                throw new Error('Client requested UDP bind');
        }
    }
}
