<div align="center">
	<br>
	<div>
		<img src="docs/void-text.gif" width="200"/>
	</div>
	<p align="center">	disposable mailbox	</p>
</div>


> a simple and fast disposable mail service that works directly with your imap server. No database required. 

[![Build Status](https://travis-ci.org/synox/void-mail.svg?branch=master)](https://travis-ci.org/synox/void-mail)
[![XO code style](https://img.shields.io/badge/code_style-XO-5ed9c7.svg)](https://github.com/xojs/xo)


# How it works
You need a domain with [catch-all-mailbox](https://www.google.ch/search?q=how+to+setup+catch-all+imap+mailbox) and an imap account. 

Then void-mail will automatically load all mails from the imap server. 

When the user opens the void-mail web application, he/she can read the mails corresponding to a specific address.  

See [FAQ](docs/faq.md)

# Features

* Push-Notification on new emails.
* Mail presentation are sanitized to avoid tracking. 
* In-Memory cache for very fast mail access. 
* No database required! You just need a [catch-all-mailbox](https://www.google.ch/search?q=how+to+setup+catch-all+imap+mailbox) imap server.  

## Install
One click installation: 
[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/synox/void-mail)


See [Installation](docs/installation.md)

## Configuration Parameters

These are all set as environment variables. They are loaded in [config.js](helper/config.js) 

Parameter | Type | Description
----------|------|-------------
DOMAIN | String | The domain part after the @, where your receive emails. (e.g. `example.com`)
IMAP_SERVER | String | The imap server address. (e.g. `imap.example.com`)
IMAP_USER | String | The username used to sign into the imap server. 
IMAP_PASSWORD | String | The password used to sign into the imap server.
IMAP_REFRESH_INTERVAL_SECONDS | Integer | How often to check for new messages on the imap server. (default: `undefined`) Usually the application reacts immediately to new arrived mail.
PORT | Integer | On which port to run the http interface. (default: `3000`)
DELETE_MAILS_OLDER_THAN_DAYS | Integer | How many days to to wait before deleting messages. (default: `30`)


## TODO

This mostly works, but some things need to be done:

Cleanup:
-   error handling everywhere (how to verify that all promises are catched, and eventEmitter have on-error?)

Features:
- better random names

Testing:
-   provide config for fixed data for offline testing
-   create tests

Maybe Later:
- docker deployment
- support multiple domains
- Reactive imap stream as lib
    
    imap stream module
    - fetches uids
    - fetches each message headers
    	- emits a new mail for each message
    - keeps a list of all emited uid, not to send those again
    - fetch uids again by timer and server trigger, fetch new messages
    
    
    mail manager / frontend store/cache
    - read mail stream
    - notify users about new messages
    - store a copy of the headers to serve the frontend
    	- use email-store
    - fetch and cache full mails on request
    
    
    compare
    https://www.npmjs.com/package/imap-stream
    
    https://www.npmjs.com/search?q=imap%20stream

-   reduce code base, if possible
    
    http://ignorethecode.net/blog/2010/02/02/removing-features/

## Team

[![Aravindo Wingeier](https://github.com/synox.png?size=130)](https://github.com/synox) [![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2Fsynox%2Fvoid-mail.svg?type=shield)](https://app.fossa.io/projects/git%2Bgithub.com%2Fsynox%2Fvoid-mail?ref=badge_shield)

---
[Aravindo Wingeier](https://github.com/synox) 


## License

GPL © [Aravindo Wingeier](https://github.com/synox)


[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2Fsynox%2Fvoid-mail.svg?type=large)](https://app.fossa.io/projects/git%2Bgithub.com%2Fsynox%2Fvoid-mail?ref=badge_large)