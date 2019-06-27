const EventEmitter = require('events')
const debug = require('debug')('void-mail:imap-manager')
const mem = require('mem')
const moment = require('moment')
const ImapService = require('./imap-service')

class MailProcessingService extends EventEmitter {
	constructor(mailRepository, imapService, clientNotification, config) {
		super()
		this.mailRepository = mailRepository
		this.clientNotification = clientNotification
		this.imapService = imapService
		this.config = config

		// Cached methods:
		this.cachedFetchFullMail = mem(
			this.imapService.fetchOneFullMail.bind(this.imapService),
			{maxAge: 10 * 60 * 1000}
		)

		this.initialLoadDone = false

		// Delete old messages now and every few hours
		this.imapService.once(ImapService.EVENT_INITIAL_LOAD_DONE, () =>
			this._deleteOldMails()
		)
		setInterval(() => this._deleteOldMails(), 1000 * 3600 * 6)
	}

	getMailSummaries(address) {
		return this.mailRepository.getForRecipient(address)
	}

	getOneFullMail(address, uid) {
		return this.cachedFetchFullMail(address, uid)
	}

	getAllMailSummaries() {
		return this.mailRepository.getAll()
	}

	onInitialLoadDone() {
		this.initialLoadDone = true
		console.log(
			`initial load done, got ${this.mailRepository.mailCount()} mails`
		)
	}

	onNewMail(mail) {
		if (this.initialLoadDone) {
			// For now, only log messages if they arrive after the initial load
			debug('new mail for', mail.to[0])
		}

		mail.to.forEach(to => {
			this.mailRepository.add(to, mail)
			return this.clientNotification.emit(to)
		})
	}

	onMailDeleted(uid) {
		debug('mail deleted with uid', uid)
		this.mailRepository.removeUid(uid)
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

module.exports = MailProcessingService
