const sanitizeHtml = require('sanitize-html')

/**
 * Transformes <a> tags to always use "noreferrer noopener" and open in a new window.
 *
 * @returns transformation filter
 */
exports.sanitizeHtmlTwigFilter = function (value) {
	return sanitizeHtml(value, {
		allowedAttributes: {
			a: ['href', 'target', 'rel']
		},

		transformTags: {
			a(tagName, attribs) {
				return {
					tagName,
					attribs: {
						rel: 'noreferrer noopener',
						href: attribs.href,
						target: '_blank'
					}
				}
			}
		}
	}
	)
}
