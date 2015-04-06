var redis = require('redis')
var multer  = require('multer')
var express = require('express')
var fs      = require('fs')
var app = express()

var myRedisPort = parseInt(process.argv.slice(3));
var otherRedisPort = parseInt(process.argv.slice(4));

var color = process.argv.slice(5);

var client = redis.createClient(myRedisPort, '127.0.0.1', {});
var otherClient = redis.createClient(otherRedisPort, '127.0.0.1', {});

var mostRecentLstKey = "mostRecentLst";
var imgLstKey = "images";

var MIRROR = true;

app.use(express.static(__dirname + '/public'));

///////////// WEB ROUTES

// Add hook to make it easier to get all visited URLS.
app.use(function(req, res, next) 
{
	console.log(req.method, req.url);
	client.lpush(mostRecentLstKey, req.url);
	client.ltrim(mostRecentLstKey, 0 , 4);

	next(); // Passing the request to the next handler in the stack.
});

app.get('/upload', function(req, res){
	res.sendFile(__dirname + '/public/upload.html');
})


app.post('/upload',[ multer({ dest: './uploads/'}), function(req, res){
	console.log(req.body) // form fields
	console.log(req.files) // form files
	if( req.files.image )
	{
		fs.readFile( req.files.image.path, function (err, data) {
			if (err) throw err;
			var img = new Buffer(data).toString('base64');
			client.lpush(imgLstKey, img);
			if (MIRROR){
				otherClient.lpush(imgLstKey, img);
			}
		});
	}
	else
	{
		res.status(406).end()
	}
    res.status(204).end()
 }]);

app.get('/meow', function(req, res) {
	res.writeHead(200, {'content-type':'text/html'});

	client.lpop(imgLstKey, function(err, imagedata){
		res.write("<h1>\n<img src='data:my_pic.jpg;base64,"+imagedata+"'/>");
		res.end();
	})
	if (MIRROR){
		otherClient.lpop(imgLstKey, function(err, imagedata){});
	}

})

app.get('/', function(req, res){
	{
		res.send(color);
	}
});

app.get('/switch', function(req, res){
	if(!MIRROR){ //Don't copy if images are already mirrored
		client.lrange(imgLstKey, 0, -1, function(err, value){
			for(var i = 0; i < value.length; i++){
				otherClient.rpush(imgLstKey, value[i]);
			}
		})
	}
	res.send("Switched from " + color);
	//Migrate to other redis client
});

app.get('/get', function(req, res){
	{
		client.get("theKeyToHappiness", function(err,value){
			if(err) throw err;
			console.log(value);
			res.send(value);
		});
	}
});


app.get('/set', function(req, res){
	client.set("theKeyToHappiness", "Don't worry, be happy");
	client.expire("theKeyToHappiness", 10);
	res.send('set');
});

app.get('/recent', function(req, res){
			client.lrange(mostRecentLstKey, 0, 5, function(err, value){
				res.send(value);
				console.log("Most Recent:" + value);
	})
});


// HTTP SERVER
// 2nd argument specifies which port

var portNum = parseInt(process.argv.slice(2));
 var server = app.listen(portNum, function () {

   var host = server.address().address
   var port = server.address().port

   console.log('Example app listening at http://%s:%s', host, port)
 })

