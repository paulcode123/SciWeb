# Jupiter API

> This library is a third-party API to retrieve student grades, courses, and assignments from the [JupiterEd](https://jupitered.com/) education platform. Implemented using TypeScript, Node.js, and the [Puppeteer](https://github.com/puppeteer/puppeteer) web-crawling library. 

**`Contributors`**
 - Taj Jethwani-Keyser
 - Alex Pan

## Installation

Install `jupiter-api` from the [npm](https://npmjs.com) package manager.
```bash
npm install --save jupiter-api
```

## Usage

```ts
import Jupiter from "jupiter-api"

Jupiter.launch().then(async (jupiter) => {
    const request = {
        id: '',
        password: '',
        school: '',
        city: '',
        state: ''
    }

    const scraper = await jupiter.request(request)
    const student = await scraper.data()
    console.log(student.toString())
})
```

## Output
```json
{
    "name": "Student Name",
    "courses": [{
        "name": "Course 1",
        "teacher": "Teacher 1",
        "schedule": "Period M1-R1-T1-W1-F1, rm. 1",
        "grade": 100,
        "categories": [{
            "name": "Category 1",
            "grade": 100,
            "weight": 1
        }],
        "assignments": [{
            "due": "1/1",
            "name": "Assignment 1",
            "score": 10,
            "points": 10,
            "category": "Category 1",
            "graded": true
        }]
    }],
    "gpa": 100
}
```

## Documentation

More detailed information about the API and its implementation may be found [here](docs/README.md).

## License

[MIT](LICENSE)
