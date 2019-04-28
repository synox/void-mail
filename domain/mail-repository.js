const debug = require('debug')('void-mail:mail-summary-store')
const MultiMap = require('mnemonist/multi-map')
const _ = require('lodash')

class MailRepository {
	constructor() {
		// MultiMap docs: https://yomguithereal.github.io/mnemonist/multi-map
		this.mailSummaries = new MultiMap()
	}

	getForRecipient(address) {
		const mails = this.mailSummaries.get(address) || []
		return _.orderBy(mails, mail => Date.parse(mail.date), ['desc'])
	}

	getAll() {
		const mails = [...this.mailSummaries.values()]
		return _.orderBy(mails, mail => Date.parse(mail.date), ['desc'])
	}

	add(to, mailSummary) {
		this.mailSummaries.set(to.toLowerCase(), mailSummary)
	}

	removeUid(uid) {
		// TODO: make this more efficient, looping through each email is not cool.
		this.mailSummaries.forEachAssociation((mails, to) => {
			mails
				.filter(mail => mail.uid === uid)
				.forEach(mail => {
					this.mailSummaries.remove(to, mail)
					debug('removed ', mail.date, to, mail.subject)
				})
		})
	}

	mailCount() {
		return this.mailSummaries.size
	}
}

module.exports = MailRepository
