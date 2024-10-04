
document.getElementById('courseReviewSubmit').addEventListener('click', post_review); 
function post_review() { 
let workloadRating = document.getElementById('workRating').value; 
let workloadReview = document.getElementById('workReview').value; 
let enjoymentloadReview = document.getElementById('enjoymentReview').value; 
let enjoymentloadRating = document.getElementById('enjoymentRating').value; 
let difficultyRating = document.getElementById('difficultyRating').value; 
let difficultyReview = document.getElementById('difficultyReview').value; 

let course_id = window.location.href.slice(-5); 
//ChatGpt Code for last 5 window letters

let data = {
    WorkLoadRating: workloadRating,
    WorkLoadReview: workloadReview,
    DifficultyRating: difficultyRating,
    DifficultyReview: difficultyReview,
    EnjoymentRating: enjoymentloadRating,
    EnjoymentReview: enjoymentloadReview,
    CourseId: course_id
} 

fetchRequest('/post_data', {data: data, sheet: 'Reviews'}); 

}





