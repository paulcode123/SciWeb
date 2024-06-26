// const { type } = require("os");

//get study container element from HTML
var studyContainer = document.getElementById("study-container");
var div = null;
var entered = false;


//get chat gpt response from py
async function getAIResponse(input) {
  return await fetchRequest('/AI', { data: input })
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function typeOut(text, element, speed) {
  //add characters of text to element one by one at a speed to looks like typing
  for(var i = 0; i < text.length; i++){
    element.textContent += text.charAt(i);
    await sleep(500/speed);
    
  }
}
function isEnter(event){
  if (event.key === "Enter") {
    entered = true;
  }
}

function chatBotPrompt(prompt){
  div = document.createElement("div");
  div.classList.add("ai");
  studyContainer.appendChild(div);
  typeOut(prompt, div, 15);
}

function userPrompt(){
  entered = false;
  div = document.createElement("div");
  div.classList.add("user_div");
  input = document.createElement("input");
  input.classList.add("user_input");
  //puts user cursor in input box
  input.focus();
  input.placeholder = "Response...";
  input.setAttribute('onkeydown', "isEnter(event)")
  div.appendChild(input);
  studyContainer.appendChild(div);
  return [input, div]
}

function set_common_answers(){
// add buttons for "Next Question", "Hint", and "I don't know"
//When pressed, fill in the input box with the corresponding response and set entered to true
//Remove any previous buttons
  var buttons = document.getElementsByClassName("common_button");
  while (buttons.length > 0){
    buttons[0].remove();
  }
  var common_answers = ["Next Question", "Hint", "I don't know"];
  for (let x = 0; x < common_answers.length; x++){
    var button = document.createElement('button');
    button.textContent = common_answers[x];
    button.classList.add("common_button");
    button.onclick = function() {
      input.value = common_answers[x];
      entered = true;
    }
    studyContainer.appendChild(button);
  }

}

async function set_class(r){
  
  const container = studyContainer.children[1]
  var classbox = document.createElement('div');
  container.appendChild(classbox);
  //Display the class the user chose by showing the names of the classes and having a box move from one class to the next until the chosen one is boxed
  for (let x = 0; x < r['classes'].length; x++){
    pclass = document.createElement('span');
    pclass.style.fontSize = "17px";
    pclass.style.marginRight = '5px';
    pclass.style.border = "2px solid white";
    classbox.appendChild(pclass);
    n = r['classes'][x]['name'];
    console.log(n);
    typeOut(n, pclass, 15);
  }
  //For every child element in classbox...
  for (let x = 0; x < classbox.children.length; x++){
    //box the current class
    classbox.children[x].style.border = "2px solid green";
    //unbox the previous class
    if (x != 0){
      classbox.children[x-1].style.border = "2px solid white";
    }
    //break if the current class is the chosen class
    if (x == r['index']){
      break;
    }
}
  if(r['topics']=="no data"){
    chatBotPrompt("The notebook for this class has not been created yet. Click here to add content: ");

    class_obj = r['classes'][r['index']];
    classId = class_obj['id'].toString();
    className = class_obj['name'];
    // add a link to the end of the prompt that will take the user to the notebook creation page
    var a = document.createElement('a');
    a.href = `/class/${className+classId}/notebook`;
    a.textContent = "Add Content";
    //insert in studyContainer after element at index 2
    studyContainer.insertBefore(a, studyContainer.children[3]);
  }
  chatBotPrompt("Select which categories you'd like to study");
  [input, div] = userPrompt();
  topics = r['topics']
  // Given list topics in format ['topic1', '>subtopic1', '>subtopic2', 'topic2', '>subtopic1', '>subtopic2'], display indented checkboxes for each topic and subtopic
  topics.forEach(topic => {
    const level = (topic.match(/>/g) || []).length;
    const label = topic.replace(/>/g, '').trim();
    
    const div = document.createElement('div');
    div.className = `indent-${level}`;
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = label;
    checkbox.name = label;
    // set margin left to 4 spaces for each level of indentation
    checkbox.style.marginLeft = `${level * 20}px`;
    
    const labelElement = document.createElement('label');
    labelElement.htmlFor = label;
    labelElement.textContent = label;
    
    div.appendChild(checkbox);
    div.appendChild(labelElement);
    studyContainer.children[3].appendChild(div);
});
while(!entered){
  await sleep(100);
}
const selectedTopics = [];
for (let i = 0; i < topics.length; i++) {
  const topic = topics[i].replace(/>/g, '').trim();
  const checkbox = document.getElementById(topic);
  if (checkbox.checked) {
    selectedTopics.push(topics[i]);
  }
}
input.disabled = true;
  return selectedTopics;
}





//main function that runs the study session
async function main(previous_response){
  // get the chatbot prompt given the user's previous response
  let prompt = await getAIResponse(previous_response);
  console.log(prompt)
  // hide loading wheel
  document.getElementById("loadingWheel").style.display = "none";
  if (question_num == 1){
    var user_response = await set_class(prompt)
  }
  else{
  // type out the prompt
  chatBotPrompt(prompt);
  if(question_num > 2){
    set_common_answers();
  }
  //set up user input
  let [input, div] = userPrompt();
  //wait for user to press enter
  while(!entered){
    await sleep(100);
  }
  // make input box uneditable
  input.disabled = true;
  //get user response
  var user_response = input.value;
}
  // show loading wheel
  document.getElementById("loadingWheel").style.display = "block";
  
  question_num++;
  //call main again with user response
  main(user_response);
}

var question_num = 0;
main("start");


