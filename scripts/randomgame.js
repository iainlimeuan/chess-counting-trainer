var board = null
var config = {
    pieceTheme: 'img/wikipedia/{piece}.png',
    position: 'start'
}
var game = new Chess()

function makeRandomMove () {
    var possibleMoves = game.moves()

    if (game.isGameOver()) return

    var randomIdx = Math.floor(Math.random() * possibleMoves.length)
    game.move(possibleMoves[randomIdx])
    board.position(game.fen())

    window.setTimeout(makeRandomMove, 500)
}

board = Chessboard('myBoard', config)

window.setTimeout(makeRandomMove, 500)