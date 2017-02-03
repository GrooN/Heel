import * as net from 'net';
import { assert } from 'chai';
import { CommandReply, CommandReplyType, AddressType } from './Commanding';
import { VERSION } from './Protocol';

interface ITransmissionConfig {
    host: string;
    port: number;
}

export class Transmission {
    private static inc = 0;

    private client: net.Socket;
    private remote: net.Socket;

    private id: number;
    private config: ITransmissionConfig;

    constructor() {
        if (Transmission.inc >= Number.MAX_SAFE_INTEGER) {
            Transmission.inc = 0;
        }

        this.id = ++Transmission.inc;
    }

    public setRemote(host: string, port: number) {
        this.config = { host, port } as ITransmissionConfig;
    }

    public setClient(socket: net.Socket) {
        this.client = socket;
    }

    private bootstrapDataFlow() {
        this.remote.on('data', data => this.client.write(data));
        this.client.on('data', data => this.remote.write(data));
    }

    private replyClient(reply: CommandReplyType) {
        const response = new CommandReply(
            VERSION,
            reply,
            AddressType.IPV4,
            this.remote.localAddress,
            this.remote.localPort
        );

        this.client.write(response.toBuffer());
    }

    private bootstrapConnection() {
        this.remote.on('connect', () => {
            this.log('Starting transmission');

            this.replyClient(CommandReplyType.Succeeded);
        });
    }

    private log(...args) {
        console.log(`[T${this.id}]`, ...args);
    }

    private catchSocketErrors() {
        this.remote.on('end', () => {
            this.log('Remote closed connection')

            this.client.removeAllListeners();
            this.client.destroy();
        });

        this.client.on('end', () => {
            this.log('Client closed connection');

            this.remote.removeAllListeners();
            this.remote.destroy();
        });
    }

    public connect() {
        assert.isDefined(this.config);
        assert.isDefined(this.client);

        this.remote = net.connect({
            host: this.config.host,
            port: this.config.port
        });

        this.bootstrapConnection();

        this.catchSocketErrors();

        this.bootstrapDataFlow();
    }

}