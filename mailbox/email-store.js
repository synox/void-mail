const MultiMap = require('mnemonist/multi-map')
const _ = require('lodash')

/**
 * In-Memory store/cache fo the email summaries (headers, without the full body).
 *
 * You might be tempted to also store all the mail bodies here, but this would bloat the
 * memory. It would be better to use Redis or Mongo to save this in a different process.
 */
class EmailStore {
  constructor() {
    // https://yomguithereal.github.io/mnemonist/multi-map
    this.mailSummaries = new MultiMap()
  }

  getMailSummariesFor(address) {
    const mails = this.mailSummaries.get(address) || []
    return _.orderBy(mails,
      mail => Date.parse(mail.date), ['desc'])
  }

  getAllMailSummaries() {
    return this.mailSummaries.values()
  }

  updateSummariesAndReturnNewMails(headersOnlyMails) {
    const newMailSummaries = new MultiMap()

    headersOnlyMails.forEach(mail => {
      mail.to.forEach(recipient =>
        newMailSummaries.set(recipient.address, mail)
      )
    })

    // Find which mails are new in order to only notify affected users
    const before = this.mailSummaries.values()
    const after = newMailSummaries.values()
    const newMails = _.differenceBy([...after], [...before], mail => mail.uid)

    this.mailSummaries = newMailSummaries
    console.log(`loaded ${headersOnlyMails.length} mail summaries`)

    return newMails
  }
}

module.exports = EmailStore
