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
    
# Uberspace (Until V6)

Docs: https://wiki.uberspace.de/development:nodejs#einrichtung_als_dienst

Setup the service:

    git clone https://github.com/synox/void-mail.git
    cd void-mail
    export PATH=/package/host/localhost/nodejs-10/bin/:$PATH
    npm install
    test -d ~/service || uberspace-setup-svscan
    uberspace-setup-service void-mail node ~/void-mail/bin/www

Find free port between 61000 and 65535 

    netstat -tulpen | grep 64567

Edit the configuration:

    vi ~/service/void-mail/run
        # add the configuration before the last line:
        
        # config
        export DOMAIN=example.com 
        export IMAP_SERVER=imap.examplecom 
        export IMAP_USER=username 
        export IMAP_PASSWORD=mypass 
        export PORT=64567
        
        # and set the node version in the last line:
        exec /package/host/localhost/nodejs-10/bin/node /home/exampleuser/void-mail/bin/www 2>&1


Test the service:

    curl http://localhost:64567/

Setup the apache forward:

    vi ~/html/.htaccess
        # add:
        
        RewriteEngine On        
        RewriteCond %{HTTPS} !=on
        RewriteCond %{ENV:HTTPS} !=on
        RewriteRule .* https://%{SERVER_NAME}%{REQUEST_URI} [R=301,L]
        RewriteRule ^void-mail/(.*) http://localhost:64567/$1 [P]
        
    
    TODO: handle baseurl