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
PORT | Integer | On which port to run the http interface. (`default: 3000`)
BASE_URL | String | Sub-path where to mount the app. Usually empty. (e.g. `/trash`)
## TODO

Cleanup:
-   error handling everywhere (how to verify that all promises are catched, and eventEmitter have on-error?)
-   reduce code base, if possible


Features:
- better random names
- delete mails after X days.


Testing:
-   provide config for fixed data for offline testing
-   create tests

Maybe Later:
- docker deployment
- Reactive imap stream as lib
- support multiple domains


http://ignorethecode.net/blog/2010/02/02/removing-features/

## Team

[![Aravindo Wingeier](https://github.com/synox.png?size=130)](https://github.com/synox) 
---
[Aravindo Wingeier](https://github.com/synox) 


## License

GPL © [Aravindo Wingeier](https://github.com/synox)
