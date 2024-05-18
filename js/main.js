d3.json("daily_statistics.json").then((data)=> {
    console.log(data);
}).catch((error)=> {
    console.log(error);
});