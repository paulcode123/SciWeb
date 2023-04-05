 // Get the form element

      const form = document.getElementById('login-form');

      // Attach a submit event listener to the form
      
      form.addEventListener('submit', function(event) {
        
        // Prevent the form from submitting normally
        event.preventDefault();
        
        // Get the input values
        const fname = document.getElementById('fname').value;
        const lname = document.getElementById('lname').value;
        const email = document.getElementById('email').value;
        const grade = document.getElementById('grade').value;
        
        // Create a CSV row from the input values
        const csvRow = `${fname},${lname},${email},${grade}\n`;

        // Create a Blob object
        const blob = new Blob([csvRow], { type: 'text/csv' });
        
        const existingRows = localStorage.getItem('logins.csv');
        alert(existingRows)
          localStorage.setItem('logins.csv', existingRows + csvRow);
        // Alert the user that the data has been saved
        alert("Your login information has been saved!");
      });
