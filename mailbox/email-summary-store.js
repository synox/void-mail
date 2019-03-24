const MultiMap = require('mnemonist/multi-map')
const _ = require('lodash')

/**
 * In-Memory store/cache fo the email summaries (headers, without the full body).
 *
 * You might be tempted to also store all the mail bodies here, but this would bloat the
 * memory. It would be better to use Redis or Mongo to save this in a different process.
 * But we don't, because we try to keep things simple.
 */
class EmailSummaryStore {
	constructor() {
		// MultiMap docs: https://yomguithereal.github.io/mnemonist/multi-map
		this.mailSummaries = new MultiMap()
	}

	getForRecipient(address) {
		const mails = this.mailSummaries.get(address) || []
		return _.orderBy(mails,
			mail => Date.parse(mail.date), ['desc'])
	}

	getAll() {
		const mails = [...this.mailSummaries.values()]
		return _.orderBy(mails,
			mail => Date.parse(mail.date), ['desc'])
	}

	add(to, mailSummary) {
		this.mailSummaries.set(to.toLowerCase(), mailSummary)
	}
}

module.exports = EmailSummaryStore
