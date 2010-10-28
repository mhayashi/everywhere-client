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

(function() {
  var init = true;
  var original = {};
  var latest = {};
  var editions = {};
  
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

  var createToolbar = function () {

    $('body')
      .prepend(
        $('<div>')
          .attr('id', 'everywhere-lwe-toolbar')
          // .append(
          //   $('<button>')
          //     .attr('id', 'everywhere-lwe-toolbar-edit-button')
          //     .attr('class', 'everywhere-lwe-toolbar-button')
          //     .text('Edit'))
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
              .text('Clear History'))
          .append(
            $('<select>')
              .attr('id', 'everywhere-lwe-toolbar-edition-button')
              .attr('class', 'everywhere-lwe-toolbar-button')
              .append(
                $('<option>')
                  .text('Editions')))
      );

    /**
     * Event handlers
     */
    // // 'Edit'
    // $('#everywhere-lwe-toolbar-edit-button').click(function() {
    //   if (editing) {
    //     $(this).css({'background': '#000', 'color': '#e3e3e3'});
    //     lwe.deactivate();
    //     port.postMessage({action: "deactivate", status: "ok"});
    //     /*} else if (msg.action == "undo") {
    //       lwe.history.undo();
    //       port.postMessage({action: "undo", status: "ok"});
    //       } else if (msg.action == "redo") {
    //       lwe.history.redo();
    //       port.postMessage({action: "redo", status: "ok"});
    //       } else if (msg.action == "save") {
    //       lwe.history.save();
    //       port.postMessage({action: "save", status: "ok"});
    //       } else if (msg.action == "load") {
    //       lwe.history.load();
    //       port.postMessage({action: "load", status: "ok"});*/
    //   } else {
    //     $(this).css({'background': '#555', 'color': '#f00'});
    //     lwe.activate();
    //     port.postMessage({action: "activate", status: "ok"});
    //   }
    //   editing = !editing;
    // });
    
    // 'Undo' Button
    $('#everywhere-lwe-toolbar-undo-button').click(function() {
      lwe.history.undo();
    });

    // 'Redo' Button
    $('#everywhere-lwe-toolbar-redo-button').click(function() {
      lwe.history.redo();
    });
    
    // 'Share' Button
    $('#everywhere-lwe-toolbar-share-button').click(function() {
      var people = 0;
      for (var u in users) {
        if (users.hasOwnProperty(u)) {
          // create online user list
          if ($('#everywhere-lwe-share-dialog-online-user-'+u).length === 0) {
            $('#everywhere-lwe-share-dialog-online-users')
              .append(
                $('<div>')
                  .addClass('everywhere-lwe-share-dialog-online-user')
                  .attr('id', 'everywhere-lwe-share-dialog-online-user-'+u)
                  .append(
                    $('<img>')
                      .attr('src', users[u].image_url)
                      .click(function() {
                        toggleShare($(this).parent().text());
                      }))
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

    // 'Show Original' Button
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

    // 'Clear History' Button
    $('#everywhere-lwe-toolbar-clear-button').click(function() {
      createDialog('clear',
                   'Clear all edit history of this page',
                   'Are you sure?',
                   function() {
                     port.postMessage({ action: "clear", status: "ok" });
                   });
    });
    
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

  var createDialog = function(id, title, message, callback_yes, callback_no) {
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
                if (callback_yes) callback_yes();
              }))
          .append(
            $('<button>')
              .addClass('everywhere-lwe-toolbar-button')
              .text('Cancel')
              .click(function() {
                $('#everywhere-lwe-'+id+'-dialog').hide();
                if (callback_no) callback_no();
              }))
          );
  };

  var createShareDialog = function() {
    $('body')
      .append(
        $('<div>')
          .css('margin-left', window.innerWidth/2-250)
          .attr('id', 'everywhere-lwe-share-dialog')
          .append(
            $('<div>')
              .text('Choose co-editors'))
          .addClass('everywhere-lwe-share-dialog-text')
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
  
  var showToolbar = function() {
    $('html').css({postion: 'absolute', 'margin-top': '30px'});
    $('#everywhere-lwe-toolbar')
      .css('display', 'block');
  };
  
  var hideToolbar = function() {
    $('html').css('margin-top', '0px');
    $('#everywhere-lwe-toolbar')
      .css('display', 'none');
  };

  /**
   * Add Editions to select button when receiving edits
   */
  var addEditions = function(edits) {
    editions = edits;
    for (key in edits) {
      if (edits.hasOwnProperty(key)) {
        $('#everywhere-lwe-toolbar-edition-button')
          .append(
            $('<option>')
              .text(key)
              .val(key)
          )
          .change(function(){
            var key = $('#everywhere-lwe-toolbar-edition-button option:selected').val();
            if (key) {
              applyToPage(editions[key]);
            }
          });
      }
      // key handler
      
    }

    
  };
  
  // message receiver
  chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
    switch (request.msgType) {
     case 'edit':
      lwe.history.redoTextEdit(request.message.message.uid, request.message.message.new_value);
      break;

     case 'edits':
      addEditions(request.message.edits);
      break;

     default:
      break;
    }
  });

  var hasToolbarCreated = false;

  var applyToPage = function(data) {
    console.log('apply');
    for (var uid in data) {
      if (data.hasOwnProperty(uid)) {
        $(uid).html(data[uid]);
      }
    }
  };

  // connector
  var port;
  chrome.extension.onConnect.addListener(function(_port) {
    port = _port;
    console.assert(port.name === "lwe");
    port.onMessage.addListener(function(msg) {
      
      // Actions originating from the icon
      if (msg.action === "activate") {
        // create toolbar
        if (!hasToolbarCreated) {
          createToolbar();
          createShareDialog();
          hasToolbarCreated = true;
        }
        showToolbar();
        lwe.activate();
        port.postMessage({ action: "activate", status: "ok" });

        // if (editing) {
        //   $(this).css({'background': '#000', 'color': '#e3e3e3'});
        //   lwe.deactivate();
        //   port.postMessage({action: "deactivate", status: "ok"});
        //   /*} else if (msg.action == "undo") {
        //     lwe.history.undo();
        //     port.postMessage({action: "undo", status: "ok"});
        //     } else if (msg.action == "redo") {
        //     lwe.history.redo();
        //     port.postMessage({action: "redo", status: "ok"});
        //     } else if (msg.action == "save") {
        //     lwe.history.save();
        //     port.postMessage({action: "save", status: "ok"});
        //     } else if (msg.action == "load") {
        //     lwe.history.load();
        //     port.postMessage({action: "load", status: "ok"});*/
        // } else {
        //   $(this).css({'background': '#555', 'color': '#f00'});
        //   lwe.activate();
        //   port.postMessage({action: "activate", status: "ok"});
        // }
        // editing = !editing;

      } else if (msg.action === "deactivate") {
        hideToolbar();
        lwe.deactivate();
        port.postMessage({action: "deactivate", status: "ok"});
      } else if (msg.action === "redo-text-edit") {
        lwe.history.redoTextEdit(msg.uid, msg.value);
      } else if (msg.action === 'latest') {
        console.log(msg.data);
        latest = msg.data;
        applyToPage(latest);
      }
      
    });
  });

  var owner = '';
  chrome.extension.sendRequest({getUsername: true}, function(response) {
    owner = response;
  });
  var editing = false;
  var users = {};


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
        var message = { owner: owner, coeditor: u };

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
        if (message.coeditor !== owner) {
          users[message.coeditor].status = 'join';
          createNotification('join',
                             'Message',
                             message.coeditor + ' has joined to co-editing team!'
                            );
        }
      }
      else if (message.command === 'invite') {
        createDialog(request.msgType,
                     'Co-edit Invitation',
                     message.owner + ' invites you to edit this page together. Do you approve?',
                     function() {
                       replyToInvitation(message, true);
                     },
                     function() {
                       replyToInvitation(message, false);
                     }
                    );
      }
      else if (message.command === 'deny') {
        if (message.coeditor !== owner) {
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
        'br','b','i','tt','sub','sup',
			  'big','small','hr','span','a','li','dt','dd','caption','label','legend'],
		  draggable_elements: [
        'p','h1','h2','h3','h4','h5','h6','strong','em','abbr','acronym','address','bdo',
			  'blockquote','cite','q','code','ins','del','dfn','kbd','pre','samp','var',
        'hr','span','a','ul','ol','dt',
			  'dd','caption','label','legend','div','span','p','code','cite','img','object',
        'table','form','input',
			  'textarea','select','button','label','fieldset','legend'],
		  
		  tags_structure: ['html','head','body','div','span'],
		  tags_meta_informations: ['DOCTYPE','title','link','meta','style'],
		  tags_text: [
        'p','h1','h2','h3','h4','h5','h6','strong','em','abbr','acronym','address',
        'bdo','blockquote',
			  'cite','q','code','ins','del','dfn','kbd','pre','samp','var','br'],
		  tags_links: ['a','base'],
		  tags_images: ['img','area','map','object','param'],
		  tags_lists: ['ul','ol','li','dl','dt','dd'],
		  tags_tables: ['table','tr','td','th','tbody','thead','tfoot','col','colgroup','caption'],
		  tags_forms: ['form','input','textarea','select','option','optgroup',
                   'button','label','fieldset','legend'],
		  tags_scripting: ['script','noscript'],
		  tags_presentational: ['b','i','tt','sub','sup','big','small','hr']
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
        this.revision--;
        if (this.revision <= 0) this.revision = 0;
			  // console.log("undo", this.data[this.revision].old_value);
        $(this.data[this.revision].uid).html(this.data[this.revision].old_value);
		  },
      
		  redo: function() {
        $(this.data[this.revision].uid).html(this.data[this.revision].new_value);
			  // console.log("redo", this.data[this.revision].new_value);
        this.revision++;
        if (this.revision >= this.data.length-1) this.revision = this.data.length-1;
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
			  with(lwe) {
				  $.each(env.editable_text_elements, function(i, elmts) {
            // exclude extensions' elements
            // var id = $(elmts).attr('id');
            // var cl = $(elmts).attr('class');
            // console.log(elmts, id, cl);
            // if (id && id.match(/everywhere/)) {
            //   console.debug('exclude', id);
            //   // do nothing
            // } else if (cl && (cl.match(/everywhere/) ||
            //                   cl.match(/ui-tooltip/))) {
            //   console.debug('exclude', cl);
            //   // do nothing
            // }
            // // editable
            // else {
					    $(elmts)
                .not(':regex(class, everywhere)')
                .not(':regex(id, everywhere)')
                .not('.lwe-not-editable')
                .not(':empty')
                .addClass('lwe-editable');
            // }
				  });
			  }
		  },
		  /**
		   * unmarks all the editable elements
		   */
		  unmarkEditableElements: function() {
			  $('.lwe-editable').removeClass('lwe-editable');
		  },
		  // /**
		  //  * marks all the draggable elements
		  //  */
		  // markDraggableElements: function() {
			//   with(lwe) {
			// 	  $.each(env.draggable_elements, function(i, elmts) {
			// 		  $(elmts).not('.lwe-not-draggable').addClass('lwe-draggable');
			// 	  });
			//   }
		  // },
		  // /**
		  //  * unmarks all the draggable elements
		  //  */
		  // unmarkDraggableElements: function() {
			//   $('.lwe-draggable').removeClass('lwe-draggable').removeClass('ui-draggable');
		  // },
		  /**
		   * applies the inline editing effect to all marked editable elements
		   */
		  applyEditableElements: function() {
			  with(lwe.f) {

          // save original
          if (init) {
	          $('.lwe-editable').each(function(i, e) {
              var uid = getElementUniqueId($(this));
              original[uid] = $(this).html();
            });
            init = false;
					  // port.postMessage({ action: "original-text", value: originals });
          }
          
          $('.lwe-editable').editable(
					  function(value, settings) {
						  var uid = getElementUniqueId($(this));
              latest[uid] = value;
						  port.postMessage({ action: "edit-text",
                                 uid: uid,
                                 new_value: value,
                                 old_value: this.revert,
                                 // TODO 重かったら考え直す
                                 latest: latest });
						  lwe.history.add('edit-text', uid, value, this.revert);
              return(value);
					  },
            {
						  cssclass: 'lwe-editable-textarea',
						  event: 'click',
						  type: 'autogrow',
              tooltip: 'Click to edit.',
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
		   * applies the draggable effect to all marked draggable elements
		   */
		  applyDraggableElements: function() {
			  with(lwe.f) {
				  console.group('lwe-draggable objects list');
				  $('.lwe-draggable').draggable({ /*handle: 'div'*/});
				      console.groupEnd();
				  deactivateLinks($('.lwe-draggable'));
			  }
		  },
		  /**
		   * unapplies the draggable effect to all marked draggable elements
		   */
		  unapplyDraggableElements: function() {
			  with(lwe.f) {
				  $('.lwe-panel').remove();
				  console.debug('removed the panels');
				  reactivateLinks($('.lwe-draggable'));
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

  var initialize = function() {
    if (!hasToolbarCreated) {
      createToolbar();
      createShareDialog();
      hasToolbarCreated = true;
    }
  };

  initialize();
})();