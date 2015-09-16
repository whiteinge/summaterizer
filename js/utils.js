/* global chrome */
import _ from 'lodash';
import Rx from 'rx';

export var defOptions = {
    ghToken: '',
    ghURL: 'https://api.github.com',
};

var storageGet = Rx.Observable.fromCallback(
    chrome.storage.sync.get,
    chrome.storage.sync);

/**
Split GitHub search gambits into an array

is:open milestone:adsf
is:open milestone:"Maul 3"
is:open milestone:"The \"Testing\" Release"

Explained:

(?:         # non-capturing group
  [^\s"]+   # anything that's not a space or a double-quote
  |         #   or…
  "         # opening double-quote
    [^"]*   # …followed by zero or more chacacters that are not a double-quote
  "         # …closing double-quote
)+          # each mach is one or more of the things described in the group

http://stackoverflow.com/a/16261693/127816
**/
export function splitGambits(str) {
    return str.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
}

/**
Parse an array of `foo:Foo` strings into an object of {foo: 'Foo'}
**/
export function parseGambits(arr) {
    var ret = _.reduce(arr, function(acc, str) {
        var [qualifier, value] = str.split(/:(.+)/);

        if (qualifier && value) {
            return acc.concat([[qualifier, value]]);
        } else {
            return acc;
        }
    }, []);
    return ret;
}

/**
Alternative to Observable.fromCallback that does not complete itself

In the example below `fnThatTakesCallback` is a function that takes a callback
as the final parameter. The function will be invoked with `arg1` and `arg2` and
when the callback is called the values will show up in the observable stream.
If `fnThatTakesCallback` requires a particular context use the call method
e.g., `fromCallbackAll.call(context, fnThatTakesCallback, [...], ...)`.

The `cbArgNames` argument is a list of named arguments that the callback is
called with. These will be paired with the actual arguments so the observable
stream will receive values in the form of: `{cbarg1: cbval1, cbarg2: cbval2}`.

@example
    var stream$ = fromCallbackAll(
        fnThatTakesCallback,
        ['cbArg1', 'cbArg2'],
        arg1, arg2);
**/
export function fromCallbackAll(fn, cbArgNames, ...args) {
    var obsv$ = new Rx.Subject();
    fn.call(this, ...args, function(...cbargs) {
        return obsv$.onNext(_.zipObject(cbArgNames, cbargs));
    });
    return obsv$;
}

export function xhr(method, path) {
    return storageGet(defOptions)
        .flatMap(function({ghToken, ghURL}) {
            var hdrs = {
                'Accept': 'application/json',
                'Authorization': `token ${ghToken}`,
            };

            return Rx.DOM.ajax({
                url: `${ghURL}${path}`,
                method: 'GET',
                headers: hdrs,
                responseType: 'json',
            });
        });
}

export function get(path) {
    return xhr('GET', path)
        .filter(x => x.status === 200)
        .pluck('response');
}
