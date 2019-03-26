const EventEmitter = require('events')
const imaps = require('imap-simple')
const {simpleParser} = require('mailparser')
const addressparser = require('nodemailer/lib/addressparser')
const pSeries = require('p-series')
const retry = require('async-retry')
const debug = require('debug')('void-mail:imap')

const _ = require('lodash')

/**
 * Fetches emails from the imap server. It is a facade against the more complicated imap-simple api. It keeps the connection
 * as a member field.
 */
class ImapService extends EventEmitter {
	constructor(config) {
		super()
		this.config = config

		/**
		 * Set of emitted UIDs. Listeners should get each email only once.
		 * @type {Set<any>}
		 */
		this.loadedUids = new Set()

		this.connection = null
		this.initialLoadDone = false
	}

	async connectAndLoad() {
		const configWithListener = {
			...this.config,
			// 'onmail' adds a callback when new mails arrive. With this we can keep the imap refresh interval very low (or even disable it).
			onmail: () => this._doOnNewMail()
		}

		this.once('initial load done', () => this._doAfterInitialLoad())

		await this._connectWithRetry(configWithListener);

		// Load all messages. ASYNC, return control flow after connecting.
		this._loadMailSummariesAndPublish()

		return this.connection
	}

	async _connectWithRetry(configWithListener) {
		try {
			await retry(
				async _bail => {
					// If anything throws, we retry
					this.connection = await imaps.connect(configWithListener)

					this.connection.on('error', err => {
						// We assume that the app will be restarted after a crash.
						console.error('got fatal error during imap operation, stop app.', err)
						this.emit('error', err)
					})

					await this.connection.openBox('INBOX')
					debug('connected to imap')
				},
				{
					retries: 5
				}
			)
		} catch (error) {
			console.error('can not connect, even with retry, stop app', error)
			throw error
		}
	}

	_doOnNewMail() {
// Only react to new mails after the initial load, otherwise it might load the same mails twice.
		if (this.initialLoadDone) {
			this._loadMailSummariesAndPublish()
		}
	}

	_doAfterInitialLoad() {
		// During initial load we ignored new incoming emails. In order to catch up with those, we have to refresh
		// the mails once after the initial load. (async)
		this._loadMailSummariesAndPublish()

		// If the above trigger on new mails does not work reliable, we have to regularly check
		// for new mails on the server. This is done only after all the mails have been loaded for the
		// first time. (Note: set the refresh higher than the time it takes to download the mails).
		if (this.config.imap.refreshIntervalSeconds) {
			setInterval(
				() => this._loadMailSummariesAndPublish(),
				this.config.imap.refreshIntervalSeconds * 1000
			)
		}
	}

	async _loadMailSummariesAndPublish() {
		const uids = await this._getAllUids()
		const newUids = uids.filter(uid => !this.loadedUids.has(uid))

		// Optimize by fetching several messages (but not all) with one 'search' call.
		// fetching all at once might be more efficient, but then it takes long until we see any messages
		// in the frontend. With a small chunk size we ensure that we see the newest emails after a few seconds after
		// restart.
		const uidChunks = _.chunk(newUids, 20)

		// Returning a function. We do not start the search now, we just create the function.
		const fetchFunctions = uidChunks.map(uidChunk => () =>
			this._getMailHeadersAndPublish(uidChunk)
		)

		await pSeries(fetchFunctions)
		if (!this.initialLoadDone) {
			this.initialLoadDone = true
			this.emit('initial load done')

		}
	}

	addNewMailListener(cb) {
		this.on('mail', cb)
	}

	async deleteMail(uid) {
		return this.connection.addFlags(uid, '\\Deleted')

		// TODO: expunge() once in a while
		/*
		expunge([< MessageSource >uids, ]< function >callback) - (void) -
		Permanently removes all messages flagged as Deleted in the currently open mailbox.
		 If the server supports the 'UIDPLUS' capability, uids can be supplied to only remove messages
		 that both have their uid in uids and have the \Deleted flag set. callback has 1 parameter: < Error >err.
		 */
	}

	/**
	 *
	 * @param {Date} deleteMailsBefore delete mails before this date instance
	 */
	async deleteOldMails(deleteMailsBefore) {

		const uids = await this._searchWithoutFetch([['BEFORE', deleteMailsBefore]])
		return Promise.all(
			uids.map(async uid => {
				let mail = await this.fetchOneFullMail('todo', uid)
				console.error('would now delete ', uid, mail.subject, mail.date)
				// return this.deleteMail(uid); // TODO: make hot
				return new Promise((resolve)=>resolve(null))
			})
		)
	}

	/**
	 *
	 * @param searchCriteria (see ImapSimple#search)
	 * @returns {Promise<Array<Int>>} Array of UIDs
	 * @private
	 */
	async _searchWithoutFetch(searchCriteria) {
		const imapUnderlying = this.connection.imap

		return new Promise(function (resolve, reject) {
			imapUnderlying.search(searchCriteria, function (err, uids) {
				if (err) {
					reject(err);
					return;
				}

				resolve(uids || []);
			})
		})
	}

	_createMailSummary(message) {
		const headerPart = message.parts[0].body
		const to = headerPart.to
			.flatMap(to => addressparser(to))
			// The address also contains the name, just keep the email
			.map(addressObj => addressObj.address)

		const from = headerPart.from.flatMap(from => addressparser(from))

		const subject = headerPart.subject[0]
		const date = headerPart.date[0]
		const {uid} = message.attributes

		return {
			raw: message,
			to,
			from,
			date,
			subject,
			uid
		}
	}

	async fetchOneFullMail(to, uid) {
		if (!this.connection) {
			// Here we 'fail fast' instead of waiting for the connection.
			throw new Error('imap connection not ready')
		}

		debug(`fetching full message ${uid}`)

		// For security we also filter TO, so it is harder to just enumerate all messages.
		const searchCriteria = [['UID', uid]
			// ['TO', to]
		]
		const fetchOptions = {
			bodies: ['HEADER', ''], // Empty string means full body
			markSeen: false
		}

		const messages = await this.connection.search(searchCriteria, fetchOptions)
		if (messages.length === 0) {
			throw new Error('email not found')
		}

		const fullBody = _.find(messages[0].parts, {which: ''})
		return simpleParser(fullBody.body)
	}

	async _getAllUids() {
		// Imap-simple does not expose the underlying connection yet.
		const imapUnderlying = this.connection.imap
		return new Promise((resolve, reject) => {
			imapUnderlying.search(['!DELETED'], (err, uids) => {
				if (err) {
					reject(err)
					return
				}

				// Get newest messages first, order DESC
				resolve(uids.sort().reverse())
			})
		})
	}

	async _getMailHeadersAndPublish(uids) {
		try {
			const mails = await this._getMailHeaders(uids)
			debug('fetched uids: ', uids)
			mails.forEach(mail => {
				this.loadedUids.add(mail.attributes.uid)
				return this.emit('mail', this._createMailSummary(mail))
			})
		} catch (error) {
			debug('can not fetch', error)
			throw error
		}
	}

	async _getMailHeaders(uids) {
		debug('fetching uid', uids)
		const fetchOptions = {
			bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)'],
			struct: false
		}
		const searchCriteria = [['UID', ...uids]]
		return this.connection.search(searchCriteria, fetchOptions)
	}
}

module.exports = ImapService
