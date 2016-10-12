var request = require('request');
var cheerio  = require('cheerio');
var rl = require('readline');
var fs = require('fs');

var i = rl.createInterface({input: process.stdin, output: process.stdout});

var timer, ikea = {};

ikea.url = process.argv[2];

if(ikea.url == undefined){
	console.log('\nERROR: URL missing.');
	process.exit();
}

var urlData = ikea.url.match(/.ikea.com\/([a-z]{2})\/([a-z]{2})\/(.+)\/products\/([A-Za-z0-9+])/);

if(urlData !== null){

	ikea.country = urlData[1];
	ikea.lang = urlData[2];

	//Remove trailing slash & get last string (If you change color, you have another url http://www.ikea.com/at/de/catalog/products/S09006408/#/S09006408)
	ikea.productId = ikea.url.replace(/\/$/, "").split('/').pop();

	request(ikea.url, function(err, res, html){
		$ = cheerio.load(html);

		ikea.product = $('#schemaProductName').text().split(',')[0];

		console.log('IKEA Stores');
		console.log('======================================');

		ikea.stores = [];

		$('#ikeaStoreNumber1 option').not('[value="choose"]').each(function(){
			console.log(' ' + $(this).val() + ' : \t' + $(this).text());
			ikea.stores[$(this).val()] = $(this).text();
		});

		console.log('======================================');

		i.question('\nEnter your IKEA store number: ', function(storeId){

			if(ikea.stores[storeId] !== undefined){
				ikea.storeId = storeId;
				ikea.availabilityUrl = 'http://www.ikea.com/' + ikea.country + '/' + ikea.lang + '/iows/catalog/availability/' + ikea.productId;

				console.log('\nMonitoring "' + ikea.product + '" stock at IKEA "' + ikea.stores[ikea.storeId] + '".');
				checkStockAndNotify(); //Initial Check
				timer = setInterval(function(){ checkStockAndNotify() }, 900000); //15 minutes interval (900000)
			}else{
				console.log('\nERROR: Invalid store id (only numbers allowed).');
				process.exit();
			}
		});
	});

}else{
	console.log('\nERROR: URL not valid.');
	process.exit();
}

function checkStockAndNotify(){
	request(ikea.availabilityUrl, function(err, res, xml){

		$ = cheerio.load(xml);
		var stockCnt = $('availability > localStore[buCode="'+ikea.storeId+'"] > stock > availableStock').text();

		if(stockCnt > 0){
			var notifier = require('node-notifier');

			notifier.notify({
				title: 'IKEA Notifier',
				message: ikea.product + '\n' +
						 stockCnt + ' Item(s) in stock at ' + ikea.stores[ikea.storeId] + '.',
				sound: true,
				icon: __dirname + '/icon.png'
			});

			console.log('\nIKEA Notifier:\n' + ikea.product + '\n' + stockCnt + ' Item(s) in stock at ' + ikea.stores[ikea.storeId] + '.');

			clearInterval(timer);
			i.close();
		}
	});
}
