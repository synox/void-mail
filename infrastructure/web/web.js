const path = require('path')
const http = require('http')
const debug = require('debug')('voidmail:server')
const express = require('express')
const logger = require('morgan')
const Twig = require('twig')
const compression = require('compression')
const helmet = require('helmet')
const socketio = require('socket.io')

const config = require('../../application/config')
const inboxRouter = require('./routes/inbox')
const loginRouter = require('./routes/login')
const {sanitizeHtmlTwigFilter} = require('./views/twig-filters')

// Init express middleware
const app = express()
app.use(helmet())
app.use(compression())
app.set('config', config)
const server = http.createServer(app)
const io = socketio(server)

app.set('socketio', io)
app.use(logger('dev'))
app.use(express.json())
app.use(express.urlencoded({extended: false}))
// View engine setup
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'twig')
app.set('twig options', {
	autoescape: true
})

// Application code:
app.use(
	express.static(path.join(__dirname, 'public'), {
		immutable: true,
		maxAge: '1h'
	})
)
Twig.extendFilter('sanitizeHtml', sanitizeHtmlTwigFilter)

app.get('/', (req, res, _next) => {
	res.redirect('/login')
})

app.use('/login', loginRouter)
app.use('/', inboxRouter)

// Catch 404 and forward to error handler
app.use((req, res, next) => {
	next({message: 'page not found', status: 404})
})

// Error handler
app.use((err, req, res, _next) => {
	// Set locals, only providing error in development
	res.locals.message = err.message
	res.locals.error = req.app.get('env') === 'development' ? err : {}

	// Render the error page
	res.status(err.status || 500)
	res.render('error')
})

/**
 * Get port from environment and store in Express.
 */

app.set('port', config.http.port)

/**
 * Listen on provided port, on all network interfaces.
 */
server.listen(config.http.port)
server.on('listening', () => {
	const addr = server.address()
	const bind = typeof addr === 'string' ? 'pipe ' + addr : 'port ' + addr.port
	debug('Listening on ' + bind)
})

module.exports = {app, io, server}
