var http = require('http'), 
		url = require('url'),
		fs = require('fs'),
		io = require('socket.io'),
		sys = require('sys'),
    sm = require('./socketmanager');
		
send404 = function(res){
	res.writeHead(404);
	res.write('404');
	res.end();
},
		
server = http.createServer(function(req, res){
	var path = url.parse(req.url).pathname;
	switch (path){
		case '/':
			res.writeHead(200, {'Content-Type': 'text/html'});
			res.write('<h1>Welcome to Chat Everywhare.</h1><p>Install the client <a href="/client.crx">chat</a> (Chrome Only).</p>');
			res.end();
			break;
			
		default:
// 			if (/\.(js|html|swf)$/.test(path)){
// 				try {
// 					var swf = path.substr(-4) === '.swf';
// 					res.writeHead(200, {'Content-Type': swf ? 'application/x-shockwave-flash' : ('text/' + (path.substr(-3) === '.js' ? 'javascript' : 'html'))});
// 					fs.readFile(__dirname + path, swf ? 'binary' : 'utf8', function(err, data){
// 						if (!err) res.write(data, swf ? 'binary' : 'utf8');
// 						res.end();
// 					});
// 				} catch(e){ 
// 					send404(res); 
// 				}
// 				break;
// 			}
		
			send404(res);
			break;
	}
});

server.listen(8080);
		
var io = io.listen(server),
		channels = {},
		users = {};

sm = new sm.SocketManager();
sm.register(io);

sm.on('join', function(client, message){
  //client.username = message.username;
  //sys.debug('sessionId: ' + client.sessionId);
  //sys.debug('msgType: ' + message.msgType);
  sm.connectToChannel(client, message.url);
  sm.broadcastToChannel(client, message.url, message.msgType, {message: message});
  users[client.sessionId] = {username: message.username, image_url: message.image_url};
  var _users = [];
  if ((sm.channels[message.url]) && (sm.channels[message.url].length >= 1)) {
    //sys.debug(sm.channels[message.url]);
    var len = sm.channels[message.url].length;
    for (var i = 0; i < len; i++) {
      var sessionId = sm.channels[message.url][i];
      //sys.debug(sessionId + ", " + users[sessionId]);
      if (sessionId) {
        var user = users[sessionId];
        if (user) {
          _users.push({username: user.username, image_url: user.image_url, message: ""});
        }
      }
    }
    sm.send('buffer', client.sessionId, {message: _users});
  }
});

sm.on('rejoin', function(client, message){
  var _users = [];
  if ((sm.channels[message.url]) && (sm.channels[message.url].length >= 1)) {
    //sys.debug(sm.channels[message.url]);
    var len = sm.channels[message.url].length;
    for (var i = 0; i < len; i++) {
      var sessionId = sm.channels[message.url][i];
      //sys.debug(sessionId + ", " + users[sessionId]);
      if (sessionId) {
        var user = users[sessionId];
        if (user) {
          _users.push({username: user.username, image_url: user.image_url, message: ""});
        }
      }
    }
    sm.send('buffer', client.sessionId, {message: _users});
  }
});

sm.on('update', function(client, message){
  //client.username = message.username;
  sm.broadcastToChannel(client, message.url, message.msgType, {message: message});
});

sm.on('exit', function(client, message){
  sm.broadcastToChannel(client, message.url, message.msgType, {message: message});
  sm.exitFromChannel(client, message.url);
});

