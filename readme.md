# Heel

A SOCKS5 Proxy written in TypeScript

## Getting started

```
npm install -g typescript ts-node
npm install --save
npm start
```

## Run with PM2

```
npm install -g pm2
pm2 start npm -- start
```

## Test

You can test the server using:

```
curl https://www.google.com/ --socks5 localhost:1080
```

You can test packet loss by running the following command on a server.

```
npm test listen
```

And then run the following command, while the proxy is running.

```
npm test send
```


## Todo

- [ ] Basic Authentication
- [ ] GSSAPI
- [ ] Don't trust the client
- [ ] Support Multi-homed server
- [ ] Handle BIND & UDP Associate requests

## Resources

https://www.ietf.org/rfc/rfc1928.txt

https://curl.haxx.se/download.html
