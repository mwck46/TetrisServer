import { WebSocketServer } from 'ws';

const MAX_GAME = 100
const MAX_BLOCK_TYPES = 7



class Game {
  constructor() {
    this.gameId = Game.generateGameId()
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

  static generateNextNBlocks(N) {
    let nextN = []
    for (let i = 0; i < N; ++i) {
      nextN.push(Math.floor(Math.random() * MAX_BLOCK_TYPES))
    }
    return nextN
  }

  AddPlayer(player) {
    player.gameId = this.gameId
    this.players.push(player)
  }
}

class Player {
  constructor(playerId, webSock) {
    this.playerId = playerId
    this.webSock = webSock
  }

  setGameId(gameId) {
    this.gameId = gameId
  }
}

class GameMessage {
  constructor(sender, message, remarks = null) {
    this.sender = sender
    this.message = message
    this.remarks = remarks
  }

  toString() {
    return JSON.stringify({
      sender: this.sender,
      message: this.message,
      remarks: this.remarks
    })
  }

  static parseFromSocket(msg) {
    const msgObj = JSON.parse(msg)
    return new GameMessage(msgObj.sender, msgObj.message, msgObj.remarks)
  }
}

const wss = new WebSocketServer({ port: 18080 });
var games = []
var players = []


wss.on('connection', function connection(ws) {
  ws.send(new GameMessage("SERVER", "Connected").toString());
  if (games.length >= MAX_GAME) {
    ws.send(new GameMessage("SERVER", "ERROR", "Server is currently full"))
    ws.close();
  }



  ws.on('message', function message(rawmsg) {
    console.log('received: %s', rawmsg);

    let msgObj = GameMessage.parseFromSocket(rawmsg)

    if (msgObj.message === "NEWGAME") {
      const newGame = new Game()
      ws.gameId = newGame.gameId
      const player1 = new Player(msgObj.sender, ws)
      newGame.AddPlayer(player1)
      players.push(player1)
      games.push(newGame)
      const msg = new GameMessage("SERVER", "GAMEID", newGame.gameId).toString()
      console.log('send: %s', msg);
      ws.send(msg)
    } else if (msgObj.message === "JOINGAME") {
      const gameId = msgObj.remarks
      const game = games.find(g => g.gameId == gameId) // DON'T use "===", it compares the true memory address
      if (!game) {
        ws.send(new GameMessage("SERVER", "ERROR", "Game ID not found").toString())
        return
      }
      ws.gameId = game.gameId
      const player2 = new Player(msgObj.sender, ws)
      players.push(player2)
      game.AddPlayer(player2)
      ws.send(new GameMessage("SERVER", "JOINGAME", "OK").toString())
    } else if (msgObj.message === "REQUESTSTART") {
      const gameId = msgObj.remarks
      const game = games.find(g => g.gameId == gameId) // DON'T use "===", it compares the true memory address
      if (!game) {
        ws.send(new GameMessage("SERVER", "ERROR", "Game ID not found").toString())
        console.log('game id not found');
        return
      }

      //let next20Blocks = [0,1,2,3,4,5,6].concat(Game.generateNextNBlocks(20))
      let next20Blocks = Game.generateNextNBlocks(20)
      for (let player of game.players) {
        const msg = new GameMessage("SERVER", "GAMESTART", JSON.stringify(next20Blocks)).toString();
        player.webSock.send(msg)
        console.log('send: %s', msg);
      }
    } else if (msgObj.message === "TICK") {
      const player = players.find(p => p.playerId == msgObj.sender) // DON'T use "===", it compares the true memory address
      if (!player) {
        ws.send(new GameMessage("SERVER", "ERROR", "Player ID invalid").toString())
        return
      }
      const gameId = player.gameId
      const game = games.find(g => g.gameId == gameId) // DON'T use "===", it compares the true memory address
      if (!game) {
        ws.send(new GameMessage("SERVER", "ERROR", "Game ID not found").toString())
        return
      }
      for (let player of game.players) {
        // don't send to yourself
        if (player.playerId != msgObj.sender) {
          player.webSock.send(new GameMessage("RIVAL", "TICK", msgObj.remarks).toString())
        }
      }

    } else if (msgObj.message === "REQUESTBLOCK") {
      const gameId = msgObj.remarks
      const game = games.find(g => g.gameId == gameId) // DON'T use "===", it compares the true memory address
      if (!game) {
        ws.send(new GameMessage("SERVER", "ERROR", "Game ID not found").toString())
      }

      let next10Blocks = Game.generateNextNBlocks(10)
      for (let player of game.players) {
        player.webSock.send(new GameMessage("SERVER", "NEWBLOCK", JSON.stringify(next10Blocks)).toString())
      }
    }

  });


  ws.on('close', function close() {
     const gameId = ws.gameId
     const game = games.find(g => g.gameId == gameId) // DON'T use "===", it compares the true memory address
     //console.log(ws.gameId)
     if (!game) {
       return
     }
     //console.log(game)
     for (let player of game.players) {
       if (player.webSock !== ws) {
        player.webSock.send(new GameMessage("SERVER", "GAMEOVER", "WON").toString())
        player.webSock.close()
       }
     }

     games = games.filter(function(g){
       return g.gameId != gameId
     })

  })



});

wss.broadcast = function broadcast(msg) {
  console.log(msg);
  wss.clients.forEach(function each(client) {
    client.send(msg);
  });
};