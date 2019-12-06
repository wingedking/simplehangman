import http from 'http'
import websocket from 'websocket'

export default class ServerGame{
    constructor(MAXSESSIONS, port){
        this.newClient = (client) => {
            const aSession = _sessionForClient()
            aSession.addPlayer(client)
            client.push(new ClientSession(client,aSession)) 
        }

        this.moveClientToTheNextSession = (client) => {
            //const sessionIndex = _sessionIndexFromClientId(client)
            //const newSession = _availableSessionFromIndex(sessionIndex)
            //if(newSession !== undefined){ 
                /* found a playable session */
            //    const session = sessions[sessionIndex]
            //    session.removePlayer(client)
            //    newSession.addPlayer(client)
            //    return session
            //} /* if there was no playable session available we will not be creating
            //    a new session.. our boy is stuck in the game ¯\_(ツ)_/¯*/
            //return undefined       
        }

        this.action = (client, action) => {
            //const sessionIndex = _sessionIndexFromClient
        }

        const _sessionForClient = () => {
            const session = _bestAvailableSession(0,0)
            if(session === undefined){
                return _createNewSession()
            }
            return session
        }

        const _sessionIndexFromClient = (client) => {

        }

        const _bestAvailableSession = (index, best) => {
            /* loops through sessions and find the best playable match, which
            is closest to being full. We also want to fill the rooms first
            starting from the base or index specified */
            /*
                if(index + 1 === session.length){
                    return index
                }
                const players = session[index].players()
                if(session[index].players() === 2){
                    return index
                }
                if(best !== undefined){
                    best = index
                }
                return _bestAvailableSession(index+1, best)
                
            */
            let aSession = undefined
            for(let i = indexStart; i < sessions.length; i++){
                const session = sessions[i]
                const players = session.players()
                if(players !== 3){ /* 3 players === full game */
                    if(players === 2){ /* found exit */
                        aSession = session
                        break;
                    }
                    if(aSession === undefined){
                        /* session has one player and is predecceses
                        the later session, we have to fill up
                        not the newest sessions but the oldest
                        to sustain the game */
                        aSession = session
                    }
                }
            }
            return aSession
        }

        const _sessionIndexFromSessionId = (id) => {
            // returns session index from the sessions by the session id
        }

        const _createNewSession = () => {
            // returns empty session
        }

        const _removeSession = (session) => {
            // returns the sessions object for chaining
        }

        const _removeClient = (client) => {
            // returns null
        }

        const _bindWebSocket = (server) => {
            const WebSocketServer = websocket.server
            const wsServer = new WebSocketServer({
                httpServer: server
            })

            wsServer.on('request', (request) => {
                const client = request.accept(null,  request.origin)
                this.newClient(client)

                client.on('message', (msg) => {
                    const objAction = JSON.parse(msg.utf8Data)
                    this.action(client, objAction)
                })
                client.on('close', () => {
                    this.removeClient(client)
                })
            })

            return wsServer
        }

        const _createServer = () => {
            return http.createServer(function(request, response) {
                response.writeHead(404);
                response.end();
            });
        }

        let     _totalSessionsCreated   = 0
        const   _sessions               = []
        const   _clients                = []
        const   _MAXSESSIONS            = MAXSESSIONS
        const   _port                   = port
        const   _server                 = _createServer()
        const   _wsServer               = _bindWebSocket(_server)
        _server.listen(_port);
    }
}  
