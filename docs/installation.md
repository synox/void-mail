# Heroku

## 1-click install
[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/synox/void-mail)

## Manual installation

Install [Heroku CLI](https://devcenter.heroku.com/articles/getting-started-with-nodejs?singlepage=true#set-up)

```
git clone https://github.com/synox/void-mail.git && cd void-mail
heroku login
heroku create
git push heroku master
# adjust to your needs:
heroku config:set DOMAIN=example.com
heroku config:set IMAP_SERVER=imap.example.com IMAP_USER=james IMAP_PASSWORD=Mypassword
heroku config:set IMAP_REFRESH_INTERVAL_SECONDS=null
heroku open
```

# Local testing
Requires [Node.js 10](https://nodejs.org).


    git clone https://github.com/synox/void-mail.git
    cd void-mail
    npm install
    export DOMAIN=example.com 
    export IMAP_SERVER=imap.examplecom 
    export IMAP_USER=username 
    export IMAP_PASSWORD=mypass 
    npm run start
    open http://localhost:3000
    

