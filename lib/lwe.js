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
 */

(function() {
  // message receiver
  chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
    if (request.msgType === 'edit') {
      lwe.history.f.redoTextEdit(request.message.message.uid, request.message.message.new_value);
    }
  });

  // connector
  var port;
  chrome.extension.onConnect.addListener(function(_port) {
    port = _port;
    console.assert(port.name == "lwe");
    port.onMessage.addListener(function(msg) {
      
      // Actions originating from the popup
      
      if (msg.action == "activate") {
        showToolbar();
      } else if (msg.action == "deactivate") {
        hideToolbar();
      } else if (msg.action == "redo-text-edit") {
        lwe.history.f.redoTextEdit(msg.uid, msg.value);
      }
      
    });
  });

  var owner = '';
  chrome.extension.sendRequest({getUsername: true}, function(response) {
    owner = response;
  });
  var editing = false;
  var users = {};
  chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
    if (request.msgType === 'join') {
      users[request.message.username] = request.message.image_url;
    }
  });

  function toggleShare(username) {
    if (users[username].shared) {
      users[username].shared = false;
      chrome.extension.sendRequest({ msgType: 'share',
                                     url: document.location.href,
                                     owner: owner,
                                     status: false,
                                     username: username });
    } else {
      users[username].shared = true;
      chrome.extension.sendRequest({ msgType: 'share',
                                     url: document.location.href,
                                     owner: owner,
                                     status: true,
                                     username: username });
    }
  }
  function createToolbar() {
    $('body')
      .prepend(
        $('<div>')
          .attr('id', 'everywhere-lwe-toolbar')
          .append(
            $('<button>')
              .attr('id', 'everywhere-lwe-toolbar-edit-button')
              .attr('class', 'everywhere-lwe-toolbar-button')
              .text('Edit'))
          .append(
            $('<button>')
              .attr('id', 'everywhere-lwe-toolbar-clear-button')
              .attr('class', 'everywhere-lwe-toolbar-button')
              .text('Clear History'))
          // .append(
          //   $('<button>')
          //     .attr('id', 'everywhere-lwe-toolbar-restore-button')
          //     .attr('class', 'everywhere-lwe-toolbar-button')
          //     .text('Show Original'))
          // .append(
          //   $('<button>')
          //     .attr('id', 'everywhere-lwe-toolbar-share-button')
          //     .attr('class', 'everywhere-lwe-toolbar-button')
          //     .text('Share'))
          // .append(
          //   $('<select>')
          //     .attr('id', 'everywhere-lwe-toolbar-version-button')
          //     .attr('class', 'everywhere-lwe-toolbar-button')
          //     .append(
          //       $('<option>')
          //         .val('Version')
          //         .text('Version')))
      );

    /*
     * Event handlers
     */
    // 'Edit'
    $('#everywhere-lwe-toolbar-edit-button').click(function() {
      if (editing) {
        $(this).css({'background': '#000', 'color': '#e3e3e3'});
        lwe.deactivate();
        port.postMessage({action: "deactivate", status: "ok"});
        /*} else if (msg.action == "undo") {
          lwe.history.undo();
          port.postMessage({action: "undo", status: "ok"});
          } else if (msg.action == "redo") {
          lwe.history.redo();
          port.postMessage({action: "redo", status: "ok"});
          } else if (msg.action == "save") {
          lwe.history.save();
          port.postMessage({action: "save", status: "ok"});
          } else if (msg.action == "load") {
          lwe.history.load();
          port.postMessage({action: "load", status: "ok"});*/
      } else {
        $(this).css({'background': '#555', 'color': '#f00'});
        lwe.activate();
        port.postMessage({action: "activate", status: "ok"});
      }
      editing = !editing;
    });
    // 'Share'
    $('#everywhere-lwe-toolbar-share-button').click(function() {
      var i = 0;
      for (var u in users) {
        if (users.hasOwnProperty(u)) {
          $('#everywhere-lwe-share-dialog-online-users')
            .append(
              $('<div>')
                .addClass('everywhere-lwe-share-dialog-online-user')
                .append(
                  $('<img>')
                    .attr('src', users[u])
                    .click(function() {
                      toggleShare($(this).parent().text());
                    }))
                .append(
                  $('<div>')
                    .text(u))
            );
          i++;
        }
      }
      $('#everywhere-lwe-share-dialog-online')
        .text(i+' online');
      $('#everywhere-lwe-share-dialog').show();
    });

    // 'Clear History'
    $('#everywhere-lwe-toolbar-clear-button').click(function() {
      createDialog('clear',
                   'Clear all edit history of this page',
                   'Are you sure?',
                   function() {
                     port.postMessage({ action: "clear", status: "ok" });
                   });
    });
  }
  
  var createDialog = function(id, title, message, callback) {
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
                callback();
              }))
          .append(
            $('<button>')
              .addClass('everywhere-lwe-toolbar-button')
              .text('Cancel')
              .click(function() {
                $('#everywhere-lwe-'+id+'-dialog').hide();
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
              .text('Share this edit with others'))
          .addClass('everywhere-lwe-share-dialog-text')
          .append(
            $('<div>')
              .attr('id', 'everywhere-lwe-share-dialog-online'))
              .addClass('everywhere-lwe-share-dialog-text')
          .append(
            $('<div>')
              .attr('id', 'everywhere-lwe-share-dialog-online-users'))
          .append(
            $('<button>')
              .attr('id', 'everywhere-lwe-share-dialog-close-button')
              .addClass('everywhere-lwe-toolbar-button')
              .text('Close')
              .click(function() {
                $('#everywhere-lwe-share-dialog').hide();
              })
          )
      );
    $('#everywhere-lwe-share-dialog').hide();
  };
  
  function showToolbar() {
    $('html').css({postion: 'relative', 'margin-top': '30px'});
    // $('img').each(function() {
    //   if ($(this).css('position') === 'absolute') {
    //     $('this').css('margin-top', 30);
    //   }
    // });
    $('#everywhere-lwe-toolbar')
      .css('display', 'block');
  }
  
  function hideToolbar() {
    $('html').css('margin-top', '0px');
    $('#everywhere-lwe-toolbar')
      .css('display', 'none');
  }

  
  createToolbar();
  createShareDialog();
  
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
			  'blockquote','cite','q','code','ins','del','dfn','kbd','pre','samp','var','br','b','i','tt','sub','sup',
			  'big','small','hr','span','a','li','dt','dd','caption','label','legend'],
		  draggable_elements: [
        'p','h1','h2','h3','h4','h5','h6','strong','em','abbr','acronym','address','bdo',
			  'blockquote','cite','q','code','ins','del','dfn','kbd','pre','samp','var','hr','span','a','ul','ol','dt',
			  'dd','caption','label','legend','div','span','p','code','cite','img','object','table','form','input',
			  'textarea','select','button','label','fieldset','legend'],
		  
		  tags_structure: ['html','head','body','div','span'],
		  tags_meta_informations: ['DOCTYPE','title','link','meta','style'],
		  tags_text: [
        'p','h1','h2','h3','h4','h5','h6','strong','em','abbr','acronym','address','bdo','blockquote',
			  'cite','q','code','ins','del','dfn','kbd','pre','samp','var','br'],
		  tags_links: ['a','base'],
		  tags_images: ['img','area','map','object','param'],
		  tags_lists: ['ul','ol','li','dl','dt','dd'],
		  tags_tables: ['table','tr','td','th','tbody','thead','tfoot','col','colgroup','caption'],
		  tags_forms: ['form','input','textarea','select','option','optgroup','button','label','fieldset','legend'],
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
		  //TODO
	  },
	  /**
	   * Deactivate live editing on the current page
	   */
	  deactivate: function() {
		  with(lwe.f) {
        unapplyEditableElements();
        unmarkEditableElements();
      }
		  //TODO
	  },
	  /**
	   * History
	   */
	  history: {
		  /**
		   * Undo the last action
		   */
		  undo: function() {
			  console.log("undo");
		  },
		  /**
		   * Redo the last action
		   */
		  redo: function() {
			  console.log("redo");
		  },
		  /**
		   * Save the last action
		   */
		  save: function() {
			  console.log("save");
		  },
		  /**
		   * Load the last action
		   */
		  load: function() {
			  console.log("load");
    	  document.getElementById('lwe-title').innerHTML = localStorage.urls;
		  },
		  /**
		   * History functions
		   */
		  f: {
			  redoTextEdit: function(element, new_data) {
				  //console.log('redoTextEdit', element, new_data);
				  $(element).effect('highlight');
				  //console.log($(element));
				  $(element).html(new_data);
			  },
			  clearAll: function(element) {
			    console.log("clearAll");
          
			  }
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
            if ($(this).attr('id') &&
                $(this).attr('id').match(/everywhere/)) {
              console.debug('id');
              // do nothing
            } else if ($(this).attr('class') &&
                       ($(this).attr('class').match(/everywhere/) ||
                        $(this).attr('class').match(/ui-tooltip/))) {
              console.debug('class');
              // do nothing
            } else {
					    $(elmts).not('.lwe-not-editable').not(":empty").addClass('lwe-editable');
            }
				  });
			  }
		  },
		  /**
		   * unmarks all the editable elements
		   */
		  unmarkEditableElements: function() {
			  $('.lwe-editable').removeClass('lwe-editable');
		  },
		  /**
		   * marks all the draggable elements
		   */
		  markDraggableElements: function() {
			  with(lwe) {
				  $.each(env.draggable_elements, function(i, elmts) {
					  $(elmts).not('.lwe-not-draggable').addClass('lwe-draggable');
				  });
			  }
		  },
		  /**
		   * unmarks all the draggable elements
		   */
		  unmarkDraggableElements: function() {
			  $('.lwe-draggable').removeClass('lwe-draggable').removeClass('ui-draggable');
		  },
		  /**
		   * applies the inline editing effect to all marked editable elements
		   */
		  applyEditableElements: function() {
			  with(lwe.f) {
				  $('.lwe-editable').editable(
					  function(value, settings) {
						  var uid = getElementUniqueId($(this));
						  port.postMessage({action: "edit-text", uid: uid, new_value: value, old_value: this.revert});
						  //lwe.history.add('edit-text', uid, value, this.revert);
              return(value);
					  },
            {
						  cssclass : 'lwe-editable-textarea',
						  event : 'dblclick',
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
			  console.debug('getElementUniqueId %o', element);
			  with(lwe.f) {
				  // get the element's tag name
				  var tagName = element.get(0).tagName;
				  console.debug('tagName %o', tagName);
				  // does the element have an id ?
				  var id = element.get(0).id;
				  console.debug('id %o', id);
				  if(id!=lwe_undefined && id.length>0 && isSelectorUnique(tagName+'#'+id+':eq('+getElementPositionRelativeToParent(element, "")+')')) {
					  // the id is unique
					  return tagName+'#'+id+':eq('+getElementPositionRelativeToParent(element, "")+')';
				  }
				  // does the element have some classes ?
				  var classes = element.get(0).className;
				  console.debug('classes %o', classes);
				  //$('#lwe-history').attr('class')
				  if(classes!=lwe_undefined) {
					  classes = classes.replace(/lwe-[a-zA-Z\-]+/g, '');
					  classes = classes.replace(/  /g, ' ');
					  classes = $.trim(classes);
					  var classes_str = '.'+classes.split(' ').join('.');
					  console.debug('classes_str %o', classes_str);
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
			  console.debug('getElementUniqueIdInDOM %o', element);
			  console.warn('TODO: could be enhanced with %a', 'http://docs.jquery.com/Traversing/parents#expr');
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
			  console.debug('getElementPositionRelativeToParent %o %o', element, options);
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
			  console.debug('isSelectorUnique %o', selector);
			  if(selector!=lwe_undefined && selector.length>0) {
				  return ($(selector).size()==1);
			  }
			  return false;
		  }
	  }
  };
})();