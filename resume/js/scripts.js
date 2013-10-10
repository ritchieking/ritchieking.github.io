var timeline = $("#timeline")
	divWidth = timeline.width()
	divHeight = timeline.height()

var detail = $("#detail");
	detailWidth = detail.width()
	detailHeight = detail.height()

var selected = 4;

var margin = {top: 25, right: 50, bottom: 10, left: 100};
    width = divWidth - margin.left - margin.right,
    height = divHeight - margin.top - margin.bottom;

var svg = d3.select("#timeline").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

var desGroup = d3.select("#detail").append("svg")
	.attr("width",detailWidth)
	.attr("height",detailHeight)
	.attr("opacity",1)
  
var desDiv = desGroup.append("foreignObject")
	.attr("x",0)
	.attr("y",0)
	.attr("width",detailWidth)
	.attr("height",detailHeight)
  .append("xhtml:div")

var parseDate = d3.time.format("%d-%b-%y").parse

var x = d3.time.scale()
    .range([0, width]);

var bumper = 12;

var y = d3.scale.ordinal()
	.domain(["school","engineering","writing","wandg","graphics","play"])
	.range([10,
		height/2-1.5*bumper,
		height/2-0.5*bumper,
		height/2+0.5*bumper,
		height/2+1.5*bumper,
		height-10]);

var axisPoints = [
	{year:"2007", date:"1-Jan-07"},
	{year:"08", date:"1-Jan-08"},
	{year:"09", date:"1-Jan-09"},
	{year:"10", date:"1-Jan-10"},
	{year:"11", date:"1-Jan-11"},
	{year:"12", date:"1-Jan-12"},
	{year:"13", date:"1-Jan-13"}
]

var textBumper = 5,
	lineBumper = 25;

svg.append("line")
	.attr("x1",-margin.left)
	.attr("x2",width)
	.attr("y1",y("engineering") - lineBumper)
	.attr("y2",y("engineering") - lineBumper)
	.attr("stroke", "#B3B3B3")
	.attr("stroke-width", 1)

svg.append("line")
	.attr("x1",-margin.left)
	.attr("x2",width)
	.attr("y1",y("graphics") + lineBumper)
	.attr("y2",y("graphics") + lineBumper)
	.attr("stroke", "#B3B3B3")
	.attr("stroke-width", 1)

svg.append("text")
	.attr("class","categoryLabels")
	.text("school")
	.attr("x",-margin.left)
	.attr("y", 10+textBumper)

svg.append("text")
	.attr("class","categoryLabels")
	.text("work")
	.attr("x",-margin.left)
	.attr("y", height/2+textBumper)

svg.append("text")
	.attr("class","categoryLabels")
	.text("play")
	.attr("x",-margin.left)
	.attr("y", height-10+textBumper)





d3.csv("data/timeline.csv", function(error, data){

	data.forEach(function(d){
		d.beg = parseDate(d.beg)
		d.end = parseDate(d.end)
	})

	x.domain([
		d3.min(data, function(d) { return d.beg; }),
		d3.max(data, function(d) { return d.end; })	
	])

	svg.selectAll(".axis")
		.data(axisPoints)
	  .enter().append("line")
	  	.attr("x1", function(d) { return x(parseDate(d.date)); })
		.attr("x2", function(d) { return x(parseDate(d.date)); })
		.attr("y1", -10)
		.attr("y2", height+10)
		.attr("stroke", "#E6E6E6")
		.attr("stroke-width", 1)

	svg.selectAll(".axisLabels")
		.data(axisPoints)
	  .enter().append("text")
	  	.attr("class","axisLabels")
	  	.attr("x", function(d) { return x(parseDate(d.date)); })
	  	.attr("y", function(d, i) { return -15; })
	  	.attr("text-anchor","middle")
	  	.text(function(d) { return d.year; })

	svg.append("text")
		.attr("class","axisLabels")
		.text("ENGINEERING")
		.attr("x", x(parseDate("01-Jul-07")))
		.attr("y", y("engineering") - 3)
	
	svg.append("text")
		.attr("class","axisLabels")
		.text("UNDERGRAD")
		.attr("x", x(parseDate("01-Sep-06")))
		.attr("y", y("school") - 3)
	
	svg.append("text")
		.attr("class","axisLabels")
		.text("J-SCHOOL")
		.attr("x", x(parseDate("01-Sep-10")))
		.attr("y", y("school") - 3)
		
	svg.append("text")
		.attr("class","axisLabels")
		.text("WRITING")
		.attr("x", x(parseDate("01-Sep-11")))
		.attr("y", y("writing") - 3)
		
	svg.append("text")
		.attr("class","axisLabels")
		.text("GRAPHICS")
		.attr("x", x(parseDate("01-Dec-11")))
		.attr("y", y("graphics") + 17)

	svg.append("text")
		.attr("class","axisLabels")
		.text("BOTH")
		.attr("x", x(parseDate("01-Aug-12")))
		.attr("y", y("wandg") - 3)
	
	svg.append("text")
		.attr("class","axisLabels")
		.text("SKI BUMMING")
		.attr("x", x(parseDate("01-Nov-09")))
		.attr("y", y("play") - 3)


	var lines = svg.selectAll(".rect")
		.data(data)
	  .enter().append("rect")
	  	.attr("class","rect")
	    .attr("x", function(d) { return x(d.beg); })
	    .attr("width", function(d) { return x(d.end)-x(d.beg); })
	    .attr("y", function(d) { return y(d.cat); })
	    .attr("height", 7 )
	    .attr("fill", function(d, i) { 
	    	if (i==selected) {
	    		return "#000000"
	    	}
	    	else {
	    		return "#B3B3B3"
	    	}
		})
	    .attr("stroke", "white")
	    .on("click", function(d, i) {
	    	selected = i;
	    	update();
	    })

	svg.append("text")

	var des = desDiv.selectAll(".div")
		.data(data)
	  .enter().append("div")
	  	.html(function(d) { return d.des; })
	  	.attr("class", function(d, i) { 
	  		if (i == selected) {
	  			return "shown"
	  		}
	  		else {
	  			return "hidden"
	  		}
	  	})

	var update = function() {
		lines.transition()
			.duration(400)
			.attr("fill",function(d,i){
				if (i === selected){
					return "#000000"
				}
				else{
					return "#B3B3B3"
				}
			});

		desGroup.transition()
			.duration(200)
			.attr("opacity",0)

		des.transition()
			.delay(200)
			.attr("class",function(d, i) { 
				if (i==selected) {
					return "shown"
				}
				else {
					return "hidden"
				}
		});

		desGroup.transition()
			.delay(200)
			.duration(200)
			.attr("opacity",1);
	}
})	

