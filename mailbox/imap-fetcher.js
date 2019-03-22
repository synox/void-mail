const imaps = require('imap-simple')
const {simpleParser} = require('mailparser')
const addressparser = require('nodemailer/lib/addressparser')
const EventEmitter = require('events')
const pSeries = require('p-series');

const _ = require('lodash')

/**
 * Fetches emails from the imap server. It is a facade against the more complicated imap api. It keeps the connection
 * as a member field.
 *
 * TODO: handle connection problems,  connection losses and reconnection
 */
class ImapFetcher extends EventEmitter {
    constructor(config) {
        super()
        this.config = config
        this.loadedUids = new Set()
        this.connection = null
        this.initialLoadDone = false
    }

    async connectAndLoad() {
        const configWithListener = {
            ...this.config,
            // 'onmail' adds a callback when new mails arrive. With this we can keep the imap refresh interval very low (or even disable it).
            onmail: () => {
                // only react to new mails after the initial load, otherwise it might load the same mails twice.
                if (this.initialLoadDone) {

                    return this._loadMailSummariesAndPublish();
                }
            }
        }
        this.connectionPromise = await imaps.connect(configWithListener);
        this.connection = await this.connectionPromise;
        await this.connection.openBox('INBOX')

        // If the above trigger on new mails does not work reliable, we have to regularly check
        // for new mails on the server. This is done only after all the mails have been loaded for the
        // first time. (Note: set the refresh higher than the time it takes to download the mails).
        if (this.config.imap.refreshIntervalSeconds) {
            this.once('all mails loaded', () => {
                setInterval(() => this._loadMailSummariesAndPublish(), this.config.imap.refreshIntervalSeconds * 1000)
            })
        }

        // ASYNC, return call after connect
        this._loadMailSummariesAndPublish();

        return this.connection


    }

    async _loadMailSummariesAndPublish() {
        const uids = await this._getAllUids()
        const newUids = uids.filter(uid => !this.loadedUids.has(uid))
        console.log('uids:', newUids)

        // optimize by fetching several messages (but not all) with one 'search' call.
        const uidChunks = _.chunk(newUids, 10)
        const fetchFunctions = uidChunks.map(uidChunk =>
            // do not start the search now, just create the function.
            () => this._getMailHeadersAndPublish(uidChunk)
        )

        await pSeries(fetchFunctions)
        this.initialLoadDone = true
        this.emit('all mails loaded')
    }

    addNewMailListener(cb) {
        this.on('mail', cb)
    }

    _createMailSummary(message) {
        const headerPart = message.parts[0].body
        const to = headerPart.to.flatMap(to => addressparser(to))
            .map(addressObj => addressObj.address) // The address also contains the name, just keep the email
        const from = headerPart.from.flatMap(from => addressparser(from))
        const subject = headerPart.subject[0]
        const date = headerPart.date[0]
        const uid = message.attributes.uid

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
        // wait until the connection is established
        if(!this.connection){
            throw {message: 'imap connection not ready', status: 503}
        }

        console.log(`fetching full message ${uid}`)
        const searchCriteria = [
            ['UID', uid],
            ['TO', to]
        ]
        const fetchOptions = {
            bodies: ['HEADER',
                ''], // '' means full body
            markSeen: false
        }

        const messages = await this.connection.search(searchCriteria, fetchOptions)
        if (messages.length == 0) {
            throw new Error('email not found')
        }

        const all = _.find(messages[0].parts, {which: ''})

        const mail = await simpleParser(all.body)
        mail.uid = uid
        return mail
    }

    async _getAllUids() {
        const imapUnderlying = this.connection.imap;
        return await new Promise(function (resolve, reject) {
            imapUnderlying.search(['ALL'], function (err, uids) {
                if (err) {
                    reject(err);
                    return;
                }
                // get newest messages first, order DESC
                resolve(uids.sort().reverse());
            });
        })
    }


    async _getMailHeadersAndPublish(uids) {
        try {
            const messages = await this._getMailHeaders(uids);
            console.log('fetched uids: ', uids)
            messages.forEach(mail => {
                this.loadedUids.add(mail.attributes.uid)
                return this.emit('mail', this._createMailSummary(mail));
            })
        } catch (e) {
            console.error('can not fetch', e)
            throw e
        }
    }


    async _getMailHeaders(uids) {
        console.log("fetching uid", uids)
        const fetchOptions = {bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)'], struct: false};
        const searchCriteria = [['UID', ...uids]]
        return await this.connection.search(searchCriteria, fetchOptions);
    }

}

module.exports = ImapFetcher
