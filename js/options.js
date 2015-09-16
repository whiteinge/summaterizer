/* global chrome */
import _ from 'lodash';
import Rx from 'rx';
import h from 'hyperscript';

import {defOptions} from './utils';

require('skeleton-css/css/normalize.css');
require('skeleton-css/css/skeleton.css');

var Dispatcher = new Rx.Subject();

var storageSet = Rx.Observable.fromCallback(chrome.storage.sync.set,
    chrome.storage.sync);
var storageGet = Rx.Observable.fromCallback(chrome.storage.sync.get,
    chrome.storage.sync);

// --- Actions

var onLoad$ = Rx.Observable.fromEvent(window, 'DOMContentLoaded')
    .take(1)
    .flatMap(() => storageGet(defOptions))
    .map((options) => ({type: 'OPTIONS', options}));

var onSave$ = Rx.Observable.fromEvent(window, 'click')
    .filter(x => x.target.id === 'save')
    .map(function() {
        var inputs = document.querySelectorAll('input');
        return _.reduce(inputs, function(acc, input) {
            if (input.id) {
                acc[input.id] = input.value;
            }
            return acc;
        }, {});
    })
    .flatMap(options => storageSet(options))
    .map(() => ({type: 'SAVED'}));

Rx.Observable.merge([
    onLoad$,
    onSave$,
]).subscribe(x => Dispatcher.onNext(x));

// --- Stores

var options$ = Dispatcher
    .filter(x => x.type === 'OPTIONS')
    .pluck('options')
    .shareReplay(1);

var saved$ = Dispatcher
    .filter(x => x.type === 'SAVED')
    .combineLatest(options$, (x, y) => y);

// --- Views

var view1$ = options$
    .map(optionsForm);

var view2$ = saved$
    .map(x => optionsForm(x, 'Saved.'));

var view$ = view1$.merge(view2$);

// --- Side-effects

view$
    .subscribe(function(content) {
        var el = document.querySelector('#content');
        el.parentNode.replaceChild(content, el);
    });

// ----------------------------------------------------------------------------

function optionsForm(options, status = '') {
    return h('div', [
        h('h1', 'Summaterizer Options'),

        status ? h('p.notice', status) : '',

        h('label', [
            'GitHub Auth Token: ',
            h('input#ghToken', {
                type: 'text',
                value: options.ghToken,
            }),
        ]),

        h('label', [
            'GitHub API URL: ',
            h('input#ghURL', {
                type: 'text',
                value: options.ghURL,
            }),
        ]),

        h('button#save', {type: 'submit'}, 'Save'),
    ]);
}
