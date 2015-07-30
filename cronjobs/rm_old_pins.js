'use strict';

var Firebase = require('firebase');
var url;
if (process.env.MBPROD === 'true') {
  url = 'https://maybeso.firebaseio.com/';
} else {
  url = 'https://androidkye.firebaseio.com/';
}

var ref = new Firebase(url);

var exit = function() {
  setTimeout(function() {
    process.exit();
  }, 3000);
};

ref.authWithCustomToken(process.env.MBSECRET, function(error) {
  if (!error) {
    ref.child('invites').orderByChild('ts').once('value', function(snap) {
      var d = new Date();
      var oneDayAgo = d.setDate(d.getDate()-1);
      var invites = snap.val();
      var keys = Object.keys(invites).reverse();
      var key;
      for (var j = 0; j < keys.length; j++) {
        key = keys[j];
        var ts = invites[key].ts;
        if (ts < oneDayAgo) {
          ref.child('invites/' + key).remove();
        } else {
          //appease jshint
          exit();
        }
      }
    });
  } else {
    process.exit();
  }
});
