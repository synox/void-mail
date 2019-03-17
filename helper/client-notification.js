const EventEmitter = require('events')

/**
 * Receives sign-ins from users and notifies them when new mails are available.
 */
class ClientNotification extends EventEmitter {
  use(io) {
    io.on('connection', socket => {
      socket.on('sign in', address => this._signIn(socket, address))
    }
    )
  }

  _signIn(socket, address) {
    console.log('socketio signed in:', address)

    const newMailListener = () => {
      console.log(`${address} has new messages, sending notification`)
      socket.emit('new emails')
    }

    this.on(address, newMailListener)

    socket.on('disconnect', reason => {
      console.log('client disconnect:', address)
      this.removeListener(address, newMailListener)
    })
  }
}

module.exports = ClientNotification
