const express = require('express')

const router = new express.Router()
const {sanitizeParam} = require('express-validator/filter')

const sanitizeAddress = sanitizeParam('address').customSanitizer((value, {req}) => {
	return req.params.address
		.replace(/[^A-Za-z0-9_.+@-]/g, '') // Remove special characters
		.toLowerCase()
})

router.get('/all', (req, res, _next) => {
	const emailManager = req.app.get('emailManager')
	res.render('inbox', {
		title: 'All Mailboxes',
		address: 'all mails',
		mailSummaries: emailManager.getAllMailSummaries()
	})
})

router.get('^/:address([^@/]+@[^@/]+)', sanitizeAddress, (req, res, _next) => {
	const emailManager = req.app.get('emailManager')
	res.render('inbox', {
		title: req.params.address,
		address: req.params.address,
		mailSummaries: emailManager.getMailSummaries(req.params.address)
	})
})

router.get('^/:address/:uid([0-9]+$)', sanitizeAddress, (req, res, next) => {
	req.app.get('emailManager')
		.getOneFullMail(req.params.address, req.params.uid)
		.then(mail => {
			if (mail) {
				res.render('mail', {title: req.params.address, address: req.params.address, mail})
			} else {
				next({message: 'email not found', status: 404})
			}
		})
		.catch(error => {
			console.error('error while fetching one email', error)
			next({message: error.message, status: error.status})
		})
})

module.exports = router
