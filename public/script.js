document.addEventListener('DOMContentLoaded', function() {
    const items = document.querySelectorAll('li');
    items.forEach(item => {
        item.addEventListener('click', function() {
        });
    });
});

function getCookie(name) {
    let matches = document.cookie.match(new RegExp(
      "(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"
    ));
    return matches ? decodeURIComponent(matches[1]) : undefined;
}