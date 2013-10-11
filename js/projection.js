/*********************************************************
Written for Cartographic Perspectives: On the Horizon
Modified from an Interactive Cartography and Geovisualization laboratory exercise given in Spring, 2013
Copyright (c) October 2013, Carl Sack and the University of Wisconsin-Madison Cartography Program
MIT License
**********************************************************/

var centerLong = 0,
	centerLat = 33.6,
	rotateLong = 81,
	rotateLat = 0,
	parallel1 = 29.5,
	parallel2 = 45.5,
	scale = 200,
	width = 650,
	height = 550,
	countriesJson;

$(document).ready(setQueue()); //start script once HTML is loaded

function setQueue(){

	$('#sliderCenterLong').noUiSlider({
		range: [-180,180],
		start: 0,
		handles: 1,
		slide: function(){
			onslide({'centerLong': $('#sliderCenterLong').val()}, this);
		}
	});
	$('#sliderCenterLat').noUiSlider({
		range: [-90,90],
		start: 33.6,
		handles: 1,
		slide: function(){
			onslide({'centerLat': $('#sliderCenterLat').val()}, this);
		}
	});
	$('#sliderRotateLong').noUiSlider({
		range: [-180,180],
		start: 81,
		handles: 1,
		slide: function(){
			onslide({'rotateLong': $('#sliderRotateLong').val()}, this);
		}
	});
	$('#sliderRotateLat').noUiSlider({
		range: [-90,90],
		start: 0,
		handles: 1,
		slide: function(){
			onslide({'rotateLat': $('#sliderRotateLat').val()}, this);
		}
	});
	$('#sliderParallel1').noUiSlider({
		range: [0,45],
		start: 29.5,
		handles: 1,
		slide: function(){
			onslide({'parallel1': $('#sliderParallel1').val()}, this);
		}
	});
	$('#sliderParallel2').noUiSlider({
		range: [25,90],
		start: 45.5,
		handles: 1,
		slide: function(){
			onslide({'parallel2': $('#sliderParallel2').val()}, this);
		}
	});
	$('#sliderScale').noUiSlider({
		range: [0,5000],
		start: 200,
		handles: 1,
		slide: function(){
			onslide({'scale': $('#sliderScale').val()}, this);
		}
	});

	queue() //use queue.js to parallelize asynchronous data loading for cpu efficiency
		.defer(d3.json, "../data/countries.json") //load geometry from countries topojson
		.await(callback);
}

function callback(error, json) {

	countriesJson = json;
	setMap(countriesJson);
};

function project(){
	//create albers equal area conic projection
	var projection = d3.geo.albers()
		.center([centerLong, centerLat])
		.rotate([rotateLong, rotateLat, 0])
		.parallels([parallel1, parallel2])
		.scale(scale)
		.translate([width / 2, height / 2]);

	//create svg path generator using the projection
	var path = d3.geo.path()
		.projection(projection);

	return path;
};

function setMap(countriesJson) {

	d3.selectAll("svg").data([]).exit().remove();

	//create a new svg element with the above dimensions
	var map = d3.select("body")
		.append("a")
		.attr("href", "d3-6.html")
		.append("svg")
		.attr("width", width)
		.attr("height", height)
		.attr("class", "map");

	var path = project();

	//add U.S. countries geometry to map			
	var countries = map.append("path") //create SVG path element
		.datum(topojson.feature(countriesJson, countriesJson.objects.countries)) //bind countries data to path element
		.attr("class", "countries") //assign class for styling countries
		.attr("d", path); //project data as geometry in svg
};

function onslide(parameter, container){
	
	var val;

	for (key in parameter){
		val = parameter[key];
		window[key] = val;
		var path = project();
		d3.select("svg")
			.select("path")
			.attr("d", path);
	};
	$(container).qtip({
		content: val
	})
};