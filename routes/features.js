'use strict';

import _ from 'lodash';
import express from 'express';
import querystring from 'querystring';
import * as userService from '../lib/userService';
import { FEATURES } from '../lib/features';
import { Github } from '../lib/github';

const router = express.Router();

router.get(`/:feature(${_.keys(FEATURES).join('|')})`, userService.ensureAuthenticated, (req, res) => {

    res.render('feature', { user: req.user, feature: FEATURES[req.params.feature] });
});

router.post('/setup', userService.ensureAuthenticated, (req, res, next) => {

    const [owner, repo] = req.body.repo.split('/');
    const feature = FEATURES[req.body.name];
    const options = _.assign({ token: req.user.token }, req.body.options || {});

    const github = new Github(req.user.accessToken);
    github.createHook(owner, repo, feature.github_events, `http://sheriff.tiste.io/${req.user.provider}/${feature.name}?${querystring.stringify(options)}`).then(() => {
        res.redirect('/');
    }).catch(next);
});

export { router };
