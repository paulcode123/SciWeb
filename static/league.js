async function main(){
    const data = await fetchRequest('/data', {data: "Leagues, Name, Users"});
    // get league id from the last 8 digits of the url
    const league_id = window.location.href.split('/').pop();
    const leagueData = data['Leagues'].find(league => league['id'] == league_id);
    set_leaderboards(leagueData)
    set_graph(leagueData)
    set_class_img(leagueData['img'])
    add_user_bubbles(leagueData, data['Users']);
    setImageEl(leagueData, "Leagues")
    set_color_EL("Leagues", leagueData)
    show_Join(data['Name'], leagueData, "Leagues");
    document.getElementById("loadingWheel").style.display = "none";
}

main();

function set_leaderboards(leagueData){
    lbs = ['RIlb', 'Glb', 'GPAlb']
    for (let lb of lbs){
        if (leagueData[lb] == null || leagueData[lb] == ""){
            continue;
        }
        let lb_data = leagueData[lb]
        // replace single quotes with double quotes
        lb_data = lb_data.replace(/'/g, '"')
        console.log(lb_data)
        // convert from string to dict
        lb_data = JSON.parse(lb_data)
        let lb_el = document.getElementById(lb)
        lb_el.style.display = "block"
        // convert dict values from str to float
        for (let key in lb_data){
            lb_data[key] = parseFloat(lb_data[key])
        }
        // sort dict by value
        lb_data = Object.fromEntries(Object.entries(lb_data).sort(([,a],[,b]) => b-a));
        // add to html
        tbody = lb_el.querySelector('tbody')
        for (let key in lb_data){
            // get index of key in dict
            let index = Object.keys(lb_data).indexOf(key)
            tbody.children[index].children[1].textContent = key
            tbody.children[index].children[2].textContent = lb_data[key]
        }
    }
}

function set_graph(leagueData){
    var data = leagueData['GOTC']
    if (data == null || data == ""){
        return
    }
    data = data.replace(/'/g, '"')
    data = JSON.parse(data)
    dates = data['dates']
    // remove \n from dates
    dates = dates.replace(/\n/g, '')
    // cut off first and last characters and split by space
    dates = dates.slice(1, -1).split(' ')
    console.log(dates)
    const labels = dates.map(date => new Date((date - 719163) * 86400000).toISOString().split('T')[0]); // Convert Julian dates to YYYY-MM-DD

    const datasets = Object.keys(data).filter(key => key !== 'dates').map(key => ({
        label: key,
        data: data[key],
        fill: false,
        borderColor: getRandomColor(),
        tension: 0.1
    }));

    const config = {
        type: 'line',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: 'Multi-line Graph'
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'day'
                    },
                    title: {
                        display: true,
                        text: 'Date'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Grade'
                    }
                }
            }
        }
    };

    const ctx = document.getElementById('myChart').getContext('2d');
    new Chart(ctx, config);
}

function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}