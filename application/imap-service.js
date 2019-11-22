const EventEmitter = require('events')
const imaps = require('imap-simple')
const {simpleParser} = require('mailparser')
const addressparser = require('nodemailer/lib/addressparser')
const pSeries = require('p-series')
const retry = require('async-retry')
const debug = require('debug')('void-mail:imap')
const _ = require('lodash')
const Mail = require('../domain/mail')


// Just adding some missing functions to imap-simple... :-)

/**
 * Deletes the specified message(s).
 *
 * @param {string|Array} uid The uid or array of uids indicating the messages to be deleted
 * @param {function} [callback] Optional callback, receiving signature (err)
 * @returns {undefined|Promise} Returns a promise when no callback is specified, resolving when the action succeeds.
 * @memberof ImapSimple
 */
imaps.ImapSimple.prototype.deleteMessage = function (uid, callback) {
    var self = this;

    if (callback) {
        return nodeify(self.deleteMessage(uid), callback);
    }

    return new Promise(function (resolve, reject) {
        self.imap.addFlags(uid, '\\Deleted', function (err) {
            if (err) {
                reject(err);
                return;
            }
            self.imap.expunge( function (err) {
                if (err) {
                    reject(err);
                    return;
                }
                resolve();
            });
        });
    });
};



/**
 * Close a mailbox
 *
 * @param {boolean} [autoExpunge=true] If autoExpunge is true, any messages marked as Deleted in the currently open mailbox will be remove
 * @param {function} [callback] Optional callback, receiving signature (err)
 * @returns {undefined|Promise} Returns a promise when no callback is specified, resolving to `boxName`
 * @memberof ImapSimple
 */
imaps.ImapSimple.prototype.closeBox = function (autoExpunge=true, callback) {
    var self = this;

    if (typeof(autoExpunge) == 'function'){
        callback = autoExpunge;
        autoExpunge = true;
    }

    if (callback) {
        return nodeify(this.closeBox(autoExpunge), callback);
    }

    return new Promise(function (resolve, reject) {

        self.imap.closeBox(autoExpunge, function (err, result) {

            if (err) {
                reject(err);
                return;
            }

            resolve(result);
        });
    });
};


/**
 * Fetches emails from the imap server. It is a facade against the more complicated imap-simple api. It keeps the connection
 * as a member field.
 *
 * With this abstraction it would be easy to replace this with any inbound mail service like mailgun.com.
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

	async connectAndLoadMessages() {
		const configWithListener = {
			...this.config,
			// 'onmail' adds a callback when new mails arrive. With this we can keep the imap refresh interval very low (or even disable it).
			onmail: () => this._doOnNewMail()
		}

		this.once(ImapService.EVENT_INITIAL_LOAD_DONE, () =>
			this._doAfterInitialLoad()
		)

		await this._connectWithRetry(configWithListener)

		// Load all messages in the background. (ASYNC)
		this._loadMailSummariesAndEmitAsEvents()
	}

	async _connectWithRetry(configWithListener) {
		try {
			await retry(
				async _bail => {
					// If anything throws, we retry
					this.connection = await imaps.connect(configWithListener)

					this.connection.on('error', err => {
						// We assume that the app will be restarted after a crash.
						console.error(
							'got fatal error during imap operation, stop app.',
							err
						)
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
			this._loadMailSummariesAndEmitAsEvents()
		}
	}

	_doAfterInitialLoad() {
		// During initial load we ignored new incoming emails. In order to catch up with those, we have to refresh
		// the mails once after the initial load. (async)
		this._loadMailSummariesAndEmitAsEvents()

		// If the above trigger on new mails does not work reliable, we have to regularly check
		// for new mails on the server. This is done only after all the mails have been loaded for the
		// first time. (Note: set the refresh higher than the time it takes to download the mails).
		if (this.config.imap.refreshIntervalSeconds) {
			setInterval(
				() => this._loadMailSummariesAndEmitAsEvents(),
				this.config.imap.refreshIntervalSeconds * 1000
			)
		}
	}

	async _loadMailSummariesAndEmitAsEvents() {
		// UID: Unique id of a message.

		const uids = await this._getAllUids()
		const newUids = uids.filter(uid => !this.loadedUids.has(uid))

		// Optimize by fetching several messages (but not all) with one 'search' call.
		// fetching all at once might be more efficient, but then it takes long until we see any messages
		// in the frontend. With a small chunk size we ensure that we see the newest emails after a few seconds after
		// restart.
		const uidChunks = _.chunk(newUids, 20)

		// Creates an array of functions. We do not start the search now, we just create the function.
		const fetchFunctions = uidChunks.map(uidChunk => () =>
			this._getMailHeadersAndEmitAsEvents(uidChunk)
		)

		await pSeries(fetchFunctions)

		if (!this.initialLoadDone) {
			this.initialLoadDone = true
			this.emit(ImapService.EVENT_INITIAL_LOAD_DONE)
		}
	}

	/**
	 *
	 * @param {Date} deleteMailsBefore delete mails before this date instance
	 */
	async deleteOldMails(deleteMailsBefore) {
		debug(`deleting mails before ${deleteMailsBefore}`)
		const uids = await this._searchWithoutFetch([
			['!DELETED'],
			['BEFORE', deleteMailsBefore]
		])
		if (uids.length === 0) {
			return
		}

		debug(`deleting mails ${uids}`)
		await this.connection.deleteMessage(uids)
		console.log(`deleted ${uids.length} old messages.`)

		uids.forEach(uid => this.emit(ImapService.EVENT_DELETED_MAIL, uid))
	}

	/**
	 * Helper method because ImapSimple#search also fetches each message. We just need the uids here.
	 *
	 * @param {Object} searchCriteria (see ImapSimple#search)
	 * @returns {Promise<Array<Int>>} Array of UIDs
	 * @private
	 */
	async _searchWithoutFetch(searchCriteria) {
		const imapUnderlying = this.connection.imap

		return new Promise((resolve, reject) => {
			imapUnderlying.search(searchCriteria, (err, uids) => {
				if (err) {
					reject(err)
				} else {
					resolve(uids || [])
				}
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

		return Mail.create(to, from, date, subject, uid)
	}

	async fetchOneFullMail(to, uid) {
		if (!this.connection) {
			// Here we 'fail fast' instead of waiting for the connection.
			throw new Error('imap connection not ready')
		}

		debug(`fetching full message ${uid}`)

		// For security we also filter TO, so it is harder to just enumerate all messages.
		const searchCriteria = [['UID', uid], ['TO', to]]
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
		// We ignore mails that are flagged as DELETED, but have not been removed (expunged) yet.
		const uids = await this._searchWithoutFetch([['!DELETED']])
		// Create copy to not mutate the original array. Sort with newest first (DESC).
		return [...uids].sort().reverse()
	}

	async _getMailHeadersAndEmitAsEvents(uids) {
		try {
			const mails = await this._getMailHeaders(uids)
			mails.forEach(mail => {
				this.loadedUids.add(mail.attributes.uid)
				// Some broadcast messages have no TO field. We have to ignore those messages.
				if (mail.parts[0].body.to) {
					this.emit(ImapService.EVENT_NEW_MAIL, this._createMailSummary(mail))
				}
			})
		} catch (error) {
			debug('can not fetch', error)
			throw error
		}
	}

	async _getMailHeaders(uids) {
		const fetchOptions = {
			bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)'],
			struct: false
		}
		const searchCriteria = [['UID', ...uids]]
		return this.connection.search(searchCriteria, fetchOptions)
	}
}

// Consumers should use these constants:
ImapService.EVENT_NEW_MAIL = 'mail'
ImapService.EVENT_DELETED_MAIL = 'mailDeleted'
ImapService.EVENT_INITIAL_LOAD_DONE = 'initial load done'
ImapService.EVENT_ERROR = 'error'

module.exports = ImapService
