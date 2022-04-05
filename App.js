import { WebSocketServer } from 'ws';

MAX_GAME = 1000

class Game {
  constructor() {
    this.gameId = generateGameId()
    this.players = []
  }

  static generateGameId() {
    let gameId = Math.floor(Math.random() * MAX_GAME);
    while (true) {
      let idOk = true;
      for (let g in games) {
        if (g.gameId === gameId) {
          gameId = Math.floor(Math.random() * MAX_GAME);
          idOk = false
          break
        }
      }

      if (idOk) {
        return gameId
      }
    }
  }

  AddPlayer(player){
    player.gameId = this.gameId
    this.players.push(player)
  }
}

class Player {
  constructor(playerId) {
    this.playerId = uuid
  }

  setGameId(gameId){
    this.gameId = gameId
  }
}

class GameMessage {
  constructor(sender, msg, remarks = null) {
    this.sender = sender
    this.msg = msg 
    this.remarks = remarks 
  }

  toString() {
    return JSON.stringify([
      "sender" = this.sender,
      "message" = this.msg,
      "remarks" = this.remarks
    ])
  }

  static parseFromSocket(msg) {
    msgObj = JSON.parse(msg)
    return new GameMessage(msgObj.sender, msgObj.msg, msgObj.remarks)
  }
}

const wss = new WebSocketServer({ port: 18080 });
var games = []


wss.on('connection', function connection(ws) {
  ws.send(new GameMessage(SERVER, "Connected").toString());
  if (games.length >= MAX_GAME) {
    ws.send(new GameMessage(SERVER, "ERROR", "Server is currently full"))
    ws.close();
  }



  ws.on('message', function message(rawmsg) {
    console.log('received: %s', msg);

    const msgObj = GameMessage.parseFromSocket(rawmsg)

    //const arr = msg.split(':')
    //const source = arr[0]
    //const data = arr[1]

    if(msgObj.msg === "NEWGAME"){
      const newGame = new Game()
      const player1 = new Player()
      newGame.AddPlayer(player1)
      games.push(newGame)
      ws.send(new GameMessage("SERVER", "GAMEID", newGame.gameId))
    }else if(msgObj.msg === "JOINGAME"){
      const gameId = msgObj.remarks
      const game = games.find(g => g.gameId === gameId)
      if(!game){
        ws.send(new GameMessage("SERVER", "JOINGAME", "Game ID not found"))
      }
    }


    //if (data === "HOST?") {
    //  if (!hostId) {
    //    ws.send('SERVER:CHAR=H');
    //    hostId = source
    //  } else if (!playerId) {
    //    ws.send('SERVER:CHAR=P');
    //    playerId = source
    //  } else {
    //    ws.send('SERVER:CHAR=V');
    //    playerId = source
    //  }
    //} else if (data === "RESET") {
    //  console.log("reset")
    //} else {
    //  wss.broadcast(msg)
    //}
  });

  
  ws.on('close', function close() {
  })



});

wss.broadcast = function broadcast(msg) {
  console.log(msg);
  wss.clients.forEach(function each(client) {
    client.send(msg);
  });
};