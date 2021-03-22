// dimensions
var width = 1000;
var height = 1000;

var margin = {
    top: 50,
    bottom: 50,
    left: 50,
    right: 50,
}

// drop down
var dropdown = d3.select("body")
.append("select")
.attr("name", "lane_select")
.attr("id", "lane_select")

// create an svg to draw in
var svg = d3.select("body")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .append('g')
    .attr('transform', 'translate(' + margin.top + ',' + margin.left + ')');

width = width - margin.left - margin.right;
height = height - margin.top - margin.bottom;

var simulation = d3.forceSimulation()
    // pull nodes together based on the links between them
    .force("link", d3.forceLink().id(function(d) {
        return d.id;
    })
    .strength(0.025))
    // push nodes apart to space them out
    .force("charge", d3.forceManyBody().strength(-200))
    // add some collision detection so they don't overlap
    .force("collide", d3.forceCollide().radius(12))
    // and draw them around the centre of the space
    .force("center", d3.forceCenter(width / 2, height / 2));


// get the data
$.ajaxSetup({
    async: false
});
var graph;
$.getJSON("cvxpy_tp2.json", function(json){
    graph = json;
});
$.ajaxSetup({
    async: true
});

// load the graph
// d3.json("mention_network.json", function(error, graph) {

    // set the nodes
    var nodes = graph.nodes;
    // links between nodes
    var links = graph.links;

    // populate dropdown
    var tempdown = d3.select("#lane_select");
    tempdown.attr("onchange", "writeThis(this.value)");
    var ids = new Set();
    for (const l of links) {
        for (const [key, value] of Object.entries(l.lanes)) {
            ids.add(key);
        }
    }
    for (const value of ids) {
        tempdown.append("option")
            .attr("value", value)
            .text(value);
    }
    // highlight nodes and edges `onchange`
    function writeThis(selection) {
        // const selection = Number(dropval);
        console.log(selection);
        mouseOut();  // clear the previous selection

        const opacity = 0.1;
        var validLinkIndices = new Set();
        for (const l of links) {
            var used = false;
            const lanes = Object.entries(l.lanes);
            for (const [k, v] of lanes) {
                if (k == selection && v == 1) {used = true}
            }
            if (used == true) {
                // var toadd = new Map();
                // toadd.set('source', l.source);
                // toadd.set('target', l.target);
                // toadd.set('lanes', lanes);
                
                validLinkIndices.add(l.index);
            }
        }
        var validNodes = new Set();
        for (const l of links) {
            if (validLinkIndices.has(l.index)) {
                validNodes.add(l.source.id);
                validNodes.add(l.target.id);
            }
        }
        // apply styles for the new selection
        node.style("stroke-opacity", function(o) {
            thisOpacity = validNodes.has(o.id) ? 1 : opacity;
            return thisOpacity;
        });
        node.style("fill-opacity", function(o) {
            thisOpacity = validNodes.has(o.id) ? 1 : opacity;
            return thisOpacity;
        });
        link.style("opacity", function(o) {
            // return o.value === selection ? 1 : opacity;
            return validLinkIndices.has(o.index) ? 1 : opacity;
        });
        link.style("stroke", function(o) {
            // return o.value === selection ? "#000000" : "#ddd";
            return validLinkIndices.has(o.index) ? "#000000" : "#ddd";
        });

    }
    
    // create the arrows
    // build the arrow.
    var marker = svg.append("svg:defs").selectAll("marker")
        .data(["end"])      // Different link/path types can be defined here
        .enter().append("svg:marker")    // This section adds in the arrows
        .attr("id", String)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 25)
        .attr("refY", -0.5)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("svg:path")
        .attr("d", "M0,-5L10,0L0,5");
    
    // add the curved links to our graphic
    var link = svg.selectAll(".link")
        .data(links)
        .enter()
        .append("path")
        .attr("class", "link")
        .attr('stroke', function(d){
            return "#ddd";
        })
        .attr("marker-end", "url(#end)");

    // add the nodes to the graphic
    var node = svg.selectAll(".node")
        .data(nodes)
        .enter().append("g")

    // a circle to represent the node
    node.append("circle")
        .attr("class", "node")
        .attr("r", 8)
        .attr("fill", function(d) {
            return d.colour;
        });
        // .on("mouseover", mouseOver(.2))
        // .on("mouseout", mouseOut);

    // hover text for the node
    node.append("title")
        .text(function(d) {
            return d.name;
        });

    // add a label to each node
    node.append("text")
        .attr("dx", 12)
        .attr("dy", ".35em")
        .text(function(d) {
            return d.name;
        })
        .style("stroke", "black")
        .style("stroke-width", 0.5)
        .style("fill", function(d) {
            return d.colour;
        });

    // add the nodes to the simulation and
    // tell it what to do on each tick
    simulation
        .nodes(nodes)
        .on("tick", ticked);

    // add the links to the simulation
    simulation
        .force("link")
        .links(links);

    // on each tick, update node and link positions
    function ticked() {
        link.attr("d", positionLink);
        node.attr("transform", positionNode);
    }

    // links are drawn as curved paths between nodes,
    // through the intermediate nodes
    function positionLink(d) {
        var offset = 30;

        var midpoint_x = (d.source.x + d.target.x) / 2;
        var midpoint_y = (d.source.y + d.target.y) / 2;

        var dx = (d.target.x - d.source.x);
        var dy = (d.target.y - d.source.y);

        var normalise = Math.sqrt((dx * dx) + (dy * dy));

        var offSetX = midpoint_x + offset*(dy/normalise);
        var offSetY = midpoint_y - offset*(dx/normalise);

        return "M" + d.source.x + "," + d.source.y +
            "S" + offSetX + "," + offSetY +
            " " + d.target.x + "," + d.target.y;
    }

    // move the node based on forces calculations
    function positionNode(d) {
        // keep the node within the boundaries of the svg
        if (d.x < 0) {
            d.x = 0
        };
        if (d.y < 0) {
            d.y = 0
        };
        if (d.x > width) {
            d.x = width
        };
        if (d.y > height) {
            d.y = height
        };
        return "translate(" + d.x + "," + d.y + ")";
    }

    // build a dictionary of nodes that are linked
    var linkedByIndex = {};
    links.forEach(function(d) {
        linkedByIndex[d.source.index + "," + d.target.index] = 1;
    });

    // check the dictionary to see if nodes are linked
    function isConnected(a, b) {
        return linkedByIndex[a.index + "," + b.index] || linkedByIndex[b.index + "," + a.index] || a.index == b.index;
    }

    // fade nodes on hover
    function mouseOver(opacity) {
        return function(d) {
            console.log(d);
            // check all other nodes to see if they're connected
            // to this one. if so, keep the opacity at 1, otherwise
            // fade
            node.style("stroke-opacity", function(o) {
                thisOpacity = isConnected(d, o) ? 1 : opacity;
                return thisOpacity;
            });
            node.style("fill-opacity", function(o) {
                thisOpacity = isConnected(d, o) ? 1 : opacity;
                return thisOpacity;
            });
            // also style link accordingly
            link.style("stroke-opacity", function(o) {
                return o.source === d || o.target === d ? 1 : opacity;
            });
            link.style("stroke", function(o){
                // console.log(o);
                return o.source === d || o.target === d ? o.source.colour : "#ddd";
            });
        };
    }

    function mouseOut() {
        node.style("stroke-opacity", 1);
        node.style("fill-opacity", 1);
        link.style("stroke-opacity", 1);
        link.style("stroke", "#ddd");
    }

// });