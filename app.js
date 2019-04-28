#!/usr/bin/env node
/* eslint unicorn/no-process-exit: 0 */

const config = require('./application/config')

// Until node 11 adds flatmap, we use this:
require('array.prototype.flatmap').shim()

const {app, io} = require('./infrastructure/web/web')
const ClientNotification = require('./infrastructure/web/client-notification')
const ImapService = require('./application/imap-service')
const MailService = require('./application/mail-service')
const MailRepository = require('./domain/mail-repository')

const clientNotification = new ClientNotification()
clientNotification.use(io)

const imapService = new ImapService(config)
const mailService = new MailService(
	new MailRepository(),
	imapService,
	clientNotification,
	config
)

imapService.on(ImapService.EVENT_NEW_MAIL, mail => mailService.onNewMail(mail))
imapService.on(ImapService.EVENT_INITIAL_LOAD_DONE, () =>
	mailService.onInitialLoadDone()
)
imapService.on(ImapService.EVENT_DELETED_MAIL, mail =>
	mailService.onMailDeleted(mail)
)

mailService.on('error', err => {
	console.error('error from mailService, stopping.', err)
	process.exit(1)
})

imapService.on(ImapService.EVENT_ERROR, error => {
	console.error('fatal error from imap service', error)
	return process.exit(1)
})

app.set('mailService', mailService)

imapService.connectAndLoad().catch(error => {
	console.error('fatal error from imap service', error)
	return process.exit(1)
})
