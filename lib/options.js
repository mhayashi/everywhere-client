(function () {
  var loadOptions = function () {
    $('input[name=tweetable]').attr('checked', JSON.parse(localStorage.tweetable));
  };

  var saveOptions = function () {
    if ($('input[name=tweetable]').attr('checked')) {
      localStorage.tweetable = true;
    } else {
      localStorage.tweetable = false;
    }

    $('#message').text('Saved!');
    $('#message').fadeOut('slow');
    chrome.extension.getBackgroundPage().refresh(true);
  };

  $('button#save').click(saveOptions);
  loadOptions();
})();
