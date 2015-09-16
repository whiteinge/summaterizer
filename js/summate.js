/* global chrome */
import _ from 'lodash';
import Rx from 'rx';
import 'rx-dom-ajax';

import {fromCallbackAll, get, splitGambits, parseGambits} from './utils';

// Listen for messages from the popup.
var messages$ = fromCallbackAll.call(chrome.runtime.onMessage,
    chrome.runtime.onMessage.addListener,
    ['msg', 'sender', 'cbResponse']);

// Watch for changes in the URL.
var pageChanged$ = Rx.Observable.interval(1000)
    .map(() => window.location.href)
    .startWith(window.location.href)
    .distinctUntilChanged();

// When the URL changes, look to see if the filter criteria changed.
var filterChanged$ = pageChanged$
    .map(function() {
        var elMeta = document.querySelector('meta[property="og:title"]');
        var elFilter = document.querySelector('#js-issues-search');

        var repo = elMeta ? elMeta.getAttribute('content') : null;
        var filter = elFilter ? elFilter.value : null;

        if (repo && filter) {
            return {repo, filter};
        }
    })
    .distinctUntilChanged();

// When the filter changes query the API for details.
var Issues$ = filterChanged$
    .filter(x => x)
    .flatMap(function({repo, filter}) {
        var gambits = parseGambits(splitGambits(filter))
            .concat([['repo', repo]]);

        var hasMilestone = _.zipObject(gambits).milestone;

        // GitHub seems _not_ to want the query string to be URLencoded but
        // spaces must be replaced with pluses.
        var q = _.map(gambits, (qpairs) => qpairs.join(':'))
            .join('+')
            .replace(/ /g, '+');

        var path = '/search/issues',
            uri = `${path}?q=${q}`;

        return Rx.Observable.just(hasMilestone)
            .combineLatest(get(uri).pluck('items'), (milestone, issues) =>
                ({milestone, issues}));
    })
    .map(summatePoints)
    .do(function({milestone, points}) {
        // Update the badge with the current count.
        var pointsText = `${milestone ? '' : '~'}${points}`;

        chrome.runtime.sendMessage({
            from: 'content',
            subject: 'updateBadge',
            points: pointsText,
        });
    })
    .shareReplay(1);

// Listen for requests from the popup and deliver the current cache.
var popupRequest$ = messages$
    .filter(({msg}) => msg.from === 'popup')
    .filter(({msg}) => msg.subject === 'GetMilestone')
    .combineLatest(Issues$, function({msg, sender, cbResponse}, issues) {
        cbResponse(issues);
    });

// Modify the GitHub markup to add estimate badges inline.
var inlineTotal$ = Issues$
    .do(function({milestone, points}) {
        var el = document.querySelector('.table-list-header-toggle');
        var content = `${el.innerHTML}
            <span class="label"
                    style="background-color: #d4c5f9;
                        color: #2b2833;
                        margin-left: 2em;">
                Total Story Points: ${milestone ? '' : '~'}${points}</span>`;
        el.innerHTML = content;
    });

Issues$.subscribe();
popupRequest$.subscribe();
inlineTotal$.subscribe();

// ----------------------------------------------------------------------------

function summatePoints({milestone, issues}) {
    var pointIssues = _.map(issues, function(issue) {
        issue.points = _.chain(issue)
            .get('labels')
            .pluck('name')
            .filter(x => x.indexOf('SP-') !== -1)
            .reduce(function(acc, val) {
                var num = _.parseInt(_.trimLeft(val, 'SP-'));
                return _.isNumber(num) ? acc + num : acc;
            }, 0)
            .value();

        return issue;
    });

    var totalPoints = _.sum(_.pluck(issues, 'points'));

    // If a milestone was in the search all issues are from the same milestone
    // so grab the milestone info out of one.
    var msInfo = milestone ? _.chain(issues).first()
        .get('milestone').value() : null;

    return {
        milestone: msInfo,
        issues: pointIssues,
        points: totalPoints,
    };
}
