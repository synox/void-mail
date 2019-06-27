const express = require('express')

const router = new express.Router()
const randomWord = require('random-word')
const {check, validationResult} = require('express-validator/check')
const config = require('../../../application/config')

router.get('/', (req, res, _next) => {
	res.render('login', {
		title: 'Login',
		username: randomWord(),
		domain: config.email.domain
	})
})

router.get('/random', (req, res, _next) => {
	res.redirect(`/${randomWord()}@${config.email.domain}`)
})

router.post(
	'/',
	[
		check('username').isLength({min: 1}),
		check('domain').isIn([config.email.domain])
	],
	(req, res) => {
		const errors = validationResult(req)
		if (!errors.isEmpty()) {
			return res.render('login', {
				title: 'Login',
				username: req.body.username,
				domain: config.email.domain,
				userInputError: true
			})
		}

		res.redirect(`/${req.body.username}@${req.body.domain}`)
	}
)

module.exports = router
