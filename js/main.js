document.addEventListener("DOMContentLoaded", function() {
    // Obtener el elemento donde se mostrarán los textos centrados y los gráficos
    var chartArea = d3.select("#chart-area");
    var occupancyGraphArea = d3.select("#graph-occupancy-area");
    var downtimeGraphArea = d3.select("#graph-downtime-area");
    var idleGraphArea = d3.select("#graph-idle-time-area");
    var waitingGraphArea = d3.select("#graph-waiting-time-area");
    var pieGraphArea = d3.select("#pieGraph-area");

    // Función para crear y agregar un texto centrado al área del gráfico
    function addCenteredText(text) {
        var textElement = document.createElement("div");
        textElement.textContent = text;
        textElement.style.textAlign = "center";
        textElement.style.fontSize = "24px";
        textElement.style.marginTop = "20px";
        chartArea.node().appendChild(textElement);
    }

    // Cargar los datos desde el archivo JSON
    d3.json("daily_statistics.json").then(function(jsonData) {
        // Calcular el porcentaje de aceptación
        var acceptancePercentage = 100.0 - jsonData[0].rejection_percentage;

        // Crear el conjunto de datos para el gráfico de pastel
        var pieData = [
            { label: "Acceptance", value: acceptancePercentage },
            { label: "Rejection", value: jsonData[0].rejection_percentage }
        ];

        // Mostrar los datos
        addCenteredText("Production: " + jsonData[0].production);
        addCenteredText("Rejections: " + jsonData[0].rejections);
        addCenteredText("Rejection Percentage: " + jsonData[0].rejection_percentage + "%");
        addCenteredText("Delay Due to Bottleneck: " + jsonData[0].delay_due_to_bottleneck);
        addCenteredText("Accidents: " + jsonData[0].accidents);

        // Definir escalas y ejes comunes para pie
        var color = d3.scaleOrdinal()
            .domain(["Acceptance", "Rejection"])
            .range(["lightgreen", "red"]);

        // Crear el gráfico de pastel
        var pieWidth = 400;
        var pieHeight = 400;
        var radius = Math.min(pieWidth, pieHeight) / 2;

        var svg = pieGraphArea.append("div").append("svg")
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
            .attr("fill", function(d) { return color(d.data.label); });

        arc.append("text")
            .attr("transform", function(d) { return "translate(" + label.centroid(d) + ")"; })
            .attr("dy", "0.35em")
            .text(function(d) { return d.data.label + ": " + d.data.value.toFixed(2) + "%"; });

        // Definir escalas y ejes comunes
        var xScale = d3.scaleBand()
            .domain(d3.range(6))
            .range([0, 325])
            .padding(0.9);

        var yScale = d3.scaleLinear()
            .range([100, 0]);

        var xAxis = d3.axisBottom(xScale)
            .tickFormat((d, i) => "W" + (i + 1));

        var color = d3.scaleOrdinal()
            .domain(["occupancy", "downtime", "idleTime", "waitingTime"])
            .range(["lightblue", "pink", "lightgreen", "yellow"]);

        // Crear gráficos y ejes para cada tipo de tiempo
        ["occupancy", "downtime", "idleTime", "waitingTime"].forEach(function(type) { // iterar para cada grafico
            var data = jsonData[0][type + "_per_workstation"];

            console.log("Tipo de gráfico:", type);
            console.log("Datos:", data);

            if (data) {
                var yMax = d3.max(data);
                yScale.domain([0, yMax]);

                var graphArea;
                if(type === "occupancy") graphArea = occupancyGraphArea;
                if(type === "downtime") graphArea = downtimeGraphArea;
                if(type === "idleTime") graphArea = idleGraphArea;
                if(type === "waitingTime") graphArea = waitingGraphArea;

                var svg = graphArea.append("div").append("svg")
                    .attr("width", 400)
                    .attr("height", 400);

                svg.selectAll("rect")
                    .data(data)
                    .enter()
                    .append("rect")
                    .attr("x", (d, i) => i * 50 + 25)
                    .attr("y", (d) => yScale(d))
                    .attr("width", 20)
                    .attr("height", (d) => 100 - yScale(d))
                    .attr("fill", color(type));

                svg.append("g")
                    .attr("transform", "translate(0, 100)")
                    .call(xAxis);

                svg.append("g")
                    .call(d3.axisLeft(yScale));
            } else {
                console.error(`No se encontraron datos para ${type}_per_workstation`);
            }
        });
    }).catch(function(error) {
        console.error('Error al cargar el archivo JSON:', error);
    });
});
