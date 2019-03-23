const debug = require('debug')('void-mail:imap-manager')
const mem = require('mem')
const ImapFetcher = require('./imap-fetcher')
const EmailSummaryStore = require('./email-summary-store')

/**
 * Fetches mails from imap, caches them and provides methods to access them. Also notifies the users via websockets about
 * new messages.
 */
class EmailManager {
  constructor(config, clientNotification) {
    this.config = config
    this.imapFetcher = new ImapFetcher(config)
    this.summaryStore = new EmailSummaryStore()
    this.clientNotification = clientNotification

    // Cached methods:
    this.cachedFetchFullMail = mem(this.imapFetcher.fetchOneFullMail.bind(this.imapFetcher), {maxAge: 10 * 60 * 1000})
  }

  async connectImapAndAutorefresh() {
    // First add the listener, so we don't miss any messages:
    this.imapFetcher.addNewMailListener(mail => this._onNewMail(mail))

    await this.imapFetcher.connectAndLoad()
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
