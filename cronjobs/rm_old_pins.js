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
    ref.child('invites').orderByPriority().once('value', function(snap) {
      var d = new Date();
      var oneDayAgo = d.setDate(d.getDate()-1);
      var val;

      snap.forEach(function(s) {
        val = s.val();

        if (val.ts < oneDayAgo) {
          ref.child('invites/' + s.key()).remove();
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
