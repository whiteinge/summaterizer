/* global chrome */
import {fromCallbackAll} from './utils';

// Listen for messages from the popup.
var messages$ = fromCallbackAll.call(chrome.runtime.onMessage,
     chrome.runtime.onMessage.addListener,
          ['msg', 'sender', 'cbResponse']);

messages$
    .filter(({msg}) => msg.from === 'content')
    .filter(({msg}) => msg.subject === 'updateBadge')
    .subscribe(function({msg, sender}) {
        chrome.pageAction.show(sender.tab.id);
        setPageActionIcon(msg.points, sender.tab);
    });

function setPageActionIcon(text, tab) {
    var canvas = document.createElement('canvas');
    var img = document.createElement('img');
    img.onload = function() {
      /* Draw the background image */
        var context = canvas.getContext('2d');
        context.drawImage(img, 0, 2);

        /* Draw the 'badge' */
        var grd = context.createLinearGradient(0, 10, 0, 19);
        grd.addColorStop(0, 'rgb(255, 100, 100)');
        grd.addColorStop(1, 'rgb(150,  50,  50)');

        context.fillStyle = grd;
        context.fillRect(0, 9, 19, 10);

        context.strokeStyle = 'rgb(255, 255, 255)';
        context.strokeRect(0, 10, 1, 1);
        context.strokeRect(0, 19, 1, 1);
        context.strokeRect(19, 10, 1, 1);
        context.strokeRect(19, 19, 1, 1);

        /* Draw some text */
        context.fillStyle = 'white';
        context.font = 'bold 10px Sans-Serif';
        context.fillText(text, 2, 17, 17);

        chrome.pageAction.setIcon({
            imageData: context.getImageData(0, 0, 19, 19),
            tabId: tab.id,
        });
    };
    img.src = 'icons/icon16.png';
}
