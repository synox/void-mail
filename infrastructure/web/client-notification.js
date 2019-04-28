const EventEmitter = require('events')
const debug = require('debug')('void-mail:notification')

/**
 * Receives sign-ins from users and notifies them when new mails are available.
 */
class ClientNotification extends EventEmitter {
	use(io) {
		io.on('connection', socket => {
			socket.on('sign in', address => this._signIn(socket, address))
		})
	}

	_signIn(socket, address) {
		debug(`socketio signed in: ${address}`)

		const newMailListener = () => {
			debug(`${address} has new messages, sending notification`)
			socket.emit('new emails')
		}

		this.on(address, newMailListener)

		socket.on('disconnect', reason => {
			debug(`client disconnect: ${address} (${reason})`)
			this.removeListener(address, newMailListener)
		})
	}
}

module.exports = ClientNotification
