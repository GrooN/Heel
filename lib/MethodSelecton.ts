export enum MethodType {
    NoAuth = 0x00,
    GSSAPI = 0x01,
    Basic = 0x02, // username/password
    // 0x03 - 0x7F IANA assigned
    // 0x80 - 0xFE private methods
    Invalid = 0xFF
}

export class MethodSelectReply {
    constructor(public version: number, public method: MethodType) {}

    public toBuffer(): Buffer {
        const buffer = new Buffer(2);

        buffer.writeUInt8(this.version, 0);
        buffer.writeUInt8(this.method, 1);

        return buffer;
    }
}

export class MethodSelectRequest {
    public version: number;
    public nmethods: number;
    public methods: number[];

    constructor(chunk: Buffer) {
        this.version = chunk.readUInt8(0);
        this.nmethods = chunk.readUInt8(1);
        this.methods = [];

        // read methods from the package
        let address = 2;
        for (let offset = 0; offset < this.nmethods; offset++) {
            let method = chunk.readUInt8(address + offset);

            this.methods.push(method);
        }
    }

    public acceptsMethod(type: MethodType) {
        return this.methods.find(method => method === type.valueOf()) !== null;
    }
}
