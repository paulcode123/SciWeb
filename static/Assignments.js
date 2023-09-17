function display_assignments(assignmentList, classList){
  const assignmentListContainer = document.getElementById('assignmentList');
    assignmentList.forEach(assignmentData => {
      //get class name given class id
      for (const item of classList) {
        if (item.id === assignmentData['class']) {
            class_name = item.name;
            break;
        }
}
      const assignmentItem = document.createElement('div');
      assignmentItem.classList.add('assignment-item');
      assignmentItem.innerHTML = `
        <h3>Due ${assignmentData.due}</h3>
        <p>Class ${class_name}
        <p>Type: ${assignmentData.categories}</p>
        <p>Name: ${assignmentData.name}</p>
      `;
      
      assignmentItem.addEventListener('click', () => {
        window.location.href = "/assignment/" + assignmentData.id;
      });

      assignmentListContainer.appendChild(assignmentItem);
    });
  
}



function get_assignment(){
  fetch('/Assignments-data', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ data: "data being sent Py=>JS" })
})
.then(response => response.json())
.then(data => {
  
  
  assignmentList = data['Assignments']
  classList = data["Classes"]
  
  display_assignments(assignmentList, classList)
  
  
})
.catch(error => {
  alert('An error occurred:' +error);
});
}
get_assignment()