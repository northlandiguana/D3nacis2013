var request;

//JavaScript AJAX
request.onreadystatechange = function(){
    if (request.readyState === 4) {
        function callback(request.responseText);
    }
};
request.open('GET', 'example.csv', true);
request.send(null);

//jQuery AJAX
$.ajax({
	url: 'example.csv',
	data: csvdata,
	success: callback
});

//D3 AJAX
d3.csv('example.csv', callback);
