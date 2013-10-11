/*********************************************************
Written for Cartographic Perspectives: On the Horizon
Modified from an Interactive Cartography and Geovisualization laboratory exercise given in Spring, 2013
Copyright (c) October 2013, Carl Sack and the University of Wisconsin-Madison Cartography Program
MIT License
**********************************************************/

//global variables
var keyArray = [ //array of property keys	
		"Population",
		"Tax Rate",
		"Average Per Capita Income",
		"Average Hourly Wage"
	], 
	expressed = keyArray[0], //initial attribute expressed
	colorsArray = [ //array of color classes
		"#D7191C",
		"#FDAE61",
		"#FFFFBF",
		"#ABD9E9",
		"#2C7BB6"
	];
	
window.onload = setMap(); //start script once HTML is loaded

function setMap(){

	//map frame dimensions
	var width = 800;
	var height = 500;
	
	//create a new svg element with the above dimensions
	var map = d3.select("body")
		.append("svg")
		.attr("width", width)
		.attr("height", height)
		.attr("class", "map");

	//--------------------------------------
	
	//create albers equal area conic projection
	var projection = d3.geo.albers()
		.center([0, 33.6])
		.rotate([81, 0, 0])
		.parallels([29.5, 45.5])
		.scale(8100)
		.translate([width / 2, height / 2]);
	
	//create svg path generator using the projection
	var path = d3.geo.path()
		.projection(projection);
		
	queue() //use queue.js to parallelize asynchronous data loading for cpu efficiency
		.defer(d3.csv, "../data/sc_economy.csv") //load attributes data from csv
		.defer(d3.json, "../data/states.json") //load geometry from states topojson
		.defer(d3.json, "../data/sc_economy.json") //load geometry from counties topojson
		.await(callback);

	function callback(error, csvData, statesJson, countiesJson){

		console.log(csvData)
		var recolorMap = colorScale(csvData); //retrieve color scale generator
		drawLegend(csvData); //create the legend

		//variable for csv to json data transfer
		var jsonCounties = countiesJson.objects.counties.geometries;
			
		//loop through csv data to assign each csv county's values to json county properties
		for (var i=0; i<csvData.length; i++) {		
			var csvCounty = csvData[i]; //the current county's attributes
			var csvId = csvCounty.OBJECTID; //county id from csv
			//loop through json counties to assign csv data to the right county
			
			for (var a=0; a<jsonCounties.length; a++){
				var props = jsonCounties[a].properties; //json attributes object, for brevity
				//where county ids match, attach csv data to json object
				if (props.OBJECTID == csvId){
					//one more for loop to assign all key/value pairs to json object
					for (var key in csvCounty){
						var numval = parseFloat(csvCounty[key]); //convert corresponding csv attribute value to float
						//assign key and value pair to json object, distinguishing between string and float values
						if (isNaN(numval)==false){
							props[key] = numval; 
						} else {
							props[key] = csvCounty[key];
						};
					};
					break; //stop looking through the json counties
				};
			};
		};
		
		//add U.S. states geometry to map			
		var states = map.append("path") //create SVG path element
			.datum(topojson.feature(statesJson, statesJson.objects.states)) //bind states data to path element
			.attr("class", "states") //assign class for styling states
			.attr("d", path); //project data as geometry in svg

		//add counties to map as enumeration units colored by data
		var counties = map.selectAll(".counties")
			.data(topojson.feature(countiesJson, countiesJson.objects.counties).features) //bind counties data to path element
			.enter() //create elements
			.append("g") //give each county its own g element
			.attr("class", "counties") //assign class for additional styling
			.append("path") //append each county's path element to g element
			.attr("class", function(d) { return d.properties.County}) //set the county name as element id for later reference
			.attr("d", path) //project data as geometry in path element
			.style("fill", function(d) { //color enumeration units
				return choropleth(d, recolorMap); 
			})
			.on("mousemove", moveLabel)
			.on("mouseover", highlight)
			.on("mouseout", dehighlight)
			.append("desc") //append the current color as a desc element
				.text(function(d) { 
					return choropleth(d, recolorMap); 
				});
	};
};

function drawLegend(csvData) {
	
	//create a legend div
	var legend = d3.select("body")
		.append("div")
		.attr("id", "legend");
	
	//create the legend title in a child div
	var legtitle = legend.append("div")
		.attr("id","legtitle")
		.html("<h2>Indicator</h2>")
		
	//create a child div to hold the color scale
	var legendColors = legend.append("div")
		.attr("id", "legendColors");
		
	//create and color each div in the color scale
	var colorbox = legendColors.selectAll(".colorbox")
		.data(colorsArray.reverse()) //highest value on top
		.enter()
		.append("div")
		.attr("class","colorbox")
		.style("background-color", function(d){
			return d;
		});
	colorsArray.reverse(); //change the array back when done
		
	//create a div for the number scale
	var legendScale = legend.append("div")
		.attr("id", "legendScale");
	
	//fill in the legend with dynamic data	
	updateLegend(csvData);
	dropdown(csvData);
};

function dropdown(csvData){
	
	var menu = d3.select("#legtitle")
		.append("div")
		.attr("id","dropdown")
		.append("select")
		.on("change",function(){ changeAttribute(this, csvData) })
		.selectAll("option")
		.data(keyArray)
		.enter()
		.append("option")
		.html(function(d){ return d })
		.attr("value", function(d){ return d });
};

function changeAttribute(option, csvData){

	expressed = option.options[option.selectedIndex].value;

	//recolor the map
	d3.selectAll(".counties") //select every county
		.select("path")
		.style("fill", function(d) { //color enumeration units
			return choropleth(d, colorScale(csvData)); //->
		})
		.select("desc") //replace the color text in each county's desc element
			.text(function(d) {
				return choropleth(d, colorScale(csvData)); //->
			});
			
	updateLegend(csvData); //update the legend
};

function updateLegend(csvData){
	
	//generate an array of legend values
	var colScale = colorScale(csvData); //get the quantile scale generator
	var quantiles = colScale.quantiles(); //get the quantile bounds
	var databounds = computeBounds(csvData); //get the upper and lower data bounds
	var datascale = [databounds[1]]; //create an array variable for numbers with upper limit
	//add middle quantile bounds to array
	for (var i=quantiles.length-1; i>=0; i--){
		datascale.push(quantiles[i]); 
	};
	datascale.push(databounds[0]); //add lower limit to array
	
	var legend = d3.select("#legend"); //select the legend div
	
	//create a separate div to hold each number in the number scale
	var legendNum = legend.select("#legendScale")
		.selectAll(".legendNum")
		.data(datascale)
		.enter()
		.append("div")
		.attr("class","legendNum")
		.html(function(d){
			return Math.round(d)
		});
		
	//update the numbers according to the current datascale
	legend.selectAll(".legendNum")
		.html(function(d){ 
			return format(d);
		});
};

function colorScale(csvData){

	//create quantile classes with color scale		
	var color = d3.scale.quantile() //designate quantile scale generator
		.range(colorsArray); //set colors array as range
	
	var databounds = computeBounds(csvData); 
	color.domain(databounds); //set bounds as domain
	
	return color; //return the color scale generator
};

function choropleth(d, recolorMap){
	
	//get data value
	var value = d.properties[expressed];
	//if value exists, assign it a color; otherwise assign gray
	if (value) {
		return recolorMap(value); //recolorMap holds the colorScale generator
	} else {
		return "#ccc";
	};
};

function computeBounds(csvData){
	
	//set min and max values for current dataset
	var datamin = d3.min(csvData, function(d){
		return Number(d[expressed]);
	});
	var datamax = d3.max(csvData, function(d){
		return Number(d[expressed]);
	});
	
	return [datamin,datamax]; //array with upper and lower bounds
}

function format(value){
	
	//format the value's display according to the attribute
	if (expressed != "Population"){
		value = "$"+roundRight(value);
	} else {
		value = roundRight(value);
	};
	
	return value;
};

function roundRight(number){
	
	if (number>=100){
		var num = Math.round(number);
		return num.toLocaleString();
	} else if (number<100 && number>=10){
		return number.toPrecision(4);
	} else if (number<10 && number>=1){
		return number.toPrecision(3);
	} else if (number<1){
		return number.toPrecision(2);
	};
};

function highlight(data){
	
	var props = data.properties; //standardize json or csv data
	var county = props.County; //county name for convenient access
	var value = props[expressed]; //current attribute value for convenient access
	
	//format the attribute value
	value = format(value);
	
	d3.selectAll(".map")
		.selectAll("."+county) //select the current county in the DOM
			.style("fill", "#000"); //set the enumeration unit fill to black
	
	var labelAttribute = "<h1>"+value+"</h1><br><b>"+county+"</b>"; //html string for attribute in dynamic label
	
	//create info label div
	var infolabel = d3.select("body")
		.append("div") //create the label div
		.attr("class", "infolabel") //for styling label
		.attr("id", county+"label") //for future access to label div
		.html(labelAttribute) //add text
};

function dehighlight(data){
	
	var props = data.properties; //standardize json or csv data
	var county = props.County; //county name for convenient access
	
	var prov = d3.selectAll(".map")
		.selectAll("."+county); //designate selector variable for brevity
	var fillcolor = prov.select("desc").text(); //access original color from desc
	prov.style("fill", fillcolor); //reset enumeration unit to orginal color
	
	d3.select("#"+county+"label").remove(); //remove info label
};

function moveLabel() {
	
	var x = d3.event.clientX+10; //horizontal label coordinate based mouse position stored in d3.event
	var y = d3.event.clientY-75; //vertical label coordinate
	d3.select(".infolabel") //select the label div for moving
		.style("margin-left", x+"px") //reposition label horizontal
		.style("margin-top", y+"px"); //reposition label vertical
};