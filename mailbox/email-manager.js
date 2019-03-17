const _ = require('lodash')
const mem = require('mem')
const ImapFetcher = require('./imap-fetcher')
const EmailStore = require('./email-store')

/**
 * Fetches mails from imap, caches them and provides methods to access them.
 */
class EmailManager {
  constructor(config, clientNotification) {
    this.config = config
    this.imapFetcher = new ImapFetcher(config)
    this.store = new EmailStore()
    this.clientNotification = clientNotification

    // Cached methods:
    this.cachedFetchFullMail = mem(this.imapFetcher.fetchFullMail.bind(this.imapFetcher), {maxAge: 10 * 60 * 1000})
  }

  async connectImapAndAutorefresh() {
    await this.imapFetcher.connect()
    await this._reloadAllMailSummariesAndNotify()

    // Reload all mails when imap detects new messages (TODO: only load the new mail)
    this.imapFetcher.on('newmail', () => {
      console.log('got new mail, lets refresh')
      this._reloadAllMailSummariesAndNotify()
    })

    // If the automatic refresh above is not reliable, you can trigger it in an interval.
    if (this.config.imap.refreshIntervalSeconds) {
      setInterval(() => this._reloadAllMailSummariesAndNotify(), this.config.imap.refreshIntervalSeconds * 1000)
    }
  }

  getMailSummaries(address) {
    return this.store.getMailSummariesFor(address)
  }

  getMail(address, uid) {
    return this.cachedFetchFullMail(address, uid)
  }

  getAllMailSummaries() {
    return this.store.getAllMailSummaries()
  }

  async _reloadAllMailSummariesAndNotify() {
    const mails = await this.imapFetcher.fetchAllMailSummaries()

    const newMails = this.store.updateSummariesAndReturnNewMails(mails)
    const recipientsToNotify = EmailManager.findRecipientAddresses(newMails)
    recipientsToNotify.forEach(to =>
      this.clientNotification.emit(to))
  }

  static findRecipientAddresses(emailSummaries) {
    const addressesWithDuplicates = emailSummaries
      .flatMap(mail => mail.to) // 'to' is an array, unwrap with flatMap
      .map(addressObj => addressObj.address) // The address also contains the name, just keep the email
    return _.uniq(addressesWithDuplicates) // There might be duplicates, because email-store keeps a separate copy for each recipient.
  }

  _saveToFile(mails, filename) {
    const fs = require('fs')
    fs.writeFile(filename, JSON.stringify(mails), err => {
      if (err) {
        console.log('can not save mails to file', err)
      }
    })
  }
}

module.exports = EmailManager
