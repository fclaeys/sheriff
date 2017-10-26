'use strict';

import 'newrelic';

import express from 'express';
import conf from './config/config';
import path from 'path';
import logger from 'morgan';
import bodyParser from 'body-parser';
import session from 'express-session';
import passport from 'passport';
import { Strategy as LocalAPIKeyStrategy } from 'passport-localapikey';
import { Strategy as GithubStrategy } from 'passport-github';
import { Strategy as GitlabStrategy } from 'passport-gitlab2';
import { Strategy as BitbucketStrategy } from 'passport-bitbucket-oauth2';
import { query } from './lib/pg';
import * as userService from './lib/userService';
import { FEATURES } from './lib/features';

import { router as featuresRouter } from './routes/features';
import { router as githubRouter } from './routes/github';
import { router as gitlabRouter } from './routes/gitlab';
import { router as bitbucketRouter } from './routes/bitbucket';

const app = express();
const server = require('http').Server(app);


// configure modules

console.log(`Current env: ${conf.get('NODE_ENV')}`); // eslint-disable-line no-console

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((user, done) => {
    done(null, user);
});

passport.use(new LocalAPIKeyStrategy({ apiKeyField: 'token' }, (token, done) => {

    userService.login(token).then((user) => {

        return done(null, user);
    }).catch((e) => done(e, false));
}));

passport.use(new GithubStrategy({
    clientID: conf.get('GITHUB_APP_CLIENT_ID'),
    clientSecret: conf.get('GITHUB_APP_SECRET_ID'),
    scope: ['repo', 'write:repo_hook'],
}, (accessToken, refreshToken, profile, done) => {

    query('SELECT * FROM users WHERE user_id = $1 AND provider = $2', [profile.id, 'github']).then(({ rows }) => {
        if (!rows[0]) {
            return userService.save(profile.id, 'github', accessToken).then((user) => {

                return done(null, user);
            }).catch((e) => done(e, false));
        }

        userService.update(profile.id, 'github', accessToken, rows[0].token).then((user) => {

            return done(null, user);
        }).catch((e) => done(e, false));
    }).catch((e) => done(e, false));
}));

passport.use(new GitlabStrategy({
    clientID: conf.get('GITLAB_APP_CLIENT_ID'),
    clientSecret: conf.get('GITLAB_APP_SECRET_ID'),
    callbackURL: `${conf.get('APP_URL')}/gitlab/callback`,
    scope: ['api'],
}, (accessToken, refreshToken, profile, done) => {

    query('SELECT * FROM users WHERE user_id = $1 AND provider = $2', [profile.id, 'gitlab']).then(({ rows }) => {
        if (!rows[0]) {
            return userService.save(profile.id, 'gitlab', accessToken).then((user) => {

                return done(null, user);
            }).catch((e) => done(e, false));
        }

        userService.update(profile.id, 'gitlab', accessToken, rows[0].token).then((user) => {

            return done(null, user);
        }).catch((e) => done(e, false));
    }).catch((e) => done(e, false));
}));

passport.use(new BitbucketStrategy({
    clientID: conf.get('BITBUCKET_APP_CLIENT_ID'),
    clientSecret: conf.get('BITBUCKET_APP_SECRET_ID'),
    callbackURL: `${conf.get('APP_URL')}/bitbucket/callback`,
    scope: ['account', 'pullrequest', 'repository:write', 'webhook'],
}, (accessToken, refreshToken, profile, done) => {

    query('SELECT * FROM users WHERE user_id = $1 AND provider = $2', [profile.id, 'bitbucket']).then(({ rows }) => {
        if (!rows[0]) {
            return userService.save(profile.id, 'bitbucket', accessToken).then((user) => {

                return done(null, user);
            }).catch((e) => done(e, false));
        }

        userService.update(profile.id, 'bitbucket', accessToken, rows[0].token).then((user) => {

            return done(null, user);
        }).catch((e) => done(e, false));
    }).catch((e) => done(e, false));
}));


// configure express middleware

app.set('view engine', 'pug');
app.set('trust proxy', true);

app.use(logger('combined'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true,
}));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({ secret: 'keyboard cat' }));
app.use(passport.initialize());
app.use(passport.session());


// routes

// app

app.get('/', (req, res) => {

    res.render('home', { user: req.user, features: FEATURES });
});

app.get('/me', userService.ensureAuthenticated, (req, res) => {

    res.send(req.user);
});

app.use('/', featuresRouter);
app.use('/github', githubRouter);
app.use('/gitlab', gitlabRouter);
app.use('/bitbucket', bitbucketRouter);

// error handler

app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
    console.error(err.stack); // eslint-disable-line no-console

    if (isNaN(err.status)) {
        err.status = 500;
    }

    res.status(err.status || 404);
    res.send({
        message: err.message,
    });
});

// run magic

server.listen(process.env.PORT || 3000);


module.exports = app;
