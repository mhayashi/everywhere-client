/**
 * Copyright (c) 2009-2010 Arnaud Leymet
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 * Live Website Editor <http://github.com/arnaud/lwe>
 *
 * Modified by Masahiro Hayashi 2010
 */

// extend 

(function(){

  // Object.clone = function() { 
  //   return $.extend(true, {}, this); 
  // };
  // deepcopy
  // http://d.hatena.ne.jp/sideroad/20090812/1250045001
  (function($){
    $.cloneObject = function(source, isDeep) {
      if(isDeep){
        return $.extend(true, {}, source);
      }
      return $.extend({}, source);
    };
  })(jQuery);
  

  //http://tech.kayac.com/archive/jquery-debug-plugin.html
  $.fn.p = function (id) {
    var arg = [this];
    if (id) arg.unshift(id);
    if (!window.console) return this;
    var c = window.console || { 'log' : function () {} };
    (c.debug || c.log).apply(c, arg);
    return this;
  };

  // http://james.padolsey.com/javascript/regex-selector-for-jquery/
  jQuery.expr[':'].regex = function(elem, index, match) {
    var matchParams = match[3].split(','),
        validLabels = /^(data|css):/,
        attr = {
          method: matchParams[0].match(validLabels) ? 
            matchParams[0].split(':')[0] : 'attr',
          property: matchParams.shift().replace(validLabels,'')
        },
    regexFlags = 'ig',
    regex = new RegExp(matchParams.join('').replace(/^\s+|\s+$/g,''), regexFlags);
    return regex.test(jQuery(elem)[attr.method](attr.property));
  };

})();

(function() {
  var init = true;
  var original = {};
  var latest = {};
  var editions = {};
  var editions_history = {};
  var username = '';
  var current = '';
  var editing = false;
  var users = {};
  var port;
  var language_code;
  var at_api;

  var languages = {
    af: 'Afrikaans',
    sq: 'Albanian', 
    ar: 'Arabic',
    be: 'Belarusian',
    bg: 'Bulgarian',
    'zh-cn': 'Chinese (Simplified)',
    'zh-tw': 'Chinese (Traditional)',
    ca: 'Catalan',
    hr: 'Croatian',
    cs: 'Czech',
    da: 'Danish',
    nl: 'Dutch',
    en: 'English',
    et: 'Estonian',
    //: 'Filipino',
    fi: 'Finnish',
    fr: 'French',
    //'Galician',
    de: 'German',
    el: 'Greek',
    //'Haitian Creole',
    he: 'Hebrew',
    hi: 'Hindi',
    hu: 'Hungarian',
    is: 'Icelandic',
    id: 'Indonesian',
    //'Irish',
    it: 'Italian',
    ja: 'Japanese',
    ko: 'Korean',
    lv: 'Latvian',
    lt: 'Lithuanian',
    mk: 'Macedonian',
    ms: 'Malay',
    mt: 'Maltese',
    no: 'Norwegian',
    //'Persian',
    pl: 'Polish',
    pt: 'Portuguese',
    ro: 'Romanian',
    ru: 'Russian',
    es: 'Spanish',
    sr: 'Serbian',
    sk: 'Slovak',
    sl: 'Slovenian',
    //'Swahili',
    sv: 'Swedish',
    th: 'Thai',
    tr: 'Turkish',
    uk: 'Ukrainian',
    vi: 'Vietnamese',
    //'Welsh',
    jl: 'Yiddish'
  };
  
  var addTranslationMenu = function(_username) {
    var exist = false;
    $('#everywhere-lwe-toolbar-edition-button option').each(function() {
      if ($(this).val() === _username) {
        exist = true;
      }
    });

    if (!exist) {
      $('#everywhere-lwe-toolbar-edition-button')
        .append(
          $('<option>')
            .text(_username)
            .val(_username)
        );
    }
  };
  
  var createMessageDialog = function(id, title, message) {
    return $('body')
      .append(
        $('<div>')
          .css('margin-left', window.innerWidth/2-250)
          .addClass('everywhere-lwe-dialog')
          .attr('id', 'everywhere-lwe-'+id+'-dialog')
          .append(
            $('<div>')
              .addClass('everywhere-lwe-dialog-title')
              .text('Send collaboration request via Twitter'))
          .append(
            $('<textarea>')
              .addClass('everywhere-lwe-dialog-textarea')
              .val('@'+current+' '))
          .append(
            $('<button>')
              .addClass('everywhere-lwe-toolbar-button')
              .text('Send')
              .click(function() {
                chrome.extension.sendRequest({ tweet: $('#everywhere-lwe-dialog-textarea').val() });
                $('#everywhere-lwe-'+id+'-dialog').remove();
              }))
          .append(
            $('<button>')
              .addClass('everywhere-lwe-toolbar-button')
              .text('Cancel')
              .click(function() {
                $('#everywhere-lwe-'+id+'-dialog').remove();
              }))
          );
  };

  var forkTranslation = function() {
    $('#everywhere-lwe-edit-dialog').remove();

    // add to translation menu
    addTranslationMenu(username);

    $('#everywhere-lwe-toolbar-edition-button').val(username);

    //activate
    lwe.activate();
    $('#everywhere-lwe-toolbar-edit-button').css({'background': '#555', 'color': '#f00'});
    $('#everywhere-lwe-toolbar-edit-button').text('End Translation');
    port.postMessage({action: "activate", status: "ok"});
    editing = true;
    
    // add to editions
    editions[username] = $.cloneObject(editions[current], true);
    editions_history[username] = $.cloneObject(editions[current], true);
    latest = editions[username];

    lwe.history.data = editions_history[username];
    lwe.history.revision = editions_history[username].length;
    $('#everywhere-lwe-toolbar-redo-button')
      .addClass('everywhere-lwe-toolbar-button-disable');
    current = username;

    // send edit
    port.postMessage({ action: "edit-text",
                       owner: username,
                       whole: latest });
 
  };
  
  var createEditDialog = function(id, title, message) {
    if ($('#everywhere-lwe-'+id+'-dialog').length === 0) {
      
      $('body')
        .append(
          $('<div>')
            .css('margin-left', window.innerWidth/2-250)
            .addClass('everywhere-lwe-dialog')
            .attr('id', 'everywhere-lwe-'+id+'-dialog')
            .append(
              $('<div>')
                .addClass('everywhere-lwe-dialog-title')
                .text(title))
            .append(
              $('<div>')
                .addClass('everywhere-lwe-dialog-text')
                .text(message))
            .append(
              $('<button>')
                .addClass('everywhere-lwe-toolbar-button')
                .text('Fork')
                .click(forkTranslation))
            .append(
              $('<span>')
                .attr('class', 'everywhere-lwe-dialog')
                .text('or'))
            .append(
              $('<button>')
                .addClass('everywhere-lwe-toolbar-button')
                .text('Collaborate')
                .click(function() {
                  createMessageDialog();
                  $('#everywhere-lwe-'+id+'-dialog').remove();
                }))
            .append(
              $('<div>'))
          //TODO スペース開ける
            .append(
              $('<button>')
                .addClass('everywhere-lwe-toolbar-button')
                .text('Cancel')
                .click(function() {
                  $('#everywhere-lwe-'+id+'-dialog').remove();
                }))
        );
    }
  };

  var createDialog = function(id, title, message, callback_yes, callback_no) {
    if ($('#everywhere-lwe-'+id+'-dialog').length === 0) {
      $('body')
        .append(
          $('<div>')
            .css('margin-left', window.innerWidth/2-250)
            .addClass('everywhere-lwe-dialog')
            .attr('id', 'everywhere-lwe-'+id+'-dialog')
            .append(
              $('<div>')
                .addClass('everywhere-lwe-dialog-title')
                .text(title))
            .append(
              $('<div>')
                .addClass('everywhere-lwe-dialog-text')
                .text(message))
            .append(
              $('<button>')
                .addClass('everywhere-lwe-toolbar-button')
                .text('OK')
                .click(function() {
                  if (typeof callback_yes === 'function') callback_yes();
                  $('#everywhere-lwe-'+id+'-dialog').remove();
                }))
            .append(
              $('<button>')
                .addClass('everywhere-lwe-toolbar-button')
                .text('Cancel')
                .click(function() {
                  if (typeof callback_no === 'function') callback_no();
                  $('#everywhere-lwe-'+id+'-dialog').remove();
                }))
        );
    }
  };

  var createShareDialog = function() {
    $('body')
      .append(
        $('<div>')
          .css('margin-left', window.innerWidth/2-250)
          .attr('id', 'everywhere-lwe-share-dialog')
          .append(
            $('<div>')
              .text('Choose collaborators')
              .addClass('everywhere-lwe-share-dialog-text'))
          .append(
            $('<div>')
              .attr('id', 'everywhere-lwe-share-dialog-online'))
              .addClass('everywhere-lwe-share-dialog-text')
          .append(
            $('<div>')
              .attr('id', 'everywhere-lwe-share-dialog-online-users'))
          .append(
            $('<div>')
              .addClass('everywhere-lwe-dialog-buttons')
              .append(
                $('<button>')
                  .attr('id', 'everywhere-lwe-share-dialog-close-button')
                  .addClass('everywhere-lwe-toolbar-button')
                  .text('Share')
                  .click(function() {
                    sendShareMessage();
                    $('#everywhere-lwe-share-dialog').hide();
                  }))
              .append(
                $('<button>')
                  .attr('id', 'everywhere-lwe-share-dialog-close-button')
                  .addClass('everywhere-lwe-toolbar-button')
                  .text('Cancel')
                  .click(function() {
                    $('#everywhere-lwe-share-dialog').hide();
                  }))
          )
      );
    // hide initially
    $('#everywhere-lwe-share-dialog').hide();
  };

  var disableShareButton = function() {
    $('#everywhere-lwe-toolbar-share-button')
      .addClass('everywhere-lwe-toolbar-button-disable')
      .click(function(){});
  };

  var enableShareButton = function() {
    $('#everywhere-lwe-toolbar-share-button')
      .removeClass('everywhere-lwe-toolbar-button-disable')
      .click(function() {
        var people = 0;
        for (var u in users) {
          if (users.hasOwnProperty(u)) {
            var avator;
            if (u === username) {
              avator = $('<img>')
                .attr('src', users[u].image_url)
                .addClass('everywhere-lwe-share-dialog-online-user-shared');
            } else {
              avator = $('<img>')
                .attr('src', users[u].image_url)
                .click(function() {
                  toggleShare($(this).parent().text());
                });
              
            }
            // create online user list
            if ($('#everywhere-lwe-share-dialog-online-user-'+u).length === 0) {
              $('#everywhere-lwe-share-dialog-online-users')
                .append(
                  $('<div>')
                    .addClass('everywhere-lwe-share-dialog-online-user')
                    .attr('id', 'everywhere-lwe-share-dialog-online-user-'+u)
                    .append(avator)
                    .append(
                      $('<div>')
                        .text(u))
                );
            }
            people++;
          }
        }
        $('#everywhere-lwe-share-dialog-online')
          .text(people+' online');
        $('#everywhere-lwe-share-dialog').show();
      });
    
  };
  
  var disableClearHistoryButton = function() {
    $('#everywhere-lwe-toolbar-clear-button')
      .addClass('everywhere-lwe-toolbar-button-disable')
      .click(function(){});
  };
  
  var enableClearHistoryButton = function() {
    $('#everywhere-lwe-toolbar-clear-button')
      .removeClass('everywhere-lwe-toolbar-button-disable')
      .click(function() {

        // if ($('#everywhere-lwe-toolbar-edition-button option:selected').val() !== username) {
        //   createNotification('delete',
        //                      'Caution',
        //                      'You cannot remove other\'s translation.');
        // }
        // else {
          createDialog('delete',
                       'Delete this translation from server',
                       'Are you sure?',
                       function() {
                         applyToPage(original);
                         // switch history
                         latest = $.cloneObject(original, true);
                         lwe.history.data = {};
                         lwe.history.revision = 0;
                         $('#everywhere-lwe-toolbar-undo-button')
                           .addClass('everywhere-lwe-toolbar-button-disable');

                         // remove select option
                         $('#everywhere-lwe-toolbar-edition-button option:selected').remove();
                         disableClearHistoryButton();
                         disableShareButton();
                         
                         port.postMessage({ action: "delete", status: "ok" });
                       });
        // }
      });
  };
  
  var startTranslation = function() {
    lwe.activate();
    $('#everywhere-lwe-toolbar-edit-button').css({'background': '#555', 'color': '#f00'});
    $('#everywhere-lwe-toolbar-edit-button').text('End Translation');
    port.postMessage({action: "activate", status: "ok"});
    editing = true;

    enableClearHistoryButton();
    enableShareButton();
  };

  var endTranslation = function() {
    lwe.deactivate();
    $('#everywhere-lwe-toolbar-edit-button').css({'background': '#000', 'color': '#e3e3e3'});
    $('#everywhere-lwe-toolbar-edit-button').text('Translate by yourself');
    port.postMessage({action: "deactivate", status: "ok"});
    editing = false;
  };

  var createToolbar = function () {

    $('body')
      .prepend(
        $('<div>')
          .attr('id', 'everywhere-lwe-toolbar')
          .append(
            $('<select>')
              .attr('id', 'everywhere-lwe-toolbar-edition-button')
              .attr('class', 'everywhere-lwe-toolbar-button')
              .append(
                $('<option>')
                  .val('--------')
                  .text('Choose Translations'))
              .append(
                $('<option>')
                  .val('at-google')
                  .text('Google (Auto)'))
              .append(
                $('<option>')
                  .val('at-bing')
                  .text('Bing (Auto)')))
          .append(
            $('<select>')
              .attr('id', 'everywhere-lwe-toolbar-language-button')
              .attr('class', 'everywhere-lwe-toolbar-button')
              .append(
                $('<option>')
                  .val('--------')
                  .text('Language')))
          .append(
            $('<button>')
              .attr('id', 'everywhere-lwe-toolbar-edit-button')
              .attr('class', 'everywhere-lwe-toolbar-button')
              .text('Translate by yourself'))
          .append(
            $('<span>')
              .addClass('everywhere-lwe-toolbar-space')
              .text(' '))
          .append(
            $('<button>')
              .attr('id', 'everywhere-lwe-toolbar-undo-button')
              .attr('class', 'everywhere-lwe-toolbar-button')
              .text('Undo'))
          .append(
            $('<button>')
              .attr('id', 'everywhere-lwe-toolbar-redo-button')
              .attr('class', 'everywhere-lwe-toolbar-button')
              .text('Redo'))
          .append(
            $('<span>')
              .addClass('everywhere-lwe-toolbar-space')
              .text(' '))
          .append(
            $('<button>')
              .attr('id', 'everywhere-lwe-toolbar-original-button')
              .attr('class', 'everywhere-lwe-toolbar-button')
              .text('Show Original'))
          .append(
            $('<button>')
              .attr('id', 'everywhere-lwe-toolbar-share-button')
              .attr('class', 'everywhere-lwe-toolbar-button')
              .text('Collaborate'))
          .append(
            $('<button>')
              .attr('id', 'everywhere-lwe-toolbar-clear-button')
              .attr('class', 'everywhere-lwe-toolbar-button')
              .text('Delete'))
      );

    /**
     * append language list
     */
    $.each(languages, function(key, val) {
      $('#everywhere-lwe-toolbar-language-button')
        .append(
          $('<option>')
            .val(key)
            .text(val));
    });
    
    /**
     * Event handlers
     */
    // 'Language' Menu
    $('#everywhere-lwe-toolbar-language-button').change(function(e) {
      language_code = $('#everywhere-lwe-toolbar-language-button option:selected').val();
      if (language_code !== '--------') {
        chrome.extension.sendRequest({ type: 'language',
                                       code: language_code,
                                       api: at_api,
                                       src: original
                                     });
      }
    });

    // 'Edit' Button
    $('#everywhere-lwe-toolbar-edit-button').click(function() {

      // deactivate
      if (editing) {
        endTranslation();
      }
      // activate
      else {
        
        if ($.isEmptyObject(editions) === false) {
          if (current !== username) {
            if (current === 'at-google' || current === 'at-bing') {
              startTranslation();
              $('#everywhere-lwe-toolbar-edition-button').val(username);

              latest = editions[username];
              lwe.history.data = editions_history[username];
              lwe.history.revision = editions_history[username].length;
              $('#everywhere-lwe-toolbar-redo-button')
                .addClass('everywhere-lwe-toolbar-button-disable');
              current = username;

            } else {
              // show dialog
              createEditDialog('edit');
            }
          } else {
            startTranslation();
          }
        } else {
          // start new translation
          startTranslation();

          //TODO: add menu
          addTranslationMenu(username);
          $('#everywhere-lwe-toolbar-edition-button').val(username);

          editions[username] = {};
          editions_history[username] = {};
          latest = editions[username];
          lwe.history.data = editions_history[username];
          lwe.history.revision = editions_history[username].length;
          $('#everywhere-lwe-toolbar-redo-button')
            .addClass('everywhere-lwe-toolbar-button-disable');
          current = username;
          
        }
      }
    });
    
    // 'Undo' Button
    $('#everywhere-lwe-toolbar-undo-button').click(function() {
      lwe.history.undo();
    });

    // 'Redo' Button
    $('#everywhere-lwe-toolbar-redo-button').click(function() {
      lwe.history.redo();
    });
    
    // 'Show Original/Latest' Button
    $('#everywhere-lwe-toolbar-original-button').click(function() {
      var data = {};
      if ($(this).text() === 'Show Original') {
        data = original;
        $('#everywhere-lwe-toolbar-original-button').text('Show Latest');
      } else {
        data = latest;
        $('#everywhere-lwe-toolbar-original-button').text('Show Original');
      }
      applyToPage(data);
    });

    // 'Share' Button
    disableShareButton();

    // 'Clear History' Button
    disableClearHistoryButton();
    disableShareButton();
    $('#everywhere-lwe-toolbar-redo-button')
      .addClass('everywhere-lwe-toolbar-button-disable');
    $('#everywhere-lwe-toolbar-undo-button')
      .addClass('everywhere-lwe-toolbar-button-disable');
    
  };
  
  var createNotification = function(id, title, message, callback) {
    return $('body')
      .append(
        $('<div>')
          .css('margin-left', window.innerWidth/2-250)
          .addClass('everywhere-lwe-dialog')
          .attr('id', 'everywhere-lwe-'+id+'-dialog')
          .append(
            $('<div>')
              .attr('id', 'everywhere-lwe-dialog')
              .text(title))
          .append(
            $('<div>')
              .attr('id', 'everywhere-lwe-dialog')
              .text(message))
          .append(
            $('<button>')
              .addClass('everywhere-lwe-toolbar-button')
              .text('OK')
              .click(function() {
                $('#everywhere-lwe-'+id+'-dialog').hide();
                if (callback) callback();
              }))
          );
  };

  var showToolbar = function() {
    $('html').css({ 'position': 'relative', 'margin-top': '30px' });
    $('#everywhere-lwe-toolbar')
      .css('display', 'block');
  };
  
  var hideToolbar = function() {
    $('html').css({ 'position': 'relative', 'margin-top': '0px' });
    $('#everywhere-lwe-toolbar')
      .css('display', 'none');
  };

  /**
   * Add tranlations to the toolbar
   */
  var addTranslations = function(edits) {
    editions = edits;
      
    for (key in editions) {
      // init history
      editions_history[key] = [];

      if (edits.hasOwnProperty(key)) {

        $('#everywhere-lwe-toolbar-edition-button')
          .append(
            $('<option>')
              .text(key)
              .val(key)
          )
          .change(function(){
            var key = $('#everywhere-lwe-toolbar-edition-button option:selected').val();
            if (key === '--------') {
              applyToPage(original);
              // switch history
              latest = $.cloneObject(original, true);
              lwe.history.data = [];
              lwe.history.revision = 0;
              $('#everywhere-lwe-toolbar-undo-button')
                .addClass('everywhere-lwe-toolbar-button-disable');

              disableClearHistoryButton();
              disableShareButton();
            } else {
              current = key;
              latest = editions[current];
              $('.lwe-editable-pre').each(function(){
                createTip(this);
              });

              if (key === 'at-google' || key === 'at-bing') {
                if (key === 'at-google') at_api = 'google';
                else if (key === 'at-bing') at_api = 'bing';

                chrome.extension.sendRequest({ type: 'translate',
                                               api: at_api,
                                               src: original });
                editions[current] = {};
                lwe.history.data = [];
                lwe.history.revision = 0;
                
                disableClearHistoryButton();
                disableShareButton();
                
              } else {

                applyToPage(editions[current]);
                // switch history
                lwe.history.data = editions_history[current];
                lwe.history.revision = editions_history[current].length;

                $('#everywhere-lwe-toolbar-redo-button')
                  .addClass('everywhere-lwe-toolbar-button-disable');

                if (current === username) {
                  enableClearHistoryButton();
                  enableShareButton();
                }
              }
            }
          });
      }
    }
    
  };


  /**
   * Message receiving
   */
  chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
    switch (request.msgType) {
     case 'edit':
      lwe.history.redoTextEdit(request.message.message.uid, request.message.message.new_value);
      break;

     case 'edits':
      addTranslations(request.message.edits);
      break;

     default:
      break;
    }

    switch (request.type) {
     case 'translated':
      if (request.api === 'google') {
        editions['at-google'][request.uid] = request.translation;
      } else if (request.api === 'bing') {
        editions['at-bing'][request.uid] = request.translation;
      }
      $(request.uid).html(request.translation);
      break;

     default:
      break;
    }
  });


  var applyToPage = function(data) {
    for (var uid in data) {
      if (data.hasOwnProperty(uid)) {
        $(uid).html(data[uid]);
      }
    }
  };


  var switchUser = function(_username) {
    current = _username;
    
    
  };
  
  var switchTranslation = function(_username) {
    // select user's edit
    if ($.isEmptyObject(editions[_username]) === false) {

      current = _username;
      applyToPage(editions[current]);

      // history
      latest = editions[current];

      lwe.history.data = editions_history[current];
      lwe.history.revision = editions_history[current].length;
      $('#everywhere-lwe-toolbar-redo-button')
        .addClass('everywhere-lwe-toolbar-button-disable');
      $('#everywhere-lwe-toolbar-undo-button')
        .addClass('everywhere-lwe-toolbar-button-disable');

      $('#everywhere-lwe-toolbar-edition-button').val(current);

      if (current === username) {
        enableClearHistoryButton();
        enableShareButton();
      }

      $('.lwe-editable-pre').each(function(){
        createTip(this);
      });
      
    }
  };

  // connector
  chrome.extension.onConnect.addListener(function(_port) {
    port = _port;
    console.assert(port.name === "lwe");
    port.onMessage.addListener(function(msg) {
      console.log('receive action', msg.action);
      // Actions originating from the icon
      if (msg.action === "show") {
        showToolbar();
        switchTranslation(username);
      }
      else if (msg.action === "hide") {
        endTranslation();
        hideToolbar();
        port.postMessage({ action: "deactivate", status: "ok" });
      }
      else if (msg.action === "redo-text-edit") {
        lwe.history.redoTextEdit(msg.uid, msg.value);
      }
      else if (msg.action === 'latest') {
        console.log(msg.data);
        latest = msg.data;
        applyToPage(latest);
      }
    });
  });


  /**
   * reply to coediting invitation
   */
  var replyToInvitation = function(_message, reply) {
    var message = { owner: _message.owner,
                    coeditor: _message.coeditor };
    if (reply) {
      users[_message.coeditor].status = 'join';
      message.command = 'join';
    }
    else {
      message.command = 'deny';
    }

    chrome.extension.sendRequest({ msgType: 'share',
                                   url: document.location.href,
                                   message: message });
  };

  var invitationList = [];

  var toggleShare = function(coeditor) {
    $('#everywhere-lwe-share-dialog-online-user-'+coeditor+' img')
      .toggleClass('everywhere-lwe-share-dialog-online-user-shared');
    
    switch(users[coeditor].status) {

     case 'invite':
      users[coeditor].status = 'kick';
      break;

     case 'join':
      users[coeditor].status = 'kick';
      break;

     case 'kick':
      users[coeditor].status = 'invite';
      break;

     case undefined:
      users[coeditor].status = 'invite';
      break;

     default:
      break;

    }
  };

  var sendShareMessage = function() {
    for (var u in users) {
      if (users.hasOwnProperty(u)) {
        var message = { owner: username, coeditor: u };

        if (users[u].status === 'invite') {
          message.command = users[u].status;
          chrome.extension.sendRequest({ msgType: 'share',
                                         url: document.location.href,
                                         message: message });
        }
        else if (users[u].status === 'kick') {
          message.command = users[u].status;
          chrome.extension.sendRequest({ msgType: 'share',
                                         url: document.location.href,
                                         message: message });
        }
      }
    }
  };

  chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
    // create online users list
    if (request.msgType === 'join') {
      users[request.message.username] = { 'image_url': request.message.image_url };
    }
    else if (request.msgType === 'log') {
      var _users = request.message.users;
      for (i in _users) {
        if (_users.hasOwnProperty(i)) {
          users[_users[i].username] = { 'image_url': _users[i].image_url };
        }
      }
    }
    // messages about coediting
    else if (request.msgType === 'share') {
      var message = request.message.message;
      if (message.command === 'join') {
        if (message.coeditor !== username) {
          users[message.coeditor].status = 'join';
          createNotification('join',
                             'Message',
                             message.coeditor + ' has joined to co-editing team!'
                            );
        }
      }
      else if (message.command === 'invite') {
        createDialog(request.msgType,
                     'Invitation',
                     message.owner + ' invites you to translate this page together. Do you approve?',
                     function() {
                       replyToInvitation(message, true);
                       switchTranslation(message.owner);
                     },
                     function() {
                       replyToInvitation(message, false);
                     }
                    );
      }
      else if (message.command === 'deny') {
        if (message.coeditor !== username) {
          users[message.coeditor].status = undefined;
          createNotification('deny',
                             'Message',
                             message.coeditor + ' has denied to join co-editing team.'
                            );
        }
      }
      else if (message.command === 'kick') {
        users[message.coeditor].status = 'kick';
        $('#everywhere-lwe-share-dialog-online-user-'+message.coeditor+' img')
          .toggleClass('everywhere-lwe-share-dialog-online-user-shared');
      }
    }
  });

  // lwe
  var lwe_undefined;
  var lwe = {
	  /**
	   * environment variables and constants
	   */
	  env: {
		  current_mode: 'none',
		  debug_mode: true,
		  editable_text_elements: [
        'p','h1','h2','h3','h4','h5','h6','strong','em','abbr','acronym','address','bdo',
			  'blockquote','cite','q','code','ins','del','dfn','kbd','pre','samp','var',
        /*'br'*/,'b','i','tt','sub','sup',
			  'big','small',/*'hr'*/,'span','a','li','dt','dd','caption','label','legend']
		  // draggable_elements: [
      //   'p','h1','h2','h3','h4','h5','h6','strong','em','abbr','acronym','address','bdo',
			//   'blockquote','cite','q','code','ins','del','dfn','kbd','pre','samp','var',
      //   'hr','span','a','ul','ol','dt',
			//   'dd','caption','label','legend','div','span','p','code','cite','img','object',
      //   'table','form','input',
			//   'textarea','select','button','label','fieldset','legend'],
		  
		  // tags_structure: ['html','head','body','div','span'],
		  // tags_meta_informations: ['DOCTYPE','title','link','meta','style'],
		  // tags_text: [
      //   'p','h1','h2','h3','h4','h5','h6','strong','em','abbr','acronym','address',
      //   'bdo','blockquote',
			//   'cite','q','code','ins','del','dfn','kbd','pre','samp','var','br'],
		  // tags_links: ['a','base'],
		  // tags_images: ['img','area','map','object','param'],
		  // tags_lists: ['ul','ol','li','dl','dt','dd'],
		  // tags_tables: ['table','tr','td','th','tbody','thead','tfoot','col','colgroup','caption'],
		  // tags_forms: ['form','input','textarea','select','option','optgroup',
      //              'button','label','fieldset','legend'],
		  // tags_scripting: ['script','noscript'],
		  // tags_presentational: ['b','i','tt','sub','sup','big','small','hr']
	  },
    
	  /**
	   * Activate live editing on the current page
	   */
	  activate: function() {
		  with(lwe.f) {
			  markEditableElements();
			  applyEditableElements();
		  }
	  },

	  /**
	   * Deactivate live editing on the current page
	   */
	  deactivate: function() {
		  with(lwe.f) {
        unapplyEditableElements();
        unmarkEditableElements();
      }
	  },

	  /**
	   * History
	   */
	  history: {
      data: [],
      revision: 0,
      
		  add: function(action, uid, new_value, old_value) {
			  console.log("add");
        this.data[this.revision] = { action: action,
                                     uid: uid,
                                     new_value: new_value,
                                     old_value: old_value
                                   };
        this.revision++;
		  },
      
		  undo: function() {
        $('#everywhere-lwe-toolbar-redo-button')
          .removeClass('everywhere-lwe-toolbar-button-disable');

        this.revision--;
        if (this.revision <= 0) {
          this.revision = 0;
          $('#everywhere-lwe-toolbar-undo-button')
            .addClass('everywhere-lwe-toolbar-button-disable');
        }
			  // console.log("undo", this.data[this.revision].old_value);
        if (this.data[this.revision].uid) {
          $(this.data[this.revision].uid).html(this.data[this.revision].old_value);
        }
		  },
      
		  redo: function() {
        $('#everywhere-lwe-toolbar-undo-button')
          .removeClass('everywhere-lwe-toolbar-button-disable');

        $(this.data[this.revision].uid).html(this.data[this.revision].new_value);
			  // console.log("redo", this.data[this.revision].new_value);
        this.revision++;
        if (this.revision >= this.data.length-1) {
          this.revision = this.data.length-1;
          $('#everywhere-lwe-toolbar-redo-button')
            .addClass('everywhere-lwe-toolbar-button-disable');
        }
		  },

		  save: function() {
			  console.log("save");
		  },

		  load: function() {
			  console.log("load");
    	  document.getElementById('lwe-title').innerHTML = localStorage.urls;
		  },
      
		  /**
		   * Redo 
		   */
			redoTextEdit: function(uid, value) {
				//console.log('redoTextEdit', element, new_data);
				$(uid).effect('highlight');
				//console.log($(element));
				$(uid).html(value);
        latest[uid] = value;
			}
	  },

	  /**
	   * Utils
	   */
	  f: {
		  /**
		   * marks all the editable elements
		   */
		  markEditableElements: function() {
			  // with(lwe) {
				//   $.each(env.editable_text_elements, function(i, elmts) {
				// 	  $(elmts)
        //       .not(':regex(class, everywhere)')
        //       .not(':regex(id, everywhere)')
        //       .not('.lwe-not-editable')
        //       .not(':empty')
        //       .addClass('lwe-editable');
				//   });
			  // }
        $('.lwe-editable-pre')
          .addClass('lwe-editable')
          .removeClass('lwe-editable-pre');
		  },
		  /**
		   * unmarks all the editable elements
		   */
		  unmarkEditableElements: function() {
			  $('.lwe-editable').removeClass('lwe-editable');
		  },
		  /**
		   * applies the inline editing effect to all marked editable elements
		   */
		  applyEditableElements: function() {

			  with(lwe.f) {

          // // save original
          // if (init) {
	        //   $('.lwe-editable').each(function() {
          //     var uid = getElementUniqueId($(this));
          //     original[uid] = $(this).html();
          //   });
          //   init = false;
					//   // port.postMessage({ action: "original-text", value: originals });
          // }
          
          $('.lwe-editable').editable(
					  function(value, settings) {
              if (value !== this.revert) {
						    var uid = getElementUniqueId($(this));
                latest[uid] = value;
						    port.postMessage({ action: "edit-text",
                                   uid: uid,
                                   new_value: value,
                                   old_value: this.revert,
                                   // TODO 重かったら考え直す
                                   latest: latest });
						    lwe.history.add('edit-text', uid, value, this.revert);

                $('#everywhere-lwe-toolbar-undo-button')
                  .removeClass('everywhere-lwe-toolbar-button-disable');
              }
              return(value);
					  },
            {
						  cssclass: 'lwe-editable-textarea',
						  event: 'click',
						  type: 'autogrow',
              //tooltip: 'Click to edit.',
						  onblur: 'submit',
						  autogrow: {
							  lineHeight: 16,
							  minHeight: 32
						  }/*,
						     id: $(this).attr('id'),
						     classes: $(this).attr('class'),
						     tagName: $(this).attr('tagName')*/
					  }
				  );
         
				  /*$('img').editable(
					  function(value, settings) { 
						//console.log(this, value, settings);
						return(value);
					  },
					  {
						type: 'ajaxupload',
						tooltip: 'Click to change the picture...',
						onblur: 'submit'
					  }
				    );*/
				  deactivateLinks($('.lwe-editable'));
			  }
		  },
		  /**
		   * unapplies the inline editing effect to all marked editable elements
		   */
		  unapplyEditableElements: function() {
			  with(lwe.f) {
          $('.lwe-editable').editable('disable');
				  reactivateLinks($('.lwe-editable'));
			  }
		  },
		  /**
		   * deactivate all links
		   */
		  deactivateLinks: function(jQueryElmts) {
			  jQueryElmts.not('.lwe-keep-link').each(function(i, elmt) {
				  //console.log(i, elmt);
				  var cur_href = elmt.getAttribute('href');
				  if(cur_href!=lwe_undefined) {
					  elmt.setAttribute('lwe-href', cur_href);
					  elmt.setAttribute('href', 'javascript:void(0)');
				  }
				  var cur_onclick = elmt.getAttribute('onclick');
				  if(cur_onclick!=lwe_undefined) {
					  elmt.setAttribute('lwe-onclick', cur_onclick);
					  elmt.setAttribute('onclick', 'void(0)');
				  }
			  });
		  },
		  /**
		   * reactivate all links
		   */
		  reactivateLinks: function(jQueryElmts) {
			  jQueryElmts.not('.lwe-keep-link').each(function(i, elmt) {
				  var cur_href = elmt.getAttribute('lwe-href');
				  if(cur_href!=lwe_undefined) {
					  elmt.setAttribute('href', cur_href);
					  elmt.removeAttribute('lwe-href');
				  }
				  var cur_onclick = elmt.getAttribute('lwe-onclick');
				  if(cur_onclick!=lwe_undefined) {
					  elmt.setAttribute('onclick', cur_onclick);
					  elmt.removeAttribute('lwe-onclick');
				  }
			  });
		  },
		  /**
		   * get the selector that makes jQuery select the specified element only
		   */
		  getElementUniqueId: function(element, no_dom) {
			  // console.debug('getElementUniqueId %o', element);
			  with(lwe.f) {
				  // get the element's tag name
				  var tagName = element.get(0).tagName;
				  // console.debug('tagName %o', tagName);
				  // does the element have an id ?
				  var id = element.get(0).id;
				  // console.debug('id %o', id);
				  if(id!=lwe_undefined && id.length>0 && isSelectorUnique(tagName+'#'+id+':eq('+getElementPositionRelativeToParent(element, "")+')')) {
					  // the id is unique
					  return tagName+'#'+id+':eq('+getElementPositionRelativeToParent(element, "")+')';
				  }
				  // does the element have some classes ?
				  var classes = element.get(0).className;
				  // console.debug('classes %o', classes);
				  //$('#lwe-history').attr('class')
				  if(classes!=lwe_undefined) {
					  classes = classes.replace(/lwe-[a-zA-Z\-]+/g, '');
					  classes = classes.replace(/  /g, ' ');
					  classes = $.trim(classes);
					  var classes_str = '.'+classes.split(' ').join('.');
					  // console.debug('classes_str %o', classes_str);
					  if(classes_str.length>1 && isSelectorUnique(tagName+classes_str+':eq('+getElementPositionRelativeToParent(element, classes_str)+')')) {
						  // the class is unique
						  return tagName+classes_str+':eq('+getElementPositionRelativeToParent(element, classes_str)+')';
					  }
				  }
				  if(no_dom!=lwe_undefined && no_dom) {
					  return tagName+':eq('+getElementPositionRelativeToParent(element, "")+')';
				  } else {
					  // we have to go one step up: let's get the parent's unique id
					  return getElementUniqueIdInDOM(element);
				  }
			  }
		  },
		  /**
		   * get the selector that makes jQuery select the specified element only (DOM edition)
		   */
		  getElementUniqueIdInDOM: function(element) {
			  // console.debug('getElementUniqueIdInDOM %o', element);
			  // console.warn('TODO: could be enhanced with %a', 'http://docs.jquery.com/Traversing/parents#expr');
			  //TODO: Enhance with the 'parents' method
			  var parent = element.parent();
			  if(parent.size()==1 && parent.get(0).tagName!=lwe_undefined) {
				  // there are still some parents
				  return lwe.f.getElementUniqueIdInDOM(parent)+' > '+lwe.f.getElementUniqueId(element, true);
			  } else {
				  // this is the root
				  return lwe.f.getElementUniqueId(element, true);
			  }
		  },
		  /**
		   * get the relative element position to its parent
		   */
		  getElementPositionRelativeToParent: function(element, options) {
			  // console.debug('getElementPositionRelativeToParent %o %o', element, options);
			  var parent = element.parent();
			  // there is no parent => so it's the first element
			  if(parent.get(0).tagName==lwe_undefined) {
				  return 0;
			  }
			  element.addClass('lwe-dom-curr-elmt');
			  // get the siblings with the same tagName
			  var siblings = parent.children(element.get(0).tagName+options);
			  var pos;
			  for(pos=0; pos<siblings.size(); pos++) {
				  var cur_elmt = siblings.get(pos);
				  if(cur_elmt!=lwe_undefined && $(cur_elmt).hasClass('lwe-dom-curr-elmt'))
					  break;
			  }
			  element.removeClass('lwe-dom-curr-elmt');
			  return pos;
		  },
		  /**
		   * does this selector refers to a unique element?
		   */
		  isSelectorUnique: function(selector) {
			  // console.debug('isSelectorUnique %o', selector);
			  if(selector!=lwe_undefined && selector.length>0) {
				  return ($(selector).size()==1);
			  }
			  return false;
		  }
	  }
  };

  var createTip = function(elem) {
    var tip;
    $(elem).mouseenter(function(e) {
      var uid = lwe.f.getElementUniqueId($(this));
      var temp = $('<div>').html(original[uid]);
      var text = temp.text();
      $('.everywhere-lwe-tip-original-text').remove();
      tip = $('<div>')
        .addClass('everywhere-lwe-tip')
        .addClass('everywhere-lwe-tip-original-text')
        .css('top', e.pageY + 20)
        .css('left', e.pageX);

      $('body')
        .append(
          tip
            .append(
              $('<div>')
                .append(
                  $('<div>')
                    .addClass('everywhere-lwe-tip-title')
                    .text('Original Text'))
                .append(
                  $('<button>')
                    .addClass('everywhere-lwe-toolbar-button')
                    .text('Close')
                    .click(function() {
                      tip.remove();
                    }))
                .append(
                  $('<div>')
                    .addClass('everywhere-lwe-tip-text')
                    .text($('<div>').html(original[uid]).text()))
            ));
    });
    
    $(elem).mouseleave(function(e) {
      tip.remove();
    });
  };
  
  var saveOriginal = function() {
    $.each(lwe.env.editable_text_elements, function(i, e) {
      $(e)
        .not(':regex(class, everywhere)')
        .not(':regex(id, everywhere)')
        .not('.lwe-not-editable')
        .not(':empty')
        .addClass('lwe-editable-pre');
    });
    
    $('.lwe-editable-pre').each(function(){
      var uid = lwe.f.getElementUniqueId($(this));
      original[uid] = $(this).html();
    });
  };
  
  var include = function(js, cb) {
    //document.write('<script type="text/javascript"
    $('head')
      .append('<script type="text/javascript" src="'+js+'"></script>');
    cb && cb();
  };
  
  var initialize = function() {
    saveOriginal();

    createToolbar();
    createShareDialog();

    chrome.extension.sendRequest({ getLanguage: true }, function(language_code) {
      $('#everywhere-lwe-toolbar-language-button').val(language_code);
    });
                                 
    chrome.extension.sendRequest({ getUsername: true }, function(_username) {
      username = _username;
    });
    
  };

  initialize();
})();