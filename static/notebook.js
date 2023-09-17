const container = document.getElementById('mindmap-container');




function createNode(x, y) {
    
    const node = document.createElement('div');
    node.className = 'node';
    node.style.left = `${x}px`;
    node.style.top = `${y}px`;

    node.contentEditable = true;
    // node.addEventListener('input', () => {
    //     updateLinePositions();
    // });

    node.addEventListener('mousedown', (e) => {
        selectedNode = node;
        e.stopPropagation(); // Prevent canvas click when dragging a node
    });

    container.appendChild(node);
}


function createLine(x1, y1, x2, y2) {
    

    const line = document.createElement('div');
    line.className = 'line';
    line.style.left = `${x1}px`;
    line.style.top = `${y1}px`;

    
  
    line.addEventListener('mousedown', (e) => {
        selectedNode = line;
        e.stopPropagation(); // Prevent canvas click when dragging a node
    });
  container.appendChild(line);
    container.addEventListener('mousemove', (e) => {
        if (isLine) {
            x2 = e.clientX - container.getBoundingClientRect().left;
            y2 = e.clientY - container.getBoundingClientRect().top;
            updateLine(x1, y1, x2, y2, line);
        }
    });

    container.addEventListener('mouseup', () => {
        if (isLine) {
            container.removeEventListener('mousemove', updateLine);
            isLine = false;
            isL = false;
        }
    });
}
function updateLine(x1, y1, x2, y2, line) {
    const length = Math.hypot(x2 - x1, y2 - y1);
    const angle = Math.atan2(y2 - y1, x2 - x1);
    line.style.width = `${length}px`;
    line.style.transform = `rotate(${angle}rad)`;
}



let selectedNode = null;
// let selectedLine = null;
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
    }
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'l') {
        isL = false;
        isLine = false;
    } else if (e.key === 'b') {
        isB = false;
        isBox = false;
    }
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
        selectedNode.style.left = `${e.clientX - container.getBoundingClientRect().left}px`;
        selectedNode.style.top = `${e.clientY - container.getBoundingClientRect().top}px`;
        // updateLinePositions();
    } else if (isLine && lineCreated==false) {
        
        lineCreated=true;
        const x1 = e.clientX - container.getBoundingClientRect().left;
        const y1 = e.clientY - container.getBoundingClientRect().top;
        createLine(x1, y1, x1, y1); // Create a line with the same start and end points
    }
    else if (isBox && boxCreated==false) {
        boxCreated=true;
        const x = e.clientX - container.getBoundingClientRect().left;
        const y = e.clientY - container.getBoundingClientRect().top;
        createNode(x, y); // Create a line with the same start and end points
    }
});




