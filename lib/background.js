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

  if (dev_clearhistory) {
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k.match(/http:\/\//) || k.match(/https:\/\//) ) {
        localStorage.removeItem(k);
      }
      localStorage.removeItem('urls');
    }
  }

  var port;
  var activated = false;

  var collabolating = function () {
    // TODO
    return true;
  };

  // Listen to a tab change and update the action icon accordingly
  chrome.tabs.onUpdated.addListener(function (tabId, change, tab) {
    console.log("listenToTabsUpdates", tabId, change, tab);
    if (change.status === "complete") {
      lwe.f.setActiveIcon(tab);
      activated = false;
      
      localStorage.current_tab = tab;
      
      // if(!lwe.f.isValidUrl(tab.url)) {
      //   //lwe.f.setInactiveIcon(tab);
      //   //chrome.browserAction.setPopup({tabId: tab.id, popup: ""});
      // } else {
      //   //lwe.f.setActiveIcon(tab);
      //   //chrome.browserAction.setPopup({tabId: tab.id, popup: "popup.html"});
      //   if(lwe.f.isUrlPersisted(tab.url)) {
      //     lwe.history.load(tab);
      //     // lwe.f.setEditedIcon(tab);
      //   }
      // }
    }
  });

  chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
    if (request.original) {
      var originals = JSON.parse(localStorage[sender.tab.url+':original']);
      sendResponse(originals);
    } else if (request.latest) {
      sendResponse(JSON.parse(localStorage[sender.tab.url+':latest']));
    }
  });

  // Listen to clicks on the action chrome
  chrome.browserAction.onClicked.addListener(function(tab) {
    //console.log("listenToClick", tab);

    port = chrome.tabs.connect(tab.id, {name: "lwe"});

    // Event handler for the messages from the content script
    port.onMessage.addListener(function(msg) {
      console.log("Returned from action", msg.action, "with status", msg.status);

      if (msg.status === "ok") {

        switch(msg.action) {

         case "activate":
          lwe.history.load(tab);
          lwe.f.persistUrl(tab.url);
          lwe.f.setEditedIcon(tab);
          lwe.flash.success("Activated! Double-click any text element to change its content.");
          activated = true;
          break;

         case "deactivate":
          lwe.f.setActiveIcon(tab);
          lwe.flash.success("Deactivated!");
          activated = false;
          break;

         case "clear":
          lwe.history.clear(tab);
          break;
        }
      }
      else {
        // Actions originating from the content-script connector
        switch(msg.action) {

         case "edit-text": // save and send edit
          var options = { type: "edit-text", uid: msg.uid,
                          new_value: msg.new_value, old_value: msg.old_value };
          console.log('aaa');
          lwe.f.saveTextEdit(tab.url, options);
          lwe.f.sendTextEdit(tab.url, options);
          break;

        }
      }
    });

    if (!lwe.f.isValidUrl(tab.url)) {
      lwe.flash.error("This page cannot be edited.");
    } else {
      if (activated) {
        port.postMessage({action: "deactivate"});
      } else {
        port.postMessage({action: "activate"});
      }
    }
    
  });


  var lwe = {
    /**
     * Flash desktop notifications
     */
    flash: {
      error: function(message) {
        lwe.f.showNotification("error", "Live Website Editor", message);
      },
      warning: function(message) {
        lwe.f.showNotification("warning", "Live Website Editor", message);
      },
      success: function(message) {
        lwe.f.showNotification("success", "Live Website Editor", message);
      }
    },
    /**
     * History
     */
    history: {
      /**
       * Undo the last action
       */
      /*undo: function() {
        console.log("undo");
        },*/
      /**
       * Redo the last action
       */
      /*redo: function() {
        console.log("redo");
        },*/
      /**
       * Save the last action
       */
      /*save: function() {
        console.log("save");
        },*/
      /**
       * Load the last action
       */
      load: function(tab) {
        // console.log("load", tab);
        with(lwe.f) {
          var history = getHistory(tab.url);
          // console.log(history);
          for(var i = 0, len = history.length; i < len; i++) {
            var change = history[i];
            // console.log(change);
            switch(change.type) {
             case "edit-text":
              var port = chrome.tabs.connect(tab.id, {name: "lwe"});
              port.postMessage({action: "redo-text-edit", uid: change.uid, value: change.new_value});
              break;
            }
          }
        }
      },
      /**
       * Clear history
       */
      clear: function(tab) {
        console.log("clear", tab);
        localStorage.removeItem(tab.url);
      }
    },
    /**
     * Utils
     */
    f: {
      isValidUrl: function(url) {
        return url != null && /https?:\/\/.+/.test(url);
      },
      showNotification: function(icon, title, message) {
        if (window.webkitNotifications.checkPermission() == 0) {
          var notification = window.webkitNotifications.createNotification(chrome.extension.getURL("img/flash/"+icon+".png"), title, message);
          notification.show();
          setTimeout(function() {
            notification.cancel();
          }, 10000);
        } else {
          window.webkitNotifications.requestPermission();
        }
      },
      setEditedIcon: function(tab) {
        with(lwe.f) {
          _setIcon("edit", tab);
        }
      },
      setActiveIcon: function(tab) {
        with(lwe.f) {
          _setIcon("active", tab);
        }
      },
      setInactiveIcon: function(tab) {
        with(lwe.f) {
          _setIcon("inactive", tab);
        }
      },
      _setIcon: function(icon, tab) {
        chrome.browserAction.setIcon({
          'path': "img/"+icon+".png",
          'tabId': tab.id
        });
      },
      _getCurrentUrl: function() {
        chrome.tabs.getSelected(null, function(tab) {
          localStorage.current_url = tab.url;
        });
        return localStorage.current_url;
      },
      persistUrl: function(url) {
        with(lwe.f) {
          if(isUrlPersisted(url)) {
            // don't bother adding it to the list since it's already in
            return;
          }
          var urls_array = _getPersistedUrls();
          urls_array = urls_array.concat(url);
          localStorage.urls = JSON.stringify(urls_array);
        }
      },
      unpersistUrl: function(url) {
        with(lwe.f) {
          var urls_array = _getPersistedUrls();
          for(var i=0; i<urls_array.length; i++) {
            if(urls_array[i] == url) {
              urls_array.slice(i, 1);
            }
          }
          localStorage.urls = JSON.stringify(urls_array);
        }
      },
      isUrlPersisted: function(url) {
        with(lwe.f) {
          var urls_array = _getPersistedUrls();
          for(var i=0; i<urls_array.length; i++) {
            if(urls_array[i] == url) {
              return true;
            }
          }
        }
        return false;
      },
      _getPersistedUrls: function() {
        var array = (localStorage.urls != null) ? JSON.parse(localStorage.urls) : new Array;
        if(array == null) {
          array = new Array;
        }
        return array;
      },
      getHistory: function(url) {
        var array = (localStorage[url] != null) ? JSON.parse(localStorage[url]) : new Array;
        if(array == null) {
          array = new Array;
        }
        return array;
      },
      setHistory: function(url, history) {
        localStorage[url] = JSON.stringify(history);
      },
      saveTextEdit: function(url, data) {
        console.log("saveTextEdit", url, data);
        with(lwe.f) {
          var history = getHistory(url);
          history = history.concat(data);
          setHistory(url, history);
        }
      },
      sendTextEdit: function(url, data) {
        console.log("sendTextEdit", url, data);
        // TODO: how not to call background.html's function directly?
        var vurl = validateURL(url);
        if (vurl) {
          sendToServer("edit", vurl, data);
        }
        // chrome.extension.getBackgroundPage().sendToServer();
        // chrome.extension.sendRequest({ msgType: "edit", url: url, message: data });
      }
    }
  };
})();