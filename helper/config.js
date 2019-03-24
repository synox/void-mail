const config = {
	email: {
		domain: process.env.DOMAIN
	},
	imap: {
		user: process.env.IMAP_USER,
		password: process.env.IMAP_PASSWORD,
		host: process.env.IMAP_SERVER,
		port: 993,
		tls: true,
		authTimeout: 3000,
		refreshIntervalSeconds: process.env.IMAP_REFRESH_INTERVAL_SECONDS
	},
	http: {port: normalizePort(process.env.PORT || '3000')}
}

if (!config.imap.user || !config.imap.password || !config.imap.host) {
	throw new Error('IMAP is not configured. Use IMAP_* ENV vars.')
}

if (!config.email.domain) {
	throw new Error('DOMAIN is not configured. Use ENV vars.')
}

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
	const port = parseInt(val, 10)

	if (isNaN(port)) {
		// Named pipe
		return val
	}

	if (port >= 0) {
		// Port number
		return port
	}

	return false
}

module.exports = config
