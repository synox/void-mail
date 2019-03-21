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
        this.cachedFetchFullMail = mem(this.imapFetcher.fetchOneFullMail.bind(this.imapFetcher), {maxAge: 10 * 60 * 1000})
    }


    async connectImapAndAutorefresh() {
        this.imapFetcher.addNewMailListener(mail => this._onNewMail(mail))
        await this.imapFetcher.connectAndLoad()
    }

    getMailSummaries(address) {
        return this.store.getMailSummariesFor(address)
    }

    getOneFullMail(address, uid) {
        return this.cachedFetchFullMail(address, uid)
    }

    getAllMailSummaries() {
        return this.store.getAllMailSummaries()
    }


    static findRecipientAddresses(emailSummary) {
        const addressesWithDuplicates = emailSummary.mail.to
            .map(addressObj => addressObj.address) // The address also contains the name, just keep the email
        return _.uniq(addressesWithDuplicates) // There might be duplicates, because email-store keeps a separate copy for each recipient.
    }


    _onNewMail(mail) {
        const recipients = EmailManager.findRecipientAddresses(mail)
        recipients.forEach(to => {
            this.store.add(to, mail)
            return this.clientNotification.emit(to);
        })

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
