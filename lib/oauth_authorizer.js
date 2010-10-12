function getAuthPin() {
  chrome.extension.sendRequest({check_pin_needed: 1}, function(response) {
    var fullText = $("div.message-content:not(.new_div)").text();
    if(fullText.match(/Everywhere!/i) && !fullText.match(/denied/i)) {
      var pin = $.trim($("#oauth_pin").text());
      $("div.message-content").hide();
      var message = "<h2>" + "Please wait, authorizing Everywhere!..." + "</h2>" + chrome.i18n.getMessage("yourPIN", pin);
      var newDiv = $("<div class='message-content new_div'>").
        html(message).
        insertAfter("div.message-content");

      var nextOpacity = 1;
      function animateLoop() {
        if(nextOpacity == 1) nextOpacity = 0.3;
        else nextOpacity = 1;
        $("div.message-content.new_div").animate({opacity: nextOpacity}, 500, null, animateLoop);
      }
      animateLoop();

      chrome.extension.sendRequest({cr_oauth_pin: pin}, function(response) {
        $("div.message-content.new_div").css('opacity', 1);
        $("div.message-content.new_div").stop();
        if(response) {
          message = "<h2>Congratulations, you've been successfully authenticated. Enjoy Everywhere!</h2>" +
                    "<div id='oauth_pin' style='font-size: 2.5em;'>Everywhere! authorized!</div>";
          $("div.message-content.new_div").html(message);
        } else {
          message = "<h2>Oops... Something went wrong. Please, try clicking Everywhere! icon again.</h2>";
          $("div.message-content.new_div").html(message);
        }
      });
    }
  });
}
if (document.location.href == 'http://twitter.com/oauth/authorize' ||
   document.location.href == 'https://twitter.com/oauth/authorize') {
  getAuthPin();
}
