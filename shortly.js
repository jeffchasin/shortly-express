var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var bcrypt = require('bcrypt-nodejs');

var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');
var session = require('express-session');

var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));

app.use(session({
  secret: 'philipp',
  resave: false,
  saveUninitialized: false
}
));


var restrict = function (req, res, next) {
 
  if (req.session.user) {
    next();
  } else {
    console.log('poop');
    // req.session.error = 'Access denied!';
    res.redirect('/login');
  }
};


app.get('/', restrict, 

  function(req, res) {
    res.render('index');
  });

app.get('/create', restrict, 
  function(req, res) {
    res.render('index');
  });

app.get('/links', restrict, 
  function(req, res) {
    Links.reset().fetch().then(function(links) {
      res.status(200).send(links.models);
    });
  });

app.post('/links', 
  function(req, res) {
    var uri = req.body.url;

    if (!util.isValidUrl(uri)) {
      console.log('Not a valid url: ', uri);
      return res.sendStatus(404);
    }

    new Link({ url: uri }).fetch().then(function(found) {
      if (found) {
        res.status(200).send(found.attributes);
      } else {
        util.getUrlTitle(uri, function(err, title) {
          if (err) {
            console.log('Error reading URL heading: ', err);
            return res.sendStatus(404);
          }

          Links.create({
            url: uri,
            title: title,
            baseUrl: req.headers.origin
          })
            .then(function(newLink) {
              res.status(200).send(newLink);
            });
        });
      }
    });
  });



/************************************************************/
// Write your authentication routes here
/************************************************************/

app.get('/signup',
  function(req, res) {
    res.render('signup');
  });

app.get('/login',

  function(req, res) {
    res.render('login');

  });


app.post('/signup', function(req, res) {

  var username = req.body.username;
  var password = req.body.password;

  new User({username: username})
    .fetch()
    .then((user) => {
      if (user !== null) {
        console.log('User already exits');
        res.redirect('/login');
      } else {
        new User ({
          username: username,
          password: password
        }).save().then(function(user) {
          console.log('User has been created');
          req.session.regenerate(() => {
            req.session.user = username;
            res.redirect('/');
          });
          
        });
        
      }
    });
});




app.post('/login', function(request, response) {

  var username = request.body.username;
  var password = request.body.password;

  new User({username: username})
    .fetch({require: true})
    .then(function(user) {
      console.log(user.attributes.password);
      bcrypt.compare(password, user.attributes.password, (err, res) => {
        
        if (res) {
           
          request.session.regenerate(function() {
            request.session.user = username;
            response.redirect('/');
          });
        } 
        if (res === false) {
          console.log('Wrong Password');
          response.redirect('/login');
        }
      });
    }).catch(err => {
      response.redirect('/login');
    });
});

app.get('/logout', function(req, res) {
  // req.session.cookie.maxAge = -99999999;
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        linkId: link.get('id')
      });

      click.save().then(function() {
        link.set('visits', link.get('visits') + 1);
        link.save().then(function() {
          return res.redirect(link.get('url'));
        });
      });
    }
  });
});

module.exports = app;
