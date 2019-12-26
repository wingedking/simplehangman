import React, { Component } from 'react'
import SessionModel, { 
        ScoreModel 
        }                   from '../../../../models/Session'
import GameModel, { 
         GuessesModel,
         PlayersModel 
        }                   from '../../../../models/Game'
import PlayerModel          from '../../../../models/Player'
import servicePlayer       from '../../services/player'
import Session              from './components/Session'
import GameClient           from './scenes/GameClient'
import "./player.css"

class Player extends Component {
    constructor(props){
        super(props)
        const player    = servicePlayer.emptyPlayer()
        const mdlPlayer = this.createPlayerFromObj(player)
        this.state = {
            mdlPlayer: mdlPlayer,
            latency: 0 
        }
    }

    componentDidMount(){
        window.WebSocket    = window.WebSocket || window.MozWebSocket;
        this.wsGameClient   = new WebSocket('ws://72.225.121.91:5001');

        this.wsGameClient.onmessage = (msg) => {
            console.log(msg.data)
            this.setStateFromJson(msg.data)
        }
    }

    createPlayerFromObj = (obj) => {
        try{
            const objSession        = obj.session
            const mdlScore          = new ScoreModel(objSession.wins, objSession.losses) 
            const objGame           = objSession.game
            const mdlGameGuesses    = new GuessesModel(objGame.correct, objGame.wrong)
            const mdlPlayers        = new PlayersModel(objGame.players, objGame.turn)
            const mdlGame           = new GameModel(mdlGameGuesses, mdlPlayers, objGame.word, objGame.status)    
            const mdlSession        = new SessionModel(objSession.id, mdlScore, mdlGame, objSession.seconds)
            return new PlayerModel(obj.id, mdlSession)
        }
        catch(e){
            console.log(e)
            return this.createPlayerFromObj(servicePlayer.errorPlayer())
        }
    }

    setStateFromJson = (json) => {
        const now = Date.now()
        const obj = JSON.parse(json)
        const latency = now - parseInt(obj.timestamp)
        const mdlPlayer = this.createPlayerFromObj(obj.player)
        this.setState({mdlPlayer, latency})
    }

    onGameGuess = (guess) => {
        const string = JSON.stringify({action: {guess: `${guess}`}})
        this.wsGameClient.send(string)
    }

    onGameNext = () => {
        const string = JSON.stringify({action: {next: "game"}})
        this.wsGameClient.send(string)
    }

    render(){
        const mdlSession    = this.state.mdlPlayer.mdlSession()
        const mdlGame       = mdlSession.mdlGame()

        return <div className="player-window">
                <GameClient mdlGame     ={mdlGame}
                            id    ={this.state.mdlPlayer.id()}
                            onGuess     ={this.onGameGuess} 
                            onNext      ={this.onGameNext}
                            latency     ={this.state.latency}
                            seconds     ={mdlSession.seconds()}
                            />
            </div>
    }
}

export default Player