'use strict';

import express from 'express';
import passport from 'passport';

const router = express.Router();

router.get('/login', passport.authenticate('bitbucket'));

router.get('/callback', passport.authenticate('bitbucket', { failureRedirect: '/' }), (req, res) => {

    res.redirect('/?token=' + req.user.token);
});

export { router };
