document.getElementById('courseReviewSubmit').addEventListener('click', post_review); 
function post_review() { 
let workloadRating = document.getElementById('workRating').value; 
let workloadReview = document.getElementById('workReview').value; 
let enjoymentReview = document.getElementById('enjoymentReview').value; 
let enjoymentRating = document.getElementById('enjoymentRating').value; 
let difficultyRating = document.getElementById('difficultyRating').value; 
let difficultyReview = document.getElementById('difficultyReview').value; 

console.log(workloadRating); 

let course_id = window.location.href.slice(-5); 
//ChatGpt Code for last 5 window letters 


let data = {
    WorkLoadRating: workloadRating,
    WorkLoadReview: workloadReview,
    DifficultyRating: difficultyRating,
    DifficultyReview: difficultyReview,
    EnjoymentRating: enjoymentRating,
    EnjoymentReview: enjoymentReview,
    CourseId: course_id
} 


fetchRequest('/post_data', {data: data, sheet: 'Reviews'}); 
async function main() { 
    let data = await fetchRequest('/data', {data: 'Reviews'}); 

console.log(data["Reviews"]);
let course_id = window.location.href.slice(-5); 

function matchCourseId(review) { 
    return review.course_id === course_id; 
}
let filteredReviews = data['Reviews'].filter(matchCourseId);
}  
main(); 



}




