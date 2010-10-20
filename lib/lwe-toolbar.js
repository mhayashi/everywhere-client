// toolbar
$('body').css('margin-top', '30px');
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
          .attr('id', 'everywhere-lwe-toolbar-restore-button')
          .attr('class', 'everywhere-lwe-toolbar-button')
          .text('Show Original'))
      .append(
        $('<select>')
          .attr('id', 'everywhere-lwe-toolbar-version-button')
          .attr('class', 'everywhere-lwe-toolbar-button')
          .append(
            $('<option>')
              .val('Version')
              .text('Version')))
  );
