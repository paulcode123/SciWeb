//get study container element from HTML
var studyContainer = document.getElementById("study-container");
var div = null;
var entered = false;

//call function to get data from py, which will then call main function
getData();

//get chat gpt response from py
function getAIResponse(input) {
  return new Promise((resolve, reject) => {
  fetch('/AI', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ data: input })
  })
  .then(response => response.json())
  .then(data => {
    //create text element in studyContainer with data inside
    console.log(data);
    resolve(data);
  
  });
  })
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

//get data from py
async function getData(){
  data = await fetchRequest('/data', { data: "FILTERED Classes, Name, Notebooks, FILTERED Study" })
  
  classList = data["Classes"];
  osis = data['Name']['osis'];
  notebooks = data['Notebooks'];
  study = data['Study'];
  //sort classes for user osis
  console.log(osis);
  // console.log(classList);
  const userClasses = classList.filter((item) => item.OSIS.includes(osis));
  var userStudy = study.filter((item) => item.OSIS.includes(osis));
  if (userStudy.length != 0){
    userStudy = userStudy[0]['Q&As'].split("///");
  }
  var class_names = userClasses.map((item) => item.name);
  var class_ids = userClasses.map((item) => item.id);
  var notebooks = notebooks.filter((item) => class_ids.includes(item.classID));
  console.log(class_names);
  main(class_names, class_ids, notebooks, userStudy);

}

async function updateUserStudy(userStudy){
  //updates user study in db
  userStudy = userStudy.join("///");
  data = await fetchRequest('/updateStudy', { data: userStudy })
  console.log(data);
}

function parseClassResponse(inputElement, divElement, classes){
  
  let user_response = inputElement.value;
  let prompt = "What index of array:["+classes+"] matches "+user_response+"?";
  console.log(prompt)
  return prompt;
}




async function make_assistant_prompt(prompt){
  return new Promise(async (resolve, reject) => {
  response = await getAIResponse([{"role" : "assistant", "content" : prompt}])
  resolve(response);
  })
}

async function make_context_prompt(context, prompt){
  return new Promise(async (resolve, reject) => {
  response = await getAIResponse([{"role" : "system", "content" : context}, {"role" : "assistant", "content" : prompt}])
  resolve(response);
  })
}


//main function that runs the study session
async function main(classes, class_ids, notebooks, userStudy){
  questions_per_round = 1;
  //hide loading wheel
  document.getElementById('loadingWheel').style.display = "none";
  //wait for the class and category to be asked for
  let subtopics = await get_class_and_category(classes, class_ids, notebooks);

  //main study loop, for each round of questions
  while(true){
    //build prompt
    prompt_end = " Make questions about these specific topics: "+subtopics+". Simply list "+ questions_per_round.toString() +" questions and nothing else."
    context = [{"role": "system", "content": build_prompt("challenge")+prompt_end}]
  
    //load and process the user's questions and answers from past study sessions from the database
    roles = ["assistant", "user"]
    for(i = 0; i < userStudy.length; i++){
      context.push({"role": roles[i%2], "content": userStudy[i]})
    }
    

    //get the AI's response to the prompt
    let ai_response = await getAIResponse(context);
    console.log(ai_response)
    //split the AI response into questions
    var questions = ai_response.split(/\d+\.\s+/).filter(Boolean);

    //for each question, ask the user and get their response
    for(let i = 0; i<questions.length; i++){
    //ask the user the question
    chatBotPrompt(questions[i]);
    [inputElement, divElement] = userPrompt()
      //log the question to the context and userStudy arrays
      userStudy.push(questions[i]);
      context.push({"role": "assistant", "content": questions[i]});
    //wait for user to press enter on their response  
    while(entered == false){
      await sleep(500);
    }
      //log the user's response to the context and userStudy arrays
      userStudy.push(inputElement.value);
      context.push({"role": "user", "content": inputElement.value});
      //create feedback prompt
    let c = "Tell the user how accurate their answer is in 20 words."
    prompt = "question: "+questions[i]+", student answer: "+inputElement.value;
    ai_response = await make_context_prompt(c, prompt);
    pclass = document.createElement('p');
    pclass.style.fontSize = "8px";
    divElement.appendChild(pclass);
    typeOut(ai_response, pclass, 15);

    }
    //Evaluate progress
    context[0]={"role": "system", "content": "for each of the user's answers to a question, rate it from 1-10. Return scores in an ordered array."};
    console.log(context);
    ai_response = await getAIResponse(context);
    console.log(ai_response);

    //update the database with the user's study session
    updateUserStudy(userStudy);
  }
}


function build_prompt(mode){
  //given what the style(mode) of how the bot asks questions, give the corresponding prompt
  if (mode == "weaknesses"){
    return "tbd";
  }
  else if (mode == "strengths"){
    return "tbd";
  }
  else if (mode == "challenge"){
    return "You are a tutor using the user's past answers to questions to help you understand what they know. Ask them specific questions that will challenge their knowledge.";
  }
  else if (mode == "review"){
    return "tbd";
  }
  else if (mode == "new"){
    return "tbd";
  }
  else if (mode == "custom"){
    return "tbd";
  }
}





async function get_class_and_category(classes, class_ids, notebooks){
  //get user input: which class to study for
chatBotPrompt("Which class would you like to study for?");
let [inputElement, divElement] = userPrompt()
  //wait for user to press enter on their response
  while(entered == false){
    await sleep(500);
  }

  //get class name from user input
  let prompt = parseClassResponse(inputElement, divElement, classes)
  let ai_response = await make_assistant_prompt(prompt);
  let i = parseInt(ai_response.match(/\d+/)[0], 10)
  let studyClass = classes[i]
  let studyClassID = class_ids[i]
  let notebook = notebooks.filter((item) => item.classID == studyClassID)[0];
  let notebookText = notebook.text;
  let notebookhtml = notebook.innerHTML;
  
  console.log(notebook);
  var classbox = document.createElement('div');
  divElement.appendChild(classbox);
  //Display the class the user chose by showing the names of the classes and having a box move from one class to the next until the chosen one is boxed
  for (let x = 0; x < classes.length; x++){
    pclass = document.createElement('span');
    pclass.style.fontSize = "17px";
    pclass.style.marginRight = '5px';
    pclass.style.border = "2px solid white";
    classbox.appendChild(pclass);
    typeOut(classes[x], pclass, 15);
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
    if (x == i){
      break;
    }
    //wait 1 second
    await sleep(300);
  }
  
  
  // typeOut(classes+"=>"+studyClass, pclass, 15);

  //get user input: which topic to study for
  chatBotPrompt("What topic/unit in "+studyClass+" would you like to study?");
  [inputElement, divElement] = userPrompt()
  const parser = new DOMParser();
  const doc = parser.parseFromString(notebookhtml, 'text/html');
  // get the parent element of doc.body
  const docElement = doc.body;
  divElement.appendChild(display_topics(docElement));
  while(entered == false){
    await sleep(500);
  }
  //generate subtopics that are relevant to the user's topic by using the notebook text to find what the teacher covered
  var topic = inputElement.value
  let context = "You are a tutor tasked with listing the subtopics that relate to both the topic and the text in the list. Just list the subtopics and nothing else."
  prompt = "topic: "+ topic + ", list: " +notebookText;
  console.log(prompt)
  let subtopics = await make_context_prompt(context, prompt);
  console.log(subtopics);
  pclass = document.createElement('p');
  pclass.style.fontSize = "8px";
  divElement.appendChild(pclass);
  typeOut("relevant topics in notebook=>"+subtopics, pclass, 15);
  return subtopics;
}


function display_topics(parent) {
  console.log(parent)
  // Create a container for the output
  const output = document.createElement('div');

  // Indent the output container from the parent element to show hierarchy
  output.style.marginLeft = '20px';

  // Iterate through children of the tab element
  for (let index = 0; index < parent.children.length; index++) {
      let tab = parent.children[index];
      //if the tab is not of class tab, return
      if (!tab.className.includes("tab")){
        continue;
      }
      // Create a checkbox for the main section
      const sectionCheckbox = document.createElement('input');
      sectionCheckbox.type = 'checkbox';
      sectionCheckbox.id = `section-${index}`;

      // Create a label for the checkbox
      const sectionLabel = document.createElement('label');
      sectionLabel.htmlFor = `section-${index}`;
      let input = tab.querySelector('input[type="name"]');
      
      sectionLabel.textContent = input.dataset.text || "Unnamed Section";
      console.log(input);

      // Append checkbox and label to the output container
      output.appendChild(sectionCheckbox);
      output.appendChild(sectionLabel);
      // Add a line break for visual separation
      output.appendChild(document.createElement('br'));
      output.appendChild(display_topics(tab.children[2]));
  };

  // Append the output container to the body or any other desired part of the page
  return output;
}


