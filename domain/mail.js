class Mail {
	constructor(to, from, date, subject, uid) {
		this.to = to
		this.from = from
		this.date = date
		this.subject = subject
		this.uid = uid
	}

	static create(to, from, date, subject, uid) {
		return new Mail(to, from, date, subject, uid)
	}
}

module.exports = Mail
