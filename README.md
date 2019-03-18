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


## Install
One click installation: 
[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)


Or manually: 
- Install [Heroku CLI](https://devcenter.heroku.com/articles/getting-started-with-nodejs?singlepage=true#set-up)

```
git clone https://github.com/synox/void-mail.git && cd void-mail
npm install
heroku login
heroku create
git push heroku master
heroku config:set DOMAIN=example.com
heroku config:set IMAP_SERVER=imap.example.com IMAP_USER=james IMAP_PASSWORD=Mypassword
heroku config:set IMAP_REFRESH_INTERVAL_SECONDS=null
heroku open
```

*Requires [Node.js 10](https://nodejs.org).*


## Usage

TODO


## TODO
Features:
- Imap ids only, more efficient
- Reactive imap stream as lib
-  better random names
- delete mails after X days.

Cleanup:
-   reduce code base, if possible
-   handle imap error (event emitter), handle reconnect
-   error handling everywhere
-   compare with https://github.com/o4oren/Ad-Hoc-Email-Server
-   use loggers

Testing:
-   provide config for fixed data for offline testing
-   create tests

Later:
- docker deployment




## Team

[![Aravindo Wingeier](https://github.com/synox.png?size=130)](https://github.com/synox) 
---
[Aravindo Wingeier](https://github.com/synox) 


## License

GPL © [Aravindo Wingeier](https://github.com/synox)
