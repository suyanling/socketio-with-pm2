/**
 * Created by denniszhang on 17/2/23.
 */
require('colors');
var Pm2Socket = require('./socket')
var getIp = require('./getip');
module.exports = class Pm2SocketIO {
    constructor(opts){
        opts = Object.assign({},{
            ips:[],
            localIp:'localhost'
        },opts)
        this.addresses = opts.ips;
        this.localIp = opts.localIp;
        this.instanceId = parseInt(process.env.NODE_APP_INSTANCE || 0);
        try {
            if(opts.localIp!='localhost') {
                this.localIp = getIp();
            }
            if (this.addresses.indexOf(this.localIp) == -1 && this.addresses.length >= 2) {
                throw new Error('本机IP不在IP列表当中,请在第二个参数ips中添加');
            } else if (this.addresses.length <= 1) {
                this.addresses = ['localhost'];
                this.localIp = 'localhost';
            }

        } catch (e) {
            console.error(e)
        }
    }
    listen(port){
        const server = require("http").createServer((req, res)=> {
        });
        server.listen(port + this.instanceId);
        this.io = require("socket.io")(server);

        //set client listener
        const ioClient = require("socket.io-client");


        let processList = [];
        for (let i = 0; i < (process.env.instances || 1); i++) {
            processList.push(i);
        }

        this.addresses.map(ip=> {
            processList.map(id=> {
                setTimeout(()=> {
                    console.log(`${this.localIp}:${port + this.instanceId} try to connect to ${ip}:${id}`)
                    let url = `http://${ip}:${port + parseInt(id)}`;

                    let connect;
                    try {

                        connect = ioClient.connect(url, {'force new connection': true})
                    } catch (e) {
                        console.error(e)
                    }
                    connect.on('@toServer', (event,...data)=> {
                        if (this.instanceId != id || ip != this.localIp) {
                            this.io.sockets.emit(event, ...data);
                        }
                    })
                }, 0)

            })
        })
        return this;
    }
    on(event,cb){
        if(event == 'connection') {
            this.io.on(event,socket=>{
                var s = new Pm2Socket(socket,this.io);
                cb(s);
            })
        }
        else this.io.on(event,function(...data){
            cb(...data);
        })
    }
    emit(event,...data) {
        this.io.sockets.emit('@toServer',event,...data);
        this.io.sockets.emit(event,...data);
    }

}