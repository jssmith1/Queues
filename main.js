var child_process = require("child_process");

child_process.spawn("node", ['app.js', '3001'], {
	stdio:'inherit'
});
child_process.spawn("node", ['app.js', '3002'],{
	stdio:'inherit'
});
child_process.spawn("node", ['proxy.js'], {
	stdio:'inherit'
});

