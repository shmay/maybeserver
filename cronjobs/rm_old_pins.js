'use strict';

var Firebase = require('firebase');
var url = 'https://androidkye.firebaseio.com/';
var ref = new Firebase(url);

ref.authWithCustomToken(process.env.MBSECRET, function(error) {
  if (!error) {
    ref.child('invites').orderByChild('timestamp').once('value', function(snap) {
      var d = new Date();
      var oneDayAgo = d.setDate(d.getDate()-1);
      snap.forEach(function(s) {
        var ts = s.val().timestamp;

        if (ts < oneDayAgo) {
          ref.child('invites/' + s.key()).remove();
        }

      });
    });
  }
});
