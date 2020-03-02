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
    

# Self-Hosted: Process monitoring and startup
Usually, you want this program to run as a service, wich can restart itself in case of crashing, and on every reboot.
This is possible vía [pm2, the nodejs process manager](http://pm2.keymetrics.io/).

1. Run the program using some pm2 flags. You can name processes, I used `--name email`. The `--watch` option restarts the app when dies for any reason.
```
cd void-mail
pm2 --name email start npm -- start --watch
```

2. Save your current list of running processes, so them resurrect when you reboot.
`pm2 save`

3. Make your system to run it on boot/reboot. You can run it with sudo directly.
`pm2 startup`

4. Once you did this, you can try to reboot things.
- Reboot your system and check if void-mail gets started. (`reboot`)
- Kill node app instance and see if gets respawned (ie `kill -9 ``pgrep node`` `)

# Self-Hosted: docker / docker-compose

1. clone this repository

```
git clone https://github.com/synox/void-mail.git
```

2. change docker-compose.yml accordingly to your needs

```
vi docker-compose.yml
```

3. run it
   
```
docker-compose up -d
```
