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
function getData(){
  fetch('/data', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ data: "Classes, Name, Notebooks, Study" })
  })
  .then(response => response.json())
  .then(data => {
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
  })
}

function updateUserStudy(userStudy){
  //updates user study in db
  userStudy = userStudy.join("///");
  fetch('/updateStudy', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ data: userStudy })
  })
  .then(response => response.json())
  .then(data => {
    console.log(data);
  })
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


// getAIResponse("What's 2+2?"));
async function main(classes, class_ids, notebooks, userStudy){
chatBotPrompt("Which class would you like to study for?");
let [inputElement, divElement] = userPrompt()
  while(entered == false){
    await sleep(500);
  }

  
  
  let prompt = parseClassResponse(inputElement, divElement, classes)
  let ai_response = await make_assistant_prompt(prompt);
  let i = parseInt(ai_response.match(/\d+/)[0], 10)
  let studyClass = classes[i]
  let studyClassID = class_ids[i]
  let notebookText = notebooks.filter((item) => item.classID == studyClassID)[0]['text'];
  console.log(notebooks.filter((item) => item.classID == studyClassID));
  pclass = document.createElement('p');
  pclass.style.fontSize = "8px";
  divElement.appendChild(pclass);
  typeOut(classes+"=>"+studyClass, pclass, 15);

  chatBotPrompt("What topic/unit in "+studyClass+" would you like to study?");
  [inputElement, divElement] = userPrompt()
  while(entered == false){
    await sleep(500);
  }
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

  
  while(true){
    roles = ["assistant", "user"]
    context = [{"role": "system", "content": "You are a tutor trying to pinpoint the user's weaknesses by using their past answers to questions to help you understand how they think. Ask them more specific questions that will help you further understand how they answer questions. You will be given a list to topics to ask about. Simply list 1 question and nothing else."}]
      for(i = 0; i < userStudy.length; i++){
        context.push({"role": roles[i%2], "content": userStudy[i]})
      }
      context.push({"role": "assistant", "content": subtopics})
    // if (prevQs.length>0){
    //   prompt +=" previously asked: "+prevQs;
    // }
    console.log(context);
    let ai_response = await getAIResponse(context);
    
    console.log(ai_response)
    var questions = ai_response.split(/\d+\.\s+/).filter(Boolean);
    for(let i = 0; i<questions.length; i++){
      
    
    chatBotPrompt(questions[i]);
    [inputElement, divElement] = userPrompt()
      userStudy.push(questions[i]);
      
      context.push({"role": "assistant", "content": questions[i]});
      
    while(entered == false){
      await sleep(500);
    }
      userStudy.push(inputElement.value);
      context.push({"role": "user", "content": inputElement.value});
    let c = "You are a tutor giving feedback to a student on their answer to a question. Given the question and the student's answer, evaluate their understanding of the question and the quality of their response."
    prompt = "question: "+questions[i]+", student answer: "+inputElement.value;
    
    ai_response = await make_context_prompt(c, prompt);
    pclass = document.createElement('p');
    pclass.style.fontSize = "8px";
    divElement.appendChild(pclass);
    typeOut(ai_response, pclass, 15);
    }
    
    updateUserStudy(userStudy);
  }
}

