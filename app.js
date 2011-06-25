
/**
 * Module dependencies.
 */

var express = require('express')
  , app = module.exports = express.createServer()
  , io = require('socket.io').listen(app)
  , patch = require('./libs/diff_match_patch_uncompressed')
  , RedisStore = require('connect-redis')(express);

// Configuration

app.configure(function() {
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(require('stylus').middleware({ src: __dirname + '/public' }));
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
  app.use(express.bodyParser());
  app.use(express.cookieParser());
  app.use(express.session({ secret: "myDocsSession", store: new RedisStore }));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
});



// Global variables
var n = 0;
var oldText = "";
var sessionAuth = false;


// Routes
app.get('/', function(req, res) {
  if ( sessionAuth ) {
    res.render('index', {
      title: "JDocs"
    });
  } else {
    res.render('login', {
      title: "JDocs - Login"
    });
  }
});

app.post('/login', function(req, res) {
  sessionAuth = true;
  res.redirect('back');
});

// Listen on port 8080
app.listen(8080);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);


io.sockets.on('connection', function(client) {

//   var interval = setInterval(function() {
//     client.emit('msg', 'world ' + ++n);
//     client.send('This is a message from the server!  ');
//   },5000);
  client.emit('msg', oldText);

  client.on('message', function( data ) {
    var dmp = new patch.diff_match_patch();
    if ( data === "" ) {
      return;
    }
    
    // Parse JSON Object
    var jdata = JSON.parse( data );
    // Transform text-patch to patch-objekt and create patch
    var text = (dmp.patch_apply( dmp.patch_fromText(jdata.text), oldText ))[0];
    // send patch to other user
    client.broadcast.emit('msg', text);
//     client.emit('msg', text);
    // Store the old text
    oldText = text;
  });
  
  
  client.on('highlight',function(event) {
    client.broadcast.emit('highlight', event);
    console.log('highlight hiuhiu',event);
  });

  // Success!  Now listen to messages to be received
  client.on('msg',function(event) { 
    console.log('Received message from client!',event);
  });
  client.on('disconnect',function() {
//     clearInterval(interval);
    console.log('Server has disconnected');
  });

});
