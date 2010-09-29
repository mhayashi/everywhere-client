var http = require('http'), 
		url = require('url'),
		fs = require('fs'),
		io = require('socket.io'),
		sys = require('sys'),
    sm = require('./socketmanager'),
    redis = require('redis'),
    servers = [];
		
var send404 = function(res){
	res.writeHead(404);
	res.write('404');
	res.end();
};

var development = 1;

if (!development) {
  servers[0] = http.createServer(function(req, res){
	  var path = url.parse(req.url).pathname;
	  switch (path){
	   case '/':
			res.writeHead(200, {'Content-Type': 'text/html'});
			res.write('<h1>Welcome to Chat Everywhare.</h1><p>Install the client <a href="/client.crx">chat</a> (Chrome Only).</p>');
			res.end();
			break;
	   case '/client.crx':
		  fs.readFile(__dirname + path, function(err, data){
			  if (err) return send404(res);
			  res.writeHead(200, {'Content-Type': 'text/html'});
			  res.write(data, 'utf8');
			  res.end();
		  });
      break;
	  default:
		  send404(res);
		  break;
	  }
  }).listen(80);
}

servers[1] = http.createServer(function(req, res){
	res.writeHead(200, {'Content-Type': 'text/plain'});
	res.end('');
});
servers[1].listen(8000);

var io = io.listen(servers[1]),
		users = {};

var redis_client = redis.createClient();
redis_client.on('error', function(err) {
  console.log('Redis connection error to ' + redis_client.host + ':' + redis_client.port + ' - ' + err);
});

sm = new sm.SocketManager();
sm.register(io);

function sendLog(client, message) {
  var _users = [];
  if ((sm.channels[message.url]) && (sm.channels[message.url].length >= 1)) {
    //sys.debug(sm.channels[message.url]);
    for (var i = 0, len = sm.channels[message.url].length; i < len; i++) {
      var sessionId = sm.channels[message.url][i];
      //sys.debug(sessionId + ", " + users[sessionId]);
      if (sessionId) {
        var user = users[sessionId];
        if (user) {
          _users.push({username: user.username, image_url: user.image_url, message: ""});
        }
      }
    }

    redis_client.llen(message.url, function(err, res) {
      if (res == 0) {
        sm.send('log', client.sessionId, {message: { url: message.url, log: null, users: _users }});
        return;
      }
      var loglen = res;
      var logstart = loglen>=10 ? loglen-10 : 0;
      redis_client.lrange(message.url, logstart, loglen-1, function(err, res) {
        //console.log(logstart + "~" + loglen + ":" + res);f
        var log = [];
        for (var i = 0, len = res.length; i < len; i++) {
          log.push(JSON.parse(""+res[i]));
        }
        sm.send('log', client.sessionId, {message: { url: message.url, log: log, users: _users }});
      });
    });
  }
}

sm.on('join', function(client, message){
  //client.username = message.username;
  //sys.debug('sessionId: ' + client.sessionId);
  //sys.debug('msgType: ' + message.msgType);
  sm.connectToChannel(client, message.url);
  sm.broadcastToChannel(client, message.url, message.msgType, {message: message});
  users[client.sessionId] = {username: message.username, image_url: message.image_url};

  sendLog(client, message);
});

sm.on('rejoin', function(client, message){
  sendLog(client, message);
});

sm.on('update', function(client, message){
  //client.username = message.username;
  sm.broadcastToChannel(client, message.url, message.msgType, {message: message});
  redis_client.rpush(message.url, JSON.stringify(message));
});

sm.on('exit', function(client, message){
  sm.broadcastToChannel(client, message.url, message.msgType, {message: message});
  sm.exitFromChannel(client, message.url);
});

