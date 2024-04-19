async function main(){
var data = await fetchRequest('/data', { data: "Assignments, FILTERED Classes" });

//get the class id from the last 4 characters of the url
var class_id = window.location.href.slice(-4);
//filter the assignments to only show the one for the class that the user is currently on
var assignment = data['Assignments'].filter(item => item.id.toString() == class_id.toString())[0];
//filter classes to find the matching class
var current_class = data['Classes'].find(item => item.id === assignment.class);

//change values of html elements to reflect the assignments
document.getElementById('class-name').textContent = 'Class: ' +assignment.class_name;
document.getElementById('due-date').textContent = 'Due: ' + assignment.due;
document.getElementById('points').textContent = 'Points: ' + assignment.points;
document.getElementById('categories').textContent = 'Category: ' + assignment.category;
await get_impact(assignment.category, current_class, parseFloat(assignment.points));
}
main();

async function get_impact(category, current_class, worth){
    data = await fetchRequest('/impact', {'category': category, 'class': (current_class.name).toLowerCase()});
    
    var category_grade = data['current_grade'];
    var category_points = data['total_points']
    var category_weight = data['category_weight']
    document.getElementById('slider').value = category_grade;
    document.getElementById('slider-value').textContent = category_grade.toString() + '%';
    console.log('category grade: ' + category_grade);
    console.log('category points: ' + category_points);
    console.log('worth: ' + worth);
    //add event listener to the slider to update the value of the slider
    document.getElementById('slider').addEventListener('input', function() {
        
      document.getElementById('slider-value').textContent = "If your score on this is: "+this.value + '%:';
      let new_category_grade = ((this.value*worth) + (category_points*category_grade))/(worth + category_points);
      let category_impact = new_category_grade - category_grade;

      let class_impact = category_impact*category_weight/1;
        console.log('category weight: ' + category_weight);
    document.getElementById('category-impact').textContent = 'Impact on ' + category + ' category grade: ' + category_impact.toFixed(3) + '%';
    document.getElementById('class-impact').textContent = 'Impact on ' + current_class.name + ' grade: '+class_impact.toFixed(3) + '%';
    });

  
}