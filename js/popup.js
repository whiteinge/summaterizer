/* global chrome */
import _ from 'lodash';
import Rx from 'rx';
import 'rx-dom-ajax';
import h from 'hyperscript';
import moment from 'moment';

require('skeleton-css/css/normalize.css');
require('skeleton-css/css/skeleton.css');

var tabQuery = Rx.Observable.fromCallback(chrome.tabs.query);
var sendMessage = Rx.Observable.fromCallback(chrome.tabs.sendMessage);

var onLoad$ = Rx.Observable.fromEvent(window, 'DOMContentLoaded')
    .take(1)
    .flatMap(() => tabQuery({active: true, currentWindow: true}))
    .flatMap(([tab]) => sendMessage(tab.id, {
        from: 'popup', subject: 'GetMilestone'}))
    .map(renderIssues);

onLoad$
    .subscribe(function(content) {
        var el = document.querySelector('#content');
        el.parentNode.replaceChild(content, el);
    });

// ----------------------------------------------------------------------------

function renderIssues({milestone, issues, points}) {
    return h('div#content', [
        h('h1', 'Summ\xE4terizer'),
        summarizeMilestone(milestone),
        h('table', [
            h('thead', h('tr', [
                'milestone',
                'number',
                'points',
                'assignee',
                'state',
                'title',
            ].map(x => h('td', x))
            )),
            h('tbody', _.map(issues, function(issue) {
                return h('tr', [
                    h('td', h('a', {
                        href: _.get(issue, 'milestone.html_url', ''),
                        target: '_blank',
                    }, _.get(issue, 'milestone.title', ''))),
                    h('td', h('a', {
                        href: issue.html_url,
                        target: '_blank',
                    }, `#${issue.number}`)),
                    h('td', issue.points),
                    h('td', _.get(issue, 'assignee.login', 'Not assigned')),
                    h('td', issue.state),
                    h('td', issue.title),
                ]);
            })),
            h('tfoot', h('tr', [
                h('td', ''),
                h('td', ''),
                h('td', points),
                h('td', ''),
                h('td', ''),
                h('td', ''),
            ])),
        ]),
    ]);
}

function summarizeMilestone(ms) {
    if (!ms) {
        return h('p', 'Issues are from many milestones.');
    }

    return h('p', [
        h('a', {
            href: ms.html_url,
            target: '_blank',
        }, ms.title),
        ` Due ${moment(ms.due_on).fromNow()}.`,
        ` Open ${ms.open_issues} / Closed ${ms.closed_issues}.`,
    ]);
}
