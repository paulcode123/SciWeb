function set_rem_question(question, c1, c2, c3, c4){
    document.getElementById("question").innerHTML = question;
    document.getElementById("choice1").innerHTML = "1️⃣   " + c1;
    document.getElementById("choice2").innerHTML = "2️⃣   " + c2;
    document.getElementById("choice3").innerHTML = "3️⃣   " + c3;
    document.getElementById("choice4").innerHTML = "4️⃣   " + c4;
}

function flipCard() {
    document.querySelector('.flashcard').classList.toggle('flipped');
}


set_rem_question("What is the capital of France?", "Paris", "London", "Berlin", "Madrid");
// hide loading wheel
document.getElementById("loadingWheel").style.display = "none";