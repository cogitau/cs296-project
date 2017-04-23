"use strict";

/*
in real life this is a bad idea. but we're kinda limited here, because otherwise
this seems to produce a lot of scoping errors that show up as "unexpected NaN"
*/
var data;

/* Boilerplate jQuery */
$(function () {
	$.get("res/uiuc_demographics_2005_15.csv")
		.done(function (csvData) {
			data = d3.csvParse(csvData);
			visualize(data);
		})
		.fail(function (e) {
			alert("Failed to load CSV file!");
		});
});

/* Visualize the data in the visualize function */
var visualize = function (data) {
	// 	console.log(data);

	data = data.filter(function (d) {
		return d["Fall"] == "2015"; // probably want to change this at some point
		/*
		Don't use triple equals here, because we don't import the year as a number
		also, "Fall" => "year", but the CSV is formatted oddly.
		 */
	});

	// == BOILERPLATE ==
	var margin = { top: 50, right: 50, bottom: 50, left: 50 },
		width = 1000 - margin.left - margin.right,
		height = 800 - margin.top - margin.bottom; // TODO fix

	var svg = d3.select("#chart")
		.append("svg")
		.attr("width", width + margin.left + margin.right)
		.attr("height", height + margin.top + margin.bottom)
		.style("width", width + margin.left + margin.right)
		.style("height", height + margin.top + margin.bottom)
		.append("g")
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	/*
		The data right now has a circle for every single line on the CSV, which
		has multiple of the same major. They need to be combined (using pandas? idk)
		so that there is only one circle per major (not forgetting to add together
		the values of all the duplicate rows). That way there will only be one
		circle per major. -- I think someone was working on this
	*/

	var padding = 2, // separation between same-color nodes
		clusterPadding = 4; // separation between different-color nodes

	// https://bl.ocks.org/mbostock/7881887
	// https://bl.ocks.org/shancarter/f621ac5d93498aa1223d8d20e5d3a0f4
	// or just google d3 clustered force layout

	// Haven't done anything with the majors and colleges vars yet.
	// I think they'll come in handy sometime. -Jeannelle
	var majors = _.map(data, "Major Code");
	majors = _.uniq(majors);

	var colleges = _.map(data, "College");
	colleges = _.uniq(colleges);

	// tooltip code for ease of use
	var tip = d3.tip()
		.attr('class', 'd3-tip')
		.html(function (d) {
			return d["Fall"] + " - " + d["College"] + "/" + d["Major Name"];
		});
	svg.call(tip)

	// color scale??? can we reconcile it with the below?
	var color = d3.scaleSequential(d3.interpolateRainbow);

	var clusters = new Array(colleges.length)
	var maxRadius = 0;
	
	// generate nodes
	var nodes = data.map(function(d) {
		var i = colleges.indexOf(d["College"]),
			r = parseInt(d["Total"]) ** 0.5 * 0.8 + 1;
		
		d.cluster = i * 1.0 / clusters.length;
		d.radius = r;
		
		var dist = Math.random() ** 2 * 150 + Math.max((8 - r) * 50, 0);
		// spread out smaller ones to the outer edge
		d.x = Math.cos((i + Math.random()) / colleges.length * 2 * Math.PI) * dist + width / 2 + Math.random();
		d.y = Math.sin((i + Math.random()) / colleges.length * 2 * Math.PI) * dist + height / 2 + Math.random();
		
		if (!clusters[i] || (r > clusters[i].radius)) clusters[i] = d;
		if (maxRadius < d.radius) maxRadius = d.radius;
		return d;
	});
	
	var node = svg.selectAll('circle')
		.data(nodes)
		.enter().append('circle')
		// styling
		.style("fill", function (d) {
			return color(d.cluster);
		})
		.style("stroke", function (d) {
			return d3.color(color(d.cluster)).darker(1.5);
		})
		.style("stroke-width", 1)
		// positioning
		.attr("r", function (d) {
			return 0; // d.radius;
		})
		.attr("cx", (d) => d.x)
		.attr("cy", (d) => d.y)
		// tooltip
		.on("mouseover", tip.show)
		.on('mouseout', tip.hide);
	
	// more gradual
	node.transition()
		.duration(1000)
		.delay(function(d, i) { return i * 10; })
		.attrTween("r", function(d) {
		var i = d3.interpolate(0, d.radius);
		return function(t) { return d.radius = i(t); };
		});
	
	function layoutTick (e) {
		node
			.attr('cx', function (d) { return d.x; })
			.attr('cy', function (d) { return d.y; })
	} 
	
	// the strength parameters might need some tuning
	
	var simulation = d3.forceSimulation(nodes)
		.alphaDecay(0.001)
// 		.velocityDecay(0.2)
		.force("gravity", d3.forceManyBody().strength(1.2))
		.force("center", d3.forceCenter(width / 2, height / 2))
		.force("collide", d3.forceCollide().radius(function(d) { return d.radius + 1.2; }).iterations(4))
		.on("tick", layoutTick);

	

};
