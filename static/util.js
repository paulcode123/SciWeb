async function getBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file); // Converts the file to Base64
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
  }

function fetchRequest(route, reqbody){
    console.log(reqbody)
    return fetch(route, {
        method: 'POST',
        headers: {
        'Content-Type': 'application/json'
        },
        body: JSON.stringify(reqbody)
    })
    .then(response => response.json())
    .then(data => {
        // console.log(data);
        return data;
    })
    .catch(error => {
        console.error('An error occurred in fetch :' +error);
    });
}