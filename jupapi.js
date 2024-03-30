// Import the necessary modules
const Jupiter = require("jupiter-api").default;

const osis = process.argv[2];
const password = process.argv[3];



Jupiter.launch().then(async (jupiter) => {
    
    // Set up your request parameters
    const request = {
        id: osis, // Fill in with the appropriate ID
        password: password, // Fill in with the password
        school: 'Bronx High School of Science', // Fill in with the school name
        city: 'New York', // Fill in with the city
        state: 'us_NY' // Fill in with the state
    };

    try {
        
        // Use the jupiter-api to perform operations
        const scraper = await jupiter.request(request);
        var student = await scraper.data();
        
        // Output the student data
        // console.dir the string in groups of 30,000 characters

        student = JSON.stringify(student);
        // student = student.replace('“', "");
        // student = student.replace('”', "");
        const regex = /^[ -~]+$/;

        // Split the string into an array of characters, filter out non-standard characters, and rejoin
        student = student.split('').filter(char => regex.test(char)).join('');
        console.log(student);
        // console.dir(student, { depth: null });
        // console.log(student)
        // for (let i = 0; i < student.length; i += 5000) {
        //     min_ind = Math.min(i+5000, student.length-1)
        //     console.dir(student.slice(i, min_ind), { depth: null });
        // }
        
        process.exit()
    } catch (error) {
        // If an error occurs, log it
        console.error("An error occurred:", error);
        
        process.exit()
    }
});

