<div align="center">
	<br>
	<div>
		<img src="docs/void-text.gif" width="200"/>
	</div>
	<p align="center">	disposable mailbox	</p>
</div>


> a simple and fast disposable mail service that works directly with your imap server. No database required. 


## Install
Heroku: https://devcenter.heroku.com/articles/getting-started-with-nodejs?singlepage=true#set-up


```
heroku login
heroku create
git push heroku master
TODO
```

*Requires [Node.js 8](https://nodejs.org).*


## Usage

TODO


## TODO

-   reduce code base, if possible
-   handle imap error (event emitter), handle reconnect
-   error handling everywhere
-   compare with https://github.com/o4oren/Ad-Hoc-Email-Server
-   provide config for fixed data for offline testing
-   use loggers
-   config to enable periodic refresh
-   run ci integration
- heroku deployment
- docker deployment

- Reactive imap stream as lib
- Imap ids only, more efficient

## License

GPL © [Aravindo Wingeier](https://github.com/synox)
