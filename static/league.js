async function main(){
    const data = await fetchRequest('/data', {data: "Leagues, Name, Users"});
    // get league id from the last 8 digits of the url
    const league_id = window.location.href.split('/').pop();
    const leagueData = data['Leagues'].find(league => league['id'] == league_id);
    set_class_img(leagueData['img'])
    add_user_bubbles(leagueData, data['Users']);
    setImageEl(leagueData, "Leagues")
    set_color_EL("Leagues", leagueData)
    show_Join(data['Name'], leagueData, "Leagues");
}

main();