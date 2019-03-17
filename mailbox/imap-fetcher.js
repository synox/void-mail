const imaps = require('imap-simple')
const {simpleParser} = require('mailparser')
const addressparser = require('nodemailer/lib/addressparser')
const EventEmitter = require('events')

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
    this.connectionPromise = null
  }

  async connect() {
    const configWithListener = {
      ...this.config,
      // 'onmail' adds a callback when new mails arrive. With this we can keep the imap refresh interval very low (or even disable it).
      onmail: numNewMail => {
        this.emit('newmail')
      }

    }
    return this.connectionPromise = imaps.connect(configWithListener)
  }

  async fetchAllMailSummaries() {
    const searchCriteria = ['ALL']
    const fetchOptions = {
      bodies: ['HEADER'],
      markSeen: false
    }
    const connection = await this.connectionPromise
    await connection.openBox('INBOX')
    const messages = await connection.search(searchCriteria, fetchOptions)
    return messages.map(message => this.createMailSummary(message))
  }

  createMailSummary(message) {
    const headerPart = _.find(message.parts, {which: 'HEADER'})
    const to = headerPart.body.to.flatMap(to => addressparser(to))
    const from = headerPart.body.from.flatMap(from => addressparser(from))
    const subject = headerPart.body.subject[0]
    const date = headerPart.body.date[0]
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

  async fetchFullMail(to, uid) {
    console.log(`fetching message ${uid}`)
    const searchCriteria = [
      ['UID', uid],
      ['TO', to]
    ]
    const fetchOptions = {
      bodies: ['HEADER', ''], // '' means full body
      markSeen: false
    }

    const connection = await this.connectionPromise
    await connection.openBox('INBOX')
    const messages = await connection.search(searchCriteria, fetchOptions)
    if (messages.length == 0) {
      throw new Error('email not found')
    }

    const all = _.find(messages[0].parts, {which: ''})

    const mail = await simpleParser(all.body)
    mail.uid = uid
    return mail
  }
}

module.exports = ImapFetcher
