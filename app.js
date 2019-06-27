#!/usr/bin/env node
/* eslint unicorn/no-process-exit: 0 */

const config = require('./application/config')

// Until node 11 adds flatmap, we use this:
require('array.prototype.flatmap').shim()

const {app, io, server} = require('./infrastructure/web/web')
const ClientNotification = require('./infrastructure/web/client-notification')
const ImapService = require('./application/imap-service')
const MailProcessingService = require('./application/mail-processing-service')
const MailRepository = require('./domain/mail-repository')

const clientNotification = new ClientNotification()
clientNotification.use(io)

const imapService = new ImapService(config)
const mailProcessingService = new MailProcessingService(
	new MailRepository(),
	imapService,
	clientNotification,
	config
)

// Put everything together:
imapService.on(ImapService.EVENT_NEW_MAIL, mail =>
	mailProcessingService.onNewMail(mail)
)
imapService.on(ImapService.EVENT_INITIAL_LOAD_DONE, () =>
	mailProcessingService.onInitialLoadDone()
)
imapService.on(ImapService.EVENT_DELETED_MAIL, mail =>
	mailProcessingService.onMailDeleted(mail)
)

mailProcessingService.on('error', err => {
	console.error('error from mailProcessingService, stopping.', err)
	process.exit(1)
})

imapService.on(ImapService.EVENT_ERROR, error => {
	console.error('fatal error from imap service', error)
	process.exit(1)
})

app.set('mailProcessingService', mailProcessingService)

imapService.connectAndLoadMessages().catch(error => {
	console.error('fatal error from imap service', error)
	process.exit(1)
})

server.on('error', error => {
	if (error.syscall !== 'listen') {
		console.error('fatal web server error', error)
		return
	}

	// Handle specific listen errors with friendly messages
	switch (error.code) {
		case 'EACCES':
			console.error(
				'Port ' + config.http.port + ' requires elevated privileges'
			)
			process.exit(1)
		case 'EADDRINUSE':
			console.error('Port ' + config.http.port + ' is already in use')
			process.exit(1)
		default:
			console.error('fatal web server error', error)
			process.exit(1)
	}
})
