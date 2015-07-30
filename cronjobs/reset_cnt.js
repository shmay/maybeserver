'use strict';
/*jshint camelcase: false */

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
    var val;
    ref.child('users').orderByChild('bad_pin_cnt').once('value', function(snap) {
      snap.forEach(function(s) {
        val = s.val();

        if (val.bad_pin_cnt) {
          ref.child('users/' + s.key() + '/bad_pin_cnt').set(0);
        } else {
          exit();
          return true;
        }
      });

      exit();
    });
  } else {
    process.exit();
  }
});
