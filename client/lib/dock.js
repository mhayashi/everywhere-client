var development = true,
    bounceEnable = false,
    logTip = null,
    qtips = {},
    currentTip,
    tempTip,
    username,
    tweetlen = 140,
    bitlylen = 1 + 20,          // space + url
    menuVisible = false;

$('<div id="everywhere-menu-button"></div>').appendTo('body');
$('<div id="everywhere-menu-counter"></div>').appendTo('#everywhere-menu-button');
$('<div id="everywhere-dock"></div>').appendTo('body');
$('<div class="everywhere-dock-container"></div>').appendTo('#everywhere-dock');

$('#everywhere-dock').css({bottom: '-60px'});
$('#everywhere-menu-button').click(function() {
  if (menuVisible) {
    $('#everywhere-dock').animate({ bottom: '-60px' }, 300);
    if (logTip) logTip.hide();
  } else {
    $('#everywhere-dock').animate({ bottom: '0px' }, 300);
    if (logTip) logTip.show();
    var qtiplog = $('.everywhere-qtip-log');
    qtiplog.scrollTop(qtiplog.height());
  }
  menuVisible = !menuVisible;
});
$('<div id="qtipManager" style="display:none"></div>').appendTo('body');
$('#qtipManager').bind('reply', reply);

var timer = setInterval(function() {
  if ($('#everywhere-log-send-button').length === 1) {
    $('#everywhere-log-send-button').click(sendMessage);
    clearInterval(timer);

    $('#ui-tooltip-everywhere-log textarea').keyup(function() {
      var count = tweetlen-bitlylen-$(this).val().length;
      $('.everywhere-string-counter').text(count);
      if (count < 0) {
        $('.everywhere-string-counter').css('color', '#ff0000');
      } else {
        $('.everywhere-string-counter').css('color', '#e3e3e3');
      }
    });

    // var len = $('#everywhere-dock').find('.everywhere-dock-item').length;
    // timer = setInterval(function() {
    //   if (qtips.length === len) {
    //     $('.everywhere-user-reply-button').click(reply);
    //     clearInterval(timer);
    //     console.log('at1');
    //   }
    // }, 100);
  }
}, 100);

// tempTip = $('#everywhere-menu-button').qtip({
//   id: 'everywhere-temp',
//   content: { text: '' },
//   position: { my: 'bottom right',
//               at: 'top left',
//               adjust: { x: 20, y: -5 },
//               target: $('#everywhere-menu-button')
//             },
//   style: { classes: 'ui-tooltip-youtube',
//            width: 200,
//            tip: { corner: 'bottom right' }
//          },
//   show: false,
//   hide: { event:false, inactive: 2000 }
// }).qtip();


chrome.extension.sendRequest({getUsername: true}, function(response) {
  username = response;
});

chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
  if (development) console.log(request);
  
  if (request.disconnected) {
    $('#everywhere-menu-button').css('background', 'rgba(255,0,0,0.8)');
    $('#everywhere-menu-button #everywhere-menu-counter').text('x');
  } else {
    $('#everywhere-menu-button').css('background', 'rgba(34,37,42,0.8)');
    $('#everywhere-menu-button #everywhere-menu-counter').text($('.everywhere-dock-item').length);
  }
  
  var msgType = request.msgType;
  switch(msgType) {
    
   case 'log':
    createLogTip(request.message.log);
    for (var i = 0, len = request.message.users.length; i < len; i++) {
      joinToDock(request.message.users[i]);
    }
    break;

   case 'join':
    if ($('#' + request.message.username).size() === 0) {
      joinToDock(request.message);
    }
    break;

   case 'update':
    var qtiplog = $('.everywhere-qtip-log');
    var msg = request.message;
    qtiplog.append(makeMessage(msg));
    //logTip.show();
    var height = 0;
    $('.everywhere-qtip-log-message').each(function(index) {
      height += $(this).height();
    });
    qtiplog.scrollTop(height);
    
    // update message of profile tip
    var tip = $('#ui-tooltip-everywhere-user-'+msg.username);
    tip.find('.everywhere-qtip-date').text(howLongAgo((msg.date)));
    tip.find('.everywhere-qtip-message').text(msg.message);

    // show the message sender's avator
    if (msg.username !== username) {
      if (!menuVisible) {
        $('a#'+msg.username).animate({ bottom: '60px' }, 300);
        setTimeout(function() {
          $('a#'+msg.username).animate({ bottom: '0px' }, 300);
        }, 2000);

        // show tip
        setTimeout(function() {
          tip.qtip().show();
          setTimeout(function() {
            tip.qtip().hide();
          }, 2000);
        }, 300);
      }
    }
    // show temporaly message tip
    // $('#ui-tooltip-everywhere-temp-content').text(msg.message);
    // tempTip.elements.target = $('a#'+msg.username);
    // tempTip.show();
    break;

   case 'exit':
    exitFromDock(request);
    break;
      
  default:
    break;

  }
});

                                       
function esc(str){
  return str.replace(/</g, '&lt;').replace(/>/g, '&gt;');
};

function joinToDock(message) {
  var _username = esc(message.username);
  if ($('a#'+_username).length) {
    if (development) console.log('already joined: ' + _username);
    return;
  }
  if (development) console.log('join: ' + _username);

  // create dock item
  var item = $('<a class="everywhere-dock-item" id="'+_username+'"><img src="'+message.image_url+'" /></a>');
  item.appendTo('.everywhere-dock-container');
  item.bind('mouseenter', function() {
    currentTip = $(this).attr('id');
    for (var i in qtips) qtips[i].hide();
    qtips[currentTip].show();
  });

  updateDock();

  // bounce the new item
  if (bounceEnable) {
    item.animate({ bottom: '60px' }, 400, 'easeInBack');
    item.animate({ bottom: '0px' }, 400, 'easeOutBack');
  }

  createTip(message);
}

function updateDock(message) {
  $('.everywhere-dock-item').each(function(index){
    $(this).css('right', 30*(index-1));
  });
  
  // show dock
  $('#everywhere-dock').animate({ bottom: '0px' }, 500);
  setTimeout(function() {
    $('#everywhere-dock').animate({ bottom: '-60px' }, 500);
  }, 2000);

  $('#everywhere-menu-button #everywhere-menu-counter').text($('.everywhere-dock-item').length);
}

function createTip(message) {
  var divprofile = $('<div></div>');
  divprofile.append('<div class="everywhere-qtip-user-image"><img src="'+message.image_url+'" height="48px" width="48px" /></div>');
  divprofile.append('<div class="everywhere-qtip-username"><a href="http://twitter.com/'+message.username+'" target="_blank">'+message.username+'</a></div>');
  // divprofile.append('<div class="everywhere-qtip-realname">'+(message.realname||"")+'</div>');
  // divprofile.append('<div class="everywhere-qtip-location">'+(message.location||"")+'</div>');
  divprofile.append('<div class="everywhere-qtip-date">'+howLongAgo(message.date)+'</div>');
  divprofile.append('<div class="everywhere-qtip-message">'+message.message+'</div>');
  divprofile.append('<div class="everywhere-send-button"><button class="everywhere-button everywhere-user-reply-button onclick="var ev = document.createEvent(\'Events\'); ev.initEvent(\'reply\', true, true); var target = document.getElementById(\'qtipManager\'); target.innerHTML=\''+message.username+'\'; target.dispatchEvent(ev);">Reply</button></div>');

  return qtips[message.username] = $('a#'+message.username).qtip({
    id: 'everywhere-user-'+message.username,
    prerender: true,
    content: { text: divprofile.html() },
    position: { my: 'bottom right',
                at: 'top left',
                adjust: { screen: true, x: 20, y: -5 }
              },
    style: { classes: 'ui-tooltip-youtube',
             width: 200,
             tip: { corner: 'bottom right' }
           },
    show: { event: 'mouseenter', delay: 0 },
    hide: { event: 'unfocus', delay: 0 }
  }).qtip();
}

function createLogTip(log) {
  var text = "";
  if (log) {
    var divlog = $('<div></div>');
    for (var i = 0, len = log.length; i < len; i++) {
      divlog.append(makeMessage(log[i]));
      text = '<div class="everywhere-qtip-log">' + divlog.html() + '</div>';
    }
  } else {
    text = '<div class="everywhere-qtip-log"><div class="everywhere-qtip-log-message">Post the first message on this page!</div></div>';
  }

  // add textarea
  text += '<textarea rows=5 cols=24></textarea>'
    + '<div class="everywhere-string-counter">'+(tweetlen-bitlylen)+'</div>'
    + '<div class="everywhere-send-button"><button class="everywhere-button" id="everywhere-log-send-button" type="button">Send</button></div>';
  
  logTip = $('#everywhere-menu-button').qtip({
    id: 'everywhere-log',
    prerender: true,
    content: { text: text, title: { text: 'everywhere!' } },
    position: { my: 'bottom right',
                at: 'top left',
                // type: 'fixed',
                target: $('#everywhere-menu-button'),
                adjust: { screen: true, x: 20, y: -5  }
              },
    style: { classes: 'ui-tooltip-youtube',
             width: 200,
             height: 300,
             tip: { corner: 'bottom right' }
           },
    show: false,
    hide: false
  }).qtip();
}

// TODO
function howLongAgo(prevDateString) {
  // var date = "";
  // var sec = Math.round((new Date() - new Date(prevDateString)) / 1000);
  // if (sec >= 60) {
  //   var min = Math.round(sec/60);
  //   if (min >= 60) {
  //     var hour = Math.round(min/60);
  //     if (hour >= 24) {
  //       date = prevDateString.substr(0, 24);
  //     } else {
  //       date = hour + ' hour ago';
  //     }
  //   } else {
  //     date = min + ' min ago';
  //   }
  // } else {
  //   date = sec + ' sec ago';
  // }
  // return date;
  if (typeof prevDateString === 'string') {
    return prevDateString.substr(0, 24);
  } else {
    return "";
  }
}

function makeMessage(message) {
  var date = howLongAgo(message.date);
  var divmessage = $('<div class="everywhere-qtip-log-message"></div>');
  divmessage.append('<div class="everywhere-qtip-user-image"><img src="'+message.image_url+'" height="30px" width="30px" /></div>');
  divmessage.append('<div class="everywhere-qtip-username"><a href="javascript:void(0)" onclick="var ev = document.createEvent(\'Events\'); ev.initEvent(\'reply\', true, true); var target = document.getElementById(\'qtipManager\'); target.innerHTML=\''+message.username+'\'; target.dispatchEvent(ev);">'+message.username+'</a></div>');
  
  divmessage.append('<div class="everywhere-qtip-date">'+date+'</div>');
  if (message.message) {
    var ret = message.message.match(/http:\/\/bit\.ly.*/g);
    if (ret) {
      var text = jQuery.trim(RegExp.leftContext);
      divmessage.append('<div class="everywhere-qtip-log-text">'+text+'</div>');
    } else {
      divmessage.append('<div class="everywhere-qtip-log-text">'+message.message+'</div>');
    }
  } else {
    divmessage.append('<div class="everywhere-qtip-log-text">'+message.message+'</div>');
  }
  return divmessage;
}

function reply() {
  if (logTip) {
    var textarea = logTip.elements.content.find('textarea');
    var replyTo = currentTip || $('#qtipManager').text();
    textarea.text('@'+replyTo+' ');
    logTip.show();
    textarea.focus();

    $('.everywhere-string-counter').text(tweetlen-bitlylen-(replyTo.length+2));
    
    var keydown = jQuery.Event("keydown");
    keydown.which = 40;
    textarea.trigger(keydown);
  }
}

function sendMessage() {
  var textarea = $('#ui-tooltip-everywhere-log textarea');
  var message = jQuery.trim(textarea.val());
  if (message === "" || message.length > (tweetlen - bitlylen)) {
    return;
  }
  var url = esc(document.location.href);
  chrome.extension.sendRequest({ msgType: "update",
                                 url: url,
                                 message: message
                               });
  textarea.val("");
  $('.everywhere-string-counter').text(tweetlen-bitlylen);
}

function exitFromDock(obj) {
  $('a#' + obj.message.username).remove();
  $('#ui-tooltip-everywhere-user-' + obj.message.username).remove();
  delete(qtips[obj.message.username]);
  updateDock();
}
