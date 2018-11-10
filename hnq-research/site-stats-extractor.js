// https://stackexchange.com/sites#traffic
var message = '';
$('div.lv-item').each(function() {
	let href = $(this).find('a')[0].getAttribute('href');
	let traffic = $(this).find('div.lv-stats-box:contains(visits/day) > span > span')[0];
	let visits = parseInt(traffic.getAttribute('title').replace(/,/g, ''));	
    message += 'UPDATE sites SET visits = ' + visits + ' WHERE url = \'' + href + '\';\n';
});
console.log(message);