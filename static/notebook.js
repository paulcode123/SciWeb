//DIV STRUCTURE:
// -container
//   -section
//     -toggle
//     -name textbox
//     -tabBody
//       -Add subsection
//       -Add line
//       -Add diagram
//       -tabContent
//         -diagrams
//           -lines
//           -boxes/nodes
//         -textboxes
//       -subsection
//       -subsection
//   -section

//define preexisting elements from HTML
var current_dgm = null;
var remove = false;
var container = document.getElementById('tabs');
var create_sec_button = document.getElementById('create_section');

create_sec_button.addEventListener('click', () => new_section(container));

//define functions to add elements
function textField(parent){
  const textField = document.createElement('textarea')
  textField.type = 'text';
  parent.appendChild(textField)
}


function diagram(parent){
  
  const diagram = document.createElement('div')
  diagram.className = 'dgm';
  diagram.addEventListener('click', function() {
    current_dgm = diagram
  })
  allow_image_paste_in(diagram)
  parent.appendChild(diagram);
}

//allow images to be pasted into the diagram
function allow_image_paste_in(diagram){
  
  diagram.addEventListener('paste', function(event) {
    var items = (event.clipboardData || event.originalEvent.clipboardData).items;
    console.log(JSON.stringify(items)); // logs all clipboard items for debugging
    for (index in items) {
      var item = items[index];
      if (item.kind === 'file') {
        var blob = item.getAsFile();
        var reader = new FileReader();
        reader.onload = function(event){
          // Create an img element and add it to the div
          var img = document.createElement("img");
          img.src = event.target.result;
          diagram.innerHTML = ''; // Clear the div's content
          element_click(img);
          img_resize_draggable(img);
          diagram.appendChild(img); // Append the image
        }; // data url!
        reader.readAsDataURL(blob);
      }
    }
    event.preventDefault(); // Prevent the default handling of the paste event
  });
}


//function for toggle section content visible/invisible
function add_toggle_EL(button, tabContent){
  button.addEventListener('click', function() {
  
  if (tabContent.style.display === 'block') {
    tabContent.style.display = 'none';
    button.textContent = ">";
  } else {
    tabContent.style.display = 'block';
    button.textContent = "v";
  }
});
}


//define function to add section
function new_section(parent){
  console.log(container)
  //create main tab
  const newTab = document.createElement('div');
  newTab.className = 'tab';
  //create divs for tab body and tab content(see div layout at top)
  const tabBody = document.createElement('div');
  const tabContent = document.createElement('div');
  //create toggler and set properties
  const toggle = document.createElement('button');
  toggle.textContent = "v";
  toggle.className = "toggle";
  //add event listener from predefined function
  add_toggle_EL(toggle, tabContent)
  //add toggle as an element of the main tab
  newTab.appendChild(toggle);
  //add a text/input box for the name of the tab
  const tabName = document.createElement('input');
  tabName.placeholder = `{Add section name here}`;
  tabName.type = 'name';
  //add input box as an element of the main tab
  newTab.appendChild(tabName)
  
    //add button to create subsection and set properties
    const add_sec_button = document.createElement('button');
    add_sec_button.className = 'btn';
    add_sec_button.textContent = 'Add Subsection';
    //when clicked, create new section with current section as parent
    add_sec_button.addEventListener('click', () => new_section(tabBody));
    tabContent.appendChild(add_sec_button);
    //add button to create text field and set properties
    const add_text_field = document.createElement('button');
    add_text_field.className = 'btn';
    add_text_field.textContent = 'Add Text';
    //when clicked, create textfield with predefined function
    add_text_field.addEventListener('click', () => textField(tabContent));
    //add textfield to tabContent div
    tabBody.appendChild(add_text_field);

    //do same for diagram as we did for textbox above
    const add_diagram = document.createElement('button');
    add_diagram.className = 'btn';
    add_diagram.textContent = 'Add Diagram';
    add_diagram.addEventListener('click', () => diagram(tabContent));
    tabBody.appendChild(add_diagram);
    //add tabContent as element of tabBody
    tabBody.appendChild(tabContent);
    //add tabBody as element of main tab
    newTab.appendChild(tabBody);

    //add main tab as element of parent div
    parent.appendChild(newTab);
}











//function to add event listener to diagram elements to set them as the current diagram when clicked
function element_click(node){
  node.addEventListener('mousedown', (e) => {
    selectedNode = node;
    //if user holding 'd' key, wants to delete element, do so
    if(remove==true){
      node.remove()
    }
    e.stopPropagation(); // Prevent canvas click when dragging a node
  });
}

//get data of preexisting diagram and add element properties
fetch('/notebook', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ data: window.location.href.slice(-13, -9) })
})
.then(response => response.json())
.then(rawdata => {
  
  //get raw data
  insights = rawdata['insights']
  if (insights != "none"){
    //show AI generated practice questions about notebook topics
    displayInsights(insights)
  }
  alldata = rawdata['notebook']
  //get class id by taking the url of this page and slicing it to get the 4 digit class id
  var id = window.location.href.slice(-13, -9);
  console.log(alldata)
  //get the row of data that corresponds to the class id
  var data = alldata.find(item => item.classID === id);
  // if saved data for this class notebook exists, contine
  if(data && data.innerHTML){
  //if there is preexisting data for this class notebook, apply it to the main(container) element
    container.innerHTML = data.innerHTML;
  
  
//add correct properties to newly applied elements
//sort all elements by class/type

//all diagram boxes
const nodes = container.querySelectorAll('.node');
//all diagram lines
const lines = container.querySelectorAll('.line');
//section name input boxes and textboxes
const input = container.querySelectorAll('input, textarea');
// all buttons
const buttons = container.querySelectorAll('button');
//all diagram divs
const diagrams = container.querySelectorAll('.dgm');

//for each diagram, add an event listener to set it as the current diagram when clicked
  for(let i=0; i<diagrams.length; i++){
      //encapsulating this in a function ensures that the correct elements are used
      function q(diagram) {
    diagram.addEventListener('click', function() {
      current_dgm = diagram
  })
  allow_image_paste_in(diagram)
  }
    q(diagrams[i]) //call this function
  }
// for each section name input box/textbox, but the correct text value in it
//get list of text values for textbox content
if(data.text){
text_values = JSON.parse(data.text);

  for(let i=0; i<input.length; i++){
    input[i].value = text_values[i]
  }
}

// for each button...
  for(let i=0; i<buttons.length; i++){
    //if it's a toggle button
    if (buttons[i].textContent == "v" || buttons[i].textContent == ">"){
      
      var toggle = buttons[i];
    //get the tabContent div relative to the toggle button
    var tabContent = toggle.parentElement.children[2];
    //add event listeners by calling preexisting function
    add_toggle_EL(toggle, tabContent)
//if button is an add subsection button...
    } else if(buttons[i].textContent == "Add Subsection"){
      
      //add event listener to create new section when clicked
      function y(add){
      add.addEventListener('click', function() {
        new_section(add.parentElement.parentElement)
      })
      }
      y(buttons[i])
//if button is an add text button...
    } else if(buttons[i].textContent == "Add Text"){
      //add an event listener to call textField button when clicked
      function z(button){
        button.addEventListener('click', function() {
          textField(button.parentElement)
        })
      }
      z(buttons[i])
//if it's an add diagram button...
    } else if(buttons[i].textContent == "Add Diagram"){
      //add EL for diagram function
      function w(button){
        button.addEventListener('click', function() {
          diagram(button.parentElement)
        })
      }
      w(buttons[i])
    }
    
  }
//add event listener to edit previously created diagram elements(lines and nodes)
nodes.forEach(node => {
  node.contentEditable = true;
  //if clicked, set selected node to equal this element
  element_click(node);
});

// You can add event listeners to lines in a similar way
lines.forEach(line => {
  element_click(line)
});
  }
  document.getElementById('loadingWheel').style.display = "none";   
})
.catch(error => {
  console.error('An error occurred in notebook.js:' +error);
});





//create diagram box
function createNode(x, y, current_dgm) {
    console.log("node created")
    const node = document.createElement('div');
    node.className = 'node';
    node.style.left = `${x}px`;
    node.style.top = `${y}px`;

    node.contentEditable = true;
    // node.addEventListener('input', () => {
    //     updateLinePositions();
    // });

    element_click(node);

    current_dgm.appendChild(node);
}


function createLine(x1, y1, x2, y2, current_dgm) {
    

    var line = document.createElement('div');
    line.className = 'line';
    line.style.left = `${x1}px`;
    line.style.top = `${y1}px`;
    current_line = line;
    
  
    element_click(line);
  current_dgm.appendChild(line);
    container.addEventListener('mousemove', (e) => {
        if (isLine && current_line == line) {
            x2 = e.clientX - container.getBoundingClientRect().left;
            y2 = e.clientY - container.getBoundingClientRect().top;
            updateLine(x1, y1, x2, y2, line);
        }
    });

    container.addEventListener('mouseup', () => {
        
            container.removeEventListener('mousemove', updateLine);
            isLine = false;
            isL = false;
            current_line = null;
        
    });
}
function updateLine(x1, y1, x2, y2, line) {
    const length = Math.hypot(x2 - x1, y2 - y1);
    const angle = Math.atan2(y2 - y1, x2 - x1);
    line.style.width = `${length}px`;
    line.style.transform = `rotate(${angle}rad)`;
}



let selectedNode = null;
let current_line = null;
let isL = false;
let isB = false;
let isLine = false;
let isBox = false;
let lineCreated = false;
let boxCreated = false;


document.addEventListener('keydown', (e) => {
  
    if (e.key === 'l') {
        isL = true;
    } else if (e.key === 'b') {
        isB = true;
    } else if (e.key === 'd'){
      remove = true;
    }
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'l') {
        isL = false;
        isLine = false;
    } else if (e.key === 'b') {
        isB = false;
        isBox = false;
    } else if (e.key === 'd'){
      remove = false;
    }
    // else if (e.key === ''){
    //   console.log(container.innerHTML)
    // }
    lineCreated=false;
    boxCreated=false;
});






container.addEventListener('mousedown', (e) => {
  if(isL==true){
    isLine = true; 
  }
  if(isB==true){
    isBox = true;
  } 
})

container.addEventListener('mouseup', () => {
  selectedNode = null;
  isLine = false;
  isBox = false;
  isL = false;
  isB = false;
  
});

container.addEventListener('mousemove', (e) => {
    
    if (selectedNode) {
        selectedNode.style.left = `${e.clientX - container.getBoundingClientRect().left-40}px`;
        selectedNode.style.top = `${e.clientY - container.getBoundingClientRect().top+120}px`;
        // updateLinePositions();
    } else if (isLine && lineCreated==false) {
        
        lineCreated=true;
        const x1 = e.clientX - container.getBoundingClientRect().left;
        const y1 = e.clientY - container.getBoundingClientRect().top+80;
        createLine(x1, y1, x1, y1, current_dgm); // Create a line with the same start and end points
    }
    else if (isBox && boxCreated==false) {
        boxCreated=true;
        const x = e.clientX - container.getBoundingClientRect().left;
        const y = e.clientY - container.getBoundingClientRect().top+80;
        createNode(x, y, current_dgm); // Create a line with the same start and end points
    }
});

function get_children(parent, txts) {
  var text_elements = txts;
  const childElements = parent.children;
  // console.log(parent)
  for (let i = 0; i < childElements.length; i++) {
    if (childElements[i].className != 'tab'){
      continue;
    }
    var content_divs = childElements[i].children[2].children[0];
    var section_name = childElements[i].children[1].value;
    // console.log(section_name)
    text_elements.push(section_name)
    // console.log(content_divs)
    
    var textareas = content_divs.querySelectorAll('textarea');
    for (let i = 0; i < textareas.length; i++) {
    // console.log(textareas[i].value);
    text_elements.push(textareas[i].value)
  }
  text_elements = get_children(childElements[i].children[2], text_elements)
}
  return text_elements
}


function postNotebook(){
  var id = window.location.href.slice(-13, -9);
  //var data = [section_name, text_box_content, =, ..., [subsection]]
  var empty = [];
  var text_data = get_children(container, empty)
  console.log(text_data)
  data = {'data': {'classID': id, 'innerHTML': container.innerHTML, 'text': text_data}}
  fetch('/post-notebook', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
})
.then(response => response.text())
.then(result => {
    console.log(result)
})
.catch(error => {
    console.log('An error occurred:', error);
});
}

  const insightContainer = document.getElementById("insights_container");

  function displayInsights(insights) {
  
  insights = insights.split('\n').filter(item => item.trim() !== '');
  for(let x=0;x<insights.length;x++){
    
  const box = document.createElement("div");
  box.className = "box";

  const lightbulb = document.createElement("div");
  lightbulb.className = "lightbulb";

  const text = document.createElement("span");
  text.textContent = insights[x];

  box.appendChild(lightbulb);
  box.appendChild(text);
  insightContainer.appendChild(box);
  }
  
}





//code for resizing and dragging diagram images


function img_resize_draggable(img){
  img.style.position = 'absolute';
  img.style.cursor = 'move'; // Indicates the image can be moved
  img.style.resize = 'both'; // Enables resizing
  img.style.overflow = 'auto'; // Ensures the resize handle is visible

  let active = false;
  let currentMouseX;
  let currentMouseY;
  let initialMouseX;
  let initialMouseY;
  let initialImgX;
  let initialImgY;
  let xOffset;
  let yOffset;

  const dragStart = (e) => {
    //Get initial position of mouse
    initialMouseX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
    initialMouseY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
    //Get initial position of image
    initialImgX = img.offsetLeft;
    initialImgY = img.offsetTop;
    //Get difference between initial mouse position and initial image position
    xOffset = initialMouseX - initialImgX;
    yOffset = initialMouseY - initialImgY;
    //console.log everything
    console.log(initialMouseX, initialMouseY, initialImgX, initialImgY, xOffset, yOffset)
    if (e.target === img) {
      active = true;
    }
  };

  const dragEnd = () => {
    initialMouseX = currentMouseX;
    initialMouseY = currentMouseY;
    active = false;
  };

  const drag = (e) => {
    if (active) {
      e.preventDefault();
      
      //Get current position of mouse
      currentMouseX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
      currentMouseY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
      //Get new position of image by adding the offset to the current mouse position
      let imgX = currentMouseX - initialMouseX;
      let imgY = currentMouseY - initialMouseY;
      console.log(imgX, imgY, currentMouseX)

      setTranslate(imgX, imgY, img);
    }
  };

  const setTranslate = (xPos, yPos, el) => {
    el.style.transform = "translate3d(" + xPos + "px, " + yPos + "px, 0)";
  };

  // Adding event listeners to make the image draggable
  img.addEventListener('mousedown', dragStart, false);
  window.addEventListener('mouseup', dragEnd, false);
  window.addEventListener('mousemove', drag, false);

  img.addEventListener('touchstart', dragStart, false);
  window.addEventListener('touchend', dragEnd, false);
  window.addEventListener('touchmove', drag, false);
}