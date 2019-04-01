const EventEmitter = require('events')
const debug = require('debug')('void-mail:imap-manager')
const mem = require('mem')
const moment = require('moment')
const ImapService = require('./imap-service')
const EmailSummaryStore = require('./email-summary-store')

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
		this.initialLoadDone = false

		// Cached methods:
		this.cachedFetchFullMail = mem(
			this.imapService.fetchOneFullMail.bind(this.imapService),
			{maxAge: 10 * 60 * 1000}
		)

		this.imapService.on(ImapService.EVENT_ERROR, err => this.emit('error', err))

		this.imapService.once(ImapService.EVENT_INITIAL_LOAD_DONE, () =>
			this._deleteOldMails()
		)

		// Delete old messages now and then every few hours
		setInterval(() => this._deleteOldMails(), 1000 * 3600 * 6)
	}

	async connectImapAndAutorefresh() {
		// First add the listener, so we don't miss any messages:
		this.imapService.on(ImapService.EVENT_NEW_MAIL, mail =>
			this._onNewMail(mail)
		)
		this.imapService.on(ImapService.EVENT_INITIAL_LOAD_DONE, () =>
			this._onInitialLoadDone()
		)
		this.imapService.on(ImapService.EVENT_DELETED_MAIL, mail =>
			this._onMailDeleted(mail)
		)

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

	_onInitialLoadDone() {
		this.initialLoadDone = true
		console.log(`initial load done, got ${this.summaryStore.mailCount()} mails`)
	}

	_onNewMail(mail) {
		if (this.initialLoadDone) {
			// For now, only log messages if they arrive after the initial load
			debug('new mail for', mail.to[0])
		}

		this.summaryStore.add(mail)
		mail.to.forEach(to => {
			return this.clientNotification.emit(to)
		})
	}

	_onMailDeleted(uid) {
		debug('mail deleted with uid', uid)
		this.summaryStore.removeUid(uid)
		// No client notification required, as nobody can cold a connection for 30+ days.
	}

	async _deleteOldMails() {
		try {
			await this.imapService.deleteOldMails(
				moment()
					.subtract(this.config.email.deleteMailsOlderThanDays, 'days')
					.toDate()
			)
		} catch (error) {
			console.log('can not delete old messages', error)
		}
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
