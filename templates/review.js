
document.getElementById('courseReviewSubmit').addEventListener('click', post_review); 
function post_review() { 
let workloadRating = document.getElementById('workRating').value; 
let workloadReview = document.getElementById('workRating').value; 
let enjoymentloadReview = document.getElementById('enjoymentReview').value; 
let enjoymentloadRating = document.getElementById('enjoymentRating').value; 
let diffcultyloadRating = document.getElementById('difficultyRating').value; 
let difficultyReview = document.getElementById('difficultyReview').value; 
}
let course_id = window.location.href.slice(-5); 
//ChatGpt Code for last 5 window letters

let data = {
    Workload-Rating: workloadRating,
    Workload_Review: workloadReview,
    Difficulty_Rating: difficultyloadRating,
    Difficulty_Review: difficultyloadReview,
    Enjoyment_Rating: enjoymentloadRating,
    Enjoyment_Review: enjoymentloadReview,
    Course-Id: course_id
} 

fetchRequest('/post_review', {data: data, sheets: 'Reviews'}); 




}





