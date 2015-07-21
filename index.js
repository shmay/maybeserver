'use strict';

var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var Firebase = require('firebase');
//var crypto = require('crypto');
var ref;
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
/////app.use(multer()); // for parsing multipart/form-data

// respond with "hello world" when a GET request is made to the homepage
app.get('/heyo', function(req, res) {
  res.send('Hello World!');
  console.log('heyo');
});

app.post('/new_spot', function (req, res) {
  if (req.body.token) {
    ref = new Firebase('https://androidkye.firebaseio.com/');

    ref.authWithCustomToken(req.body.token, function(err) { 
      if (err) {
        res.send({success:0});
      } else {
        var b = req.body;

        var obj = {
          name: b.name,
          lat: b.lat,
          lng: b.lng,
          radius: b.radius
        };

        var user = {
          name: b.username,
          isthere: 2,
          admin: true,
        };

        ref.authWithCustomToken(process.env.MBSECRET, function(error) {
          if (error) {
            res.send({success:0});
          } else {
            var spotRef = ref.child('spots').push(obj);

            spotRef.child('users/' + b.uid).set(user);
            ref.child('users/' + b.uid + '/spots/' + spotRef.key()).set(true);

            res.send({success:1});
          }
        });
      }
    });
  } else {
    res.send({success:0});
  }
});

var chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

function randomString(length) {
  var result = '';
  for (var i = length; i > 0; --i) {
    result += chars[Math.round(Math.random() * (chars.length - 1))];
  }
  return result;
}

var generateToken = function(ref,spotid,cb) {
  var viteRef = ref.child('invites');

  var token = randomString(10);

  viteRef.child(token).once('value', function(snapshot) {
    var exists = (snapshot.val() !== null);
    if (exists) {
      generateToken(ref,spotid,cb);
    } else {
      viteRef.child(token).set({
        spotid:spotid,
        ts: Date.now()
      });
      cb(token);
    }
  });
};

app.post('/gen_invite', function (req, res) {
  if (req.body.token && req.body.spotid) {
    ref = new Firebase('https://androidkye.firebaseio.com/');

    ref.authWithCustomToken(req.body.token, function(err,authData) { 
      console.log('authData:');
      console.log(authData);
      if (err) {
        res.send({success:0});
      } else {
        ref.authWithCustomToken(process.env.MBSECRET, function(error) {
          if (error) {
            res.send({success:0});
          } else {
            ref.child('users/' + authData.uid + '/spots/' + req.body.spotid).once('value', function(snap) {
              if (snap.val() === true) {
                generateToken(ref, req.body.spotid, function(token) {
                  res.send({success:1, token: token});
                });
              } else {
                res.send({success:-1});
              }
            });
          }
        });
      }
    });
  } else {
    res.send({success:0});
  }
});

app.post('/edit_spot', function (req, res) {
  if (req.body.token && req.body.spotid) {
    console.log('edit_spot');
    console.log(req.body.name);
    ref = new Firebase('https://androidkye.firebaseio.com/');

    ref.authWithCustomToken(req.body.token, function(err,authData) { 
      if (err) {
        res.send({success:0});
      } else {
        ref.child('users/' + authData.uid + '/spots/' + req.body.spotid).once('value', function(snap) {
          if (snap.val() === true) {
            ref.authWithCustomToken(process.env.MBSECRET, function(error) {
              if (error) {
                res.send({success:0});
              } else {
                ref.child('spots/' + req.body.spotid + '/name').set(req.body.name);
                res.send({success:1});
              }
            });
          } else {
            res.send({success:-1});
          }
        });
      }
    });
  }
});

app.post('/join', function (req, res) {
  if (req.body.token && req.body.pin) {
    console.log('PIN');
    console.log(req.body.pin);
    ref = new Firebase('https://androidkye.firebaseio.com/');

    ref.authWithCustomToken(req.body.token, function(err,authData) { 
      if (err) {
        res.send({success:0});
      } else {

        ref.child('invites/' + req.body.pin).once('value', function(snapshot) {
          var val = snapshot.val();
          if (val === null) {
            res.send({success:-1});
          } else { 
            var uRef = ref.child('users/' + authData.uid);

            if (val.users[authData.uid]) {
              ref.authWithCustomToken(process.env.MBSECRET, function(error) {
                if (error) {
                } else {
                  uRef.once('value', function(snap) {
                    var name = snap.val().name;
                    var spotRef = ref.child('spots/' + val.spotid);

                    spotRef.child('users/' + authData.uid).set({
                      name: name,
                      isthere: 2,
                      admin: false
                    });

                    uRef.child('spots/' + val.spotid).set(false);

                    res.send({ success: 1 });
                  });
                }
              });
            } else {
              res.send({success: -2});
            }
          }
       });
      }
    });
  }
});

app.post('/join_w_pin', function (req, res) {
  if (req.body.token && req.body.pin) {
    ref = new Firebase('https://androidkye.firebaseio.com/');

    ref.authWithCustomToken(req.body.token, function(err,authData) { 
      if (err) {
        res.send({success:0});
      } else {
        var vitRef = ref.child('invites/' + req.body.pin);
        vitRef.once('value', function(snapshot) {
          if (snapshot.val() === null) {
            res.send({success:-1});
          } else {
            ref.authWithCustomToken(process.env.MBSECRET, function(error) {
              if (error) {
                res.send({success:0});
              } else {
                var spotid = snapshot.val().spotid;
                vitRef.child('users/' + authData.uid).set(true);

                var spotRef = ref.child('spots/' + spotid);
                spotRef.once('value', function(snap) {
                  var val = snap.val();

                  res.send({
                    success:1,
                    pin: req.body.pin,
                    lat: parseFloat(val.lat),
                    lng: parseFloat(val.lng),
                    name: val.name,
                    radius: parseFloat(val.radius)
                  });
                });
              }
            });
          }
        });
      }
    });
  } else {
    console.log('whoots');
    res.send({success:0});
  }
});

var server = app.listen(3000, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);
});
