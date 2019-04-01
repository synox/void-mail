const debug = require('debug')('void-mail:mail-summary-store')
const MultiMap = require('mnemonist/multi-map')
const _ = require('lodash')
const loki = require('lokijs')

/**
 * In-Memory store/cache for the email summaries (headers, without the full body).
 *
 * You might be tempted to also store all the mail bodies here, but this would bloat the
 * memory. It would be better to use Redis or Mongo to save this in a different process.
 * But we don't, because we try to keep things simple.
 */
class EmailSummaryStore {
	constructor() {
		const db = new loki('sandbox.db', {adapter: new loki.LokiMemoryAdapter()});
		this.mails = db.addCollection('mails', {
			indices: ['to'],
			disableMeta: true
		})
	}

	getForRecipient(address) {
		return this.mails.chain()
			.find({to: {'$contains': address}})
			.simplesort('date', {desc: true})
			.data();
	}

	getAll() {
		return this.mails.chain()
			.simplesort('date', {desc: true})
			.data();
	}

	add(mailSummary) {
		this.mails.add(mailSummary)
	}

	removeUid(uid) {
		this.mails.findAndRemove({uid: uid})
	}

	mailCount() {
		return this.mails.count()
	}
}

module.exports = EmailSummaryStore
