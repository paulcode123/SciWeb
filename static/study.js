//get study container element from HTML
var studyContainer = document.getElementById("study-container");
var div = null;
var entered = false;
getData();

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
function getData(){
  fetch('/data', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ data: "Classes, Name, Notebooks" })
  })
  .then(response => response.json())
  .then(data => {
    classList = data["Classes"];
    osis = data['Name']['osis'];
    notebooks = data['Notebooks'];
    //sort classes for user osis
    console.log(osis);
    // console.log(classList);
    const userClasses = classList.filter((item) => item.OSIS.includes(osis));
    
    var class_names = userClasses.map((item) => item.name);
    var class_ids = userClasses.map((item) => item.id);
    var notebooks = notebooks.filter((item) => class_ids.includes(item.classID));
    console.log(class_names);
    main(class_names, class_ids, notebooks);
  })
}
function parseClassResponse(inputElement, divElement, classes){
  
  let user_response = inputElement.value;
  let prompt = "What index of array:["+classes+"] matches "+user_response+"?";
  console.log(prompt)
  return prompt;
}







// getAIResponse("What's 2+2?"));
async function main(classes, class_ids, notebooks){
chatBotPrompt("Which class would you like to study for?");
let [inputElement, divElement] = userPrompt()
  while(entered == false){
    await sleep(500);
  }
  
  let prompt = parseClassResponse(inputElement, divElement, classes)
  let ai_response = await getAIResponse(prompt);
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
  prompt = "list the names the topics that relate to both "+notebookText+" and "+topic;
  console.log(prompt)
  let subtopics = await getAIResponse(prompt);
  console.log(subtopics);
  pclass = document.createElement('p');
  pclass.style.fontSize = "8px";
  divElement.appendChild(pclass);
  typeOut("relevant topics in notebook=>"+subtopics, pclass, 15);

  var prevQs= []
  while(true){
    prompt = "Pick one of these topics and ask a question about it: "+subtopics;
    if (prevQs.length>0){
      prompt +=" other than: "+prevQs;
    }
    console.log(prompt);
    let ai_response = await getAIResponse(prompt);
    prevQs.push(ai_response);
    chatBotPrompt(ai_response);
    [inputElement, divElement] = userPrompt()
    while(entered == false){
      await sleep(500);
    }
    prompt = "Rate response from 1-100 on accuracy and specificity and explain why. Question: "+prompt+" response: "+inputElement.value;
    
    ai_response = await getAIResponse(prompt);
    pclass = document.createElement('p');
    pclass.style.fontSize = "8px";
    divElement.appendChild(pclass);
    typeOut(ai_response, pclass, 15);
  }
}

