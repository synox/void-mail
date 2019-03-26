const EventEmitter = require('events')
const debug = require('debug')('void-mail:imap-manager')
const mem = require('mem')
const ImapService = require('./imap-service')
const EmailSummaryStore = require('./email-summary-store')
const {daysAgo} = require('../helper/time')

/**
 * Fetches mails from imap, caches them and provides methods to access them. Also notifies the users via websockets about
 * new messages.
 */
class EmailManager extends EventEmitter {
	constructor(config, clientNotification) {
		super()
		this.config = config
		this.imapService = new ImapService(config)
		this.summaryStore = new EmailSummaryStore()
		this.clientNotification = clientNotification

		// Cached methods:
		this.cachedFetchFullMail = mem(
			this.imapService.fetchOneFullMail.bind(this.imapService),
			{maxAge: 10 * 60 * 1000}
		)

		this.imapService.on('error', err => this.emit('error', err))

		setInterval(() => this._deleteOldMails(), 3600)
	}

	async connectImapAndAutorefresh() {
		// First add the listener, so we don't miss any messages:
		this.imapService.addNewMailListener(mail => this._onNewMail(mail))

		await this.imapService.connectAndLoad()
	}

	getMailSummaries(address) {
		return this.summaryStore.getForRecipient(address)
	}

	getOneFullMail(address, uid) {
		return this.cachedFetchFullMail(address, uid)
	}

	getAllMailSummaries() {
		return this.summaryStore.getAll()
	}

	_onNewMail(mail) {
		debug('new mail for', mail.to[0])
		mail.to.forEach(to => {
			this.summaryStore.add(to, mail)
			return this.clientNotification.emit(to)
		})
	}

	async _deleteOldMails() {
		this.imapService.deleteOldMails(daysAgo(this.config.imap.deleteMailsOlderThanDays))
	}

	_saveToFile(mails, filename) {
		const fs = require('fs')
		fs.writeFile(filename, JSON.stringify(mails), err => {
			if (err) {
				console.error('can not save mails to file', err)
			}
		})
	}
}

module.exports = EmailManager
