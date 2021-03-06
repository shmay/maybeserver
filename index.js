'use strict';

var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var Firebase = require('firebase');

//var crypto = require('crypto');
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
/////app.use(multer()); // for parsing multipart/form-data

var url;
var reviewUid;
if (process.env.MBPROD === 'true') {
  url = 'https://maybeso.firebaseio.com/';
  reviewUid = 'simplelogin:1';
} else {
  url = 'https://androidkye.firebaseio.com/';
  reviewUid = 'simplelogin:3';
}

app.get('/', function (req, res) {
  res.writeHead(200);
  console.log('ehhloworld: ' + req.query.sid);
  res.end('hello world\n');
});

app.post('/reset', function (req, res) {
  if (req.body.token) {
    var ref = new Firebase(url);

    ref.authWithCustomToken(req.body.token, function(err,authData) { 
      if (err) {
        res.send({success:0});
      } else {
        ref.authWithCustomToken(process.env.MBSECRET, function(error) {
          if (error) {
            res.send({success: -1});
          } else {
            var userRef = ref.child('users/' + authData.uid);

            userRef.child('spots').once('value', function(snap) {
              var spots = snap.val();
              for (var spotid in spots) {
                ref.child('spots/' + spotid + '/users/' + authData.uid + '/state').set(0);
              }

              res.send({success:1});
            });

          }
        });

      }
    });
  }
});

app.post('/new_spot', function (req, res) {
  if (req.body.token) {
    var ref = new Firebase(url);

    ref.authWithCustomToken(req.body.token, function(err) { 
      if (err) {
        res.send({success:0});
      } else {
        var b = req.body;

        var spot = {
          name: b.name,
          lat: b.lat,
          lng: b.lng,
          radius: b.radius
        };

        var user = {
          name: b.username,
          state: 0,
          admin: true,
        };

        ref.authWithCustomToken(process.env.MBSECRET, function(error) {
          if (error) {
            res.send({success:-1});
          } else {
            var spotRef = ref.child('spots').push(spot);

            spotRef.child('users/' + b.uid).set(user);
            ref.child('users/' + b.uid + '/spots/' + spotRef.key()).set(true);

            spotRef.once('value', function(snap) {
              var val = snap.val();

              res.send({
                success:1,
                id: snap.key(),
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
  } else {
    res.send({success:-10});
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

  var token = 'X' + randomString(9);
  var ts;
  var vite;

  viteRef.child(token).once('value', function(snapshot) {
    var exists = (snapshot.val() !== null);
    if (exists) {
      generateToken(ref,spotid,cb);
    } else {
      ts = Date.now();
      vite = {
        '.priority': ts,
        spotid:spotid,
        ts: ts
      };

      viteRef.child(token).set(vite);
      cb(token);
    }
  });
};

app.post('/spot_status_changed', function (req, res) {
  var status = parseInt(req.body.status);

  if (req.body.token && req.body.spotid && (status === 0 || status === 1 || status === 2)) {
    var ref = new Firebase(url);

    ref.authWithCustomToken(req.body.token, function(err,authData) { 
      if (err) {
        res.send({success:0});
      } else {
        ref.authWithCustomToken(process.env.MBSECRET, function(error) {
          if (error) {
            res.send({success:0});
          } else {
            ref.child('users/' + authData.uid + '/spots/' + req.body.spotid).once('value', function(snap) {
              var val = snap.val();

              if (val === null || val === -1) {
                res.send({success:-1});
              } else if (val === true || val === false) {
                ref.child('spots/' + req.body.spotid + '/users/' + authData.uid + '/state').set(status);
                res.send({
                  success:1,
                  status: status
                });
              }
            });
          }
        });
      }
    });
  }
});

app.post('/gen_invite', function (req, res) {
  if (req.body.token && req.body.spotid) {
    var ref = new Firebase(url);

    ref.authWithCustomToken(req.body.token, function(err,authData) { 
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
    var ref = new Firebase(url);

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

app.post('/remove_fence_for_user', function (req, res) {
  console.log('remove_fence_for_user');
  if (req.body.token && req.body.spotid) {
    var ref = new Firebase(url);

    ref.authWithCustomToken(req.body.token, function(err,authData) { 
      if (err) {
        res.send({success:0});
      } else {
        ref.authWithCustomToken(process.env.MBSECRET, function(error) {
          if (error) {
            res.send({success: 0});
          } else {
            var spotRef = ref.child('users/' + authData.uid + '/spots/' + req.body.spotid);

            spotRef.once('value', function(snap) {
              var val = snap.val();

              if (val === null) {
                res.send({success: -1});
              } else {
                spotRef.remove();
                res.send({success: 1});
              }
            });
          }
        });
      }
    });
  }
});

app.post('/remove_spot', function (req, res) {
  if (req.body.token && req.body.spotid) {
    var ref = new Firebase(url);

    ref.authWithCustomToken(req.body.token, function(err,authData) { 
      if (err) {
        res.send({success:0});
      } else {
        ref.authWithCustomToken(process.env.MBSECRET, function(error) {
          if (error) {
            res.send({success: 0});
          } else {
            var uRef = ref.child('users/' + authData.uid + '/spots/' + req.body.spotid);

            uRef.once('value', function(snap) {
              var val = snap.val();
              if (val === true) {
                ref.child('spots/' + req.body.spotid + '/users').once('value', function(snap) {
                  var users = snap.val();

                  for (var userid in users) {
                    ref.child('users/' + userid + '/spots/' + req.body.spotid).set(-1);
                  }

                  ref.child('spots/' + req.body.spotid).remove();

                  res.send({success:1});
                });

              } else {
                res.send({success: -1});
              }
            });
          }
        });
      }
    });
  }
});

app.post('/remove_user', function (req, res) {
  if (req.body.token && req.body.spotid && req.body.uid) {
    var ref = new Firebase(url);

    ref.authWithCustomToken(req.body.token, function(err,authData) {
      if (err) {
        res.send({success:0});
      } else {
        ref.authWithCustomToken(process.env.MBSECRET, function(error) {
          if (error) {
            res.send({success: 0});
          } else {
            var adminRef = ref.child('users/' + authData.uid + '/spots/' + req.body.spotid);
            var spotRef = ref.child('users/' + req.body.uid + '/spots/' + req.body.spotid);
            adminRef.once('value', function(snapshot) {
              var val = snapshot.val();
              if (val === true) {
                spotRef.once('value', function(snap) {
                  val = snap.val();
                  if (val === null) {
                    res.send({success:-1});
                  } else {
                    spotRef.set(-1);
                    ref.child('spots/' + req.body.spotid + '/users/' + req.body.uid).remove();
                    res.send({success: 1});
                  }
                });
              } else {
                res.send({success:0});
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

app.post('/logout', function(req,res) {
  if (req.body.token) {
    console.log('logout');
    var ref = new Firebase(url);

    ref.authWithCustomToken(req.body.token, function(err,authData) { 
      if (err) {
        res.send({success:0});
      } else {
        ref.authWithCustomToken(process.env.MBSECRET, function(error) {
          if (error) {
            res.send({success: 0});
          } else {
            var userRef = ref.child('users/' + authData.uid);

            userRef.child('spots').once('value', function(snap) {
              var spots = snap.val();
              for (var spotid in spots) {
                ref.child('spots/' + spotid + '/users/' + authData.uid + '/state').set(0);
              }

              res.send({success:1});
            });
          }
        });
      }
    });
  } else {
    res.send({success:0});
  }

});
app.post('/leave_spot', function (req, res) {
  if (req.body.token && req.body.spotid) {
    var ref = new Firebase(url);

    ref.authWithCustomToken(req.body.token, function(err,authData) { 
      if (err) {
        res.send({success:0});
      } else {
        ref.authWithCustomToken(process.env.MBSECRET, function(error) {
          if (error) {
            res.send({success: 0});
          } else {
            var spotRef = ref.child('users/' + authData.uid + '/spots/' + req.body.spotid);
            spotRef.once('value', function(snap) {
              var val = snap.val();
              if (val === true || val === false) {
                spotRef.set(-1);
                ref.child('spots/' + req.body.spotid + '/users/' + authData.uid).remove();
                res.send({success: 1});
              } else {
                res.send({success: 0});
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

app.post('/update_name', function (req, res) {
  console.log('update_name');
  if (req.body.token && req.body.newname) {
    var ref = new Firebase(url);

    ref.authWithCustomToken(req.body.token, function(err,authData) { 
      if (err) {
        res.send({success:0});
      } else {
        ref.authWithCustomToken(process.env.MBSECRET, function(error) {
          if (error) {
            res.send({success: 0});
          } else {
            console.log('yup2');
            var name = req.body.newname;
            var userRef = ref.child('users/' + authData.uid);
            userRef.child('name').set(name);

            userRef.child('spots').once('value', function(snap) {
              var spots = snap.val();
              for (var spotid in spots) {
                ref.child('spots/' + spotid + '/users/' + authData.uid + '/name').set(name);
              }

              res.send({success:1});
            });

          }
        });
      }
    });
  } else {
    res.send({success:0});
  }
});

app.post('/join', function (req, res) {
  if (req.body.token && req.body.pin) {
    var ref = new Firebase(url);

    ref.authWithCustomToken(req.body.token, function(err,authData) { 
      if (err) {
        res.send({success:0});
      } else {
        ref.authWithCustomToken(process.env.MBSECRET, function(error) {
          if (error) {
            res.send({success: 0});
          } else {
            ref.child('invites/' + req.body.pin).once('value', function(snapshot) {
              var val = snapshot.val();
              if (val === null) {
                res.send({success:-1});
              } else { 
                var uRef = ref.child('users/' + authData.uid);

                if (val.users[authData.uid]) {
                  uRef.once('value', function(snap) {
                    var name = snap.val().name;
                    var spotRef = ref.child('spots/' + val.spotid);
                    var userSpotRef = spotRef.child('users/' + authData.uid);

                    userSpotRef.once('value', function(snapshot) {
                      if (!snapshot.val())  {
                        spotRef.child('users/' + authData.uid).set({
                          name: name,
                          state: 0,
                          admin: false
                        });

                        uRef.child('spots/' + val.spotid).set(false);
                        uRef.child('bad_pin_cnt').set(0);
                      }

                      res.send({ success: 1 });
                    });
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
  }
});

app.post('/join_w_pin', function (req, res) {
  if (req.body.token && req.body.pin) {
    var ref = new Firebase(url);

    ref.authWithCustomToken(req.body.token, function(err,authData) { 
      if (err) {
        res.send({success:0});
      } else {
        ref.authWithCustomToken(process.env.MBSECRET, function(error) {
          if (error) {
            res.send({success:0});
          } else {
            var vitRef = ref.child('invites/' + req.body.pin);
            var cref = ref.child('users/' + authData.uid + '/bad_pin_cnt');

            cref.once('value', function(snap) {
              var v = snap.val();
              var cnt = parseInt(v) || 0;
              if (cnt < -9) {
                res.send({success:-2});
              } else {
                vitRef.once('value', function(snapshot) {
                  if (snapshot.val() === null) {
                    cnt += 1;
                    cref.set(cnt);
                    res.send({success:-1});
                  } else {
                    var spotid = snapshot.val().spotid;
                    vitRef.child('users/' + authData.uid).set(true);

                    var spotRef = ref.child('spots/' + spotid);
                    spotRef.once('value', function(snap) {
                      var val = snap.val();

                      res.send({
                        success:1,
                        pin: req.body.pin,
                        id: spotid,
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
      }
    });
  } else {
    res.send({success:0});
  }
});

var server = app.listen(3000, '0.0.0.0', function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);
});
