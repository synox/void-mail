const path = require('path')
const http = require('http')
const express = require('express')
const logger = require('morgan')
const Twig = require('twig')
const compression = require('compression')
const helmet = require('helmet')
const socketio = require('socket.io')

// Until node 11 adds flatmap, we use this:
require('array.prototype.flatmap').shim()

const {sanitizeHtmlTwigFilter} = require('./views/twig-filters')
const EmailManager = require('./mailbox/email-manager')
const inboxRouter = require('./routes/inbox')
const loginRouter = require('./routes/login')
const ClientNotification = require('./helper/client-notification')
const config = require('./helper/config')

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
app.use(express.static(path.join(__dirname, 'public')))
Twig.extendFilter('sanitizeHtml', sanitizeHtmlTwigFilter)

const clientNotification = new ClientNotification()
clientNotification.use(io)

const emailManager = new EmailManager(config, clientNotification)
app.set('emailManager', emailManager)

app.get('/', (req, res, next) => {
  res.redirect('/login')
})

app.use('/login', loginRouter)
app.use('/', inboxRouter)

// Catch 404 and forward to error handler
app.use((req, res, next) => {
  next({message: 'page not found', status: 404})
})

// Error handler
app.use((err, req, res, next) => {
  // Set locals, only providing error in development
  res.locals.message = err.message
  res.locals.error = req.app.get('env') === 'development' ? err : {}

  // Render the error page
  res.status(err.status || 500)
  res.render('error')
})

emailManager.connectImapAndAutorefresh()

module.exports = {app, server}
