const fs = require('fs');
const https = require('https');
const url = require('url');
const WebSocket = require('ws');

const server = new https.createServer({
    cert: fs.readFileSync('fullchain.pem'),
    key: fs.readFileSync('privkey.pem')
});
const wss = new WebSocket.Server({ noServer: true });

let sessions = {};
let idCounter = 0;
function broadcast(msg) {
    this.host.send(msg);
    for (let w of this.clients) {
        w.send(msg);
    }
}
function sendClients() {
    let f = (c) => {
        return {
            id: c.clientId,
            name: c.clientName,
        };
    }
    this.broadcast(JSON.stringify({
        command: 'clients',
        clients: this.clients.map(c => f(c)),
    }));
}

wss.on('connection', (ws) => {
    ws.on('message', (msg) => {
        let message = JSON.parse(msg);

        if (message.command === 'new_session') {
            let sessionId = ('0000' + Math.floor(Math.random() * 10000)).slice(-4);
            console.log("create session: " + sessionId);
            sessions[sessionId] = {
                host: ws,
                clients: [],
                broadcast: broadcast,
                sendClients: sendClients,
            }
            ws.sessionId = sessionId;
            ws.host = true;
            ws.send(JSON.stringify({
                command: 'new_session',
                id: sessionId,
            }));
        } else if (message.command === 'host_next') {
            let sess = sessions[ws.sessionId];
            for (let c of sess.clients) {
                c.clientChoice = '';
                c.send(JSON.stringify({
                    command: 'next',
                }));
            }
        } else if (message.command === 'host_reveal') {
            let sess = sessions[ws.sessionId];
            let reveal_data = sess.clients.map(c => {
                return {
                    id: c.clientId,
                    choice: c.clientChoice,
                }
            });
            for (let c of sess.clients) {
                c.send(JSON.stringify({
                    command: 'reveal',
                    data: reveal_data,
                }));
            }
        } else if (message.command === 'join_session') {
            let sessionId = message.id;
            console.log('join session: ' + sessionId);
            if (sessionId in sessions) {
                let sess = sessions[sessionId];
                sess.clients.push(ws);
                ws.sessionId = sessionId;
                ws.host = false;
                ws.clientName = message.name;
                ws.clientId = idCounter++;
                ws.clientChoice = '';
                ws.send(JSON.stringify({
                    command: 'join_session',
                }));
                sess.sendClients();
            } else {
                ws.close();
            }
        } else if (message.command === 'choose') {
            let sess = sessions[ws.sessionId];
            ws.clientChoice = message.choice;
            sess.host.send(JSON.stringify({
                command: 'host_choice',
                id: ws.clientId,
                choice: message.choice,
            }));
        }
    });

    ws.on('close', () => {
        if (ws.sessionId !== undefined) {
            if (ws.host) {
                for (let w of sessions[ws.sessionId].clients) {
                    w.close();
                }
                console.log('delete session: ' + ws.sessionId);
                sessions[ws.sessionId] = undefined;
            } else {
                let sess = sessions[ws.sessionId];
                if (sess !== undefined) {
                    let i = sess.clients.indexOf(ws);
                    if (i > -1) {
                        sess.clients.splice(i, 1);
                    }

                    sess.sendClients();
                }
            }
        }
    });
});

server.on('upgrade', (request, socket, head) => {
    const pathname = url.parse(request.url).pathname;

    if (pathname === '/ws') {
        wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit('connection', ws, request);
        });
    } else {
        socket.destroy();
    }
});

server.on('request', (req, res) => {
    let pathname = url.parse(req.url).pathname;
    if (pathname === '/') pathname = '/index.html';

    fs.readFile('./static' + pathname, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end("404 Not Found");
        } else {
            res.end(data);
        }
    })
});

server.listen(8080);
