var qtips = {};
var preQtips = {};
var currentTip;
var username;
var users = [];

$('<div class="dock" id="dock2"></div>').appendTo('body');
$('<div class="dock-container2"></div>').appendTo('#dock2');

$('<div id="qtipManager" style="display:none"></div>').appendTo('body');
$('#qtipManager').bind('showMessageTip', showMessageTip);
$('#qtipManager').bind('sendMessage', sendMessage);
$('#qtipManager').bind('hideTip', hideTip);

chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
  console.log(request);
  var msgType = request.msgType;
  if (msgType == 'buffer') {
    var len = request.message.length;
    for (var i = 0; i < len; i++) {
      console.log(request.message[i]);
      joinToDock(request.message[i]);
    }
  } else if (msgType == 'join') {
    if ($('#' + request.message.username).size() == 0) {
      joinToDock(request.message);
    }
  } else if (msgType == 'update') {
    updateTip(request.message.username, esc(request.message.message));
  } else if (msgType == 'exit') {
    exitFromDock(request);
  }
});

chrome.extension.sendRequest({getUsername: true}, function(response) {
  username = response;
});


function esc(str){
  return str.replace(/</g, '&lt;').replace(/>/g, '&gt;');
};

function joinToDock(message) {
  var _username = esc(message.username);
  if (users.indexOf(_username) != -1) {
    return;
  }
  users.push(_username);
  $('<a class="dock-item2" id="'+_username+'"><span class="text">'+_username+'</span><img src="'+message.image_url+'" /></a>').appendTo('.dock-container2');
  // add event handler
  $('a#'+_username).bind('mouseenter', function() {
    currentTip = $(this).text();
  });
  if (_username == username) {
    $('a#'+_username).bind('click', showMessageTip);
  }
  updateDock();

  createTip(_username, esc(message.message)).show();
}

function updateDock() {
  $('#dock2').Fisheye({
	  maxWidth: 48,
	  items: '.dock-item2',
	  itemsText: '.text',
	  container: '.dock-container2',
	  itemWidth: 30,
	  proximity: 80,
	  alignment: 'left',
	  valign: 'bottom',
	  halign: 'center'
  });
}

function createTip(_username, message) {
  var buttonText = (_username == username ? 'New' : 'Reply');
  if (!message) {
    message = ' ';
  }
  return qtips[_username] = $('a#'+_username).qtip({
    id: _username,
    content: {
      text: message,
      title: {
        text: _username,
        button: '<span onclick="var ev = document.createEvent(\'Events\'); ev.initEvent(\'showMessageTip\', true, true); var target = document.getElementById(\'qtipManager\'); target.dispatchEvent(ev);">' + buttonText + '</span>'
      }
    },
    position: { my: 'bottom right', at: 'top left', adjust: { x: 20, y: 5 } },
    style: { classes: 'ui-tooltip-light' },
    show: { event: 'mouseenter', delay: 0 },
    hide: { event: 'unfocus', delay: 0, inactive: 5000 }
  }).qtip();
}

function updateTip(_username, message) {
  if (_username == username) {
    return;
  }
  var qt = qtips[_username];
  if (qt) {
    qt.set('content.text.html', message);
  } else {
    qt = createTip(_username, message);
  }
  qt.show();
}

function saveCurrentTip(target) {
  preQtips[target] = {
    content: qtips[target].get('content.text.html'),
    title: qtips[target].get('content.title.text.text'),
    button: qtips[target].get('content.title.button.html')
  };
}

function loadPreviousTip(target) {
  qtips[target].set('content.text.html', preQtips[target]['content']);
  qtips[target].set('content.title.text.text', preQtips[target]['title']);
  qtips[target].set('content.title.button.html', preQtips[target]['button']);
}

function showMessageTip() {
  // avoid to close automatically
  $('.ui-tooltip-button').unbind('click');

  saveCurrentTip(currentTip);

  var qt = qtips[currentTip];
  if (currentTip == username) {
    qt.set('content.text.html', '<textarea class="message" rows=5 cols=23></textarea><div align="right"><button type="button" onclick="var ev = document.createEvent(\'Events\'); ev.initEvent(\'sendMessage\', false, false); var target = document.getElementById(\'qtipManager\'); target.dispatchEvent(ev);">Send</button></div>');
    qt.set('content.title.text.text', 'New Message');
  } else {
    qt.set('content.text.html', '<textarea class="message" rows=5 cols=23>@' + currentTip + ' </textarea><div align="right"><button type="button" onclick="var ev = document.createEvent(\'Events\'); ev.initEvent(\'sendMessage\', true, true); var target = document.getElementById(\'qtipManager\'); target.dispatchEvent(ev);">Send</button></div>');
    qt.set('content.title.text.text', 'Reply');
  }
  qt.set('content.title.button.html', '<span onclick="var ev = document.createEvent(\'Events\'); ev.initEvent(\'hideTip\', true, true); var target = document.getElementById(\'qtipManager\'); target.dispatchEvent(ev);">Cancel</span>');

  qt.show();
  
  // key event seems to be recognized 'inactive'. In order to avoid this behaviour,
  // we made to sendmouseover event to the tooltip while you hit the key in a textarea.
  $('#ui-tooltip-' + currentTip).find('textarea.message').bind('keydown', function() {
    $('#ui-tooltip-' + currentTip).trigger('mouseover');
  });
}

function hideTip() {
  var qt = qtips[currentTip];
  loadPreviousTip(currentTip);
  qt.hide();
}

function sendMessage() {
  // avoid to close automatically
  $('.ui-tooltip-button').unbind('click');
  var message = $('#ui-tooltip-' + currentTip).find('textarea.message').val();
  chrome.extension.sendRequest({msgType: "update", url: esc(document.location.href), username: username, message: message});
  
  var qt = qtips[currentTip];
  qt.hide();

  qtips[username].elements.content.html(message);
  if (currentTip == username) {
    qt.elements.content.html(message);
  } else {
    qt.elements.content.html(preQtips[currentTip]['content']);
  }
  qt.elements.title.text(currentTip);
  var buttonText = (currentTip == username ? 'New' : 'Reply');
  qt.elements.button.html('<span onclick="var ev = document.createEvent(\'Events\'); ev.initEvent(\'showMessageTip\', true, true); var target = document.getElementById(\'qtipManager\'); target.dispatchEvent(ev);">' + buttonText + '</span>');
  qtips[username].show();
}

function exitFromDock(obj) {
  $('#' + obj.message.username).remove();
  $('#ui-tooltip-' + obj.message.username).remove();
  var index = users.indexOf(obj.message.username);
  if (index != -1) {
    users.remove(index);
  }
  delete(qtips[obj.message.username]);
  updateDock();
}
