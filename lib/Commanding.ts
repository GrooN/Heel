import { assert } from 'chai';

export enum CommandType {
    Connect = 0x01,
    Bind = 0x02,
    UDP_Associate = 0x03
}

export enum AddressType {
    IPV4 = 0x01,
    DOMAIN = 0x03,
    IPV6 = 0x04
}

export enum CommandReplyType {
    Succeeded = 0x00,
    GeneralFailure = 0x01,
    ConnectionDisallowedByRuleset = 0x02,
    NetworkUnreachable = 0x03,
    HostUnreachable = 0x04,
    ConnectionRefused = 0x05,
    TTLExpired = 0x06,
    CommandNotSupported = 0x07,
    AddressTypeNotSupported = 0x08
    // 0x09 - 0xFF not assigned
}

/**
 * @see Section 6 of RFC
 */
export class CommandReply {
    constructor(
        private version: number,
        private reply: CommandReplyType,
        private addressType: AddressType,
        private host: string,
        private port: number
    ) {}

    public toBuffer(): Buffer {
        if (this.addressType !== AddressType.IPV4) {
            throw new Error('Replying with anything but an IPV4 address is not supported');
        }

        // 10 octets = 1xVER, 1xREP, 1xRSV, 1xATYP, 4xIP, 2xPORT
        const chunk = new Buffer(10);
        let offset = 0;

        chunk.writeUInt8(this.version, offset++);
        chunk.writeUInt8(this.reply.valueOf(), offset++);
        chunk.writeUInt8(0, offset++); // reserved
        chunk.writeUInt8(this.addressType.valueOf(), offset++);

        offset = this.writeIPV4(chunk, offset);

        chunk.writeUInt16BE(this.port, offset);

        return chunk;
    }

    private writeIPV4(chunk: Buffer, offset: number): number {
        this.host.split('.').forEach((segment) => {
            chunk.writeUInt8(Number.parseInt(segment), offset++);
        });

        return offset;
    }
}

/**
 * @see Section 4 of RFC
 */
export class CommandRequest {
    public version: number;
    public command: CommandType;
    public addressType: AddressType;
    public host: string; 
    public port: number;

    constructor(chunk: Buffer) {
        this.version = chunk.readUInt8(0);
        this.command = chunk.readUInt8(1) as CommandType;
        this.addressType = chunk.readUInt8(3) as AddressType;

        const offset = 4;
        [this.host, this.port] = this.readHost(
            chunk,
            offset,
            this.addressType
        );
    }

    private readHost(chunk: Buffer, base: number, type: AddressType): [string, number] {
        let offset, address = [], port;

        switch (type) {
            case AddressType.DOMAIN:
                let hostname, characters = [];
                let length = chunk.readUInt8(base);

                // Loop through the ASCII characters
                for (offset = 1; offset < length + 1; offset++) {
                    characters.push(chunk.readUInt8(base + offset));
                }

                port = chunk.readUInt16BE(base + offset);
                hostname = characters.map(code => String.fromCharCode(code)).join('');

                return [hostname, port]
            case AddressType.IPV4:
                for (offset = 0; offset < 4; offset++) {
                    address.push(chunk.readUInt8(base + offset).toString());
                }

                port = chunk.readUInt16BE(base + offset);

                return [address.join('.'), port];
            case AddressType.IPV6:
                for (offset = 0; offset < 16; offset++) {
                    address.push(chunk.readUInt8(base + offset).toString());
                }

                port = chunk.readUInt16BE(base + offset);

                return [address.join(':'), port];
        }
    }
}
