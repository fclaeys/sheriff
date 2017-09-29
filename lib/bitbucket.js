'use strict';

import _ from 'lodash';
import GithubApi from 'github';
import * as sheriff from './sheriff';

const github = new GithubApi();

export class Github {

    constructor(accessToken) {

        github.authenticate({
            type: 'oauth',
            token: accessToken,
        });
    }

    async processLabel(owner, repo, number, sha, label) {

        const { data: issue } = await github.issues.get({ owner, repo, number });

        const { isSuccess, description } = sheriff.label(_.map(issue.labels, 'name'), label);
        const state = isSuccess ? 'success' : 'failure';

        return github.repos.createStatus({ owner, repo, sha, state, context: 'sheriff/label', description });
    }
}
