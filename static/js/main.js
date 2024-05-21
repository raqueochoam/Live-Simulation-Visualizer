console.log("main.js cargado");
var chartArea = d3.select("#chart-area");
var occupancyGraphArea = d3.select("#graph-occupancy-area");
var downtimeGraphArea = d3.select("#graph-downtime-area");
var idleGraphArea = d3.select("#graph-idle-time-area");
var waitingGraphArea = d3.select("#graph-waiting-time-area");
var pieGraphArea = d3.select("#pieGraph-area");
var animationArea = d3.select("#animation-area");

// Función para crear y agregar un texto centrado al área del gráfico
function addCenteredText(area, text) {
    var textElement = area.append("div")
        .style("text-align", "center")
        .style("font-size", "24px")
        .style("margin-top", "20px")
        .text(text);
}

function updateData() {
    // Limpiar textos anteriores
    chartArea.selectAll("div").remove();

    // Limpiar gráficos anteriores
    pieGraphArea.select("div").remove();
    occupancyGraphArea.select("div").remove();
    downtimeGraphArea.select("div").remove();
    idleGraphArea.select("div").remove();
    waitingGraphArea.select("div").remove();
    animationArea.select("div").remove();
    
    // Cargar los datos desde el archivo JSON
    d3.json("/daily_statistics.json").then(function(jsonData) {
        // Calcular el porcentaje de aceptación
        var acceptancePercentage = 100.0 - jsonData[0].rejection_percentage;

        // Crear el conjunto de datos para el gráfico de pastel
        var pieData = [
            { label: "Acceptance", value: acceptancePercentage },
            { label: "Rejection", value: jsonData[0].rejection_percentage }
        ];

        // Mostrar los datos
        addCenteredText(chartArea, "Production: " + jsonData[0].production);
        addCenteredText(chartArea, "Rejections: " + jsonData[0].rejections);
        addCenteredText(chartArea, "Rejection Percentage: " + jsonData[0].rejection_percentage + "%");
        addCenteredText(chartArea, "Delay Due to Bottleneck: " + jsonData[0].delay_due_to_bottleneck);
        addCenteredText(chartArea, "Accidents: " + jsonData[0].accidents);

        // Definir escalas y ejes comunes para pie
        var colorScale = d3.scaleOrdinal()
            .domain(["Acceptance", "Rejection"])
            .range(["lightgreen", "red"]);

        // Crear el gráfico de pastel
        var pieWidth = 400;
        var pieHeight = 400;
        var radius = Math.min(pieWidth, pieHeight) / 2;

        var svg = pieGraphArea.append("div")
            .append("svg")
            .attr("width", pieWidth)
            .attr("height", pieHeight)
            .append("g")
            .attr("transform", "translate(" + pieWidth / 2 + "," + pieHeight / 2 + ")");

        var pie = d3.pie()
            .value(function(d) { return d.value; })
            .sort(null);

        var path = d3.arc()
            .outerRadius(radius - 10)
            .innerRadius(0);

        var label = d3.arc()
            .outerRadius(radius - 40)
            .innerRadius(radius - 40);

        var arc = svg.selectAll(".arc")
            .data(pie(pieData))
            .enter().append("g")
            .attr("class", "arc");

        arc.append("path")
            .attr("d", path)
            .attr("fill", function(d) { return colorScale(d.data.label); });

        arc.append("text")
            .attr("transform", function(d) { return "translate(" + label.centroid(d) + ")"; })
            .attr("dy", "0.35em")
            .text(function(d) { return d.data.label + ": " + d.data.value.toFixed(2) + "%"; });

        // Crear gráficos de barras para cada tipo de tiempo
        ["occupancy", "downtime", "idleTime", "waitingTime"].forEach(function(type) {
            var data = jsonData[0][type + "_per_workstation"];

            if (data) {
                var graphArea;
                if(type === "occupancy") graphArea = occupancyGraphArea;
                if(type === "downtime") graphArea = downtimeGraphArea;
                if(type === "idleTime") graphArea = idleGraphArea;
                if(type === "waitingTime") graphArea = waitingGraphArea;

                var svg = graphArea.append("div")
                    .append("svg")
                    .attr("width", 400)
                    .attr("height", 400);

                var xScale = d3.scaleBand()
                    .domain(d3.range(data.length))
                    .range([0, 325])
                    .padding(0.2);

                var yScale = d3.scaleLinear()
                    .domain([0, d3.max(data)])
                    .range([300, 0]);

                var xAxis = d3.axisBottom(xScale)
                    .tickFormat((d, i) => "W" + (i + 1));

                svg.selectAll("rect")
                    .data(data)
                    .enter().append("rect")
                    .attr("x", (d, i) => xScale(i))
                    .attr("y", (d) => yScale(d))
                    .attr("width", xScale.bandwidth())
                    .attr("height", (d) => 300 - yScale(d))
                    .attr("fill", colorScale(type))
                    .attr("stroke", "black")
                    .attr("stroke-width", 1)
                    .on("mouseover", function(event, d) {
                        d3.select(this).attr("fill", "orange");
                        svg.append("text")
                            .attr("x", parseFloat(d3.select(this).attr("x")) + xScale.bandwidth() / 2)
                            .attr("y", yScale(d) - 10)
                            .attr("text-anchor", "middle")
                            .attr("class", "label")
                            .text(d.toFixed(2));
                    })
                    .on("mouseout", function(d, i) {
                        d3.select(this).attr("fill", colorScale(type));
                        svg.selectAll(".label").remove();
                    });

                svg.append("g")
                    .attr("transform", "translate(0, 300)")
                    .call(xAxis);

                svg.append("g")
                    .call(d3.axisLeft(yScale));
            } else {
                console.error(`No se encontraron datos para ${type}_per_workstation`);
            }
        });

        // Crear la animación del cuello de botella
        createBottleneckAnimation(jsonData[0].bottleneck_data);

    }).catch(function(error) {
        console.error('Error al cargar el archivo JSON:', error);
    });
}

function createBottleneckAnimation(data) {
    // Limpiar la animación anterior
    animationArea.select("svg").remove();

    var width = 600;
    var height = 300; // Incrementar la altura para la leyenda
    var svg = animationArea.append("svg")
        .attr("width", width)
        .attr("height", height);

    var circleRadius = 10;

    // Crear un grupo para los círculos
    var circlesGroup = svg.append("g");

    // Crear círculos para representar los elementos que se mueven
    var circles = circlesGroup.selectAll("circle")
        .data(data)
        .enter().append("circle")
        .attr("cx", 0)
        .attr("cy", (d, i) => (i + 1) * (circleRadius * 2 + 10))
        .attr("r", circleRadius)
        .attr("fill", (d) => d.status === 'delayed' ? 'red' : 'steelblue')
        .attr("stroke", "black")
        .attr("stroke-width", 1);

    // Crear la animación
    function animateCircles() {
        circles.transition()
            .duration(2000)
            .attr("cx", width)
            .attr("fill", (d) => d.status === 'delayed' ? 'orange' : 'green')
            .on("end", function() {
                d3.select(this)
                    .attr("cx", 0)
                    .attr("fill", (d) => d.status === 'delayed' ? 'red' : 'steelblue')
                    .transition()
                    .duration(2000)
                    .attr("cx", width)
                    .attr("fill", (d) => d.status === 'delayed' ? 'orange' : 'green')
                    .on("end", animateCircles);
            });
    }

    animateCircles();

    // Agregar la leyenda
    var legendData = [
        { label: "Elementos retrasados", color: "red" },
        { label: "Elementos en progreso sin retraso", color: "steelblue" },
        { label: "Elementos retrasados durante la transición", color: "orange" },
        { label: "Elementos en progreso durante la transición", color: "green" }
    ];

    var legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", "translate(10, 210)"); // Posición de la leyenda

    legend.selectAll("rect")
        .data(legendData)
        .enter().append("rect")
        .attr("x", 0)
        .attr("y", (d, i) => i * 20)
        .attr("width", 18)
        .attr("height", 18)
        .style("fill", d => d.color);

    legend.selectAll("text")
        .data(legendData)
        .enter().append("text")
        .attr("x", 24)
        .attr("y", (d, i) => i * 20 + 9)
        .attr("dy", ".35em")
        .text(d => d.label);
}

document.addEventListener("DOMContentLoaded", function() {
    
    document.getElementById('run-simulation').addEventListener('click', function() {
        fetch('/run-simulation', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                document.getElementById('simulation-output').innerText = data.output;
                console.log('Simulation output:', data.output);
                updateData();
            } else {
                document.getElementById('simulation-output').innerText = 'Error: ' + data.error;
                console.error('Simulation error:', data.error);
            }
        })
        .catch(error => console.error('Error:', error));
    });

    // Llama a la función updateGraphs cuando la página se cargue por primera vez para mostrar las gráficas iniciales.
    updateData();
});
