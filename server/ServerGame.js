import http from 'http'
import websocket from 'websocket'
import serviceSession from '../client/src/services/session'
import servicePlayer from '../client/src/services/player'
import SessionModel from '../models/Session'
import ServerSession from './ServerSession'
import { ServerGameError, SGERRORS } from '../models/server/ServerGame'

export default class ServerGame{
    constructor(MAXCLIENTS, port, MAXCONNECTIONSPERUSER, UNIQUEPLAY){
        this.newClient = (client) => {
            _created.clients++
            /* _sessionForClient() will create a new session if none avail */
            const aSession = _sessionForClient(client)
            aSession.addPlayer(client) 
            return aSession
        }

        this.moveClientToNextSession = (client, currentSession) => {
            const searchIndex = _sessionIndex(currentSession)
            const bSessionIndex = _bestSessionFromIndexExcluded(searchIndex, client)
            
            if(bSessionIndex === _NOFOUNDSESSION){
                return currentSession
            }

            currentSession.removePlayer(client)
            _sessions[bSessionIndex].addPlayer(client)

            if(currentSession.players() === 0){
                _removeSession(currentSession)
            }

            return _sessions[bSessionIndex] 
        }

        this.action = (client, action, session) => {
            if(action.next){
                return this.moveClientToNextSession(client, session)
            }
            if(action.guess){
                const guess = action.guess
                const newSession = session.playerGuess(client, guess)
                return newSession
            }
            /* action does not exist, malicious data probable */
            return new ServerGameError(SGERRORS.INVALIDACTION) 
        }

        const _sessionForClient = (client) => {
            const sessionIndex = _bestSessionFromIndex(0, client)
            if(sessionIndex === _NOFOUNDSESSION){
                const newSession = _createNewSession()
                _sessions.push(newSession)
                return newSession
            }
            return _sessions[sessionIndex]
        }

        const _sessionIndex = (session) => {
            return _sessions.findIndex((s) => session === s)
        }

        const _bestSessionCyclicalSearch = (index, count, client) => {
            /*  
                Recurse through sessions and find the best playable match
                closest to being full. We want to fill the first sessions 
                created, not the later. [overfill the bucket and
                spill over into the next bucket under idea]
            */
            if(_sessions.length === 0){
            /* no sessions to loop through */
                return _NOFOUNDSESSION
            }
            /*
                CyclicalSearch is intended to search from the
                index of sessions to the index before it(if there
                is one) making it "cyclical"
            */
            const cyclicalSearch = (index, count, client, best) => {
                if(count === _sessions.length){
                    return best
                }

                if(index === _sessions.length){
                    return cyclicalSearch(0, count, best)
                }

                const players = _sessions[index].players()
                if(_UNIQUEPLAY){
                    const clients = _sessions[index].clients()
                    for(let i = 0; i < players; i++){
                        if(clients[i].remoteAddress === client.remoteAddress){
                            return cyclicalSearch(index + 1, count + 1, best)    
                        }
                    }
                }

                if(players === 2){
                    return index
                }

                if(best === _NOFOUNDSESSION && players !== 3){
                    best = index
                }

                return cyclicalSearch(index + 1, count + 1, client, best)
            }
            return cyclicalSearch(index, count, client)
        }

        const _bestSessionFromIndexExcluded = (index, client) => {
            return _bestSessionCyclicalSearch(index + 1, 1, client)
        }

        const _bestSessionFromIndex = (index, client) => {
            return _bestSessionCyclicalSearch(index, 0, client)
        }

        const _createNewSession = () => {
            _created.sessions++
            return new ServerSession(serviceSession.createServerSessionFromId(_created.sessions))
        }

        const _removeSession = (session) => {
            const index = _sessionIndex(session)
            if(index === _SESSIONDOESNTEXIST){
                throw new Error("_removeSession: session to remove is not found")
            }
            _sessions.splice(index,1)
        }

        const _bindWebSocket = (server) => {
            const WebSocketServer = websocket.server
            const wsServer = new WebSocketServer({
                httpServer: server
            })

            wsServer.on('request', (request) => {
                const client = request.accept(null,  request.origin)
                if(_created.clients === _MAXCLIENTS){
                    // TODO: call a function that sends 
                    // a message this server is busy
                    // and closes the connection
                    return
                }

                let srvSession = this.newClient(client)
                if(_users[client.remoteAddress] === _IPDOESNTEXIST){
                    _users[client.remoteAddress] = 0
                }
                if(_users[client.remoteAddress] === _MAXCONNECTIONSPERUSER){
                    client.close()
                    return
                }
                _users[client.remoteAddress]++
                client.on('message', (msg) => {
                    const { action } = JSON.parse(msg.utf8Data)
                    /*  
                        srvSession is mutated in action() when
                        action is next game
                    */
                    const newSrvSession = this.action(client, action, srvSession)
                    if(newSrvSession instanceof ServerGameError){
                        client.close()
                    }
                    else{
                        srvSession = newSrvSession
                    }
                })

                client.on('close', () => {
                    srvSession.removePlayer(client)
                    if(srvSession.players() === 0){
                        _removeSession(srvSession)
                    }
                    _users[client.remoteAddress]--
                    if(_users[client.remoteAddress] === _IPDOESNTEXIST){
                        delete _users[client.remoteAddress]
                    }
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

        /* _created, _sessions, _users will be mutated within */
        const   _created                = {clients: 0, sessions: 0}
        const   _sessions               = []
        const   _users                  = {}
        /***********************************************/
        const   _MAXCLIENTS             = MAXCLIENTS
        const   _MAXCONNECTIONSPERUSER  = MAXCONNECTIONSPERUSER
        const   _UNIQUEPLAY             = UNIQUEPLAY
        const   _port                   = port
        const   _server                 = _createServer()
        const   _wsServer               = _bindWebSocket(_server)
        /***********************************************/
        /* const defines for failed returns, making readability 
        and following logic easier */
        const   _NOFOUNDSESSION         = undefined
        const   _IPDOESNTEXIST          = undefined
        const   _SESSIONDOESNTEXIST     = -1
        /***********************************************/
        _server.listen(_port);
    }
}  